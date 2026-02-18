import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FleetService } from './fleet.service';
import { GeofenceService } from './geofence.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'List all trucks' })
    async listTrucks(@CurrentUser() user: any) {
        return this.fleetService.findAllTrucks(user.organization_id);
    }

    @Get('trucks/:id')
    @ApiOperation({ summary: 'Get truck details' })
    async getTruck(@Param('id', ParseUUIDPipe) id: string) {
        return this.fleetService.findTruckById(id);
    }

    @Put('trucks/:id/status')
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Update truck status' })
    async updateTruckStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { status: string },
        @CurrentUser() user: any,
    ) {
        return this.fleetService.updateTruckStatus(id, body.status, user.user_id, user.role);
    }

    @Post('gps/batch')
    @ApiOperation({ summary: 'Ingest GPS logs (batch)' })
    async ingestGps(
        @Body()
        body: {
            logs: {
                truck_id: string;
                lat: number;
                lng: number;
                speed_kmh?: number;
                heading?: number;
                accuracy_m?: number;
                altitude_m?: number;
                recorded_at: string;
            }[];
        },
    ) {
        return this.fleetService.ingestGpsLogs(body.logs);
    }

    @Get('gps/:truckId/history')
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Get GPS log history for a truck' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async getGpsHistory(
        @Param('truckId', ParseUUIDPipe) truckId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: number,
    ) {
        return this.fleetService.getGpsHistory(truckId, startDate, endDate, limit);
    }

    @Get('status')
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Get fleet status overview' })
    async getFleetStatus(@CurrentUser() user: any) {
        return this.fleetService.getFleetStatus(user.organization_id);
    }

    @Post('geofence/check')
    @ApiOperation({ summary: 'Check if coordinates are within a station geofence' })
    async checkGeofence(
        @Body() body: { lat: number; lng: number; station_id: string },
    ) {
        return this.geofenceService.checkGeofence(body.lat, body.lng, body.station_id);
    }

    @Get('geofence/:stationId')
    @ApiOperation({ summary: 'Get geofences for a station' })
    async getGeofences(@Param('stationId', ParseUUIDPipe) stationId: string) {
        return this.geofenceService.getGeofencesByStation(stationId);
    }
}
