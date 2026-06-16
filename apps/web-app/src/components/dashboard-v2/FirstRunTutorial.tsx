'use client';

/**
 * FirstRunTutorial — the 0-workflow activation surface (atglance-review #14).
 *
 * When the library is genuinely empty (no workflows AND no active filters), the
 * dashboard suppresses the analyst chrome (KPI strip, health gauge, opportunity
 * bar, weekly chart, facts row, lens tabs, toolbar, preset chips) and renders
 * THIS focused first-run walkthrough instead — the empty page becomes the
 * activation surface, not an analyst cockpit wrapped around an empty table.
 *
 * Honesty (CEO mandate — HONESTY is the moat): every line claims only a real
 * Ledgerium capability (record → measure → act). NO fabricated stats,
 * benchmarks, outcomes, or social proof. The CTAs reflect the real product
 * paths: the extension install route (/install) and the upload route (/upload).
 * Copy is the growth-strategist-drafted GROWTH_DASHBOARD_REVIEW §2 walkthrough.
 *
 * Determinism + hydration safety: pure render — no Date.now()/Math.random(),
 * design tokens only, SSR-safe.
 *
 * A11y: the tutorial is a labelled <section>; the 3 steps are an ordered list;
 * the primary CTA is a real <Link> with a clear label and a visible focus ring;
 * the upload path is a secondary <Link>. Keyboard users Tab straight to the
 * primary action.
 */

import Link from 'next/link';
import { Download, CircleDot, Gauge } from 'lucide-react';
import { track } from '@/lib/analytics.js';

/** One record→measure→act step. Each verb maps to a real product capability. */
interface TutorialStep {
  readonly n: number;
  readonly title: string;
  readonly body: string;
}

/**
 * Growth-drafted 3-step walkthrough (GROWTH_DASHBOARD_REVIEW §2, verbatim).
 * Observed-only — no numbers, no claims, no benchmarks.
 */
export const FIRST_RUN_STEPS: readonly TutorialStep[] = [
  {
    n: 1,
    title: 'Record',
    body: 'Install the extension and capture any digital process once.',
  },
  {
    n: 2,
    title: 'Measure',
    body: 'We time it, find the steps, and flag variation automatically.',
  },
  {
    n: 3,
    title: 'Act',
    body: 'See where to standardize or automate.',
  },
];

/** Heading + lead, pinned for the copy-pin test (growth verbatim). */
export const FIRST_RUN_HEADING = 'No workflows yet — here’s how Ledgerium works:';
export const FIRST_RUN_LEAD =
  'Every digital process you record, measured from real behavior — cycle time, variation, and where AI could help.';
export const FIRST_RUN_PRIMARY_CTA = 'Install the extension to start →';
export const FIRST_RUN_SECONDARY_PREFIX = 'Already recorded elsewhere?';
export const FIRST_RUN_SECONDARY_CTA = 'Upload a recording →';

const STEP_ICONS = [Download, CircleDot, Gauge] as const;

export default function FirstRunTutorial() {
  return (
    <section
      aria-labelledby="first-run-heading"
      className="mx-auto w-full max-w-2xl px-ds-6 py-ds-8 flex flex-col items-center gap-ds-6 text-center"
      data-testid="first-run-tutorial"
    >
      {/* Purpose line: what Ledgerium is, in one honest sentence. */}
      <div className="flex flex-col gap-ds-2">
        <h2
          id="first-run-heading"
          className="text-[20px] font-semibold text-[var(--content-primary)]"
        >
          {FIRST_RUN_HEADING}
        </h2>
        <p className="text-[14px] text-[var(--content-secondary)]">{FIRST_RUN_LEAD}</p>
      </div>

      {/* The 3-step record → measure → act path. Ordered list = real sequence. */}
      <ol className="flex flex-col gap-ds-3 w-full max-w-md text-left">
        {FIRST_RUN_STEPS.map((step, i) => {
          const Icon = STEP_ICONS[i] ?? CircleDot;
          return (
            <li
              key={step.n}
              className="flex items-start gap-ds-3 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-ds-4 py-ds-3"
            >
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--content-secondary)]"
                aria-hidden="true"
              >
                <Icon size={15} />
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[14px] font-medium text-[var(--content-primary)]">
                  {step.n}. {step.title}
                </span>
                <span className="text-[13px] text-[var(--content-secondary)]">{step.body}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Primary action: the single obvious next step. Real route (/install). */}
      <div className="flex flex-col items-center gap-ds-2">
        <Link
          href="/install"
          onClick={() =>
            track({ event: 'dashboard_empty_state_cta_clicked', cta: 'install' })
          }
          className="inline-flex items-center gap-ds-2 px-ds-5 py-ds-2 rounded-ds-sm bg-[var(--content-primary)] text-[var(--surface-primary)] text-[14px] font-medium transition-opacity duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          {FIRST_RUN_PRIMARY_CTA}
        </Link>
        {/* Secondary: the existing upload path, real route (/upload). */}
        <p className="text-[13px] text-[var(--content-secondary)]">
          {FIRST_RUN_SECONDARY_PREFIX}{' '}
          <Link
            href="/upload"
            onClick={() =>
              track({ event: 'dashboard_empty_state_cta_clicked', cta: 'upload' })
            }
            className="font-medium text-[var(--content-primary)] underline underline-offset-2 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
          >
            {FIRST_RUN_SECONDARY_CTA}
          </Link>
        </p>
      </div>
    </section>
  );
}
