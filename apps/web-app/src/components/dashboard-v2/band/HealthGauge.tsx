'use client';

/**
 * HealthGauge — deterministic SVG semicircular arc gauge for portfolio health.
 *
 * Renders a 0–100 score as a 180° arc with a color band (poor/fair/good per the
 * 60/80 thresholds shared with CommandHeader.healthBand). Pure SVG — no chart
 * library, no animation, no Date/random. The arc geometry is computed from the
 * score deterministically.
 *
 * Honesty: when `score === null` the gauge renders an empty "—" track with no
 * fabricated value.
 *
 * @batch B (2026-06-12)
 */

import { useId } from 'react';
import { HEALTH_BAND_COLOR } from './band-colors.js';

interface HealthGaugeProps {
  /** Portfolio health score 0–100, or null when no data. */
  score: number | null;
  /** Diameter of the gauge in px (default 96). */
  size?: number;
}

/** Shared 60/80 band thresholds (matches CommandHeader.healthBand). */
export function gaugeBand(score: number): {
  label: 'poor' | 'fair' | 'good';
  colorVar: string;
} {
  if (score < 60) return { label: 'poor', colorVar: HEALTH_BAND_COLOR.poor };
  if (score < 80) return { label: 'fair', colorVar: HEALTH_BAND_COLOR.fair };
  return { label: 'good', colorVar: HEALTH_BAND_COLOR.good };
}

/**
 * Compute the SVG arc path for a semicircle (left→right, 180°→0°) and the
 * stroke-dash values to fill `pct` (0–100) of that arc. Deterministic.
 */
export function arcGeometry(size: number): {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  /** Full half-circumference (length of the 180° arc). */
  arcLength: number;
  /** SVG path for the semicircle track. */
  path: string;
} {
  const strokeWidth = Math.max(6, Math.round(size * 0.1));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Semicircle from left (cx - r, cy) to right (cx + r, cy), sweeping over the top.
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const arcLength = Math.PI * r;
  return { cx, cy, r, strokeWidth, arcLength, path };
}

export default function HealthGauge({ score, size = 96 }: HealthGaugeProps) {
  const instanceId = useId().replace(/:/g, '');
  const { strokeWidth, arcLength, path } = arcGeometry(size);
  const height = size / 2 + strokeWidth;

  const hasScore = score !== null && Number.isFinite(score);
  const clamped = hasScore ? Math.min(100, Math.max(0, score!)) : 0;
  const band = hasScore ? gaugeBand(clamped) : null;
  // Fraction of the arc to fill.
  const filledLength = (clamped / 100) * arcLength;

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={
        hasScore
          ? `Portfolio health gauge: ${Math.round(clamped)} out of 100, ${band!.label}`
          : 'Portfolio health gauge: no data'
      }
    >
      <svg
        width={size}
        height={height}
        viewBox={`0 0 ${size} ${height}`}
        aria-hidden="true"
      >
        {/* Track */}
        <path
          d={path}
          fill="none"
          stroke="var(--border-subtle, #e5e7eb)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc — only when a score exists */}
        {hasScore && (
          <path
            id={`gauge-fill-${instanceId}`}
            d={path}
            fill="none"
            stroke={band!.colorVar}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${arcLength}`}
          />
        )}
      </svg>
      <div className="-mt-2 flex flex-col items-center">
        <span
          className="text-[22px] font-semibold leading-none tabular-nums"
          style={{ color: hasScore ? band!.colorVar : 'var(--content-tertiary)' }}
        >
          {hasScore ? Math.round(clamped) : '—'}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
          Health
        </span>
      </div>
    </div>
  );
}
