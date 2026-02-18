import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('organization')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class OrganizationController {
    constructor(private readonly orgService: OrganizationService) { }

    @Get('current')
    @ApiOperation({ summary: 'Get current user organization' })
    async getCurrent(@CurrentUser() user: any) {
        return this.orgService.findById(user.organization_id);
    }

    @Put('current')
    @Roles('ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Update organization settings' })
    async updateCurrent(
        @Body() body: UpdateOrganizationDto,
        @CurrentUser() user: any,
    ) {
        return this.orgService.updateOrganization(user.organization_id, body);
    }

    @Get('stations')
    @ApiOperation({ summary: 'List stations for the organization' })
    async getStations(
        @CurrentUser() user: any,
        @Query('type') type?: string,
    ) {
        return this.orgService.getStations(user.organization_id, type);
    }

    @Get('stations/:id')
    @ApiOperation({ summary: 'Get station details' })
    async getStation(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ) {
        return this.orgService.getStationById(id, user.organization_id);
    }

    @Post('stations')
    @Roles('ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Create a station' })
    async createStation(
        @Body() body: CreateStationDto,
        @CurrentUser() user: any,
    ) {
        return this.orgService.createStation({
            ...body,
            organization_id: user.organization_id,
        });
    }

    @Put('stations/:id')
    @Roles('ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Update a station' })
    async updateStation(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: UpdateStationDto,
        @CurrentUser() user: any,
    ) {
        return this.orgService.updateStation(id, user.organization_id, body);
    }
}

