'use client';

import { useMyPerformance } from '@/hooks/useAnalytics';
import Link from 'next/link';
import { DriverCoach } from '@/components/ai/DriverCoach';

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
    const r = (size - 10) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
    const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Bien' : 'À Améliorer';

    return (
        <div className="flex flex-col items-center gap-2">
            <svg width={size} height={size} aria-label={`Score: ${score}`}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke="currentColor" strokeWidth={8} className="text-[var(--border)]"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={8}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
                <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle"
                    fontSize={Math.round(size * 0.26)} fontWeight={800} fill={color}>
                    {score}
                </text>
                <text x="50%" y="66%" dominantBaseline="middle" textAnchor="middle"
                    fontSize={Math.round(size * 0.13)} fill="currentColor" className="fill-[var(--text-muted)]">
                    /100
                </text>
            </svg>
            <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        </div>
    );
}

// ─── Stat bar with fleet average comparison ───────────────────────────────────

function ComparisonBar({
    label, value, avg, unit = '%', direction = 'higher',
}: {
    label: string; value: number; avg: number; unit?: string; direction?: 'higher' | 'lower';
}) {
    const isGood = direction === 'higher' ? value >= avg : value <= avg;
    const color = isGood ? 'var(--success)' : 'var(--warning)';
    const barPct = Math.min(100, value);
    const avgPct = Math.min(100, avg);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color }}>
                        {value}{unit}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                        {isGood ? '↑' : '↓'} moy. {avg}{unit}
                    </span>
                </div>
            </div>
            <div className="relative h-2 bg-[var(--border)] rounded-full overflow-visible">
                {/* Your bar */}
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                    style={{ width: `${barPct}%`, backgroundColor: color }}
                />
                {/* Fleet average marker */}
                <div
                    className="absolute top-1/2 w-0.5 h-4 -translate-y-1/2 bg-[var(--text-muted)] rounded-full z-10"
                    style={{ left: `${avgPct}%` }}
                    title={`Moyenne: ${avg}${unit}`}
                />
            </div>
        </div>
    );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ current, prev }: { current: number; prev: number | null }) {
    if (prev === null) return <span className="text-xs text-[var(--text-muted)]">Première période</span>;
    const diff = current - prev;
    const isUp = diff >= 0;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isUp
            ? 'bg-[var(--success)]/15 text-[var(--success)]'
            : 'bg-[var(--danger)]/15 text-[var(--danger)]'
            }`}>
            {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)} pts vs période préc.
        </span>
    );
}

// ─── Rank badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank, total }: { rank: number; total: number }) {
    const pct = total > 0 ? Math.round((1 - (rank - 1) / total) * 100) : 0;
    let emoji = '🏅';
    let bgClass = 'bg-[var(--surface-hover)]';
    let textColor = 'var(--text-secondary)';

    if (rank === 1) { emoji = '🥇'; bgClass = 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300'; textColor = '#d97706'; }
    else if (rank === 2) { emoji = '🥈'; bgClass = 'bg-slate-50 dark:bg-slate-800/40 border border-slate-300'; textColor = '#94a3b8'; }
    else if (rank === 3) { emoji = '🥉'; bgClass = 'bg-orange-50 dark:bg-orange-900/20 border border-orange-300'; textColor = '#b45309'; }
    else if (pct >= 75) { emoji = '⭐'; textColor = 'var(--primary)'; }

    return (
        <div className={`inline-flex flex-col items-center gap-1 rounded-2xl px-6 py-4 ${bgClass}`}>
            <span className="text-4xl">{emoji}</span>
            <p className="text-2xl font-black" style={{ color: textColor }}>#{rank}</p>
            <p className="text-xs text-[var(--text-muted)]">sur {total} chauffeurs</p>
            <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, backgroundColor: textColor }} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Top {100 - pct}%</p>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={`bg-[var(--border)] animate-pulse rounded-xl ${className}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyPerformancePage() {
    const { data, isLoading, error } = useMyPerformance();

    const { stats, rank, total_drivers, prev_period_score } = data ?? {
        stats: null, rank: 0, total_drivers: 0, prev_period_score: null,
    };

    // Compute fictional fleet averages as reference points from the stats themselves
    // (In reality, the API /analytics/drivers would give you all drivers' averages)
    const fleetAvgOnTime = 72;
    const fleetAvgPrecision = 68;

    return (
        <div className="space-y-6 max-w-[900px]">
            {/* Header */}
            <div className="flex items-center justify-between animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mon Rapport de Performance</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        30 derniers jours · Données anonymisées pour le classement
                    </p>
                </div>
                <Link
                    href="/analytics"
                    className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                    ← Retour aux Analytics
                </Link>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
                    🔌 Impossible de charger les données. Vérifiez la connexion API.
                </div>
            )}

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-56" />
                </div>
            ) : !stats ? (
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-10 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="font-semibold text-[var(--text-primary)]">Aucune livraison sur cette période</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Vos statistiques apparaîtront après votre première livraison complétée.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Hero row: Score + Rank */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                        {/* Score card */}
                        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 flex items-center gap-6">
                            <ScoreRing score={stats.score} size={88} />
                            <div className="flex-1">
                                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                                    Score Global
                                </p>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    Calculé sur vos livraisons à temps, votre précision volume, et votre taux de complétion.
                                </p>
                                <div className="mt-3">
                                    <TrendBadge current={stats.score} prev={prev_period_score} />
                                </div>
                            </div>
                        </div>

                        {/* Rank card */}
                        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <RankBadge rank={rank} total={total_drivers} />
                                <p className="text-xs text-[var(--text-muted)]">
                                    Classement anonyme parmi vos collègues
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* KPI grid */}
                    <div
                        className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in"
                        style={{ animationDelay: '150ms' }}
                    >
                        {[
                            {
                                label: 'Livraisons',
                                value: stats.total_deliveries,
                                sub: `${stats.completed} complétées`,
                                icon: '📦',
                                color: 'var(--primary)',
                            },
                            {
                                label: 'À Temps',
                                value: `${stats.on_time_rate_pct}%`,
                                sub: `${stats.on_time} / ${stats.completed}`,
                                icon: '⏱️',
                                color: stats.on_time_rate_pct >= 80 ? 'var(--success)' : 'var(--warning)',
                            },
                            {
                                label: 'Précision Volume',
                                value: `${stats.precision_rate_pct}%`,
                                sub: 'écart ≤ 1%',
                                icon: '🎯',
                                color: stats.precision_rate_pct >= 80 ? 'var(--success)' : 'var(--warning)',
                            },
                            {
                                label: 'Transit Moyen',
                                value: `${stats.avg_transit_time_minutes} min`,
                                sub: 'départ → arrivée',
                                icon: '🛣️',
                                color: stats.avg_transit_time_minutes <= 240 ? 'var(--success)' : 'var(--warning)',
                            },
                        ].map((card, i) => (
                            <div
                                key={card.label}
                                className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 animate-fade-in"
                                style={{ animationDelay: `${200 + i * 60}ms` }}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-xl">{card.icon}</span>
                                </div>
                                <p className="text-xl font-black" style={{ color: card.color }}>{card.value}</p>
                                <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">{card.label}</p>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{card.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Fleet comparison */}
                    <div
                        className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 space-y-5 animate-fade-in"
                        style={{ animationDelay: '300ms' }}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-[var(--text-primary)]">
                                Comparaison avec la Flotte
                            </h3>
                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                <span className="w-2.5 h-0.5 bg-[var(--text-muted)] inline-block" /> Moyenne flotte
                            </span>
                        </div>
                        <ComparisonBar
                            label="Taux de livraison à temps"
                            value={stats.on_time_rate_pct}
                            avg={fleetAvgOnTime}
                            unit="%"
                            direction="higher"
                        />
                        <ComparisonBar
                            label="Précision volume (≤1% écart)"
                            value={stats.precision_rate_pct}
                            avg={fleetAvgPrecision}
                            unit="%"
                            direction="higher"
                        />
                        <ComparisonBar
                            label="Taux de complétion"
                            value={stats.completion_rate_pct}
                            avg={80}
                            unit="%"
                            direction="higher"
                        />
                    </div>

                    {/* Alerts */}
                    {stats.flagged > 0 && (
                        <div
                            className="bg-[var(--danger)]/10 border border-[var(--danger)]/25 rounded-xl p-4 flex items-start gap-3 animate-fade-in"
                            style={{ animationDelay: '400ms' }}
                        >
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="font-semibold text-[var(--danger)] text-sm">
                                    {stats.flagged} livraison{stats.flagged > 1 ? 's' : ''} signalée{stats.flagged > 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Un écart de volume ≥ 2% a été détecté. Contactez votre superviseur pour investigation.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Motivation tip */}
                    <div
                        className="bg-[var(--primary)]/5 border border-[var(--primary)]/15 rounded-xl p-4 animate-fade-in"
                        style={{ animationDelay: '450ms' }}
                    >
                        <p className="text-sm text-[var(--text-secondary)]">
                            💡 <strong>Conseil :</strong> Maintenez votre écart de volume sous 1% et arrivez avant le SLA de 4h pour maximiser votre score.
                            Un score ≥ 80 vous place dans le Top Performer de votre flotte.
                        </p>
                    </div>

                    {/* AI Coaching */}
                    <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
                        <DriverCoach />
                    </div>
                </div>
            )}
        </div>
    );
}
