import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    startIcon?: LucideIcon;
    endIcon?: LucideIcon;
    error?: string;
    label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, startIcon: StartIcon, endIcon: EndIcon, error, label, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-sm font-medium leading-none text-[var(--text-secondary)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </label>
                )}
                <div className="relative w-full">
                    {StartIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
                            <StartIcon className="h-4 w-4" />
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            'flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm',
                            StartIcon && 'pl-10',
                            EndIcon && 'pr-10',
                            error && 'border-[var(--danger)] focus-visible:ring-[var(--danger)]',
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {EndIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
                            <EndIcon className="h-4 w-4" />
                        </div>
                    )}
                </div>
                {error && <p className="text-[0.8rem] font-medium text-[var(--danger)]">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input };
