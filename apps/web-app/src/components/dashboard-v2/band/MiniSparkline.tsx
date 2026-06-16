'use client';

/**
 * MiniSparkline — a tiny, hydration-safe sparkline rendered as PURE SVG.
 *
 * CONSOLIDATED_20 #7: a 1-line sparkline of recorded-per-week activity for the
 * Tier-2 library-facts row. Deliberately PURE SVG (not recharts) — it is
 * trivially deterministic and carries zero hydration risk: no `Date.now()`, no
 * `Math.random()`, no `useId`-gradient or animation. The geometry is a pure
 * function of the pre-computed bucket counts that arrive from the route's single
 * `referenceNowMs` boundary, so the SSR markup and the hydrated markup are
 * byte-identical.
 *
 * Honesty (CONSOLIDATED_20 §49): the points reflect observed recordings only.
 * The caller (SignalFactsRow) is responsible for gating whether a delta is shown
 * at all (via buildSparklineState — delta is null when no prior period exists).
 * This component just draws the shape; it fabricates nothing.
 *
 * @batch SIGNALS (2026-06-16)
 */

import { ACCENT } from './band-colors.js';

interface MiniSparklineProps {
  /** Per-bucket counts, oldest-first (from buildSparklineState.points). */
  points: number[];
  width?: number;
  height?: number;
  /** Accessible description for screen readers (the facts row supplies context). */
  ariaLabel: string;
}

/**
 * Map the bucket counts to an SVG polyline `points` string within the viewbox.
 * Pure + deterministic. A flat/degenerate series (all-equal, or < 2 points) maps
 * to a horizontal baseline at the vertical mid-line rather than a misleading
 * slope. Exported for unit testing in a node environment.
 */
export function buildPolylinePoints(
  counts: ReadonlyArray<number>,
  width: number,
  height: number,
): string {
  const n = counts.length;
  if (n === 0) return '';

  const max = counts.reduce((m, c) => (c > m ? c : m), 0);
  const min = counts.reduce((m, c) => (c < m ? c : m), counts[0]!);
  const range = max - min;

  // Leave a 1px vertical inset so the stroke is never clipped at the edges.
  const inset = 1;
  const usableH = Math.max(0, height - inset * 2);

  // A single point, or a flat series, draws a centered horizontal baseline.
  if (n === 1 || range === 0) {
    const y = height / 2;
    return `0,${y} ${width},${y}`;
  }

  const stepX = width / (n - 1);
  return counts
    .map((c, i) => {
      const x = i * stepX;
      // Higher count → higher on screen (smaller y). Normalize into [inset, height-inset].
      const norm = (c - min) / range; // 0..1
      const y = inset + (1 - norm) * usableH;
      return `${round2(x)},${round2(y)}`;
    })
    .join(' ');
}

/** Round to 2 dp so the SVG string is stable + compact (deterministic). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function MiniSparkline({
  points,
  width = 72,
  height = 20,
  ariaLabel,
}: MiniSparklineProps) {
  if (points.length === 0) {
    return (
      <span className="text-[11px] text-[var(--content-tertiary)]" aria-label={ariaLabel}>
        —
      </span>
    );
  }

  const polyline = buildPolylinePoints(points, width, height);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="overflow-visible"
      preserveAspectRatio="none"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
