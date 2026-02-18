import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

/**
 * IMMUTABLE AUDIT JOURNAL — INSERT ONLY
 * No UPDATE or DELETE operations allowed.
 */
@Entity('audit_events')
export class AuditEventEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 50 })
    entity_type: string;

    @Column({ type: 'uuid' })
    entity_id: string;

    @Column({ type: 'varchar', length: 100 })
    event_type: string;

    @Column({ type: 'uuid' })
    actor_id: string;

    @Column({ type: 'varchar', length: 20 })
    actor_role: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    gps_lat: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    gps_lng: number;

    @Column({ type: 'varchar', nullable: true })
    ip_address: string;

    @Column({ type: 'text', nullable: true })
    user_agent: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
