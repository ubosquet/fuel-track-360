import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

export type RootCause =
    | 'DRIVER_ERROR'
    | 'EQUIPMENT_FAULT'
    | 'MEASUREMENT_ERROR'
    | 'ROUTE_RELATED'
    | 'UNKNOWN';

export type RecommendedAction =
    | 'FLAG_FOR_REVIEW'
    | 'EQUIPMENT_CHECK'
    | 'RECOUNT'
    | 'MONITOR'
    | 'ESCALATE';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ManifestAnalysisResult {
    root_cause_probability: RootCause;
    confidence: number;
    explanation: string;
    recommended_action: RecommendedAction;
    similar_incidents: number;
    key_factors: string[];
}

export interface DriverCoachResult {
    strengths: string[];
    improvement_areas: string[];
    weekly_goal: string;
    motivational_message: string;
    score_breakdown: { on_time: string; precision: string; completion: string };
}

export interface S2LPatternResult {
    patterns: Array<{
        pattern_type: string;
        frequency: number;
        affected_drivers: string[];
        affected_sites: string[];
        recommendation: string;
    }>;
    overall_risk: RiskLevel;
    summary: string;
    top_finding: string;
}

// ─── Support token types ───────────────────────────────────────────────────

export interface SupportToken {
    id: string;
    ticket_ref: string;
    created_by_name: string;
    expires_at: string;
    redeemed_at: string | null;
    redeemed_by_email: string | null;
    is_revoked: boolean;
    created_at: string;
}

// ─── AI Query Keys ─────────────────────────────────────────────────────────

export const aiKeys = {
    manifest: (id: string) => ['ai', 'manifest', id] as const,
    coach: () => ['ai', 'coach'] as const,
    s2l: () => ['ai', 's2l'] as const,
};

// ─── AI Hooks ──────────────────────────────────────────────────────────────

export function useManifestAnalysis(manifestId: string, enabled = false) {
    return useMutation({
        mutationFn: async (): Promise<ManifestAnalysisResult> => {
            const res: any = await api.post(`/ai/manifest/${manifestId}/analyze`);
            return res?.data ?? res;
        },
    });
}

export function useDriverCoach() {
    return useQuery({
        queryKey: aiKeys.coach(),
        queryFn: async (): Promise<DriverCoachResult> => {
            const res: any = await api.get('/ai/driver/me/coach');
            return res?.data ?? res;
        },
        staleTime: 5 * 60 * 1000, // 5 min — coaching tips don't change that fast
        retry: false,              // Don't spam Gemini on error
    });
}

export function useS2LPatternScan() {
    return useMutation({
        mutationFn: async (): Promise<S2LPatternResult> => {
            const res: any = await api.post('/ai/s2l/pattern-scan');
            return res?.data ?? res;
        },
    });
}

// ─── Support token hooks ────────────────────────────────────────────────────

export const supportKeys = {
    tokens: () => ['support', 'tokens'] as const,
};

export function useSupportTokens() {
    return useQuery({
        queryKey: supportKeys.tokens(),
        queryFn: async (): Promise<SupportToken[]> => {
            const res: any = await api.get('/support/tokens');
            return res?.data ?? res ?? [];
        },
    });
}

export function useCreateSupportToken() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (ticketRef: string) => {
            const res: any = await api.post('/support/tokens', { ticket_ref: ticketRef });
            return res?.data ?? res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.tokens() }),
    });
}

export function useRevokeSupportToken() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => api.delete(`/support/tokens/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.tokens() }),
    });
}
