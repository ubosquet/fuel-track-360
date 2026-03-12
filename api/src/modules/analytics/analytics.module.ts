import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ManifestEntity } from '../manifest/entities/manifest.entity';
import { S2LChecklistEntity } from '../s2l/entities/s2l-checklist.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ManifestEntity, S2LChecklistEntity]),
    ],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
