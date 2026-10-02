/**
 * Dashboard v2 retirement metrics (#57 criteria 1 and 3, rows #247, #298, #302).
 *
 * Pure and deterministic: no clock, no I/O, and the result does not depend on
 * row order. Takes analytics event rows and returns bounce rate and chip-click
 * rate computed OVER USERS, not events.
 *
 * Why per user (#302, MR-053 3.3): the ingest endpoint lets any signed-in
 * account write any number of rows with any properties. Event-level rates let
 * one account set a retirement criterion (one row flipped chip-click to ~1e-7;
 * three requests pulled bounce to 0.10). Every rate below is a mean of per-user
 * rates, each in [0, 1], so one account has weight 1/N however many rows it writes.
 *
 * DEFINITIONS
 *  - Row filter: only rows with a non-null `userId` (#298) and a parseable
 *    `createdAt` count. Anonymous rows are forgeable by anyone.
 *  - Bounce pairing: a `dashboard_bounced` counts only against a view. Per user,
 *    each bounce is matched to a distinct earlier-or-simultaneous
 *    `dashboard_v2_viewed` of the same user (the producer events carry no view
 *    id, so user + time ordering is the strongest join available); unmatched
 *    (orphan) bounces are dropped. A view absorbs at most one bounce.
 *  - bounceRate = mean over users with >= 1 view of (paired bounces / views).
 *  - chipsRenderedCount is valid only if an integer >= 0; values above the
 *    producer's maximum (MAX_INSIGHT_CHIPS, the chip list's slice bound) are
 *    clamped to it. Anything else makes the view "missing a chip count".
 *  - chipClickRate = mean over users with chipsRendered > 0 of
 *    min(1, chipClicks / chipsRendered). The per-user cap bounds one user's
 *    contribution; it also hides toggle-off double counting inside one user.
 *  - MIN_USERS_FOR_RATE = 10. Below 10 distinct contributing users a rate is
 *    null ("insufficient data"): one account is then at most 10% of the number
 *    and 3 accounts cannot reach a third of it. This does not stop Sybil
 *    signups; N accounts still move the rate by N/users. 10 is a judgment, not
 *    derived from the 40% / 10% thresholds.
 *
 * `null` always means no / insufficient data, never 0. Criterion 2 (free-tier
 * p50 click time) is not computed here.
 *
 * `views`, `bounces`, `chipsRendered`, `chipClicks` are the counted (filtered,
 * paired, clamped) totals, for context; the rates are NOT ratios of them.
 */
import { MAX_INSIGHT_CHIPS } from './workflow-metrics';

/** Distinct contributing users required before a rate is reported. */
export const MIN_USERS_FOR_RATE = 10;

export interface RetirementMetricsEventRow {
  eventName: string;
  /** Session-derived (#295); null for anonymous rows, which do not count. */
  userId: string | null;
  properties?: string | null;
  createdAt: Date | string | number;
}

export interface DashboardV2RetirementMetrics {
  views: number;
  /** Bounces paired to a view of the same user (orphans excluded). */
  bounces: number;
  /** Mean of per-user (paired bounces / views); null if fewer than minUsers users viewed. */
  bounceRate: number | null;
  /** Users with at least one view: the bounce-rate sample. */
  bounceUsers: number;
  /** Sum of clamped chipsRenderedCount over views that carry a valid one. */
  chipsRendered: number;
  chipClicks: number;
  /** Mean of per-user min(1, clicks / chips); null if fewer than minUsers users saw chips. */
  chipClickRate: number | null;
  /** Users with chipsRendered > 0: the chip-click sample. */
  chipUsers: number;
  /** The minimum sample applied (MIN_USERS_FOR_RATE). */
  minUsers: number;
  /**
   * Views excluded from chipsRendered because the count was absent or invalid.
   * Pushes chipClickRate UP (their clicks stay in the numerator) but a value of
   * 0 does NOT make the rate unbiased (MR-040 3.3): toggle-off clicks and
   * failed-load views push up, lost late clicks push down. Net direction unknown.
   */
  viewsMissingChipCount: number;
}

function readChipsRenderedCount(properties: string | null | undefined): number | null {
  if (typeof properties !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(properties);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const value = (parsed as Record<string, unknown>).chipsRenderedCount;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null;
  return Math.min(value, MAX_INSIGHT_CHIPS);
}

interface UserAcc {
  viewTimes: number[];
  bounceTimes: number[];
  chipsRendered: number;
  chipClicks: number;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeDashboardV2RetirementMetrics(
  events: readonly RetirementMetricsEventRow[],
): DashboardV2RetirementMetrics {
  const users = new Map<string, UserAcc>();
  let viewsMissingChipCount = 0;

  for (const evt of events) {
    if (evt.userId === null || evt.userId === undefined) continue;
    if (
      evt.eventName !== 'dashboard_v2_viewed' &&
      evt.eventName !== 'dashboard_bounced' &&
      evt.eventName !== 'insight_chip_clicked'
    ) continue;
    const t = new Date(evt.createdAt).getTime();
    if (!Number.isFinite(t)) continue;

    let u = users.get(evt.userId);
    if (!u) {
      u = { viewTimes: [], bounceTimes: [], chipsRendered: 0, chipClicks: 0 };
      users.set(evt.userId, u);
    }
    switch (evt.eventName) {
      case 'dashboard_v2_viewed': {
        u.viewTimes.push(t);
        const count = readChipsRenderedCount(evt.properties);
        if (count === null) viewsMissingChipCount++;
        else u.chipsRendered += count;
        break;
      }
      case 'dashboard_bounced':
        u.bounceTimes.push(t);
        break;
      case 'insight_chip_clicked':
        u.chipClicks++;
        break;
    }
  }

  let views = 0;
  let bounces = 0;
  let chipsRendered = 0;
  let chipClicks = 0;
  const bounceRates: number[] = [];
  const chipRates: number[] = [];

  for (const u of users.values()) {
    if (u.viewTimes.length > 0) {
      const vs = [...u.viewTimes].sort((a, b) => a - b);
      const bs = [...u.bounceTimes].sort((a, b) => a - b);
      let matched = 0;
      let vi = 0;
      for (const b of bs) {
        while (vi < vs.length && vs[vi]! <= b) vi++;
        if (vi > matched) matched++; // an unmatched earlier-or-equal view exists
      }
      views += vs.length;
      bounces += matched;
      bounceRates.push(matched / vs.length);
    }
    chipsRendered += u.chipsRendered;
    chipClicks += u.chipClicks;
    if (u.chipsRendered > 0) chipRates.push(Math.min(1, u.chipClicks / u.chipsRendered));
  }

  return {
    views,
    bounces,
    bounceRate: bounceRates.length >= MIN_USERS_FOR_RATE ? mean(bounceRates) : null,
    bounceUsers: bounceRates.length,
    chipsRendered,
    chipClicks,
    chipClickRate: chipRates.length >= MIN_USERS_FOR_RATE ? mean(chipRates) : null,
    chipUsers: chipRates.length,
    minUsers: MIN_USERS_FOR_RATE,
    viewsMissingChipCount,
  };
}
