'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <NotificationsProvider>
                <div className="flex h-screen overflow-hidden bg-[var(--background)]">
                    {/* Fixed Sidebar */}
                    <aside className="w-64 border-r border-[var(--border)] bg-[var(--surface)] hidden md:flex md:flex-col">
                        <Sidebar />
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <Header />
                        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[var(--background)] text-[var(--text-primary)]">
                            {children}
                        </main>
                        <TutorialOverlay />
                    </div>
                </div>
            </NotificationsProvider>
        </AuthProvider>
    );
}

