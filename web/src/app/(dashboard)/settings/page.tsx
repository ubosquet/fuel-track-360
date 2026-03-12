'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization';
import {
    Settings, Building2, Globe, Bell, Palette, CreditCard,
    Save, X, Info, MapPin, Phone, Mail, CheckCircle,
} from 'lucide-react';
import type { Organization } from '@/types/organization';

// ── Notification helper (local to this page) ──────────────────────────────────

function usePageToast() {
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const show = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };
    return { toast, show };
}

// ── Field components ──────────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Field({
    label, name, value, onChange, disabled = false, type = 'text', hint, required = false,
}: {
    label: string; name: string; value: string; onChange: (name: string, value: string) => void;
    disabled?: boolean; type?: string; hint?: string; required?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
            </label>
            <input
                type={type}
                name={name}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(name, e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium
                    bg-[var(--background)] text-[var(--text-primary)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]
                    transition-all duration-200
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--surface)]' : ''}
                `}
                placeholder={`Ex: ${label}…`}
            />
            {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
        </div>
    );
}

function StaticField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</label>
            <div className={`px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm bg-[var(--surface)] opacity-70 ${mono ? 'font-mono' : ''}`}>
                {value}
            </div>
        </div>
    );
}

function SectionCard({ icon, title, desc, children }: {
    icon: React.ReactNode; title: string; desc: string; children: React.ReactNode;
}) {
    return (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border)]">
                <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">{icon}</div>
                <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">{title}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{desc}</p>
                </div>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}

const planVariants: Record<string, string> = {
    TRIAL: 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/20',
    STARTER: 'bg-[var(--info)]/15 text-[var(--info)] border-[var(--info)]/20',
    PROFESSIONAL: 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/20',
    ENTERPRISE: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/20',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { data: org, isLoading } = useOrganization();
    const updateOrg = useUpdateOrganization();
    const { toast, show } = usePageToast();

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<Partial<Organization>>({});

    // Populate form when org data loads
    useEffect(() => {
        if (org) setForm(org);
    }, [org]);

    const handleChange = (name: string, value: string) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (!form.name?.trim()) { show('error', 'Le nom de l\'organisation est requis.'); return; }
        updateOrg.mutate(form as Organization, {
            onSuccess: () => { show('success', 'Paramètres sauvegardés avec succès.'); setEditing(false); },
            onError: (err: any) => show('error', err?.response?.data?.message ?? 'Erreur lors de la sauvegarde.'),
        });
    };

    const handleCancel = () => {
        if (org) setForm(org);
        setEditing(false);
    };

    const planLabel = (org as any)?.subscription_plan ?? 'TRIAL';
    const planCss = planVariants[planLabel] ?? planVariants.TRIAL;

    return (
        <div className="space-y-6 max-w-[960px]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[var(--primary)]/10 rounded-xl text-[var(--primary)]">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Paramètres</h1>
                        <p className="text-xs text-[var(--text-muted)]">Configurez votre organisation et vos préférences</p>
                    </div>
                </div>

                {!editing ? (
                    <button
                        onClick={() => setEditing(true)}
                        className="px-5 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold
                            text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all flex items-center gap-2"
                    >
                        <Palette className="w-4 h-4" />
                        Modifier
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold
                                text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-all flex items-center gap-2"
                        >
                            <X className="w-4 h-4" /> Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={updateOrg.isPending}
                            className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold
                                hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-60"
                        >
                            {updateOrg.isPending
                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <Save className="w-4 h-4" />
                            }
                            Sauvegarder
                        </button>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-2
                    ${toast.type === 'success'
                        ? 'bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]'
                        : 'bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]'
                    }`
                }>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {toast.msg}
                </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-[var(--surface)] rounded-2xl border border-[var(--border)] animate-pulse" />
                    ))}
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Subscription plan banner */}
                    <div className={`rounded-2xl border px-5 py-4 flex items-center justify-between ${planCss}`}>
                        <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5" />
                            <div>
                                <p className="text-sm font-bold">Plan {planLabel}</p>
                                <p className="text-xs opacity-75">
                                    Statut: {(org as any)?.subscription_status ?? 'ACTIVE'}
                                    {(org as any)?.trial_ends_at &&
                                        ` · Expire le ${new Date((org as any).trial_ends_at).toLocaleDateString('fr-FR')}`}
                                </p>
                            </div>
                        </div>
                        <span className="text-xs font-bold border border-current rounded-full px-3 py-1 opacity-80">
                            {(org as any)?.max_users ?? 10} utilisateurs max
                        </span>
                    </div>

                    {/* Organization info */}
                    <SectionCard
                        icon={<Building2 className="w-4 h-4" />}
                        title="Organisation"
                        desc="Informations générales sur votre entreprise"
                    >
                        <div className="space-y-5">
                            <FieldGroup>
                                <Field label="Nom" name="name" value={form.name ?? ''} onChange={handleChange} disabled={!editing} required />
                                <StaticField label="Code organisation" value={form.code ?? '—'} mono />
                            </FieldGroup>
                            <FieldGroup>
                                <StaticField label="Pays" value={form.country ?? 'HTI'} />
                                <StaticField label="Devise" value={form.currency ?? 'HTG'} />
                            </FieldGroup>
                            <StaticField label="Fuseau horaire" value={form.timezone ?? 'America/Port-au-Prince'} />
                        </div>
                    </SectionCard>

                    {/* Contact info */}
                    <SectionCard
                        icon={<MapPin className="w-4 h-4" />}
                        title="Contact & Localisation"
                        desc="Coordonnées de votre siège"
                    >
                        <div className="space-y-5">
                            <Field
                                label="Adresse"
                                name="address"
                                value={(form as any).address ?? ''}
                                onChange={handleChange}
                                disabled={!editing}
                                hint="Adresse physique du siège social"
                            />
                            <FieldGroup>
                                <Field
                                    label="Téléphone"
                                    name="phone"
                                    value={(form as any).phone ?? ''}
                                    onChange={handleChange}
                                    disabled={!editing}
                                    type="tel"
                                />
                                <Field
                                    label="Email de facturation"
                                    name="billing_email"
                                    value={(form as any).billing_email ?? ''}
                                    onChange={handleChange}
                                    disabled={!editing}
                                    type="email"
                                />
                            </FieldGroup>
                            <FieldGroup>
                                <Field
                                    label="Site web"
                                    name="website"
                                    value={(form as any).website ?? ''}
                                    onChange={handleChange}
                                    disabled={!editing}
                                    type="url"
                                />
                                <Field
                                    label="Secteur d'activité"
                                    name="industry"
                                    value={(form as any).industry ?? ''}
                                    onChange={handleChange}
                                    disabled={!editing}
                                    hint="Ex: Pétrolier, Transport"
                                />
                            </FieldGroup>
                        </div>
                    </SectionCard>

                    {/* App preferences (static for now) */}
                    <SectionCard
                        icon={<Bell className="w-4 h-4" />}
                        title="Préférences de l'application"
                        desc="Paramètres locaux (stockés dans votre navigateur)"
                    >
                        <div className="space-y-3">
                            {[
                                { label: 'Langue', value: 'Français (fr)', icon: '🌍' },
                                { label: 'Thème', value: 'Système (auto)', icon: '🎨' },
                                { label: 'Notifications push', value: 'Activées', icon: '🔔' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{item.icon}</span>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* Info */}
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-1">
                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                        Les champs grisés ne peuvent être modifiés que par le support FT360. Contactez-nous via votre portail d'aide.
                    </div>
                </>
            )}
        </div>
    );
}

