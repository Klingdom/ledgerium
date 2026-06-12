'use client';

/**
 * NarratorSummary — one-line natural-language summary above the list.
 *
 * Dashboard-as-narrator (DASHBOARD_REDESIGN_REVIEW item 12). Built ONLY from
 * real computed stats — no fabrication. Clauses that have no data are omitted
 * entirely rather than faked. When there is nothing honest to say (zero
 * workflows), the component renders nothing.
 *
 * @batch B (2026-06-12)
 */

import type { OpportunityCounts } from '@/lib/dashboard-band-stats.js';

export interface NarratorInput {
  totalWorkflows: number;
  /** Avg portfolio health 0–100, or null when unavailable. */
  avgHealthScore: number | null;
  /** Count of workflows with variationLabel === 'high'. */
  highVariationCount: number;
  opportunityCounts: OpportunityCounts;
}

/**
 * Build the narrator sentence from real stats. Returns null when there is
 * nothing honest to say (no workflows). Pure + deterministic.
 *
 * Examples:
 *   "Your 12 workflows average a health score of 72. 3 have high variation —
 *    consider standardizing."
 *   "Your 5 workflows average a health score of 88. 2 are automation candidates."
 */
export function buildNarrator(input: NarratorInput): string | null {
  const { totalWorkflows, avgHealthScore, highVariationCount, opportunityCounts } = input;
  if (totalWorkflows <= 0) return null;

  const workflowWord = totalWorkflows === 1 ? 'workflow' : 'workflows';

  // Lead clause — health average is omitted (not faked) when unavailable.
  let lead: string;
  if (avgHealthScore !== null && Number.isFinite(avgHealthScore)) {
    lead = `Your ${totalWorkflows} ${workflowWord} average a health score of ${Math.round(
      avgHealthScore,
    )}.`;
  } else {
    lead = `You have ${totalWorkflows} ${workflowWord}.`;
  }

  // Follow-up clause — prefer the most actionable real signal, in priority order.
  let follow = '';
  if (highVariationCount > 0) {
    follow = ` ${highVariationCount} ${
      highVariationCount === 1 ? 'has' : 'have'
    } high variation — consider standardizing.`;
  } else if (opportunityCounts.automate > 0) {
    follow = ` ${opportunityCounts.automate} ${
      opportunityCounts.automate === 1 ? 'is an automation candidate' : 'are automation candidates'
    }.`;
  } else if (opportunityCounts.monitor > 0) {
    follow = ` ${opportunityCounts.monitor} need${
      opportunityCounts.monitor === 1 ? 's' : ''
    } remediation before automation.`;
  }
  // If no follow-up signal applies, the lead stands alone (honest omission).

  return `${lead}${follow}`;
}

interface NarratorSummaryProps {
  input: NarratorInput;
}

export default function NarratorSummary({ input }: NarratorSummaryProps) {
  const sentence = buildNarrator(input);
  if (sentence === null) return null;

  return (
    <p
      className="text-[14px] leading-[1.4] text-[var(--content-secondary)]"
      role="status"
      aria-label={sentence}
    >
      {sentence}
    </p>
  );
}
