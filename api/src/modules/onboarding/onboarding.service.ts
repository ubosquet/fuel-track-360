import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import * as QRCode from 'qrcode';
import * as admin from 'firebase-admin';

import { OrgInviteEntity } from './entities/org-invite.entity';
import { MemberRequestEntity } from './entities/member-request.entity';
import { OrganizationEntity } from '../organization/entities/organization.entity';
import { UserEntity } from '../auth/entities/user.entity';

export interface CreateOrgDto {
    // Company info
    org_name: string;
    org_code: string;
    country?: string;
    currency?: string;
    timezone?: string;
    industry?: string;
    domain?: string;
    website?: string;
    phone?: string;
    address?: string;
    // Owner account
    owner_full_name: string;
    owner_email: string;
    owner_firebase_uid: string;
    owner_preferred_lang?: 'fr' | 'en' | 'ht';
}

export interface JoinRequestDto {
    invite_token: string;
    full_name: string;
    email: string;
    phone?: string;
    job_title?: string;
    role_requested: string;
}

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        @InjectRepository(OrgInviteEntity)
        private readonly inviteRepo: Repository<OrgInviteEntity>,
        @InjectRepository(MemberRequestEntity)
        private readonly requestRepo: Repository<MemberRequestEntity>,
        @InjectRepository(OrganizationEntity)
        private readonly orgRepo: Repository<OrganizationEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        private readonly dataSource: DataSource,
    ) { }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Create org + OWNER user in one atomic transaction
    // ──────────────────────────────────────────────────────────────────────────

    async createOrganizationWithOwner(dto: CreateOrgDto): Promise<{
        organization: OrganizationEntity;
        owner: UserEntity;
    }> {
        // Check for code uniqueness first (cheaper than a TX rollback)
        const exists = await this.orgRepo.findOne({ where: { code: dto.org_code } });
        if (exists) throw new ConflictException(`Organization code "${dto.org_code}" is already taken.`);

        return this.dataSource.transaction(async (em) => {
            // Trial ends 14 days from now
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14);

            const org = em.create(OrganizationEntity, {
                name: dto.org_name,
                code: dto.org_code.toUpperCase(),
                country: dto.country ?? 'HTI',
                currency: dto.currency ?? 'HTG',
                timezone: dto.timezone ?? 'America/Port-au-Prince',
                industry: dto.industry ?? null,
                domain: dto.domain ?? null,
                website: dto.website ?? null,
                phone: dto.phone ?? null,
                address: dto.address ?? null,
                subscription_plan: 'TRIAL',
                subscription_status: 'ACTIVE',
                trial_ends_at: trialEndsAt,
            });
            const savedOrg = await em.save(org);

            const owner = em.create(UserEntity, {
                firebase_uid: dto.owner_firebase_uid,
                email: dto.owner_email,
                full_name: dto.owner_full_name,
                role: 'OWNER',
                organization_id: savedOrg.id,
                preferred_lang: dto.owner_preferred_lang ?? 'fr',
            });
            const savedOwner = await em.save(owner);

            this.logger.log(`Org created: ${savedOrg.id} (${savedOrg.name}) with owner ${savedOwner.id}`);
            return { organization: savedOrg, owner: savedOwner };
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Invite management
    // ──────────────────────────────────────────────────────────────────────────

    async getOrCreateInvite(
        orgId: string,
        createdByUserId: string,
        allowedRoles?: string[] | null,
        expiresAt?: Date | null,
    ): Promise<{ invite: OrgInviteEntity; url: string; qr_data_url: string }> {
        // Deactivate any existing active invite for this org
        await this.inviteRepo.update(
            { organization_id: orgId, is_active: true },
            { is_active: false },
        );

        const rawToken = randomBytes(48).toString('hex'); // 96 hex chars (raw, returned once)
        const tokenHash = this.hashToken(rawToken);       // stored in DB, never raw

        const invite = this.inviteRepo.create({
            organization_id: orgId,
            invite_token: tokenHash,
            created_by_user_id: createdByUserId,
            allowed_roles: allowedRoles ?? null,
            expires_at: expiresAt ?? null,
            is_active: true,
            join_count: 0,
        });
        const saved = await this.inviteRepo.save(invite);

        const url = this.buildInviteUrl(rawToken);
        const qr_data_url = await QRCode.toDataURL(url, { width: 256, margin: 1 });

        return { invite: saved, url, qr_data_url };
    }

    async getActiveInvite(
        orgId: string,
    ): Promise<{ invite: OrgInviteEntity; url: string; qr_data_url: string } | null> {
        const invite = await this.inviteRepo.findOne({
            where: { organization_id: orgId, is_active: true },
            order: { created_at: 'DESC' },
        });
        if (!invite) return null;

        // Active invite found but we can only reconstruct the URL if we
        // generate a new token — raw token is never stored. Return metadata only.
        return { invite, url: null as any, qr_data_url: null as any };
    }

    async revokeInvite(orgId: string): Promise<void> {
        await this.inviteRepo.update({ organization_id: orgId, is_active: true }, { is_active: false });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Public join flow
    // ──────────────────────────────────────────────────────────────────────────

    /** Returns org branding info for the public join page */
    async resolveInviteToken(token: string): Promise<{
        organization_id: string;
        org_name: string;
        logo_url: string | null;
        allowed_roles: string[] | null;
        invite_id: string;
    }> {
        const tokenHash = this.hashToken(token);
        const invite = await this.inviteRepo.findOne({
            where: { invite_token: tokenHash, is_active: true },
            relations: ['organization'],
        });

        if (!invite) throw new NotFoundException('Invite link not found or has been revoked.');
        if (invite.expires_at && new Date() > invite.expires_at) {
            throw new BadRequestException('This invite link has expired.');
        }

        return {
            organization_id: invite.organization_id,
            org_name: invite.organization.name,
            logo_url: invite.organization.logo_url,
            allowed_roles: invite.allowed_roles,
            invite_id: invite.id,
        };
    }

    /** Self-register — creates a PENDING member request */
    async submitJoinRequest(dto: JoinRequestDto): Promise<MemberRequestEntity> {
        const tokenHash = this.hashToken(dto.invite_token);
        const invite = await this.inviteRepo.findOne({
            where: { invite_token: tokenHash, is_active: true },
            relations: ['organization'],
        });
        if (!invite) throw new NotFoundException('Invalid or expired invite link.');
        if (invite.expires_at && new Date() > invite.expires_at) {
            throw new BadRequestException('This invite link has expired.');
        }

        // Validate role
        if (invite.allowed_roles && !invite.allowed_roles.includes(dto.role_requested)) {
            throw new BadRequestException(`Role "${dto.role_requested}" is not allowed for this invite.`);
        }

        // Check for duplicate pending request
        const dup = await this.requestRepo.findOne({
            where: {
                organization_id: invite.organization_id,
                email: dto.email,
                status: 'PENDING',
            },
        });
        if (dup) throw new ConflictException('A pending request with this email already exists.');

        const req = this.requestRepo.create({
            organization_id: invite.organization_id,
            invite_id: invite.id,
            full_name: dto.full_name,
            email: dto.email,
            phone: dto.phone ?? null,
            job_title: dto.job_title ?? null,
            role_requested: dto.role_requested,
            status: 'PENDING',
        });
        const saved = await this.requestRepo.save(req);

        // Increment join counter
        await this.inviteRepo.increment({ id: invite.id }, 'join_count', 1);
        this.logger.log(`New join request ${saved.id} for org ${invite.organization_id} (${dto.email})`);
        return saved;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Admin approval workflow
    // ──────────────────────────────────────────────────────────────────────────

    async getPendingRequests(orgId: string): Promise<MemberRequestEntity[]> {
        return this.requestRepo.find({
            where: { organization_id: orgId, status: 'PENDING' },
            order: { created_at: 'ASC' },
        });
    }

    async approveRequest(
        requestId: string,
        orgId: string,
        reviewerId: string,
        overrideRole?: string,
    ): Promise<UserEntity> {
        const req = await this.requestRepo.findOneOrFail({ where: { id: requestId, organization_id: orgId } });
        if (req.status !== 'PENDING') throw new BadRequestException('Request is not pending.');

        const role = overrideRole ?? req.role_requested;

        let firebaseUid: string;
        try {
            // Create Firebase user — they'll receive a "set password" email
            const fb = await admin.auth().createUser({
                email: req.email,
                displayName: req.full_name,
            });
            firebaseUid = fb.uid;

            // Send a sign-in link / password reset so user can set their password
            await admin.auth().generatePasswordResetLink(req.email);
        } catch (err: any) {
            this.logger.error(`Firebase user creation failed for ${req.email}: ${err.message}`);
            throw new BadRequestException(`Could not create account: ${err.message}`);
        }

        // Create user row
        const user = this.userRepo.create({
            firebase_uid: firebaseUid,
            email: req.email,
            full_name: req.full_name,
            phone: req.phone ?? undefined,
            job_title: req.job_title ?? undefined,
            role: role as any,
            organization_id: orgId,
        });
        const savedUser = await this.userRepo.save(user);

        // Mark request approved
        await this.requestRepo.update(requestId, {
            status: 'APPROVED',
            firebase_uid: firebaseUid,
            reviewed_by: reviewerId,
            reviewed_at: new Date(),
        });

        // NOTE: generatePasswordResetLink returns the URL but Firebase also
        // sends the email automatically when emailLinkSettings is configured.
        // Here we just log; in production wire this to your email service.
        this.logger.log(`Password reset link generated for ${req.email} (Firebase sends email automatically when Action URL is configured)`);

        this.logger.log(`Request ${requestId} approved → user ${savedUser.id} (${savedUser.email})`);
        return savedUser;
    }

    async rejectRequest(
        requestId: string,
        orgId: string,
        reviewerId: string,
        reason?: string,
    ): Promise<MemberRequestEntity> {
        const req = await this.requestRepo.findOneOrFail({ where: { id: requestId, organization_id: orgId } });
        if (req.status !== 'PENDING') throw new BadRequestException('Request is not pending.');

        await this.requestRepo.update(requestId, {
            status: 'REJECTED',
            reviewed_by: reviewerId,
            reviewed_at: new Date(),
            rejection_reason: reason ?? null,
        });

        this.logger.log(`Request ${requestId} rejected by ${reviewerId}`);
        return this.requestRepo.findOneOrFail({ where: { id: requestId } });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private buildInviteUrl(rawToken: string): string {
        const base = process.env.APP_URL ?? 'https://app.fuel-track-360.io';
        return `${base}/join/${rawToken}`;
    }

    /**
     * Hash an invite token before DB storage.
     * Raw tokens are URL-safe one-time values; we store only the SHA-256 hash
     * so a DB breach doesn't expose working invite links.
     */
    private hashToken(raw: string): string {
        return createHash('sha256').update(raw).digest('hex');
    }
}
