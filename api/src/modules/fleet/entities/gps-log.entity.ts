import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { TruckEntity } from './truck.entity';

@Entity('gps_logs')
export class GpsLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    truck_id: string;

    @ManyToOne(() => TruckEntity)
    @JoinColumn({ name: 'truck_id' })
    truck: TruckEntity;

    @Column({ type: 'decimal', precision: 10, scale: 7 })
    lat: number;

    @Column({ type: 'decimal', precision: 10, scale: 7 })
    lng: number;

    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    speed_kmh: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    heading: number;

    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    accuracy_m: number;

    @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
    altitude_m: number;

    @Column({ type: 'timestamptz' })
    recorded_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    synced_at: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
