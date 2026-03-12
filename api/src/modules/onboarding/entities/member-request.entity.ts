import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from '../../organization/entities/organization.entity';
import { OrgInviteEntity } from './org-invite.entity';

export type MemberRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity('member_requests')
export class MemberRequestEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organization_id' })
    organization: OrganizationEntity;

    @Column({ type: 'uuid', nullable: true })
    invite_id: string | null;

    @ManyToOne(() => OrgInviteEntity, { nullable: true })
    @JoinColumn({ name: 'invite_id' })
    invite: OrgInviteEntity | null;

    @Column({ type: 'varchar', length: 255 })
    full_name: string;

    @Column({ type: 'varchar', length: 255 })
    email: string;

    @Column({ type: 'varchar', length: 30, nullable: true })
    phone: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    job_title: string | null;

    @Column({ type: 'varchar', length: 30 })
    role_requested: string;

    /**
     * Populated once the Firebase account is created upon approval.
     * null until approved.
     */
    @Column({ type: 'varchar', length: 128, nullable: true })
    firebase_uid: string | null;

    @Column({ type: 'varchar', length: 20, default: 'PENDING' })
    status: MemberRequestStatus;

    @Column({ type: 'uuid', nullable: true })
    reviewed_by: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    reviewed_at: Date | null;

    @Column({ type: 'text', nullable: true })
    rejection_reason: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
