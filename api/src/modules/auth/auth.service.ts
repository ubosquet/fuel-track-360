import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    async createUser(data: {
        firebase_uid: string;
        email?: string;
        phone?: string;
        full_name: string;
        role: string;
        organization_id: string;
        preferred_lang?: string;
    }): Promise<UserEntity> {
        // Check if user already exists
        const existing = await this.userRepository.findOne({
            where: { firebase_uid: data.firebase_uid },
        });

        if (existing) {
            throw new ConflictException('User with this Firebase UID already exists');
        }

        const user = this.userRepository.create({
            firebase_uid: data.firebase_uid,
            email: data.email,
            phone: data.phone,
            full_name: data.full_name,
            role: data.role as any,
            organization_id: data.organization_id,
            preferred_lang: (data.preferred_lang || 'fr') as any,
        });

        const saved = await this.userRepository.save(user);
        this.logger.log(`User created: ${saved.id} (${saved.full_name}, role: ${saved.role})`);
        return saved;
    }

    async getUserById(id: string): Promise<UserEntity> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['organization'],
        });

        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }

        return user;
    }

    async getUserByFirebaseUid(firebaseUid: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({
            where: { firebase_uid: firebaseUid, is_active: true },
            relations: ['organization'],
        });
    }

    async getUsersByOrganization(
        organizationId: string,
        filters?: { role?: string; is_active?: boolean },
    ): Promise<UserEntity[]> {
        const where: any = { organization_id: organizationId };
        if (filters?.role) where.role = filters.role;
        if (filters?.is_active !== undefined) where.is_active = filters.is_active;
        // If no is_active filter, show all (for management UI)
        return this.userRepository.find({
            where,
            order: { full_name: 'ASC' },
        });
    }

    async updateUser(
        id: string,
        organizationId: string,
        updates: {
            full_name?: string;
            role?: string;
            phone?: string;
            email?: string;
            preferred_lang?: string;
            is_active?: boolean;
        },
    ): Promise<UserEntity> {
        const user = await this.userRepository.findOne({
            where: { id, organization_id: organizationId },
        });

        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }

        // Prevent deactivation of the last OWNER
        if (updates.is_active === false && user.role === 'OWNER') {
            const ownerCount = await this.userRepository.count({
                where: { organization_id: organizationId, role: 'OWNER' as any, is_active: true },
            });
            if (ownerCount <= 1) {
                throw new ForbiddenException('Cannot deactivate the last owner of the organization');
            }
        }

        // Prevent role change away from OWNER if last owner
        if (updates.role && updates.role !== 'OWNER' && user.role === 'OWNER') {
            const ownerCount = await this.userRepository.count({
                where: { organization_id: organizationId, role: 'OWNER' as any, is_active: true },
            });
            if (ownerCount <= 1) {
                throw new ForbiddenException('Cannot change the role of the last owner');
            }
        }

        Object.assign(user, updates);
        const saved = await this.userRepository.save(user);
        this.logger.log(`User updated: ${saved.id} (${saved.full_name}, role: ${saved.role}, active: ${saved.is_active})`);
        return saved;
    }

    async updateLastLogin(userId: string): Promise<void> {
        await this.userRepository.update(userId, { last_login_at: new Date() });
    }
}

