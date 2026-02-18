import {
    Controller,
    Get,
    Query,
    UseGuards,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { StorageService } from './storage.service';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(FirebaseAuthGuard)
export class StorageController {
    private readonly logger = new Logger(StorageController.name);

    constructor(private readonly storageService: StorageService) { }

    /**
     * Generate a time-limited signed URL for reading a file from GCS.
     * The web dashboard calls this to display photos & signatures.
     */
    @Get('signed-url')
    @ApiOperation({
        summary: 'Get a signed URL for a GCS object',
        description:
            'Returns a time-limited signed URL (default 24h) for reading a photo or signature from Google Cloud Storage. ' +
            'The web dashboard uses this to render images without exposing the GCS bucket directly.',
    })
    @ApiQuery({ name: 'path', required: true, description: 'GCS storage path (e.g. organizations/abc/s2l/xyz/photo.jpg)' })
    @ApiQuery({ name: 'bucket', required: false, enum: ['photos', 'signatures'], description: 'Which bucket to read from (default: photos)' })
    @ApiResponse({ status: 200, description: 'Returns JSON with { url: string, expires_at: string }' })
    @ApiResponse({ status: 400, description: 'Missing or invalid path' })
    async getSignedUrl(
        @Query('path') storagePath: string,
        @Query('bucket') bucket?: 'photos' | 'signatures',
    ) {
        if (!storagePath || storagePath.trim().length === 0) {
            throw new BadRequestException('Query parameter "path" is required');
        }

        // Security: prevent path traversal
        if (storagePath.includes('..') || storagePath.startsWith('/')) {
            throw new BadRequestException('Invalid storage path');
        }

        const bucketType = bucket === 'signatures' ? 'signatures' : 'photos';
        const url = await this.storageService.getSignedUrl(storagePath, bucketType);

        // Calculate expiry (matches StorageService signedUrlExpiry, default 24h)
        const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

        return { url, expires_at: expiresAt };
    }

    /**
     * Batch signed URLs — generate multiple signed URLs in one request.
     * Useful when loading an S2L detail page with many photos.
     */
    @Get('signed-urls')
    @ApiOperation({
        summary: 'Get signed URLs for multiple GCS objects',
        description: 'Accepts a comma-separated list of storage paths and returns signed URLs for each. Max 20 paths per request.',
    })
    @ApiQuery({ name: 'paths', required: true, description: 'Comma-separated list of GCS storage paths (max 20)' })
    @ApiQuery({ name: 'bucket', required: false, enum: ['photos', 'signatures'] })
    @ApiResponse({ status: 200, description: 'Returns JSON with { urls: Array<{ path, url, expires_at }> }' })
    async getBatchSignedUrls(
        @Query('paths') pathsParam: string,
        @Query('bucket') bucket?: 'photos' | 'signatures',
    ) {
        if (!pathsParam || pathsParam.trim().length === 0) {
            throw new BadRequestException('Query parameter "paths" is required');
        }

        const paths = pathsParam.split(',').map((p) => p.trim()).filter(Boolean);

        if (paths.length === 0) {
            throw new BadRequestException('At least one path is required');
        }
        if (paths.length > 20) {
            throw new BadRequestException('Maximum 20 paths per batch request');
        }

        // Validate all paths
        for (const p of paths) {
            if (p.includes('..') || p.startsWith('/')) {
                throw new BadRequestException(`Invalid storage path: ${p}`);
            }
        }

        const bucketType = bucket === 'signatures' ? 'signatures' : 'photos';
        const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

        const urls = await Promise.all(
            paths.map(async (storagePath) => {
                try {
                    const url = await this.storageService.getSignedUrl(storagePath, bucketType);
                    return { path: storagePath, url, expires_at: expiresAt };
                } catch (error) {
                    this.logger.warn(`Failed to generate signed URL for: ${storagePath}`);
                    return { path: storagePath, url: null, error: 'Failed to generate URL' };
                }
            }),
        );

        return { urls };
    }
}
