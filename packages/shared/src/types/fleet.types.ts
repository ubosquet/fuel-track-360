// ============================================
// Fleet & GPS Types
// ============================================

export type TruckStatus =
    | 'IDLE'
    | 'EN_ROUTE_TO_TERMINAL'
    | 'AT_TERMINAL'
    | 'LOADING'
    | 'EN_ROUTE_TO_STATION'
    | 'AT_STATION'
    | 'DISCHARGING'
    | 'MAINTENANCE';

export type GeofenceType = 'CIRCLE' | 'POLYGON';

export type StationType = 'TERMINAL' | 'STATION';

export type Zone = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export interface Truck {
    id: string;
    organization_id: string;
    plate_number: string;
    capacity_liters: number;
    compartments: number;
    driver_id?: string;
    status: TruckStatus;
    current_lat?: number;
    current_lng?: number;
    last_gps_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Station {
    id: string;
    organization_id: string;
    name: string;
    code: string;
    type: StationType;
    zone: Zone;
    address?: string;
    gps_lat: number;
    gps_lng: number;
    geofence_radius_m: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface GpsLog {
    id: string;
    truck_id: string;
    lat: number;
    lng: number;
    speed_kmh?: number;
    heading?: number;
    accuracy_m?: number;
    altitude_m?: number;
    recorded_at: string;
    synced_at?: string;
    created_at: string;
}

export interface Geofence {
    id: string;
    station_id: string;
    name: string;
    center_lat: number;
    center_lng: number;
    radius_m: number;
    geofence_type: GeofenceType;
    polygon_coords?: { lat: number; lng: number }[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface GpsPosition {
    lat: number;
    lng: number;
    accuracy_m?: number;
    altitude_m?: number;
    speed_kmh?: number;
    heading?: number;
    timestamp: string;
}

export interface GeofenceCheckResult {
    is_within: boolean;
    distance_m: number;
    station_id: string;
    station_name: string;
    geofence_radius_m: number;
}

export interface CreateGpsLogRequest {
    truck_id: string;
    lat: number;
    lng: number;
    speed_kmh?: number;
    heading?: number;
    accuracy_m?: number;
    altitude_m?: number;
    recorded_at: string;
}

export interface FleetStatusResponse {
    truck_id: string;
    plate_number: string;
    status: TruckStatus;
    driver_name?: string;
    current_lat?: number;
    current_lng?: number;
    last_gps_at?: string;
    current_station?: string;
    is_within_geofence?: boolean;
}

/** Default geofence radius in meters */
export const DEFAULT_GEOFENCE_RADIUS_M = 500;

/** GPS logging interval in seconds */
export const GPS_LOG_INTERVAL_SECONDS = 30;

/** GPS batch upload size */
export const GPS_BATCH_SIZE = 100;
