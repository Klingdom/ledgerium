'use client';

/**
 * ProcessDiffView — N-Way Process Diff (T2, Cross-Workflow Intelligence
 * program). Renders the "aligned swimlanes" design from
 * `docs/meta/TIMESTUDY_INTELLIGENCE_REVIEW_001/ux_analysis.md` §2
 * "N-Way Process Diff", reading the already-live `POST
 * /api/analytics/process-diff` contract.
 *
 * A workflow multi-select (2–6, choose baseline) posts to the diff endpoint;
 * the result renders as an accessible `<table>` — columns = workflows
 * (baseline first), rows = aligned step slots — with a structural ↔ temporal
 * lens toggle (aligned steps vs. same-scale timeline). Every visual figure
 * traces back to `evidenceRunIds`, the deterministic evidence-linked framing
 * carried through every Ledgerium metrics surface.
 *
 * All states rendered explicitly (see `process-diff-view.ts`):
 * no-workflows-available · need-more-selection · too-many-selected ·
 * idle · loading · unauthorized · gated · insufficient-workflows · error ·
 * ready.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Lock, Layers, GitCompare } from 'lucide-react';
import { track } from '@/lib/analytics';
import { formatPlanName } from '@/lib/time-sink-view';
import type { ProcessDiffReport } from '@ledgerium/intelligence-engine';
import {
  MIN_COMPARE_WORKFLOWS,
  MAX_COMPARE_WORKFLOWS,
  deriveSelectionState,
  deriveProcessDiffFetchState,
  deriveProcessDiffGrid,
  deriveProcessDiffTemporalColumns,
  formatEvidenceLabel,
  type ProcessDiffLens,
} from '@/lib/process-diff-view';

interface ApiWorkflow {
  id: string;
  title: string;
  metricsV2?: { runs: number | null } | null;
}

interface ProcessDiffApiEnvelope {
  data: ProcessDiffReport | null;
  error: { code: string; message: string } | null;
  meta: { requiredPlan?: string; skipped?: string[]; missingIds?: string[] } & Record<string, unknown>;
}

export function ProcessDiffView() {
  // ── Workflow library (for the picker) ──────────────────────────────────────
  const [workflows, setWorkflows] = useState<ApiWorkflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);
  const [libraryError, setLibraryError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/workflows')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data: { workflows?: ApiWorkflow[] }) => {
        if (cancelled) return;
        setWorkflows(Array.isArray(data.workflows) ? data.workflows : []);
        setIsLoadingWorkflows(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLibraryError(true);
        setIsLoadingWorkflows(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    track({ event: 'page_viewed', path: '/compare/diff' });
  }, []);

  // ── Selection ───────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [baselineId, setBaselineId] = useState<string>('');
  const [lens, setLens] = useState<ProcessDiffLens>('structural');

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // If the baseline was removed from the selection, or nothing is set yet,
      // default to the first selected workflow.
      if (!next.includes(baselineId)) setBaselineId(next[0] ?? '');
      return next;
    });
  }

  const selectionState = deriveSelectionState(selectedIds.length, workflows.length);

  // ── Diff fetch ────────────────────────────────────────────────────────────────
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiredPlan, setRequiredPlan] = useState<string | undefined>(undefined);
  const [report, setReport] = useState<ProcessDiffReport | null>(null);

  const requestKey = selectionState === 'ready-to-compare' ? `${[...selectedIds].sort().join(',')}|${baselineId}` : '';

  useEffect(() => {
    if (selectionState !== 'ready-to-compare') {
      setReport(null);
      setHttpStatus(null);
      setHasNetworkError(false);
      setErrorCode(null);
      return;
    }
    let cancelled = false;
    setIsLoadingDiff(true);
    setHasNetworkError(false);
    fetch('/api/analytics/process-diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowIds: selectedIds, baselineId: baselineId || undefined }),
    })
      .then(async (res) => {
        if (cancelled) return;
        setHttpStatus(res.status);
        const json: ProcessDiffApiEnvelope = await res.json();
        if (res.ok) {
          setReport(json.data);
          setErrorCode(null);
          setErrorMessage(null);
        } else {
          setReport(null);
          setErrorCode(json.error?.code ?? null);
          setErrorMessage(json.error?.message ?? null);
          if (res.status === 403) setRequiredPlan(json.meta?.requiredPlan);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setHasNetworkError(true);
        setReport(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingDiff(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, selectionState]);

  const fetchState = deriveProcessDiffFetchState({
    isLoading: isLoadingDiff,
    httpStatus,
    hasNetworkError,
    errorCode,
    report,
  });

  const titlesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const w of workflows) map[w.id] = w.title?.trim() || 'Untitled workflow';
    return map;
  }, [workflows]);

  const grid = useMemo(() => (report ? deriveProcessDiffGrid(report, titlesById) : null), [report, titlesById]);
  const temporalColumns = useMemo(
    () => (report && lens === 'temporal' ? deriveProcessDiffTemporalColumns(report, titlesById) : null),
    [report, lens, titlesById],
  );

  // Fire one process_diff_viewed event per distinct report, at the currently active lens.
  const lastFiredReportRef = useRef<string>('');
  const viewFiredAtMsRef = useRef<number>(0);
  useEffect(() => {
    if (!report) return;
    const key = `${report.baselineId}|${report.rowCount}|${selectedIds.slice().sort().join(',')}`;
    if (lastFiredReportRef.current === key) return;
    lastFiredReportRef.current = key;
    viewFiredAtMsRef.current = Date.now();
    track({ event: 'process_diff_viewed', workflowCount: selectedIds.length, rowCount: report.rowCount, lens });
    // Deliberately excludes `lens` from deps — the initial view fires once per
    // distinct report regardless of which lens is active at that instant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, selectedIds]);

  function switchLens(next: ProcessDiffLens) {
    if (next === lens) return;
    track({
      event: 'process_diff_lens_toggled',
      fromLens: lens,
      toLens: next,
      elapsedMsSinceProcessDiffView: viewFiredAtMsRef.current > 0 ? Date.now() - viewFiredAtMsRef.current : 0,
    });
    setLens(next);
  }

  function changeBaseline(id: string) {
    setBaselineId(id);
    track({ event: 'process_diff_baseline_changed', workflowCount: selectedIds.length });
  }

  return (
    <div className="mx-auto max-w-6xl px-ds-4 py-ds-6 space-y-ds-6">
      <div>
        <Link
          href="/compare"
          className="inline-flex items-center gap-1 text-ds-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] mb-ds-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Compare
        </Link>
        <h1 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">
          Compare Process Steps
        </h1>
        <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
          Pick 2–6 workflows and see exactly where they structurally diverge — and which of those
          divergences actually costs time. Reads like a code diff, not a spreadsheet.
        </p>
      </div>

      {isLoadingWorkflows ? (
        <p className="text-ds-sm text-[var(--content-tertiary)]">Loading your workflows...</p>
      ) : libraryError ? (
        <div className="card px-ds-6 py-ds-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-ds-2 text-ds-sm text-[var(--content-secondary)]">
            Could not load workflows — check your connection and retry.
          </p>
        </div>
      ) : selectionState === 'no-workflows-available' ? (
        <div className="card px-ds-5 py-ds-8 text-center">
          <p className="text-ds-base font-medium text-[var(--content-primary)]">
            Record at least two workflows to compare
          </p>
          <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
            Record a process, then record another one — and compare their steps side by side here.
          </p>
        </div>
      ) : (
        <>
          <WorkflowPicker
            workflows={workflows}
            selectedIds={selectedIds}
            baselineId={baselineId}
            onToggle={toggleSelected}
            onBaselineChange={changeBaseline}
          />

          {selectionState === 'need-more-selection' && (
            <p className="text-ds-sm text-[var(--content-tertiary)]">
              Select at least {MIN_COMPARE_WORKFLOWS} workflows to compare (you have {selectedIds.length} selected).
            </p>
          )}
          {selectionState === 'too-many-selected' && (
            <p className="text-ds-sm text-amber-700">
              {selectedIds.length} selected — that&apos;s hard to read side-by-side. Pick {MAX_COMPARE_WORKFLOWS} or
              fewer for a detailed diff.
            </p>
          )}

          {selectionState === 'ready-to-compare' && (
            <>
              {fetchState === 'loading' && (
                <p className="text-ds-sm text-[var(--content-tertiary)]">Computing process diff...</p>
              )}

              {fetchState === 'unauthorized' && (
                <div className="card px-ds-6 py-ds-8 text-center">
                  <p className="text-ds-sm text-[var(--content-secondary)]">
                    Please sign in to compare process steps.
                  </p>
                  <Link href="/login" className="btn-primary mt-ds-4 inline-flex">
                    Sign in
                  </Link>
                </div>
              )}

              {fetchState === 'gated' && (
                <div className="card overflow-hidden">
                  <div className="bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--surface-elevated)] px-ds-8 py-ds-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]">
                      <Lock className="h-7 w-7 text-[var(--content-tertiary)]" />
                    </div>
                    <h3 className="mt-ds-4 text-ds-base font-medium text-[var(--content-primary)]">
                      Process step comparison is a {formatPlanName(requiredPlan)}+ feature
                    </h3>
                    <p className="mt-ds-1 text-ds-sm text-[var(--content-secondary)]">
                      Upgrade to see exactly where your workflows structurally diverge.
                    </p>
                    <Link
                      href="/pricing"
                      onClick={() => track({ event: 'cta_clicked', location: 'process_diff_gate', destination: '/pricing' })}
                      className="btn-primary mt-ds-4 inline-flex"
                    >
                      View plans
                    </Link>
                  </div>
                </div>
              )}

              {fetchState === 'insufficient-workflows' && (
                <div className="card px-ds-6 py-ds-8 text-center">
                  <Layers className="mx-auto h-6 w-6 text-[var(--content-tertiary)]" />
                  <h3 className="mt-ds-2 text-ds-base font-medium text-[var(--content-primary)]">
                    Not enough recorded process data yet
                  </h3>
                  <p className="mt-ds-1 text-ds-sm text-[var(--content-secondary)] max-w-md mx-auto">
                    {errorMessage ??
                      'At least 2 of the selected workflows need a recorded process with steps to build a diff.'}
                  </p>
                </div>
              )}

              {fetchState === 'error' && (
                <div className="card px-ds-6 py-ds-8 text-center">
                  <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
                  <p className="mt-ds-2 text-ds-sm text-[var(--content-secondary)]">
                    Could not compute the process diff — check your connection and retry.
                  </p>
                </div>
              )}

              {fetchState === 'ready' && report && grid && (
                <ReadyView
                  report={report}
                  grid={grid}
                  temporalColumns={temporalColumns}
                  lens={lens}
                  onLensChange={switchLens}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Workflow picker ────────────────────────────────────────────────────────────

function WorkflowPicker({
  workflows,
  selectedIds,
  baselineId,
  onToggle,
  onBaselineChange,
}: {
  workflows: ApiWorkflow[];
  selectedIds: string[];
  baselineId: string;
  onToggle: (id: string) => void;
  onBaselineChange: (id: string) => void;
}) {
  return (
    <section className="card px-ds-4 py-ds-4 space-y-ds-3" aria-label="Workflow selection">
      <div>
        <h2 className="text-ds-sm font-semibold text-[var(--content-primary)]">
          Select workflows to compare ({MIN_COMPARE_WORKFLOWS}–{MAX_COMPARE_WORKFLOWS})
        </h2>
        <ul className="mt-ds-2 max-h-64 overflow-y-auto space-y-1 pr-1" role="list">
          {workflows.map((w) => {
            const checked = selectedIds.includes(w.id);
            return (
              <li key={w.id}>
                <label className="flex items-center gap-2 rounded-ds-md px-2 py-1.5 text-ds-sm hover:bg-[var(--surface-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(w.id)}
                    className="h-4 w-4 rounded border-[var(--border-subtle)]"
                  />
                  <span className="flex-1 truncate text-[var(--content-primary)]">
                    {w.title?.trim() || 'Untitled workflow'}
                  </span>
                  {w.metricsV2?.runs != null && (
                    <span className="text-ds-xs text-[var(--content-tertiary)] tabular-nums">
                      {w.metricsV2.runs} run{w.metricsV2.runs === 1 ? '' : 's'}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {selectedIds.length >= MIN_COMPARE_WORKFLOWS && (
        <label className="flex flex-col text-[11px] font-semibold uppercase tracking-wide text-[var(--content-secondary)]">
          Baseline
          <select
            value={baselineId}
            onChange={(e) => onBaselineChange(e.target.value)}
            className="mt-1 w-full max-w-sm rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-ds-sm font-normal normal-case text-[var(--content-primary)]"
          >
            {selectedIds.map((id) => {
              const w = workflows.find((x) => x.id === id);
              return (
                <option key={id} value={id}>
                  {w?.title?.trim() || 'Untitled workflow'}
                </option>
              );
            })}
          </select>
        </label>
      )}
    </section>
  );
}

// ─── Ready view: lens toggle + summary + grid ──────────────────────────────────

function ReadyView({
  report,
  grid,
  temporalColumns,
  lens,
  onLensChange,
}: {
  report: ProcessDiffReport;
  grid: ReturnType<typeof deriveProcessDiffGrid>;
  temporalColumns: ReturnType<typeof deriveProcessDiffTemporalColumns> | null;
  lens: ProcessDiffLens;
  onLensChange: (lens: ProcessDiffLens) => void;
}) {
  return (
    <>
      {/* Lens toggle + evidence cue */}
      <div className="flex flex-wrap items-center justify-between gap-ds-2">
        <div className="inline-flex rounded-ds-md border border-[var(--border-subtle)] p-0.5" role="group" aria-label="Diff lens">
          <LensButton active={lens === 'structural'} onClick={() => onLensChange('structural')}>
            Aligned steps
          </LensButton>
          <LensButton active={lens === 'temporal'} onClick={() => onLensChange('temporal')}>
            Same-scale timeline
          </LensButton>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] italic text-[var(--content-tertiary)]">
          <GitCompare className="h-3.5 w-3.5" aria-hidden />
          {grid.evidenceLabel}
        </span>
      </div>

      {lens === 'structural' ? <StructuralGrid grid={grid} /> : <TemporalTimeline columns={temporalColumns ?? []} />}
    </>
  );
}

function LensButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[5px] px-3 py-1.5 text-ds-xs font-medium transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Structural (aligned-steps) grid ────────────────────────────────────────────

function StructuralGrid({ grid }: { grid: ReturnType<typeof deriveProcessDiffGrid> }) {
  return (
    <section className="overflow-x-auto rounded-ds-lg border border-[var(--border-subtle)]" aria-label="Aligned process-step diff">
      <table className="w-full text-ds-sm border-collapse">
        <caption className="sr-only">
          Aligned process-step diff across {grid.columns.length} workflows, {grid.rows.length} step rows
        </caption>
        <thead>
          <tr className="bg-[var(--surface-secondary)] text-[11px] uppercase tracking-wide text-[var(--content-tertiary)]">
            <th scope="col" className="px-ds-3 py-ds-2 text-left font-semibold sticky left-0 bg-[var(--surface-secondary)]">
              Step
            </th>
            {grid.columns.map((col) => (
              <th key={col.workflowId} scope="col" className="px-ds-3 py-ds-2 text-left font-semibold min-w-[10rem]">
                <span className="normal-case text-ds-xs font-semibold text-[var(--content-primary)]">
                  {col.title}
                  {col.isBaseline && ' (baseline)'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          <tr className="bg-[var(--surface-secondary)]/40">
            <th scope="row" className="px-ds-3 py-ds-2 text-left text-ds-xs font-semibold text-[var(--content-secondary)] sticky left-0 bg-[var(--surface-secondary)]">
              Summary
            </th>
            {grid.columns.map((col) => (
              <td key={col.workflowId} className="px-ds-3 py-ds-2 align-top">
                <p className="text-ds-xs tabular-nums text-[var(--content-primary)] font-medium">
                  {col.totalDurationLabel}
                  {col.deltaLabel && (
                    <span className={`ml-1.5 ${col.deltaDirectionClass}`}>{col.deltaLabel}</span>
                  )}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--content-tertiary)]">
                  {col.matched} matched · {col.added} added · {col.removed} removed · {col.reordered} reordered
                </p>
              </td>
            ))}
          </tr>
          {grid.rows.map((row) => (
            <tr key={row.rowIndex}>
              <th scope="row" className="px-ds-3 py-ds-2 text-left align-top text-ds-xs font-medium text-[var(--content-secondary)] sticky left-0 bg-[var(--surface-primary)]">
                {row.rowLabel}
                {row.isInsertionRow && <span className="ml-1 text-[10px] italic text-[var(--content-tertiary)]">(new)</span>}
              </th>
              {row.cells.map((cell) => (
                <td
                  key={cell.workflowId}
                  aria-label={cell.ariaLabel}
                  className={`border px-ds-2 py-1.5 align-top ${cell.bgClass} ${cell.borderClass}`}
                >
                  <div className={`text-ds-xs font-medium ${cell.textClass} ${cell.strikethrough ? 'line-through' : ''}`}>
                    {cell.stepLabel ?? '—'}
                  </div>
                  {cell.status !== 'absent' && (
                    <>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                        <div
                          className={`h-full rounded-full ${
                            cell.status === 'matched' ? 'bg-brand-500' : cell.status === 'removed' ? 'bg-red-400' : cell.status === 'reordered' ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${cell.barWidthPct}%` }}
                        />
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] tabular-nums text-[var(--content-tertiary)]">
                        <span>{cell.durationLabel}</span>
                        {cell.deltaLabel && <span>{cell.deltaLabel}</span>}
                      </div>
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── Temporal ("same-scale timeline") lens ──────────────────────────────────────

function TemporalTimeline({ columns }: { columns: ReturnType<typeof deriveProcessDiffTemporalColumns> }) {
  return (
    <section className="space-y-ds-3" aria-label="Same-scale process timeline">
      <p className="text-ds-xs text-[var(--content-tertiary)]">
        Each bar is drawn to the same wall-clock scale — a longer bar means more total recorded time,
        regardless of step count.
      </p>
      <ul className="space-y-ds-2" role="list">
        {columns.map((col) => (
          <li key={col.workflowId} className="card px-ds-4 py-ds-3">
            <div className="flex items-center justify-between gap-ds-2">
              <span className="text-ds-sm font-medium text-[var(--content-primary)] truncate">
                {col.title}
                {col.isBaseline && ' (baseline)'}
              </span>
              <span className="text-ds-xs tabular-nums text-[var(--content-secondary)]">{col.totalDurationLabel}</span>
            </div>
            <div
              className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]"
              role="img"
              aria-label={`${col.title} timeline: ${col.totalDurationLabel} across ${col.segments.length} steps`}
            >
              {col.segments.map((seg, i) => (
                <div
                  key={`${seg.key}-${i}`}
                  className={`h-full first:rounded-l-full last:rounded-r-full ${
                    seg.status === 'matched' ? 'bg-brand-500' : seg.status === 'reordered' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${seg.widthPct}%` }}
                  title={`${seg.stepLabel ?? seg.key}${seg.durationMs != null ? ` · ${seg.durationMs}ms` : ''}`}
                />
              ))}
            </div>
            {col.unknownDurationStepCount > 0 && (
              <p className="mt-1 text-[10px] text-[var(--content-tertiary)]">
                {col.unknownDurationStepCount} step{col.unknownDurationStepCount === 1 ? '' : 's'} without timing data
                (not shown on the bar).
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
