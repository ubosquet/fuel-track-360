import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
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

    /**
     * Find a truck by ID and verify it belongs to the given organization.
     * Throws ForbiddenException if the truck exists but belongs to a different org.
     */
    async findTruckByIdInOrg(id: string, organizationId: string): Promise<TruckEntity> {
        const truck = await this.truckRepository.findOne({
            where: { id, organization_id: organizationId },
        });
        if (!truck) {
            // Check if truck exists at all — if yes, it's a cross-org access attempt
            const exists = await this.truckRepository.findOne({ where: { id } });
            if (exists) {
                throw new ForbiddenException('Access to this truck is not allowed');
            }
            throw new NotFoundException(`Truck ${id} not found`);
        }
        return truck;
    }

    async updateTruckStatus(
        id: string,
        status: string,
        actorId: string,
        actorRole: string,
        organizationId: string,
    ): Promise<TruckEntity> {
        const truck = await this.findTruckByIdInOrg(id, organizationId);
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
     * N14 FIX: Soft-deactivate a truck (sets is_active = false).
     * Hard deletion is never performed — truck records must be retained for
     * audit trail and historical GPS/S2L/manifest reference integrity.
     * Restricted to ADMIN/OWNER in the controller.
     */
    async deactivateTruck(
        id: string,
        actorId: string,
        actorRole: string,
        organizationId: string,
    ): Promise<TruckEntity> {
        const truck = await this.findTruckByIdInOrg(id, organizationId);

        if (!truck.is_active) {
            return truck; // Already deactivated — idempotent
        }

        await this.truckRepository.update(id, { is_active: false });

        await this.auditService.log({
            organization_id: organizationId,
            entity_type: 'truck',
            entity_id: id,
            event_type: 'TRUCK_DEACTIVATED',
            actor_id: actorId,
            actor_role: actorRole,
            payload: { plate_number: truck.plate_number },
        });

        this.logger.warn(`Truck deactivated: ${id} (${truck.plate_number}) by ${actorId}`);
        return { ...truck, is_active: false };
    }

    /**
     * Re-activate a previously deactivated truck.
     */
    async reactivateTruck(
        id: string,
        actorId: string,
        actorRole: string,
        organizationId: string,
    ): Promise<TruckEntity> {
        const truck = await this.truckRepository.findOne({
            where: { id, organization_id: organizationId },
        });
        if (!truck) throw new NotFoundException(`Truck ${id} not found`);

        if (truck.is_active) {
            return truck; // Already active — idempotent
        }

        await this.truckRepository.update(id, { is_active: true });

        await this.auditService.log({
            organization_id: organizationId,
            entity_type: 'truck',
            entity_id: id,
            event_type: 'TRUCK_REACTIVATED',
            actor_id: actorId,
            actor_role: actorRole,
            payload: { plate_number: truck.plate_number },
        });

        this.logger.log(`Truck reactivated: ${id} (${truck.plate_number}) by ${actorId}`);
        return { ...truck, is_active: true };
    }

    /**
     * Ingest GPS logs from the mobile app (batch or single).
     * Each log is validated against the caller's organization to prevent
     * cross-org GPS spoofing. Logs for trucks not belonging to the caller's
     * org are silently dropped and a warning is emitted.
     *
     * NOTE: GPS in FT360 is sourced from the driver's phone (Flutter app).
     * The app sends periodic location updates tied to the truck the driver
     * is currently assigned to.
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
        organizationId: string,
    ): Promise<{ ingested: number; rejected: number }> {
        // Filter out any trucks that don't belong to this organization
        const truckIds = [...new Set(logs.map((l) => l.truck_id))];
        const ownedTrucks = await this.truckRepository.find({
            where: truckIds.map((id) => ({ id, organization_id: organizationId })),
            select: ['id'],
        });
        const ownedTruckIds = new Set(ownedTrucks.map((t) => t.id));

        const authorizedLogs = logs.filter((l) => ownedTruckIds.has(l.truck_id));
        const rejectedCount = logs.length - authorizedLogs.length;

        if (rejectedCount > 0) {
            this.logger.warn(
                `Rejected ${rejectedCount} GPS log(s) from org ${organizationId} — truck(s) not owned by this org`,
            );
        }

        if (authorizedLogs.length === 0) {
            return { ingested: 0, rejected: rejectedCount };
        }

        const entities = authorizedLogs.map((log) =>
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

        // Update truck's current position to the latest log for that truck
        const latestByTruck = new Map<string, typeof authorizedLogs[0]>();
        for (const log of authorizedLogs) {
            const existing = latestByTruck.get(log.truck_id);
            if (!existing || new Date(log.recorded_at) > new Date(existing.recorded_at)) {
                latestByTruck.set(log.truck_id, log);
            }
        }

        await Promise.all(
            [...latestByTruck.values()].map((log) =>
                this.updateTruckGps(log.truck_id, log.lat, log.lng),
            ),
        );

        this.logger.debug(
            `Ingested ${entities.length} GPS log(s) for org ${organizationId}`,
        );
        return { ingested: entities.length, rejected: rejectedCount };
    }

    /**
     * Get GPS log history for a truck (organization scoped).
     */
    async getGpsHistory(
        truckId: string,
        organizationId: string,
        startDate?: string,
        endDate?: string,
        limit = 500,
    ): Promise<GpsLogEntity[]> {
        // Verify truck ownership first
        await this.findTruckByIdInOrg(truckId, organizationId);

        const cappedLimit = Math.min(limit, 1000); // hard cap

        const query = this.gpsLogRepository
            .createQueryBuilder('gps')
            .where('gps.truck_id = :truckId', { truckId })
            .orderBy('gps.recorded_at', 'DESC')
            .take(cappedLimit);

        if (startDate) {
            query.andWhere('gps.recorded_at >= :startDate', { startDate });
        }
        if (endDate) {
            query.andWhere('gps.recorded_at <= :endDate', { endDate });
        }

        return query.getMany();
    }

    /**
     * Get fleet status overview (organization scoped).
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
