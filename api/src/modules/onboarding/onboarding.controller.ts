import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    ParseUUIDPipe,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
    IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum,
    IsArray, MaxLength, IsISO8601,
} from 'class-validator';
import { OnboardingService } from './onboarding.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';

// ── DTOs ─────────────────────────────────────────────────────────────────────

// Valid roles a member can request (never OWNER/ADMIN — those are admin-granted only)
const REQUESTABLE_ROLES = ['DRIVER', 'DISPATCHER', 'FINANCE', 'SUPERVISOR'] as const;

class CreateOrgBodyDto {
    @IsString() @IsNotEmpty() @MaxLength(100)
    org_name!: string;

    @IsString() @IsNotEmpty() @MaxLength(20)
    org_code!: string;

    @IsOptional() @IsString() @MaxLength(3)
    country?: string;

    @IsOptional() @IsString() @MaxLength(3)
    currency?: string;

    @IsOptional() @IsString() @MaxLength(50)
    timezone?: string;

    @IsOptional() @IsString() @MaxLength(50)
    industry?: string;

    @IsOptional() @IsString() @MaxLength(253)
    domain?: string;

    @IsOptional() @IsString() @MaxLength(500)
    website?: string;

    @IsOptional() @IsString() @MaxLength(30)
    phone?: string;

    @IsOptional() @IsString() @MaxLength(500)
    address?: string;

    @IsString() @IsNotEmpty() @MaxLength(100)
    owner_full_name!: string;

    @IsEmail()
    owner_email!: string;

    /** Firebase UID — assigned by Firebase, 28-char alphanum */
    @IsString() @IsNotEmpty() @MaxLength(128)
    owner_firebase_uid!: string;

    @IsOptional() @IsEnum(['fr', 'en', 'ht'])
    owner_preferred_lang?: 'fr' | 'en' | 'ht';
}

class JoinBodyDto {
    @IsString() @IsNotEmpty() @MaxLength(96)
    invite_token!: string;

    @IsString() @IsNotEmpty() @MaxLength(100)
    full_name!: string;

    @IsEmail()
    email!: string;

    @IsOptional() @IsString() @MaxLength(30)
    phone?: string;

    @IsOptional() @IsString() @MaxLength(100)
    job_title?: string;

    @IsEnum(REQUESTABLE_ROLES)
    role_requested!: string;
}

class GenerateInviteBodyDto {
    @IsOptional() @IsArray() @IsEnum(REQUESTABLE_ROLES, { each: true })
    allowed_roles?: string[];

    @IsOptional() @IsISO8601()
    expires_at?: string;
}

class ApproveBodyDto {
    @IsOptional() @IsString() @IsEnum([...REQUESTABLE_ROLES, 'BILLING_ADMIN', 'ONBOARDING_ADMIN'])
    override_role?: string;
}

class RejectBodyDto {
    @IsOptional() @IsString() @MaxLength(500)
    reason?: string;
}

// ────────────────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['OWNER', 'ADMIN', 'ONBOARDING_ADMIN'] as const;

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
    constructor(private readonly onboarding: OnboardingService) { }

    // ── Public: self-service org creation ────────────────────────────────────

    /**
     * Public endpoint — no auth required.
     * Called by the sign-up wizard after the user creates their Firebase account.
     */
    @Post('start')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new organization with its OWNER (public, no auth)' })
    async start(@Body() body: CreateOrgBodyDto) {
        return this.onboarding.createOrganizationWithOwner(body);
    }

    // ── Public: invite resolution & join ─────────────────────────────────────

    @Get('invite/:token')
    @ApiOperation({ summary: 'Resolve an invite token → returns org branding + allowed roles (public)' })
    async resolveInvite(@Param('token') token: string) {
        return this.onboarding.resolveInviteToken(token);
    }

    @Post('join')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Submit a member join request (public, no auth)' })
    async join(@Body() body: JoinBodyDto) {
        return this.onboarding.submitJoinRequest(body);
    }

    // ── Protected: invite management (OWNER / ADMIN / ONBOARDING_ADMIN) ──────

    @Post('invite')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles(...ADMIN_ROLES)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Generate (or rotate) invite URL + QR code for the org' })
    async generateInvite(
        @Body() body: GenerateInviteBodyDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.onboarding.getOrCreateInvite(
            user.organization_id,
            user.user_id,
            body.allowed_roles,
            body.expires_at ? new Date(body.expires_at) : null,
        );
    }

    @Get('invite')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles(...ADMIN_ROLES)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current active invite URL + QR code' })
    async getInvite(@CurrentUser() user: AuthTokenPayload) {
        const result = await this.onboarding.getActiveInvite(user.organization_id);
        if (!result) return { invite: null, url: null, qr_data_url: null };
        return result;
    }

    @Delete('invite')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('OWNER', 'ADMIN')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Revoke the current active invite link' })
    async revokeInvite(@CurrentUser() user: AuthTokenPayload) {
        await this.onboarding.revokeInvite(user.organization_id);
    }

    // ── Protected: member request approval ───────────────────────────────────

    @Get('requests')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles(...ADMIN_ROLES)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List pending member join requests for the org' })
    async listRequests(@CurrentUser() user: AuthTokenPayload) {
        return this.onboarding.getPendingRequests(user.organization_id);
    }

    @Put('requests/:id/approve')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles(...ADMIN_ROLES)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve a member request → creates Firebase user + DB record' })
    async approve(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: ApproveBodyDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.onboarding.approveRequest(id, user.organization_id, user.user_id, body.override_role);
    }

    @Put('requests/:id/reject')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles(...ADMIN_ROLES)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reject a member request with optional reason' })
    async reject(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: RejectBodyDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.onboarding.rejectRequest(id, user.organization_id, user.user_id, body.reason);
    }
}
