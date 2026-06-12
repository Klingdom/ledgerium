/**
 * band-colors — single source of truth for the Batch B band's semantic colors.
 *
 * Every color is expressed as a CSS `var(--token, #hexFallback)` so it resolves
 * to the design-system token when defined and to a sensible literal fallback
 * otherwise (matching the admin-operations `var(--accent, #20f2a6)` convention).
 * Centralizing here keeps the band palette consistent across the gauge, the
 * opportunity bar, and the trend chart, and keeps raw palette literals out of
 * the component JSX.
 *
 * @batch B (2026-06-12)
 */

import type { OpportunityTag } from '@/lib/workflow-metrics.js';

/** Accent (brand mint/green) — the primary positive/series color. */
export const ACCENT = 'var(--accent, #16a34a)';

/** Neutral surface + content tokens re-exported for chart axis/grid colors. */
export const GRID_COLOR = 'var(--border-subtle, #e5e7eb)';
export const AXIS_TEXT = 'var(--content-tertiary, #6b7280)';
export const TOOLTIP_BG = 'var(--surface-elevated, #ffffff)';
export const TOOLTIP_BORDER = 'var(--border-default, #d1d5db)';
export const TOOLTIP_TEXT = 'var(--content-primary, #111827)';

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
  automate: 'var(--opp-automate, #2563eb)',     // blue — ready AI candidate
  standardize: 'var(--opp-standardize, #d97706)', // amber
  optimize: 'var(--opp-optimize, #ea580c)',      // orange
  monitor: 'var(--opp-monitor, #dc2626)',        // red — needs remediation
  healthy: 'var(--opp-healthy, #16a34a)',        // green — resolved
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
  poor: 'var(--severity-danger, #dc2626)',
  fair: 'var(--severity-warning, #d97706)',
  good: 'var(--accent, #16a34a)',
} as const;
