'use client';

import { useState } from 'react';

const trucks = [
    { id: 'c1', plate: 'AA-00001', driver: 'Jean Pierre', status: 'EN_ROUTE', lat: 18.5893, lng: -72.2866, speed: 45, heading: 'N', lastUpdate: '2 min ago', fuel: 'DIESEL', capacity: 20000 },
    { id: 'c2', plate: 'AA-00002', driver: 'Marie Claire', status: 'LOADING', lat: 18.5393, lng: -72.3366, speed: 0, heading: '-', lastUpdate: '30 sec ago', fuel: 'GASOLINE', capacity: 15000 },
    { id: 'c3', plate: 'AA-00003', driver: 'Paul Estimé', status: 'IDLE', lat: 18.5100, lng: -72.3100, speed: 0, heading: '-', lastUpdate: '15 min ago', fuel: 'DIESEL', capacity: 18000 },
];

const stations = [
    { name: 'Terminal Thor', lat: 18.5393, lng: -72.3366, type: 'TERMINAL' },
    { name: 'Station Delmas', lat: 18.5450, lng: -72.3100, type: 'GAS_STATION' },
    { name: 'Terminal Nord', lat: 19.7580, lng: -72.2000, type: 'TERMINAL' },
    { name: 'Station Pétion', lat: 18.5120, lng: -72.2850, type: 'GAS_STATION' },
];

const statusColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    EN_ROUTE: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    LOADING: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    DISCHARGING: { bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
    IDLE: { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' },
    MAINTENANCE: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

export default function FleetPage() {
    const [selectedTruck, setSelectedTruck] = useState<string | null>(null);
    const selected = trucks.find((t) => t.id === selectedTruck);

    return (
        <div className="space-y-6 max-w-[1400px]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Fleet Management</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Real-time truck tracking and geofence monitoring</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="text-xs text-[var(--text-muted)]">Live • Updated 30s ago</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Map Placeholder */}
                <div className="xl:col-span-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden" style={{ height: '600px' }}>
                    <div className="relative w-full h-full bg-gradient-to-br from-[#1a365d]/5 to-[#0d47a1]/10 flex items-center justify-center">
                        {/* Static Map Visualization */}
                        <div className="absolute inset-0 p-8">
                            {/* Grid Lines */}
                            <div className="w-full h-full border border-dashed border-[var(--border)] rounded-lg relative">
                                {/* Truck Markers */}
                                {trucks.map((truck) => {
                                    const sc = statusColors[truck.status];
                                    // Normalize positions to container
                                    const top = `${100 - ((truck.lat - 18.45) / 0.2) * 100}%`;
                                    const left = `${((truck.lng + 72.4) / 0.2) * 100}%`;

                                    return (
                                        <button
                                            key={truck.id}
                                            onClick={() => setSelectedTruck(truck.id)}
                                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300
                        ${selectedTruck === truck.id ? 'scale-125 z-20' : 'z-10 hover:scale-110'}`}
                                            style={{ top, left }}
                                            title={`${truck.plate} — ${truck.driver}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full ${sc.bg} border-2 ${sc.border}
                        flex items-center justify-center shadow-lg ${truck.status === 'EN_ROUTE' ? 'animate-pulse-glow' : ''}`}>
                                                <span className="text-lg">🚛</span>
                                            </div>
                                            <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap
                        px-1.5 py-0.5 rounded text-[9px] font-bold ${sc.bg} ${sc.text}`}>
                                                {truck.plate}
                                            </div>
                                        </button>
                                    );
                                })}

                                {/* Station Markers */}
                                {stations.map((station) => {
                                    const top = `${100 - ((station.lat - 18.45) / 0.2) * 100}%`;
                                    const left = `${((station.lng + 72.4) / 0.2) * 100}%`;
                                    if (station.lat > 19) return null; // Skip out-of-view stations

                                    return (
                                        <div
                                            key={station.name}
                                            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-0"
                                            style={{ top, left }}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center">
                                                <span className="text-xs">{station.type === 'TERMINAL' ? '🏭' : '⛽'}</span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Map Label */}
                                <div className="absolute bottom-4 left-4 bg-[var(--surface)]/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-[var(--border)]">
                                    <p className="text-xs font-medium text-[var(--text-secondary)]">🗺️ Port-au-Prince Metropolitan Area</p>
                                    <p className="text-[10px] text-[var(--text-muted)]">Connect Leaflet/Mapbox for production maps</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Truck List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Fleet ({trucks.length} trucks)</h3>
                    {trucks.map((truck, i) => {
                        const sc = statusColors[truck.status];
                        return (
                            <div
                                key={truck.id}
                                onClick={() => setSelectedTruck(truck.id)}
                                className={`bg-[var(--surface)] rounded-xl border p-4 cursor-pointer transition-all duration-200
                  animate-fade-in hover:shadow-md
                  ${selectedTruck === truck.id ? 'border-[var(--primary)] shadow-md ring-1 ring-[var(--primary)]/20' : 'border-[var(--border)]'}`}
                                style={{ animationDelay: `${i * 80}ms` }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🚛</span>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{truck.plate}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{truck.driver}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${truck.status === 'EN_ROUTE' ? 'animate-pulse' : ''}`} />
                                        {truck.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                                    <span>⚡ {truck.speed} km/h</span>
                                    <span>📡 {truck.lastUpdate}</span>
                                    <span>⛽ {truck.fuel}</span>
                                    <span>📦 {(truck.capacity / 1000).toFixed(0)}k L</span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Legend */}
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mt-4">
                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Status Legend</h4>
                        <div className="space-y-1.5">
                            {Object.entries(statusColors).map(([status, sc]) => (
                                <div key={status} className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                    <span className="text-xs text-[var(--text-muted)]">{status.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
