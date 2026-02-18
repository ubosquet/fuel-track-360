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
import { TruckEntity } from '../../fleet/entities/truck.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { StationEntity } from '../../organization/entities/station.entity';
import { S2LChecklistEntity } from '../../s2l/entities/s2l-checklist.entity';

@Entity('manifests')
export class ManifestEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organization_id' })
    organization: OrganizationEntity;

    @Column({ type: 'varchar', length: 30, unique: true })
    manifest_number: string;

    @Column({ type: 'uuid' })
    s2l_id: string;

    @ManyToOne(() => S2LChecklistEntity)
    @JoinColumn({ name: 's2l_id' })
    s2l: S2LChecklistEntity;

    @Column({ type: 'uuid' })
    truck_id: string;

    @ManyToOne(() => TruckEntity)
    @JoinColumn({ name: 'truck_id' })
    truck: TruckEntity;

    @Column({ type: 'uuid' })
    driver_id: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'driver_id' })
    driver: UserEntity;

    @Column({ type: 'uuid' })
    origin_station_id: string;

    @ManyToOne(() => StationEntity)
    @JoinColumn({ name: 'origin_station_id' })
    origin_station: StationEntity;

    @Column({ type: 'uuid' })
    dest_station_id: string;

    @ManyToOne(() => StationEntity)
    @JoinColumn({ name: 'dest_station_id' })
    dest_station: StationEntity;

    @Column({ type: 'varchar', length: 20 })
    product_type: 'DIESEL' | 'GASOLINE_91' | 'GASOLINE_95' | 'KEROSENE';

    @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
    volume_loaded_liters: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
    volume_discharged_liters: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    volume_variance_pct: number;

    @Column({ type: 'varchar', length: 20, default: 'CREATED' })
    status:
        | 'CREATED'
        | 'LOADING'
        | 'IN_TRANSIT'
        | 'ARRIVED'
        | 'DISCHARGING'
        | 'COMPLETED'
        | 'FLAGGED';

    @Column({ type: 'timestamptz', nullable: true })
    loaded_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    departed_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    arrived_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    discharged_at: Date;

    @Column({ type: 'boolean', default: false })
    offline_created: boolean;

    @Column({ type: 'uuid', nullable: true })
    sync_id: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
