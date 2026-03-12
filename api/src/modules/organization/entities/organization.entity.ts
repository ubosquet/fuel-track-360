import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

@Entity('organizations')
export class OrganizationEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    code: string;

    @Column({ type: 'varchar', length: 3, default: 'HTI' })
    country: string;

    @Column({ type: 'varchar', length: 3, default: 'HTG' })
    currency: string;

    @Column({ type: 'varchar', length: 50, default: 'America/Port-au-Prince' })
    timezone: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    // ── Branding ──────────────────────────────────────────────────────────
    @Column({ type: 'varchar', length: 500, nullable: true })
    logo_url: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    banner_url: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
    domain: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    website: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    industry: string | null;

    // ── Contact ───────────────────────────────────────────────────────────
    @Column({ type: 'text', nullable: true })
    address: string | null;

    @Column({ type: 'varchar', length: 30, nullable: true })
    phone: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    billing_email: string | null;

    // ── Subscription ──────────────────────────────────────────────────────
    @Column({ type: 'varchar', length: 20, default: 'TRIAL' })
    subscription_plan: SubscriptionPlan;

    @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
    subscription_status: SubscriptionStatus;

    @Column({ type: 'timestamptz', nullable: true })
    trial_ends_at: Date | null;

    @Column({ type: 'integer', default: 10 })
    max_users: number;

    @Column({ type: 'integer', default: 5 })
    max_drivers: number;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
