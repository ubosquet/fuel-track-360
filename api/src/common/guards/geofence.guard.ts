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

        // Extract GPS coordinates from request
        const gpsLat = body?.gps_lat ?? request.headers['x-gps-lat'];
        const gpsLng = body?.gps_lng ?? request.headers['x-gps-lng'];
        const stationId = body?.station_id;

        if (!gpsLat || !gpsLng) {
            // GPS unavailable — allow but flag
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

        // Calculate distance using Haversine formula
        const distance = this.calculateDistance(
            parseFloat(gpsLat as string),
            parseFloat(gpsLng as string),
            parseFloat(station.gps_lat as any),
            parseFloat(station.gps_lng as any),
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
                `Geofence violation: truck at (${gpsLat}, ${gpsLng}) is ${Math.round(distance)}m from ${station.name} (radius: ${station.geofence_radius_m}m)`,
            );
            throw new ForbiddenException(
                `Action blocked: You are ${Math.round(distance)}m from ${station.name}. ` +
                `You must be within ${station.geofence_radius_m}m of the station.`,
            );
        }

        return true;
    }

    /**
     * Haversine formula — distance between two GPS coordinates in meters
     */
    private calculateDistance(
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number,
    ): number {
        const R = 6371000; // Earth radius in meters
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
}
