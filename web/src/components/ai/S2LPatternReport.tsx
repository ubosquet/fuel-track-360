'use client';

import { useS2LPatternScan } from '@/hooks/useAI';
import type { S2LPatternResult, RiskLevel } from '@/hooks/useAI';

const riskConfig: Record<RiskLevel, { label: string; color: string; bg: string }> = {
    LOW: { label: 'Faible', color: 'var(--success)', bg: 'var(--success)/15' },
    MEDIUM: { label: 'Moyen', color: 'var(--warning)', bg: 'var(--warning)/15' },
    HIGH: { label: 'Élevé', color: 'var(--danger)', bg: 'var(--danger)/15' },
};

export function S2LPatternReport() {
    const { mutate, data, isPending, error, reset } = useS2LPatternScan();

    const risk = data ? riskConfig[data.overall_risk] : null;

    return (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Analyse IA — Patterns S2L</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Détecte les risques systémiques dans les rejets de checklists</p>
                    </div>
                </div>
                <button
                    onClick={() => { reset(); mutate(); }}
                    disabled={isPending}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold
                               hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1.5"
                >
                    {isPending ? (
                        <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            Analyse en cours…
                        </>
                    ) : (
                        '🔍 Lancer l\'analyse'
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="px-5 py-4 text-sm text-[var(--danger)] bg-[var(--danger)]/5">
                    ⚠️ Analyse IA indisponible. Vérifiez que VERTEX_PROJECT_ID est configuré.
                </div>
            )}

            {/* Results */}
            {data && !isPending && (
                <div className="px-5 py-5 space-y-5 animate-fade-in">
                    {/* Risk + Summary */}
                    <div className="flex items-start gap-4">
                        {risk && (
                            <div className="flex-shrink-0 px-4 py-3 rounded-xl text-center"
                                style={{ backgroundColor: risk.bg, color: risk.color }}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider">Risque</p>
                                <p className="text-xl font-black">{risk.label}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Synthèse</p>
                            <p className="text-sm text-[var(--text-primary)]">{data.summary}</p>
                            {data.top_finding && (
                                <p className="mt-2 text-xs font-semibold text-[var(--danger)] flex items-center gap-1">
                                    <span>🔺</span> {data.top_finding}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Patterns */}
                    {data.patterns.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                Patterns détectés ({data.patterns.length})
                            </p>
                            {data.patterns.map((p, i) => (
                                <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-semibold text-sm text-[var(--text-primary)]">{p.pattern_type}</p>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--danger)]/10 text-[var(--danger)] font-semibold">
                                            {p.frequency}× détecté
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <p className="text-[10px] text-[var(--text-muted)] mb-1">Chauffeurs concernés</p>
                                            <div className="flex flex-wrap gap-1">
                                                {p.affected_drivers.map((d, j) => (
                                                    <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-secondary)]">
                                                        {d}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[var(--text-muted)] mb-1">Sites concernés</p>
                                            <div className="flex flex-wrap gap-1">
                                                {p.affected_sites.map((s, j) => (
                                                    <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-secondary)]">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                                        <span className="text-sm">💡</span>
                                        <p className="text-xs text-[var(--text-secondary)]">{p.recommendation}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-[var(--success)]">
                            <span>✅</span> Aucun pattern problématique détecté sur la période.
                        </div>
                    )}

                    <p className="text-[10px] text-[var(--text-muted)] text-right">
                        Généré par Gemini 3.1 Flash Lite · Résultat indicatif
                    </p>
                </div>
            )}

            {/* Idle state */}
            {!data && !isPending && !error && (
                <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                    <p className="text-2xl mb-2">🔍</p>
                    <p>Lancez l'analyse pour que Gemini détecte les patterns de rejets S2L<br />
                        et identifie les risques systémiques sur votre flotte.</p>
                </div>
            )}
        </div>
    );
}
