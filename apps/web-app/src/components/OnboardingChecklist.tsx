'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Circle, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  getOnboardingState,
  dismissOnboarding,
  ONBOARDING_STEPS,
  getCompletionCount,
  isOnboardingComplete,
  type OnboardingContext,
  type OnboardingState,
} from '@/lib/onboarding';

interface OnboardingChecklistProps {
  workflowCount: number;
  hasExtensionKey: boolean;
}

export default function OnboardingChecklist({
  workflowCount,
  hasExtensionKey,
}: OnboardingChecklistProps) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    isDismissed: false,
    completedSteps: [],
    startedAt: null,
    completedAt: null,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Read localStorage only after mount to avoid SSR/hydration mismatch
  useEffect(() => {
    setState(getOnboardingState());
    setMounted(true);
  }, []);

  const context: OnboardingContext = { workflowCount, hasExtensionKey };
  const completionCount = getCompletionCount(state, context);
  const allComplete = isOnboardingComplete(state, context);
  const totalSteps = ONBOARDING_STEPS.length;
  const completionPct = Math.round((completionCount / totalSteps) * 100);

  function handleDismiss() {
    dismissOnboarding();
    setState(getOnboardingState());
  }

  // Do not render until mounted (prevents hydration mismatch from localStorage)
  if (!mounted) return null;

  // Do not render if already dismissed
  if (state.isDismissed) return null;

  return (
    <div
      className="mb-ds-6 rounded-ds-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] overflow-hidden"
      role="region"
      aria-label="Getting started checklist"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-ds-5 py-ds-4">
        <div className="flex items-center gap-ds-3">
          {allComplete ? (
            <Sparkles className="h-4 w-4 text-brand-500 shrink-0" />
          ) : null}
          <span className="text-ds-sm font-semibold text-[var(--content-primary)]">
            Getting started
          </span>
          <span className="text-ds-xs text-[var(--content-tertiary)]">
            {completionCount} of {totalSteps} complete
          </span>
        </div>
        <div className="flex items-center gap-ds-2">
          <button
            onClick={() => setIsCollapsed((c) => !c)}
            className="flex items-center justify-center h-6 w-6 rounded text-[var(--content-tertiary)] hover:text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
            aria-label={isCollapsed ? 'Expand checklist' : 'Collapse checklist'}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="flex items-center justify-center h-6 w-6 rounded text-[var(--content-tertiary)] hover:text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
            aria-label="Dismiss getting started checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-ds-5 pb-ds-3">
        <div className="h-1.5 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-500"
            style={{ width: `${completionPct}%` }}
            role="progressbar"
            aria-valuenow={completionCount}
            aria-valuemin={0}
            aria-valuemax={totalSteps}
            aria-label={`${completionCount} of ${totalSteps} steps complete`}
          />
        </div>
      </div>

      {/* Steps list */}
      {!isCollapsed && (
        <ul className="px-ds-5 pb-ds-4 space-y-ds-3">
          {ONBOARDING_STEPS.map((step) => {
            const completed = step.isCompleted(state, context);
            return (
              <li key={step.id} className="flex items-start gap-ds-3">
                {/* Step icon */}
                <div className="mt-0.5 shrink-0">
                  {completed ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/15">
                      <Check className="h-3 w-3 text-brand-500" aria-hidden="true" />
                    </span>
                  ) : (
                    <Circle
                      className="h-5 w-5 text-[var(--content-tertiary)]"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={
                      completed
                        ? 'text-ds-sm font-medium text-[var(--content-tertiary)] line-through'
                        : 'text-ds-sm font-medium text-[var(--content-primary)]'
                    }
                  >
                    {step.title}
                  </p>
                  {!completed && (
                    <p className="mt-0.5 text-ds-xs text-[#e2e8f0]/60">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Action */}
                {!completed && (
                  <Link
                    href={step.actionHref}
                    className="shrink-0 text-ds-xs font-medium text-brand-400 hover:text-brand-300 transition-colors whitespace-nowrap"
                  >
                    {step.actionLabel}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* All-complete congratulations banner */}
      {allComplete && !isCollapsed && (
        <div className="mx-ds-5 mb-ds-4 rounded-ds-md bg-brand-900/20 border border-brand-800/40 px-ds-4 py-ds-3 text-center">
          <p className="text-ds-sm font-medium text-brand-300">
            You&apos;re all set! Ledgerium is ready to track your processes.
          </p>
          <button
            onClick={handleDismiss}
            className="mt-ds-2 text-ds-xs text-[var(--content-tertiary)] hover:text-[var(--content-secondary)] transition-colors"
          >
            Dismiss this checklist
          </button>
        </div>
      )}
    </div>
  );
}
