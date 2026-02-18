import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    Logger,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { S2LService } from './s2l.service';
import { CreateS2LDto } from './dto/create-s2l.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GeofenceGuard } from '../../common/guards/geofence.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireGeofence } from '../../common/decorators/require-geofence.decorator';

@ApiTags('s2l')
@ApiBearerAuth()
@Controller('s2l')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class S2LController {
    private readonly logger = new Logger(S2LController.name);

    constructor(private readonly s2lService: S2LService) { }

    @Post()
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @UseGuards(GeofenceGuard)
    @RequireGeofence()
    @ApiOperation({ summary: 'Create a new S2L checklist' })
    async create(
        @Body() dto: CreateS2LDto,
        @CurrentUser() user: any,
    ) {
        return this.s2lService.create(dto, user.user_id, user.organization_id);
    }

    @Post(':id/submit')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Submit S2L for review (enforces all business rules)' })
    async submit(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { signature_url: string; gps_lat?: number; gps_lng?: number },
        @CurrentUser() user: any,
    ) {
        return this.s2lService.submit(id, user.user_id, body.signature_url, body.gps_lat, body.gps_lng);
    }

    @Post(':id/review')
    @Roles('SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Approve or reject an S2L checklist' })
    async review(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { status: 'APPROVED' | 'REJECTED'; review_notes?: string },
        @CurrentUser() user: any,
    ) {
        return this.s2lService.review(id, user.user_id, user.role, body.status, body.review_notes);
    }

    @Post(':id/photos')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Add a photo to an S2L checklist' })
    async addPhoto(
        @Param('id', ParseUUIDPipe) id: string,
        @Body()
        body: {
            photo_type: string;
            storage_path: string;
            file_size_bytes?: number;
            gps_lat?: number;
            gps_lng?: number;
            captured_at: string;
        },
    ) {
        return this.s2lService.addPhoto(id, {
            ...body,
            captured_at: new Date(body.captured_at),
        });
    }

    @Get()
    @ApiOperation({ summary: 'List S2L checklists for the organization' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(
        @CurrentUser() user: any,
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.s2lService.findByOrganization(user.organization_id, status, page, limit);
    }

    @Get('my')
    @Roles('DRIVER', 'DISPATCHER')
    @ApiOperation({ summary: 'List S2L checklists for the current driver' })
    async findByDriver(@CurrentUser() user: any) {
        return this.s2lService.findByDriver(user.user_id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get S2L checklist details' })
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.s2lService.findOneOrFail(id);
    }

    @Get(':id/photos')
    @ApiOperation({ summary: 'Get photos for an S2L checklist' })
    async getPhotos(@Param('id', ParseUUIDPipe) id: string) {
        return this.s2lService.getPhotos(id);
    }
}
