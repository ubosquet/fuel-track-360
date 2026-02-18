// ============================================
// User Roles
// ============================================

import { UserRole } from '../types/user.types';

export const ROLES = {
    DRIVER: 'DRIVER' as UserRole,
    DISPATCHER: 'DISPATCHER' as UserRole,
    SUPERVISOR: 'SUPERVISOR' as UserRole,
    FINANCE: 'FINANCE' as UserRole,
    ADMIN: 'ADMIN' as UserRole,
    OWNER: 'OWNER' as UserRole,
} as const;

export const ALL_ROLES: UserRole[] = Object.values(ROLES);

export interface RolePermissions {
    can_create_s2l: boolean;
    can_submit_s2l: boolean;
    can_approve_s2l: boolean;
    can_create_manifest: boolean;
    can_view_fleet_map: boolean;
    can_view_audit: boolean;
    can_manage_users: boolean;
    can_manage_stations: boolean;
    can_manage_trucks: boolean;
    can_manage_geofences: boolean;
    can_view_finance: boolean;
    can_manage_organization: boolean;
    requires_mfa: boolean;
    is_gps_tracked: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
    DRIVER: {
        can_create_s2l: true,
        can_submit_s2l: true,
        can_approve_s2l: false,
        can_create_manifest: false,
        can_view_fleet_map: false,
        can_view_audit: false,
        can_manage_users: false,
        can_manage_stations: false,
        can_manage_trucks: false,
        can_manage_geofences: false,
        can_view_finance: false,
        can_manage_organization: false,
        requires_mfa: false,
        is_gps_tracked: true,
    },
    DISPATCHER: {
        can_create_s2l: true,
        can_submit_s2l: true,
        can_approve_s2l: false,
        can_create_manifest: true,
        can_view_fleet_map: true,
        can_view_audit: false,
        can_manage_users: false,
        can_manage_stations: false,
        can_manage_trucks: false,
        can_manage_geofences: false,
        can_view_finance: false,
        can_manage_organization: false,
        requires_mfa: false,
        is_gps_tracked: true,
    },
    SUPERVISOR: {
        can_create_s2l: true,
        can_submit_s2l: true,
        can_approve_s2l: true,
        can_create_manifest: true,
        can_view_fleet_map: true,
        can_view_audit: true,
        can_manage_users: false,
        can_manage_stations: false,
        can_manage_trucks: false,
        can_manage_geofences: true,
        can_view_finance: false,
        can_manage_organization: false,
        requires_mfa: false,
        is_gps_tracked: false,
    },
    FINANCE: {
        can_create_s2l: false,
        can_submit_s2l: false,
        can_approve_s2l: false,
        can_create_manifest: false,
        can_view_fleet_map: true,
        can_view_audit: true,
        can_manage_users: false,
        can_manage_stations: false,
        can_manage_trucks: false,
        can_manage_geofences: false,
        can_view_finance: true,
        can_manage_organization: false,
        requires_mfa: true,
        is_gps_tracked: false,
    },
    ADMIN: {
        can_create_s2l: true,
        can_submit_s2l: true,
        can_approve_s2l: true,
        can_create_manifest: true,
        can_view_fleet_map: true,
        can_view_audit: true,
        can_manage_users: true,
        can_manage_stations: true,
        can_manage_trucks: true,
        can_manage_geofences: true,
        can_view_finance: true,
        can_manage_organization: false,
        requires_mfa: true,
        is_gps_tracked: false,
    },
    OWNER: {
        can_create_s2l: true,
        can_submit_s2l: true,
        can_approve_s2l: true,
        can_create_manifest: true,
        can_view_fleet_map: true,
        can_view_audit: true,
        can_manage_users: true,
        can_manage_stations: true,
        can_manage_trucks: true,
        can_manage_geofences: true,
        can_view_finance: true,
        can_manage_organization: true,
        requires_mfa: true,
        is_gps_tracked: false,
    },
};
