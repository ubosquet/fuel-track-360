import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info';
    size?: 'sm' | 'md';
    icon?: LucideIcon;
}

function Badge({ className, variant = 'default', size = 'sm', icon: Icon, children, ...props }: BadgeProps) {
    const variants = {
        default: 'border-transparent bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90',
        secondary: 'border-transparent bg-[var(--secondary)] text-white hover:bg-[var(--secondary)]/90',
        destructive: 'border-transparent bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90',
        success: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        outline: 'text-[var(--text-primary)] border-[var(--border)]',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
    };

    return (
        <div className={cn(
            'inline-flex items-center rounded-full font-semibold transition-colors border shadow-sm',
            variants[variant],
            sizes[size],
            className
        )} {...props}>
            {Icon && <Icon className="w-3 h-3 mr-1" />}
            {children}
        </div>
    );
}

export { Badge };
