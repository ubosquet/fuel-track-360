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

@Entity('trucks')
export class TruckEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organization_id' })
    organization: OrganizationEntity;

    @Column({ type: 'varchar', length: 20 })
    plate_number: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    capacity_liters: number;

    @Column({ type: 'integer', default: 1 })
    compartments: number;

    @Column({ type: 'uuid', nullable: true })
    driver_id: string;

    @Column({
        type: 'enum',
        enum: ['EN_ROUTE', 'LOADING', 'DISCHARGING', 'IDLE', 'MAINTENANCE'],
        default: 'IDLE',
    })
    status: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    current_lat: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    current_lng: number;

    @Column({ type: 'timestamp', nullable: true })
    last_gps_at: Date;
    
    @Column({ nullable: true })
    gps_device_id: string; // Queclink IMEI or hardware tracker ID

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
