import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from './entities/audit-event.entity';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditEventEntity)
        private readonly auditRepository: Repository<AuditEventEntity>,
    ) { }

    /**
     * Log an audit event (INSERT ONLY — immutable journal)
     */
    async log(data: {
        organization_id: string;
        entity_type: string;
        entity_id: string;
        event_type: string;
        actor_id: string;
        actor_role: string;
        payload: Record<string, unknown>;
        gps_lat?: number;
        gps_lng?: number;
        ip_address?: string;
        user_agent?: string;
    }): Promise<AuditEventEntity> {
        const event = this.auditRepository.create(data);
        const saved = await this.auditRepository.save(event);
        this.logger.debug(`Audit: ${data.event_type} on ${data.entity_type}/${data.entity_id}`);
        return saved;
    }

    /**
     * Query audit events with filters
     */
    async query(params: {
        organization_id: string;
        entity_type?: string;
        entity_id?: string;
        event_type?: string;
        actor_id?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: AuditEventEntity[]; total: number }> {
        const page = params.page || 1;
        const limit = params.limit || 50;

        const query = this.auditRepository
            .createQueryBuilder('audit')
            .where('audit.organization_id = :orgId', { orgId: params.organization_id })
            .orderBy('audit.created_at', 'DESC');

        if (params.entity_type) {
            query.andWhere('audit.entity_type = :entityType', { entityType: params.entity_type });
        }
        if (params.entity_id) {
            query.andWhere('audit.entity_id = :entityId', { entityId: params.entity_id });
        }
        if (params.event_type) {
            query.andWhere('audit.event_type = :eventType', { eventType: params.event_type });
        }
        if (params.actor_id) {
            query.andWhere('audit.actor_id = :actorId', { actorId: params.actor_id });
        }
        if (params.start_date) {
            query.andWhere('audit.created_at >= :startDate', { startDate: params.start_date });
        }
        if (params.end_date) {
            query.andWhere('audit.created_at <= :endDate', { endDate: params.end_date });
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return { data, total };
    }
}
