'use client';

/**
 * RoiSection — the report's ROI panel.
 *
 * One workflow has no observed "after", so we surface its CURRENT labor cost
 * (volume × effort × persona-cost) — honest "cost", not "savings". A what-if lets
 * the reader mark steps Remove/Automate to see a PROJECTED after (clearly labeled
 * "projected — not yet observed"). Pure-engine backed; deterministic; honest.
 */

import { useMemo, useState } from 'react';
import { formatDuration } from '@/lib/format';
import { computeSingleWorkflowRoi, computeWhatIfRoi } from '@/lib/workflow-comparison';
import {
  DEFAULT_PERSONA_CATALOG,
  DEFAULT_PERSONA_KEY,
  getPersonaByKey,
  getDefaultPersona,
} from '@/lib/persona-costs';

const CUSTOM = 'custom';
type StepMode = 'keep' | 'remove' | 'automate';

export interface RoiStep {
  ordinal: number;
  title: string;
  durationMs: number;
}

const MODE_BADGE: Record<StepMode, { label: string; cls: string }> = {
  keep: { label: 'Keep', cls: 'text-[var(--content-tertiary)]' },
  remove: { label: 'Remove', cls: 'text-red-500' },
  automate: { label: 'Automate', cls: 'text-blue-500' },
};

export function RoiSection({ steps, observedRuns }: { steps: RoiStep[]; observedRuns: number | null }) {
  const [personaKey, setPersonaKey] = useState<string>(DEFAULT_PERSONA_KEY);
  const [hourlyRate, setHourlyRate] = useState<number>(getDefaultPersona().loadedHourlyRate);
  const [monthlyRuns, setMonthlyRuns] = useState<number>(observedRuns && observedRuns > 0 ? observedRuns : 20);
  const [modes, setModes] = useState<Record<number, StepMode>>({});

  const resolvedPersonaKey = personaKey === CUSTOM ? null : personaKey;

  const removed = useMemo(() => steps.filter((s) => modes[s.ordinal] === 'remove').map((s) => s.ordinal), [steps, modes]);
  const automated = useMemo(() => steps.filter((s) => modes[s.ordinal] === 'automate').map((s) => s.ordinal), [steps, modes]);

  const current = useMemo(
    () =>
      computeSingleWorkflowRoi({
        laborMsPerRun: steps.reduce((a, s) => a + s.durationMs, 0),
        monthlyRuns,
        hourlyRate,
        personaKey: resolvedPersonaKey,
      }),
    [steps, monthlyRuns, hourlyRate, resolvedPersonaKey],
  );

  const whatif = useMemo(
    () =>
      computeWhatIfRoi({
        steps,
        removedOrdinals: removed,
        automatedOrdinals: automated,
        monthlyRuns,
        hourlyRate,
        personaKey: resolvedPersonaKey,
      }),
    [steps, removed, automated, monthlyRuns, hourlyRate, resolvedPersonaKey],
  );

  // Defensive: nav gates this section, but never render an empty calculator.
  if (steps.length === 0) return null;

  const hasWhatIf = removed.length + automated.length > 0;

  function selectPersona(key: string) {
    setPersonaKey(key);
    const p = getPersonaByKey(key);
    if (p) setHourlyRate(p.loadedHourlyRate);
  }
  function editRate(rate: number) {
    setHourlyRate(rate);
    setPersonaKey(CUSTOM);
  }
  function cycleMode(ord: number) {
    setModes((m) => {
      const cur = m[ord] ?? 'keep';
      const next: StepMode = cur === 'keep' ? 'remove' : cur === 'remove' ? 'automate' : 'keep';
      return { ...m, [ord]: next };
    });
  }

  return (
    <div id="rpt-roi" className="scroll-mt-20">
      <h2 className="text-ds-lg font-bold text-[var(--content-primary)]">ROI estimate</h2>
      <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
        What this process costs to run — and what you&apos;d save by improving it. Volume and rate are your
        assumptions; the time is measured from real runs.
      </p>

      {/* Inputs: volume × persona-cost */}
      <div className="mt-ds-4 flex flex-wrap items-end gap-ds-3">
        <label className="flex flex-col text-[11px] text-[var(--content-secondary)]">
          Runs / month
          <input
            type="number"
            min={0}
            value={Number.isFinite(monthlyRuns) ? monthlyRuns : ''}
            onChange={(e) => setMonthlyRuns(Number(e.target.value))}
            className="mt-0.5 w-24 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1 text-ds-sm tabular-nums text-[var(--content-primary)]"
          />
          {observedRuns != null && (
            <span className="mt-0.5 text-[10px] text-[var(--content-tertiary)]">
              observed: {observedRuns} run{observedRuns === 1 ? '' : 's'} — set your volume
            </span>
          )}
        </label>
        <label className="flex flex-col text-[11px] text-[var(--content-secondary)]">
          Who does this work
          <select
            value={personaKey}
            onChange={(e) => selectPersona(e.target.value)}
            className="mt-0.5 w-48 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1 text-ds-sm text-[var(--content-primary)]"
          >
            {DEFAULT_PERSONA_CATALOG.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} — ${p.loadedHourlyRate}/hr
              </option>
            ))}
            <option value={CUSTOM}>Custom rate…</option>
          </select>
        </label>
        <label className="flex flex-col text-[11px] text-[var(--content-secondary)]">
          $ / hr (loaded)
          <input
            type="number"
            min={0}
            value={Number.isFinite(hourlyRate) ? hourlyRate : ''}
            onChange={(e) => editRate(Number(e.target.value))}
            className="mt-0.5 w-24 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1 text-ds-sm tabular-nums text-[var(--content-primary)]"
          />
        </label>
      </div>

      {/* Current cost */}
      <div className="mt-ds-4 rounded-ds-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 px-ds-5 py-ds-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)]">
          Current labor cost
        </p>
        {current.monthlyCost != null ? (
          <p className="mt-1 text-ds-2xl font-bold leading-none text-[var(--content-primary)]">
            ~${current.monthlyCost.toLocaleString()}/mo
            {current.annualCost != null && (
              <span className="text-[var(--content-secondary)]"> · ~${current.annualCost.toLocaleString()}/yr</span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-ds-base text-[var(--content-tertiary)]">
            Enter runs/month and a rate to estimate the cost.
          </p>
        )}
        <p className="mt-1 text-[11px] text-[var(--content-tertiary)]">
          {formatDuration(steps.reduce((a, s) => a + s.durationMs, 0))} of work per run × {monthlyRuns} runs/mo × ${hourlyRate}/hr.
        </p>
      </div>

      {/* What-if */}
      <div className="mt-ds-4">
        <p className="text-ds-sm font-semibold text-[var(--content-primary)]">What if you improved it?</p>
        <p className="mt-0.5 text-[11px] text-[var(--content-tertiary)]">
          Tap a step to mark it <span className="text-red-500">Remove</span> or{' '}
          <span className="text-blue-500">Automate</span> — see the projected saving.
        </p>

        <div className="mt-ds-3 space-y-1.5">
          {steps.map((s) => {
            const mode = modes[s.ordinal] ?? 'keep';
            const badge = MODE_BADGE[mode];
            const struck = mode !== 'keep';
            return (
              <button
                key={s.ordinal}
                type="button"
                onClick={() => cycleMode(s.ordinal)}
                className={`flex w-full items-center gap-3 rounded-ds-md border px-3 py-2 text-left transition-colors ${
                  mode === 'remove'
                    ? 'border-red-500/40 bg-red-500/5'
                    : mode === 'automate'
                    ? 'border-blue-500/40 bg-blue-500/5'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]'
                }`}
              >
                <span className="text-[11px] tabular-nums text-[var(--content-tertiary)] w-5">{s.ordinal}</span>
                <span className={`flex-1 text-ds-sm ${struck ? 'line-through text-[var(--content-tertiary)]' : 'text-[var(--content-primary)]'}`}>
                  {s.title}
                </span>
                <span className="text-[11px] tabular-nums text-[var(--content-tertiary)]">{formatDuration(s.durationMs)}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide w-16 text-right ${badge.cls}`}>{badge.label}</span>
              </button>
            );
          })}
        </div>

        {hasWhatIf && (
          <div className="mt-ds-3 rounded-ds-lg border border-blue-500/30 bg-blue-500/5 px-ds-5 py-ds-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
              Projected — not yet observed
            </p>
            {whatif.monthlyDollarsSaved != null && whatif.reductionPct != null ? (
              <p className="mt-1 text-ds-xl font-bold leading-tight text-[var(--content-primary)]">
                ~{whatif.reductionPct}% faster · save ~${whatif.monthlyDollarsSaved.toLocaleString()}/mo
                {whatif.annualDollarsSaved != null && (
                  <span className="text-[var(--content-secondary)]"> · ~${whatif.annualDollarsSaved.toLocaleString()}/yr</span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-ds-base text-[var(--content-tertiary)]">
                Enter runs/month and a rate to estimate the saving.
              </p>
            )}
            <p className="mt-1 text-[11px] text-[var(--content-secondary)]">
              {formatDuration(whatif.baselineLaborMsPerRun)} → {formatDuration(whatif.projectedLaborMsPerRun)} per run.
              Re-record after the change to verify.
            </p>
          </div>
        )}
      </div>

      <p className="mt-ds-3 text-[11px] text-[var(--content-tertiary)] leading-relaxed">
        <span className="font-medium text-[var(--content-secondary)]">Assumptions:</span> {monthlyRuns} runs/mo
        (your estimate) · ${hourlyRate}/hr ({current.personaLabel ? `${current.personaLabel} — default, editable` : 'custom rate'}) ·
        step times are <span className="text-[var(--content-secondary)]">observed</span> from recorded runs
        (active step time, a proxy until per-run timing lands).
      </p>
    </div>
  );
}
