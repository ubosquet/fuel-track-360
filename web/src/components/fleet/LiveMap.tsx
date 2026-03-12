import React, { useMemo } from 'react';
import { TruckStatus } from '@/hooks/useFleet';
import { Station } from '@/hooks/useStations';
import { useFleetLive } from '@/hooks/useFleetLive';

interface LiveMapProps {
    initialTrucks: TruckStatus[]; // This prop is likely used to initialize the live fleet hook
    stations: Station[];
    selectedTruck: string | null;
    onSelectTruck: (id: string | null) => void;
}

const statusColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    EN_ROUTE: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    LOADING: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    DISCHARGING: { bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
    IDLE: { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' },
    MAINTENANCE: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

function getStatusColor(status: string) {
    return statusColors[status] || statusColors.IDLE;
}

// Define map bounds for Haiti (example)
const mapBounds = {
    minLat: 18.4,
    maxLat: 18.7,
    minLng: -72.5,
    maxLng: -72.2,
};

// Helper function to normalize GPS coordinates to a percentage within the map bounds
function getMapCoordinate(value: number, min: number, max: number): number {
    return ((value - min) / (max - min)) * 100;
}

export function LiveMap({ initialTrucks, stations, selectedTruck, onSelectTruck }: LiveMapProps) {
    const { liveTrucks } = useFleetLive(initialTrucks);

    return (
        <div className="xl:col-span-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden" style={{ height: '600px' }}>
            <div className="relative w-full h-full bg-gradient-to-br from-[#1a365d]/5 to-[#0d47a1]/10 flex items-center justify-center">
                {/* Fallback Map Grid Background */}
                <div className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />

                <div className="absolute inset-0 m-8 border-2 border-dashed border-[var(--border)] rounded-2xl relative">
                    {/* Map Coordinate Labels */}
                    <div className="absolute -top-6 left-0 text-xs text-[var(--text-muted)] font-mono">{mapBounds.maxLat}°N</div>
                    <div className="absolute -bottom-6 left-0 text-xs text-[var(--text-muted)] font-mono">{mapBounds.minLat}°N</div>
                    <div className="absolute -left-12 top-0 text-xs text-[var(--text-muted)] font-mono">{mapBounds.minLng}°W</div>
                    <div className="absolute -right-12 top-0 text-xs text-[var(--text-muted)] font-mono">{mapBounds.maxLng}°W</div>

                    {/* Station Markers */}
                    {stations.map((station) => (
                        <div
                            key={station.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-0"
                            style={{
                                left: `${getMapCoordinate(station.gps_lng, mapBounds.minLng, mapBounds.maxLng)}%`,
                                top: `${getMapCoordinate(station.gps_lat, mapBounds.maxLat, mapBounds.minLat)}%`,
                            }}
                        >
                            <div className="relative group cursor-pointer">
                                <div className="w-6 h-6 rounded-md bg-[var(--surface)] border-2 border-blue-500/50 flex items-center justify-center shadow-sm">
                                    <span className="text-[10px]">🏢</span>
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-max px-2 py-1 bg-gray-900 text-white text-[10px] rounded shadow-lg z-30">
                                    {station.name}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Truck Markers */}
                    {liveTrucks.map((truck: TruckStatus) => {
                        const sc = getStatusColor(truck.status);
                        
                        // Normalize positions to container (Demo Haiti Bounds)
                        const top = truck.current_lat 
                            ? `${100 - ((truck.current_lat - 18.4) / 0.3) * 100}%` 
                            : '50%';
                        const left = truck.current_lng 
                            ? `${((truck.current_lng + 72.5) / 0.4) * 100}%` 
                            : '50%';
                            
                        const isSelected = selectedTruck === truck.id;

                        return (
                            <div
                                key={truck.id}
                                onClick={() => onSelectTruck(isSelected ? null : truck.id)}
                                className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 cursor-pointer transition-all duration-700 ease-in-out z-10 
                                  ${isSelected ? 'border-[var(--primary)] scale-125 z-20 shadow-lg shadow-[var(--primary)]/20' : 'border-[var(--border)] bg-[var(--surface)] hover:scale-110'}
                                `}
                                style={{ top, left }}
                            >
                                <div className="w-full h-full flex items-center justify-center bg-[var(--surface)] rounded-full">
                                    <span className={`w-2.5 h-2.5 rounded-full ${sc.dot} ${truck.status === 'EN_ROUTE' ? 'animate-ping' : ''}`} />
                                </div>
                                
                                {/* Tooltip */}
                                {isSelected && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[var(--surface)] border border-[var(--border)] p-2 rounded-lg shadow-xl w-32 z-30 animate-fade-in pointer-events-none">
                                        <p className="text-xs font-bold text-[var(--text-primary)] text-center">{truck.plate_number}</p>
                                        <p className={`text-[10px] text-center mt-1 font-semibold ${sc.text}`}>{truck.status.replace('_', ' ')}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                        {/* Map Label */}
                        <div className="absolute bottom-4 left-4 bg-[var(--surface)]/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-[var(--border)] pointer-events-none">
                            <p className="text-xs font-medium text-[var(--text-secondary)]">🗺️ Port-au-Prince Metropolitan Area</p>
                            <p className="text-[10px] text-[var(--text-muted)]">Live Fleet Tracker</p>
                        </div>
                    </div>
                </div>
            </div>
    );
}
