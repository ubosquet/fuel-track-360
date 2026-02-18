import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { S2LModule } from '../s2l/s2l.module';
import { FleetModule } from '../fleet/fleet.module';
import { ManifestModule } from '../manifest/manifest.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [S2LModule, FleetModule, ManifestModule, AuditModule],
    controllers: [SyncController],
    providers: [SyncService],
    exports: [SyncService],
})
export class SyncModule { }
