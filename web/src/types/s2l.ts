// ── S2L Types ──

export interface S2LPhoto {
    id: string;
    s2l_id: string;
    photo_type: 'FRONT' | 'REAR' | 'COMPARTMENT' | 'SAFETY_EQUIPMENT' | 'OTHER';
    storage_path: string;
    file_size_bytes?: number;
    gps_lat?: number;
    gps_lng?: number;
    captured_at: string;
    uploaded_at: string;
}

export interface S2LChecklist {
    id: string;
    organization_id: string;
    truck_id: string;
    driver_id: string;
    station_id: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    checklist_data: Record<string, boolean>;
    all_items_pass: boolean;
    photos: S2LPhoto[];
    signature_url?: string;
    submitted_at?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
    gps_lat?: number;
    gps_lng?: number;
    created_at: string;
    updated_at: string;
    sync_id?: string;
    // Joined relations
    truck?: { plate_number: string };
    driver?: { full_name: string };
    station?: { name: string };
    reviewer?: { full_name: string };
}

export type S2LStatus = S2LChecklist['status'];

export interface S2LListResponse {
    success: boolean;
    data: S2LChecklist[];
    meta?: {
        total: number;
        page: number;
        limit: number;
    };
}

export interface S2LSingleResponse {
    success: boolean;
    data: S2LChecklist;
}

// ── Dashboard Stats Types ──

export interface DashboardStats {
    activeS2L: number;
    inTransit: number;
    pendingReview: number;
    flagged: number;
}

export interface ManifestSummary {
    id: string;
    manifest_number: string;
    product_type: string;
    loaded_volume_liters: number;
    origin_name: string;
    destination_name: string;
    status: string;
    variance_percent?: number;
}
