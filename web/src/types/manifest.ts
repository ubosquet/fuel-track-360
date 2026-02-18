// ── Manifest Types ──

export type ManifestStatus =
    | 'CREATED'
    | 'LOADING'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'DISCHARGING'
    | 'COMPLETED'
    | 'FLAGGED'
    | 'CANCELLED';

export type ProductType =
    | 'DIESEL'
    | 'GASOLINE_91'
    | 'GASOLINE_95'
    | 'KEROSENE';

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
    volume_loaded_liters: number | null;
    volume_discharged_liters: number | null;
    volume_variance_pct: number | null;
    status: ManifestStatus;
    loaded_at: string | null;
    departed_at: string | null;
    arrived_at: string | null;
    discharged_at: string | null;
    offline_created: boolean;
    sync_id: string | null;
    created_at: string;
    updated_at: string;
    // Joined relations
    truck?: { plate_number: string };
    driver?: { full_name: string };
    origin_station?: { name: string };
    dest_station?: { name: string };
    s2l?: { id: string; status: string };
}

export interface ManifestListResponse {
    success: boolean;
    data: Manifest[];
    total: number;
}
