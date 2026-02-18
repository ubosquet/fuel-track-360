import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../modules/auth/entities/user.entity';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
    private readonly logger = new Logger(FirebaseAuthGuard.name);

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid authorization header');
        }

        const token = authHeader.split('Bearer ')[1];

        try {
            // Verify Firebase token
            const decodedToken = await admin.auth().verifyIdToken(token);

            // Look up user in our database
            const user = await this.userRepository.findOne({
                where: { firebase_uid: decodedToken.uid, is_active: true },
                relations: ['organization'],
            });

            if (!user) {
                throw new UnauthorizedException('User not found or inactive');
            }

            // Attach user info to request
            request.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                phone_number: decodedToken.phone_number,
                user_id: user.id,
                role: user.role,
                organization_id: user.organization_id,
                full_name: user.full_name,
                preferred_lang: user.preferred_lang,
            };

            // Update last login
            await this.userRepository.update(user.id, { last_login_at: new Date() });

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Firebase auth error: ${error.message}`);
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
