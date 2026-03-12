'use client';

import { useDashboardStats } from '@/hooks/useS2L';
import { useFleetStatus } from '@/hooks/useFleet';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

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

const fleetColors: Record<string, string> = {
    EN_ROUTE: 'bg-emerald-500',
    LOADING: 'bg-amber-500',
    DISCHARGING: 'bg-purple-500',
    IDLE: 'bg-gray-400',
    MAINTENANCE: 'bg-red-500',
};

export default function DashboardPage() {
    const { stats, isLoading, error } = useDashboardStats();
    const { data: fleetData, isLoading: fleetLoading } = useFleetStatus();

    const kpiCards = [
        { label: 'Active S2L', value: stats.activeS2L, change: `${stats.submitted} pending review`, color: 'var(--primary)', icon: '🔍' },
        { label: 'Approved', value: stats.approved, change: 'All time', color: 'var(--success)', icon: '✅' },
        { label: 'Pending Review', value: stats.submitted, change: 'Needs attention', color: 'var(--warning)', icon: '⏳' },
        { label: 'Rejected', value: stats.rejected, change: 'Re-inspection needed', color: 'var(--danger)', icon: '⚠️' },
    ];

    return (
        <div className="space-y-6 max-w-[1400px]">
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((stat, i) => (
                    <div
                        key={stat.label}
                        className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 hover:shadow-lg
                            transition-all duration-300 hover:-translate-y-0.5 animate-fade-in"
                        style={{ animationDelay: `${i * 80}ms` }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)] font-medium">{stat.label}</p>
                                <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>
                                    {isLoading ? (
                                        <span className="inline-block w-8 h-8 bg-[var(--border)] rounded animate-pulse" />
                                    ) : (
                                        stat.value
                                    )}
                                </p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{stat.change}</p>
                            </div>
                            <span className="text-2xl">{stat.icon}</span>
                        </div>
                        <div className="mt-3 h-1 rounded-full bg-[var(--border)]">
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: `${stats.total > 0 ? Math.min((stat.value / stats.total) * 100, 100) : 0}%`,
                                    backgroundColor: stat.color,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Error banner ── */}
            {error && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <span>🔌</span>
                        <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                            API connection unavailable – showing cached data
                        </span>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">
                        Ensure the API server is running. Dashboard will refresh automatically when connection is restored.
                    </p>
                </div>
            )}

            {/* ── Pending tray ── */}
            {!isLoading && stats.submitted > 0 && (
                <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl p-4 animate-fade-in flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--warning)]/20 flex items-center justify-center text-[var(--warning)]">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--text-primary)]">{stats.submitted} Action(s) en attente</h3>
                            <p className="text-sm text-[var(--text-muted)]">Checklists Safe-to-Load nécessitent l'approbation d'un superviseur.</p>
                        </div>
                    </div>
                    <Link
                        href="/s2l"
                        className="px-4 py-2 bg-[var(--warning)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--warning)]/90 transition-colors shadow-sm"
                    >
                        Examiner
                    </Link>
                </div>
            )}

            {/* ── Tables ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent S2L */}
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden animate-fade-in" style={{ animationDelay: '300ms' }}>
                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-primary)]">Inspections S2L récentes</h3>
                        <Link href="/s2l" className="text-xs text-[var(--primary)] hover:underline font-medium">Voir tout →</Link>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="px-5 py-3 flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--border)]" />
                                    <div className="flex-1 space-y-2">
                                        <div className="w-24 h-3 bg-[var(--border)] rounded" />
                                        <div className="w-40 h-2 bg-[var(--border)] rounded" />
                                    </div>
                                    <div className="w-16 h-5 bg-[var(--border)] rounded-full" />
                                </div>
                            ))
                        ) : stats.recentS2Ls.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                                Aucune inspection. Les données apparaîtront dès les soumissions.
                            </div>
                        ) : (
                            stats.recentS2Ls.map((item) => (
                                <Link key={item.id} href={`/s2l/${item.id}`} className="block">
                                    <div className="px-5 py-3 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                                <span className="text-xs font-bold text-[var(--primary)]">
                                                    {(item.truck?.plate_number ?? item.truck_id ?? '').slice(-3) || '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)] hover:underline">
                                                    {item.id.slice(0, 8).toUpperCase()}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {item.driver?.full_name ?? 'Inconnu'} • {item.station?.name ?? 'Inconnue'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[item.status] ?? ''}`}>
                                                {item.status}
                                            </span>
                                            <span className="text-xs text-[var(--text-muted)] w-12 text-right">
                                                {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Fleet Overview Widget */}
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden animate-fade-in flex flex-col" style={{ animationDelay: '400ms' }}>
                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[var(--text-primary)]">Statut de la flotte</h3>
                            <div className="flex items-center gap-1.5 ml-2">
                                <span className={`w-2 h-2 rounded-full ${fleetLoading ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'} animate-pulse`} />
                                <span className="text-xs text-[var(--text-muted)] opacity-70">En direct</span>
                            </div>
                        </div>
                        <Link href="/fleet" className="text-xs text-[var(--primary)] hover:underline font-medium">Carte Live →</Link>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-center space-y-5">
                        {fleetLoading ? (
                            <div className="space-y-4">
                                <div className="h-6 w-32 bg-[var(--border)] rounded animate-pulse" />
                                <div className="flex justify-between gap-2">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-12 flex-1 bg-[var(--border)] rounded animate-pulse" />)}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="text-center">
                                    <span className="text-5xl font-black text-[var(--text-primary)] tracking-tight">
                                        {fleetData?.total_trucks ?? 0}
                                    </span>
                                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mt-1">Camions actifs</p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                    {Object.entries(fleetData?.status_breakdown || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([status, count]) => (
                                        <div key={status} className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${fleetColors[status] || 'bg-[var(--text-muted)]'}`} />
                                                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{status.replace('_', ' ')}</span>
                                            </div>
                                            <p className="text-lg font-bold text-[var(--text-primary)]">{count}</p>
                                        </div>
                                    ))}
                                </div>

                                {fleetData?.trucks && fleetData.trucks.length > 0 && (
                                    <div className="mt-auto pt-4 border-t border-[var(--border)]">
                                        <p className="text-xs text-[var(--text-muted)] flex justify-between items-center">
                                            Dernière mise à jour :
                                            <span className="font-semibold text-[var(--text-secondary)]">a l'instant</span>
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

