import {
    Controller,
    Get,
    Query,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';

const ADMIN_ROLES = ['ADMIN', 'OWNER', 'SUPERVISOR'] as const;
const ALL_ROLES = ['ADMIN', 'OWNER', 'SUPERVISOR', 'DRIVER', 'DISPATCHER', 'FINANCE'] as const;

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    // ── Org Overview ─────────────────────────────────────────────────────────

    @Get('overview')
    @Roles(...ADMIN_ROLES)
    @ApiOperation({ summary: 'Org-wide KPIs: completion rate, on-time rate, volume stats' })
    @ApiQuery({ name: 'from', required: false, type: String })
    @ApiQuery({ name: 'to', required: false, type: String })
    async overview(
        @CurrentUser() user: AuthTokenPayload,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.analyticsService.getOrgOverview(user.organization_id, from, to);
    }

    // ── All-driver analytics (admin view) ────────────────────────────────────

    @Get('drivers')
    @Roles(...ADMIN_ROLES)
    @ApiOperation({ summary: 'Per-driver performance table (admin/supervisor only)' })
    @ApiQuery({ name: 'from', required: false })
    @ApiQuery({ name: 'to', required: false })
    async drivers(
        @CurrentUser() user: AuthTokenPayload,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.analyticsService.getDriversStats(user.organization_id, from, to);
    }

    // ── Leaderboard (privacy-aware) ───────────────────────────────────────────

    @Get('drivers/leaderboard')
    @Roles(...ALL_ROLES)
    @ApiOperation({
        summary: 'Anonymous driver leaderboard. Admin/Supervisor see real names; drivers see anonymized peers.',
    })
    @ApiQuery({ name: 'from', required: false })
    @ApiQuery({ name: 'to', required: false })
    async leaderboard(
        @CurrentUser() user: AuthTokenPayload,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const isAdminCaller = (ADMIN_ROLES as readonly string[]).includes(user.role);
        return this.analyticsService.getLeaderboard(
            user.organization_id,
            user.user_id,
            isAdminCaller,
            from,
            to,
        );
    }

    // ── Driver self-report ────────────────────────────────────────────────────

    @Get('drivers/me')
    @Roles(...ALL_ROLES)
    @ApiOperation({ summary: "Current driver's own performance stats + anonymous rank" })
    @ApiQuery({ name: 'from', required: false })
    @ApiQuery({ name: 'to', required: false })
    async myStats(
        @CurrentUser() user: AuthTokenPayload,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.analyticsService.getMyStats(
            user.user_id,
            user.organization_id,
            from,
            to,
        );
    }

    // ── Station analytics ─────────────────────────────────────────────────────

    @Get('stations')
    @Roles(...ADMIN_ROLES)
    @ApiOperation({ summary: 'Per-station throughput, transit times, and flagged arrivals' })
    @ApiQuery({ name: 'from', required: false })
    @ApiQuery({ name: 'to', required: false })
    async stations(
        @CurrentUser() user: AuthTokenPayload,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.analyticsService.getStationsStats(user.organization_id, from, to);
    }

    // ── Truck analytics ───────────────────────────────────────────────────────

    @Get('trucks')
    @Roles(...ADMIN_ROLES)
    @ApiOperation({ summary: 'Per-truck utilization and volume variance stats' })
    @ApiQuery({ name: 'from', required: false })
    @ApiQuery({ name: 'to', required: false })
    async trucks(
        @CurrentUser() user: AuthTokenPayload,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.analyticsService.getTrucksStats(user.organization_id, from, to);
    }
}
