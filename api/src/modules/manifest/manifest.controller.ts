import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ManifestService } from './manifest.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('manifest')
@ApiBearerAuth()
@Controller('manifests')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ManifestController {
    constructor(private readonly manifestService: ManifestService) { }

    @Post()
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Create a manifest (requires APPROVED S2L)' })
    async create(
        @Body()
        body: {
            s2l_id: string;
            truck_id: string;
            origin_station_id: string;
            dest_station_id: string;
            product_type: string;
            volume_loaded_liters?: number;
            sync_id?: string;
            offline_created?: boolean;
        },
        @CurrentUser() user: any,
    ) {
        return this.manifestService.create(body, user.user_id, user.organization_id);
    }

    @Get()
    @ApiOperation({ summary: 'List manifests' })
    async findAll(
        @CurrentUser() user: any,
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.manifestService.findByOrganization(user.organization_id, status, page, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get manifest details' })
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.manifestService.findOneOrFail(id);
    }

    @Put(':id/status')
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Update manifest status' })
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body()
        body: {
            status: string;
            volume_loaded_liters?: number;
            volume_discharged_liters?: number;
        },
        @CurrentUser() user: any,
    ) {
        return this.manifestService.updateStatus(
            id,
            body.status,
            user.user_id,
            user.role,
            {
                volume_loaded_liters: body.volume_loaded_liters,
                volume_discharged_liters: body.volume_discharged_liters,
            },
        );
    }
}
