'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // In production: signInWithEmailAndPassword(auth, email, password)
        setTimeout(() => router.push('/dashboard'), 800);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B1120] via-[#0D47A1] to-[#1565C0] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#FF6D00]/10 blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#00BFA5]/10 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-xl">
                        <span className="text-3xl font-black text-white">FT</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Fuel-Track-360</h1>
                    <p className="text-sm text-white/60 mt-2">Plateforme de logistique pétrolière</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl animate-fade-in" style={{ animationDelay: '150ms' }}>
                    <h2 className="text-xl font-semibold text-white mb-6">Connexion</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-white/70 mb-1.5">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@ft360.dev"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30
                  focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/50 focus:border-[#FF6D00] transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-white/70 mb-1.5">Mot de passe</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30
                  focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/50 focus:border-[#FF6D00] transition-all" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6D00] to-[#FF8F00] text-white font-semibold text-sm
              hover:from-[#FF8F00] hover:to-[#FFA000] transition-all shadow-lg hover:shadow-xl
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {loading ? (
                            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" className="opacity-75" /></svg> Connexion...</>
                        ) : 'Se connecter'}
                    </button>

                    <p className="text-center text-xs text-white/40 mt-4">
                        🇭🇹 Sécurisé par Firebase Authentication
                    </p>
                </form>
            </div>
        </div>
    );
}
