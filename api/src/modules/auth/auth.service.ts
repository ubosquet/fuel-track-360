import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
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

    async getUsersByOrganization(organizationId: string): Promise<UserEntity[]> {
        return this.userRepository.find({
            where: { organization_id: organizationId, is_active: true },
            order: { full_name: 'ASC' },
        });
    }

    async updateLastLogin(userId: string): Promise<void> {
        await this.userRepository.update(userId, { last_login_at: new Date() });
    }
}
