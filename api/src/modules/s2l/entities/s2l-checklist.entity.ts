import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { OrganizationEntity } from '../../organization/entities/organization.entity';
import { TruckEntity } from '../../fleet/entities/truck.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { StationEntity } from '../../organization/entities/station.entity';
import { S2LPhotoEntity } from './s2l-photo.entity';

@Entity('s2l_checklists')
export class S2LChecklistEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organization_id' })
    organization: OrganizationEntity;

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
    station_id: string;

    @ManyToOne(() => StationEntity)
    @JoinColumn({ name: 'station_id' })
    station: StationEntity;

    @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

    @Column({ type: 'jsonb' })
    checklist_data: {
        item_id: string;
        label: string;
        value: boolean;
        note?: string;
    }[];

    @Column({ type: 'boolean', default: false })
    all_items_pass: boolean;

    @Column({ type: 'varchar', length: 500, nullable: true })
    signature_url: string;

    @Column({ type: 'timestamptz', nullable: true })
    submitted_at: Date;

    @Column({ type: 'uuid', nullable: true })
    reviewed_by: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'reviewed_by' })
    reviewer: UserEntity;

    @Column({ type: 'timestamptz', nullable: true })
    reviewed_at: Date;

    @Column({ type: 'text', nullable: true })
    review_notes: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    gps_lat: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    gps_lng: number;

    @Column({ type: 'boolean', nullable: true })
    is_within_geofence: boolean;

    @Column({ type: 'boolean', default: false })
    offline_created: boolean;

    @Column({ type: 'uuid', nullable: true })
    sync_id: string;

    @OneToMany(() => S2LPhotoEntity, (photo) => photo.s2l)
    photos: S2LPhotoEntity[];

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
