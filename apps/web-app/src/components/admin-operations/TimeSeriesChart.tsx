'use client';

/**
 * TimeSeriesChart — Recharts AreaChart wrapper for daily-bucket time series.
 *
 * Renders a single area with:
 *   - Dark-mode–safe colors via CSS variable fallbacks
 *   - Responsive container (100% width)
 *   - Accessible aria-label on the root element
 *   - Graceful empty state when data is empty
 *
 * QA-attention item 5 (iter 073): gradient ID collision fix.
 *   Originally every TimeSeriesChart instance shared the same hardcoded
 *   linearGradient id="adminAreaGradient". When 4 charts render on the same
 *   page the browser uses the first gradient definition for all four, causing
 *   the fill color to be whatever the first chart specifies regardless of the
 *   fillColor prop on subsequent charts. Fixed by using React 18 useId() to
 *   generate a unique gradient id per mount, matching the SVG spec requirement
 *   that id values be document-unique.
 *
 * @iter 072
 * @modified iter 073 — unique gradient id per instance via useId()
 */

import { useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyBucket } from '@/lib/admin-operations/types.js';
import { formatIsoDate, formatNumber } from './format-utils.js';

interface TimeSeriesChartProps {
  /** Array of daily buckets from the API */
  data: DailyBucket[];
  /** Accessible label for the chart region */
  ariaLabel: string;
  /** Y-axis label shown as abbreviated suffix (e.g. "uploads") */
  yLabel?: string;
  /** Height of the chart in pixels (default 180) */
  height?: number;
  /** Fill color (CSS color value or var()) — defaults to accent mint */
  fillColor?: string;
  /** Stroke color — defaults to accent mint */
  strokeColor?: string;
}

/** Format tick labels on the X axis — short month+day form. */
function formatTick(dateStr: string): string {
  return formatIsoDate(dateStr);
}

export function TimeSeriesChart({
  data,
  ariaLabel,
  yLabel: _yLabel,
  height = 180,
  fillColor = 'var(--accent, #20f2a6)',
  strokeColor = 'var(--accent, #20f2a6)',
}: TimeSeriesChartProps) {
  // Each chart instance gets a document-unique gradient id (QA item 5, iter 073).
  // React 18 useId() guarantees uniqueness across concurrent renders.
  const instanceId = useId();
  const gradientId = `adminAreaGradient-${instanceId.replace(/:/g, '')}`;

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height }}
        aria-label={ariaLabel}
        role="img"
      >
        <p className="text-[13px] text-[var(--content-tertiary)]">No data in this range.</p>
      </div>
    );
  }

  return (
    <div aria-label={ariaLabel} role="img">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-default, #2a2a2a)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: 'var(--content-tertiary, #6b7280)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => formatNumber(v, { compact: true })}
            tick={{ fontSize: 11, fill: 'var(--content-tertiary, #6b7280)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-elevated, #1a1a1a)',
              border: '1px solid var(--border-default, #2a2a2a)',
              borderRadius: '8px',
              fontSize: 12,
              color: 'var(--content-primary, #f0f0f0)',
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [formatNumber(typeof value === 'number' ? value : null), '']}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => formatIsoDate(typeof label === 'string' ? label : null)}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
