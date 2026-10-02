/**
 * Activation rate for the `activation_rate_drop` alert — row #250 (MR-039 A-1).
 *
 * ## One population
 *
 * The old alert divided "distinct users who viewed a SOP section in the last 7d,
 * at ANY tenure" by "users who signed up in the last 7d". The numerator was not
 * a subset of the denominator, so the ratio was unbounded above 1 and grew with
 * the active base: against a `< 0.20` threshold it could never fire.
 *
 * Here the numerator is, by construction, a subset of the denominator:
 *
 *   cohort    = users whose FIRST `signup_completed` falls in
 *               [now - 2*window, now - window]   (a MATURE cohort)
 *   activated = cohort users with a `sop_section_viewed` in
 *               [signupAt, signupAt + window]
 *
 * Every cohort member's activation window has fully closed by `now`, so no one
 * is penalised for not having had time yet (immature signups are excluded, not
 * counted as failures). The cost is a one-window lag: the alert describes users
 * who signed up 7-14 days ago. Fresh-signup silence is covered by the separate
 * `no_signups_48h` alert.
 *
 * Pure and deterministic: `nowMs` is injected.
 */

export const ACTIVATION_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActivationEvent {
  userId: string | null;
  createdAt: Date;
}

export interface ActivationRateResult {
  cohortSize: number;
  activated: number;
  /** activated / cohortSize, always in [0,1]; null when the cohort is empty. */
  rate: number | null;
}

/** Inclusive-lower / inclusive-upper bounds the caller must fetch events for. */
export function activationCohortBounds(nowMs: number): { signupFrom: Date; signupTo: Date } {
  const w = ACTIVATION_WINDOW_DAYS * DAY_MS;
  return { signupFrom: new Date(nowMs - 2 * w), signupTo: new Date(nowMs - w) };
}

export function computeActivationRate(
  signups: readonly ActivationEvent[],
  sopViews: readonly ActivationEvent[],
  nowMs: number,
): ActivationRateResult {
  const w = ACTIVATION_WINDOW_DAYS * DAY_MS;
  const from = nowMs - 2 * w;
  const to = nowMs - w;

  // First signup per user, restricted to the mature-cohort window.
  const signupAt = new Map<string, number>();
  for (const s of signups) {
    if (!s.userId) continue;
    const t = s.createdAt.getTime();
    if (t < from || t > to) continue;
    const prev = signupAt.get(s.userId);
    if (prev === undefined || t < prev) signupAt.set(s.userId, t);
  }

  const activatedUsers = new Set<string>();
  for (const v of sopViews) {
    if (!v.userId) continue;
    const start = signupAt.get(v.userId);
    if (start === undefined) continue; // not in the cohort → cannot count
    const t = v.createdAt.getTime();
    if (t >= start && t <= start + w) activatedUsers.add(v.userId);
  }

  const cohortSize = signupAt.size;
  return {
    cohortSize,
    activated: activatedUsers.size,
    rate: cohortSize === 0 ? null : activatedUsers.size / cohortSize,
  };
}
