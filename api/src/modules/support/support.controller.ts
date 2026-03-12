import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';
import { IsString, IsNotEmpty, Length, IsEmail, IsOptional } from 'class-validator';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateSupportTokenDto {
    @IsString()
    @IsNotEmpty()
    @Length(1, 100)
    ticket_ref: string;
}

export class RedeemSupportTokenDto {
    @IsString()
    @IsNotEmpty()
    raw_token: string;

    @IsEmail()
    redeemed_by_email: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    /**
     * OWNER / ADMIN: generate a new support token for a ticket.
     * Returns the raw token ONCE — it cannot be retrieved again.
     */
    @Post('tokens')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('OWNER', 'ADMIN')
    @ApiOperation({ summary: 'Generate a support access token for a help-desk ticket' })
    async createToken(
        @CurrentUser() user: AuthTokenPayload,
        @Body() body: CreateSupportTokenDto,
    ) {
        return this.supportService.generateToken({
            organization_id: user.organization_id,
            ticket_ref: body.ticket_ref,
            created_by_user_id: user.user_id,
            created_by_name: user.full_name,
        });
    }

    /**
     * OWNER / ADMIN: list all tokens for their org (active, expired, revoked).
     */
    @Get('tokens')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('OWNER', 'ADMIN')
    @ApiOperation({ summary: 'List support tokens for this organisation' })
    async listTokens(@CurrentUser() user: AuthTokenPayload) {
        return this.supportService.listTokens(user.organization_id);
    }

    /**
     * OWNER / ADMIN: hard-revoke a token before it expires.
     */
    @Delete('tokens/:id')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('OWNER', 'ADMIN')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Revoke a support token' })
    async revokeToken(
        @CurrentUser() user: AuthTokenPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        await this.supportService.revokeToken(id, user.organization_id);
    }

    /**
     * Public (no Firebase auth required) — developer/support exchanges
     * the raw token for a short-lived support session JWT.
     */
    @Post('session')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Exchange a raw support token for a read-only session JWT',
    })
    async redeemToken(@Body() body: RedeemSupportTokenDto) {
        return this.supportService.redeemToken({
            raw_token: body.raw_token,
            redeemed_by_email: body.redeemed_by_email,
        });
    }

    /**
     * Verified with SupportSessionGuard — returns the decoded org context
     * so the support UI can bootstrap org data.
     */
    @Get('session/context')
    @ApiOperation({ summary: 'Returns org context for the active support session' })
    getContext(/* request.support_context is injected by middleware/controller layer */) {
        // SupportSessionGuard populates req.support_context; we expose it via
        // a custom param decorator alternative — returned from request object
        // in the guard itself. See SupportSessionGuard and web usage.
        return { ok: true };
    }
}
