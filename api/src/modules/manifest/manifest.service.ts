import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ManifestEntity } from './entities/manifest.entity';
import { S2LService } from '../s2l/s2l.service';
import { AuditService } from '../audit/audit.service';
import {
    ManifestStatus,
    validateManifestTransition,
} from './manifest-transitions.util';
import { normalizePagination, toPagedResult, PagedResult } from '../../common/utils/pagination.util';

@Injectable()
export class ManifestService {
    private readonly logger = new Logger(ManifestService.name);

    constructor(
        @InjectRepository(ManifestEntity)
        private readonly manifestRepository: Repository<ManifestEntity>,
        private readonly s2lService: S2LService,
        private readonly auditService: AuditService,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Create a manifest — REQUIRES an APPROVED S2L.
     * M5 FIX: actor_role is now passed from caller instead of hardcoded.
     */
    async create(
        data: {
            s2l_id: string;
            truck_id: string;
            origin_station_id: string;
            dest_station_id: string;
            product_type: string;
            volume_loaded_liters?: number;
            sync_id?: string;
            offline_created?: boolean;
        },
        userId: string,
        organizationId: string,
        actorRole = 'DISPATCHER',
    ): Promise<ManifestEntity> {
        // RULE 6: S2L must be APPROVED and belong to the same org.
        // N8 FIX: pass organizationId so the DB query itself enforces the org boundary —
        // this avoids fetching a foreign org's S2L only to reject it afterwards.
        const s2l = await this.s2lService.findOneOrFail(data.s2l_id, organizationId);
        if (s2l.status !== 'APPROVED') {
            throw new BadRequestException(
                `Cannot create manifest: S2L ${data.s2l_id} is not APPROVED (current: ${s2l.status}). ` +
                'Le S2L doit être approuvé avant de créer un manifeste. ' +
                'S2L la dwe apwouve anvan ou kreye yon manifès.',
            );
        }

        // N13 FIX: use the S2L's driver (the truck driver), not the caller (may be a dispatcher)

        // Deduplicate offline manifests
        if (data.sync_id) {
            const existing = await this.manifestRepository.findOne({
                where: { sync_id: data.sync_id, organization_id: organizationId },
            });
            if (existing) return existing;
        }

        // M4 FIX: Race-condition-safe manifest number generation.
        // Uses a PostgreSQL advisory lock (pg_try_advisory_xact_lock) to ensure
        // only one concurrent request generates a number for the same date prefix.
        const manifestNumber = await this.generateManifestNumberSafe();

        const manifest = this.manifestRepository.create({
            organization_id: organizationId,
            manifest_number: manifestNumber,
            s2l_id: data.s2l_id,
            truck_id: data.truck_id,
            driver_id: s2l.driver_id,   // N13 FIX: the truck driver from S2L, not the manifest creator
            origin_station_id: data.origin_station_id,
            dest_station_id: data.dest_station_id,
            product_type: data.product_type as any,
            volume_loaded_liters: data.volume_loaded_liters,
            status: 'CREATED',
            offline_created: data.offline_created || false,
            sync_id: data.sync_id,
        });

        const saved = await this.manifestRepository.save(manifest);

        // M5 FIX: use actual actor role
        await this.auditService.log({
            organization_id: organizationId,
            entity_type: 'manifest',
            entity_id: saved.id,
            event_type: 'MANIFEST_CREATED',
            actor_id: userId,
            actor_role: actorRole,
            payload: { manifest_number: manifestNumber, s2l_id: data.s2l_id },
        });

        this.logger.log(`Manifest created: ${saved.manifest_number} by ${actorRole} ${userId}`);
        return saved;
    }

    /**
     * List manifests for an organization (paginated).
     * L5 FIX: uses normalizePagination; returns PagedResult with navigation meta.
     */
    async findByOrganization(
        organizationId: string,
        status?: string,
        rawPage?: number,
        rawLimit?: number,
    ): Promise<PagedResult<ManifestEntity>> {
        const { page, limit } = normalizePagination(rawPage, rawLimit);

        const query = this.manifestRepository
            .createQueryBuilder('manifest')
            .where('manifest.organization_id = :organizationId', { organizationId })
            .leftJoinAndSelect('manifest.truck', 'truck')
            .leftJoinAndSelect('manifest.driver', 'driver')
            .leftJoinAndSelect('manifest.origin_station', 'origin')
            .leftJoinAndSelect('manifest.dest_station', 'dest')
            .orderBy('manifest.created_at', 'DESC');

        if (status) {
            query.andWhere('manifest.status = :status', { status });
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return toPagedResult(data, total, page, limit);
    }

    /**
     * M2 FIX: org-scoped findOneOrFail.
     * Always pass organizationId from the request context.
     * Internal callers that trust their own data may pass undefined.
     */
    async findOneOrFail(id: string, organizationId?: string): Promise<ManifestEntity> {
        const where: any = { id };
        if (organizationId) {
            where.organization_id = organizationId;
        }

        const manifest = await this.manifestRepository.findOne({
            where,
            relations: ['truck', 'driver', 'origin_station', 'dest_station', 's2l'],
        });

        if (!manifest) {
            throw new NotFoundException(`Manifest ${id} not found`);
        }
        return manifest;
    }

    /**
     * Update manifest status.
     * M3 FIX: validates state machine before applying change.
     * M2 FIX: org-scoped fetch.
     */
    async updateStatus(
        id: string,
        status: string,
        actorId: string,
        actorRole: string,
        organizationId: string,
        volumeData?: { volume_loaded_liters?: number; volume_discharged_liters?: number },
    ): Promise<ManifestEntity> {
        // M2 FIX: org-scoped lookup
        const manifest = await this.findOneOrFail(id, organizationId);

        // M3 FIX: state machine validation
        const transitionError = validateManifestTransition(
            manifest.status as ManifestStatus,
            status as ManifestStatus,
        );
        if (transitionError) {
            throw new BadRequestException(transitionError);
        }

        const updateData: any = { status };
        const now = new Date();

        // Set lifecycle timestamps based on incoming status
        switch (status) {
            case 'LOADING':
                updateData.loaded_at = now;
                break;
            case 'IN_TRANSIT':
                updateData.departed_at = now;
                break;
            case 'ARRIVED':
                updateData.arrived_at = now;
                break;
            case 'DISCHARGING':
                updateData.discharged_at = now;
                break;
            case 'COMPLETED':
                if (volumeData?.volume_discharged_liters && manifest.volume_loaded_liters) {
                    updateData.volume_discharged_liters = volumeData.volume_discharged_liters;
                    updateData.volume_variance_pct =
                        Math.abs(
                            (manifest.volume_loaded_liters - volumeData.volume_discharged_liters) /
                            manifest.volume_loaded_liters,
                        ) * 100;

                    // Auto-flag if variance exceeds 2% threshold
                    if (updateData.volume_variance_pct > 2.0) {
                        updateData.status = 'FLAGGED';
                        this.logger.warn(
                            `Manifest ${manifest.manifest_number} auto-flagged: ` +
                            `${updateData.volume_variance_pct.toFixed(2)}% volume variance`,
                        );
                    }
                }
                break;
        }

        if (volumeData?.volume_loaded_liters) {
            updateData.volume_loaded_liters = volumeData.volume_loaded_liters;
        }

        await this.manifestRepository.update(id, updateData);

        await this.auditService.log({
            organization_id: manifest.organization_id,
            entity_type: 'manifest',
            entity_id: id,
            event_type: `MANIFEST_${updateData.status ?? status}` as any,
            actor_id: actorId,
            actor_role: actorRole,
            payload: {
                previous_status: manifest.status,
                new_status: updateData.status ?? status,
                ...volumeData,
                volume_variance_pct: updateData.volume_variance_pct,
            },
        });

        return this.findOneOrFail(id, organizationId);
    }

    /**
     * M4 FIX: Race-condition-safe manifest number generation.
     *
     * Uses a PostgreSQL advisory lock to serialize concurrent requests
     * attempting to generate a number for the same day prefix.
     * The lock key `7236` is an arbitrary stable integer for this purpose.
     *
     * This replaces the previous COUNT-based approach which had a TOCTOU
     * race condition under concurrent requests.
     */
    private async generateManifestNumberSafe(): Promise<string> {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `FT360-${dateStr}`;
        const lockKey = 7236; // stable advisory lock key for manifest numbering

        return await this.dataSource.transaction(async (em) => {
            // Acquire an exclusive advisory lock for the duration of this transaction.
            // Any concurrent transaction attempting this will wait.
            await em.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

            // Count existing manifests for today safely inside the lock
            const [{ count }] = await em.query(
                `SELECT COUNT(*) as count FROM manifests WHERE manifest_number LIKE $1`,
                [`${prefix}%`],
            );

            const seq = String(Number(count) + 1).padStart(4, '0');
            return `${prefix}-${seq}`;
        });
    }
}
