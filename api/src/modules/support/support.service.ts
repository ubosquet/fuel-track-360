import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { SupportTokenEntity } from './entities/support-token.entity';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupportJwtPayload {
    type: 'SUPPORT_SESSION';
    support_token_id: string;
    organization_id: string;
    ticket_ref: string;
    redeemed_by_email: string;
    /** unix epoch seconds */
    exp: number;
    iat: number;
}

export interface GenerateTokenResult {
    /** The raw token — shown ONCE, never stored */
    raw_token: string;
    token: Pick<
        SupportTokenEntity,
        'id' | 'ticket_ref' | 'expires_at' | 'created_by_name'
    >;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const SESSION_TTL_SEC = 60 * 60;              // 1 h

@Injectable()
export class SupportService {
    private readonly logger = new Logger(SupportService.name);

    constructor(
        @InjectRepository(SupportTokenEntity)
        private readonly tokenRepo: Repository<SupportTokenEntity>,
        private readonly config: ConfigService,
    ) { }

    // ── Token generation ────────────────────────────────────────────────────

    async generateToken(opts: {
        organization_id: string;
        ticket_ref: string;
        created_by_user_id: string;
        created_by_name: string;
        ttl_ms?: number;
    }): Promise<GenerateTokenResult> {
        const rawToken = crypto.randomBytes(32).toString('hex'); // 64-char hex
        const hash = this.hash(rawToken);

        const ttl = opts.ttl_ms ?? DEFAULT_TTL_MS;
        const expires = new Date(Date.now() + ttl);

        const entity = this.tokenRepo.create({
            organization_id: opts.organization_id,
            ticket_ref: opts.ticket_ref,
            token_hash: hash,
            created_by_user_id: opts.created_by_user_id,
            created_by_name: opts.created_by_name,
            expires_at: expires,
        });

        const saved = await this.tokenRepo.save(entity);
        this.logger.log(
            `Support token generated for org ${opts.organization_id} ticket ${opts.ticket_ref} by ${opts.created_by_name}`,
        );

        return {
            raw_token: rawToken,
            token: {
                id: saved.id,
                ticket_ref: saved.ticket_ref,
                expires_at: saved.expires_at,
                created_by_name: saved.created_by_name,
            },
        };
    }

    // ── List tokens for an org ──────────────────────────────────────────────

    async listTokens(organization_id: string): Promise<SupportTokenEntity[]> {
        return this.tokenRepo.find({
            where: { organization_id },
            order: { created_at: 'DESC' },
        });
    }

    // ── Revoke a token ──────────────────────────────────────────────────────

    async revokeToken(id: string, organization_id: string): Promise<void> {
        const token = await this.tokenRepo.findOne({ where: { id, organization_id } });
        if (!token) throw new NotFoundException('Support token not found');
        token.is_revoked = true;
        await this.tokenRepo.save(token);
        this.logger.log(`Support token ${id} revoked`);
    }

    // ── Redeem: raw token → support JWT ────────────────────────────────────

    async redeemToken(opts: {
        raw_token: string;
        redeemed_by_email: string;
    }): Promise<{ support_jwt: string; organization_id: string; ticket_ref: string }> {
        const hash = this.hash(opts.raw_token);
        const token = await this.tokenRepo.findOne({ where: { token_hash: hash } });

        if (!token) {
            throw new NotFoundException('Invalid support token');
        }

        if (token.is_revoked) {
            throw new ForbiddenException('This support token has been revoked');
        }

        if (new Date() > token.expires_at) {
            throw new ForbiddenException('This support token has expired');
        }

        if (token.redeemed_at) {
            throw new ForbiddenException(
                'This support token has already been used. Ask the customer to generate a new one.',
            );
        }

        // Mark as redeemed
        token.redeemed_at = new Date();
        token.redeemed_by_email = opts.redeemed_by_email;
        await this.tokenRepo.save(token);

        // Sign session JWT
        const payload: Omit<SupportJwtPayload, 'exp' | 'iat'> = {
            type: 'SUPPORT_SESSION',
            support_token_id: token.id,
            organization_id: token.organization_id,
            ticket_ref: token.ticket_ref,
            redeemed_by_email: opts.redeemed_by_email,
        };

        const secret = this.jwtSecret();
        const support_jwt = jwt.sign(payload, secret, { expiresIn: SESSION_TTL_SEC });

        this.logger.log(
            `Support token ${token.id} redeemed by ${opts.redeemed_by_email} for org ${token.organization_id}`,
        );

        return {
            support_jwt,
            organization_id: token.organization_id,
            ticket_ref: token.ticket_ref,
        };
    }

    // ── Validate a support JWT (used by guard) ──────────────────────────────

    validateJwt(raw: string): SupportJwtPayload {
        try {
            const payload = jwt.verify(raw, this.jwtSecret()) as SupportJwtPayload;
            if (payload.type !== 'SUPPORT_SESSION') {
                throw new Error('Not a support token');
            }
            return payload;
        } catch {
            throw new ForbiddenException('Invalid or expired support session');
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private hash(raw: string): string {
        return crypto.createHash('sha256').update(raw).digest('hex');
    }

    private jwtSecret(): string {
        const secret = this.config.get<string>('SUPPORT_JWT_SECRET');
        if (!secret) {
            throw new BadRequestException('SUPPORT_JWT_SECRET is not configured');
        }
        return secret;
    }
}
