import {
    Controller,
    Get,
    Query,
    UseGuards,
    ParseUUIDPipe,
    Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QueryAuditDto } from './dto/query-audit.dto';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';

/**
 * AuditController — exposes the immutable audit journal for query.
 *
 * All queries are scoped to the caller's organization.
 * No write operations are exposed here — audit events are written only by
 * the internal AuditService during business operations.
 */
@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AuditController {

    constructor(private readonly auditService: AuditService) { }

    /**
     * Query the audit event journal with optional filters.
     * Restricted to SUPERVISOR, ADMIN, OWNER.
     * Always scoped to the caller's organization — cross-org access is impossible.
     */
    @Get()
    @Roles('SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({
        summary: 'Query audit events (organization scoped)',
        description:
            'Returns a paginated list of immutable audit events for the caller\'s organization. ' +
            'All filters are optional and combinable. Results are ordered newest-first.',
    })
    @ApiQuery({ name: 'entity_type', required: false, description: 'e.g. s2l, manifest, truck, sync' })
    @ApiQuery({ name: 'entity_id', required: false, description: 'UUID of the entity' })
    @ApiQuery({ name: 'event_type', required: false, description: 'e.g. S2L_SUBMITTED, MANIFEST_CREATED' })
    @ApiQuery({ name: 'actor_id', required: false, description: 'UUID of the user who performed the action' })
    @ApiQuery({ name: 'start_date', required: false, description: 'ISO 8601 date — filter events on or after' })
    @ApiQuery({ name: 'end_date', required: false, description: 'ISO 8601 date — filter events on or before' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Results per page (max 100, default: 50)' })
    async queryAudit(
        @Query() params: QueryAuditDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.auditService.query({
            organization_id: user.organization_id,   // Always org-scoped
            entity_type: params.entity_type,
            entity_id: params.entity_id,
            event_type: params.event_type,
            actor_id: params.actor_id,
            start_date: params.start_date,
            end_date: params.end_date,
            page: params.page ? Number(params.page) : 1,
            limit: params.limit ? Number(params.limit) : 50,
        });
    }

    /**
     * Get all audit events for a specific entity by its UUID.
     * Useful for drilling into the full history of a single S2L, manifest, etc.
     */
    @Get(':entityId/events')
    @Roles('SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({
        summary: 'Get all audit events for a specific entity',
        description: 'Returns the full chronological history for a given entity UUID, org-scoped.',
    })
    async getEntityAuditTrail(
        @Param('entityId', ParseUUIDPipe) entityId: string,
        @CurrentUser() user: AuthTokenPayload,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.auditService.query({
            organization_id: user.organization_id,
            entity_id: entityId,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        });
    }
}
