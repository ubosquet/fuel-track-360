import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { S2LChecklistEntity } from './s2l-checklist.entity';

@Entity('s2l_photos')
export class S2LPhotoEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    s2l_id: string;

    @ManyToOne(() => S2LChecklistEntity, (s2l) => s2l.photos, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 's2l_id' })
    s2l: S2LChecklistEntity;

    @Column({ type: 'varchar', length: 20 })
    photo_type: 'FRONT' | 'REAR' | 'COMPARTMENT' | 'SAFETY_EQUIPMENT' | 'OTHER';

    @Column({ type: 'varchar', length: 500 })
    storage_path: string;

    @Column({ type: 'integer', nullable: true })
    file_size_bytes: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    gps_lat: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    gps_lng: number;

    @Column({ type: 'timestamptz' })
    captured_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    uploaded_at: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
