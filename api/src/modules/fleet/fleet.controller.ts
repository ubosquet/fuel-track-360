import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FleetService } from './fleet.service';
import { GeofenceService } from './geofence.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IngestGpsLogsDto } from './dto/ingest-gps.dto';
import { UpdateTruckStatusDto } from './dto/update-truck-status.dto';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';

@ApiTags('fleet')
@ApiBearerAuth()
@Controller('fleet')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class FleetController {
    constructor(
        private readonly fleetService: FleetService,
        private readonly geofenceService: GeofenceService,
    ) { }

    @Get('trucks')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'List all trucks in the organization' })
    async listTrucks(@CurrentUser() user: AuthTokenPayload) {
        return this.fleetService.findAllTrucks(user.organization_id);
    }

    @Get('trucks/:id')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Get truck details (organization scoped)' })
    async getTruck(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.fleetService.findTruckByIdInOrg(id, user.organization_id);
    }

    @Put('trucks/:id/status')
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Update truck operational status' })
    async updateTruckStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: UpdateTruckStatusDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.fleetService.updateTruckStatus(
            id,
            body.status,
            user.user_id,
            user.role,
            user.organization_id,
        );
    }

    /**
     * N14 FIX: Soft-deactivate a truck.
     * Uses HTTP DELETE semantics, but performs a soft delete (is_active = false)
     * to preserve audit trail and FK integrity with historical manifests/S2Ls.
     * The truck record is retained; it simply no longer appears in active fleet lists.
     */
    @Delete('trucks/:id')
    @Roles('ADMIN', 'OWNER')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Deactivate (soft-delete) a truck',
        description:
            'Marks the truck as inactive. Truck records are never hard-deleted to preserve ' +
            'audit trail and historical references in manifests and S2L checklists. ' +
            'Re-activate with PUT /fleet/trucks/:id/activate.',
    })
    async deactivateTruck(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.fleetService.deactivateTruck(id, user.user_id, user.role, user.organization_id);
    }

    @Put('trucks/:id/activate')
    @Roles('ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Re-activate a previously deactivated truck' })
    async reactivateTruck(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.fleetService.reactivateTruck(id, user.user_id, user.role, user.organization_id);
    }

    /**
     * Ingest GPS logs from the mobile app.
     * GPS is sourced from the driver's phone (Flutter app) and tied to the
     * truck the driver is currently assigned to.
     * Restricted to field roles — DRIVER and DISPATCHER.
     */
    @Post('gps/batch')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({
        summary: 'Ingest GPS logs from the mobile app (batch)',
        description:
            'Accepts batched GPS position logs from the driver\'s phone. ' +
            'Each log is scoped to the caller\'s organization — logs for ' +
            'trucks not owned by the caller\'s org are rejected.',
    })
    async ingestGps(
        @Body() body: IngestGpsLogsDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.fleetService.ingestGpsLogs(body.logs, user.organization_id);
    }

    @Get('gps/:truckId/history')
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Get GPS log history for a truck (max 1000 records)' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'limit', required: false, description: 'Max 1000' })
    async getGpsHistory(
        @Param('truckId', ParseUUIDPipe) truckId: string,
        @CurrentUser() user: AuthTokenPayload,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: number,
    ) {
        return this.fleetService.getGpsHistory(
            truckId,
            user.organization_id,
            startDate,
            endDate,
            limit,
        );
    }

    @Get('status')
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Get fleet status overview' })
    async getFleetStatus(@CurrentUser() user: AuthTokenPayload) {
        return this.fleetService.getFleetStatus(user.organization_id);
    }

    @Post('geofence/check')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Check if coordinates are within a station geofence' })
    async checkGeofence(
        @Body() body: { lat: number; lng: number; station_id: string },
    ) {
        return this.geofenceService.checkGeofence(body.lat, body.lng, body.station_id);
    }

    @Get('geofence/:stationId')
    @Roles('SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Get geofences for a station' })
    async getGeofences(@Param('stationId', ParseUUIDPipe) stationId: string) {
        return this.geofenceService.getGeofencesByStation(stationId);
    }
}
