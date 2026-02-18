import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User, Organization, Station } from '@/types/organization';

// ═══════════════════════════════════════════════════════════
// Query Keys
// ═══════════════════════════════════════════════════════════

export const orgKeys = {
    users: (filters?: Record<string, unknown>) => ['users', filters ?? {}] as const,
    user: (id: string) => ['users', 'detail', id] as const,
    organization: () => ['organization', 'current'] as const,
    stations: () => ['stations'] as const,
    station: (id: string) => ['stations', 'detail', id] as const,
};

// ═══════════════════════════════════════════════════════════
// User Hooks
// ═══════════════════════════════════════════════════════════

export function useUserList(filters?: { role?: string; active?: string }) {
    return useQuery({
        queryKey: orgKeys.users(filters),
        queryFn: async (): Promise<User[]> => {
            const params = new URLSearchParams();
            if (filters?.role) params.set('role', filters.role);
            if (filters?.active) params.set('active', filters.active);
            const qs = params.toString();
            const res: any = await api.get(`/auth/users${qs ? `?${qs}` : ''}`);
            return res?.data ?? res ?? [];
        },
        staleTime: 30_000,
    });
}

export function useUpdateUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<User>) => {
            const res: any = await api.put(`/auth/users/${id}`, updates);
            return res?.data ?? res;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// ═══════════════════════════════════════════════════════════
// Organization Hooks
// ═══════════════════════════════════════════════════════════

export function useOrganization() {
    return useQuery({
        queryKey: orgKeys.organization(),
        queryFn: async (): Promise<Organization> => {
            const res: any = await api.get('/organizations/current');
            return res?.data ?? res;
        },
        staleTime: 60_000,
    });
}

export function useUpdateOrganization() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (updates: Partial<Organization>) => {
            const res: any = await api.put('/organizations/current', updates);
            return res?.data ?? res;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: orgKeys.organization() });
        },
    });
}

// ═══════════════════════════════════════════════════════════
// Station Hooks
// ═══════════════════════════════════════════════════════════

export function useStationList() {
    return useQuery({
        queryKey: orgKeys.stations(),
        queryFn: async (): Promise<Station[]> => {
            const res: any = await api.get('/organizations/stations');
            return res?.data ?? res ?? [];
        },
        staleTime: 60_000,
    });
}

export function useUpdateStation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<Station>) => {
            const res: any = await api.put(`/organizations/stations/${id}`, updates);
            return res?.data ?? res;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: orgKeys.stations() });
        },
    });
}
