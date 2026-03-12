import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupportService } from './support.service';
import { SupportTokenEntity } from './entities/support-token.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORG_ID = 'org-0000-0001';
const USER_ID = 'usr-0000-0001';
const USER_NAME = 'Alice Admin';
const DEV_EMAIL = 'dev@saas.io';
const SECRET = 'test-secret-at-least-32-characters-long';

function sha256(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

function makeToken(overrides: Partial<SupportTokenEntity> = {}): SupportTokenEntity {
    const base: Partial<SupportTokenEntity> = {
        id: 'tok-0001',
        organization_id: ORG_ID,
        ticket_ref: 'TICKET-001',
        token_hash: sha256('raw-token-here'),
        created_by_user_id: USER_ID,
        created_by_name: USER_NAME,
        expires_at: new Date(Date.now() + 86_400_000),
        redeemed_at: null,
        redeemed_by_email: null,
        is_revoked: false,
        created_at: new Date(),
    };
    return { ...base, ...overrides } as SupportTokenEntity;
}

function makeRepo(token?: SupportTokenEntity) {
    return {
        create: jest.fn().mockImplementation((d) => d),
        save: jest.fn().mockImplementation((d) => Promise.resolve({ ...d, id: 'tok-0001', created_at: new Date() })),
        find: jest.fn().mockResolvedValue(token ? [token] : []),
        findOne: jest.fn().mockResolvedValue(token ?? null),
    };
}

function makeConfig(secret = SECRET) {
    return { get: jest.fn().mockReturnValue(secret) };
}

async function build(repo: any, config: any) {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            SupportService,
            { provide: getRepositoryToken(SupportTokenEntity), useValue: repo },
            { provide: ConfigService, useValue: config },
        ],
    }).compile();
    return module.get<SupportService>(SupportService);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SupportService', () => {

    // ── generateToken ───────────────────────────────────────────────────────

    describe('generateToken()', () => {
        it('stores a hashed token, never the raw token', async () => {
            const repo = makeRepo();
            const svc = await build(repo, makeConfig());

            const result = await svc.generateToken({
                organization_id: ORG_ID,
                ticket_ref: 'TICKET-001',
                created_by_user_id: USER_ID,
                created_by_name: USER_NAME,
            });

            const savedCall = repo.save.mock.calls[0][0];
            expect(savedCall.token_hash).toBe(sha256(result.raw_token));
            expect(savedCall).not.toHaveProperty('raw_token');
        });

        it('returns a 64-character hex raw token', async () => {
            const repo = makeRepo();
            const svc = await build(repo, makeConfig());
            const { raw_token } = await svc.generateToken({
                organization_id: ORG_ID, ticket_ref: 'T-002',
                created_by_user_id: USER_ID, created_by_name: USER_NAME,
            });
            expect(raw_token).toMatch(/^[0-9a-f]{64}$/);
        });
    });

    // ── revokeToken ─────────────────────────────────────────────────────────

    describe('revokeToken()', () => {
        it('sets is_revoked=true', async () => {
            const token = makeToken();
            const repo = makeRepo(token);
            const svc = await build(repo, makeConfig());
            await svc.revokeToken('tok-0001', ORG_ID);
            expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ is_revoked: true }));
        });

        it('throws NotFoundException for unknown token', async () => {
            const repo = makeRepo(); // findOne returns null
            const svc = await build(repo, makeConfig());
            await expect(svc.revokeToken('fake-id', ORG_ID)).rejects.toThrow(NotFoundException);
        });
    });

    // ── redeemToken ─────────────────────────────────────────────────────────

    describe('redeemToken()', () => {
        const RAW = 'a'.repeat(64);

        it('returns a support_jwt for a valid unredeemed token', async () => {
            const token = makeToken({ token_hash: sha256(RAW) });
            const repo = makeRepo(token);
            const svc = await build(repo, makeConfig());

            const result = await svc.redeemToken({ raw_token: RAW, redeemed_by_email: DEV_EMAIL });
            expect(result.support_jwt).toBeDefined();
            expect(result.organization_id).toBe(ORG_ID);
        });

        it('marks token as redeemed after first use', async () => {
            const token = makeToken({ token_hash: sha256(RAW) });
            const repo = makeRepo(token);
            const svc = await build(repo, makeConfig());
            await svc.redeemToken({ raw_token: RAW, redeemed_by_email: DEV_EMAIL });
            expect(repo.save).toHaveBeenCalledWith(
                expect.objectContaining({ redeemed_by_email: DEV_EMAIL }),
            );
        });

        it('throws ForbiddenException for already-redeemed token', async () => {
            const token = makeToken({ token_hash: sha256(RAW), redeemed_at: new Date() });
            const repo = makeRepo(token);
            const svc = await build(repo, makeConfig());
            await expect(
                svc.redeemToken({ raw_token: RAW, redeemed_by_email: DEV_EMAIL }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('throws ForbiddenException for revoked token', async () => {
            const token = makeToken({ token_hash: sha256(RAW), is_revoked: true });
            const repo = makeRepo(token);
            const svc = await build(repo, makeConfig());
            await expect(
                svc.redeemToken({ raw_token: RAW, redeemed_by_email: DEV_EMAIL }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('throws ForbiddenException for expired token', async () => {
            const token = makeToken({ token_hash: sha256(RAW), expires_at: new Date(Date.now() - 1000) });
            const repo = makeRepo(token);
            const svc = await build(repo, makeConfig());
            await expect(
                svc.redeemToken({ raw_token: RAW, redeemed_by_email: DEV_EMAIL }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('throws NotFoundException for unknown raw token', async () => {
            const repo = makeRepo(); // findOne returns null
            const svc = await build(repo, makeConfig());
            await expect(
                svc.redeemToken({ raw_token: 'completely-wrong', redeemed_by_email: DEV_EMAIL }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ── validateJwt ─────────────────────────────────────────────────────────

    describe('validateJwt()', () => {
        it('round-trips correctly — signed then verified', async () => {
            const RAW = 'b'.repeat(64);
            const token = makeToken({ token_hash: sha256(RAW) });
            const repo = makeRepo(token);
            const svc = await build(repo, makeConfig());

            const { support_jwt } = await svc.redeemToken({ raw_token: RAW, redeemed_by_email: DEV_EMAIL });
            const payload = svc.validateJwt(support_jwt);

            expect(payload.organization_id).toBe(ORG_ID);
            expect(payload.redeemed_by_email).toBe(DEV_EMAIL);
            expect(payload.type).toBe('SUPPORT_SESSION');
        });

        it('throws ForbiddenException for a tampered JWT', async () => {
            const repo = makeRepo();
            const svc = await build(repo, makeConfig());
            await expect(() => svc.validateJwt('not.a.jwt')).toThrow(ForbiddenException);
        });
    });
});
