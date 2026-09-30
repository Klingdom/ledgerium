/**
 * The colour of a confidence figure on the SOP surface.
 *
 * ## Why this exists
 *
 * Until row #229 the ternary
 *
 *     value >= 0.85 ? '#059669' : value >= 0.7 ? '#2563eb' : '#d97706'
 *
 * was written out five times — `SOPExecutionMode`, `SOPVisualMode`,
 * `SOPIntelligenceMode` twice, and `SOPPageShell`. Every copy was a hardcoded
 * light-theme hex placed on a theme-variable surface, and the app's default
 * theme is dark. Measured against `--surface-elevated`:
 *
 * | band  | hex       | dark  | light |
 * |-------|-----------|-------|-------|
 * | >=85  | `#059669` | 4.29  | 3.77  |
 * | >=70  | `#2563eb` | 3.13  | 5.17  |
 * | <70   | `#d97706` | 5.08  | 3.19  |
 *
 * As text, against a 4.5:1 requirement, **every band failed in at least one
 * theme** — green in both. axe only ever reported one of them, because the
 * fixture happened to render a single confidence value; the other two were
 * latent, and fixing only what the scan saw would have left them there.
 *
 * The theme tokens below are 4.79:1 at worst in light and 6.37:1 at worst in
 * dark, in every band, and they follow the existing per-theme status-colour
 * convention from rows #206 and #222 rather than inventing a parallel one.
 *
 * ## Text versus graphics
 *
 * Only one caller renders these as text (the percentage in `ConfidenceBar`).
 * The rest are dots and bar fills, which answer to the 3:1 non-text floor and
 * passed even with the old hexes. They are switched over anyway: leaving four
 * copies of a literal that is wrong in one context is how it gets copied back
 * into a fifth.
 */

/**
 * The confidence bands. Exported so callers describe a band rather than
 * re-deriving the thresholds, which is the other half of how the duplication
 * spread.
 */
export type ConfidenceBand = 'high' | 'medium' | 'low';

/** Bands are `>= 0.85`, `>= 0.7`, and below. Thresholds unchanged from the literals this replaces. */
export function confidenceBand(value: number): ConfidenceBand {
  if (value >= 0.85) return 'high';
  if (value >= 0.7) return 'medium';
  return 'low';
}

/**
 * A CSS colour for a confidence value in `0..1`, as a `var()` reference so it
 * resolves per theme — including inside the SOP print block, which resets these
 * tokens to light values so a dark-mode user does not print unreadable figures.
 *
 * Returns a `var()` string rather than a hex precisely so it cannot be captured
 * at module scope and frozen to one theme.
 */
export function confidenceColor(value: number): string {
  switch (confidenceBand(value)) {
    case 'high':
      return 'var(--status-success)';
    case 'medium':
      return 'var(--status-info)';
    case 'low':
      return 'var(--status-warning)';
  }
}

/**
 * Same scale for values already expressed as a percentage (`0..100`).
 * Two call sites had the thresholds written as `>= 85` / `>= 70` against a
 * percentage while three used the `0..1` form; both spellings are kept so
 * neither caller has to convert at the point of use and get it subtly wrong.
 */
export function confidenceColorFromPercent(pct: number): string {
  return confidenceColor(pct / 100);
}
