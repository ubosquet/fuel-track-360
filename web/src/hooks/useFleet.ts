import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TruckStatus {
    id: string;
    plate_number: string;
    status: string;
    current_lat?: number | null;
    current_lng?: number | null;
    last_gps_at?: string | null;
}

export interface FleetStatusResponse {
    total_trucks: number;
    status_breakdown: Record<string, number>;
    trucks: TruckStatus[];
}

export interface GpsLog {
    id: string;
    truck_id: string;
    lat: number;
    lng: number;
    speed_kmh?: number;
    heading?: number;
    accuracy_m?: number;
    altitude_m?: number;
    recorded_at: string;
    synced_at: string;
}

// ── Fleet hooks ───────────────────────────────────────────────────────────────

export const fleetKeys = {
    all: ['fleet'] as const,
    status: () => [...fleetKeys.all, 'status'] as const,
    gpsHistory: (truckId: string) => [...fleetKeys.all, 'gps', truckId] as const,
};

/** Live fleet status — polled every 30s */
export function useFleetStatus() {
    return useQuery({
        queryKey: fleetKeys.status(),
        queryFn: async (): Promise<FleetStatusResponse> => {
            const res: any = await api.get('/fleet/status');
            return res?.data ?? res;
        },
        staleTime: 15_000,
        refetchInterval: 30_000,
    });
}

/** GPS history for a specific truck */
export function useTruckGpsHistory(truckId: string | null) {
    return useQuery({
        queryKey: fleetKeys.gpsHistory(truckId ?? ''),
        queryFn: async (): Promise<GpsLog[]> => {
            const res: any = await api.get(`/fleet/${truckId}/gps-history?limit=200`);
            return res?.data ?? res ?? [];
        },
        enabled: !!truckId,
        staleTime: 30_000,
    });
}
