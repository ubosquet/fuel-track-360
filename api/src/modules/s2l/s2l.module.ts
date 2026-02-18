import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S2LController } from './s2l.controller';
import { S2LService } from './s2l.service';
import { S2LChecklistEntity } from './entities/s2l-checklist.entity';
import { S2LPhotoEntity } from './entities/s2l-photo.entity';
import { StationEntity } from '../organization/entities/station.entity';
import { GeofenceGuard } from '../../common/guards/geofence.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([S2LChecklistEntity, S2LPhotoEntity, StationEntity]),
        AuditModule,
    ],
    controllers: [S2LController],
    providers: [S2LService, GeofenceGuard],
    exports: [S2LService],
})
export class S2LModule { }
