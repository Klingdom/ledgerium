/**
 * Dashboard v2 retirement metrics (#57 criteria 1 and 3, row #247).
 *
 * Pure and deterministic: no clock, no I/O, and the result does not depend on
 * row order. Takes analytics event rows (`eventName`, `properties` as a JSON
 * string) and returns bounce rate and chip-click rate WITH numerators and
 * denominators.
 *
 * Rates are deliberately NOT clamped. A rate above 1 means the numerator and
 * denominator disagree about what they count (backlog #248 exists because a
 * clamp once concealed exactly that); it is returned as computed so a reader
 * sees the mismatch. A zero denominator yields `null`, never 0 — "no data" and
 * "none happened" are different statements.
 *
 * Row #298: only rows with a non-null `userId` count. The dashboard sits behind
 * auth and `userId` is session-derived by the ingest route (#295), so every
 * real row carries one; an anonymous row can only have been written by someone
 * who is not using the dashboard, and the ingest endpoint is open to anyone.
 *
 * Effect on counts: none for rows a signed-in user produced. Anonymous rows
 * (forged, or a real event whose request lost its session, e.g. a session that
 * expired mid-visit) stop counting. Losing a real event this way biases bounce
 * and chip-click counts DOWN by an amount this module cannot measure; it is
 * the price of not letting an unauthenticated writer move a retirement
 * criterion.
 */

export interface RetirementMetricsEventRow {
  eventName: string;
  /** Session-derived (#295); null for anonymous rows, which do not count. */
  userId: string | null;
  properties?: string | null;
}

export interface DashboardV2RetirementMetrics {
  views: number;
  bounces: number;
  /** bounces / views; null when views is 0. Not clamped. */
  bounceRate: number | null;
  /** Sum of chipsRenderedCount over views that carry a valid one. */
  chipsRendered: number;
  chipClicks: number;
  /** chipClicks / chipsRendered; null when chipsRendered is 0. Not clamped. */
  chipClickRate: number | null;
  /**
   * Views excluded from chipsRendered because the count was absent or invalid.
   * When this is > 0 it pushes chipClickRate UP: a click cannot be joined to
   * its view, so clicks on excluded views stay in the numerator while their
   * chips leave the denominator.
   *
   * It is ONE of several biases, and a value of 0 does NOT make the rate
   * unbiased (MR-040 §3.3 — loop 80 first wrote this as if it did, the same
   * one-direction error it had just corrected for bounce). Also upward: every
   * chip click is tracked, including the one that toggles a filter OFF, so the
   * metric is clicks per impression and can exceed 1 on toggles alone; and a
   * view that fires on a failed load carries a valid 0 and is never re-fired
   * after retry, so clicks on the retried chips have no denominator. Downward:
   * clicks are emitted later in a session than the view and are lost
   * preferentially by the drains #249/#251 describe. Net direction: unknown.
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
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

export function computeDashboardV2RetirementMetrics(
  events: readonly RetirementMetricsEventRow[],
): DashboardV2RetirementMetrics {
  let views = 0;
  let bounces = 0;
  let chipsRendered = 0;
  let chipClicks = 0;
  let viewsMissingChipCount = 0;

  for (const evt of events) {
    if (evt.userId === null || evt.userId === undefined) continue;
    switch (evt.eventName) {
      case 'dashboard_v2_viewed': {
        views++;
        const count = readChipsRenderedCount(evt.properties);
        if (count === null) viewsMissingChipCount++;
        else chipsRendered += count;
        break;
      }
      case 'dashboard_bounced':
        bounces++;
        break;
      case 'insight_chip_clicked':
        chipClicks++;
        break;
    }
  }

  return {
    views,
    bounces,
    bounceRate: views > 0 ? bounces / views : null,
    chipsRendered,
    chipClicks,
    chipClickRate: chipsRendered > 0 ? chipClicks / chipsRendered : null,
    viewsMissingChipCount,
  };
}
