import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { TruckEntity } from './entities/truck.entity';
import { GpsLogEntity } from './entities/gps-log.entity';
import { AuditService } from '../audit/audit.service';

// ────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const OTHER_ORG = 'a0000000-0000-0000-0000-000000000002';
const TRUCK_ID = 'c0000000-0000-0000-0000-000000000001';
const USER_ID = 'u0000000-0000-0000-0000-000000000001';

const makeTruck = (overrides: Partial<TruckEntity> = {}): TruckEntity =>
    ({
        id: TRUCK_ID,
        organization_id: ORG_ID,
        plate_number: 'HTI-1234',
        capacity_liters: 20000,
        compartments: 4,
        status: 'IDLE',
        is_active: true,
        ...overrides,
    }) as TruckEntity;

const mockTruckRepo = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    save: jest.fn(),
});

const mockGpsRepo = () => ({
    create: jest.fn().mockImplementation((d) => d),
    save: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
    }),
});

const mockAuditService = () => ({
    log: jest.fn().mockResolvedValue(undefined),
});

// ════════════════════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════════════════════

describe('FleetService', () => {
    let service: FleetService;
    let truckRepo: ReturnType<typeof mockTruckRepo>;
    let gpsRepo: ReturnType<typeof mockGpsRepo>;
    let auditSvc: ReturnType<typeof mockAuditService>;

    beforeEach(async () => {
        truckRepo = mockTruckRepo();
        gpsRepo = mockGpsRepo();
        auditSvc = mockAuditService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FleetService,
                { provide: getRepositoryToken(TruckEntity), useValue: truckRepo },
                { provide: getRepositoryToken(GpsLogEntity), useValue: gpsRepo },
                { provide: AuditService, useValue: auditSvc },
            ],
        }).compile();

        service = module.get<FleetService>(FleetService);
    });

    // ──────────────────────────────────────────
    // findTruckByIdInOrg — org isolation
    // ──────────────────────────────────────────

    describe('findTruckByIdInOrg()', () => {
        it('returns the truck when it belongs to the org', async () => {
            const truck = makeTruck();
            truckRepo.findOne.mockResolvedValue(truck);

            const result = await service.findTruckByIdInOrg(TRUCK_ID, ORG_ID);
            expect(result.id).toBe(TRUCK_ID);
        });

        it('throws NotFoundException when truck does not exist at all', async () => {
            // First call (org-scoped) → null, second call (existence check) → null
            truckRepo.findOne.mockResolvedValue(null);

            await expect(service.findTruckByIdInOrg(TRUCK_ID, ORG_ID)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('throws ForbiddenException when truck exists but belongs to another org', async () => {
            // First call (org-scoped { id, organization_id }) → null
            // Second call (existence check { id }) → truck from other org
            truckRepo.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(makeTruck({ organization_id: OTHER_ORG }));

            await expect(
                service.findTruckByIdInOrg(TRUCK_ID, ORG_ID),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    // ──────────────────────────────────────────
    // CRITICAL FIX: ingestGpsLogs — org ownership
    // ──────────────────────────────────────────

    describe('ingestGpsLogs() — organization ownership validation', () => {
        const validLog = {
            truck_id: TRUCK_ID,
            lat: 18.5393,
            lng: -72.3366,
            recorded_at: new Date().toISOString(),
        };

        it('ingests logs when the truck belongs to the caller org', async () => {
            // find (org-scoped trucks) returns the owned truck
            truckRepo.find.mockResolvedValue([{ id: TRUCK_ID }]);
            // update call for GPS position
            truckRepo.update.mockResolvedValue(undefined);

            const result = await service.ingestGpsLogs([validLog], ORG_ID);

            expect(result.ingested).toBe(1);
            expect(result.rejected).toBe(0);
            expect(gpsRepo.save).toHaveBeenCalled();
        });

        it('rejects logs for trucks belonging to a different org', async () => {
            // org ownership check: no trucks returned for this org
            truckRepo.find.mockResolvedValue([]);

            const result = await service.ingestGpsLogs([validLog], OTHER_ORG);

            expect(result.ingested).toBe(0);
            expect(result.rejected).toBe(1);
            expect(gpsRepo.save).not.toHaveBeenCalled();
        });

        it('partially ingests a mixed batch — owned trucks pass, others are rejected', async () => {
            const ownedTruckId = 'c0000000-0000-0000-0000-000000000001';
            const foreignTruckId = 'c0000000-0000-0000-0000-000000000099';

            truckRepo.find.mockResolvedValue([{ id: ownedTruckId }]);
            truckRepo.update.mockResolvedValue(undefined);

            const logs = [
                { truck_id: ownedTruckId, lat: 18.5, lng: -72.3, recorded_at: new Date().toISOString() },
                { truck_id: foreignTruckId, lat: 18.6, lng: -72.4, recorded_at: new Date().toISOString() },
            ];

            const result = await service.ingestGpsLogs(logs, ORG_ID);

            expect(result.ingested).toBe(1);
            expect(result.rejected).toBe(1);
        });

        it('returns 0 ingested when batch is empty after filtering', async () => {
            truckRepo.find.mockResolvedValue([]);

            const result = await service.ingestGpsLogs([validLog], ORG_ID);
            expect(result.ingested).toBe(0);
            expect(result.rejected).toBe(1);
        });

        it('updates current GPS position to the LATEST log per truck', async () => {
            const oldTime = new Date(Date.now() - 60_000).toISOString();
            const newTime = new Date().toISOString();

            truckRepo.find.mockResolvedValue([{ id: TRUCK_ID }]);
            truckRepo.update.mockResolvedValue(undefined);

            await service.ingestGpsLogs([
                { truck_id: TRUCK_ID, lat: 18.50, lng: -72.30, recorded_at: oldTime },
                { truck_id: TRUCK_ID, lat: 18.51, lng: -72.31, recorded_at: newTime }, // ← latest
            ], ORG_ID);

            // Last update call should use the NEWER coordinates
            const updateCalls = truckRepo.update.mock.calls;
            const lastCall = updateCalls[updateCalls.length - 1];
            expect(lastCall[1].current_lat).toBeCloseTo(18.51);
            expect(lastCall[1].current_lng).toBeCloseTo(-72.31);
        });
    });

    // ──────────────────────────────────────────
    // getGpsHistory — org scoping
    // ──────────────────────────────────────────

    describe('getGpsHistory()', () => {
        it('verifies truck ownership before returning history', async () => {
            // First findTruckByIdInOrg — org-scoped find returns null (truck exists in other org)
            truckRepo.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(makeTruck({ organization_id: OTHER_ORG }));

            await expect(
                service.getGpsHistory(TRUCK_ID, ORG_ID),
            ).rejects.toThrow(ForbiddenException);
        });

        it('caps the query limit at 1000', async () => {
            truckRepo.findOne.mockResolvedValue(makeTruck());
            const qb = gpsRepo.createQueryBuilder();

            await service.getGpsHistory(TRUCK_ID, ORG_ID, undefined, undefined, 999999);

            // take() should have been called with 1000, not 999999
            expect(qb.take).toHaveBeenCalledWith(1000);
        });
    });
});
