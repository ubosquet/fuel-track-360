'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useResolveInvite, useJoinOrg } from '@/hooks/useOnboarding';

const ROLE_LABELS: Record<string, string> = {
    DRIVER: '🚛 Chauffeur',
    DISPATCHER: '📋 Dispatcher',
    FINANCE: '💰 Finance',
    SUPERVISOR: '👁️ Superviseur',
    ANALYST: '📊 Analyste',
};

export default function JoinPage() {
    const { token } = useParams<{ token: string }>();
    const { data: org, isLoading: orgLoading, error: orgError } = useResolveInvite(token);
    const joinMutation = useJoinOrg();

    const [form, setForm] = useState({
        full_name: '', email: '', phone: '', job_title: '', role_requested: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(p => ({ ...p, [k]: e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        await joinMutation.mutateAsync({ ...form, invite_token: token });
        setSubmitted(true);
    };

    const allowedRoles = org?.allowed_roles ?? Object.keys(ROLE_LABELS);

    if (orgLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (orgError || !org) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-5xl mb-4">🔗</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">Lien invalide</p>
                    <p className="text-sm text-[var(--text-muted)] mt-2">
                        Ce lien d'invitation a expiré ou a été révoqué.<br />
                        Contactez votre organisation pour un nouveau lien.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <p className="text-5xl mb-4">✅</p>
                    <p className="text-xl font-bold text-[var(--text-primary)] mb-2">Demande envoyée !</p>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        Votre demande d'adhésion à <strong>{org.org_name}</strong> a bien été reçue.<br />
                        Un administrateur examinera votre demande et vous contactera par email.
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-4">Vous pouvez fermer cette page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--primary)]/5 to-[var(--bg)] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Org header */}
                <div className="text-center mb-6">
                    {org.logo_url ? (
                        <img src={org.logo_url} alt={org.org_name} className="w-16 h-16 rounded-xl mx-auto mb-3 object-contain" />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center text-3xl mx-auto mb-3">⛽</div>
                    )}
                    <h1 className="text-xl font-black text-[var(--text-primary)]">Rejoindre {org.org_name}</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Remplissez ce formulaire pour demander l'accès.</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-7 shadow-lg">
                    <form onSubmit={submit} className="space-y-4">
                        {[
                            { k: 'full_name', label: 'Nom complet *', type: 'text', placeholder: 'Jean Dupont' },
                            { k: 'email', label: 'Email *', type: 'email', placeholder: 'jean@exemple.ht' },
                            { k: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+509 2222 3333' },
                            { k: 'job_title', label: 'Titre / Poste', type: 'text', placeholder: 'Chauffeur Citerne' },
                        ].map(({ k, label, type, placeholder }) => (
                            <div key={k}>
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{label}</label>
                                <input required={label.includes('*')} type={type} value={(form as any)[k]} onChange={f(k as any)}
                                    placeholder={placeholder}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            </div>
                        ))}

                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Rôle demandé *</label>
                            <select required value={form.role_requested} onChange={f('role_requested')}
                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)]">
                                <option value="">— Choisir un rôle —</option>
                                {allowedRoles.map(r => (
                                    <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                                ))}
                            </select>
                        </div>

                        {joinMutation.error && (
                            <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/5 px-3 py-2 rounded-lg">
                                ⚠️ {(joinMutation.error as any)?.response?.data?.message ?? 'Erreur lors de l\'envoi.'}
                            </p>
                        )}

                        <button type="submit" disabled={joinMutation.isPending}
                            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                            {joinMutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {joinMutation.isPending ? 'Envoi…' : 'Soumettre ma demande'}
                        </button>
                    </form>
                </div>

                <p className="text-[10px] text-center text-[var(--text-muted)] mt-4">
                    Fuel-Track-360 · Lien d'invitation sécurisé
                </p>
            </div>
        </div>
    );
}
