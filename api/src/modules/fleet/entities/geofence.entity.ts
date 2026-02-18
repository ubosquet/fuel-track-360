import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { StationEntity } from '../../organization/entities/station.entity';

@Entity('geofences')
export class GeofenceEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    station_id: string;

    @ManyToOne(() => StationEntity)
    @JoinColumn({ name: 'station_id' })
    station: StationEntity;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'decimal', precision: 10, scale: 7 })
    center_lat: number;

    @Column({ type: 'decimal', precision: 10, scale: 7 })
    center_lng: number;

    @Column({ type: 'integer', default: 500 })
    radius_m: number;

    @Column({ type: 'varchar', length: 20, default: 'CIRCLE' })
    geofence_type: 'CIRCLE' | 'POLYGON';

    @Column({ type: 'jsonb', nullable: true })
    polygon_coords: { lat: number; lng: number }[];

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
