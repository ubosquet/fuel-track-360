import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Logger,
    ParseUUIDPipe,
    BadRequestException,
    HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { S2LService } from './s2l.service';
import { CreateS2LDto } from './dto/create-s2l.dto';
import { SubmitS2LDto, ReviewS2LDto } from './dto/submit-review-s2l.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { AddPhotoDto } from './dto/add-photo.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GeofenceGuard } from '../../common/guards/geofence.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireGeofence } from '../../common/decorators/require-geofence.decorator';
import { StorageService } from '../storage/storage.service';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB (already compressed on client ideally)

@ApiTags('s2l')
@ApiBearerAuth()
@Controller('s2l')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class S2LController {
    private readonly logger = new Logger(S2LController.name);

    constructor(
        private readonly s2lService: S2LService,
        private readonly storageService: StorageService,
    ) { }

    @Post()
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @UseGuards(GeofenceGuard)
    @RequireGeofence()
    @HttpCode(201)
    @ApiOperation({ summary: 'Create a new S2L checklist' })
    async create(
        @Body() dto: CreateS2LDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.s2lService.create(dto, user.user_id, user.organization_id, user.role);
    }

    @Post(':id/submit')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Submit S2L for review (enforces all business rules)' })
    async submit(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: SubmitS2LDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.s2lService.submit(id, user.organization_id, user.user_id, user.role, body.signature_url, body.gps_lat, body.gps_lng);
    }

    @Post(':id/review')
    @Roles('SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Approve or reject an S2L checklist' })
    async review(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: ReviewS2LDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.s2lService.review(id, user.organization_id, user.user_id, user.role, body.status, body.review_notes);
    }

    // ════════════════════════════════════════════════════════════
    // Photo Upload — Multipart file + metadata
    // ════════════════════════════════════════════════════════════

    @Post(':id/photos/upload')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @UseInterceptors(FileInterceptor('photo'))
    @ApiOperation({
        summary: 'Upload a photo to an S2L checklist',
        description:
            'Accepts a multipart form with a `photo` file field and metadata fields. ' +
            'The photo is uploaded to Google Cloud Storage and linked to the S2L. ' +
            'Max file size: 10 MB. Accepted formats: JPEG, PNG, WebP.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                photo: { type: 'string', format: 'binary', description: 'The photo file' },
                photo_type: { type: 'string', enum: ['FRONT', 'REAR', 'COMPARTMENT', 'SAFETY_EQUIPMENT', 'OTHER'] },
                gps_lat: { type: 'number', description: 'GPS latitude' },
                gps_lng: { type: 'number', description: 'GPS longitude' },
                captured_at: { type: 'string', format: 'date-time', description: 'When the photo was taken' },
            },
            required: ['photo', 'photo_type', 'captured_at'],
        },
    })
    async uploadPhoto(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: MAX_PHOTO_SIZE }),
                    new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body() metadata: UploadPhotoDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        // 1. Upload to GCS
        const { storagePath, sizeBytes } = await this.storageService.uploadS2LPhoto(
            user.organization_id,
            id,
            metadata.photo_type,
            file.buffer,
            file.mimetype,
        );

        // 2. Save photo record in database
        const photo = await this.s2lService.addPhoto(id, user.organization_id, {
            photo_type: metadata.photo_type,
            storage_path: storagePath,
            file_size_bytes: sizeBytes,
            gps_lat: metadata.gps_lat,
            gps_lng: metadata.gps_lng,
            captured_at: new Date(metadata.captured_at),
        });

        this.logger.log(
            `Photo uploaded for S2L ${id}: ${metadata.photo_type} (${(sizeBytes / 1024).toFixed(0)} KB)`,
        );

        return photo;
    }

    // ── Legacy JSON-only photo registration (for sync engine) ──
    @Post(':id/photos')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @ApiOperation({ summary: 'Register a photo record (metadata only — used by sync engine)' })
    async addPhoto(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: AddPhotoDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.s2lService.addPhoto(id, user.organization_id, {
            ...body,
            captured_at: new Date(body.captured_at),
        });
    }

    // ── Signature upload ──
    @Post(':id/signature/upload')
    @Roles('DRIVER', 'DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER')
    @UseInterceptors(FileInterceptor('signature'))
    @ApiOperation({ summary: 'Upload a digital signature image for an S2L checklist' })
    @ApiConsumes('multipart/form-data')
    async uploadSignature(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2 MB
                    new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        const { storagePath } = await this.storageService.uploadSignature(
            user.organization_id,
            id,
            file.buffer,
            file.mimetype,
        );

        this.logger.log(`Signature uploaded for S2L ${id}`);

        return { storage_path: storagePath };
    }

    @Get('stats')
    @ApiOperation({
        summary: 'Get pre-aggregated S2L status counts for the dashboard',
        description:
            'Returns a single-query aggregated count of S2L checklists by status. ' +
            'Use this instead of fetching full lists and counting client-side.',
    })
    async getStats(@CurrentUser() user: AuthTokenPayload) {
        return this.s2lService.getStats(user.organization_id);
    }

    @Get()
    @ApiOperation({ summary: 'List S2L checklists for the organization' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(
        @CurrentUser() user: AuthTokenPayload,
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.s2lService.findByOrganization(user.organization_id, status, page, limit);
    }

    @Get('my')
    @Roles('DRIVER', 'DISPATCHER')
    @ApiOperation({ summary: 'List S2L checklists for the current driver' })
    async findByDriver(@CurrentUser() user: AuthTokenPayload) {
        return this.s2lService.findByDriver(user.user_id, user.organization_id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get S2L checklist details' })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.s2lService.findOneOrFail(id, user.organization_id);
    }

    @Get(':id/photos')
    @ApiOperation({ summary: 'Get photos for an S2L checklist' })
    async getPhotos(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.s2lService.getPhotos(id, user.organization_id);
    }
}
