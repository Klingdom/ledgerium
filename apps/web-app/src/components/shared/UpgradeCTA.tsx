'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { track } from '@/lib/analytics';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UpgradeCTAProps {
  /** The feature key being gated (used for aria labels). */
  feature: string;
  /** The plan required to unlock this feature (e.g. "team", "growth"). */
  requiredPlan?: string;
  /** Short heading for the locked state card. */
  title?: string;
  /** Optional supporting text below the heading. */
  description?: string;
  /** Compact inline layout (single row). Default false = full card. */
  compact?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * UpgradeCTA — shown when a feature is locked behind a higher plan.
 *
 * Full mode: a bordered card with icon, heading, description, and CTA button.
 * Compact mode: a single inline row for embedding inside existing UI surfaces.
 *
 * Links to /pricing so the user can compare plans.
 */
export function UpgradeCTA({
  feature,
  requiredPlan,
  title,
  description,
  compact = false,
}: UpgradeCTAProps): JSX.Element {
  const hasFiredRef = useRef(false);
  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;
    track({ event: 'upgrade_prompt_viewed', location: feature, plan: requiredPlan ?? 'unknown' });
  }, [feature, requiredPlan]);

  const planLabel = requiredPlan ? capitalize(requiredPlan) : 'a higher plan';
  const buttonLabel = requiredPlan ? `Upgrade to ${planLabel}` : 'Upgrade plan';
  const defaultTitle = title ?? 'This feature requires an upgrade';

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-ds-sm text-[var(--content-secondary)]"
        aria-label={`${feature} requires ${planLabel}`}
      >
        <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--content-tertiary)]" aria-hidden="true" />
        <span>{defaultTitle}</span>
        <Link
          href="/pricing"
          className="font-medium text-brand-600 hover:text-brand-700 underline underline-offset-2"
        >
          Upgrade
        </Link>
      </span>
    );
  }

  return (
    <div
      className="rounded-ds-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] px-6 py-8 text-center"
      role="region"
      aria-label={`${feature} upgrade prompt`}
    >
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
        <Lock className="h-5 w-5 text-[var(--content-tertiary)]" aria-hidden="true" />
      </div>

      <p className="text-ds-base font-semibold text-[var(--content-primary)]">{defaultTitle}</p>

      {description && (
        <p className="mt-1.5 text-ds-sm text-[var(--content-secondary)]">{description}</p>
      )}

      <Link
        href="/pricing"
        className="mt-5 inline-flex items-center justify-center rounded-ds-md bg-brand-600 px-ds-4 py-ds-2 text-ds-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
