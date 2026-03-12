'use client';

import { useDriverCoach } from '@/hooks/useAI';

export function DriverCoach() {
    const { data, isLoading, error, refetch } = useDriverCoach();

    if (isLoading) {
        return (
            <div className="border border-[var(--border)] rounded-xl p-6 space-y-3 animate-pulse">
                <div className="h-4 w-48 bg-[var(--border)] rounded" />
                <div className="h-3 w-full bg-[var(--border)] rounded" />
                <div className="h-3 w-3/4 bg-[var(--border)] rounded" />
                <div className="h-3 w-5/6 bg-[var(--border)] rounded" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="border border-[var(--border)] rounded-xl p-5 text-sm text-[var(--text-muted)] flex items-center gap-2">
                <span>🤖</span>
                <span>Coaching IA indisponible.{' '}
                    <button onClick={() => refetch()} className="underline text-[var(--primary)]">Réessayer</button>
                </span>
            </div>
        );
    }

    return (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 bg-gradient-to-r from-[var(--primary)]/10 to-transparent
                            border-b border-[var(--border)] flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Coaching IA personnalisé</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Gemini 3.1 Flash Lite · Mis à jour</p>
                </div>
            </div>

            <div className="px-5 py-5 space-y-5">
                {/* Score breakdown */}
                <div className="grid grid-cols-3 gap-3">
                    {Object.entries(data.score_breakdown).map(([key, val]) => {
                        const labels: Record<string, string> = {
                            on_time: 'Ponctualité', precision: 'Précision', completion: 'Complétion',
                        };
                        return (
                            <div key={key} className="p-3 rounded-lg bg-[var(--surface-hover)] text-center">
                                <p className="text-[10px] text-[var(--text-muted)] mb-1">{labels[key]}</p>
                                <p className="text-xs font-semibold text-[var(--text-secondary)]">{val}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Strengths */}
                <div>
                    <p className="text-xs font-semibold text-[var(--success)] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>✅</span> Points forts
                    </p>
                    <ul className="space-y-1.5">
                        {data.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <span className="text-[var(--success)] mt-0.5">•</span>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Improvement areas */}
                <div>
                    <p className="text-xs font-semibold text-[var(--warning)] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>🎯</span> À améliorer
                    </p>
                    <ul className="space-y-1.5">
                        {data.improvement_areas.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <span className="text-[var(--warning)] mt-0.5">•</span>
                                {a}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Weekly goal */}
                <div className="p-4 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5">
                    <p className="text-xs font-semibold text-[var(--primary)] mb-1">🏆 Objectif de la semaine</p>
                    <p className="text-sm text-[var(--text-primary)] font-medium">{data.weekly_goal}</p>
                </div>

                {/* Motivational message */}
                <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed border-l-2 border-[var(--primary)] pl-3">
                    "{data.motivational_message}"
                </p>
            </div>
        </div>
    );
}
