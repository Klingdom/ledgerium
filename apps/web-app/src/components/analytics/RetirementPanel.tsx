/**
 * The #57 retirement criteria panel on /analytics/product (rows #247, #302, #307).
 * Moved out of the page in loop 224 so it can be rendered in a test; markup unchanged
 * apart from #307 (the indicative note and the pooled-counts label).
 */
import { indicativeNote, type DashboardV2RetirementMetrics } from '@/lib/dashboard-v2-retirement-metrics';

// Same as the page's helpers (row #247): null is an explicit empty state, never 0%.
function formatRate(rate: number | null, emptyLabel: string): string {
  return rate === null ? emptyLabel : `${(rate * 100).toFixed(1)}%`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// Row #307: each rate is a mean of per-user rates, so the pooled counts under it
// are context, not its numerator and denominator; they are labelled as such.
const POOLED_LABEL = 'All users combined (the rate averages each user’s own rate):';

function SampleNote({ rate, users }: { rate: number | null; users: number }) {
  const note = indicativeNote(rate, users);
  return note === null ? null : <p className="text-ds-xs text-[var(--content-secondary)]">{note}</p>;
}

export function RetirementPanel({ metrics }: { metrics: DashboardV2RetirementMetrics }) {
  return (
    <section className="ds-section mb-ds-8">
      <h2 className="ds-section-label">Dashboard v2 Retirement Criteria</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
        <div className="card px-ds-5 py-ds-4">
          <p className="ds-metric-label">Bounce rate</p>
          <p className="ds-metric-value">{formatRate(metrics.bounceRate, `Insufficient data (fewer than ${metrics.minUsers} users)`)}</p>
          <p className="text-ds-xs text-[var(--content-secondary)]">Target: under 40% — not decision-grade until #249 and #251 close</p>
          <SampleNote rate={metrics.bounceRate} users={metrics.bounceUsers} />
          <p className="text-ds-xs text-[var(--content-secondary)] tabular-nums">
            {POOLED_LABEL} {plural(metrics.bounces, 'bounce', 'bounces')} / {plural(metrics.views, 'view', 'views')} · {plural(metrics.bounceUsers, 'user', 'users')}
          </p>
          <p className="text-ds-xs text-[var(--content-tertiary)] mt-ds-1">
            Mobile exits are undercounted (#249). A back-button return can count twice (#251). The net
            effect on this rate is unmeasured.
          </p>
        </div>
        <div className="card px-ds-5 py-ds-4">
          <p className="ds-metric-label">Chip-click rate</p>
          <p className="ds-metric-value">{formatRate(metrics.chipClickRate, `Insufficient data (fewer than ${metrics.minUsers} users)`)}</p>
          <p className="text-ds-xs text-[var(--content-secondary)]">Threshold pending CEO decision</p>
          <SampleNote rate={metrics.chipClickRate} users={metrics.chipUsers} />
          <p className="text-ds-xs text-[var(--content-tertiary)] mt-ds-1">
            Net direction unmeasured. Toggling a chip off and clicking after a reload error both inflate this rate; lost clicks deflate it.
          </p>
          <p className="text-ds-xs text-[var(--content-secondary)] tabular-nums">
            {POOLED_LABEL} {plural(metrics.chipClicks, 'click', 'clicks')} / {plural(metrics.chipsRendered, 'chip shown', 'chips shown')} · {plural(metrics.chipUsers, 'user', 'users')}
          </p>
          {metrics.viewsMissingChipCount > 0 && (
            <p className="text-ds-xs text-[var(--content-tertiary)] mt-ds-1">
              {plural(metrics.viewsMissingChipCount, 'view', 'views')} had no valid chip count. Their chips are
              excluded from the denominator but their clicks are still counted, which inflates this rate. Net direction is still unmeasured.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
