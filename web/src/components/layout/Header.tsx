'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Bell, Check, X, BellOff, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Header() {
    const { user } = useAuth();
    const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();
    const [showNotifs, setShowNotifs] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close popover when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setShowNotifs(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                <div className="relative" ref={popoverRef}>
                    <button
                        onClick={() => setShowNotifs(!showNotifs)}
                        className={`relative p-2 rounded-lg transition-colors ${showNotifs ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[var(--danger)] border-2 border-[var(--surface)] animate-pulse" />
                        )}
                    </button>

                    {/* Popover */}
                    {showNotifs && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]/50">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAllRead()}
                                        className="text-xs text-[var(--primary)] font-medium hover:underline flex items-center gap-1"
                                    >
                                        <Check className="w-3 h-3" />
                                        Tout marquer lu
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                        <div className="w-12 h-12 rounded-full bg-[var(--background)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
                                            <BellOff className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune notification</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">Vous êtes à jour !</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--border)]">
                                        {notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`p-4 relative group transition-colors hover:bg-[var(--surface-hover)]
                                                    ${!notif.read ? 'bg-[var(--primary)]/5' : ''}`}
                                            >
                                                {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary)]" />}

                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0 pb-1">
                                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{notif.title}</p>
                                                        {notif.message && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{notif.message}</p>}
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium uppercase tracking-wider">
                                                            {formatDistanceToNow(notif.at)} ago
                                                        </p>
                                                        {notif.action && (
                                                            <a href={notif.action.href} className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary)] font-medium bg-[var(--primary)]/10 px-2.5 py-1 rounded-md hover:bg-[var(--primary)]/20 transition-colors">
                                                                {notif.action.label}
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                                                        className="text-[var(--text-muted)] hover:text-[var(--danger)] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--background)] shadow-sm border border-[var(--border)]"
                                                        title="Dismiss"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Language (stub) */}
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

