import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';

const ADMIN_ROLES = ['ADMIN', 'OWNER', 'SUPERVISOR'] as const;
const ALL_ROLES = ['ADMIN', 'OWNER', 'SUPERVISOR', 'DRIVER', 'DISPATCHER', 'FINANCE'] as const;

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AIController {
    constructor(private readonly aiService: AIService) { }

    /**
     * Analyse a flagged manifest — root cause, confidence, recommended action.
     * Admin/supervisor trigger this from the manifest detail view.
     */
    @Post('manifest/:id/analyze')
    @Roles(...ADMIN_ROLES)
    @ApiOperation({ summary: 'Gemini analysis of a flagged manifest (root cause + recommendation)' })
    async analyzeManifest(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.aiService.analyzeManifest(id, user.organization_id);
    }

    /**
     * Driver coaching — personal tips, strengths, improvement areas, weekly goal.
     * Drivers call this for themselves; admins can call for any driver.
     */
    @Get('driver/me/coach')
    @Roles(...ALL_ROLES)
    @ApiOperation({ summary: 'AI performance coaching for the current driver' })
    async coachMe(@CurrentUser() user: AuthTokenPayload) {
        return this.aiService.coachDriver(user.user_id, user.organization_id);
    }

    @Get('driver/:driverId/coach')
    @Roles(...ADMIN_ROLES)
    @ApiOperation({ summary: 'AI performance coaching for a specific driver (admin view)' })
    async coachDriver(
        @Param('driverId', ParseUUIDPipe) driverId: string,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.aiService.coachDriver(driverId, user.organization_id);
    }

    /**
     * S2L rejection pattern scan — surface systemic safety risks across the fleet.
     */
    @Post('s2l/pattern-scan')
    @Roles(...ADMIN_ROLES)
    @ApiOperation({ summary: 'Scan recent S2L rejections for systemic patterns' })
    @ApiQuery({ name: 'from', required: false, description: 'ISO date string, defaults to 30 days ago' })
    async scanPatterns(
        @CurrentUser() user: AuthTokenPayload,
        @Query('from') from?: string,
    ) {
        return this.aiService.scanS2LPatterns(user.organization_id, from);
    }
}
