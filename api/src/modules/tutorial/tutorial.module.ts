import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorialController } from './tutorial.controller';
import { TutorialService } from './tutorial.service';
import { UserTutorialStateEntity } from './entities/user-tutorial-state.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserTutorialStateEntity]),
        // AuthModule is @Global() so AuthService is available without importing AuthModule
    ],
    controllers: [TutorialController],
    providers: [TutorialService],
    exports: [TutorialService],
})
export class TutorialModule { }
