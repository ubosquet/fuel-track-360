import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S2LChecklistEntity } from './entities/s2l-checklist.entity';
import { S2LPhotoEntity } from './entities/s2l-photo.entity';
import { AuditService } from '../audit/audit.service';
import { CreateS2LDto } from './dto/create-s2l.dto';

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
    ): Promise<S2LChecklistEntity> {
        // Deduplicate offline-created S2Ls
        if (dto.sync_id) {
            const existing = await this.s2lRepository.findOne({
                where: { sync_id: dto.sync_id },
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

        // Audit log
        await this.auditService.log({
            organization_id: organizationId,
            entity_type: 's2l',
            entity_id: saved.id,
            event_type: 'S2L_CREATED',
            actor_id: userId,
            actor_role: 'DRIVER',
            payload: { checklist_data: dto.checklist_data, offline_created: dto.offline_created },
            gps_lat: dto.gps_lat,
            gps_lng: dto.gps_lng,
        });

        this.logger.log(`S2L created: ${saved.id} by driver ${userId}`);
        return saved;
    }

    /**
     * Submit an S2L checklist for review
     * Enforces: all items TRUE, minimum 3 photos, signature required
     */
    async submit(
        id: string,
        userId: string,
        signatureUrl: string,
        gpsLat?: number,
        gpsLng?: number,
    ): Promise<S2LChecklistEntity> {
        const s2l = await this.findOneOrFail(id);

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
        const photos = await this.photoRepository.find({
            where: { s2l_id: id },
        });
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

        // Update S2L
        await this.s2lRepository.update(id, {
            status: 'SUBMITTED',
            signature_url: signatureUrl,
            submitted_at: new Date(),
            all_items_pass: true,
            gps_lat: gpsLat,
            gps_lng: gpsLng,
        });

        // Audit log
        await this.auditService.log({
            organization_id: s2l.organization_id,
            entity_type: 's2l',
            entity_id: id,
            event_type: 'S2L_SUBMITTED',
            actor_id: userId,
            actor_role: 'DRIVER',
            payload: {
                photo_count: photos.length,
                has_signature: true,
                gps_lat: gpsLat,
                gps_lng: gpsLng,
            },
            gps_lat: gpsLat,
            gps_lng: gpsLng,
        });

        this.logger.log(`S2L submitted: ${id} by driver ${userId}`);
        return this.findOneOrFail(id);
    }

    /**
     * Approve or reject an S2L (supervisor only)
     */
    async review(
        id: string,
        reviewerId: string,
        reviewerRole: string,
        status: 'APPROVED' | 'REJECTED',
        reviewNotes?: string,
    ): Promise<S2LChecklistEntity> {
        const s2l = await this.findOneOrFail(id);

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

        // Audit log
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
        return this.findOneOrFail(id);
    }

    /**
     * Add a photo to an S2L checklist
     */
    async addPhoto(
        s2lId: string,
        photoData: {
            photo_type: string;
            storage_path: string;
            file_size_bytes?: number;
            gps_lat?: number;
            gps_lng?: number;
            captured_at: Date;
        },
    ): Promise<S2LPhotoEntity> {
        const s2l = await this.findOneOrFail(s2lId);

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
     * Get all S2L checklists for an organization
     */
    async findByOrganization(
        organizationId: string,
        status?: string,
        page = 1,
        limit = 20,
    ): Promise<{ data: S2LChecklistEntity[]; total: number }> {
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

        return { data, total };
    }

    /**
     * Get S2L checklists for a specific driver
     */
    async findByDriver(driverId: string): Promise<S2LChecklistEntity[]> {
        return this.s2lRepository.find({
            where: { driver_id: driverId },
            relations: ['photos', 'truck', 'station'],
            order: { created_at: 'DESC' },
        });
    }

    /**
     * Find one S2L by ID or throw
     */
    async findOneOrFail(id: string): Promise<S2LChecklistEntity> {
        const s2l = await this.s2lRepository.findOne({
            where: { id },
            relations: ['photos', 'truck', 'driver', 'station', 'reviewer'],
        });

        if (!s2l) {
            throw new NotFoundException(`S2L checklist ${id} not found`);
        }

        return s2l;
    }

    /**
     * Get photos for an S2L
     */
    async getPhotos(s2lId: string): Promise<S2LPhotoEntity[]> {
        return this.photoRepository.find({
            where: { s2l_id: s2lId },
            order: { created_at: 'ASC' },
        });
    }
}
