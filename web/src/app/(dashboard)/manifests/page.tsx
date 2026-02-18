'use client';

import { useState } from 'react';

const demoManifests = [
    { number: 'FT360-20260217-0012', product: 'DIESEL', volumeLoaded: 20000, volumeDischarged: null, variance: null, origin: 'Terminal Thor', dest: 'Station Delmas', driver: 'Jean Pierre', truck: 'AA-00001', status: 'IN_TRANSIT', s2l: 'S2L-2026-0047', created: '2026-02-17T11:00:00' },
    { number: 'FT360-20260217-0011', product: 'GASOLINE_91', volumeLoaded: 15000, volumeDischarged: 14880, variance: 0.8, origin: 'Terminal Nord', dest: 'Station Pétion', driver: 'Marie Claire', truck: 'AA-00002', status: 'COMPLETED', s2l: 'S2L-2026-0046', created: '2026-02-17T08:30:00' },
    { number: 'FT360-20260216-0010', product: 'DIESEL', volumeLoaded: 18500, volumeDischarged: 17908, variance: 3.2, origin: 'Terminal Thor', dest: 'Station Carrefour', driver: 'Paul Estimé', truck: 'AA-00003', status: 'FLAGGED', s2l: 'S2L-2026-0042', created: '2026-02-16T14:30:00' },
    { number: 'FT360-20260216-0009', product: 'KEROSENE', volumeLoaded: 12000, volumeDischarged: 11940, variance: 0.5, origin: 'Terminal Thor', dest: 'Station Delmas', driver: 'Jean Pierre', truck: 'AA-00001', status: 'COMPLETED', s2l: 'S2L-2026-0041', created: '2026-02-16T07:15:00' },
    { number: 'FT360-20260215-0008', product: 'DIESEL', volumeLoaded: 20000, volumeDischarged: null, variance: null, origin: 'Terminal Nord', dest: 'Station Pétion', driver: 'Marie Claire', truck: 'AA-00002', status: 'LOADING', s2l: 'S2L-2026-0040', created: '2026-02-15T13:00:00' },
];

const statusSteps = ['CREATED', 'LOADING', 'IN_TRANSIT', 'DISCHARGING', 'COMPLETED'];

const statusColors: Record<string, string> = {
    CREATED: 'bg-slate-500',
    LOADING: 'bg-amber-500',
    IN_TRANSIT: 'bg-blue-500',
    DISCHARGING: 'bg-purple-500',
    COMPLETED: 'bg-emerald-500',
    FLAGGED: 'bg-red-500',
};

export default function ManifestsPage() {
    const [selected, setSelected] = useState<typeof demoManifests[0] | null>(null);

    return (
        <div className="space-y-6 max-w-[1400px]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Delivery Manifests</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Track fuel deliveries from terminal to station</p>
                </div>
                <button className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold
          hover:bg-[var(--primary-light)] transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Manifest
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Total', count: demoManifests.length, color: 'var(--text-secondary)' },
                    { label: 'In Transit', count: demoManifests.filter((m) => m.status === 'IN_TRANSIT').length, color: 'var(--primary)' },
                    { label: 'Loading', count: demoManifests.filter((m) => m.status === 'LOADING').length, color: 'var(--warning)' },
                    { label: 'Completed', count: demoManifests.filter((m) => m.status === 'COMPLETED').length, color: 'var(--success)' },
                    { label: 'Flagged', count: demoManifests.filter((m) => m.status === 'FLAGGED').length, color: 'var(--danger)' },
                ].map((s) => (
                    <div key={s.label} className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 text-center">
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</p>
                        <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Manifests List */}
                <div className="xl:col-span-2 space-y-3">
                    {demoManifests.map((m, i) => {
                        const stepIndex = statusSteps.indexOf(m.status);
                        return (
                            <div
                                key={m.number}
                                className={`bg-[var(--surface)] rounded-xl border transition-all duration-200 cursor-pointer
                  animate-fade-in hover:shadow-md
                  ${selected?.number === m.number ? 'border-[var(--primary)] shadow-md' : 'border-[var(--border)]'}`}
                                style={{ animationDelay: `${i * 60}ms` }}
                                onClick={() => setSelected(m)}
                            >
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-8 rounded-full ${statusColors[m.status]}`} />
                                            <div>
                                                <p className="text-sm font-bold text-[var(--text-primary)]">{m.number}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{m.origin} → {m.dest}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                        ${m.status === 'FLAGGED' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    m.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusColors[m.status]}`} />
                                                {m.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Pipeline */}
                                    <div className="flex items-center gap-1 mb-3">
                                        {statusSteps.map((step, si) => (
                                            <div
                                                key={step}
                                                className={`h-1 flex-1 rounded-full transition-colors duration-500
                          ${si <= stepIndex && m.status !== 'FLAGGED' ? 'bg-[var(--primary)]' :
                                                        m.status === 'FLAGGED' ? 'bg-[var(--danger)]' : 'bg-[var(--border)]'}`}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                        <span>🚛 {m.truck}</span>
                                        <span>👤 {m.driver}</span>
                                        <span>⛽ {m.product.replace('_', ' ')}</span>
                                        <span>📦 {m.volumeLoaded.toLocaleString()} L</span>
                                        {m.variance !== null && (
                                            <span className={`font-semibold ${m.variance > 2 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                                                {m.variance > 2 ? '⚠️' : '✓'} {m.variance}% variance
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detail Panel */}
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 h-fit sticky top-20">
                    {selected ? (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="font-bold text-[var(--text-primary)]">{selected.number}</h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Product', value: selected.product.replace('_', ' ') },
                                    { label: 'S2L Reference', value: selected.s2l },
                                    { label: 'Truck', value: selected.truck },
                                    { label: 'Driver', value: selected.driver },
                                    { label: 'Origin', value: selected.origin },
                                    { label: 'Destination', value: selected.dest },
                                    { label: 'Volume Loaded', value: `${selected.volumeLoaded.toLocaleString()} L` },
                                    ...(selected.volumeDischarged ? [{ label: 'Volume Discharged', value: `${selected.volumeDischarged.toLocaleString()} L` }] : []),
                                ].map((item) => (
                                    <div key={item.label} className="flex justify-between">
                                        <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">{item.value}</span>
                                    </div>
                                ))}
                                {selected.variance !== null && (
                                    <div className={`p-3 rounded-lg ${selected.variance > 2 ? 'bg-[var(--danger)]/10 border border-[var(--danger)]/20' : 'bg-[var(--success)]/10 border border-[var(--success)]/20'}`}>
                                        <p className={`text-sm font-bold ${selected.variance > 2 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                                            {selected.variance > 2 ? '⚠️ Variance Alert' : '✓ Within Tolerance'}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                                            {selected.variance}% — {selected.variance > 2 ? 'Exceeds 2% threshold' : 'Under 2% threshold'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-4xl mb-3">📋</p>
                            <p className="text-sm text-[var(--text-muted)]">Select a manifest to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
