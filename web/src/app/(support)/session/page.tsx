'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function SupportSessionPage() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const redeem = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res: any = await api.post('/support/session', {
                raw_token: token.trim(),
                redeemed_by_email: email.trim(),
            });
            const data = res?.data ?? res;
            // Store support JWT in sessionStorage (clears on tab close)
            sessionStorage.setItem('support_jwt', data.support_jwt);
            sessionStorage.setItem('support_org_id', data.organization_id);
            sessionStorage.setItem('support_ticket', data.ticket_ref);
            router.push(`/support/${data.organization_id}/dashboard`);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Token invalide ou expiré.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-44px)] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🔑</span>
                    </div>

                    <h1 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-2">
                        Accès Support
                    </h1>
                    <p className="text-sm text-center text-[var(--text-muted)] mb-8">
                        Entrez le token fourni par le client pour accéder<br />
                        à ses données en lecture seule.
                    </p>

                    <form onSubmit={redeem} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                                Token de support
                            </label>
                            <textarea
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Collez le token ici…"
                                required
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]
                                           text-[var(--text-primary)] text-sm font-mono resize-none
                                           focus:outline-none focus:border-red-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                                Votre email (sera journalisé)
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="dev@fuel-track-360.io"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]
                                           text-[var(--text-primary)] text-sm
                                           focus:outline-none focus:border-red-500 transition-colors"
                            />
                        </div>

                        {error && (
                            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !token || !email}
                            className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-sm
                                       hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            )}
                            {loading ? 'Vérification…' : 'Accéder'}
                        </button>
                    </form>

                    <p className="mt-6 text-[10px] text-center text-[var(--text-muted)]">
                        L'accès est en lecture seule. Le token ne peut être utilisé qu'une seule fois.<br />
                        Votre email sera enregistré dans le journal d'audit du client.
                    </p>
                </div>
            </div>
        </div>
    );
}
