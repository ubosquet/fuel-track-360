import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from './entities/organization.entity';
import { StationEntity } from './entities/station.entity';

@Injectable()
export class OrganizationService {
    private readonly logger = new Logger(OrganizationService.name);

    constructor(
        @InjectRepository(OrganizationEntity)
        private readonly orgRepository: Repository<OrganizationEntity>,
        @InjectRepository(StationEntity)
        private readonly stationRepository: Repository<StationEntity>,
    ) { }

    async findAll(): Promise<OrganizationEntity[]> {
        return this.orgRepository.find({ where: { is_active: true } });
    }

    async findById(id: string): Promise<OrganizationEntity> {
        const org = await this.orgRepository.findOne({ where: { id } });
        if (!org) throw new NotFoundException(`Organization ${id} not found`);
        return org;
    }

    async createOrganization(data: Partial<OrganizationEntity>): Promise<OrganizationEntity> {
        const org = this.orgRepository.create(data);
        return this.orgRepository.save(org);
    }

    async updateOrganization(
        id: string,
        updates: { name?: string; country?: string; currency?: string; timezone?: string },
    ): Promise<OrganizationEntity> {
        const org = await this.findById(id);
        Object.assign(org, updates);
        const saved = await this.orgRepository.save(org);
        this.logger.log(`Organization updated: ${saved.id} (${saved.name})`);
        return saved;
    }

    async getStations(organizationId: string, type?: string): Promise<StationEntity[]> {
        const where: any = { organization_id: organizationId, is_active: true };
        if (type) where.type = type;
        return this.stationRepository.find({ where, order: { name: 'ASC' } });
    }

    async getStationById(id: string, organizationId: string): Promise<StationEntity> {
        const station = await this.stationRepository.findOne({
            where: { id, organization_id: organizationId },
        });
        if (!station) throw new NotFoundException(`Station ${id} not found`);
        return station;
    }

    async createStation(data: Partial<StationEntity>): Promise<StationEntity> {
        const station = this.stationRepository.create(data);
        return this.stationRepository.save(station);
    }

    async updateStation(
        id: string,
        organizationId: string,
        updates: Partial<StationEntity>,
    ): Promise<StationEntity> {
        const station = await this.getStationById(id, organizationId);
        Object.assign(station, updates);
        const saved = await this.stationRepository.save(station);
        this.logger.log(`Station updated: ${saved.id} (${saved.name})`);
        return saved;
    }
}

