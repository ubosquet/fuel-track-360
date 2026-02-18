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

@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organization_id' })
    organization: OrganizationEntity;

    @Column({ type: 'varchar', length: 128, unique: true })
    firebase_uid: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @Column({ type: 'varchar', length: 255 })
    full_name: string;

    @Column({ type: 'varchar', length: 20 })
    role: 'DRIVER' | 'DISPATCHER' | 'SUPERVISOR' | 'FINANCE' | 'ADMIN' | 'OWNER';

    @Column({ type: 'varchar', length: 2, default: 'fr' })
    preferred_lang: 'fr' | 'en' | 'ht';

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    last_login_at: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
