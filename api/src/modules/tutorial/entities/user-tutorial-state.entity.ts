import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('user_tutorial_state')
export class UserTutorialStateEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    /** Whether the user wants tutorials shown */
    @Column({ type: 'boolean', default: true })
    tutorial_enabled: boolean;

    /** ISO timestamp of when the user last interacted with the tutorial */
    @Column({ type: 'timestamptz', nullable: true })
    last_tutorial_seen_at: Date | null;

    /**
     * Step IDs the user has explicitly completed.
     * Steps in this list never re-appear even when tutorial is reset.
     */
    @Column({ type: 'text', array: true, default: '{}' })
    completed_steps: string[];

    /**
     * Step IDs the user skipped ("Don't show again").
     * Unlike completed_steps, these can be cleared by re-enabling the tutorial.
     */
    @Column({ type: 'text', array: true, default: '{}' })
    dismissed_steps: string[];

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
