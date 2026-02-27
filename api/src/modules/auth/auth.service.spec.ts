import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';

// ────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ID = 'u0000000-0000-0000-0000-000000000001';

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
    ({
        id: USER_ID,
        organization_id: ORG_ID,
        firebase_uid: 'firebase-uid-001',
        email: 'driver@example.com',
        full_name: 'Test Driver',
        role: 'DRIVER',
        preferred_lang: 'fr',
        is_active: true,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides,
    }) as UserEntity;

const mockUserRepo = () => ({
    create: jest.fn().mockImplementation((dto) => ({ id: 'new-user-id', ...dto })),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'new-user-id', ...e })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue(undefined),
});

// ════════════════════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════════════════════

describe('AuthService', () => {
    let service: AuthService;
    let userRepo: ReturnType<typeof mockUserRepo>;

    beforeEach(async () => {
        userRepo = mockUserRepo();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: getRepositoryToken(UserEntity), useValue: userRepo },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    // ──────────────────────────────────────────
    // createUser
    // ──────────────────────────────────────────

    describe('createUser()', () => {
        const validPayload = {
            firebase_uid: 'firebase-uid-new',
            full_name: 'New Driver',
            role: 'DRIVER',
            organization_id: ORG_ID,
        };

        it('creates a user when no duplicate Firebase UID exists', async () => {
            userRepo.findOne.mockResolvedValue(null);

            const result = await service.createUser(validPayload);

            expect(userRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ firebase_uid: 'firebase-uid-new', role: 'DRIVER' }),
            );
            expect(userRepo.save).toHaveBeenCalled();
            expect(result).toHaveProperty('id');
        });

        it('throws ConflictException if Firebase UID is already registered', async () => {
            userRepo.findOne.mockResolvedValue(makeUser({ firebase_uid: 'firebase-uid-new' }));

            await expect(service.createUser(validPayload)).rejects.toThrow(ConflictException);
        });
    });

    // ──────────────────────────────────────────
    // updateUser — last-owner protection
    // ──────────────────────────────────────────

    describe('updateUser() — last-owner protection', () => {
        it('throws ForbiddenException when deactivating the last OWNER', async () => {
            userRepo.findOne.mockResolvedValue(makeUser({ role: 'OWNER' }));
            userRepo.count.mockResolvedValue(1); // only 1 owner

            await expect(
                service.updateUser(USER_ID, ORG_ID, { is_active: false }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('allows deactivation if multiple OWNERs exist', async () => {
            userRepo.findOne.mockResolvedValue(makeUser({ role: 'OWNER' }));
            userRepo.count.mockResolvedValue(2); // 2 owners — safe to deactivate one

            const updated = makeUser({ is_active: false });
            userRepo.save.mockResolvedValue(updated);

            const result = await service.updateUser(USER_ID, ORG_ID, { is_active: false });
            expect(result.is_active).toBe(false);
        });

        it('throws ForbiddenException when changing role of the last OWNER', async () => {
            userRepo.findOne.mockResolvedValue(makeUser({ role: 'OWNER' }));
            userRepo.count.mockResolvedValue(1);

            await expect(
                service.updateUser(USER_ID, ORG_ID, { role: 'ADMIN' }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('allows role change if another OWNER still exists', async () => {
            userRepo.findOne.mockResolvedValue(makeUser({ role: 'OWNER' }));
            userRepo.count.mockResolvedValue(2);

            const updated = makeUser({ role: 'ADMIN' });
            userRepo.save.mockResolvedValue(updated);

            const result = await service.updateUser(USER_ID, ORG_ID, { role: 'ADMIN' });
            expect(result.role).toBe('ADMIN');
        });
    });

    // ──────────────────────────────────────────
    // getUserByFirebaseUid
    // ──────────────────────────────────────────

    describe('getUserByFirebaseUid()', () => {
        it('returns null if the user is inactive (is_active=false)', async () => {
            // The query uses { firebase_uid, is_active: true }
            // If is_active is false in DB, findOne returns null
            userRepo.findOne.mockResolvedValue(null);

            const result = await service.getUserByFirebaseUid('firebase-uid-inactive');
            expect(result).toBeNull();
        });

        it('returns the user when found and active', async () => {
            userRepo.findOne.mockResolvedValue(makeUser());

            const result = await service.getUserByFirebaseUid('firebase-uid-001');
            expect(result?.id).toBe(USER_ID);
        });
    });

    // ──────────────────────────────────────────
    // updateLastLogin
    // ──────────────────────────────────────────

    describe('updateLastLogin()', () => {
        it('updates last_login_at for the given user', async () => {
            await service.updateLastLogin(USER_ID);

            expect(userRepo.update).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({ last_login_at: expect.any(Date) }),
            );
        });
    });
});
