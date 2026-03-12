'use client';

import { useState } from 'react';
import { useManifestAnalysis } from '@/hooks/useAI';
import type { ManifestAnalysisResult, RootCause, RecommendedAction } from '@/hooks/useAI';

// ─── Display helpers ──────────────────────────────────────────────────────────

const causeLabel: Record<RootCause, string> = {
    DRIVER_ERROR: '🧑‍✈️ Erreur chauffeur',
    EQUIPMENT_FAULT: '🔧 Défaillance équipement',
    MEASUREMENT_ERROR: '📏 Erreur de mesure',
    ROUTE_RELATED: '🛣️ Facteur de parcours',
    UNKNOWN: '❓ Cause indéterminée',
};

const actionLabel: Record<RecommendedAction, { text: string; color: string }> = {
    FLAG_FOR_REVIEW: { text: '🔍 Mettre en révision', color: 'var(--warning)' },
    EQUIPMENT_CHECK: { text: '🔧 Inspection équipement', color: 'var(--danger)' },
    RECOUNT: { text: '📏 Recomptage volume', color: 'var(--info)' },
    MONITOR: { text: '👁️ Surveiller', color: 'var(--text-secondary)' },
    ESCALATE: { text: '🚨 Escalader', color: 'var(--danger)' },
};

function ConfidenceBar({ value }: { value: number }) {
    const pct = Math.round(value * 100);
    const color = pct >= 70 ? 'var(--danger)' : pct >= 50 ? 'var(--warning)' : 'var(--text-muted)';
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Confiance IA</span>
                <span className="font-semibold" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    manifestId: string;
}

export function ManifestAIAnalysis({ manifestId }: Props) {
    const { mutate, data, isPending, error } = useManifestAnalysis(manifestId);
    const [ran, setRan] = useState(false);

    const run = () => { setRan(true); mutate(); };

    const action = data ? actionLabel[data.recommended_action] : null;

    return (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface-hover)]">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                        Analyse IA — Gemini
                    </span>
                </div>
                {!ran && (
                    <button
                        onClick={run}
                        className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold
                                   hover:opacity-90 transition-opacity"
                    >
                        Analyser
                    </button>
                )}
            </div>

            {/* Loading */}
            {isPending && (
                <div className="px-5 py-6 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent
                                    rounded-full animate-spin" />
                    Gemini analyse le manifeste et l'historique du chauffeur…
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="px-5 py-4 text-sm text-[var(--danger)] bg-[var(--danger)]/5">
                    ⚠️ L'analyse IA est temporairement indisponible.{' '}
                    <button onClick={run} className="underline">Réessayer</button>
                </div>
            )}

            {/* Result */}
            {data && !isPending && (
                <div className="px-5 py-5 space-y-4 animate-fade-in">
                    {/* Cause */}
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
                                Cause probable
                            </p>
                            <p className="font-bold text-[var(--text-primary)]">
                                {causeLabel[data.root_cause_probability]}
                            </p>
                        </div>
                        {data.similar_incidents > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-[var(--warning)]/15 text-[var(--warning)] font-semibold">
                                {data.similar_incidents} incidents similaires
                            </span>
                        )}
                    </div>

                    {/* Confidence */}
                    <ConfidenceBar value={data.confidence} />

                    {/* Explanation */}
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--border)] pl-3">
                        {data.explanation}
                    </p>

                    {/* Key factors */}
                    {data.key_factors.length > 0 && (
                        <div>
                            <p className="text-xs text-[var(--text-muted)] mb-1.5">Facteurs clés</p>
                            <ul className="space-y-1">
                                {data.key_factors.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action */}
                    {action && (
                        <div className="mt-2 px-4 py-3 rounded-lg border"
                            style={{ borderColor: `${action.color}40`, backgroundColor: `${action.color}10` }}>
                            <p className="text-xs text-[var(--text-muted)] mb-0.5">Action recommandée</p>
                            <p className="font-bold text-sm" style={{ color: action.color }}>{action.text}</p>
                        </div>
                    )}

                    <p className="text-[10px] text-[var(--text-muted)] text-right">
                        Généré par Gemini 3.1 Flash Lite · Résultat indicatif
                    </p>
                </div>
            )}

            {/* Idle state */}
            {!ran && !isPending && (
                <div className="px-5 py-5 text-sm text-[var(--text-muted)] text-center">
                    Cliquez "Analyser" pour que Gemini identifie la cause probable de l'écart de volume.
                </div>
            )}
        </div>
    );
}
