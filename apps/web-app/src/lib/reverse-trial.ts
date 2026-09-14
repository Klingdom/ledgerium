/**
 * Reverse trial — full paid features from the moment of signup, rolling down
 * to the permanent free tier when the window closes.
 *
 * WHY THIS SHAPE
 * --------------
 * The previous trial was applied at Stripe Checkout, which meant a user had to
 * already have decided to upgrade before it began. It was a discount on a
 * decision already made, not a way to experience the product. Worse, the only
 * prompt that would send someone to checkout does not render on the live
 * dashboard, so in practice the trial was close to unreachable.
 *
 * A reverse trial inverts that: every new account gets the paid experience
 * immediately, and the conversion moment becomes "keep what you already have"
 * rather than "imagine what you might get". Competitive research (2026-09)
 * found every self-serve competitor that scaled — Loom, Scribe, Tango, Guidde —
 * keeps a PERPETUAL free tier and gates by usage rather than by calendar, so
 * the roll-down target here is the real free tier, never a lockout. A 680k-user
 * randomised study also found trial DURATION had no significant effect on
 * conversion, which is why the window length is configurable and not treated
 * as the interesting variable.
 *
 * DETERMINISM
 * -----------
 * Every function here takes `nowMs` explicitly and never reads the clock. This
 * matches the single-upstream-clock-boundary pattern already used across this
 * codebase (`route.ts` referenceNowMs, `filterByTimeRange`, `computeIsStale`),
 * and it is what makes trial state testable at a boundary instead of only
 * "whenever the test happens to run".
 *
 * NOT AN ENTITLEMENT SOURCE OF TRUTH
 * ----------------------------------
 * This module decides only "is a reverse trial currently granting a plan, and
 * which one". It is deliberately one input to `effectivePlanForUser`, which
 * merges it with the user's own plan and any workspace plans via `highestPlan`.
 * That means a paid plan can never be DOWNGRADED by trial expiry — the merge
 * takes the highest, so when the window closes the user simply falls back to
 * whatever they actually hold.
 */

import { PLAN_HIERARCHY, type PlanType } from './plans';

/** The plan a new signup is granted for the duration of the window. */
export const REVERSE_TRIAL_PLAN: PlanType = 'solo';

/**
 * Window length in days.
 *
 * Env-overridable so it can be tuned without a deploy, and so tests do not
 * depend on the production value. Invalid or absent values fall back to 14
 * rather than throwing — a malformed env var must not prevent signup.
 * `0` disables the reverse trial entirely, which is the kill switch.
 */
export const REVERSE_TRIAL_DAYS: number = (() => {
  const raw = process.env.REVERSE_TRIAL_DAYS;
  if (raw === undefined) return 14;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 14;
  return parsed;
})();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The persisted shape this module reads. Both fields are set together. */
export interface ReverseTrialFields {
  /** Which plan the trial grants, or null if the user never had one. */
  reverseTrialPlan: string | null | undefined;
  /** When the window closes. Null if the user never had a trial. */
  reverseTrialEndsAt: Date | null | undefined;
}

/**
 * When a trial started now would end. Returns null when trials are disabled,
 * so the caller stores null rather than an already-expired timestamp — "never
 * had a trial" and "had one that ended instantly" are different states and
 * should not be conflated in the data.
 */
export function reverseTrialEndsAt(nowMs: number): Date | null {
  if (REVERSE_TRIAL_DAYS <= 0) return null;
  return new Date(nowMs + REVERSE_TRIAL_DAYS * MS_PER_DAY);
}

/** Is the window currently open? Exact end instant counts as EXPIRED. */
export function isReverseTrialActive(fields: ReverseTrialFields, nowMs: number): boolean {
  const { reverseTrialPlan, reverseTrialEndsAt: endsAt } = fields;
  // `== null` deliberately, not `=== null`: a Prisma `select` that omits these
  // columns yields `undefined`, not `null`. This is an entitlement boundary —
  // an absent field must fail closed rather than throw on `.getTime()`.
  if (reverseTrialPlan == null || endsAt == null) return false;
  // Strictly less-than: at the exact expiry instant the trial is over. An
  // inclusive bound would leave a one-millisecond window where the UI says
  // "0 days left" while entitlement still grants the plan.
  return nowMs < endsAt.getTime();
}

/**
 * The plan an active reverse trial grants, or null.
 *
 * Returns null for an unrecognised stored plan rather than guessing. A value
 * outside PLAN_HIERARCHY means the row was written by an older or different
 * code path, and silently upgrading someone on the strength of an unreadable
 * field is worse than declining to.
 */
export function activeReverseTrialPlan(
  fields: ReverseTrialFields,
  nowMs: number,
): PlanType | null {
  if (!isReverseTrialActive(fields, nowMs)) return null;
  const plan = fields.reverseTrialPlan as PlanType;
  return PLAN_HIERARCHY.includes(plan) ? plan : null;
}

/**
 * Whole days remaining, rounded UP, floored at 0.
 *
 * Rounding up so a trial with any time left never displays "0 days left" —
 * that reads as expired while the user still has access, which is precisely
 * the kind of mismatch that makes people distrust a countdown.
 */
export function reverseTrialDaysRemaining(fields: ReverseTrialFields, nowMs: number): number {
  if (!isReverseTrialActive(fields, nowMs)) return 0;
  const remainingMs = fields.reverseTrialEndsAt!.getTime() - nowMs;
  return Math.max(0, Math.ceil(remainingMs / MS_PER_DAY));
}

/**
 * Has this user had a reverse trial that has now ended?
 *
 * Distinct from `!isReverseTrialActive`, which is also true for someone who
 * never had one. The difference drives messaging: a lapsed user should be
 * told what they lost; a user who never had a trial should not be told
 * anything about one.
 */
export function hasReverseTrialLapsed(fields: ReverseTrialFields, nowMs: number): boolean {
  const { reverseTrialPlan, reverseTrialEndsAt: endsAt } = fields;
  if (reverseTrialPlan == null || endsAt == null) return false;
  return nowMs >= endsAt.getTime();
}
