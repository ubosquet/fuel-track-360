import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Support Mode — Fuel-Track-360',
    robots: 'noindex, nofollow',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[var(--bg)]">
            {/* Support mode banner */}
            <div className="sticky top-0 z-50 w-full bg-red-600 text-white px-6 py-2 flex items-center justify-between text-sm font-semibold shadow-lg">
                <div className="flex items-center gap-2">
                    <span className="animate-pulse">🔴</span>
                    SUPPORT MODE — Accès en lecture seule · Toutes les actions sont journalisées
                </div>
                <a href="/" className="underline text-white/80 hover:text-white text-xs">
                    Quitter le mode support
                </a>
            </div>
            <main>{children}</main>
        </div>
    );
}
