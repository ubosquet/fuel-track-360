'use client';

import { useState } from 'react';
import { useSupportTokens, useCreateSupportToken, useRevokeSupportToken } from '@/hooks/useAI';
import type { SupportToken } from '@/hooks/useAI';

function TokenRow({ token, onRevoke }: { token: SupportToken; onRevoke: (id: string) => void }) {
    const isExpired = new Date() > new Date(token.expires_at);
    const isActive = !token.is_revoked && !isExpired && !token.redeemed_at;
    const isRedeemed = !!token.redeemed_at && !token.is_revoked;

    const statusConfig = {
        label: isRedeemed ? '✅ Utilisé' : isActive ? '🟢 Actif' : '⛔ Révoqué/Expiré',
        color: isRedeemed ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)',
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
            <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{token.ticket_ref}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: statusConfig.color, background: `${statusConfig.color}18` }}>
                        {statusConfig.label}
                    </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                    Généré par {token.created_by_name}
                    {token.redeemed_by_email && ` · Utilisé par ${token.redeemed_by_email}`}
                    {' · '}Expire le {new Date(token.expires_at).toLocaleString('fr-FR')}
                </p>
            </div>
            {isActive && (
                <button
                    onClick={() => onRevoke(token.id)}
                    className="ml-4 text-xs text-[var(--danger)] hover:underline flex-shrink-0"
                >
                    Révoquer
                </button>
            )}
        </div>
    );
}

export function SupportAccessCard() {
    const { data: tokens, isLoading } = useSupportTokens();
    const createMutation = useCreateSupportToken();
    const revokeMutation = useRevokeSupportToken();

    const [ticketRef, setTicketRef] = useState('');
    const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);
    const [showNewToken, setShowNewToken] = useState(false);
    const [copied, setCopied] = useState(false);

    const generate = async () => {
        if (!ticketRef.trim()) return;
        const result = await createMutation.mutateAsync(ticketRef.trim());
        setNewTokenRaw(result.raw_token);
        setShowNewToken(true);
        setTicketRef('');
    };

    const copy = async () => {
        if (!newTokenRaw) return;
        await navigator.clipboard.writeText(newTokenRaw);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">🔑</div>
                <div>
                    <h3 className="font-bold text-[var(--text-primary)]">Accès Support</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                        Générez un token unique pour qu'un ingénieur puisse reproduire un ticket
                    </p>
                </div>
            </div>

            {/* Generate form */}
            <div className="px-6 py-5 border-b border-[var(--border)]">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={ticketRef}
                        onChange={(e) => setTicketRef(e.target.value)}
                        placeholder="TICKET-1234"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)]
                                   text-[var(--text-primary)] text-sm focus:outline-none focus:border-red-500"
                    />
                    <button
                        onClick={generate}
                        disabled={!ticketRef.trim() || createMutation.isPending}
                        className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold
                                   hover:bg-red-700 disabled:opacity-60 transition-colors"
                    >
                        {createMutation.isPending ? '…' : 'Générer'}
                    </button>
                </div>

                {/* Token display — shown ONCE */}
                {showNewToken && newTokenRaw && (
                    <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-xs font-bold text-amber-800 mb-2">
                            ⚠️ Copiez ce token maintenant — il ne sera plus affiché !
                        </p>
                        <div className="flex gap-2">
                            <code className="flex-1 text-[11px] font-mono bg-white border border-amber-200 rounded-lg
                                           px-3 py-2 text-amber-900 break-all">
                                {newTokenRaw}
                            </code>
                            <button
                                onClick={copy}
                                className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                            >
                                {copied ? '✅' : '📋'}
                            </button>
                        </div>
                        <p className="text-[10px] text-amber-700 mt-2">
                            Envoyez ce token à l'équipe support. Il vous donnera accès en lecture seule pour 24h, une seule utilisation.
                        </p>
                        <button
                            onClick={() => { setShowNewToken(false); setNewTokenRaw(null); }}
                            className="mt-2 text-xs text-amber-700 underline"
                        >
                            J'ai copié le token — fermer
                        </button>
                    </div>
                )}
            </div>

            {/* Token list */}
            <div className="px-6 py-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wider">
                    Tokens récents
                </p>
                {isLoading ? (
                    <div className="text-sm text-[var(--text-muted)] animate-pulse">Chargement…</div>
                ) : tokens && tokens.length > 0 ? (
                    tokens.slice(0, 5).map((t) => (
                        <TokenRow
                            key={t.id}
                            token={t}
                            onRevoke={(id) => revokeMutation.mutate(id)}
                        />
                    ))
                ) : (
                    <p className="text-sm text-[var(--text-muted)]">Aucun token généré.</p>
                )}
            </div>
        </div>
    );
}
