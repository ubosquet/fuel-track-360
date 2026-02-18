import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';

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

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
