/**
 * What, if anything, to tell a user about their monthly recording limit.
 *
 * WHY THIS EXISTS
 * ---------------
 * `UsageQuotaMeter` held the only quota prompt in the app, but it rendered in
 * the v1 dashboard branch no real user reaches. Under the reverse trial the
 * roll-down to free (5 recordings/month) therefore happened with no signal at
 * all when a user approached or hit the cap. Its copy was also wrong: it said
 * "Upgrade to Team for unlimited", and Team cannot be bought self-serve.
 *
 * The decision lives here, pure and tested, and every surface (the live
 * dashboard chip and the legacy meter) consumes it. Previously the meter's
 * test mirrored the component's logic in a copy that could drift silently.
 *
 * TRUTHFULNESS
 * ------------
 * The call to action names Solo because Solo is the lowest self-serve tier
 * with no monthly cap. Starter is NOT — it raises the limit to 15. That fact
 * is asserted against `plans.ts` in the tests, so if plan limits change the
 * copy fails loudly instead of quietly becoming false.
 *
 * The count resets on the 1st of the month in UTC, matching
 * `getMonthlyUploadCount` in feature-gating.ts.
 */

/** `limits.recordings.max` from GET /api/account. */
export type RecordingMax = number | 'unlimited';

export type QuotaTone = 'neutral' | 'attention' | 'limit';

export interface QuotaMeterState {
  /** Render nothing when false (unlimited plans, loading, malformed data). */
  show: boolean;
  tone: QuotaTone;
  used: number;
  max: number;
  /** 0–100, clamped. */
  pct: number;
  /** Short count, e.g. "4 / 5 recordings". */
  label: string;
  /** Upgrade call to action, or null when none is warranted. */
  cta: string | null;
  /** Full sentence for tooltip / aria-label. */
  detail: string;
  href: string;
}

/** Percent of the monthly limit at which the upgrade prompt appears. */
import { PLAN_HIERARCHY, getPlanConfig, type PlanType } from './plans';

export const QUOTA_WARNING_PCT = 80;

/**
 * The lowest self-serve plan with no monthly recording cap.
 *
 * Derived from `plans.ts` rather than written down, because writing it down is
 * how loop 70 got it wrong. That loop emitted `plan: 'team'` on the analytics
 * event this component fires, while this very file's CTA said "Solo" — and
 * claimed the value had been "verified, not assumed". The verification was a
 * scan of `plans.ts` that answered *which plans are uncapped* (four of them)
 * rather than *which plan this surface names* (one), and the scan's own regex
 * silently skipped the `solo` block entirely.
 *
 * Copy and analytics now resolve from the same expression, so they cannot
 * disagree again: if the plan tiers change, both move together or the test
 * below fails.
 */
export const UNCAPPED_PLAN_ID: PlanType =
  PLAN_HIERARCHY.find((p) => getPlanConfig(p).maxRecordingsPerMonth === Number.MAX_SAFE_INTEGER)
  ?? 'team';

/** Display form of {@link UNCAPPED_PLAN_ID}, for user-facing copy. */
export const UNCAPPED_PLAN_LABEL =
  UNCAPPED_PLAN_ID.charAt(0).toUpperCase() + UNCAPPED_PLAN_ID.slice(1);

const CTA = `${UNCAPPED_PLAN_LABEL} removes the monthly cap`;
const RESET = 'The count resets on the 1st (UTC).';

const HIDDEN: QuotaMeterState = {
  show: false,
  tone: 'neutral',
  used: 0,
  max: 0,
  pct: 0,
  label: '',
  cta: null,
  detail: '',
  href: '',
};

export function quotaMeterState(
  used: number | null | undefined,
  max: RecordingMax | null | undefined,
): QuotaMeterState {
  if (max === 'unlimited' || typeof max !== 'number' || !Number.isFinite(max) || max <= 0) {
    return HIDDEN;
  }
  if (max >= Number.MAX_SAFE_INTEGER) return HIDDEN;
  if (typeof used !== 'number' || !Number.isFinite(used)) return HIDDEN;

  const safeUsed = Math.max(0, Math.floor(used));
  const pct = Math.min((safeUsed / max) * 100, 100);
  const label = `${safeUsed} / ${max} recordings`;
  const base = { show: true, used: safeUsed, max, pct, label, href: '/pricing' };

  if (pct >= 100) {
    return {
      ...base,
      tone: 'limit',
      cta: CTA,
      detail:
        `Monthly recording limit reached (${max}). Your existing workflows are unaffected. ` +
        `New uploads resume on the 1st (UTC), or ${CTA}.`,
    };
  }

  const remaining = max - safeUsed;
  const remainingText = `${remaining} recording${remaining === 1 ? '' : 's'} left this month.`;

  if (pct >= QUOTA_WARNING_PCT) {
    return { ...base, tone: 'attention', cta: CTA, detail: `${remainingText} ${RESET} ${CTA}.` };
  }

  return { ...base, tone: 'neutral', cta: null, detail: `${remainingText} ${RESET}` };
}
