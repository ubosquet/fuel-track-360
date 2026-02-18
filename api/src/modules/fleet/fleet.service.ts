import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TruckEntity } from './entities/truck.entity';
import { GpsLogEntity } from './entities/gps-log.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FleetService {
    private readonly logger = new Logger(FleetService.name);

    constructor(
        @InjectRepository(TruckEntity)
        private readonly truckRepository: Repository<TruckEntity>,
        @InjectRepository(GpsLogEntity)
        private readonly gpsLogRepository: Repository<GpsLogEntity>,
        private readonly auditService: AuditService,
    ) { }

    async findAllTrucks(organizationId: string): Promise<TruckEntity[]> {
        return this.truckRepository.find({
            where: { organization_id: organizationId, is_active: true },
            order: { plate_number: 'ASC' },
        });
    }

    async findTruckById(id: string): Promise<TruckEntity> {
        const truck = await this.truckRepository.findOne({
            where: { id },
        });
        if (!truck) throw new NotFoundException(`Truck ${id} not found`);
        return truck;
    }

    async updateTruckStatus(
        id: string,
        status: string,
        actorId: string,
        actorRole: string,
    ): Promise<TruckEntity> {
        const truck = await this.findTruckById(id);
        const previousStatus = truck.status;

        await this.truckRepository.update(id, { status: status as any });

        await this.auditService.log({
            organization_id: truck.organization_id,
            entity_type: 'truck',
            entity_id: id,
            event_type: 'TRUCK_STATUS_CHANGED',
            actor_id: actorId,
            actor_role: actorRole,
            payload: { previous_status: previousStatus, new_status: status },
        });

        return this.findTruckById(id);
    }

    async updateTruckGps(id: string, lat: number, lng: number): Promise<void> {
        await this.truckRepository.update(id, {
            current_lat: lat,
            current_lng: lng,
            last_gps_at: new Date(),
        });
    }

    /**
     * Ingest GPS logs (batch or single)
     */
    async ingestGpsLogs(
        logs: {
            truck_id: string;
            lat: number;
            lng: number;
            speed_kmh?: number;
            heading?: number;
            accuracy_m?: number;
            altitude_m?: number;
            recorded_at: string;
        }[],
    ): Promise<{ ingested: number }> {
        const entities = logs.map((log) =>
            this.gpsLogRepository.create({
                truck_id: log.truck_id,
                lat: log.lat,
                lng: log.lng,
                speed_kmh: log.speed_kmh,
                heading: log.heading,
                accuracy_m: log.accuracy_m,
                altitude_m: log.altitude_m,
                recorded_at: new Date(log.recorded_at),
                synced_at: new Date(),
            }),
        );

        await this.gpsLogRepository.save(entities);

        // Update truck's current position to latest log
        if (logs.length > 0) {
            const latestLog = logs[logs.length - 1];
            await this.updateTruckGps(latestLog.truck_id, latestLog.lat, latestLog.lng);
        }

        this.logger.debug(`Ingested ${entities.length} GPS logs`);
        return { ingested: entities.length };
    }

    /**
     * Get GPS log history for a truck
     */
    async getGpsHistory(
        truckId: string,
        startDate?: string,
        endDate?: string,
        limit = 1000,
    ): Promise<GpsLogEntity[]> {
        const query = this.gpsLogRepository
            .createQueryBuilder('gps')
            .where('gps.truck_id = :truckId', { truckId })
            .orderBy('gps.recorded_at', 'DESC')
            .take(limit);

        if (startDate) {
            query.andWhere('gps.recorded_at >= :startDate', { startDate });
        }
        if (endDate) {
            query.andWhere('gps.recorded_at <= :endDate', { endDate });
        }

        return query.getMany();
    }

    /**
     * Get fleet status overview
     */
    async getFleetStatus(organizationId: string) {
        const trucks = await this.findAllTrucks(organizationId);

        const statusCounts: Record<string, number> = {};
        trucks.forEach((t) => {
            statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        });

        return {
            total_trucks: trucks.length,
            status_breakdown: statusCounts,
            trucks: trucks.map((t) => ({
                id: t.id,
                plate_number: t.plate_number,
                status: t.status,
                current_lat: t.current_lat,
                current_lng: t.current_lng,
                last_gps_at: t.last_gps_at,
            })),
        };
    }
}
