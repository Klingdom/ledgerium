'use client';

/**
 * RecordedTrendChart — weekly bar chart of workflows recorded over the trailing
 * ~12 weeks.
 *
 * Hydration-safe Recharts pattern (REUSED from admin-operations TimeSeriesChart
 * iter-073): client component, `isAnimationActive={false}`, `useId()`-pinned
 * gradient id, design-system color tokens, ResponsiveContainer. NO Date.now()/
 * Math.random() in render — the buckets arrive pre-computed from the route's
 * referenceNowMs boundary.
 *
 * Honesty (ANALYTICS_DASHBOARD_REVIEW §6): this shows workflow *recordings*
 * (createdAt), not runs — labeled accordingly. With < 3 total recordings in the
 * window the chart is suppressed and an activation prompt is shown instead of a
 * misleading slope.
 *
 * @batch B (2026-06-12)
 */

import { useId } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ActivityWeekBucket } from '@/lib/dashboard-band-stats.js';
import { ACCENT, GRID_COLOR, AXIS_TEXT, TOOLTIP_BG, TOOLTIP_BORDER, TOOLTIP_TEXT } from './band-colors.js';
import { formatWeekTick, shouldSuppressTrend, computeYTicks, isDegenerateYDomain } from './trend-utils.js';

interface RecordedTrendChartProps {
  data: ActivityWeekBucket[];
  height?: number;
}

export default function RecordedTrendChart({ data, height = 160 }: RecordedTrendChartProps) {
  const instanceId = useId().replace(/:/g, '');
  const gradientId = `trendBarGradient-${instanceId}`;

  // Honesty guardrail: suppress the chart with < 3 total recordings (no
  // misleading slope from a tiny cluster). Show an activation prompt instead.
  if (shouldSuppressTrend(data)) {
    return (
      <div className="flex flex-col gap-ds-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-secondary)]">
          Workflows recorded per week
        </span>
        <div
          className="flex items-center justify-center rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
          style={{ height }}
          role="img"
          aria-label="Not enough recording activity yet to show a trend"
        >
          <p className="text-[13px] text-[var(--content-secondary)]">
            Not enough recording activity yet.
          </p>
        </div>
      </div>
    );
  }

  // Integer Y-axis ticks — recordings are whole numbers, so the axis must never
  // render fractional ticks (recharts auto-domain does on small integer counts).
  const yTicks = computeYTicks(data);
  const yMax = yTicks[yTicks.length - 1] ?? 1;
  // Degenerate domain (max ≤ 1): suppress the Y-axis entirely rather than render
  // a redundant "0 / 1" scale (the COMPETITIVE review "3 / 3 / 3" artifact class).
  // Bars + tooltip still convey the count honestly.
  const hideYAxis = isDegenerateYDomain(data);

  return (
    <div className="flex flex-col gap-ds-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-secondary)]">
        Workflows recorded per week
      </span>
      <div role="img" aria-label="Workflows recorded per week over the trailing 12 weeks">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.9} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="weekStartIso"
              tickFormatter={formatWeekTick}
              tick={{ fontSize: 11, fill: AXIS_TEXT }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            {!hideYAxis && (
              <YAxis
                allowDecimals={false}
                domain={[0, yMax]}
                ticks={yTicks}
                tick={{ fontSize: 11, fill: AXIS_TEXT }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
            )}
            <Tooltip
              cursor={{ fill: GRID_COLOR, opacity: 0.3 }}
              contentStyle={{
                background: TOOLTIP_BG,
                border: `1px solid ${TOOLTIP_BORDER}`,
                borderRadius: '8px',
                fontSize: 12,
                color: TOOLTIP_TEXT,
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [typeof value === 'number' ? value : 0, 'recorded']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) =>
                `Week of ${formatWeekTick(typeof label === 'string' ? label : '')}`
              }
            />
            <Bar
              dataKey="count"
              fill={`url(#${gradientId})`}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
