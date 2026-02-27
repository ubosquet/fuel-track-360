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
    HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ManifestService } from './manifest.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';
import { CreateManifestDto } from './dto/create-manifest.dto';
import { UpdateManifestStatusDto } from './dto/update-manifest.dto';

@ApiTags('manifest')
@ApiBearerAuth()
@Controller('manifests')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ManifestController {
    constructor(private readonly manifestService: ManifestService) { }

    @Post()
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @HttpCode(201)
    @ApiOperation({ summary: 'Create a manifest (requires APPROVED S2L)' })
    async create(
        @Body() body: CreateManifestDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.manifestService.create(body, user.user_id, user.organization_id, user.role);
    }

    @Get()
    @ApiOperation({ summary: 'List manifests (organization scoped)' })
    async findAll(
        @CurrentUser() user: AuthTokenPayload,
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.manifestService.findByOrganization(user.organization_id, status, page, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get manifest details (organization scoped)' })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        // M2 FIX: org-scoped — a user from Org A cannot read manifests from Org B
        return this.manifestService.findOneOrFail(id, user.organization_id);
    }

    @Put(':id/status')
    @Roles('DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Update manifest status (enforces state machine)' })
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: UpdateManifestStatusDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.manifestService.updateStatus(
            id,
            body.status,
            user.user_id,
            user.role,           // M5 FIX: pass actual role
            user.organization_id, // M2 FIX: org-scoped
            {
                volume_loaded_liters: body.volume_loaded_liters,
                volume_discharged_liters: body.volume_discharged_liters,
            },
        );
    }
}
