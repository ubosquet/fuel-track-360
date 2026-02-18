'use client';

import { useAuth } from '@/contexts/AuthContext';

// ── Demo Data ──
const stats = [
    { label: 'Active S2L', value: '12', change: '+3 today', color: 'var(--primary)', icon: '🔍' },
    { label: 'In-Transit', value: '8', change: '5 on time', color: 'var(--secondary)', icon: '🚛' },
    { label: 'Pending Review', value: '4', change: '2 urgent', color: 'var(--warning)', icon: '⏳' },
    { label: 'Flagged', value: '1', change: '>2% variance', color: 'var(--danger)', icon: '⚠️' },
];

const recentS2L = [
    { id: 'S2L-2026-0047', truck: 'AA-00001', driver: 'Jean Pierre', station: 'Terminal Thor', status: 'APPROVED', time: '10:35' },
    { id: 'S2L-2026-0046', truck: 'AA-00002', driver: 'Marie Claire', station: 'Station Delmas', status: 'SUBMITTED', time: '09:12' },
    { id: 'S2L-2026-0045', truck: 'AA-00003', driver: 'Paul Estimé', station: 'Terminal Nord', status: 'DRAFT', time: '08:45' },
    { id: 'S2L-2026-0044', truck: 'AA-00001', driver: 'Jean Pierre', station: 'Station Pétion', status: 'REJECTED', time: 'Yesterday' },
    { id: 'S2L-2026-0043', truck: 'AA-00002', driver: 'Marie Claire', station: 'Terminal Thor', status: 'EXPIRED', time: 'Yesterday' },
];

const recentManifests = [
    { number: 'FT360-20260217-0012', product: 'DIESEL', volume: '20,000 L', origin: 'Terminal Thor', dest: 'Station Delmas', status: 'IN_TRANSIT', variance: null },
    { number: 'FT360-20260217-0011', product: 'GASOLINE_91', volume: '15,000 L', origin: 'Terminal Nord', dest: 'Station Pétion', status: 'COMPLETED', variance: '0.8%' },
    { number: 'FT360-20260216-0010', product: 'DIESEL', volume: '18,500 L', origin: 'Terminal Thor', dest: 'Station Carrefour', status: 'FLAGGED', variance: '3.2%' },
];

const statusColors: Record<string, string> = {
    DRAFT: 'bg-[var(--text-muted)]/20 text-[var(--text-secondary)]',
    SUBMITTED: 'bg-[var(--info)]/15 text-[var(--info)]',
    APPROVED: 'bg-[var(--success)]/15 text-[var(--success)]',
    REJECTED: 'bg-[var(--danger)]/15 text-[var(--danger)]',
    EXPIRED: 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]',
    CREATED: 'bg-[var(--text-muted)]/20 text-[var(--text-secondary)]',
    IN_TRANSIT: 'bg-[var(--primary)]/15 text-[var(--primary)]',
    COMPLETED: 'bg-[var(--success)]/15 text-[var(--success)]',
    FLAGGED: 'bg-[var(--danger)]/15 text-[var(--danger)]',
};

export default function DashboardPage() {
    return (
        <div className="space-y-6 max-w-[1400px]">
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div
                        key={stat.label}
                        className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 hover:shadow-lg
              transition-all duration-300 hover:-translate-y-0.5 animate-fade-in"
                        style={{ animationDelay: `${i * 80}ms` }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)] font-medium">{stat.label}</p>
                                <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{stat.change}</p>
                            </div>
                            <span className="text-2xl">{stat.icon}</span>
                        </div>
                        <div className="mt-3 h-1 rounded-full bg-[var(--border)]">
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${Math.random() * 40 + 40}%`, backgroundColor: stat.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Tables ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent S2L */}
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden animate-fade-in" style={{ animationDelay: '300ms' }}>
                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-primary)]">Recent S2L Inspections</h3>
                        <a href="/s2l" className="text-xs text-[var(--primary)] hover:underline font-medium">View All →</a>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {recentS2L.map((item) => (
                            <div key={item.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                        <span className="text-xs font-bold text-[var(--primary)]">{item.truck.slice(-3)}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.id}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{item.driver} • {item.station}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[item.status]}`}>
                                        {item.status}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">{item.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Manifests */}
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden animate-fade-in" style={{ animationDelay: '400ms' }}>
                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-primary)]">Delivery Manifests</h3>
                        <a href="/manifests" className="text-xs text-[var(--primary)] hover:underline font-medium">View All →</a>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {recentManifests.map((item) => (
                            <div key={item.number} className="px-5 py-3 hover:bg-[var(--surface-hover)] transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.number}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{item.origin} → {item.dest}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[item.status]}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-xs bg-[var(--background)] px-2 py-0.5 rounded text-[var(--text-secondary)]">
                                        {item.product}
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)]">{item.volume}</span>
                                    {item.variance && (
                                        <span className={`text-xs font-semibold ${parseFloat(item.variance) > 2 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                                            Variance: {item.variance}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Fleet Overview ── */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden animate-fade-in" style={{ animationDelay: '500ms' }}>
                <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                    <h3 className="font-semibold text-[var(--text-primary)]">Fleet Status • Live</h3>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                        <span className="text-xs text-[var(--text-muted)]">Real-time</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
                    {[
                        { plate: 'AA-00001', driver: 'Jean Pierre', status: 'EN_ROUTE', location: 'Route Nationale 1', speed: '45 km/h', color: 'var(--success)' },
                        { plate: 'AA-00002', driver: 'Marie Claire', status: 'LOADING', location: 'Terminal Thor', speed: '0 km/h', color: 'var(--secondary)' },
                        { plate: 'AA-00003', driver: 'Paul Estimé', status: 'IDLE', location: 'Station Delmas', speed: '0 km/h', color: 'var(--text-muted)' },
                    ].map((truck) => (
                        <div key={truck.plate} className="p-5 hover:bg-[var(--surface-hover)] transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 flex items-center justify-center">
                                    <span className="text-lg">🚛</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">{truck.plate}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{truck.driver}</p>
                                </div>
                                <span
                                    className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                                    style={{ borderColor: truck.color, color: truck.color }}
                                >
                                    {truck.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-[var(--text-secondary)]">📍 {truck.location}</p>
                                <p className="text-xs text-[var(--text-muted)]">Speed: {truck.speed}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
