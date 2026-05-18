/**
 * Path E — Reviewed-Evidence Retention Policy (iter 076 / PATHE-P01)
 *
 * Implements the CEO directive Appendix C (2026-05-18, ratified at
 * DECISION_AWARE_WORKFLOW_VISION_REVIEW_001 close): reviewed evidence retained
 * 365 days from `reviewedAt` for Team / Growth / Enterprise; 90 days for Free /
 * Starter; unreviewed evidence retained 90 days from `timestamp`.
 *
 * **Pure module**: zero `Date.now()` / `Math.random()` / I/O. The only function
 * that touches time accepts the `reviewedAt: Date` as an injected parameter and
 * derives `retentionUntil` deterministically. Callers (typically the
 * `/api/workflows/[id]/evidence-reviews` route in PATHE-P12) supply the
 * current `Date` from a single upstream clock boundary parallel to the iter-037
 * MDR-P03 `referenceNowMs` pattern.
 *
 * **Plan-tier capture**: the function reads `planTier` from the caller. The
 * value is also persisted to `ProcessEvidenceReview.plan_tier_at_review` so
 * retention is computed against the plan in force at review time — NOT subject
 * to retroactive change if the user upgrades / downgrades later.
 *
 * **Cleanup job**: a daily BullMQ job `cleanup_expired_evidence_reviews` runs
 * at 02:00 UTC and queries `process_evidence_reviews WHERE retention_until <
 * NOW()`. Soft-deletes; hard-deletes on day +30. Scheduled outside this
 * iteration (PATHE-P22 or a dedicated infra iteration); this module provides
 * the helper functions the cleanup job consumes.
 *
 * @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md Appendix C
 * @see ../types/entities.ts ProcessEvidenceReview
 */

import type { PlanType } from '../../plans.js';

// ── Retention day constants ───────────────────────────────────────────────────

/**
 * Reviewed-evidence retention floor for paid tiers (Team / Growth / Enterprise).
 * CEO directive 2026-05-18: "evidence that is reviewed should be kept on the
 * entities page for a year instead of last 14 days".
 */
export const REVIEWED_EVIDENCE_RETENTION_DAYS_PAID = 365 as const;

/**
 * Reviewed-evidence retention floor for Free / Starter tiers.
 * Identical to unreviewed-evidence retention — review action records exist
 * in `process_evidence_reviews` but `retentionUntil` is capped to the 90-day
 * floor so the policy delta is plan-tier-gated (per Appendix C plan-tier
 * gating clause).
 */
export const REVIEWED_EVIDENCE_RETENTION_DAYS_FREE = 90 as const;

/**
 * Default retention for unreviewed evidence pointers (mirrors AI Vision §10
 * `ai_execution_audit_payload` default).
 */
export const UNREVIEWED_EVIDENCE_RETENTION_DAYS = 90 as const;

/** Milliseconds per day — used for deterministic `retentionUntil` arithmetic. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Plan-tier → retention-days lookup ─────────────────────────────────────────

/**
 * Closed-union plan-tier set that earns the 365-day reviewed-evidence
 * retention floor. Free / Starter receive the 90-day floor regardless of
 * review action.
 */
const PAID_TIERS_WITH_EXTENDED_RETENTION: ReadonlySet<PlanType> = new Set<PlanType>([
  'team',
  'growth',
  'enterprise',
]);

/**
 * Return the retention-days floor for reviewed evidence at the given plan tier.
 *
 * Pure function. Same input → byte-identical output. No clocks, no I/O.
 *
 * @param planTier - The user's plan tier at review time (Appendix C plan-tier
 *                   snapshot semantics).
 * @returns 365 for Team / Growth / Enterprise; 90 for Free / Starter.
 */
export function reviewedEvidenceRetentionDaysForPlan(planTier: PlanType): number {
  return PAID_TIERS_WITH_EXTENDED_RETENTION.has(planTier)
    ? REVIEWED_EVIDENCE_RETENTION_DAYS_PAID
    : REVIEWED_EVIDENCE_RETENTION_DAYS_FREE;
}

// ── reviewedEvidenceRetentionUntil ────────────────────────────────────────────

/**
 * Compute the deterministic `retentionUntil` Date for a reviewed evidence
 * pointer.
 *
 * @param reviewedAt - Wall-clock Date when the user reviewed the evidence.
 *                     Caller MUST supply from a single upstream clock boundary
 *                     (parallel to iter-037 MDR-P03 `referenceNowMs` pattern).
 * @param planTier - The user's plan tier at review time.
 * @returns `reviewedAt + N days` where N is 365 for paid / 90 for free.
 *
 * Determinism: identical `reviewedAt` + `planTier` → byte-identical Date
 * (millisecond precision preserved via `Date.getTime() + days * MS_PER_DAY`).
 */
export function reviewedEvidenceRetentionUntil(
  reviewedAt: Date,
  planTier: PlanType,
): Date {
  const days = reviewedEvidenceRetentionDaysForPlan(planTier);
  return new Date(reviewedAt.getTime() + days * MS_PER_DAY);
}

// ── unreviewedEvidenceRetentionUntil ──────────────────────────────────────────

/**
 * Compute the deterministic `retentionUntil` for an unreviewed evidence
 * pointer.
 *
 * Used by the daily cleanup job for the 90-day floor on
 * `EvidencePointer.timestamp` where `reviewedAt === null`.
 *
 * @param evidenceTimestamp - Wall-clock Date of the source event.
 * @returns `evidenceTimestamp + 90 days`.
 */
export function unreviewedEvidenceRetentionUntil(evidenceTimestamp: Date): Date {
  return new Date(
    evidenceTimestamp.getTime() + UNREVIEWED_EVIDENCE_RETENTION_DAYS * MS_PER_DAY,
  );
}

// ── isEvidenceRetentionExpired ────────────────────────────────────────────────

/**
 * Return true if a given retention deadline is past the caller-supplied "now".
 *
 * @param retentionUntil - The `retentionUntil` Date from the persisted row.
 * @param nowMs - Wall-clock ms snapshot from caller (single upstream boundary).
 * @returns true if `retentionUntil.getTime() < nowMs` — eligible for soft-delete.
 */
export function isEvidenceRetentionExpired(
  retentionUntil: Date,
  nowMs: number,
): boolean {
  return retentionUntil.getTime() < nowMs;
}
