'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-6 sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                        {getGreeting()}, {user?.displayName?.split(' ')[0] || 'Admin'}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                        {user?.organizationName || 'Fuel-Track-360'} • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden md:block">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-64 pl-9 pr-4 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)]
              text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]
              transition-all duration-200"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
                    <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse" />
                </button>

                {/* Language */}
                <select className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[var(--text-secondary)] focus:outline-none">
                    <option value="fr">🇫🇷 FR</option>
                    <option value="en">🇺🇸 EN</option>
                    <option value="ht">🇭🇹 HT</option>
                </select>
            </div>
        </header>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
}
