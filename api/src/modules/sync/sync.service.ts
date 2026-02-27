import { Injectable, Logger } from '@nestjs/common';
import { S2LService } from '../s2l/s2l.service';
import { FleetService } from '../fleet/fleet.service';
import { ManifestService } from '../manifest/manifest.service';
import { AuditService } from '../audit/audit.service';

export interface SyncOperation {
    sync_id: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    entity_type: string;
    entity_id?: string;
    payload: any;
    queued_at: string;
}

export interface SyncResult {
    sync_id: string;
    status: 'COMPLETED' | 'FAILED' | 'CONFLICT';
    server_id?: string;
    error?: string;
}

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(
        private readonly s2lService: S2LService,
        private readonly fleetService: FleetService,
        private readonly manifestService: ManifestService,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Process a batch of offline sync operations.
     *
     * Protocol:
     * 1. Each operation has a sync_id for deduplication
     * 2. Server returns status for each operation
     * 3. Conflict resolution: Server wins for S2L status, Client wins for GPS, LWW for manifests
     */
    async processBatch(
        operations: SyncOperation[],
        userId: string,
        userRole: string,        // M5 FIX: actual role from JWT
        organizationId: string,
    ): Promise<SyncResult[]> {
        const results: SyncResult[] = [];

        for (const op of operations) {
            try {
                const result = await this.processOperation(op, userId, userRole, organizationId);
                results.push(result);
            } catch (error) {
                this.logger.error(`Sync operation failed: ${op.sync_id} - ${error.message}`);
                results.push({
                    sync_id: op.sync_id,
                    status: 'FAILED',
                    error: error.message,
                });
            }
        }

        // M5 FIX: use actual role for audit log
        await this.auditService.log({
            organization_id: organizationId,
            entity_type: 'sync' as any,
            entity_id: 'batch',
            event_type: 'SYNC_BATCH_RECEIVED',
            actor_id: userId,
            actor_role: userRole,   // was hardcoded 'DRIVER'
            payload: {
                total_operations: operations.length,
                completed: results.filter((r) => r.status === 'COMPLETED').length,
                failed: results.filter((r) => r.status === 'FAILED').length,
                conflicts: results.filter((r) => r.status === 'CONFLICT').length,
            },
        });

        return results;
    }

    private async processOperation(
        op: SyncOperation,
        userId: string,
        userRole: string,
        organizationId: string,
    ): Promise<SyncResult> {
        switch (op.entity_type) {
            case 's2l':
                return this.processS2LOperation(op, userId, userRole, organizationId);
            case 'gps_log':
                return this.processGpsOperation(op, organizationId);
            case 'manifest':
                return this.processManifestOperation(op, userId, userRole, organizationId);
            default:
                return {
                    sync_id: op.sync_id,
                    status: 'FAILED',
                    error: `Unknown entity type: ${op.entity_type}`,
                };
        }
    }

    private async processS2LOperation(
        op: SyncOperation,
        userId: string,
        userRole: string,           // M5 FIX
        organizationId: string,
    ): Promise<SyncResult> {
        if (op.operation === 'CREATE') {
            const s2l = await this.s2lService.create(
                { ...op.payload, sync_id: op.sync_id, offline_created: true },
                userId,
                organizationId,
                userRole,           // M5 FIX: pass actual role so audit log is correct
            );
            return {
                sync_id: op.sync_id,
                status: 'COMPLETED',
                server_id: s2l.id,
            };
        }
        return { sync_id: op.sync_id, status: 'FAILED', error: 'Unsupported operation' };
    }

    private async processGpsOperation(
        op: SyncOperation,
        organizationId: string,
    ): Promise<SyncResult> {
        if (op.operation === 'CREATE') {
            // GPS logs are append-only — client always wins
            const logs = Array.isArray(op.payload) ? op.payload : [op.payload];
            // M2 FIX (carried from fleet): pass organizationId for truck ownership validation
            await this.fleetService.ingestGpsLogs(logs, organizationId);
            return {
                sync_id: op.sync_id,
                status: 'COMPLETED',
            };
        }
        return { sync_id: op.sync_id, status: 'FAILED', error: 'Unsupported operation' };
    }

    private async processManifestOperation(
        op: SyncOperation,
        userId: string,
        userRole: string,           // M5 FIX
        organizationId: string,
    ): Promise<SyncResult> {
        if (op.operation === 'CREATE') {
            const manifest = await this.manifestService.create(
                { ...op.payload, sync_id: op.sync_id, offline_created: true },
                userId,
                organizationId,
                userRole,           // M5 FIX: pass actual role
            );
            return {
                sync_id: op.sync_id,
                status: 'COMPLETED',
                server_id: manifest.id,
            };
        }
        return { sync_id: op.sync_id, status: 'FAILED', error: 'Unsupported operation' };
    }
}
