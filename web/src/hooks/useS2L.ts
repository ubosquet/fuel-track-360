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
// Dashboard Stats Hook — uses dedicated aggregate endpoint
// ═══════════════════════════════════════════════════════════

/** Fetch pre-aggregated S2L status counts — much lighter than fetching full records */
export function useS2LStats() {
    return useQuery({
        queryKey: [...s2lKeys.all, 'stats'] as const,
        queryFn: async (): Promise<{
            total: number;
            draft: number;
            submitted: number;
            approved: number;
            rejected: number;
            expired: number;
        }> => {
            const res: any = await api.get('/s2l/stats');
            return res?.data ?? res;
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
}

export function useDashboardStats() {
    const { data: countsRaw, isLoading: statsLoading, error: statsError } = useS2LStats();
    const { data: s2ls, isLoading: listLoading, error: listError } = useS2LList({ limit: 5 });

    const counts = countsRaw ?? { total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0, expired: 0 };

    const stats = {
        activeS2L: counts.draft + counts.submitted,
        submitted: counts.submitted,
        approved: counts.approved,
        rejected: counts.rejected,
        total: counts.total,
        recentS2Ls: s2ls ?? [],
    };

    return {
        stats,
        isLoading: statsLoading || listLoading,
        error: statsError || listError,
    };
}
