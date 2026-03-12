import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Station {
    id: string;
    organization_id: string;
    name: string;
    type: string;
    gps_lat: number;
    gps_lng: number;
    geofence_radius_m: number;
    is_active: boolean;
}

export const stationKeys = {
    all: ['stations'] as const,
    list: (type?: string) => [...stationKeys.all, type ?? 'all'] as const,
};

// Helper function to fetch stations
const getStations = async (type?: string): Promise<Station[]> => {
    const params = type ? { type } : {};
    const res: any = await api.get('/organizations/stations', { params });
    return res?.data ?? res ?? [];
};

/**
 * Fetch all active stations for the current organization
 */
export function useStations(options: { type?: string } = {}) {
    const { type, ...restOptions } = options;
    return useQuery<Station[], Error>({
        queryKey: stationKeys.list(type),
        queryFn: () => getStations(type),
        staleTime: 24 * 60 * 60 * 1000, // 24 hours - Stations rarely change
        ...restOptions,
    });
}
