import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeofenceEntity } from './entities/geofence.entity';
import { StationEntity } from '../organization/entities/station.entity';

export interface GeofenceCheckResult {
    is_within: boolean;
    distance_m: number;
    station_id: string;
    station_name: string;
    geofence_radius_m: number;
}

@Injectable()
export class GeofenceService {
    private readonly logger = new Logger(GeofenceService.name);

    constructor(
        @InjectRepository(GeofenceEntity)
        private readonly geofenceRepository: Repository<GeofenceEntity>,
        @InjectRepository(StationEntity)
        private readonly stationRepository: Repository<StationEntity>,
    ) { }

    /**
     * Check if coordinates are within any geofence for a station
     */
    async checkGeofence(
        lat: number,
        lng: number,
        stationId: string,
    ): Promise<GeofenceCheckResult> {
        const station = await this.stationRepository.findOne({
            where: { id: stationId },
        });

        if (!station) {
            return {
                is_within: false,
                distance_m: -1,
                station_id: stationId,
                station_name: 'Unknown',
                geofence_radius_m: 0,
            };
        }

        const distance = this.calculateHaversineDistance(
            lat,
            lng,
            parseFloat(station.gps_lat as any),
            parseFloat(station.gps_lng as any),
        );

        const isWithin = distance <= station.geofence_radius_m;

        return {
            is_within: isWithin,
            distance_m: Math.round(distance),
            station_id: station.id,
            station_name: station.name,
            geofence_radius_m: station.geofence_radius_m,
        };
    }

    /**
     * Find the nearest station to given coordinates
     */
    async findNearestStation(
        lat: number,
        lng: number,
        organizationId: string,
    ): Promise<{ station: StationEntity; distance_m: number } | null> {
        const stations = await this.stationRepository.find({
            where: { organization_id: organizationId, is_active: true },
        });

        if (stations.length === 0) return null;

        let nearest: StationEntity = stations[0];
        let minDistance = Infinity;

        for (const station of stations) {
            const distance = this.calculateHaversineDistance(
                lat,
                lng,
                parseFloat(station.gps_lat as any),
                parseFloat(station.gps_lng as any),
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = station;
            }
        }

        return { station: nearest, distance_m: Math.round(minDistance) };
    }

    /**
     * CRUD for geofences
     */
    async createGeofence(data: Partial<GeofenceEntity>): Promise<GeofenceEntity> {
        const geofence = this.geofenceRepository.create(data);
        return this.geofenceRepository.save(geofence);
    }

    async getGeofencesByStation(stationId: string): Promise<GeofenceEntity[]> {
        return this.geofenceRepository.find({
            where: { station_id: stationId, is_active: true },
        });
    }

    async updateGeofence(id: string, data: Partial<GeofenceEntity>): Promise<GeofenceEntity> {
        await this.geofenceRepository.update(id, data);
        return this.geofenceRepository.findOneOrFail({ where: { id } });
    }

    /**
     * Haversine formula — distance in meters between two GPS points
     */
    private calculateHaversineDistance(
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number,
    ): number {
        const R = 6371000;
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
