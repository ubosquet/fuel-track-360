import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationEntity } from './entities/organization.entity';
import { StationEntity } from './entities/station.entity';

@Module({
    imports: [TypeOrmModule.forFeature([OrganizationEntity, StationEntity])],
    controllers: [OrganizationController],
    providers: [OrganizationService],
    exports: [OrganizationService, TypeOrmModule],
})
export class OrganizationModule { }
