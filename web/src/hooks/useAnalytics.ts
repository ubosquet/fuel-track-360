import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgOverview {
    period: { from: string; to: string };
    total_manifests: number;
    completed: number;
    flagged: number;
    cancelled: number;
    completion_rate_pct: number;
    on_time_rate_pct: number;
    avg_transit_time_minutes: number;
    avg_volume_variance_pct: number;
    total_volume_loaded_liters: number;
    total_volume_discharged_liters: number;
}

export interface DriverStats {
    driver_id: string;
    driver_name: string;
    total_deliveries: number;
    completed: number;
    flagged: number;
    on_time: number;
    on_time_rate_pct: number;
    completion_rate_pct: number;
    precision_rate_pct: number;
    avg_transit_time_minutes: number;
    avg_volume_variance_pct: number;
    score: number;
    rank?: number;
}

export interface LeaderboardEntry {
    rank: number;
    label: string;
    score: number;
    on_time_rate_pct: number;
    total_deliveries: number;
    is_self: boolean;
}

export interface StationStats {
    station_id: string;
    station_name: string;
    station_code: string;
    zone: string;
    departures: number;
    arrivals: number;
    avg_transit_time_minutes: number;
    flagged_arrivals: number;
    avg_volume_variance_pct: number;
}

export interface TruckStats {
    truck_id: string;
    plate_number: string;
    total_manifests: number;
    completed: number;
    flagged: number;
    avg_volume_variance_pct: number;
}

export interface MyPerformance {
    stats: DriverStats;
    rank: number;
    total_drivers: number;
    prev_period_score: number | null;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const analyticsKeys = {
    all: ['analytics'] as const,
    overview: (p?: { from?: string; to?: string }) => [...analyticsKeys.all, 'overview', p] as const,
    drivers: (p?: { from?: string; to?: string }) => [...analyticsKeys.all, 'drivers', p] as const,
    leaderboard: (p?: { from?: string; to?: string }) => [...analyticsKeys.all, 'leaderboard', p] as const,
    stations: (p?: { from?: string; to?: string }) => [...analyticsKeys.all, 'stations', p] as const,
    trucks: (p?: { from?: string; to?: string }) => [...analyticsKeys.all, 'trucks', p] as const,
    me: (p?: { from?: string; to?: string }) => [...analyticsKeys.all, 'me', p] as const,
};

function buildQS(from?: string, to?: string): string {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAnalyticsOverview(from?: string, to?: string) {
    return useQuery({
        queryKey: analyticsKeys.overview({ from, to }),
        queryFn: async (): Promise<OrgOverview> => {
            const res: any = await api.get(`/analytics/overview${buildQS(from, to)}`);
            return res?.data ?? res;
        },
        staleTime: 60_000,
    });
}

export function useDriverAnalytics(from?: string, to?: string) {
    return useQuery({
        queryKey: analyticsKeys.drivers({ from, to }),
        queryFn: async (): Promise<DriverStats[]> => {
            const res: any = await api.get(`/analytics/drivers${buildQS(from, to)}`);
            return res?.data ?? res ?? [];
        },
        staleTime: 60_000,
    });
}

export function useDriverLeaderboard(from?: string, to?: string) {
    return useQuery({
        queryKey: analyticsKeys.leaderboard({ from, to }),
        queryFn: async (): Promise<LeaderboardEntry[]> => {
            const res: any = await api.get(`/analytics/drivers/leaderboard${buildQS(from, to)}`);
            return res?.data ?? res ?? [];
        },
        staleTime: 60_000,
    });
}

export function useStationAnalytics(from?: string, to?: string) {
    return useQuery({
        queryKey: analyticsKeys.stations({ from, to }),
        queryFn: async (): Promise<StationStats[]> => {
            const res: any = await api.get(`/analytics/stations${buildQS(from, to)}`);
            return res?.data ?? res ?? [];
        },
        staleTime: 60_000,
    });
}

export function useTruckAnalytics(from?: string, to?: string) {
    return useQuery({
        queryKey: analyticsKeys.trucks({ from, to }),
        queryFn: async (): Promise<TruckStats[]> => {
            const res: any = await api.get(`/analytics/trucks${buildQS(from, to)}`);
            return res?.data ?? res ?? [];
        },
        staleTime: 60_000,
    });
}

export function useMyPerformance(from?: string, to?: string) {
    return useQuery({
        queryKey: analyticsKeys.me({ from, to }),
        queryFn: async (): Promise<MyPerformance> => {
            const res: any = await api.get(`/analytics/drivers/me${buildQS(from, to)}`);
            return res?.data ?? res;
        },
        staleTime: 60_000,
    });
}
