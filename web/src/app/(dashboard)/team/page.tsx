'use client';

import { useState } from 'react';
import { useMemberRequests, useApproveRequest, useRejectRequest, useInviteData, useGenerateInvite, useRevokeInvite } from '@/hooks/useOnboarding';
import type { MemberRequest } from '@/hooks/useOnboarding';

const ROLE_LABELS: Record<string, string> = {
    DRIVER: '🚛 Chauffeur', DISPATCHER: '📋 Dispatcher', FINANCE: '💰 Finance',
    SUPERVISOR: '👁️ Superviseur', ANALYST: '📊 Analyste',
};

// ─── Invite panel ─────────────────────────────────────────────────────────────

function InvitePanel() {
    const { data, isLoading } = useInviteData();
    const generate = useGenerateInvite();
    const revoke = useRevokeInvite();
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        if (!data?.url) return;
        await navigator.clipboard.writeText(data.url);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="font-bold text-[var(--text-primary)]">🔗 Lien d'invitation</h2>
                    <p className="text-xs text-[var(--text-muted)]">Partagez ce lien ou QR code pour inviter votre équipe</p>
                </div>
                <button onClick={() => generate.mutate({})} disabled={generate.isPending}
                    className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-60">
                    {generate.isPending ? '…' : data?.invite ? '🔄 Renouveler' : '✨ Générer'}
                </button>
            </div>

            {isLoading && <div className="h-20 bg-[var(--border)] animate-pulse rounded-xl" />}

            {data?.url && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <code className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs break-all text-[var(--text-secondary)]">
                            {data.url}
                        </code>
                        <button onClick={copy}
                            className="px-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] text-sm">
                            {copied ? '✅' : '📋'}
                        </button>
                    </div>

                    {data.qr_data_url && (
                        <div className="flex justify-center">
                            <div className="p-3 bg-white rounded-xl border border-[var(--border)]">
                                <img src={data.qr_data_url} alt="QR Code" className="w-40 h-40" />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Utilisé {data.invite?.join_count ?? 0} fois</span>
                        <button onClick={() => revoke.mutate()} className="text-[var(--danger)] hover:underline">
                            Révoquer le lien
                        </button>
                    </div>
                </div>
            )}

            {!isLoading && !data?.url && (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    Aucun lien actif. Cliquez "Générer" pour créer votre lien.
                </p>
            )}
        </div>
    );
}

// ─── Request row ─────────────────────────────────────────────────────────────

function RequestRow({ req, onApprove, onReject }: {
    req: MemberRequest;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-[var(--border)] last:border-0">
            <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{req.full_name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
                        {ROLE_LABELS[req.role_requested] ?? req.role_requested}
                    </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                    {req.email}
                    {req.job_title && ` · ${req.job_title}`}
                    {' · '}Demandé {new Date(req.created_at).toLocaleDateString('fr-FR')}
                </p>
            </div>
            <div className="flex gap-2 ml-4 flex-shrink-0">
                <button onClick={() => onApprove(req.id)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--success)]/15 text-[var(--success)] text-xs font-bold hover:bg-[var(--success)]/25">
                    ✓ Approuver
                </button>
                <button onClick={() => onReject(req.id)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-bold hover:bg-[var(--danger)]/20">
                    ✕ Refuser
                </button>
            </div>
        </div>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MemberRequestsPage() {
    const { data: requests, isLoading } = useMemberRequests();
    const approveMutation = useApproveRequest();
    const rejectMutation = useRejectRequest();

    const pending = requests?.filter(r => r.status === 'PENDING') ?? [];
    const reviewed = requests?.filter(r => r.status !== 'PENDING') ?? [];

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestion de l'équipe</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Gérez les invitations et approuvez les nouvelles demandes d'adhésion.</p>
            </div>

            <InvitePanel />

            {/* Pending requests */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                    <h2 className="font-bold text-[var(--text-primary)]">📬 Demandes en attente</h2>
                    {pending.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--warning)]/15 text-[var(--warning)] font-bold">
                            {pending.length} nouvelle{pending.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="px-6">
                    {isLoading && <div className="py-6 text-center text-sm text-[var(--text-muted)] animate-pulse">Chargement…</div>}
                    {!isLoading && pending.length === 0 && (
                        <p className="py-6 text-center text-sm text-[var(--text-muted)]">✅ Aucune demande en attente.</p>
                    )}
                    {pending.map(req => (
                        <RequestRow
                            key={req.id}
                            req={req}
                            onApprove={(id) => approveMutation.mutate({ id })}
                            onReject={(id) => rejectMutation.mutate({ id })}
                        />
                    ))}
                </div>
            </div>

            {/* Recently reviewed */}
            {reviewed.length > 0 && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border)]">
                        <h2 className="font-bold text-[var(--text-primary)]">📋 Traitées récemment</h2>
                    </div>
                    <div className="px-6">
                        {reviewed.slice(0, 10).map(req => (
                            <div key={req.id} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{req.full_name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{req.email}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${req.status === 'APPROVED'
                                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                                        : 'bg-[var(--danger)]/10 text-[var(--danger)]'
                                    }`}>
                                    {req.status === 'APPROVED' ? '✅ Approuvé' : '❌ Refusé'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
