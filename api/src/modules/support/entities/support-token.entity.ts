import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Stores hashed support tokens so that developers/support engineers
 * can obtain a read-only view of a customer organisation without
 * ever touching the customer's Firebase credentials.
 *
 * Raw tokens are NEVER stored — only a SHA-256 hex digest.
 */
@Entity('support_tokens')
export class SupportTokenEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    /** Friendly reference for the help-desk ticket, e.g. "TICKET-1234" */
    @Column({ type: 'varchar', length: 100 })
    ticket_ref: string;

    /**
     * SHA-256(rawToken) stored as hex.
     * The raw token is returned ONCE at creation time and never persisted.
     */
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 64 })
    token_hash: string;

    /** Who generated this token (must be OWNER or ADMIN of the org) */
    @Column({ type: 'uuid' })
    created_by_user_id: string;

    /** Who issued it — for display in the token list */
    @Column({ type: 'varchar', length: 255 })
    created_by_name: string;

    @Column({ type: 'timestamptz' })
    expires_at: Date;

    /** Populated the first (and only) time the token is redeemed */
    @Column({ type: 'timestamptz', nullable: true })
    redeemed_at: Date | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    redeemed_by_email: string | null;

    /** Hard revocation by the org owner/admin before expiry */
    @Column({ type: 'boolean', default: false })
    is_revoked: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
