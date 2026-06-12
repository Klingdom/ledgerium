/**
 * Shared hydration-error pattern list for all smoke specs.
 *
 * Canonical definition — import from here; do NOT copy-paste into individual
 * spec files.  If a new React error code becomes relevant, add it here once.
 *
 * Used by:
 *   - hydration.smoke.spec.ts  (public-route gate, currently has its own copy)
 *   - analysis.smoke.spec.ts   (authed Analysis-view gate, currently has its own copy)
 *   - canvas.smoke.spec.ts     (NEW — canvas hydration gate, NEW-T2)
 *
 * The list covers the three surfaces of the hydration-crash class:
 *   1. Minified React error codes emitted as uncaught page errors
 *   2. React console warnings containing "Hydration" / "hydrat"
 *   3. Next.js "Application error" full-page fallback text
 *   4. Text-content mismatch warning from React 18 (dev + prod alike)
 */
export const HYDRATION_ERROR_PATTERNS: RegExp[] = [
  /Hydration/i,
  /hydrat/i,
  /Minified React error #418/,
  /Minified React error #423/,
  /Minified React error #425/,
  /Minified React error #419/,
  /client-side exception/i,
  /Application error/i,
  /Text content does not match/i,
];

export function matchesHydrationError(text: string): boolean {
  return HYDRATION_ERROR_PATTERNS.some((re) => re.test(text));
}
