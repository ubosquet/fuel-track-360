import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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

    @Get('stations')
    @ApiOperation({ summary: 'List stations for the organization' })
    async getStations(
        @CurrentUser() user: any,
        @Query('type') type?: string,
    ) {
        return this.orgService.getStations(user.organization_id, type);
    }

    @Post('stations')
    @Roles('ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Create a station' })
    async createStation(
        @Body() body: Partial<any>,
        @CurrentUser() user: any,
    ) {
        return this.orgService.createStation({
            ...body,
            organization_id: user.organization_id,
        });
    }
}
