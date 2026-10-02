/**
 * Upgrade-prompt view/click stages per `location` (row #248).
 *
 * `upgrade-prompt.ts` says view and click must be compared per `location`, not
 * in aggregate: the pricing-page `upgrade_button` click deliberately has no
 * matching view, so in aggregate clicks can exceed views. The aggregate funnel
 * cannot show that; this can.
 *
 * Pure and deterministic: no clock, no I/O, output independent of row order
 * (locations sorted by views desc, then clicks desc, then name).
 *
 * Counting unit: EVENTS (impressions and clicks), not unique users. The
 * aggregate funnel counts users; a per-location prompt comparison is about
 * exposures, and `shouldEmitPromptView` already defines when a repeat exposure
 * counts as a new view.
 *
 * Rows whose `location` is missing, not a string, or blank are NOT dropped:
 * they are counted in `missingLocationViews` / `missingLocationClicks` so the
 * per-location rows plus the missing counts always equal the totals.
 *
 * Rates are not clamped. clickRate = clicks / views and may exceed 1; it is
 * null when views is 0 ("no views" is not "0%").
 *
 * Row #298: only rows with a non-null `userId` count (session-derived since
 * #295). Every prompt and every `upgrade_button` click is rendered to a
 * signed-in user (UpgradeButton renders a plain link for signed-out visitors),
 * so a real row always has one; the ingest endpoint is open to anyone, so an
 * anonymous row cannot be trusted as a prompt exposure. Effect: no change for
 * real rows; anonymous rows leave the table, including `missingLocation*`.
 */

export interface UpgradePromptEventRow {
  eventName: string;
  /** Session-derived (#295); null for anonymous rows, which do not count. */
  userId: string | null;
  properties?: string | null;
}

export interface UpgradePromptLocationStage {
  location: string;
  views: number;
  clicks: number;
  /** clicks / views; null when views is 0. Not clamped. */
  clickRate: number | null;
  /** True when this location has no views by design (see KNOWN_VIEWLESS_LOCATIONS). */
  isViewlessByDesign: boolean;
}

export interface UpgradePromptByLocation {
  locations: UpgradePromptLocationStage[];
  missingLocationViews: number;
  missingLocationClicks: number;
}

/**
 * Locations that emit `upgrade_clicked` with no `upgrade_prompt_viewed` on
 * purpose. Only the pricing-page button is documented as such in
 * upgrade-prompt.ts; any other viewless location is shown without this label
 * because its missing views may be an instrumentation gap, not a design.
 */
export const KNOWN_VIEWLESS_LOCATIONS: ReadonlySet<string> = new Set(['upgrade_button']);

function readLocation(properties: string | null | undefined): string | null {
  if (typeof properties !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(properties);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const value = (parsed as Record<string, unknown>).location;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function computeUpgradePromptByLocation(
  events: readonly UpgradePromptEventRow[],
): UpgradePromptByLocation {
  const byLocation = new Map<string, { views: number; clicks: number }>();
  let missingLocationViews = 0;
  let missingLocationClicks = 0;

  for (const evt of events) {
    if (evt.userId === null || evt.userId === undefined) continue;
    const isView = evt.eventName === 'upgrade_prompt_viewed';
    const isClick = evt.eventName === 'upgrade_clicked';
    if (!isView && !isClick) continue;

    const location = readLocation(evt.properties);
    if (location === null) {
      if (isView) missingLocationViews++;
      else missingLocationClicks++;
      continue;
    }
    const entry = byLocation.get(location) ?? { views: 0, clicks: 0 };
    if (isView) entry.views++;
    else entry.clicks++;
    byLocation.set(location, entry);
  }

  const locations = [...byLocation.entries()]
    .map(([location, { views, clicks }]) => ({
      location,
      views,
      clicks,
      clickRate: views > 0 ? clicks / views : null,
      isViewlessByDesign: views === 0 && KNOWN_VIEWLESS_LOCATIONS.has(location),
    }))
    .sort(
      (a, b) =>
        b.views - a.views ||
        b.clicks - a.clicks ||
        (a.location < b.location ? -1 : a.location > b.location ? 1 : 0),
    );

  return { locations, missingLocationViews, missingLocationClicks };
}
