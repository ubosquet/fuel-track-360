import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { ManifestEntity } from '../manifest/entities/manifest.entity';
import { S2LChecklistEntity } from '../s2l/entities/s2l-checklist.entity';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const DRIVER_A = 'd0000000-0000-0000-0000-000000000001';
const DRIVER_B = 'd0000000-0000-0000-0000-000000000002';
const STATION_1 = 's0000000-0000-0000-0000-000000000001';
const STATION_2 = 's0000000-0000-0000-0000-000000000002';
const TRUCK_1 = 't0000000-0000-0000-0000-000000000001';

const now = new Date('2026-03-07T20:00:00Z');
const dep = new Date('2026-03-07T10:00:00Z');  // departed_at
const arr1 = new Date('2026-03-07T12:00:00Z');  // 2h = on time ✅
const arr2 = new Date('2026-03-07T15:00:00Z');  // 5h = late ❌

function makeManifest(overrides: Partial<ManifestEntity> = {}): ManifestEntity {
    return {
        id: 'manifest-' + Math.random().toString(36).slice(2),
        organization_id: ORG_ID,
        manifest_number: 'FT360-20260307-0001',
        s2l_id: 's2l-001',
        truck_id: TRUCK_1,
        driver_id: DRIVER_A,
        origin_station_id: STATION_1,
        dest_station_id: STATION_2,
        product_type: 'DIESEL',
        volume_loaded_liters: 20000,
        volume_discharged_liters: 19900,
        volume_variance_pct: 0.5,
        status: 'COMPLETED',
        loaded_at: new Date('2026-03-07T08:00:00Z'),
        departed_at: dep,
        arrived_at: arr1,
        discharged_at: new Date('2026-03-07T13:00:00Z'),
        offline_created: false,
        sync_id: null as any,
        created_at: now,
        updated_at: now,
        driver: { id: DRIVER_A, full_name: 'Jean Dupont' } as any,
        truck: { id: TRUCK_1, plate_number: 'AA-123-BB' } as any,
        origin_station: { id: STATION_1, name: 'Terminal Nord', code: 'TN', zone: 'NORTH' } as any,
        dest_station: { id: STATION_2, name: 'Station Sud', code: 'SS', zone: 'SOUTH' } as any,
        ...overrides,
    } as ManifestEntity;
}

// ─── Mock repository ──────────────────────────────────────────────────────────

const makeManifestRepo = (manifests: ManifestEntity[]) => {
    const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(manifests),
    };

    return { createQueryBuilder: jest.fn().mockReturnValue(qb) };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {
    let service: AnalyticsService;

    async function init(manifests: ManifestEntity[]) {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                {
                    provide: getRepositoryToken(ManifestEntity),
                    useValue: makeManifestRepo(manifests),
                },
                {
                    provide: getRepositoryToken(S2LChecklistEntity),
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
    }

    // ── getOrgOverview() ────────────────────────────────────────────────────

    describe('getOrgOverview()', () => {
        it('returns zero stats for empty manifest list', async () => {
            await init([]);
            const result = await service.getOrgOverview(ORG_ID);
            expect(result.total_manifests).toBe(0);
            expect(result.completion_rate_pct).toBe(0);
            expect(result.on_time_rate_pct).toBe(0);
        });

        it('computes correct completion rate', async () => {
            await init([
                makeManifest({ status: 'COMPLETED' }),
                makeManifest({ status: 'COMPLETED' }),
                makeManifest({ status: 'CANCELLED' }),
                makeManifest({ status: 'CREATED' }),
            ]);
            const result = await service.getOrgOverview(ORG_ID);
            // 2 COMPLETED / 4 total = 50%
            expect(result.completion_rate_pct).toBe(50);
        });

        it('counts FLAGGED manifests as completed (and also as flagged)', async () => {
            await init([
                makeManifest({ status: 'FLAGGED', departed_at: dep, arrived_at: arr1, volume_variance_pct: 5 }),
                makeManifest({ status: 'COMPLETED', departed_at: dep, arrived_at: arr1 }),
            ]);
            const result = await service.getOrgOverview(ORG_ID);
            expect(result.completed).toBe(2);
            expect(result.flagged).toBe(1);
        });
    });

    // ── getDriversStats() ────────────────────────────────────────────────────

    describe('getDriversStats()', () => {
        it('groups manifests by driver and assigns ranks', async () => {
            await init([
                makeManifest({ driver_id: DRIVER_A, status: 'COMPLETED', departed_at: dep, arrived_at: arr1 }),
                makeManifest({ driver_id: DRIVER_B, status: 'COMPLETED', departed_at: dep, arrived_at: arr2 }),
            ]);
            const result = await service.getDriversStats(ORG_ID);
            expect(result.length).toBe(2);
            expect(result[0].rank).toBe(1);
            expect(result[1].rank).toBe(2);
        });

        it('marks an on-time delivery (≤ 4h transit) correctly', async () => {
            await init([
                makeManifest({ driver_id: DRIVER_A, status: 'COMPLETED', departed_at: dep, arrived_at: arr1 }), // 2h ✅
            ]);
            const [driver] = await service.getDriversStats(ORG_ID);
            expect(driver.on_time).toBe(1);
            expect(driver.on_time_rate_pct).toBe(100);
        });

        it('marks a late delivery (> 4h transit) correctly', async () => {
            await init([
                makeManifest({ driver_id: DRIVER_A, status: 'COMPLETED', departed_at: dep, arrived_at: arr2 }), // 5h ❌
            ]);
            const [driver] = await service.getDriversStats(ORG_ID);
            expect(driver.on_time).toBe(0);
            expect(driver.on_time_rate_pct).toBe(0);
        });

        it('scores driver with perfect record at 100', async () => {
            // 1 delivery, on time, variance ≤ 1%, completed
            await init([
                makeManifest({
                    driver_id: DRIVER_A,
                    status: 'COMPLETED',
                    departed_at: dep,
                    arrived_at: arr1,   // 2h — on time
                    volume_variance_pct: 0.5, // ≤ 1% — precise
                }),
            ]);
            const [driver] = await service.getDriversStats(ORG_ID);
            // All three rates are 100 → score = 100*0.5 + 100*0.3 + 100*0.2 = 100
            expect(driver.score).toBe(100);
        });
    });

    // ── getLeaderboard() ────────────────────────────────────────────────────

    describe('getLeaderboard()', () => {
        beforeEach(async () => {
            await init([
                makeManifest({ driver_id: DRIVER_A, status: 'COMPLETED', departed_at: dep, arrived_at: arr1 }),
                makeManifest({
                    driver_id: DRIVER_B, status: 'COMPLETED', departed_at: dep, arrived_at: arr2,
                    driver: { id: DRIVER_B, full_name: 'Marie Martin' } as any
                }),
            ]);
        });

        it('admin callers see real driver names', async () => {
            const board = await service.getLeaderboard(ORG_ID, 'some-admin', true);
            expect(board.some((e) => e.label === 'Jean Dupont')).toBe(true);
        });

        it('driver callers see anonymized peers but their own name', async () => {
            const board = await service.getLeaderboard(ORG_ID, DRIVER_A, false);
            const self = board.find((e) => e.is_self);
            const peer = board.find((e) => !e.is_self);
            expect(self?.label).toBe('Jean Dupont'); // self → real name
            expect(peer?.label).toMatch(/^Driver #\d+$/); // peer → anonymized
        });

        it('marks is_self correctly for the requesting driver', async () => {
            const board = await service.getLeaderboard(ORG_ID, DRIVER_B, false);
            const self = board.find((e) => e.is_self);
            expect(self).toBeDefined();
            expect(self?.rank).toBeGreaterThan(0);
        });
    });

    // ── getMyStats() ────────────────────────────────────────────────────────

    describe('getMyStats()', () => {
        it('returns rank and total_drivers', async () => {
            await init([
                makeManifest({ driver_id: DRIVER_A }),
                makeManifest({ driver_id: DRIVER_B, driver: { id: DRIVER_B, full_name: 'Marie Martin' } as any }),
            ]);
            const result = await service.getMyStats(DRIVER_A, ORG_ID);
            expect(result.total_drivers).toBe(2);
            expect(result.rank).toBeGreaterThan(0);
        });

        it('returns empty stats for driver with no manifests', async () => {
            await init([]); // no manifests at all
            const result = await service.getMyStats(DRIVER_A, ORG_ID);
            expect(result.stats.total_deliveries).toBe(0);
            expect(result.rank).toBe(1); // rank = total_drivers + 1 = 0 + 1
        });
    });
});
