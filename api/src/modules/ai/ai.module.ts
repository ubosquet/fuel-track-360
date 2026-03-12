import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { GeminiService } from './gemini.service';
import { ManifestEntity } from '../manifest/entities/manifest.entity';
import { S2LChecklistEntity } from '../s2l/entities/s2l-checklist.entity';
import { TruckEntity } from '../fleet/entities/truck.entity';
import { GpsLogEntity } from '../fleet/entities/gps-log.entity';
import { AICronService } from './ai.cron';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ManifestEntity, S2LChecklistEntity, TruckEntity, GpsLogEntity]),
        AuditModule
    ],
    controllers: [AIController],
    providers: [AIService, GeminiService, AICronService],
    exports: [AIService, GeminiService],
})
export class AIModule { }
