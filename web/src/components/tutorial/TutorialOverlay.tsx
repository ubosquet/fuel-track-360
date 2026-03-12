'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTutorialState, useDismissTutorialStep, useCompleteTutorialSteps } from '@/hooks/useOnboarding';

export function TutorialOverlay() {
    const router = useRouter();
    const { data, isLoading } = useTutorialState();
    const dismissMutation = useDismissTutorialStep();
    const completeMutation = useCompleteTutorialSteps();

    const [currentIdx, setCurrentIdx] = useState(0);

    if (isLoading || !data) return null;
    if (!data.tutorial_enabled) return null;
    if (data.steps_to_show.length === 0) return null;

    const steps = data.steps_to_show;
    const step = steps[currentIdx];
    if (!step) return null;

    const isLast = currentIdx === steps.length - 1;

    const handleNext = async () => {
        await completeMutation.mutateAsync([step.id]);
        if (isLast) {
            // Mark all remaining as complete and exit
            await completeMutation.mutateAsync(steps.map(s => s.id));
        } else {
            // Navigate to step route then advance
            router.push(step.route);
            setCurrentIdx(i => i + 1);
        }
    };

    const handleDismissStep = async () => {
        await dismissMutation.mutateAsync(step.id);
        if (isLast) return; // overlay will auto-close (no more steps)
        setCurrentIdx(i => i + 1);
    };

    const handleDismissAll = async () => {
        await completeMutation.mutateAsync(steps.map(s => s.id));
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 w-80 animate-slide-up">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-[var(--border)]">
                    <div
                        className="h-full bg-[var(--primary)] transition-all duration-500"
                        style={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-5">
                    {/* Step counter */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex gap-1">
                            {steps.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all
                                    ${i === currentIdx ? 'bg-[var(--primary)] w-4' : i < currentIdx ? 'bg-[var(--primary)]/40' : 'bg-[var(--border)]'}`} />
                            ))}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)]">{currentIdx + 1} / {steps.length}</span>
                    </div>

                    {/* Content */}
                    <h3 className="font-bold text-[var(--text-primary)] mb-1.5">{step.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{step.description}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNext}
                            disabled={completeMutation.isPending}
                            className="flex-1 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-60"
                        >
                            {isLast ? '✓ Terminer' : 'Suivant →'}
                        </button>
                        <button
                            onClick={handleDismissStep}
                            className="px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border)] rounded-xl"
                        >
                            Passer
                        </button>
                    </div>

                    <button
                        onClick={handleDismissAll}
                        className="w-full mt-2 text-[10px] text-[var(--text-muted)] hover:underline"
                    >
                        Ne plus afficher ce guide
                    </button>
                </div>
            </div>
        </div>
    );
}
