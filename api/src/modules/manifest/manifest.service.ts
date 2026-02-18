import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManifestEntity } from './entities/manifest.entity';
import { S2LService } from '../s2l/s2l.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ManifestService {
    private readonly logger = new Logger(ManifestService.name);

    constructor(
        @InjectRepository(ManifestEntity)
        private readonly manifestRepository: Repository<ManifestEntity>,
        private readonly s2lService: S2LService,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Create a manifest — REQUIRES an APPROVED S2L
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
    ): Promise<ManifestEntity> {
        // RULE 6: S2L must be APPROVED
        const s2l = await this.s2lService.findOneOrFail(data.s2l_id);
        if (s2l.status !== 'APPROVED') {
            throw new BadRequestException(
                `Cannot create manifest: S2L ${data.s2l_id} is not APPROVED (current: ${s2l.status}). ` +
                'Le S2L doit être approuvé avant de créer un manifeste. ' +
                'S2L la dwe apwouve anvan ou kreye yon manifès.',
            );
        }

        // Deduplicate offline manifests
        if (data.sync_id) {
            const existing = await this.manifestRepository.findOne({
                where: { sync_id: data.sync_id },
            });
            if (existing) return existing;
        }

        // Generate manifest number
        const manifestNumber = await this.generateManifestNumber();

        const manifest = this.manifestRepository.create({
            organization_id: organizationId,
            manifest_number: manifestNumber,
            s2l_id: data.s2l_id,
            truck_id: data.truck_id,
            driver_id: userId,
            origin_station_id: data.origin_station_id,
            dest_station_id: data.dest_station_id,
            product_type: data.product_type as any,
            volume_loaded_liters: data.volume_loaded_liters,
            status: 'CREATED',
            offline_created: data.offline_created || false,
            sync_id: data.sync_id,
        });

        const saved = await this.manifestRepository.save(manifest);

        await this.auditService.log({
            organization_id: organizationId,
            entity_type: 'manifest',
            entity_id: saved.id,
            event_type: 'MANIFEST_CREATED',
            actor_id: userId,
            actor_role: 'DISPATCHER',
            payload: { manifest_number: manifestNumber, s2l_id: data.s2l_id },
        });

        return saved;
    }

    async findByOrganization(
        organizationId: string,
        status?: string,
        page = 1,
        limit = 20,
    ): Promise<{ data: ManifestEntity[]; total: number }> {
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

        return { data, total };
    }

    async findOneOrFail(id: string): Promise<ManifestEntity> {
        const manifest = await this.manifestRepository.findOne({
            where: { id },
            relations: ['truck', 'driver', 'origin_station', 'dest_station', 's2l'],
        });
        if (!manifest) throw new NotFoundException(`Manifest ${id} not found`);
        return manifest;
    }

    async updateStatus(
        id: string,
        status: string,
        actorId: string,
        actorRole: string,
        volumeData?: { volume_loaded_liters?: number; volume_discharged_liters?: number },
    ): Promise<ManifestEntity> {
        const manifest = await this.findOneOrFail(id);

        const updateData: any = { status };
        const now = new Date();

        // Set timestamps based on status
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

                    // Auto-flag if variance exceeds threshold
                    if (updateData.volume_variance_pct > 2.0) {
                        updateData.status = 'FLAGGED';
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
            event_type: `MANIFEST_${status}` as any,
            actor_id: actorId,
            actor_role: actorRole,
            payload: { previous_status: manifest.status, new_status: status, ...volumeData },
        });

        return this.findOneOrFail(id);
    }

    private async generateManifestNumber(): Promise<string> {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.manifestRepository
            .createQueryBuilder('m')
            .where('m.manifest_number LIKE :prefix', { prefix: `FT360-${dateStr}%` })
            .getCount();
        const seq = String(count + 1).padStart(4, '0');
        return `FT360-${dateStr}-${seq}`;
    }
}
