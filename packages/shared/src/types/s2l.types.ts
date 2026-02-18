// ============================================
// S2L (Safe to Load) Types
// ============================================

export type S2LStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type S2LPhotoType = 'FRONT' | 'REAR' | 'COMPARTMENT' | 'SAFETY_EQUIPMENT' | 'OTHER';

export interface S2LChecklistItem {
    item_id: string;
    label: string;
    label_fr: string;
    label_ht: string;
    value: boolean;
    note?: string;
    category: S2LChecklistCategory;
    order: number;
}

export type S2LChecklistCategory =
    | 'VEHICLE_CONDITION'
    | 'SAFETY_EQUIPMENT'
    | 'DOCUMENTATION'
    | 'DRIVER_READINESS'
    | 'LOADING_PREPARATION';

export interface S2LChecklist {
    id: string;
    organization_id: string;
    truck_id: string;
    driver_id: string;
    station_id: string;
    status: S2LStatus;
    checklist_data: S2LChecklistItem[];
    all_items_pass: boolean;
    signature_url?: string;
    submitted_at?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
    gps_lat?: number;
    gps_lng?: number;
    is_within_geofence?: boolean | null;
    offline_created: boolean;
    sync_id?: string;
    created_at: string;
    updated_at: string;
}

export interface S2LPhoto {
    id: string;
    s2l_id: string;
    photo_type: S2LPhotoType;
    storage_path: string;
    file_size_bytes?: number;
    gps_lat?: number;
    gps_lng?: number;
    captured_at: string;
    uploaded_at?: string;
    created_at: string;
}

export interface CreateS2LRequest {
    truck_id: string;
    station_id: string;
    checklist_data: S2LChecklistItem[];
    gps_lat?: number;
    gps_lng?: number;
    sync_id?: string;
    offline_created?: boolean;
}

export interface UpdateS2LRequest {
    status?: S2LStatus;
    checklist_data?: S2LChecklistItem[];
    signature_url?: string;
    review_notes?: string;
    gps_lat?: number;
    gps_lng?: number;
}

export interface S2LReviewRequest {
    status: 'APPROVED' | 'REJECTED';
    review_notes?: string;
}

/** Minimum photos required for S2L submission */
export const S2L_MIN_PHOTOS = 3;

/** S2L expiration time in hours */
export const S2L_EXPIRY_HOURS = 24;

/** Maximum photo file size in bytes (500KB) */
export const S2L_MAX_PHOTO_SIZE_BYTES = 500 * 1024;
