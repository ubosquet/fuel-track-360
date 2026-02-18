'use client';

import { useState } from 'react';

const demoEvents = [
    { id: '1', type: 'S2L_APPROVED', entity: 'S2L-2026-0047', actor: 'Georges Admin', role: 'SUPERVISOR', time: '2026-02-17T10:48:00', detail: 'Approved — all checks passed' },
    { id: '2', type: 'MANIFEST_CREATED', entity: 'FT360-20260217-0012', actor: 'System', role: 'SYSTEM', time: '2026-02-17T11:00:00', detail: 'Auto-created from approved S2L' },
    { id: '3', type: 'MANIFEST_FLAGGED', entity: 'FT360-20260216-0010', actor: 'System', role: 'SYSTEM', time: '2026-02-16T16:30:00', detail: '⚠️ Volume variance 3.2% exceeds threshold' },
    { id: '4', type: 'S2L_REJECTED', entity: 'S2L-2026-0044', actor: 'Georges Admin', role: 'SUPERVISOR', time: '2026-02-16T16:25:00', detail: 'Rejected — broken seal compartment 2' },
    { id: '5', type: 'GEOFENCE_ALERT', entity: 'AA-00003', actor: 'System', role: 'SYSTEM', time: '2026-02-16T15:10:00', detail: '⚠️ Outside geofence — 450m from station' },
    { id: '6', type: 'SYNC_BATCH', entity: 'batch-091', actor: 'Marie Claire', role: 'DRIVER', time: '2026-02-17T09:00:00', detail: 'Synced 5 offline operations' },
    { id: '7', type: 'USER_LOGIN', entity: 'user-001', actor: 'Jean Pierre', role: 'DRIVER', time: '2026-02-17T07:00:00', detail: 'Mobile login from Port-au-Prince' },
];

const icons: Record<string, string> = {
    S2L_APPROVED: '✅', S2L_REJECTED: '❌', MANIFEST_CREATED: '📦',
    MANIFEST_FLAGGED: '🚩', GEOFENCE_ALERT: '⚠️', SYNC_BATCH: '🔄', USER_LOGIN: '🔑',
};

export default function AuditPage() {
    const [filter, setFilter] = useState('ALL');
    const filters = ['ALL', 'S2L', 'MANIFEST', 'FLEET', 'AUTH'];

    return (
        <div className="space-y-6 max-w-[1200px]">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Log</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Immutable record of all system events</p>
            </div>

            <div className="flex gap-2">
                {filters.map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f
                            ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--primary)]'}`}>
                        {f}
                    </button>
                ))}
            </div>

            <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-[var(--border)]" />
                {demoEvents.map((e, i) => (
                    <div key={e.id} className="relative py-3 hover:bg-[var(--surface-hover)] rounded-lg px-3 transition-colors animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                        <div className="absolute left-[-17px] top-4 text-sm">{icons[e.type] || '📝'}</div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{e.type.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background)] text-[var(--text-muted)] font-mono">{e.entity}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">{e.detail}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">👤 {e.actor} • {e.role} • 🕐 {new Date(e.time).toLocaleString('fr-FR')}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
