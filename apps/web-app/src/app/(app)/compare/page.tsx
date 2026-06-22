'use client';

/**
 * /compare — Baseline vs After workflow comparison + ROI.
 *
 * The "must-have number": record a process, improve it, record it again, and see
 * "cycle time dropped 40%, saving ~X hours/month". Both sides are OBSERVED, so the
 * delta is defensible. ROI assumptions (runs/month, hourly rate) are user-supplied
 * and surfaced — never hidden. A slower "after" shows no fabricated savings.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { track } from '@/lib/analytics';
import {
  computeWorkflowComparison,
  type ComparisonWorkflowInput,
  type MetricDelta,
  type DeltaDirection,
} from '@/lib/workflow-comparison';
import {
  DEFAULT_PERSONA_CATALOG,
  DEFAULT_PERSONA_KEY,
  getPersonaByKey,
  getDefaultPersona,
} from '@/lib/persona-costs';

const CUSTOM_PERSONA = 'custom';

interface ApiWorkflow {
  id: string;
  title: string;
  toolsUsed?: string[] | null;
  metricsV2?: {
    runs: number | null;
    avgTimeMs: number | null;
    stepCount: number | null;
    healthScore: { overall: number; isGated: boolean };
  } | null;
}

function toInput(w: ApiWorkflow): ComparisonWorkflowInput {
  const m = w.metricsV2;
  return {
    id: w.id,
    title: w.title?.trim() || 'Untitled workflow',
    runs: m?.runs ?? null,
    avgTimeMs: m?.avgTimeMs ?? null,
    stepCount: m?.stepCount ?? null,
    systemCount: Array.isArray(w.toolsUsed) ? w.toolsUsed.length : 0,
    healthOverall: m?.healthScore?.overall ?? 0,
    healthGated: m?.healthScore?.isGated ?? false,
  };
}

// ── delta presentation ────────────────────────────────────────────────────────

const DIR_CLASS: Record<DeltaDirection, string> = {
  improved: 'text-emerald-600',
  degraded: 'text-red-600',
  flat: 'text-[var(--content-tertiary)]',
  na: 'text-[var(--content-tertiary)]',
};

function DeltaArrow({ delta }: { delta: MetricDelta }) {
  if (delta.absoluteDelta == null || delta.absoluteDelta === 0) {
    return <Minus className="h-3.5 w-3.5" aria-hidden />;
  }
  return delta.absoluteDelta < 0 ? (
    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
  ) : (
    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
  );
}

function formatValue(key: string, v: number | null, gated: boolean): string {
  if (key === 'health' && gated) return '—';
  if (v == null) return '—';
  if (key === 'cycleTime') return formatDuration(v);
  return String(v);
}

// ── page ────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [workflows, setWorkflows] = useState<ApiWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [baselineId, setBaselineId] = useState<string>('');
  const [afterId, setAfterId] = useState<string>('');
  const [personaKey, setPersonaKey] = useState<string>(DEFAULT_PERSONA_KEY);
  const [hourlyRate, setHourlyRate] = useState<number>(getDefaultPersona().loadedHourlyRate);
  const [monthlyRuns, setMonthlyRuns] = useState<number>(20);
  const monthlyRunsTouched = useRef(false);

  // Selecting a role pre-fills its loaded rate; typing a rate flips to "custom".
  function selectPersona(key: string) {
    setPersonaKey(key);
    const p = getPersonaByKey(key);
    if (p) setHourlyRate(p.loadedHourlyRate);
  }
  function editRate(rate: number) {
    setHourlyRate(rate);
    setPersonaKey(CUSTOM_PERSONA);
  }

  // Load the library (same endpoint the dashboard uses) + optional ?baseline=&after=.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/workflows')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data: { workflows?: ApiWorkflow[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data.workflows) ? data.workflows : [];
        setWorkflows(list);
        const params = new URLSearchParams(window.location.search);
        const pB = params.get('baseline');
        const pA = params.get('after');
        if (pB && list.some((w) => w.id === pB)) setBaselineId(pB);
        if (pA && list.some((w) => w.id === pA)) setAfterId(pA);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsError(true);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const baseline = useMemo(() => workflows.find((w) => w.id === baselineId) ?? null, [workflows, baselineId]);
  const after = useMemo(() => workflows.find((w) => w.id === afterId) ?? null, [workflows, afterId]);

  // Default monthly-runs from the "after" workflow's observed runs until the user
  // edits it (honest starting estimate, clearly editable).
  useEffect(() => {
    if (monthlyRunsTouched.current) return;
    const r = after?.metricsV2?.runs;
    if (r != null && Number.isFinite(r) && r > 0) setMonthlyRuns(r);
  }, [after]);

  const comparison = useMemo(() => {
    if (!baseline || !after || baseline.id === after.id) return null;
    return computeWorkflowComparison(toInput(baseline), toInput(after), {
      monthlyRuns,
      hourlyRate,
      personaKey: personaKey === CUSTOM_PERSONA ? null : personaKey,
    });
  }, [baseline, after, monthlyRuns, hourlyRate, personaKey]);

  // Observed run count on the "after" side — context for the volume assumption.
  const observedRuns = after?.metricsV2?.runs ?? null;

  // Fire one analytics event per distinct baseline→after pairing.
  const lastFiredPairRef = useRef<string>('');
  useEffect(() => {
    if (!comparison || !baseline || !after) return;
    const pair = `${baseline.id}>${after.id}`;
    if (lastFiredPairRef.current === pair) return;
    lastFiredPairRef.current = pair;
    track({
      event: 'workflow_comparison_viewed',
      confidence: comparison.confidence,
      hasSavings: comparison.roi.monthlyHoursSaved != null,
      slower: comparison.roi.slower,
      personaKey: comparison.roi.personaKey,
    });
  }, [comparison, baseline, after]);

  const confidenceLabel =
    comparison?.confidence === 'high'
      ? 'High confidence'
      : comparison?.confidence === 'medium'
      ? 'Medium confidence'
      : 'Low confidence';
  const confidenceClass =
    comparison?.confidence === 'high'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : comparison?.confidence === 'medium'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-[var(--surface-secondary)] text-[var(--content-secondary)] border-[var(--border-subtle)]';

  return (
    <div className="mx-auto max-w-4xl px-ds-4 py-ds-6 space-y-ds-6">
      <header>
        <h1 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">
          Before / After Comparison
        </h1>
        <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
          Compare a baseline recording against an improved one — and see the time and cost saved.
          Every figure is observed from real runs, not estimated.
        </p>
      </header>

      {isLoading ? (
        <p className="text-ds-sm text-[var(--content-tertiary)]">Loading your workflows…</p>
      ) : isError ? (
        <p className="text-ds-sm text-red-600">Could not load workflows — check your connection and retry.</p>
      ) : workflows.length < 2 ? (
        <div className="card px-ds-5 py-ds-8 text-center">
          <p className="text-ds-base font-medium text-[var(--content-primary)]">
            Record at least two workflows to compare
          </p>
          <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
            Record a process before you change it, improve it, then record it again — and compare the two here.
          </p>
        </div>
      ) : (
        <>
          {/* Selectors */}
          <section className="grid grid-cols-1 gap-ds-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <WorkflowSelect
              label="Baseline (before)"
              value={baselineId}
              onChange={setBaselineId}
              workflows={workflows}
              excludeId={afterId}
            />
            <div className="hidden items-center justify-center pb-2 sm:flex">
              <ArrowRight className="h-5 w-5 text-[var(--content-tertiary)]" aria-hidden />
            </div>
            <WorkflowSelect
              label="After (improved)"
              value={afterId}
              onChange={setAfterId}
              workflows={workflows}
              excludeId={baselineId}
            />
          </section>

          {!comparison ? (
            <p className="text-ds-sm text-[var(--content-tertiary)]">
              {baselineId && afterId && baselineId === afterId
                ? 'Pick two different workflows to compare.'
                : 'Select a baseline and an after workflow to see the comparison.'}
            </p>
          ) : (
            <>
              {/* Confidence + scope */}
              <div className="flex flex-wrap items-center gap-ds-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${confidenceClass}`}
                >
                  {confidenceLabel}
                </span>
                <span className="text-[11px] text-[var(--content-tertiary)]">
                  baseline {comparison.baselineRuns} run{comparison.baselineRuns === 1 ? '' : 's'} · after{' '}
                  {comparison.afterRuns} run{comparison.afterRuns === 1 ? '' : 's'}
                  {comparison.confidence === 'low' ? ' — record 2+ runs each for a defensible delta' : ''}
                </span>
              </div>

              {/* Deltas table */}
              <section className="overflow-hidden rounded-ds-lg border border-[var(--border-subtle)]">
                <table className="w-full text-ds-sm">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)] text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">
                      <th className="px-ds-4 py-ds-2 text-left font-semibold">Metric</th>
                      <th className="px-ds-4 py-ds-2 text-right font-semibold">Baseline</th>
                      <th className="px-ds-4 py-ds-2 text-right font-semibold">After</th>
                      <th className="px-ds-4 py-ds-2 text-right font-semibold">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {comparison.deltas.map((d) => (
                      <tr key={d.key}>
                        <td className="px-ds-4 py-ds-3 text-[var(--content-primary)]">{d.label}</td>
                        <td className="px-ds-4 py-ds-3 text-right tabular-nums text-[var(--content-secondary)]">
                          {formatValue(d.key, d.baselineValue, comparison.healthGated)}
                        </td>
                        <td className="px-ds-4 py-ds-3 text-right tabular-nums font-medium text-[var(--content-primary)]">
                          {formatValue(d.key, d.afterValue, comparison.healthGated)}
                        </td>
                        <td className={`px-ds-4 py-ds-3 text-right tabular-nums ${DIR_CLASS[d.direction]}`}>
                          <span className="inline-flex items-center justify-end gap-1">
                            {d.direction !== 'na' && d.percentDelta != null ? (
                              <>
                                <DeltaArrow delta={d} />
                                {d.percentDelta > 0 ? '+' : ''}
                                {d.percentDelta}%
                              </>
                            ) : (
                              '—'
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {comparison.healthGated && (
                  <p className="px-ds-4 py-ds-2 text-[11px] text-[var(--content-tertiary)] border-t border-[var(--border-subtle)]">
                    Health score is not shown on your plan — upgrade to compare health.
                  </p>
                )}
              </section>

              {/* ROI card */}
              <section className="rounded-ds-lg border border-brand-200 bg-gradient-to-br from-brand-50/70 to-white px-ds-5 py-ds-4">
                <div className="flex flex-wrap items-end justify-between gap-ds-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-700">
                      Estimated savings
                    </p>
                    {comparison.roi.monthlyHoursSaved != null ? (
                      <p className="mt-1 text-ds-2xl font-bold leading-none text-[var(--content-primary)]">
                        ~{comparison.roi.monthlyHoursSaved} hrs/mo
                        {comparison.roi.monthlyDollarsSaved != null && (
                          <span className="text-[var(--content-secondary)]">
                            {' '}
                            · ~${comparison.roi.monthlyDollarsSaved.toLocaleString()}/mo
                          </span>
                        )}
                      </p>
                    ) : comparison.roi.slower ? (
                      <p className="mt-1 text-ds-lg font-semibold text-red-600">
                        The “after” process is slower — no time saved.
                      </p>
                    ) : (
                      <p className="mt-1 text-ds-lg font-semibold text-[var(--content-tertiary)]">
                        Needs cycle-time data on both workflows.
                      </p>
                    )}
                    {comparison.roi.annualHoursSaved != null && (
                      <p className="mt-0.5 text-ds-sm text-[var(--content-secondary)]">
                        ≈ {comparison.roi.annualHoursSaved} hrs/yr
                        {comparison.roi.annualDollarsSaved != null &&
                          ` · $${comparison.roi.annualDollarsSaved.toLocaleString()}/yr`}
                      </p>
                    )}
                    {comparison.roi.baselineMonthlyCost != null && comparison.roi.afterMonthlyCost != null && (
                      <p className="mt-1.5 text-[11px] text-[var(--content-secondary)]">
                        Labor cost: ~${comparison.roi.baselineMonthlyCost.toLocaleString()}/mo now →{' '}
                        ~${comparison.roi.afterMonthlyCost.toLocaleString()}/mo after
                      </p>
                    )}
                  </div>

                  {/* Assumptions (editable): volume × persona-cost */}
                  <div className="flex flex-wrap items-end gap-ds-3">
                    <label className="flex flex-col text-[11px] text-[var(--content-secondary)]">
                      Runs / month
                      <input
                        type="number"
                        min={0}
                        value={Number.isFinite(monthlyRuns) ? monthlyRuns : ''}
                        onChange={(e) => {
                          monthlyRunsTouched.current = true;
                          setMonthlyRuns(Number(e.target.value));
                        }}
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
                        className="mt-0.5 w-48 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1 text-ds-sm font-normal text-[var(--content-primary)]"
                      >
                        {DEFAULT_PERSONA_CATALOG.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label} — ${p.loadedHourlyRate}/hr
                          </option>
                        ))}
                        <option value={CUSTOM_PERSONA}>Custom rate…</option>
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
                </div>

                <p className="mt-ds-3 text-[11px] text-[var(--content-tertiary)] leading-relaxed">
                  <span className="font-medium text-[var(--content-secondary)]">Assumptions:</span>{' '}
                  {monthlyRuns} runs/mo (your estimate) · ${hourlyRate}/hr{' '}
                  ({comparison.roi.personaLabel ? `${comparison.roi.personaLabel} — default, editable` : 'custom rate'}){' '}
                  · time saved is <span className="text-[var(--content-secondary)]">observed</span> from{' '}
                  {comparison.baselineRuns}+{comparison.afterRuns} runs.{' '}
                  Cycle time is a per-workflow average (a proxy until per-run timing lands); a slower &ldquo;after&rdquo; shows no savings.
                </p>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function WorkflowSelect({
  label,
  value,
  onChange,
  workflows,
  excludeId,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  workflows: ApiWorkflow[];
  excludeId: string;
}) {
  return (
    <label className="flex flex-col text-[11px] font-semibold uppercase tracking-wide text-[var(--content-secondary)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-ds-sm font-normal normal-case text-[var(--content-primary)]"
      >
        <option value="">Select a workflow…</option>
        {workflows.map((w) => (
          <option key={w.id} value={w.id} disabled={w.id === excludeId}>
            {w.title?.trim() || 'Untitled workflow'}
          </option>
        ))}
      </select>
    </label>
  );
}
