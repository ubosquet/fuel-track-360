// ── User Types ──

export type UserRole = 'DRIVER' | 'DISPATCHER' | 'SUPERVISOR' | 'FINANCE' | 'ADMIN' | 'OWNER';

export interface User {
    id: string;
    organization_id: string;
    firebase_uid: string;
    email: string | null;
    phone: string | null;
    full_name: string;
    role: UserRole;
    preferred_lang: 'fr' | 'en' | 'ht';
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    organization?: {
        id: string;
        name: string;
        code: string;
    };
}

// ── Organization Types ──

export interface Organization {
    id: string;
    name: string;
    code: string;
    country: string;
    currency: string;
    timezone: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Station {
    id: string;
    organization_id: string;
    name: string;
    code: string;
    type: 'TERMINAL' | 'STATION';
    zone: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
    address: string | null;
    gps_lat: number;
    gps_lng: number;
    geofence_radius_m: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
