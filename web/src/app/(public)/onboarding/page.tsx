'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import api from '@/lib/api';

// ─── Step types ────────────────────────────────────────────────────────────

interface PlanStepData { plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' }
interface CompanyStepData {
    org_name: string; org_code: string; industry: string;
    country: string; phone: string; domain: string; website: string; address: string;
}
interface LogoStepData { logo_url: string }
interface AccountStepData { owner_full_name: string; owner_email: string; password: string; preferred_lang: 'fr' | 'en' | 'ht' }

const PLANS = [
    { id: 'TRIAL', name: 'Essai Gratuit', price: '0', desc: '14 jours, 10 utilisateurs, 5 chauffeurs', icon: '🎯' },
    { id: 'STARTER', name: 'Starter', price: '49', desc: '50 utilisateurs, 25 chauffeurs, analytics de base', icon: '🚀' },
    { id: 'PROFESSIONAL', name: 'Professionnel', price: '149', desc: '200 utilisateurs, IA incluse, support prioritaire', icon: '⭐' },
    { id: 'ENTERPRISE', name: 'Entreprise', price: 'Sur devis', desc: 'Illimité, SLA garanti, intégrations personnalisées', icon: '🏢' },
] as const;

const STEPS = ['Plan', 'Entreprise', 'Logo', 'Compte', 'Succès'] as const;

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-1 justify-center mb-8">
            {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-1">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all
                        ${i < current ? 'bg-[var(--primary)] text-white'
                            : i === current ? 'bg-[var(--primary)] text-white ring-4 ring-[var(--primary)]/25'
                                : 'bg-[var(--border)] text-[var(--text-muted)]'}`}>
                        {i < current ? '✓' : i + 1}
                    </div>
                    <span className={`hidden sm:block text-xs ${i === current ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                        {label}
                    </span>
                    {i < STEPS.length - 1 && <div className="w-6 h-px bg-[var(--border)] mx-1" />}
                </div>
            ))}
        </div>
    );
}

// ─── Step 1: Plan ──────────────────────────────────────────────────────────

function PlanStep({ onNext }: { onNext: (d: PlanStepData) => void }) {
    const [selected, setSelected] = useState<PlanStepData['plan']>('TRIAL');
    return (
        <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Choisissez votre plan</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">Commencez par l'essai gratuit — aucune carte requise.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
                {PLANS.map(p => (
                    <button key={p.id} onClick={() => setSelected(p.id as PlanStepData['plan'])}
                        className={`p-4 rounded-xl border-2 text-left transition-all
                            ${selected === p.id ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:border-[var(--primary)]/50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{p.icon}</span>
                            <span className="font-bold text-sm text-[var(--text-primary)]">{p.name}</span>
                        </div>
                        <p className="text-lg font-black text-[var(--primary)]">
                            {p.price === 'Sur devis' ? p.price : `${p.price}$/mois`}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{p.desc}</p>
                    </button>
                ))}
            </div>
            <button onClick={() => onNext({ plan: selected })}
                className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90">
                Continuer →
            </button>
        </div>
    );
}

// ─── Step 2: Company ───────────────────────────────────────────────────────

function CompanyStep({ onNext, onBack }: { onNext: (d: CompanyStepData) => void; onBack: () => void }) {
    const [form, setForm] = useState<CompanyStepData>({
        org_name: '', org_code: '', industry: '', country: 'HTI', phone: '', domain: '', website: '', address: ''
    });
    const f = (k: keyof CompanyStepData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));
    const valid = form.org_name.trim() && form.org_code.trim();

    return (
        <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Votre entreprise</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5">Informations de base sur votre organisation.</p>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { k: 'org_name', label: 'Nom de l\'organisation *', placeholder: 'Fuel Corp S.A.' },
                    { k: 'org_code', label: 'Code unique *', placeholder: 'FUELCORP' },
                    { k: 'industry', label: 'Secteur', placeholder: 'Petroleum Distribution' },
                    { k: 'phone', label: 'Téléphone', placeholder: '+509 2222 3333' },
                    { k: 'domain', label: 'Domaine', placeholder: 'fuelcorp.ht' },
                    { k: 'website', label: 'Site web', placeholder: 'https://fuelcorp.ht' },
                ].map(({ k, label, placeholder }) => (
                    <div key={k}>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{label}</label>
                        <input value={(form as any)[k]} onChange={f(k as any)} placeholder={placeholder}
                            className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                    </div>
                ))}
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Adresse</label>
                    <textarea value={form.address} onChange={f('address')} placeholder="Port-au-Prince, Haïti" rows={2}
                        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none" />
                </div>
            </div>
            <div className="flex gap-3 mt-6">
                <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface-hover)]">← Retour</button>
                <button onClick={() => valid && onNext(form)} disabled={!valid}
                    className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-bold disabled:opacity-50 hover:opacity-90">Continuer →</button>
            </div>
        </div>
    );
}

// ─── Step 3: Logo (skip-friendly) ────────────────────────────────────────

function LogoStep({ onNext, onBack }: { onNext: (d: LogoStepData) => void; onBack: () => void }) {
    return (
        <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Logo & Identité visuelle</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">Vous pourrez l'ajouter plus tard depuis les paramètres.</p>
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl mb-6 bg-[var(--surface-hover)]">
                <span className="text-4xl mb-3">🏢</span>
                <p className="text-sm text-[var(--text-muted)]">Upload logo — bientôt disponible</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface-hover)]">← Retour</button>
                <button onClick={() => onNext({ logo_url: '' })}
                    className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90">Passer →</button>
            </div>
        </div>
    );
}

// ─── Step 4: Owner Account ────────────────────────────────────────────────

function AccountStep({ onNext, onBack, loading, error }: { onNext: (d: AccountStepData) => void; onBack: () => void; loading: boolean; error: string | null }) {
    const [form, setForm] = useState<AccountStepData>({ owner_full_name: '', owner_email: '', password: '', preferred_lang: 'fr' });
    const f = (k: keyof AccountStepData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));
    const valid = form.owner_full_name && form.owner_email && form.password.length >= 8;

    return (
        <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Votre compte administrateur</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5">Vous serez le Super Admin de l'organisation.</p>
            <div className="space-y-4">
                {[
                    { k: 'owner_full_name', label: 'Nom complet *', type: 'text', placeholder: 'Jean Dupont' },
                    { k: 'owner_email', label: 'Email *', type: 'email', placeholder: 'jean@fuelcorp.ht' },
                    { k: 'password', label: 'Mot de passe * (min. 8 car.)', type: 'password', placeholder: '••••••••' },
                ].map(({ k, label, type, placeholder }) => (
                    <div key={k}>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{label}</label>
                        <input type={type} value={(form as any)[k]} onChange={f(k as any)} placeholder={placeholder}
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                    </div>
                ))}
                <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Langue préférée</label>
                    <select value={form.preferred_lang} onChange={f('preferred_lang')}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)]">
                        <option value="fr">🇫🇷 Français</option>
                        <option value="en">🇺🇸 English</option>
                        <option value="ht">🇭🇹 Kreyòl</option>
                    </select>
                </div>
            </div>
            {error && <p className="mt-3 text-sm text-[var(--danger)] bg-[var(--danger)]/5 px-3 py-2 rounded-lg">⚠️ {error}</p>}
            <div className="flex gap-3 mt-6">
                <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface-hover)]" disabled={loading}>← Retour</button>
                <button onClick={() => valid && onNext(form)} disabled={!valid || loading}
                    className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-bold disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2">
                    {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {loading ? 'Création…' : 'Créer mon organisation 🚀'}
                </button>
            </div>
        </div>
    );
}

// ─── Step 5: Success ──────────────────────────────────────────────────────

function SuccessStep({ orgName }: { orgName: string }) {
    const router = useRouter();
    return (
        <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-[var(--success)]/15 flex items-center justify-center text-4xl mx-auto mb-6">🎉</div>
            <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Bienvenue chez FT360 !</h2>
            <p className="text-[var(--text-secondary)] mb-2">
                <strong>{orgName}</strong> a été créée avec succès.
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-8">
                Votre période d'essai de 14 jours commence maintenant.<br />
                Invitez votre équipe depuis les Paramètres → Invitations.
            </p>
            <button onClick={() => router.push('/dashboard')}
                className="px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90 inline-block">
                Accéder au tableau de bord →
            </button>
        </div>
    );
}

// ─── Main wizard ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const [planData, setPlanData] = useState<PlanStepData>({ plan: 'TRIAL' });
    const [compData, setCompData] = useState<CompanyStepData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orgName, setOrgName] = useState('');

    const handleAccount = async (accData: AccountStepData) => {
        if (!compData) return;
        setLoading(true); setError(null);
        try {
            // 1. Create Firebase account
            const cred = await createUserWithEmailAndPassword(auth, accData.owner_email, accData.password);

            // 2. Call onboarding API
            await api.post('/onboarding/start', {
                ...compData,
                owner_full_name: accData.owner_full_name,
                owner_email: accData.owner_email,
                owner_firebase_uid: cred.user.uid,
                owner_preferred_lang: accData.preferred_lang,
            });

            setOrgName(compData.org_name);
            setStep(4);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--primary)]/5 via-[var(--bg)] to-[var(--bg)] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-xl">
                {/* Logo */}
                <div className="text-center mb-8">
                    <p className="text-xl font-black text-[var(--primary)]">⛽ Fuel-Track-360</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Créez votre organisation en 5 minutes</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl">
                    <StepIndicator current={step} />

                    {step === 0 && <PlanStep onNext={(d) => { setPlanData(d); setStep(1); }} />}
                    {step === 1 && <CompanyStep onNext={(d) => { setCompData(d); setStep(2); }} onBack={() => setStep(0)} />}
                    {step === 2 && <LogoStep onNext={() => setStep(3)} onBack={() => setStep(1)} />}
                    {step === 3 && <AccountStep onNext={handleAccount} onBack={() => setStep(2)} loading={loading} error={error} />}
                    {step === 4 && <SuccessStep orgName={orgName} />}
                </div>

                <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                    Déjà un compte ?{' '}
                    <a href="/login" className="text-[var(--primary)] hover:underline">Se connecter</a>
                </p>
            </div>
        </div>
    );
}
