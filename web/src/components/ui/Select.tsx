import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    startIcon?: LucideIcon;
    error?: string;
    label?: string;
    options: { label: string; value: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, startIcon: StartIcon, error, label, options, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-sm font-medium leading-none text-[var(--text-secondary)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </label>
                )}
                <div className="relative w-full">
                    {StartIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
                            <StartIcon className="h-4 w-4" />
                        </div>
                    )}
                    <select
                        className={cn(
                            'flex h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm',
                            StartIcon && 'pl-10',
                            error && 'border-[var(--danger)] focus-visible:ring-[var(--danger)]',
                            className
                        )}
                        ref={ref}
                        {...props}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
                </div>
                {error && <p className="text-[0.8rem] font-medium text-[var(--danger)]">{error}</p>}
            </div>
        );
    }
);
Select.displayName = 'Select';

export { Select };
