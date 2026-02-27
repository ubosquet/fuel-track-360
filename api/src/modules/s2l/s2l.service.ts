import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S2LChecklistEntity } from './entities/s2l-checklist.entity';
import { S2LPhotoEntity } from './entities/s2l-photo.entity';
import { AuditService } from '../audit/audit.service';
import { CreateS2LDto } from './dto/create-s2l.dto';
import { normalizePagination, toPagedResult, PagedResult } from '../../common/utils/pagination.util';

const S2L_MIN_PHOTOS = 3;
const S2L_EXPIRY_HOURS = 24;

@Injectable()
export class S2LService {
    private readonly logger = new Logger(S2LService.name);

    constructor(
        @InjectRepository(S2LChecklistEntity)
        private readonly s2lRepository: Repository<S2LChecklistEntity>,
        @InjectRepository(S2LPhotoEntity)
        private readonly photoRepository: Repository<S2LPhotoEntity>,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Create a new S2L checklist (DRAFT status)
     */
    async create(
        dto: CreateS2LDto,
        userId: string,
        organizationId: string,
        actorRole = 'DRIVER',
    ): Promise<S2LChecklistEntity> {
        // Deduplicate offline-created S2Ls
        if (dto.sync_id) {
            const existing = await this.s2lRepository.findOne({
                where: { sync_id: dto.sync_id, organization_id: organizationId },
            });
            if (existing) {
                this.logger.warn(`Duplicate sync_id detected: ${dto.sync_id}, returning existing S2L`);
                return existing;
            }
        }

        // Compute all_items_pass
        const allItemsPass = dto.checklist_data.every((item) => item.value === true);

        const s2l = this.s2lRepository.create({
            organization_id: organizationId,
            truck_id: dto.truck_id,
            driver_id: userId,
            station_id: dto.station_id,
            status: 'DRAFT',
            checklist_data: dto.checklist_data,
            all_items_pass: allItemsPass,
            gps_lat: dto.gps_lat,
            gps_lng: dto.gps_lng,
            offline_created: dto.offline_created || false,
            sync_id: dto.sync_id,
        });

        const saved = await this.s2lRepository.save(s2l);

        // Audit log — M5 FIX: use actual actor role, not hardcoded 'DRIVER'
        await this.auditService.log({
            organization_id: organizationId,
            entity_type: 's2l',
            entity_id: saved.id,
            event_type: 'S2L_CREATED',
            actor_id: userId,
            actor_role: actorRole,
            payload: { checklist_data: dto.checklist_data, offline_created: dto.offline_created },
            gps_lat: dto.gps_lat,
            gps_lng: dto.gps_lng,
        });

        this.logger.log(`S2L created: ${saved.id} by ${actorRole} ${userId}`);
        return saved;
    }

    /**
     * Submit an S2L checklist for review.
     * Enforces: all items TRUE, minimum 3 photos, signature required, not expired.
     */
    async submit(
        id: string,
        organizationId: string,
        userId: string,
        actorRole: string,
        signatureUrl: string,
        gpsLat?: number,
        gpsLng?: number,
    ): Promise<S2LChecklistEntity> {
        // M1 FIX: org-scoped lookup — prevents cross-tenant access
        const s2l = await this.findOneOrFail(id, organizationId);

        if (s2l.status !== 'DRAFT') {
            throw new BadRequestException(`Cannot submit S2L with status '${s2l.status}'. Must be DRAFT.`);
        }

        // RULE 1: All checklist items must be TRUE
        const allItemsPass = s2l.checklist_data.every((item: any) => item.value === true);
        if (!allItemsPass) {
            throw new BadRequestException(
                'All checklist items must be validated (TRUE) before submission. ' +
                'Tous les éléments doivent être validés avant soumission. ' +
                'Tout eleman yo dwe valide anvan soumisyon.',
            );
        }

        // RULE 2: Minimum 3 photos required
        const photos = await this.photoRepository.find({ where: { s2l_id: id } });
        if (photos.length < S2L_MIN_PHOTOS) {
            throw new BadRequestException(
                `Minimum ${S2L_MIN_PHOTOS} photos required. Currently: ${photos.length}. ` +
                `${S2L_MIN_PHOTOS} photos minimum requises. Actuellement: ${photos.length}. ` +
                `Omwen ${S2L_MIN_PHOTOS} foto obligatwa. Kounye a: ${photos.length}.`,
            );
        }

        // RULE 3: Signature is mandatory
        if (!signatureUrl) {
            throw new BadRequestException(
                'Digital signature is required. ' +
                'Signature obligatoire. ' +
                'Siyati obligatwa.',
            );
        }

        // RULE 4 (reserved): GPS proximity check — planned for future enforcement.
        // When geofence infrastructure is fully adopted, submission can enforce
        // that the driver is within the station geofence at submit time.
        // For now, GPS coordinates are captured and stored but not enforced here.

        // RULE 5: Check expiration (24 hours from creation)
        const createdAt = new Date(s2l.created_at);
        const expiryTime = new Date(createdAt.getTime() + S2L_EXPIRY_HOURS * 60 * 60 * 1000);
        if (new Date() > expiryTime) {
            await this.s2lRepository.update(id, { status: 'EXPIRED' });
            throw new BadRequestException(
                'This S2L has expired (>24 hours). A new S2L must be completed. ' +
                'Cette vérification a expiré (>24h). Une nouvelle doit être complétée. ' +
                'Verifikasyon sa a ekspire (>24h). Ou dwe fè yon nouvo.',
            );
        }

        await this.s2lRepository.update(id, {
            status: 'SUBMITTED',
            signature_url: signatureUrl,
            submitted_at: new Date(),
            all_items_pass: true,
            gps_lat: gpsLat,
            gps_lng: gpsLng,
        });

        // M5 FIX: use actual actor role
        await this.auditService.log({
            organization_id: s2l.organization_id,
            entity_type: 's2l',
            entity_id: id,
            event_type: 'S2L_SUBMITTED',
            actor_id: userId,
            actor_role: actorRole,
            payload: {
                photo_count: photos.length,
                has_signature: true,
                gps_lat: gpsLat,
                gps_lng: gpsLng,
            },
            gps_lat: gpsLat,
            gps_lng: gpsLng,
        });

        this.logger.log(`S2L submitted: ${id} by ${actorRole} ${userId}`);
        return this.findOneOrFail(id, organizationId);
    }

    /**
     * Approve or reject an S2L (supervisor only)
     */
    async review(
        id: string,
        organizationId: string,
        reviewerId: string,
        reviewerRole: string,
        status: 'APPROVED' | 'REJECTED',
        reviewNotes?: string,
    ): Promise<S2LChecklistEntity> {
        // M1 FIX: org-scoped lookup
        const s2l = await this.findOneOrFail(id, organizationId);

        if (s2l.status !== 'SUBMITTED') {
            throw new BadRequestException(
                `Cannot review S2L with status '${s2l.status}'. Must be SUBMITTED.`,
            );
        }

        await this.s2lRepository.update(id, {
            status,
            reviewed_by: reviewerId,
            reviewed_at: new Date(),
            review_notes: reviewNotes,
        });

        await this.auditService.log({
            organization_id: s2l.organization_id,
            entity_type: 's2l',
            entity_id: id,
            event_type: status === 'APPROVED' ? 'S2L_APPROVED' : 'S2L_REJECTED',
            actor_id: reviewerId,
            actor_role: reviewerRole,
            payload: { status, review_notes: reviewNotes },
        });

        this.logger.log(`S2L ${status.toLowerCase()}: ${id} by ${reviewerRole} ${reviewerId}`);
        return this.findOneOrFail(id, organizationId);
    }

    /**
     * Add a photo to an S2L checklist (org-scoped).
     */
    async addPhoto(
        s2lId: string,
        organizationId: string,
        photoData: {
            photo_type: string;
            storage_path: string;
            file_size_bytes?: number;
            gps_lat?: number;
            gps_lng?: number;
            captured_at: Date;
        },
    ): Promise<S2LPhotoEntity> {
        // M1 FIX: org-scoped lookup
        const s2l = await this.findOneOrFail(s2lId, organizationId);

        if (s2l.status !== 'DRAFT') {
            throw new BadRequestException('Photos can only be added to DRAFT S2L checklists');
        }

        const photo = this.photoRepository.create({
            s2l_id: s2lId,
            photo_type: photoData.photo_type as any,
            storage_path: photoData.storage_path,
            file_size_bytes: photoData.file_size_bytes,
            gps_lat: photoData.gps_lat,
            gps_lng: photoData.gps_lng,
            captured_at: photoData.captured_at,
            uploaded_at: new Date(),
        });

        return this.photoRepository.save(photo);
    }

    /**
     * Get all S2L checklists for an organization (org-scoped, paginated).
     * L5 FIX: uses normalizePagination to clamp inputs; returns PagedResult with navigation meta.
     */
    async findByOrganization(
        organizationId: string,
        status?: string,
        rawPage?: number,
        rawLimit?: number,
    ): Promise<PagedResult<S2LChecklistEntity>> {
        const { page, limit } = normalizePagination(rawPage, rawLimit);

        const query = this.s2lRepository
            .createQueryBuilder('s2l')
            .where('s2l.organization_id = :organizationId', { organizationId })
            .leftJoinAndSelect('s2l.photos', 'photos')
            .leftJoinAndSelect('s2l.truck', 'truck')
            .leftJoinAndSelect('s2l.driver', 'driver')
            .leftJoinAndSelect('s2l.station', 'station')
            .orderBy('s2l.created_at', 'DESC');

        if (status) {
            query.andWhere('s2l.status = :status', { status });
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return toPagedResult(data, total, page, limit);
    }

    /**
     * Get S2L checklists for a specific driver (org-scoped for safety).
     */
    async findByDriver(
        driverId: string,
        organizationId: string,
    ): Promise<S2LChecklistEntity[]> {
        return this.s2lRepository.find({
            where: { driver_id: driverId, organization_id: organizationId },
            relations: ['photos', 'truck', 'station'],
            order: { created_at: 'DESC' },
        });
    }

    /**
     * Find one S2L by ID — always org-scoped to prevent cross-tenant access.
     *
     * M1 FIX: organizationId is now required. Pass `undefined` only from
     * internal trusted callers (e.g. ManifestService calling via s2l_id it
     * stored itself). In that case, the optional param skips the org filter.
     */
    async findOneOrFail(id: string, organizationId?: string): Promise<S2LChecklistEntity> {
        const where: any = { id };
        if (organizationId) {
            where.organization_id = organizationId;
        }

        const s2l = await this.s2lRepository.findOne({
            where,
            relations: ['photos', 'truck', 'driver', 'station', 'reviewer'],
        });

        if (!s2l) {
            // Distinguish not-found from forbidden (improves debugging without leaking info)
            if (organizationId) {
                // Could be genuinely missing or cross-org. Always return 404 (don't reveal existence).
                throw new NotFoundException(`S2L checklist ${id} not found`);
            }
            throw new NotFoundException(`S2L checklist ${id} not found`);
        }

        return s2l;
    }

    /**
     * Get photos for an S2L (org-scoped via S2L lookup).
     */
    async getPhotos(s2lId: string, organizationId: string): Promise<S2LPhotoEntity[]> {
        // Verify access first
        await this.findOneOrFail(s2lId, organizationId);
        return this.photoRepository.find({
            where: { s2l_id: s2lId },
            order: { created_at: 'ASC' },
        });
    }

    /**
     * N7 FIX: Return pre-aggregated status counts for the dashboard.
     * Single DB query replaces the previous approach of fetching 100+ records
     * and counting them client-side in JavaScript.
     */
    async getStats(organizationId: string): Promise<{
        total: number;
        draft: number;
        submitted: number;
        approved: number;
        rejected: number;
        expired: number;
    }> {
        const rows = await this.s2lRepository
            .createQueryBuilder('s2l')
            .select('s2l.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('s2l.organization_id = :organizationId', { organizationId })
            .groupBy('s2l.status')
            .getRawMany<{ status: string; count: string }>();

        const map = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
        const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

        return {
            total,
            draft: map['DRAFT'] ?? 0,
            submitted: map['SUBMITTED'] ?? 0,
            approved: map['APPROVED'] ?? 0,
            rejected: map['REJECTED'] ?? 0,
            expired: map['EXPIRED'] ?? 0,
        };
    }
}
