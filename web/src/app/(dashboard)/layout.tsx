'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthProvider } from '@/contexts/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 ml-[260px] transition-all duration-300">
                    <Header />
                    <main className="p-6">{children}</main>
                </div>
            </div>
        </AuthProvider>
    );
}
