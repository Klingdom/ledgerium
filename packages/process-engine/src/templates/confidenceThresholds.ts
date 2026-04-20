/**
 * Shared confidence threshold constants for the template system.
 *
 * These constants define the tier boundaries used both at the document level
 * (quality badge classification in sopTemplates.ts) and at the per-step level
 * (confidence glyph rendering in renderHelpers.ts). Keeping them in one place
 * ensures the two tiers cannot drift apart.
 *
 * Values are frozen — do not change without a deliberate threshold-tuning
 * iteration that updates all dependent tests.
 */

/** Minimum average confidence for a "high" quality badge. */
export const HIGH_CONFIDENCE_THRESHOLD = 0.85 as const;

/** Minimum average confidence to avoid a "low" quality badge. */
export const LOW_CONFIDENCE_THRESHOLD = 0.70 as const;
