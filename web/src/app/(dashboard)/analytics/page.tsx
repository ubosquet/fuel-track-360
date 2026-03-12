'use client';

import { useState } from 'react';
import {
    useAnalyticsOverview,
    useDriverAnalytics,
    useDriverLeaderboard,
    useStationAnalytics,
    useTruckAnalytics,
} from '@/hooks/useAnalytics';
import type {
    OrgOverview,
    DriverStats,
    LeaderboardEntry,
    StationStats,
    TruckStats,
} from '@/hooks/useAnalytics';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'drivers' | 'stations' | 'trucks';

// ─── Period helpers ───────────────────────────────────────────────────────────

function getPeriodDates(days: number): { from: string; to: string } {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - days);
    return {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
    };
}

const PERIODS = [
    { label: '7 jours', days: 7 },
    { label: '30 jours', days: 30 },
    { label: '90 jours', days: 90 },
] as const;

// ─── Score ring component ─────────────────────────────────────────────────────

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
    const r = (size - 8) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <svg width={size} height={size} className="rotate-[-90deg]" aria-label={`Score: ${score}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="currentColor" strokeWidth={6} className="text-[var(--border)]" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={6}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
                className="rotate-90" fontSize={12} fontWeight={700} fill={color}
                transform={`rotate(90, ${size / 2}, ${size / 2})`}>
                {score}
            </text>
        </svg>
    );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function Bar({ value, max = 100, color = 'var(--primary)' }: { value: number; max?: number; color?: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, icon, color = 'var(--primary)', delay = 0,
}: {
    label: string; value: string | number; sub?: string;
    icon: string; color?: string; delay?: number;
}) {
    return (
        <div
            className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 hover:shadow-lg
                        transition-all duration-300 hover:-translate-y-0.5 animate-fade-in"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs text-[var(--text-muted)] font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
                    {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
                </div>
                <span className="text-2xl">{icon}</span>
            </div>
        </div>
    );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={`bg-[var(--border)] animate-pulse rounded ${className}`} />;
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data, isLoading }: { data?: OrgOverview; isLoading: boolean }) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-28" />
                ))}
            </div>
        );
    }
    if (!data) return null;

    const cards = [
        { label: 'Total Manifestes', value: data.total_manifests, sub: 'sur la période', icon: '📦', color: 'var(--primary)' },
        { label: 'Taux de Complétion', value: `${data.completion_rate_pct}%`, sub: `${data.completed} complétés`, icon: '✅', color: 'var(--success)' },
        { label: 'Taux À Temps', value: `${data.on_time_rate_pct}%`, sub: 'SLA ≤ 4h transit', icon: '⏱️', color: data.on_time_rate_pct >= 80 ? 'var(--success)' : 'var(--warning)' },
        { label: 'Temps Transit Moy.', value: `${data.avg_transit_time_minutes} min`, sub: 'départ → arrivée', icon: '🛣️', color: 'var(--info)' },
        { label: 'Signalés', value: data.flagged, sub: 'écart volume >2%', icon: '⚠️', color: data.flagged > 0 ? 'var(--danger)' : 'var(--success)' },
        { label: 'Annulés', value: data.cancelled, sub: '', icon: '❌', color: 'var(--text-muted)' },
        { label: 'Volume Chargé', value: `${(data.total_volume_loaded_liters / 1000).toFixed(1)} kL`, sub: 'total période', icon: '🛢️', color: 'var(--primary)' },
        { label: 'Variance Volume Moy.', value: `${data.avg_volume_variance_pct}%`, sub: 'écart chargement/déchargement', icon: '📊', color: data.avg_volume_variance_pct > 2 ? 'var(--danger)' : 'var(--success)' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((c, i) => (
                    <StatCard key={c.label} delay={i * 60} {...c} />
                ))}
            </div>

            {/* Period info */}
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                <span>📅</span>
                <span>
                    Période: {new Date(data.period.from).toLocaleDateString('fr-FR')}
                    {' → '}
                    {new Date(data.period.to).toLocaleDateString('fr-FR')}
                </span>
            </div>
        </div>
    );
}

// ── Drivers Tab ───────────────────────────────────────────────────────────────

function DriversTab({
    drivers,
    leaderboard,
    isLoading,
}: {
    drivers?: DriverStats[];
    leaderboard?: LeaderboardEntry[];
    isLoading: boolean;
}) {
    const [sort, setSort] = useState<keyof DriverStats>('score');

    if (isLoading) {
        return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
    }

    const sorted = [...(drivers ?? [])].sort((a, b) => (b[sort] as number) - (a[sort] as number));

    const top3 = (leaderboard ?? []).slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    const podiumColors = ['#f59e0b', '#94a3b8', '#b45309'];

    return (
        <div className="space-y-6">
            {/* Podium */}
            {top3.length > 0 && (
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
                    <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">
                        🏆 Top Chauffeurs
                    </h3>
                    <div className="flex items-end justify-center gap-4">
                        {/* 2nd */}
                        {top3[1] && (
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-3xl">🥈</span>
                                <div className="bg-[var(--surface-hover)] rounded-t-lg w-20 flex flex-col items-center pb-3 pt-2 h-24">
                                    <span className="text-xs font-bold text-[var(--text-primary)] text-center px-1 truncate w-full text-center">{top3[1].label}</span>
                                    <p className="text-lg font-black text-[#94a3b8]">{top3[1].score}</p>
                                    <p className="text-[10px] text-[var(--text-muted)]">{top3[1].on_time_rate_pct}% à temps</p>
                                </div>
                            </div>
                        )}
                        {/* 1st */}
                        {top3[0] && (
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-4xl">🥇</span>
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-t-lg w-24 flex flex-col items-center pb-3 pt-2 h-32">
                                    <span className="text-xs font-bold text-[var(--text-primary)] text-center px-1 truncate w-full text-center">{top3[0].label}</span>
                                    <p className="text-2xl font-black text-amber-500">{top3[0].score}</p>
                                    <p className="text-[10px] text-amber-600">{top3[0].on_time_rate_pct}% à temps</p>
                                </div>
                            </div>
                        )}
                        {/* 3rd */}
                        {top3[2] && (
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-3xl">🥉</span>
                                <div className="bg-[var(--surface-hover)] rounded-t-lg w-20 flex flex-col items-center pb-3 pt-2 h-20">
                                    <span className="text-xs font-bold text-[var(--text-primary)] text-center px-1 truncate w-full text-center">{top3[2].label}</span>
                                    <p className="text-lg font-black text-[#b45309]">{top3[2].score}</p>
                                    <p className="text-[10px] text-[var(--text-muted)]">{top3[2].on_time_rate_pct}% à temps</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
                    <h3 className="font-semibold text-[var(--text-primary)]">Performance par Chauffeur</h3>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--text-muted)]">Trier par:</span>
                        {(['score', 'on_time_rate_pct', 'total_deliveries', 'avg_volume_variance_pct'] as const).map((k) => (
                            <button
                                key={k}
                                onClick={() => setSort(k)}
                                className={`px-2 py-1 rounded-md transition-colors ${sort === k
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                                    }`}
                            >
                                {k === 'score' ? 'Score'
                                    : k === 'on_time_rate_pct' ? 'À Temps'
                                        : k === 'total_deliveries' ? 'Livraisons'
                                            : 'Variance'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="text-left px-5 py-3">#</th>
                                <th className="text-left px-5 py-3">Chauffeur</th>
                                <th className="text-center px-4 py-3">Score</th>
                                <th className="text-center px-4 py-3">Livraisons</th>
                                <th className="text-center px-4 py-3">À Temps</th>
                                <th className="text-center px-4 py-3">Précision</th>
                                <th className="text-center px-4 py-3">Transit Moy.</th>
                                <th className="text-center px-4 py-3">Signalés</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {sorted.map((d, i) => {
                                const scoreColor = d.score >= 80 ? 'var(--success)' : d.score >= 60 ? 'var(--warning)' : 'var(--danger)';
                                return (
                                    <tr key={d.driver_id}
                                        className="hover:bg-[var(--surface-hover)] transition-colors animate-fade-in"
                                        style={{ animationDelay: `${i * 40}ms` }}>
                                        <td className="px-5 py-4">
                                            <span className="text-[var(--text-muted)] font-mono text-xs">
                                                {i < 3 ? medals[i] : `#${i + 1}`}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-medium text-[var(--text-primary)]">{d.driver_name}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <ScoreRing score={d.score} size={44} />
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="font-semibold">{d.total_deliveries}</span>
                                            <div className="text-[10px] text-[var(--text-muted)]">{d.completed} complétées</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-center font-semibold" style={{ color: d.on_time_rate_pct >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                                                {d.on_time_rate_pct}%
                                            </div>
                                            <Bar value={d.on_time_rate_pct} color={d.on_time_rate_pct >= 80 ? 'var(--success)' : 'var(--warning)'} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-center font-semibold" style={{ color: d.precision_rate_pct >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                                                {d.precision_rate_pct}%
                                            </div>
                                            <Bar value={d.precision_rate_pct} color={d.precision_rate_pct >= 80 ? 'var(--success)' : 'var(--warning)'} />
                                        </td>
                                        <td className="px-4 py-4 text-center text-[var(--text-secondary)]">
                                            {d.avg_transit_time_minutes} min
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {d.flagged > 0
                                                ? <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--danger)]/15 text-[var(--danger)] font-semibold">{d.flagged}</span>
                                                : <span className="text-[var(--success)]">✓</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                            {sorted.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">
                                        Aucune donnée pour cette période.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Stations Tab ──────────────────────────────────────────────────────────────

function StationsTab({ stations, isLoading }: { stations?: StationStats[]; isLoading: boolean }) {
    if (isLoading) {
        return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
    }

    const zoneColors: Record<string, string> = {
        NORTH: '#3b82f6', SOUTH: '#22c55e', EAST: '#f59e0b', WEST: '#8b5cf6',
    };

    return (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text-primary)]">Performance par Station</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                            <th className="text-left px-5 py-3">Station</th>
                            <th className="text-left px-5 py-3">Zone</th>
                            <th className="text-center px-4 py-3">Départs</th>
                            <th className="text-center px-4 py-3">Arrivées</th>
                            <th className="text-center px-4 py-3">Transit Moy.</th>
                            <th className="text-center px-4 py-3">Signalés</th>
                            <th className="text-center px-4 py-3">Variance Moy.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {(stations ?? []).map((s, i) => (
                            <tr key={s.station_id}
                                className="hover:bg-[var(--surface-hover)] transition-colors animate-fade-in"
                                style={{ animationDelay: `${i * 40}ms` }}>
                                <td className="px-5 py-4">
                                    <div className="font-medium text-[var(--text-primary)]">{s.station_name}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{s.station_code}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                        style={{ backgroundColor: `${zoneColors[s.zone] ?? '#64748b'}20`, color: zoneColors[s.zone] ?? '#64748b' }}>
                                        {s.zone}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center font-semibold">{s.departures}</td>
                                <td className="px-4 py-4 text-center font-semibold">{s.arrivals}</td>
                                <td className="px-4 py-4 text-center text-[var(--text-secondary)]">{s.avg_transit_time_minutes} min</td>
                                <td className="px-4 py-4 text-center">
                                    {s.flagged_arrivals > 0
                                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--danger)]/15 text-[var(--danger)] font-semibold">{s.flagged_arrivals}</span>
                                        : <span className="text-[var(--success)]">✓</span>}
                                </td>
                                <td className="px-4 py-4">
                                    <div className="text-center" style={{ color: s.avg_volume_variance_pct > 2 ? 'var(--danger)' : 'var(--success)' }}>
                                        {s.avg_volume_variance_pct}%
                                    </div>
                                    <Bar value={s.avg_volume_variance_pct} max={5} color={s.avg_volume_variance_pct > 2 ? 'var(--danger)' : 'var(--success)'} />
                                </td>
                            </tr>
                        ))}
                        {(stations ?? []).length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">
                                    Aucune donnée de station pour cette période.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Trucks Tab ────────────────────────────────────────────────────────────────

function TrucksTab({ trucks, isLoading }: { trucks?: TruckStats[]; isLoading: boolean }) {
    if (isLoading) {
        return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
    }

    return (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text-primary)]">Utilisation des Camions</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                            <th className="text-left px-5 py-3">Plaque</th>
                            <th className="text-center px-4 py-3">Manifestes</th>
                            <th className="text-center px-4 py-3">Complétés</th>
                            <th className="text-center px-4 py-3">Signalés</th>
                            <th className="text-center px-4 py-3">Variance Moy.</th>
                            <th className="text-center px-4 py-3">Taux Complétion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {(trucks ?? []).map((t, i) => {
                            const rate = t.total_manifests > 0 ? Math.round((t.completed / t.total_manifests) * 100) : 0;
                            return (
                                <tr key={t.truck_id}
                                    className="hover:bg-[var(--surface-hover)] transition-colors animate-fade-in"
                                    style={{ animationDelay: `${i * 40}ms` }}>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                                <span className="text-xs font-bold text-[var(--primary)]">🚛</span>
                                            </div>
                                            <span className="font-mono font-semibold">{t.plate_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center font-semibold">{t.total_manifests}</td>
                                    <td className="px-4 py-4 text-center text-[var(--success)] font-semibold">{t.completed}</td>
                                    <td className="px-4 py-4 text-center">
                                        {t.flagged > 0
                                            ? <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--danger)]/15 text-[var(--danger)] font-semibold">{t.flagged}</span>
                                            : <span className="text-[var(--success)]">✓</span>}
                                    </td>
                                    <td className="px-4 py-4 text-center" style={{ color: t.avg_volume_variance_pct > 2 ? 'var(--danger)' : 'var(--success)' }}>
                                        {t.avg_volume_variance_pct}%
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-center font-semibold" style={{ color: rate >= 80 ? 'var(--success)' : 'var(--warning)' }}>{rate}%</div>
                                        <Bar value={rate} color={rate >= 80 ? 'var(--success)' : 'var(--warning)'} />
                                    </td>
                                </tr>
                            );
                        })}
                        {(trucks ?? []).length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">
                                    Aucune donnée de camion pour cette période.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [periodDays, setPeriodDays] = useState(30);

    const { from, to } = getPeriodDates(periodDays);

    const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(from, to);
    const { data: drivers, isLoading: driversLoading } = useDriverAnalytics(from, to);
    const { data: leaderboard } = useDriverLeaderboard(from, to);
    const { data: stations, isLoading: stationsLoading } = useStationAnalytics(from, to);
    const { data: trucks, isLoading: trucksLoading } = useTruckAnalytics(from, to);

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
        { id: 'drivers', label: 'Chauffeurs', icon: '👤' },
        { id: 'stations', label: 'Stations', icon: '🏭' },
        { id: 'trucks', label: 'Camions', icon: '🚛' },
    ];

    return (
        <div className="space-y-6 max-w-[1400px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics & Rapports</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Performance des chauffeurs, stations et livraisons
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/analytics/my-performance"
                        className="px-4 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm
                                   font-medium hover:bg-[var(--primary)]/20 transition-colors"
                    >
                        📈 Mon Rapport
                    </Link>
                    {/* Period selector */}
                    <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                        {PERIODS.map(({ label, days }) => (
                            <button
                                key={days}
                                onClick={() => setPeriodDays(days)}
                                className={`px-3 py-2 text-xs font-medium transition-colors ${periodDays === days
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl w-fit">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === t.id
                            ? 'bg-[var(--primary)] text-white shadow-md'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                            }`}
                    >
                        <span>{t.icon}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in" key={activeTab}>
                {activeTab === 'overview' && <OverviewTab data={overview} isLoading={overviewLoading} />}
                {activeTab === 'drivers' && <DriversTab drivers={drivers} leaderboard={leaderboard} isLoading={driversLoading} />}
                {activeTab === 'stations' && <StationsTab stations={stations} isLoading={stationsLoading} />}
                {activeTab === 'trucks' && <TrucksTab trucks={trucks} isLoading={trucksLoading} />}
            </div>
        </div>
    );
}
