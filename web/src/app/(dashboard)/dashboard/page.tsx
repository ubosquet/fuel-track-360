'use client';

import { useDashboardStats } from '@/hooks/useS2L';

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
    const { stats, isLoading, error } = useDashboardStats();

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

            {/* ── Tables ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent S2L */}
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden animate-fade-in" style={{ animationDelay: '300ms' }}>
                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-primary)]">Recent S2L Inspections</h3>
                        <a href="/s2l" className="text-xs text-[var(--primary)] hover:underline font-medium">View All →</a>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {isLoading ? (
                            // Skeleton loading
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
                                No S2L inspections yet. Data will appear when drivers submit checklists.
                            </div>
                        ) : (
                            stats.recentS2Ls.map((item) => (
                                <div key={item.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                            <span className="text-xs font-bold text-[var(--primary)]">
                                                {(item.truck?.plate_number ?? item.truck_id ?? '').slice(-3) || '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                {item.id.slice(0, 8).toUpperCase()}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {item.driver?.full_name ?? 'Unknown'} • {item.station?.name ?? 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[item.status] ?? ''}`}>
                                            {item.status}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Summary Card (Replaces demo manifests until Manifest API is ready) */}
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden animate-fade-in" style={{ animationDelay: '400ms' }}>
                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-primary)]">S2L Summary</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Total Inspections', value: stats.total, color: 'var(--primary)' },
                                { label: 'Approval Rate', value: stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}%` : '—', color: 'var(--success)' },
                                { label: 'Active (Draft+Submitted)', value: stats.activeS2L, color: 'var(--warning)' },
                                { label: 'Rejected', value: stats.rejected, color: 'var(--danger)' },
                            ].map((item) => (
                                <div key={item.label} className="bg-[var(--background)] rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold" style={{ color: item.color }}>
                                        {isLoading ? '—' : item.value}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{item.label}</p>
                                </div>
                            ))}
                        </div>
                        {!isLoading && stats.submitted > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex items-center gap-2">
                                <span>⏳</span>
                                <span className="text-sm text-amber-700 dark:text-amber-400">
                                    {stats.submitted} checklist{stats.submitted !== 1 ? 's' : ''} awaiting supervisor review
                                </span>
                            </div>
                        )}
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
                <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                    <div className="text-3xl mb-3">🗺️</div>
                    <p className="font-medium text-[var(--text-secondary)]">Fleet tracking coming soon</p>
                    <p className="text-xs mt-1">WebSocket integration will provide live vehicle positions</p>
                </div>
            </div>
        </div>
    );
}
