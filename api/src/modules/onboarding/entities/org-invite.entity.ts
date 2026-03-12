import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { OrganizationEntity } from '../../organization/entities/organization.entity';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('org_invites')
export class OrgInviteEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organization_id' })
    organization: OrganizationEntity;

    /** URL-safe 48-byte hex token — hashed for storage, returned raw once */
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 96 })
    invite_token: string;

    @Column({ type: 'uuid' })
    created_by_user_id: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'created_by_user_id' })
    created_by: UserEntity;

    /**
     * Roles that registrants can choose from.
     * e.g. ['DRIVER', 'DISPATCHER', 'FINANCE']
     * null = no restriction (admin decides at approval time)
     */
    @Column({ type: 'text', array: true, nullable: true })
    allowed_roles: string[] | null;

    @Column({ type: 'timestamptz', nullable: true })
    expires_at: Date | null;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    /** Running count of how many times this link has been used */
    @Column({ type: 'integer', default: 0 })
    join_count: number;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
