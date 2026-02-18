import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManifestController } from './manifest.controller';
import { ManifestService } from './manifest.service';
import { ManifestEntity } from './entities/manifest.entity';
import { S2LModule } from '../s2l/s2l.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ManifestEntity]),
        S2LModule,
        AuditModule,
    ],
    controllers: [ManifestController],
    providers: [ManifestService],
    exports: [ManifestService],
})
export class ManifestModule { }
