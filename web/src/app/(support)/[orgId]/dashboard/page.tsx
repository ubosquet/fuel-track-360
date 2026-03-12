'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface OrgContext {
    organization_id: string;
    ticket_ref: string;
    redeemed_by_email: string;
}

// Reusable stat card component for the read-only support view
function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icon}</span>
                <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    );
}

export default function SupportOrgDashboard() {
    const router = useRouter();
    const params = useParams();
    const orgId = params.orgId as string;

    const [ctx, setCtx] = useState<OrgContext | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const jwt = sessionStorage.getItem('support_jwt');
        const storedOrg = sessionStorage.getItem('support_org_id');

        if (!jwt || storedOrg !== orgId) {
            router.replace('/support/session');
            return;
        }

        setCtx({
            organization_id: sessionStorage.getItem('support_org_id') ?? '',
            ticket_ref: sessionStorage.getItem('support_ticket') ?? '',
            redeemed_by_email: '',
        });

        // Fetch analytics overview using the support JWT
        api.get(`/analytics/overview?from=${thirtyDaysAgo()}`, {
            headers: { Authorization: `Bearer ${jwt}` },
        })
            .then((res: any) => setStats(res?.data ?? res))
            .catch((err: any) => setError(err?.response?.data?.message ?? 'Erreur de chargement'))
            .finally(() => setLoading(false));
    }, [orgId, router]);

    const thirtyDaysAgo = () => {
        const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">
                Chargement des données client…
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-[var(--danger)]">
                <p className="text-2xl mb-2">⚠️</p>
                <p>{error}</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                    Vérifiez que le mode support est actif et que la session n'a pas expiré.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
            {/* Context banner */}
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-red-700 mb-1">
                    🎫 Session de support · Ticket {ctx?.ticket_ref}
                </p>
                <p className="text-xs text-red-600">
                    Organisation: <code className="font-mono">{orgId}</code> · Accès en lecture seule
                </p>
            </div>

            {/* Overview stats mirroring the customer dashboard */}
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Vue d'ensemble — 30 derniers jours</h2>
            {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Manifestes" value={stats.total_manifests ?? '—'} icon="📋" />
                    <StatCard label="Taux complétion" value={`${stats.completion_rate ?? '—'}%`} icon="✅" />
                    <StatCard label="Taux ponctualité" value={`${stats.on_time_rate ?? '—'}%`} icon="⏱️" />
                    <StatCard label="Chauffeurs actifs" value={stats.active_drivers ?? '—'} icon="👤" />
                </div>
            ) : (
                <p className="text-sm text-[var(--text-muted)]">Données non disponibles.</p>
            )}

            {/* Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { href: `/support/${orgId}/manifests`, icon: '📋', label: 'Manifestes' },
                    { href: `/support/${orgId}/drivers`, icon: '👤', label: 'Chauffeurs' },
                    { href: `/support/${orgId}/audit`, icon: '📜', label: 'Journal d\'audit' },
                ].map((item) => (
                    <a key={item.href} href={item.href}
                        className="flex items-center gap-3 px-5 py-4 rounded-xl border border-[var(--border)]
                                   bg-[var(--surface)] hover:border-red-400 hover:bg-red-50/50 transition-colors">
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-semibold text-sm text-[var(--text-primary)]">{item.label}</span>
                    </a>
                ))}
            </div>

            <p className="text-[10px] text-[var(--text-muted)] text-center">
                Toutes les consultations sont enregistrées dans le journal d'audit de l'organisation.
            </p>
        </div>
    );
}
