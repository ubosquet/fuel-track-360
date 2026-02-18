// ============================================
// Manifest Types
// ============================================

export type ManifestStatus =
    | 'CREATED'
    | 'LOADING'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'DISCHARGING'
    | 'COMPLETED'
    | 'FLAGGED';

export type ProductType = 'DIESEL' | 'GASOLINE_91' | 'GASOLINE_95' | 'KEROSENE';

export interface Manifest {
    id: string;
    organization_id: string;
    manifest_number: string;
    s2l_id: string;
    truck_id: string;
    driver_id: string;
    origin_station_id: string;
    dest_station_id: string;
    product_type: ProductType;
    volume_loaded_liters?: number;
    volume_discharged_liters?: number;
    volume_variance_pct?: number;
    status: ManifestStatus;
    loaded_at?: string;
    departed_at?: string;
    arrived_at?: string;
    discharged_at?: string;
    offline_created: boolean;
    sync_id?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateManifestRequest {
    s2l_id: string;
    truck_id: string;
    origin_station_id: string;
    dest_station_id: string;
    product_type: ProductType;
    volume_loaded_liters?: number;
    sync_id?: string;
    offline_created?: boolean;
}

export interface UpdateManifestRequest {
    status?: ManifestStatus;
    volume_loaded_liters?: number;
    volume_discharged_liters?: number;
}

/** Maximum acceptable volume variance percentage before flagging */
export const MANIFEST_MAX_VARIANCE_PCT = 2.0;
