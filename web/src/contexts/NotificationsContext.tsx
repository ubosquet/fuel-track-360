'use client';

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    at: Date;
    read: boolean;
    action?: { label: string; href: string };
}

interface NotificationsContextValue {
    notifications: Notification[];
    unreadCount: number;
    push: (n: Omit<Notification, 'id' | 'at' | 'read'>) => void;
    markAllRead: () => void;
    dismiss: (id: string) => void;
    clearAll: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

let idCounter = 0;
const genId = () => `notif-${++idCounter}-${Date.now()}`;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const push = useCallback((n: Omit<Notification, 'id' | 'at' | 'read'>) => {
        const notif: Notification = { ...n, id: genId(), at: new Date(), read: false };
        setNotifications((prev) => [notif, ...prev].slice(0, 50)); // keep max 50
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const dismiss = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const clearAll = useCallback(() => setNotifications([]), []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationsContext.Provider value={{ notifications, unreadCount, push, markAllRead, dismiss, clearAll }}>
            {children}
            <ToastContainer />
        </NotificationsContext.Provider>
    );
}

/** Hook to use notification actions from anywhere */
export function useNotifications() {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
    return ctx;
}

// ── Toast Container — shows the 3 most recent un-dismissed toasts ─────────────

function ToastContainer() {
    const { notifications, dismiss } = useNotifications();
    const recent = notifications.filter((n) => !n.read).slice(0, 3);

    return (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
            {recent.map((n) => (
                <Toast key={n.id} n={n} onDismiss={() => dismiss(n.id)} />
            ))}
        </div>
    );
}

const toastColors: Record<NotificationType, string> = {
    success: 'border-l-[var(--success)] bg-[var(--success)]/5',
    error: 'border-l-[var(--danger)] bg-[var(--danger)]/5',
    warning: 'border-l-[var(--warning)] bg-[var(--warning)]/5',
    info: 'border-l-[var(--info)] bg-[var(--info)]/5',
};

const toastIcons: Record<NotificationType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

function Toast({ n, onDismiss }: { n: Notification; onDismiss: () => void }) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        timerRef.current = setTimeout(onDismiss, 5000);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [onDismiss]);

    return (
        <div
            className={`pointer-events-auto w-[340px] rounded-xl border border-[var(--border)] border-l-4 shadow-xl
                backdrop-blur-sm p-4 flex items-start gap-3 animate-in slide-in-from-right-4 fade-in
                ${toastColors[n.type]}`}
        >
            <span className="text-lg flex-shrink-0 mt-0.5">{toastIcons[n.type]}</span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{n.title}</p>
                {n.message && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</p>}
                {n.action && (
                    <a
                        href={n.action.href}
                        className="text-xs text-[var(--primary)] hover:underline font-medium mt-1 inline-block"
                    >
                        {n.action.label} →
                    </a>
                )}
            </div>
            <button
                onClick={onDismiss}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors flex-shrink-0"
            >
                ✕
            </button>
        </div>
    );
}
