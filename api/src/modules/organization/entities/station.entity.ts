import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from '../../organization/entities/organization.entity';

@Entity('stations')
export class StationEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organization_id' })
    organization: OrganizationEntity;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 20 })
    code: string;

    @Column({ type: 'varchar', length: 20 })
    type: 'TERMINAL' | 'STATION';

    @Column({ type: 'varchar', length: 10 })
    zone: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'decimal', precision: 10, scale: 7 })
    gps_lat: number;

    @Column({ type: 'decimal', precision: 10, scale: 7 })
    gps_lng: number;

    @Column({ type: 'integer', default: 500 })
    geofence_radius_m: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
