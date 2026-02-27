import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StationEntity } from '../../modules/organization/entities/station.entity';
import { REQUIRE_GEOFENCE_KEY } from '../decorators/require-geofence.decorator';
import { haversineDistanceMeters } from '../utils/haversine.util';

@Injectable()
export class GeofenceGuard implements CanActivate {
    private readonly logger = new Logger(GeofenceGuard.name);

    constructor(
        private reflector: Reflector,
        @InjectRepository(StationEntity)
        private readonly stationRepository: Repository<StationEntity>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requireGeofence = this.reflector.getAllAndOverride<boolean>(REQUIRE_GEOFENCE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requireGeofence) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const body = request.body;

        // Extract GPS coordinates from request body or headers (fallback for some clients)
        const gpsLat = body?.gps_lat ?? request.headers['x-gps-lat'];
        const gpsLng = body?.gps_lng ?? request.headers['x-gps-lng'];
        const stationId = body?.station_id;

        if (!gpsLat || !gpsLng) {
            // GPS unavailable — allow but flag for audit/monitoring
            this.logger.warn('Geofence check skipped: GPS coordinates not provided');
            request.geofenceResult = {
                is_within: null,
                reason: 'GPS_UNAVAILABLE',
            };
            return true;
        }

        if (!stationId) {
            throw new ForbiddenException('Station ID required for geofence validation');
        }

        const station = await this.stationRepository.findOne({
            where: { id: stationId, is_active: true },
        });

        if (!station) {
            throw new ForbiddenException('Station not found');
        }

        const distance = haversineDistanceMeters(
            parseFloat(gpsLat as string),
            parseFloat(gpsLng as string),
            station.gps_lat,
            station.gps_lng,
        );

        const isWithinGeofence = distance <= station.geofence_radius_m;

        request.geofenceResult = {
            is_within: isWithinGeofence,
            distance_m: Math.round(distance),
            station_id: station.id,
            station_name: station.name,
            geofence_radius_m: station.geofence_radius_m,
        };

        if (!isWithinGeofence) {
            this.logger.warn(
                `Geofence violation: position (${gpsLat}, ${gpsLng}) is ${Math.round(distance)}m from ${station.name} (radius: ${station.geofence_radius_m}m)`,
            );
            throw new ForbiddenException(
                `Action blocked: You are ${Math.round(distance)}m from ${station.name}. ` +
                `You must be within ${station.geofence_radius_m}m of the station.`,
            );
        }

        return true;
    }
}
