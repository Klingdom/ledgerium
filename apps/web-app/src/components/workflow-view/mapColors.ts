/**
 * Fixed colours for the DFG frequency map (row #268).
 *
 * Why these are literals and not tokens: the DFG canvas is a React Flow
 * surface. `DfgCanvas` sets `colorMode="light"` explicitly, so the canvas is
 * white in BOTH page themes and every mark drawn on it is measured against
 * #ffffff, never against a theme surface. Colours whose backing is the canvas
 * (edges, terminals, performance fills, visit badge) therefore live here, once,
 * where `theme-contrast.test.ts` measures each one. Anything that sits on the
 * page theme (toggle bar, legend, slider) uses the `--*` tokens instead.
 *
 * Pure: no imports, no DOM, so the contrast guard can import it directly.
 */

export const CANVAS_BG = '#ffffff';

/** Frequency-mode edge. 4.47:1 on the canvas at full opacity. */
export const EDGE_COLOR = '#6366f1';
/** Selected-path edge, selected-node ring, active toggle fill. 6.29:1. */
export const HAPPY_COLOR = '#4f46e5';

/**
 * Lowest edge opacity in frequency mode. Weight is also encoded as stroke
 * width, so opacity is the secondary channel; it used to run 0.20..1.00, which
 * left a rare edge at ~1.2:1 — present in the data, absent on screen. At 0.85
 * the faintest edge composites to 3.47:1 on the canvas (SC 1.4.11).
 */
export const EDGE_MIN_OPACITY = 0.85;

/**
 * Performance scale endpoints. Each is >= 3:1 on the canvas, and so is every
 * point of the fast->medium and medium->slow interpolation (min 3.19:1).
 * The old 500-level values measured 2.15..3.76 (amber 2.15, emerald 2.54).
 */
export const PERF_FAST_COLOR = '#059669';
export const PERF_MEDIUM_COLOR = '#d97706';
export const PERF_SLOW_COLOR = '#dc2626';
/** Insufficient data. gray-500 (4.83:1); was gray-400 #9ca3af (2.54:1). */
export const PERF_NEUTRAL_COLOR = '#6b7280';

/** Start / end terminals: white glyph on the fill, border darker than fill. */
export const TERMINAL_START = { bg: '#15803d', border: '#14532d' } as const; // white 5.02:1
export const TERMINAL_END = { bg: '#b91c1c', border: '#7f1d1d' } as const;   // white 6.47:1
export const TERMINAL_TEXT = '#ffffff';

/** Visit-count badge: violet-900 on violet-50 (9.99:1); border decorative. */
export const BADGE = { bg: '#f5f3ff', border: '#ddd6fe', text: '#4c1d95' } as const;

const TEXT_DARK = '#000000';
const TEXT_LIGHT = '#ffffff';

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string): number {
  return (
    0.2126 * channel(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * channel(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * channel(parseInt(hex.slice(5, 7), 16))
  );
}

/**
 * Text colour for a performance fill. The fill is interpolated across the
 * data range, so no single text colour can be right; pick whichever of black
 * and white contrasts more. Black vs white crosses over at L=0.179, where both
 * give 4.58:1, so the worst case anywhere on the scale is 4.58:1 (>= 4.5).
 */
export function readableTextOn(bgHex: string): string {
  const l = relativeLuminance(bgHex);
  const onDark = (1.05) / (l + 0.05);
  const onLight = (l + 0.05) / 0.05;
  return onDark >= onLight ? TEXT_LIGHT : TEXT_DARK;
}
