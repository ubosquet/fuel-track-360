import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Manifest } from '@/types/manifest';

// ═══════════════════════════════════════════════════════════
// Query Keys
// ═══════════════════════════════════════════════════════════

export const manifestKeys = {
    all: ['manifests'] as const,
    lists: () => [...manifestKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...manifestKeys.lists(), filters] as const,
    details: () => [...manifestKeys.all, 'detail'] as const,
    detail: (id: string) => [...manifestKeys.details(), id] as const,
};

// ═══════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════

/** Fetch paginated manifests for the organization */
export function useManifestList(params?: { status?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: manifestKeys.list(params ?? {}),
        queryFn: async (): Promise<Manifest[]> => {
            const searchParams = new URLSearchParams();
            if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
            if (params?.page) searchParams.set('page', String(params.page));
            if (params?.limit) searchParams.set('limit', String(params.limit));

            const qs = searchParams.toString();
            const res: any = await api.get(`/manifests${qs ? `?${qs}` : ''}`);
            // API wraps in { success, data } or returns array directly
            return res?.data ?? res ?? [];
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
}

/** Fetch a single manifest by ID */
export function useManifestDetail(id: string | null) {
    return useQuery({
        queryKey: manifestKeys.detail(id ?? ''),
        queryFn: async (): Promise<Manifest> => {
            const res: any = await api.get(`/manifests/${id}`);
            return res?.data ?? res;
        },
        enabled: !!id,
    });
}
