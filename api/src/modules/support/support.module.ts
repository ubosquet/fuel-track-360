import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportTokenEntity } from './entities/support-token.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SupportTokenEntity])],
    controllers: [SupportController],
    providers: [SupportService],
    // Export so SupportSessionGuard (used in other modules) can inject SupportService
    exports: [SupportService],
})
export class SupportModule { }
