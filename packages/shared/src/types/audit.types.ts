// ============================================
// Audit Types
// ============================================

export type AuditEntityType =
    | 's2l'
    | 'manifest'
    | 'truck'
    | 'station'
    | 'user'
    | 'organization'
    | 'geofence';

export type AuditEventType =
    // S2L events
    | 'S2L_CREATED'
    | 'S2L_UPDATED'
    | 'S2L_SUBMITTED'
    | 'S2L_APPROVED'
    | 'S2L_REJECTED'
    | 'S2L_EXPIRED'
    | 'S2L_PHOTO_UPLOADED'
    // Manifest events
    | 'MANIFEST_CREATED'
    | 'MANIFEST_LOADING'
    | 'MANIFEST_IN_TRANSIT'
    | 'MANIFEST_ARRIVED'
    | 'MANIFEST_DISCHARGING'
    | 'MANIFEST_COMPLETED'
    | 'MANIFEST_FLAGGED'
    // Fleet events
    | 'TRUCK_STATUS_CHANGED'
    | 'TRUCK_ASSIGNED_DRIVER'
    | 'GEOFENCE_VIOLATION'
    | 'GEOFENCE_ENTERED'
    | 'GEOFENCE_EXITED'
    // User events
    | 'USER_LOGIN'
    | 'USER_LOGOUT'
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DEACTIVATED'
    // Sync events
    | 'SYNC_BATCH_RECEIVED'
    | 'SYNC_CONFLICT_RESOLVED'
    | 'SYNC_FAILED';

export interface AuditEvent {
    id: string;
    organization_id: string;
    entity_type: AuditEntityType;
    entity_id: string;
    event_type: AuditEventType;
    actor_id: string;
    actor_role: string;
    payload: Record<string, unknown>;
    gps_lat?: number;
    gps_lng?: number;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface CreateAuditEventRequest {
    entity_type: AuditEntityType;
    entity_id: string;
    event_type: AuditEventType;
    payload: Record<string, unknown>;
    gps_lat?: number;
    gps_lng?: number;
}

export interface AuditQueryParams {
    entity_type?: AuditEntityType;
    entity_id?: string;
    event_type?: AuditEventType;
    actor_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}
