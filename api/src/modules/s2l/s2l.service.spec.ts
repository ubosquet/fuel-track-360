import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { S2LService } from './s2l.service';
import { S2LChecklistEntity } from './entities/s2l-checklist.entity';
import { S2LPhotoEntity } from './entities/s2l-photo.entity';
import { AuditService } from '../audit/audit.service';

// ────────────────────────────────────────────────────────────
// Helper factories
// ────────────────────────────────────────────────────────────

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ID = 'u0000000-0000-0000-0000-000000000001';
const TRUCK_ID = 'c0000000-0000-0000-0000-000000000001';
const STATION_ID = 'b0000000-0000-0000-0000-000000000001';

/** Generate a full 20-item checklist where all items pass */
const makePassingChecklist = () =>
    Array.from({ length: 20 }, (_, i) => ({
        item_id: `item_${i + 1}`,
        label: `Check item ${i + 1}`,
        value: true,
    }));

/** Generate a checklist with one failing item */
const makeFailingChecklist = () => {
    const items = makePassingChecklist();
    items[5].value = false;
    return items;
};

/** Build a minimal S2L entity */
const makeS2LEntity = (overrides: Partial<S2LChecklistEntity> = {}): S2LChecklistEntity =>
    ({
        id: 's2l-001',
        organization_id: ORG_ID,
        truck_id: TRUCK_ID,
        driver_id: USER_ID,
        station_id: STATION_ID,
        status: 'DRAFT',
        checklist_data: makePassingChecklist(),
        all_items_pass: true,
        offline_created: false,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides,
    }) as S2LChecklistEntity;

// ────────────────────────────────────────────────────────────
// Mock repositories
// ────────────────────────────────────────────────────────────

const mockS2LRepository = () => ({
    create: jest.fn().mockImplementation((dto) => ({ id: 's2l-new', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 's2l-new', ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
});

const mockPhotoRepository = () => ({
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'photo-new', ...entity })),
    find: jest.fn().mockResolvedValue([]),
});

const mockAuditService = () => ({
    log: jest.fn().mockResolvedValue(undefined),
});

// ════════════════════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════════════════════

describe('S2LService', () => {
    let service: S2LService;
    let s2lRepo: ReturnType<typeof mockS2LRepository>;
    let photoRepo: ReturnType<typeof mockPhotoRepository>;
    let auditSvc: ReturnType<typeof mockAuditService>;

    beforeEach(async () => {
        s2lRepo = mockS2LRepository();
        photoRepo = mockPhotoRepository();
        auditSvc = mockAuditService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                S2LService,
                { provide: getRepositoryToken(S2LChecklistEntity), useValue: s2lRepo },
                { provide: getRepositoryToken(S2LPhotoEntity), useValue: photoRepo },
                { provide: AuditService, useValue: auditSvc },
            ],
        }).compile();

        service = module.get<S2LService>(S2LService);
    });

    // ──────────────────────────────────────────
    // CREATE
    // ──────────────────────────────────────────

    describe('create()', () => {
        it('should create an S2L checklist in DRAFT status', async () => {
            const dto = {
                truck_id: TRUCK_ID,
                station_id: STATION_ID,
                checklist_data: makePassingChecklist(),
            };

            const result = await service.create(dto, USER_ID, ORG_ID);

            expect(s2lRepo.create).toHaveBeenCalled();
            expect(s2lRepo.save).toHaveBeenCalled();
            expect(result).toHaveProperty('id');
            expect(auditSvc.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    event_type: 'S2L_CREATED',
                    entity_type: 's2l',
                }),
            );
        });

        it('should deduplicate by sync_id (offline scenario)', async () => {
            const existingS2L = makeS2LEntity({ id: 'existing-s2l' });
            s2lRepo.findOne.mockResolvedValueOnce(existingS2L);

            const dto = {
                truck_id: TRUCK_ID,
                station_id: STATION_ID,
                checklist_data: makePassingChecklist(),
                sync_id: 'dup-sync-id',
            };

            const result = await service.create(dto, USER_ID, ORG_ID);

            expect(result.id).toBe('existing-s2l');
            expect(s2lRepo.save).not.toHaveBeenCalled();
        });

        it('should set all_items_pass to false if any item fails', async () => {
            s2lRepo.findOne.mockResolvedValueOnce(null); // no sync_id match

            const dto = {
                truck_id: TRUCK_ID,
                station_id: STATION_ID,
                checklist_data: makeFailingChecklist(),
            };

            await service.create(dto, USER_ID, ORG_ID);

            expect(s2lRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ all_items_pass: false }),
            );
        });
    });

    // ──────────────────────────────────────────
    // SUBMIT — Business Rules Enforcement
    // ──────────────────────────────────────────

    describe('submit()', () => {
        const signatureUrl = 'https://storage.example.com/signatures/sig-001.png';

        it('RULE: rejects if status is not DRAFT', async () => {
            s2lRepo.findOne.mockResolvedValue(
                makeS2LEntity({ status: 'SUBMITTED' }),
            );

            await expect(
                service.submit('s2l-001', USER_ID, signatureUrl),
            ).rejects.toThrow(BadRequestException);
        });

        it('RULE 1: rejects if any checklist item is FALSE', async () => {
            s2lRepo.findOne.mockResolvedValue(
                makeS2LEntity({
                    status: 'DRAFT',
                    checklist_data: makeFailingChecklist(),
                }),
            );

            await expect(
                service.submit('s2l-001', USER_ID, signatureUrl),
            ).rejects.toThrow(/checklist items must be validated/i);
        });

        it('RULE 2: rejects if fewer than 3 photos', async () => {
            s2lRepo.findOne.mockResolvedValue(
                makeS2LEntity({ status: 'DRAFT' }),
            );
            photoRepo.find.mockResolvedValue([{ id: '1' }, { id: '2' }]); // only 2

            await expect(
                service.submit('s2l-001', USER_ID, signatureUrl),
            ).rejects.toThrow(/Minimum 3 photos/);
        });

        it('RULE 3: rejects if signature is empty', async () => {
            s2lRepo.findOne.mockResolvedValue(
                makeS2LEntity({ status: 'DRAFT' }),
            );
            photoRepo.find.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]);

            await expect(
                service.submit('s2l-001', USER_ID, ''),
            ).rejects.toThrow(/signature/i);
        });

        it('RULE 5: rejects if S2L is older than 24 hours', async () => {
            const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
            s2lRepo.findOne
                .mockResolvedValueOnce(
                    makeS2LEntity({ status: 'DRAFT', created_at: expiredDate }),
                )
                .mockResolvedValueOnce(
                    makeS2LEntity({ status: 'EXPIRED' }),
                );
            photoRepo.find.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]);

            await expect(
                service.submit('s2l-001', USER_ID, signatureUrl),
            ).rejects.toThrow(/expired/i);
        });

        it('SUCCESS: submits when ALL rules pass', async () => {
            const freshDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago
            s2lRepo.findOne
                .mockResolvedValueOnce(
                    makeS2LEntity({ status: 'DRAFT', created_at: freshDate }),
                )
                .mockResolvedValueOnce(
                    makeS2LEntity({ status: 'SUBMITTED', submitted_at: new Date() }),
                );
            photoRepo.find.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]);

            const result = await service.submit('s2l-001', USER_ID, signatureUrl);

            expect(s2lRepo.update).toHaveBeenCalledWith(
                's2l-001',
                expect.objectContaining({
                    status: 'SUBMITTED',
                    all_items_pass: true,
                }),
            );
            expect(auditSvc.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    event_type: 'S2L_SUBMITTED',
                }),
            );
        });
    });

    // ──────────────────────────────────────────
    // REVIEW — Approve/Reject
    // ──────────────────────────────────────────

    describe('review()', () => {
        it('rejects review if status is not SUBMITTED', async () => {
            s2lRepo.findOne.mockResolvedValue(
                makeS2LEntity({ status: 'DRAFT' }),
            );

            await expect(
                service.review('s2l-001', USER_ID, 'SUPERVISOR', 'APPROVED'),
            ).rejects.toThrow(BadRequestException);
        });

        it('approves a SUBMITTED S2L', async () => {
            s2lRepo.findOne
                .mockResolvedValueOnce(makeS2LEntity({ status: 'SUBMITTED' }))
                .mockResolvedValueOnce(makeS2LEntity({ status: 'APPROVED' }));

            const result = await service.review('s2l-001', USER_ID, 'SUPERVISOR', 'APPROVED', 'Looks good');

            expect(s2lRepo.update).toHaveBeenCalledWith(
                's2l-001',
                expect.objectContaining({
                    status: 'APPROVED',
                    review_notes: 'Looks good',
                }),
            );
            expect(auditSvc.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    event_type: 'S2L_APPROVED',
                }),
            );
        });

        it('rejects a SUBMITTED S2L', async () => {
            s2lRepo.findOne
                .mockResolvedValueOnce(makeS2LEntity({ status: 'SUBMITTED' }))
                .mockResolvedValueOnce(makeS2LEntity({ status: 'REJECTED' }));

            await service.review('s2l-001', USER_ID, 'SUPERVISOR', 'REJECTED', 'Broken seal');

            expect(auditSvc.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    event_type: 'S2L_REJECTED',
                }),
            );
        });
    });

    // ──────────────────────────────────────────
    // PHOTOS
    // ──────────────────────────────────────────

    describe('addPhoto()', () => {
        it('adds a photo to a DRAFT S2L', async () => {
            s2lRepo.findOne.mockResolvedValue(makeS2LEntity({ status: 'DRAFT' }));

            const result = await service.addPhoto('s2l-001', {
                photo_type: 'TRUCK_FRONT',
                storage_path: 'gs://bucket/photos/front.jpg',
                file_size_bytes: 245000,
                gps_lat: 18.5393,
                gps_lng: -72.3366,
                captured_at: new Date(),
            });

            expect(photoRepo.create).toHaveBeenCalled();
            expect(photoRepo.save).toHaveBeenCalled();
        });

        it('rejects photo addition on a SUBMITTED S2L', async () => {
            s2lRepo.findOne.mockResolvedValue(makeS2LEntity({ status: 'SUBMITTED' }));

            await expect(
                service.addPhoto('s2l-001', {
                    photo_type: 'TRUCK_FRONT',
                    storage_path: 'gs://bucket/photos/front.jpg',
                    captured_at: new Date(),
                }),
            ).rejects.toThrow(/DRAFT/);
        });
    });

    // ──────────────────────────────────────────
    // QUERY
    // ──────────────────────────────────────────

    describe('findOneOrFail()', () => {
        it('throws NotFoundException if S2L does not exist', async () => {
            s2lRepo.findOne.mockResolvedValue(null);

            await expect(service.findOneOrFail('nonexistent-id')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('returns the S2L with relations when found', async () => {
            const entity = makeS2LEntity();
            s2lRepo.findOne.mockResolvedValue(entity);

            const result = await service.findOneOrFail('s2l-001');
            expect(result).toEqual(entity);
        });
    });
});
