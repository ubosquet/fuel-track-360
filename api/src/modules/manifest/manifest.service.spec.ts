import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ManifestService } from './manifest.service';
import { ManifestEntity } from './entities/manifest.entity';
import { S2LService } from '../s2l/s2l.service';
import { AuditService } from '../audit/audit.service';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ID = 'u0000000-0000-0000-0000-000000000001';

const makeManifestEntity = (overrides: Partial<ManifestEntity> = {}): ManifestEntity =>
    ({
        id: 'manifest-001',
        organization_id: ORG_ID,
        manifest_number: 'FT360-20260217-0001',
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
            ],
        }).compile();

        service = module.get<ManifestService>(ManifestService);
    });

    describe('create()', () => {
        it('RULE 6: rejects if linked S2L is not APPROVED', async () => {
            s2lSvc.findOneOrFail.mockResolvedValue({ id: 's2l-001', status: 'SUBMITTED' });

            await expect(
                service.create(
                    {
                        s2l_id: 's2l-001',
                        truck_id: 'truck-001',
                        origin_station_id: 'station-001',
                        dest_station_id: 'station-002',
                        product_type: 'DIESEL',
                    },
                    USER_ID,
                    ORG_ID,
                ),
            ).rejects.toThrow(/not APPROVED/);
        });

        it('creates manifest when S2L is APPROVED', async () => {
            s2lSvc.findOneOrFail.mockResolvedValue({ id: 's2l-001', status: 'APPROVED' });
            manifestRepo.findOne.mockResolvedValue(null); // no duplicate

            const result = await service.create(
                {
                    s2l_id: 's2l-001',
                    truck_id: 'truck-001',
                    origin_station_id: 'station-001',
                    dest_station_id: 'station-002',
                    product_type: 'DIESEL',
                    volume_loaded_liters: 20000,
                },
                USER_ID,
                ORG_ID,
            );

            expect(manifestRepo.create).toHaveBeenCalled();
            expect(manifestRepo.save).toHaveBeenCalled();
            expect(auditSvc.log).toHaveBeenCalledWith(
                expect.objectContaining({ event_type: 'MANIFEST_CREATED' }),
            );
        });
    });

    describe('updateStatus()', () => {
        it('RULE 7: auto-flags if volume variance > 2%', async () => {
            manifestRepo.findOne
                .mockResolvedValueOnce(
                    makeManifestEntity({
                        status: 'DISCHARGING',
                        volume_loaded_liters: 20000,
                    }),
                )
                .mockResolvedValueOnce(
                    makeManifestEntity({ status: 'FLAGGED' }),
                );

            await service.updateStatus(
                'manifest-001',
                'COMPLETED',
                USER_ID,
                'DISPATCHER',
                { volume_discharged_liters: 19000 }, // 5% variance — should flag
            );

            expect(manifestRepo.update).toHaveBeenCalledWith(
                'manifest-001',
                expect.objectContaining({ status: 'FLAGGED' }),
            );
        });

        it('completes normally if variance <= 2%', async () => {
            manifestRepo.findOne
                .mockResolvedValueOnce(
                    makeManifestEntity({
                        status: 'DISCHARGING',
                        volume_loaded_liters: 20000,
                    }),
                )
                .mockResolvedValueOnce(
                    makeManifestEntity({ status: 'COMPLETED' }),
                );

            await service.updateStatus(
                'manifest-001',
                'COMPLETED',
                USER_ID,
                'DISPATCHER',
                { volume_discharged_liters: 19800 }, // 1% variance — OK
            );

            expect(manifestRepo.update).toHaveBeenCalledWith(
                'manifest-001',
                expect.objectContaining({ status: 'COMPLETED' }),
            );
        });
    });
});
