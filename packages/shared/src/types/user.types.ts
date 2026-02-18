// ============================================
// User Types
// ============================================

export type UserRole = 'DRIVER' | 'DISPATCHER' | 'SUPERVISOR' | 'FINANCE' | 'ADMIN' | 'OWNER';

export type PreferredLanguage = 'fr' | 'en' | 'ht';

export interface User {
    id: string;
    organization_id: string;
    firebase_uid: string;
    email?: string;
    phone?: string;
    full_name: string;
    role: UserRole;
    preferred_lang: PreferredLanguage;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
    updated_at: string;
}

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

export interface CreateUserRequest {
    email?: string;
    phone?: string;
    full_name: string;
    role: UserRole;
    preferred_lang?: PreferredLanguage;
}

export interface UpdateUserRequest {
    full_name?: string;
    role?: UserRole;
    preferred_lang?: PreferredLanguage;
    is_active?: boolean;
}

export interface AuthTokenPayload {
    uid: string;
    email?: string;
    phone_number?: string;
    role: UserRole;
    organization_id: string;
    user_id: string;
}

/** Roles that require MFA */
export const MFA_REQUIRED_ROLES: UserRole[] = ['FINANCE', 'ADMIN', 'OWNER'];

/** Roles that can approve S2L checklists */
export const S2L_APPROVAL_ROLES: UserRole[] = ['SUPERVISOR', 'ADMIN', 'OWNER'];

/** Roles that can create manifests */
export const MANIFEST_CREATION_ROLES: UserRole[] = ['DISPATCHER', 'SUPERVISOR', 'ADMIN', 'OWNER'];

/** Role hierarchy (higher index = more permissions) */
export const ROLE_HIERARCHY: UserRole[] = [
    'DRIVER',
    'DISPATCHER',
    'SUPERVISOR',
    'FINANCE',
    'ADMIN',
    'OWNER',
];
