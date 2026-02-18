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

    async getStations(organizationId: string, type?: string): Promise<StationEntity[]> {
        const where: any = { organization_id: organizationId, is_active: true };
        if (type) where.type = type;
        return this.stationRepository.find({ where, order: { name: 'ASC' } });
    }

    async createStation(data: Partial<StationEntity>): Promise<StationEntity> {
        const station = this.stationRepository.create(data);
        return this.stationRepository.save(station);
    }
}
