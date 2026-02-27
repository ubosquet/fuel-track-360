import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ManifestService } from './manifest.service';
import { ManifestEntity } from './entities/manifest.entity';
import { S2LService } from '../s2l/s2l.service';
import { AuditService } from '../audit/audit.service';

// ────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const OTHER_ORG = 'a0000000-0000-0000-0000-000000000002';
const USER_ID = 'u0000000-0000-0000-0000-000000000001';

const makeManifestEntity = (overrides: Partial<ManifestEntity> = {}): ManifestEntity =>
    ({
        id: 'manifest-001',
        organization_id: ORG_ID,
        manifest_number: 'FT360-20260225-0001',
        s2l_id: 's2l-001',
        truck_id: 'truck-001',
        driver_id: USER_ID,
        origin_station_id: 'station-001',
        dest_station_id: 'station-002',
        product_type: 'DIESEL',
        volume_loaded_liters: 20000,
        status: 'CREATED',
        offline_created: false,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides,
    }) as ManifestEntity;

const mockManifestRepo = () => ({
    create: jest.fn().mockImplementation((dto) => ({ id: 'manifest-new', ...dto })),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'manifest-new', ...e })),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getCount: jest.fn().mockResolvedValue(0),
    }),
});

const mockS2LService = () => ({
    findOneOrFail: jest.fn(),
});

const mockAuditService = () => ({
    log: jest.fn().mockResolvedValue(undefined),
});

// Mock DataSource for advisory-lock manifest number generation
const mockDataSource = () => ({
    transaction: jest.fn().mockImplementation(async (cb: any) => {
        const mockEm = {
            query: jest.fn()
                .mockResolvedValueOnce(undefined)          // pg_advisory_xact_lock
                .mockResolvedValueOnce([{ count: '0' }]), // count query
        };
        return cb(mockEm);
    }),
});

// ════════════════════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════════════════════

describe('ManifestService', () => {
    let service: ManifestService;
    let manifestRepo: ReturnType<typeof mockManifestRepo>;
    let s2lSvc: ReturnType<typeof mockS2LService>;
    let auditSvc: ReturnType<typeof mockAuditService>;

    beforeEach(async () => {
        manifestRepo = mockManifestRepo();
        s2lSvc = mockS2LService();
        auditSvc = mockAuditService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ManifestService,
                { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepo },
                { provide: S2LService, useValue: s2lSvc },
                { provide: AuditService, useValue: auditSvc },
                { provide: DataSource, useValue: mockDataSource() },
            ],
        }).compile();

        service = module.get<ManifestService>(ManifestService);
    });

    // ──────────────────────────────────────────
    // create()
    // ──────────────────────────────────────────

    describe('create()', () => {
        const validPayload = {
            s2l_id: 's2l-001',
            truck_id: 'truck-001',
            origin_station_id: 'station-001',
            dest_station_id: 'station-002',
            product_type: 'DIESEL',
            volume_loaded_liters: 20000,
        };

        it('RULE 6: rejects if linked S2L is not APPROVED', async () => {
            s2lSvc.findOneOrFail.mockResolvedValue({
                id: 's2l-001',
                status: 'SUBMITTED',
                organization_id: ORG_ID,
            });

            await expect(
                service.create(validPayload, USER_ID, ORG_ID),
            ).rejects.toThrow(/not APPROVED/);
        });

        it('rejects if S2L belongs to a different organization (NotFoundException from scoped lookup)', async () => {
            // N8 FIX: findOneOrFail is now called WITH organizationId, so the DB
            // enforces the org boundary. The mock simulates the expected NotFoundException
            // that would be thrown when the S2L is not found in the caller's org.
            s2lSvc.findOneOrFail.mockRejectedValue(
                new NotFoundException('S2L checklist s2l-001 not found'),
            );

            await expect(
                service.create(validPayload, USER_ID, ORG_ID),
            ).rejects.toThrow(NotFoundException);
        });

        it('creates manifest and uses actorRole in audit log', async () => {
            s2lSvc.findOneOrFail.mockResolvedValue({
                id: 's2l-001',
                status: 'APPROVED',
                organization_id: ORG_ID,
            });
            manifestRepo.findOne.mockResolvedValue(null);

            await service.create(validPayload, USER_ID, ORG_ID, 'SUPERVISOR');

            expect(auditSvc.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    event_type: 'MANIFEST_CREATED',
                    actor_role: 'SUPERVISOR',   // M5: not hardcoded
                }),
            );
        });
    });

    // ──────────────────────────────────────────
    // findOneOrFail() — M2: org isolation
    // ──────────────────────────────────────────

    describe('findOneOrFail() — M2 org isolation', () => {
        it('returns manifest when it belongs to the org', async () => {
            manifestRepo.findOne.mockResolvedValue(makeManifestEntity());
            const result = await service.findOneOrFail('manifest-001', ORG_ID);
            expect(result.id).toBe('manifest-001');
        });

        it('throws NotFoundException when manifest is not found for org', async () => {
            manifestRepo.findOne.mockResolvedValue(null);
            await expect(service.findOneOrFail('manifest-001', ORG_ID)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('passes both id and organization_id to the repository query', async () => {
            manifestRepo.findOne.mockResolvedValue(makeManifestEntity());
            await service.findOneOrFail('manifest-001', ORG_ID);
            expect(manifestRepo.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: 'manifest-001',
                        organization_id: ORG_ID,
                    }),
                }),
            );
        });
    });

    // ──────────────────────────────────────────
    // updateStatus() — M3: state machine
    // ──────────────────────────────────────────

    describe('updateStatus() — M3 state machine', () => {
        it('RULE 7: auto-flags if volume variance > 2%', async () => {
            manifestRepo.findOne
                .mockResolvedValueOnce(makeManifestEntity({ status: 'DISCHARGING', volume_loaded_liters: 20000 }))
                .mockResolvedValueOnce(makeManifestEntity({ status: 'FLAGGED' }));

            await service.updateStatus(
                'manifest-001',
                'COMPLETED',
                USER_ID,
                'DISPATCHER',
                ORG_ID,
                { volume_discharged_liters: 19000 }, // 5% variance → auto-flag
            );

            expect(manifestRepo.update).toHaveBeenCalledWith(
                'manifest-001',
                expect.objectContaining({ status: 'FLAGGED' }),
            );
        });

        it('completes normally if variance <= 2%', async () => {
            manifestRepo.findOne
                .mockResolvedValueOnce(makeManifestEntity({ status: 'DISCHARGING', volume_loaded_liters: 20000 }))
                .mockResolvedValueOnce(makeManifestEntity({ status: 'COMPLETED' }));

            await service.updateStatus(
                'manifest-001',
                'COMPLETED',
                USER_ID,
                'DISPATCHER',
                ORG_ID,
                { volume_discharged_liters: 19800 }, // 1% → OK
            );

            expect(manifestRepo.update).toHaveBeenCalledWith(
                'manifest-001',
                expect.objectContaining({ status: 'COMPLETED' }),
            );
        });

        it('M3: rejects invalid transition CREATED → IN_TRANSIT', async () => {
            manifestRepo.findOne.mockResolvedValue(makeManifestEntity({ status: 'CREATED' }));

            await expect(
                service.updateStatus('manifest-001', 'IN_TRANSIT', USER_ID, 'DISPATCHER', ORG_ID),
            ).rejects.toThrow(BadRequestException);
        });

        it('M3: rejects transition from terminal state COMPLETED', async () => {
            manifestRepo.findOne.mockResolvedValue(makeManifestEntity({ status: 'COMPLETED' }));

            await expect(
                service.updateStatus('manifest-001', 'LOADING', USER_ID, 'DISPATCHER', ORG_ID),
            ).rejects.toThrow(BadRequestException);
        });

        it('M3: rejects transition from terminal state CANCELLED', async () => {
            manifestRepo.findOne.mockResolvedValue(makeManifestEntity({ status: 'CANCELLED' }));

            await expect(
                service.updateStatus('manifest-001', 'CREATED', USER_ID, 'DISPATCHER', ORG_ID),
            ).rejects.toThrow(BadRequestException);
        });

        it('M3: allows valid transition CREATED → LOADING', async () => {
            manifestRepo.findOne
                .mockResolvedValueOnce(makeManifestEntity({ status: 'CREATED' }))
                .mockResolvedValueOnce(makeManifestEntity({ status: 'LOADING' }));

            const result = await service.updateStatus(
                'manifest-001', 'LOADING', USER_ID, 'DISPATCHER', ORG_ID,
            );

            expect(manifestRepo.update).toHaveBeenCalledWith(
                'manifest-001',
                expect.objectContaining({ status: 'LOADING' }),
            );
        });

        it('M3: allows FLAGGED → COMPLETED resolution', async () => {
            manifestRepo.findOne
                .mockResolvedValueOnce(makeManifestEntity({ status: 'FLAGGED' }))
                .mockResolvedValueOnce(makeManifestEntity({ status: 'COMPLETED' }));

            await service.updateStatus('manifest-001', 'COMPLETED', USER_ID, 'SUPERVISOR', ORG_ID);

            expect(manifestRepo.update).toHaveBeenCalledWith(
                'manifest-001',
                expect.objectContaining({ status: 'COMPLETED' }),
            );
        });

        it('M5: uses passed actorRole in audit log, not hardcoded DISPATCHER', async () => {
            manifestRepo.findOne
                .mockResolvedValueOnce(makeManifestEntity({ status: 'CREATED' }))
                .mockResolvedValueOnce(makeManifestEntity({ status: 'LOADING' }));

            await service.updateStatus('manifest-001', 'LOADING', USER_ID, 'OWNER', ORG_ID);

            expect(auditSvc.log).toHaveBeenCalledWith(
                expect.objectContaining({ actor_role: 'OWNER' }),
            );
        });
    });
});
