import { Controller, Post, Body, UseGuards, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncBatchDto, SyncOperationDto } from './dto/sync-batch.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
@UseGuards(FirebaseAuthGuard)
@Throttle({ sync: { ttl: 60000, limit: 20 } }) // 20 batch syncs per minute
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(private readonly syncService: SyncService) { }

    @Post('batch')
    @ApiOperation({
        summary: 'Process a batch of offline sync operations',
        description: `
            Accepts up to 50 sync operations in a single batch.
            Each operation must have a unique sync_id for deduplication.
            Supported entity types: s2l, gps_log, manifest.
            Supported operations: CREATE, UPDATE, DELETE.
        `,
    })
    @ApiBody({ type: SyncBatchDto })
    @ApiResponse({ status: 200, description: 'Sync results for each operation' })
    @ApiResponse({ status: 400, description: 'Validation failed — malformed payload' })
    @ApiResponse({ status: 401, description: 'Unauthorized — invalid or expired token' })
    @ApiResponse({ status: 413, description: 'Payload too large — max 50 operations per batch' })
    @UsePipes(new ValidationPipe({
        whitelist: true,           // Strip unknown properties
        forbidNonWhitelisted: true, // Throw on unknown properties
        transform: true,           // Auto-transform to DTO classes
        transformOptions: {
            enableImplicitConversion: true,
        },
    }))
    async processBatch(
        @Body() body: SyncBatchDto,
        @CurrentUser() user: any,
    ) {
        this.logger.log(
            `Sync batch received: ${body.operations.length} operations from user ${user.user_id}`,
        );

        // Convert validated DTOs to the SyncOperation interface the service expects
        const operations = body.operations.map((op: SyncOperationDto) => ({
            sync_id: op.sync_id,
            operation: op.operation,
            entity_type: op.entity_type,
            entity_id: op.entity_id,
            payload: op.payload,
            queued_at: op.queued_at,
        }));

        return this.syncService.processBatch(operations, user.user_id, user.organization_id);
    }
}
