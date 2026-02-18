'use client';

import { useState } from 'react';

const demoS2Ls = [
    { id: 'S2L-2026-0047', truck: 'AA-00001', driver: 'Jean Pierre', station: 'Terminal Thor', status: 'APPROVED', created: '2026-02-17T10:35:00', items_pass: true, photos: 4, signed: true },
    { id: 'S2L-2026-0046', truck: 'AA-00002', driver: 'Marie Claire', station: 'Station Delmas', status: 'SUBMITTED', created: '2026-02-17T09:12:00', items_pass: true, photos: 3, signed: true },
    { id: 'S2L-2026-0045', truck: 'AA-00003', driver: 'Paul Estimé', station: 'Terminal Nord', status: 'DRAFT', created: '2026-02-17T08:45:00', items_pass: false, photos: 1, signed: false },
    { id: 'S2L-2026-0044', truck: 'AA-00001', driver: 'Jean Pierre', station: 'Station Pétion', status: 'REJECTED', created: '2026-02-16T16:20:00', items_pass: true, photos: 3, signed: true },
    { id: 'S2L-2026-0043', truck: 'AA-00002', driver: 'Marie Claire', station: 'Terminal Thor', status: 'EXPIRED', created: '2026-02-15T07:30:00', items_pass: true, photos: 3, signed: true },
    { id: 'S2L-2026-0042', truck: 'AA-00003', driver: 'Paul Estimé', station: 'Station Carrefour', status: 'APPROVED', created: '2026-02-16T14:10:00', items_pass: true, photos: 5, signed: true },
];

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
    SUBMITTED: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    APPROVED: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    REJECTED: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
    EXPIRED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const filters = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED'];

export default function S2LPage() {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [selectedS2L, setSelectedS2L] = useState<string | null>(null);

    const filtered = activeFilter === 'ALL' ? demoS2Ls : demoS2Ls.filter((s) => s.status === activeFilter);

    return (
        <div className="space-y-6 max-w-[1400px]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">S2L Inspections</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Safe-to-Load checklist management</p>
                </div>
                <button className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold
          hover:bg-[var(--primary-light)] transition-all duration-200 shadow-md hover:shadow-lg
          flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New S2L
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {filters.map((f) => {
                    const count = f === 'ALL' ? demoS2Ls.length : demoS2Ls.filter((s) => s.status === f).length;
                    return (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                ${activeFilter === f
                                    ? 'bg-[var(--primary)] text-white shadow-md'
                                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                                }`}
                        >
                            {f} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                            {['S2L ID', 'Truck / Driver', 'Station', 'Status', 'Checks', 'Photos', 'Signature', 'Created', ''].map((col) => (
                                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {filtered.map((s2l, i) => {
                            const sc = statusConfig[s2l.status];
                            return (
                                <tr
                                    key={s2l.id}
                                    className="hover:bg-[var(--surface-hover)] transition-colors cursor-pointer animate-fade-in"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                    onClick={() => setSelectedS2L(s2l.id === selectedS2L ? null : s2l.id)}
                                >
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-semibold text-[var(--primary)]">{s2l.id}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{s2l.truck}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{s2l.driver}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{s2l.station}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                            {s2l.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-sm font-medium ${s2l.items_pass ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                            {s2l.items_pass ? '✓ Pass' : '✗ Fail'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-sm ${s2l.photos >= 3 ? 'text-[var(--text-secondary)]' : 'text-[var(--danger)]'}`}>
                                            📸 {s2l.photos}/3
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-sm ${s2l.signed ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                                            {s2l.signed ? '✍️ Signed' : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                                        {new Date(s2l.created).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                        <br />
                                        {new Date(s2l.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3">
                                        {s2l.status === 'SUBMITTED' && (
                                            <div className="flex gap-1">
                                                <button className="px-2 py-1 rounded-md bg-[var(--success)]/10 text-[var(--success)] text-xs font-semibold hover:bg-[var(--success)]/20 transition-colors">
                                                    Approve
                                                </button>
                                                <button className="px-2 py-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-semibold hover:bg-[var(--danger)]/20 transition-colors">
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
