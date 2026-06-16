'use client';

/**
 * NarratorSummary — one-line natural-language summary above the list.
 *
 * Dashboard-as-narrator (DASHBOARD_REDESIGN_REVIEW item 12). Built ONLY from
 * real computed stats — no fabrication. Clauses that have no data are omitted
 * entirely rather than faked. When there is nothing honest to say (zero
 * workflows), the component renders nothing.
 *
 * atglance-review #9 — "make clickable things navigate": the narrator's
 * follow-up clause always names a REAL signal (high variation / automation
 * candidates / needs-remediation). When the clause has a real, honest filter
 * target it is rendered as an inline button that applies the matching list
 * filter (via the shell's existing handlers) — clicking the sentence navigates.
 * The lead clause (a portfolio-wide average) has no honest single-filter target
 * and stays plain text. We never fabricate a navigation target.
 *
 * @batch B (2026-06-12)
 */

import type { OpportunityCounts } from '@/lib/dashboard-band-stats.js';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';
import type { HealthStatusFilter } from '../WorkflowListFilterBar.js';

export interface NarratorInput {
  totalWorkflows: number;
  /** Avg portfolio health 0–100, or null when unavailable. */
  avgHealthScore: number | null;
  /** Count of workflows with variationLabel === 'high'. */
  highVariationCount: number;
  opportunityCounts: OpportunityCounts;
}

/**
 * The structured narrator: a plain lead clause + an optional follow-up clause
 * that may carry a real filter target. `buildNarratorParts` is pure +
 * deterministic and the single source of the sentence (string-rendering callers
 * may join `lead` + `follow.text`).
 */
export interface NarratorFollowClause {
  /** The clause text (already includes a leading space). */
  readonly text: string;
  /**
   * The honest filter this clause maps to, if any. When present, the clause is
   * rendered as an interactive button that applies this filter.
   *  - `healthStatus: 'high_variation'` for the variation clause
   *  - `opportunity: 'automate'` for the automation-candidates clause
   *  - `opportunity: 'monitor'` for the needs-remediation clause
   */
  readonly filter:
    | { kind: 'healthStatus'; value: HealthStatusFilter }
    | { kind: 'opportunity'; value: OpportunityTag }
    | null;
}

export interface NarratorParts {
  lead: string;
  follow: NarratorFollowClause | null;
}

/**
 * Build the structured narrator from real stats. Returns null when there is
 * nothing honest to say (no workflows). Pure + deterministic.
 */
export function buildNarratorParts(input: NarratorInput): NarratorParts | null {
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
  let follow: NarratorFollowClause | null = null;
  if (highVariationCount > 0) {
    follow = {
      text: ` ${highVariationCount} ${
        highVariationCount === 1 ? 'has' : 'have'
      } high variation — consider standardizing.`,
      filter: { kind: 'healthStatus', value: 'high_variation' },
    };
  } else if (opportunityCounts.automate > 0) {
    follow = {
      text: ` ${opportunityCounts.automate} ${
        opportunityCounts.automate === 1 ? 'is an automation candidate' : 'are automation candidates'
      }.`,
      filter: { kind: 'opportunity', value: 'automate' },
    };
  } else if (opportunityCounts.monitor > 0) {
    follow = {
      text: ` ${opportunityCounts.monitor} need${
        opportunityCounts.monitor === 1 ? 's' : ''
      } remediation before automation.`,
      filter: { kind: 'opportunity', value: 'monitor' },
    };
  }
  // If no follow-up signal applies, the lead stands alone (honest omission).

  return { lead, follow };
}

/**
 * Build the plain narrator sentence (string) — preserved for any string-only
 * consumer. Returns null when there is nothing honest to say.
 */
export function buildNarrator(input: NarratorInput): string | null {
  const parts = buildNarratorParts(input);
  if (parts === null) return null;
  return `${parts.lead}${parts.follow?.text ?? ''}`;
}

interface NarratorSummaryProps {
  input: NarratorInput;
  /** Active opportunity filter — drives the follow-up clause active state. */
  activeOpportunity?: OpportunityTag | null;
  /**
   * atglance-review #9: apply the clause's filter when the interactive follow-up
   * clause is clicked. `healthStatus` is set for the variation clause; `tag` for
   * the opportunity clauses. Omit to render the narrator as plain text only.
   */
  onFilter?: (tag: OpportunityTag, healthStatus: HealthStatusFilter | null) => void;
}

export default function NarratorSummary({
  input,
  activeOpportunity = null,
  onFilter,
}: NarratorSummaryProps) {
  const parts = buildNarratorParts(input);
  if (parts === null) return null;

  const sentence = `${parts.lead}${parts.follow?.text ?? ''}`;
  const follow = parts.follow;

  // When the follow-up clause has a real filter target AND a handler is wired,
  // render it as an inline button so clicking the sentence navigates the list.
  const interactive = follow !== null && follow.filter !== null && onFilter !== undefined;

  const isActive =
    interactive &&
    follow!.filter!.kind === 'opportunity' &&
    activeOpportunity === follow!.filter!.value;

  return (
    <p
      className="text-[14px] leading-[1.4] text-[var(--content-secondary)]"
      role="status"
      aria-label={sentence}
    >
      <span>{parts.lead}</span>
      {follow !== null && (
        interactive ? (
          <button
            type="button"
            onClick={() => {
              const f = follow.filter!;
              if (f.kind === 'healthStatus') {
                onFilter!('healthy', f.value);
              } else {
                onFilter!(f.value, null);
              }
            }}
            aria-pressed={isActive}
            className={`rounded underline decoration-dotted underline-offset-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
              isActive
                ? 'text-[var(--content-primary)] font-medium'
                : 'text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
            }`}
            title="Click to filter the list to these workflows."
          >
            {follow.text}
          </button>
        ) : (
          <span>{follow.text}</span>
        )
      )}
    </p>
  );
}
