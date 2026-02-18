import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { GeofenceService } from './geofence.service';
import { TruckEntity } from './entities/truck.entity';
import { GpsLogEntity } from './entities/gps-log.entity';
import { GeofenceEntity } from './entities/geofence.entity';
import { StationEntity } from '../organization/entities/station.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TruckEntity, GpsLogEntity, GeofenceEntity, StationEntity]),
        AuditModule,
    ],
    controllers: [FleetController],
    providers: [FleetService, GeofenceService],
    exports: [FleetService, GeofenceService],
})
export class FleetModule { }
