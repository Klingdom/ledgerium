'use client';

/**
 * TimeSinkRanking — Portfolio Time-Sink Ranking (T1, Cross-Workflow
 * Intelligence program). Renders the ranked-bottleneck-bars view from
 * `docs/meta/TIMESTUDY_INTELLIGENCE_REVIEW_001/ux_analysis.md` §4 "Design —
 * Time-Study Bottleneck Ranking", scoped to panel 1 (portfolio-wide ranked
 * bars) + panel 3 (per-row step-duration range), reading the already-live
 * `GET /api/analytics/time-sinks` contract.
 *
 * Every visual figure traces back to `evidenceRunIds` — the deterministic,
 * evidence-linked framing carried through every Ledgerium metrics surface.
 *
 * States rendered explicitly (see `time-sink-view.ts` `TimeSinkViewState`):
 * loading · unauthorized · forbidden (plan-gated) · error ·
 * empty-no-workflows · empty-no-coverage · ready.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowLeft, AlertTriangle, Lock, Layers } from 'lucide-react';
import { track } from '@/lib/analytics';
import type { PortfolioTimeSinkReport } from '@ledgerium/intelligence-engine';
import {
  deriveTimeSinkViewState,
  deriveTotalsDisplay,
  deriveRankedEntryDisplays,
  formatPlanName,
  type TimeSinkEntryDisplay,
} from '@/lib/time-sink-view';

interface TimeSinkApiEnvelope {
  data: PortfolioTimeSinkReport | null;
  error: { code: string; message: string } | null;
  meta: { requiredPlan?: string; upgradeUrl?: string } & Record<string, unknown>;
}

const SEVERITY_STYLE: Record<'high' | 'moderate', { text: string; bg: string }> = {
  high: { text: 'text-red-600', bg: 'bg-red-500' },
  moderate: { text: 'text-amber-600', bg: 'bg-amber-500' },
};

export function TimeSinkRanking() {
  const [isLoading, setIsLoading] = useState(true);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [report, setReport] = useState<PortfolioTimeSinkReport | null>(null);
  const [requiredPlan, setRequiredPlan] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setHasNetworkError(false);
    try {
      const res = await fetch('/api/analytics/time-sinks');
      setHttpStatus(res.status);
      const json: TimeSinkApiEnvelope = await res.json();
      if (res.ok) {
        setReport(json.data);
      } else {
        setReport(null);
        if (res.status === 403) setRequiredPlan(json.meta?.requiredPlan);
      }
    } catch {
      setHasNetworkError(true);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    track({ event: 'page_viewed', path: '/analytics/time-sinks' });
  }, [loadData]);

  const state = deriveTimeSinkViewState({ isLoading, httpStatus, hasNetworkError, report });

  return (
    <div className="space-y-ds-6">
      <div>
        <Link
          href="/analytics"
          className="inline-flex items-center gap-1 text-ds-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] mb-ds-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Intelligence
        </Link>
        <h1 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">
          Where Your Time Goes
        </h1>
        <p className="text-ds-sm text-[var(--content-secondary)] mt-0.5">
          Every workflow ranked by cumulative recorded time, with its biggest observed bottleneck.
        </p>
      </div>

      {state === 'loading' && (
        <div className="text-center text-ds-sm text-[var(--content-tertiary)] py-20">
          Loading time-sink ranking...
        </div>
      )}

      {state === 'unauthorized' && (
        <div className="card px-ds-6 py-ds-8 text-center">
          <p className="text-ds-sm text-[var(--content-secondary)]">
            Please sign in to view your portfolio time-sink ranking.
          </p>
          <Link href="/login" className="btn-primary mt-ds-4 inline-flex">
            Sign in
          </Link>
        </div>
      )}

      {state === 'forbidden' && (
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--surface-elevated)] px-ds-8 py-ds-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]">
              <Lock className="h-7 w-7 text-[var(--content-tertiary)]" />
            </div>
            <h3 className="mt-ds-4 text-ds-base font-medium text-[var(--content-primary)]">
              Portfolio time-sink ranking is a {formatPlanName(requiredPlan)}+ feature
            </h3>
            <p className="mt-ds-1 text-ds-sm text-[var(--content-secondary)]">
              Upgrade to see where your team&apos;s time actually goes, ranked across every recorded workflow.
            </p>
            <Link
              href="/pricing"
              onClick={() => track({ event: 'cta_clicked', location: 'time_sinks_gate', destination: '/pricing' })}
              className="btn-primary mt-ds-4 inline-flex"
            >
              View plans
            </Link>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="card px-ds-6 py-ds-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-ds-2 text-ds-sm text-[var(--content-secondary)]">
            Could not load the time-sink ranking — check your connection and retry.
          </p>
          <button onClick={loadData} className="btn-secondary mt-ds-4 inline-flex">
            Retry
          </button>
        </div>
      )}

      {state === 'empty-no-workflows' && (
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--surface-elevated)] px-ds-8 py-ds-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]">
              <Layers className="h-7 w-7 text-[var(--content-tertiary)]" />
            </div>
            <h3 className="mt-ds-4 text-ds-base font-medium text-[var(--content-primary)]">
              No workflows recorded yet
            </h3>
            <p className="mt-ds-1 text-ds-sm text-[var(--content-secondary)]">
              Record a process to start ranking where your time actually goes.
            </p>
            <Link
              href="/upload"
              onClick={() => track({ event: 'cta_clicked', location: 'time_sinks_empty', destination: '/upload' })}
              className="btn-primary mt-ds-4 inline-flex"
            >
              Upload a workflow
            </Link>
          </div>
        </div>
      )}

      {state === 'empty-no-coverage' && report && (
        <div className="card px-ds-6 py-ds-8 text-center">
          <Clock className="mx-auto h-6 w-6 text-[var(--content-tertiary)]" />
          <h3 className="mt-ds-2 text-ds-base font-medium text-[var(--content-primary)]">
            No timing data yet
          </h3>
          <p className="mt-ds-1 text-ds-sm text-[var(--content-secondary)] max-w-md mx-auto">
            {report.totals.workflowCount} workflow{report.totals.workflowCount === 1 ? '' : 's'} recorded, but none
            have enough runs yet to compute a time-sink ranking. Record more runs of the same process to unlock
            ranked bottlenecks.
          </p>
        </div>
      )}

      {state === 'ready' && report && <ReadyView report={report} />}
    </div>
  );
}

function ReadyView({ report }: { report: PortfolioTimeSinkReport }) {
  const totals = deriveTotalsDisplay(report);
  const rows = deriveRankedEntryDisplays(report.ranked);

  return (
    <>
      {/* Portfolio totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-ds-3" role="group" aria-label="Portfolio time-sink totals">
        <div className="card px-ds-4 py-ds-3">
          <p className="text-[10px] font-medium text-[var(--content-tertiary)] uppercase tracking-wide mb-1">
            Total recorded time
          </p>
          <p className="text-ds-lg font-bold tabular-nums text-[var(--content-primary)]">{totals.totalTimeLabel}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="text-[10px] font-medium text-[var(--content-tertiary)] uppercase tracking-wide mb-1">
            Coverage
          </p>
          <p className="text-ds-lg font-bold tabular-nums text-[var(--content-primary)]">
            {totals.coveredWorkflowCount} / {totals.workflowCount}
          </p>
          <p className="text-ds-xs text-[var(--content-secondary)] mt-0.5">{totals.coverageLabel}</p>
        </div>
      </div>

      {/* Ranked list */}
      <section aria-label="Workflows ranked by time-sink">
        <ul className="space-y-ds-2" role="list">
          {rows.map((row) => (
            <TimeSinkRow key={row.workflowId} row={row} />
          ))}
        </ul>
      </section>
    </>
  );
}

function TimeSinkRow({ row }: { row: TimeSinkEntryDisplay }) {
  const severityStyle = row.bottleneckSeverity ? SEVERITY_STYLE[row.bottleneckSeverity] : null;

  return (
    <li
      className={`card px-ds-4 py-ds-3 ${row.deemphasized ? 'opacity-60' : ''}`}
      aria-label={`Rank ${row.rank}: ${row.title}, ${row.aggregateTimeLabel} across ${row.runCount} runs, ${row.pctLabel} of portfolio time`}
    >
      <div className="flex items-start justify-between gap-ds-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-ds-2">
            <span className="text-ds-xs font-mono text-[var(--content-tertiary)] w-5 flex-shrink-0">#{row.rank}</span>
            <Link
              href={`/workflows/${row.workflowId}`}
              className="text-ds-sm font-medium text-[var(--content-primary)] hover:text-brand-600 truncate"
            >
              {row.title}
            </Link>
          </div>

          {/* Bar */}
          <div
            className="mt-1.5 h-2 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden"
            role="img"
            aria-label={`${row.pctLabel} of portfolio time`}
          >
            <div
              className={`h-full rounded-full ${row.deemphasized ? 'bg-[var(--border-default)]' : 'bg-brand-500'}`}
              style={{ width: `${row.barWidthPct}%` }}
            />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-ds-3 text-ds-xs text-[var(--content-secondary)]">
            <span>{row.runCount} run{row.runCount !== 1 ? 's' : ''}</span>
            <span className="tabular-nums">{row.aggregateTimeLabel}</span>
            <span className="tabular-nums">{row.pctLabel} of portfolio time</span>
            <span className="text-[var(--content-tertiary)] italic">{row.evidenceLabel}</span>
          </div>

          {row.bottleneckLabel && (
            <p className={`mt-1 text-ds-xs font-medium ${severityStyle?.text ?? 'text-[var(--content-secondary)]'}`}>
              {row.bottleneckLabel}
            </p>
          )}
          {!row.bottleneckLabel && !row.deemphasized && (
            <p className="mt-1 text-ds-xs text-[var(--content-tertiary)]">No standout bottleneck step identified.</p>
          )}
          {row.deemphasized && <p className="mt-1 text-ds-xs text-[var(--content-tertiary)]">No timing yet.</p>}

          {row.rangeLabel && (
            <p className="mt-1 text-[11px] text-[var(--content-tertiary)] tabular-nums">
              Step duration range: {row.rangeLabel}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
