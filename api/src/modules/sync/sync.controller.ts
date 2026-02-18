import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SyncService, SyncOperation } from './sync.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
@UseGuards(FirebaseAuthGuard)
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(private readonly syncService: SyncService) { }

    @Post('batch')
    @ApiOperation({ summary: 'Process a batch of offline sync operations' })
    async processBatch(
        @Body() body: { operations: SyncOperation[] },
        @CurrentUser() user: any,
    ) {
        this.logger.log(
            `Sync batch received: ${body.operations.length} operations from user ${user.user_id}`,
        );
        return this.syncService.processBatch(body.operations, user.user_id, user.organization_id);
    }
}
