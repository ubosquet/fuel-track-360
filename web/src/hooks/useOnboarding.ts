import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OrgInfo {
    organization_id: string;
    org_name: string;
    logo_url: string | null;
    allowed_roles: string[] | null;
    invite_id: string;
}

export interface MemberRequest {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    job_title: string | null;
    role_requested: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: string;
    rejection_reason: string | null;
}

export interface InviteData {
    invite: { id: string; allowed_roles: string[] | null; join_count: number; expires_at: string | null } | null;
    url: string | null;
    qr_data_url: string | null;
}

// ─── Query keys ─────────────────────────────────────────────────────────────

export const onboardingKeys = {
    invite: () => ['onboarding', 'invite'] as const,
    requests: () => ['onboarding', 'requests'] as const,
    resolve: (t: string) => ['onboarding', 'resolve', t] as const,
};

// ─── Public hooks (no auth) ─────────────────────────────────────────────────

export function useResolveInvite(token: string) {
    return useQuery({
        queryKey: onboardingKeys.resolve(token),
        queryFn: async (): Promise<OrgInfo> => {
            const res: any = await api.get(`/onboarding/invite/${token}`);
            return res?.data ?? res;
        },
        enabled: !!token,
        retry: false,
    });
}

export function useJoinOrg() {
    return useMutation({
        mutationFn: async (data: {
            invite_token: string;
            full_name: string;
            email: string;
            phone?: string;
            job_title?: string;
            role_requested: string;
        }) => {
            const res: any = await api.post('/onboarding/join', data);
            return res?.data ?? res;
        },
    });
}

// ─── Protected hooks (admin) ────────────────────────────────────────────────

export function useInviteData() {
    return useQuery({
        queryKey: onboardingKeys.invite(),
        queryFn: async (): Promise<InviteData> => {
            const res: any = await api.get('/onboarding/invite');
            return res?.data ?? res;
        },
    });
}

export function useGenerateInvite() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data?: { allowed_roles?: string[]; expires_at?: string }) => {
            const res: any = await api.post('/onboarding/invite', data ?? {});
            return res?.data ?? res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.invite() }),
    });
}

export function useRevokeInvite() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => api.delete('/onboarding/invite'),
        onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.invite() }),
    });
}

export function useMemberRequests() {
    return useQuery({
        queryKey: onboardingKeys.requests(),
        queryFn: async (): Promise<MemberRequest[]> => {
            const res: any = await api.get('/onboarding/requests');
            return res?.data ?? res ?? [];
        },
    });
}

export function useApproveRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, override_role }: { id: string; override_role?: string }) => {
            const res: any = await api.put(`/onboarding/requests/${id}/approve`, { override_role });
            return res?.data ?? res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.requests() }),
    });
}

export function useRejectRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
            const res: any = await api.put(`/onboarding/requests/${id}/reject`, { reason });
            return res?.data ?? res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.requests() }),
    });
}

// ─── Tutorial hooks ─────────────────────────────────────────────────────────

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    route: string;
    roles: string[];
    since_date: string;
    icon?: string;
}

export interface TutorialState {
    tutorial_enabled: boolean;
    steps_to_show: TutorialStep[];
    completed_steps: string[];
    dismissed_steps: string[];
}

export const tutorialKeys = {
    state: () => ['tutorial', 'state'] as const,
};

export function useTutorialState() {
    return useQuery({
        queryKey: tutorialKeys.state(),
        queryFn: async (): Promise<TutorialState> => {
            const res: any = await api.get('/tutorial/state');
            return res?.data ?? res;
        },
        staleTime: 60 * 1000,
    });
}

export function useCompleteTutorialSteps() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (step_ids: string[]) => api.post('/tutorial/complete', { step_ids }),
        onSuccess: () => qc.invalidateQueries({ queryKey: tutorialKeys.state() }),
    });
}

export function useDismissTutorialStep() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (step_id: string) => api.post('/tutorial/dismiss', { step_id }),
        onSuccess: () => qc.invalidateQueries({ queryKey: tutorialKeys.state() }),
    });
}

export function useToggleTutorial() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (enabled: boolean) => api.put('/tutorial/toggle', { enabled }),
        onSuccess: () => qc.invalidateQueries({ queryKey: tutorialKeys.state() }),
    });
}
