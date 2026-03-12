import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OrgInviteEntity } from './entities/org-invite.entity';
import { MemberRequestEntity } from './entities/member-request.entity';
import { OrganizationEntity } from '../organization/entities/organization.entity';
import { UserEntity } from '../auth/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OrgInviteEntity,
            MemberRequestEntity,
            OrganizationEntity,
            UserEntity,
        ]),
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
    exports: [OnboardingService],
})
export class OnboardingModule { }
