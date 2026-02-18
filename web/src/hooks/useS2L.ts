import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { S2LChecklist, S2LListResponse, S2LSingleResponse } from '@/types/s2l';

// ═══════════════════════════════════════════════════════════
// Query Keys — centralized for easy invalidation
// ═══════════════════════════════════════════════════════════

export const s2lKeys = {
    all: ['s2l'] as const,
    lists: () => [...s2lKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...s2lKeys.lists(), filters] as const,
    details: () => [...s2lKeys.all, 'detail'] as const,
    detail: (id: string) => [...s2lKeys.details(), id] as const,
    photos: (id: string) => [...s2lKeys.all, 'photos', id] as const,
    myS2Ls: () => [...s2lKeys.all, 'my'] as const,
};

// ═══════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════

/** Fetch paginated S2L checklists for the organization */
export function useS2LList(params?: { status?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: s2lKeys.list(params ?? {}),
        queryFn: async (): Promise<S2LChecklist[]> => {
            const searchParams = new URLSearchParams();
            if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
            if (params?.page) searchParams.set('page', String(params.page));
            if (params?.limit) searchParams.set('limit', String(params.limit));

            const qs = searchParams.toString();
            const res: any = await api.get(`/s2l${qs ? `?${qs}` : ''}`);
            // API wraps in { success, data } via TransformInterceptor
            return res?.data ?? res ?? [];
        },
        staleTime: 30_000, // 30s — S2L data doesn't change rapidly
        refetchInterval: 60_000, // Refresh every 60s
    });
}

/** Fetch a single S2L checklist by ID */
export function useS2LDetail(id: string | null) {
    return useQuery({
        queryKey: s2lKeys.detail(id ?? ''),
        queryFn: async (): Promise<S2LChecklist> => {
            const res: any = await api.get(`/s2l/${id}`);
            return res?.data ?? res;
        },
        enabled: !!id,
    });
}

/** Fetch photos for a specific S2L checklist */
export function useS2LPhotos(id: string | null) {
    return useQuery({
        queryKey: s2lKeys.photos(id ?? ''),
        queryFn: async () => {
            const res: any = await api.get(`/s2l/${id}/photos`);
            return res?.data ?? res ?? [];
        },
        enabled: !!id,
    });
}

/** Fetch S2Ls assigned to the current driver */
export function useMyS2Ls() {
    return useQuery({
        queryKey: s2lKeys.myS2Ls(),
        queryFn: async (): Promise<S2LChecklist[]> => {
            const res: any = await api.get('/s2l/my');
            return res?.data ?? res ?? [];
        },
    });
}

// ═══════════════════════════════════════════════════════════
// Mutations
// ═══════════════════════════════════════════════════════════

/** Approve an S2L checklist */
export function useApproveS2L() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            return api.post(`/s2l/${id}/review`, { status: 'APPROVED' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: s2lKeys.all });
        },
    });
}

/** Reject an S2L checklist */
export function useRejectS2L() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
            return api.post(`/s2l/${id}/review`, { status: 'REJECTED', review_notes: notes });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: s2lKeys.all });
        },
    });
}

// ═══════════════════════════════════════════════════════════
// Dashboard Stats Hook
// ═══════════════════════════════════════════════════════════

export function useDashboardStats() {
    const { data: s2ls, isLoading, error } = useS2LList({ limit: 100 });

    const stats = {
        activeS2L: s2ls?.filter((s) => s.status === 'DRAFT' || s.status === 'SUBMITTED').length ?? 0,
        submitted: s2ls?.filter((s) => s.status === 'SUBMITTED').length ?? 0,
        approved: s2ls?.filter((s) => s.status === 'APPROVED').length ?? 0,
        rejected: s2ls?.filter((s) => s.status === 'REJECTED').length ?? 0,
        total: s2ls?.length ?? 0,
        recentS2Ls: s2ls?.slice(0, 5) ?? [],
    };

    return { stats, isLoading, error };
}
