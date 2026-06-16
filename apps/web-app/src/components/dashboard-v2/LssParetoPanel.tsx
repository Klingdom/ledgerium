'use client';

/**
 * LssParetoPanel — the "Measure & Analyze" lens headline visual (v1).
 *
 * Renders, above the workflow list when the LSS lens is active:
 *   1. A Pareto of workflows by TOTAL OBSERVED TIME (mean cycle time × runs):
 *      descending bars + a cumulative-% line, with the "vital few" (~80%) called
 *      out. N-attribution ("· N runs") on every bar.
 *   2. A compact variation/consistency strip: variant-count spread + cycle-time
 *      spread — real signals only, gated at runCount ≥ 2.
 *
 * IMPLEMENTATION (deterministic + hydration-safe): pure CSS/SVG bars + an SVG
 * polyline for the cumulative curve. No Recharts, no animations, no Date.now()/
 * Math.random() in render. The Pareto math arrives pre-computed (pure
 * `derivePareto` / `deriveVariationStrip`), so server and first-client paint are
 * byte-identical given identical input.
 *
 * HONESTY (DASHBOARD_PERSONAS_REVIEW boundaries): labels are exactly "Total
 * observed time", "Variants", "Cycle-time spread". No value-add %, no DPMO /
 * sigma / Cp-Cpk, no fabricated CV. Absent values render "—". Single-run
 * variation renders "needs 2+ runs".
 *
 * @see ../../lib/dashboard-lenses/pareto.ts — pure derivations
 * @see docs/features/dashboard-personas/LSS_EXPERT_REVIEW.md §5 (move 3)
 */

import { useId, useMemo } from 'react';
import { formatDuration } from '@/lib/format.js';
import {
  derivePareto,
  deriveVariationStrip,
  type ParetoWorkflowInput,
} from '@/lib/dashboard-lenses/pareto.js';
import { ACCENT, GRID_COLOR } from './band/band-colors.js';

const VITAL_FEW_COLOR = 'var(--accent, #16a34a)';
const TAIL_COLOR = 'var(--border-default, #9ca3af)';
const CUMULATIVE_COLOR = 'var(--severity-warning, #d97706)';

export interface LssParetoPanelProps {
  /** Candidate workflows (shell maps WorkflowRowData → ParetoWorkflowInput). */
  workflows: readonly ParetoWorkflowInput[];
  /**
   * atglance-review #9: scroll-to + highlight the matching workflow row when a
   * Pareto bar (or its legend entry) is clicked. Observed-only drill — it
   * navigates to the real row; it never fabricates a drill target. Optional so
   * standalone/test usage renders a non-interactive Pareto.
   */
  onSelectWorkflow?: (workflowId: string) => void;
}

export default function LssParetoPanel({ workflows, onSelectWorkflow }: LssParetoPanelProps) {
  // useId-pinned gradient/clip ids (collision-safe per iter-073 Recharts fix
  // convention) — even though we use plain SVG, unique ids keep multiple panel
  // instances from colliding.
  const rawId = useId().replace(/:/g, '');

  const pareto = useMemo(() => derivePareto(workflows), [workflows]);
  const variation = useMemo(() => deriveVariationStrip(workflows), [workflows]);

  const { bars, grandTotalMs, vitalFewCount, vitalFewThresholdPct, includedCount, excludedCount } =
    pareto;

  // Honest empty/sparse state: fewer than 3 bars → no meaningful 80/20 story.
  if (bars.length < 3) {
    return (
      <section
        id="dashboard-lens-panel"
        role="region"
        aria-labelledby="lens-tab-lss"
        aria-label="Measure and Analyze panel"
        className="rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-ds-4 mb-ds-3"
      >
        <PanelHeader grandTotalMs={grandTotalMs} barCount={bars.length} />
        <p className="text-[13px] text-[var(--content-secondary)] mt-ds-2">
          Record 3 or more processes with at least one run to see your time-impact
          Pareto.
          {excludedCount > 0 && (
            <>
              {' '}
              {excludedCount} workflow{excludedCount === 1 ? '' : 's'} excluded
              (needs 1+ run with measurable cycle time).
            </>
          )}
        </p>
      </section>
    );
  }

  // Chart geometry (deterministic; no responsive measurement at render time —
  // SVG scales via viewBox + preserveAspectRatio="none").
  const VIEW_W = 1000;
  const VIEW_H = 220;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;
  const PAD_LEFT = 8;
  const PAD_RIGHT = 8;
  const plotW = VIEW_W - PAD_LEFT - PAD_RIGHT;
  const plotH = VIEW_H - PAD_TOP - PAD_BOTTOM;
  const n = bars.length;
  const slot = plotW / n;
  const barW = slot * 0.62;

  const maxTotal = bars[0]?.totalObservedMs ?? 1; // bars are desc → first is max

  // Pre-compute bar rects + cumulative line points (pure; no clock).
  const barRects = bars.map((b, i) => {
    const h = maxTotal > 0 ? (b.totalObservedMs / maxTotal) * plotH : 0;
    const x = PAD_LEFT + i * slot + (slot - barW) / 2;
    const y = PAD_TOP + (plotH - h);
    return { ...b, x, y, w: barW, h };
  });

  const cumulativePoints = bars
    .map((b, i) => {
      const cx = PAD_LEFT + i * slot + slot / 2;
      const cy = PAD_TOP + (plotH - (b.cumulativePct / 100) * plotH);
      return `${cx.toFixed(2)},${cy.toFixed(2)}`;
    })
    .join(' ');

  // The 80% reference line position.
  const thresholdY = PAD_TOP + (plotH - (vitalFewThresholdPct / 100) * plotH);

  const gridId = `pareto-grid-${rawId}`;

  return (
    <section
      id="dashboard-lens-panel"
      role="region"
      aria-labelledby="lens-tab-lss"
      aria-label="Measure and Analyze panel"
      className="rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-ds-4 mb-ds-3 flex flex-col gap-ds-3"
    >
      <PanelHeader grandTotalMs={grandTotalMs} barCount={n} />

      {/* Item #13 — plain-language lead takeaway: turns the Pareto from an
          expert chart into an obvious "focus here" insight before any jargon. */}
      <p className="text-[13px] text-[var(--content-secondary)]">
        A few workflows eat most of your time. The tallest bars below are where
        focus pays off most.
      </p>

      {/* Vital-few summary — honest "where your time goes". "the vital few" is
          made self-explaining by the sentence above + the gloss tooltip. */}
      <p className="text-[13px] text-[var(--content-secondary)]">
        <span className="font-semibold text-[var(--content-primary)]">
          {vitalFewCount} of {includedCount}
        </span>{' '}
        workflow{includedCount === 1 ? '' : 's'} account for ~{vitalFewThresholdPct}% of
        total observed time —{' '}
        <span
          className="underline decoration-dotted underline-offset-2"
          title="The small number of workflows that together drive most of the total observed time — the ones worth tackling first."
        >
          the vital few
        </span>
        .
      </p>

      {/* Pareto chart — pure SVG, deterministic, no animation. */}
      <div role="img" aria-label={paretoAriaLabel(barRects)}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          height={VIEW_H}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern id={gridId} width="1" height={plotH / 4} patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2={VIEW_W} y2="0" stroke={GRID_COLOR} strokeWidth="1" />
            </pattern>
          </defs>

          {/* Horizontal gridlines */}
          {[0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1={PAD_LEFT}
              x2={VIEW_W - PAD_RIGHT}
              y1={PAD_TOP + plotH - frac * plotH}
              y2={PAD_TOP + plotH - frac * plotH}
              stroke={GRID_COLOR}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}

          {/* 80% threshold reference line */}
          <line
            x1={PAD_LEFT}
            x2={VIEW_W - PAD_RIGHT}
            y1={thresholdY}
            y2={thresholdY}
            stroke={CUMULATIVE_COLOR}
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity={0.6}
          />

          {/* Bars */}
          {barRects.map((b) => (
            <rect
              key={b.id}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={3}
              fill={b.isVitalFew ? VITAL_FEW_COLOR : TAIL_COLOR}
              fillOpacity={b.isVitalFew ? 0.9 : 0.55}
            >
              <title>
                {`${b.title} — ${formatDuration(b.avgTimeMs)} × ${b.runs} run${
                  b.runs === 1 ? '' : 's'
                } = ${formatDuration(b.totalObservedMs)} total (${b.sharePct.toFixed(
                  0,
                )}%)`}
              </title>
            </rect>
          ))}

          {/* Cumulative-% line */}
          <polyline
            points={cumulativePoints}
            fill="none"
            stroke={CUMULATIVE_COLOR}
            strokeWidth="2"
          />
          {barRects.map((b, i) => {
            const cx = PAD_LEFT + i * slot + slot / 2;
            const cy = PAD_TOP + (plotH - (b.cumulativePct / 100) * plotH);
            return <circle key={`pt-${b.id}`} cx={cx} cy={cy} r={3} fill={CUMULATIVE_COLOR} />;
          })}
        </svg>
      </div>

      {/* Bar legend with explicit N-attribution (accessible table-free list).
          atglance-review #9: each entry is a real button (when wired) that
          scrolls to + highlights the matching workflow row — an observed-only
          drill into the actual row, never a fabricated target. */}
      <ul className="flex flex-col gap-0.5">
        {barRects.map((b) => {
          const rowContent = (
            <>
              <span className="flex items-center gap-ds-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: b.isVitalFew ? ACCENT : TAIL_COLOR }}
                />
                <span className="truncate text-[var(--content-primary)]">{b.title}</span>
              </span>
              <span className="flex-shrink-0 tabular-nums text-[var(--content-secondary)]">
                {formatDuration(b.totalObservedMs)} total ·{' '}
                <span title="Observed run count">{b.runs} run{b.runs === 1 ? '' : 's'}</span>
              </span>
            </>
          );
          return (
            <li key={`legend-${b.id}`}>
              {onSelectWorkflow ? (
                <button
                  type="button"
                  onClick={() => onSelectWorkflow(b.id)}
                  className="flex w-full items-center justify-between gap-ds-2 text-[12px] text-left rounded px-ds-1 -mx-ds-1 transition-colors duration-150 hover:bg-[var(--surface-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  aria-label={`Go to ${b.title} in the list`}
                  title="Scroll to this workflow in the list"
                >
                  {rowContent}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-ds-2 text-[12px]">
                  {rowContent}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {excludedCount > 0 && (
        <p className="text-[12px] text-[var(--content-tertiary)]">
          + {excludedCount} workflow{excludedCount === 1 ? '' : 's'} with no measurable
          cycle time excluded (needs 1+ run).
        </p>
      )}

      {/* Variation / consistency strip — real signals only, honestly labeled. */}
      <VariationStrip variation={variation} />
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PanelHeader({
  grandTotalMs,
  barCount,
}: {
  grandTotalMs: number;
  barCount: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-ds-2">
      {/* Item #13 — lead the header with meaning; keep "Pareto" as a parenthetical
          gloss for experts rather than the headline. */}
      <h2 className="text-[14px] font-semibold text-[var(--content-primary)]">
        Where your time goes{' '}
        <span
          className="text-[12px] font-normal text-[var(--content-tertiary)]"
          title="A Pareto chart ranks your workflows by total observed time so the few that drive most of the work stand out first."
        >
          (Pareto)
        </span>
      </h2>
      {barCount > 0 && (
        <span className="text-[12px] text-[var(--content-secondary)] tabular-nums">
          {formatDuration(grandTotalMs)} total observed time
        </span>
      )}
    </div>
  );
}

function VariationStrip({
  variation,
}: {
  variation: ReturnType<typeof deriveVariationStrip>;
}) {
  const { multiRunCount, variantSpread, cycleSpreadMs } = variation;

  return (
    <div className="border-t border-[var(--border-subtle)] pt-ds-2 flex flex-wrap items-center gap-ds-4">
      <span
        className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]"
        title="How consistent are these runs? Based only on workflows with 2 or more recorded runs."
      >
        Consistency signals
      </span>

      <Stat
        label="Variants"
        title="Distinct ways the same process was actually performed across its runs."
        value={
          variantSpread
            ? variantSpread.min === variantSpread.max
              ? `${variantSpread.min}`
              : `${variantSpread.min}–${variantSpread.max}`
            : '—'
        }
        sub={
          multiRunCount > 0
            ? `across ${multiRunCount} multi-run workflow${multiRunCount === 1 ? '' : 's'}`
            : 'needs 2+ runs'
        }
      />

      <Stat
        label="Cycle-time spread"
        title="The range between the fastest and slowest workflow's average run time."
        value={
          cycleSpreadMs
            ? `${formatDuration(cycleSpreadMs.min)} – ${formatDuration(cycleSpreadMs.max)}`
            : '—'
        }
        sub="observed mean cycle time"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  title,
}: {
  label: string;
  value: string;
  sub: string;
  /** Item #13 — plain-language gloss for the stat label (definitions only). */
  title?: string | undefined;
}) {
  return (
    <div className="flex flex-col" {...(title !== undefined ? { title } : {})}>
      <span className="text-[13px] font-semibold text-[var(--content-primary)] tabular-nums">
        {value}
      </span>
      <span className="text-[11px] text-[var(--content-secondary)]">
        {label} · {sub}
      </span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function paretoAriaLabel(
  bars: ReadonlyArray<{ title: string; totalObservedMs: number; runs: number }>,
): string {
  if (bars.length === 0) return 'No time-impact data';
  const top = bars
    .slice(0, 3)
    .map((b) => `${b.title} (${formatDuration(b.totalObservedMs)}, ${b.runs} runs)`)
    .join('; ');
  return `Pareto of workflows by total observed time. Top: ${top}`;
}
