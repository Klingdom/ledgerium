/**
 * band-colors — single source of truth for the Batch B band's semantic colors.
 *
 * Colors come in two kinds, and the difference is deliberate rather than
 * accidental (row #233, corrected at row #239).
 *
 * The neutral chrome below resolves to real theme tokens, so it follows the
 * light/dark theme like everything else.
 *
 * The opportunity-tag colors are plain literals. They used to be written as
 * `var(--opp-automate, #2563eb)` and so on, which read as though they
 * participated in theming — but those tokens were never defined anywhere, so
 * the fallback was always what rendered. This docstring used to describe that
 * arrangement as a mechanism ("resolves to the design-system token when
 * defined"), which made an aspiration look like a feature for as long as
 * anyone read it. They are written plainly now so the debt is visible; row
 * #237 covers deciding what they should actually be, which is a palette
 * question rather than five independent ones.
 *
 * Centralizing here keeps the band palette consistent across the gauge, the
 * opportunity bar, and the trend chart, and keeps raw palette literals out of
 * the component JSX.
 *
 * @batch B (2026-06-12)
 */

import type { OpportunityTag } from '@/lib/workflow-metrics.js';

/** Accent (brand mint/green) — the primary positive/series color. */
export const ACCENT = 'var(--accent)';

/** Neutral surface + content tokens re-exported for chart axis/grid colors. */
export const GRID_COLOR = 'var(--border-subtle)';
export const AXIS_TEXT = 'var(--content-tertiary)';
export const TOOLTIP_BG = 'var(--surface-elevated)';
export const TOOLTIP_BORDER = 'var(--border-default)';
export const TOOLTIP_TEXT = 'var(--content-primary)';

/**
 * Opportunity-tag colors, ordered by action priority (highest action value
 * first). The order array drives the stacked-bar left→right segment order.
 */
export const OPPORTUNITY_ORDER: ReadonlyArray<OpportunityTag> = [
  'automate',
  'standardize',
  'optimize',
  'monitor',
  'healthy',
];

export const OPPORTUNITY_COLOR: Record<OpportunityTag, string> = {
  automate: '#2563eb',     // blue — ready AI candidate
  standardize: '#d97706', // amber
  optimize: '#ea580c',      // orange
  monitor: '#dc2626',        // red — needs remediation
  healthy: '#16a34a',        // green — resolved
};

export const OPPORTUNITY_LABEL: Record<OpportunityTag, string> = {
  automate: 'Automate',
  standardize: 'Standardize',
  optimize: 'Optimize',
  monitor: 'Monitor',
  healthy: 'Healthy',
};

/** Health-band colors (60/80 thresholds shared with CommandHeader). */
export const HEALTH_BAND_COLOR = {
  poor: '#dc2626',
  fair: '#d97706',
  good: 'var(--accent)',
} as const;
