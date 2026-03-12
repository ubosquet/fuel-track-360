import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { TruckStatus } from './useFleet';

export function useFleetLive(initialTrucks: TruckStatus[]) {
    const { user } = useAuth();
    const [liveTrucks, setLiveTrucks] = useState<TruckStatus[]>(initialTrucks);
    const socketRef = useRef<Socket | null>(null);

    // Sync state if the initial polled data changes (e.g. from react-query refetch)
    useEffect(() => {
        setLiveTrucks((prevLive) => {
            // Merge new initial data with any live updates we've received
            const mapped = initialTrucks.map(truck => {
                const liveData = prevLive.find(t => t.id === truck.id);
                // Keep the live GPS coordinates if they are newer
                if (liveData && liveData.last_gps_at && truck.last_gps_at && new Date(liveData.last_gps_at) > new Date(truck.last_gps_at)) {
                    return { ...truck, current_lat: liveData.current_lat, current_lng: liveData.current_lng, last_gps_at: liveData.last_gps_at };
                }
                return truck;
            });
            return mapped;
        });
    }, [initialTrucks]);

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const connectSocket = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                if (!token || !isMounted) return;

                const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';
                
                const socket = io(`${socketUrl}/fleet`);
                socketRef.current = socket;

                socket.on('connect', () => {
                    console.log('[FleetLive] Connected to WebSocket');
                    socket.emit('join', { token, orgId: user.organizationId });
                });

                socket.on('truck:position', (data: { truckId: string; lat: number; lng: number; source: string; ts: number }) => {
                    setLiveTrucks(prev => prev.map(truck => {
                        if (truck.id === data.truckId) {
                            return {
                                ...truck,
                                current_lat: data.lat,
                                current_lng: data.lng,
                                last_gps_at: new Date(data.ts).toISOString(),
                            };
                        }
                        return truck;
                    }));
                });

                socket.on('disconnect', () => {
                    console.log('[FleetLive] Disconnected from WebSocket');
                });

            } catch (err) {
                console.error('[FleetLive] Socket connection error', err);
            }
        };

        connectSocket();

        return () => {
            isMounted = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [user]);

    return { liveTrucks };
}
