'use client';

import { useState } from 'react';
import { useFleetStatus } from '@/hooks/useFleet';
import { useStations } from '@/hooks/useStations';
import { LiveMap } from '@/components/fleet/LiveMap';
import { formatDistanceToNow } from 'date-fns';

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

export default function FleetPage() {
    const { data: fleetData, isLoading: isLoadingFleet, isError, dataUpdatedAt } = useFleetStatus();
    const { data: stations = [], isLoading: isLoadingStations } = useStations();
    
    const [selectedTruck, setSelectedTruck] = useState<string | null>(null);

    const trucks = fleetData?.trucks || [];
    const isLoading = isLoadingFleet || isLoadingStations;

    return (
        <div className="space-y-6 max-w-[1400px]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Fleet Management</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Real-time truck tracking and geofence monitoring</p>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <span className="text-xs text-[var(--text-muted)] animate-pulse">Loading data...</span>
                    ) : isError ? (
                        <span className="text-xs text-[var(--danger)]">⚠️ Connection error</span>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                            <span className="text-xs text-[var(--text-muted)]">
                                Live {dataUpdatedAt ? `• Updated ${formatDistanceToNow(dataUpdatedAt)} ago` : ''}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                {/* Extracted Map Component */}
                {trucks.length >= 0 && (
                    <LiveMap 
                        initialTrucks={trucks} 
                        stations={stations} 
                        selectedTruck={selectedTruck} 
                        onSelectTruck={setSelectedTruck} 
                    />
                )}

                {/* Truck List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider sticky top-0 bg-[var(--background)] py-2 z-10">
                        Fleet ({trucks.length} trucks)
                    </h3>

                    {isLoading && (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-24 bg-[var(--surface)] rounded-xl border border-[var(--border)] animate-pulse" />
                        ))
                    )}

                    {!isLoading && trucks.map((truck, i) => {
                        const sc = getStatusColor(truck.status);
                        return (
                            <div
                                key={truck.id}
                                onClick={() => setSelectedTruck(truck.id)}
                                className={`bg-[var(--surface)] rounded-xl border p-4 cursor-pointer transition-all duration-200
                                  animate-fade-in hover:shadow-md
                                  ${selectedTruck === truck.id ? 'border-[var(--primary)] shadow-md ring-1 ring-[var(--primary)]/20' : 'border-[var(--border)]'}`}
                                style={{ animationDelay: `${i * 30}ms` }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🚛</span>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{truck.plate_number}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${truck.status === 'EN_ROUTE' ? 'animate-pulse' : ''}`} />
                                        {truck.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)] font-medium">
                                    <span>📡 {truck.last_gps_at ? formatDistanceToNow(new Date(truck.last_gps_at)) + ' ago' : 'No GPS data'}</span>
                                    <span>📍 {truck.current_lat?.toFixed(4) ?? '—'}, {truck.current_lng?.toFixed(4) ?? '—'}</span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Legend */}
                    {!isLoading && trucks.length > 0 && (
                        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mt-6">
                            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Status Legend</h4>
                            <div className="space-y-1.5">
                                {Object.keys(fleetData?.status_breakdown || {}).map((status) => {
                                    const sc = getStatusColor(status);
                                    const count = fleetData?.status_breakdown[status] || 0;
                                    return (
                                        <div key={status} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                                <span className="text-xs text-[var(--text-muted)]">{status.replace('_', ' ')}</span>
                                            </div>
                                            <span className="text-xs font-bold text-[var(--text-primary)]">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
