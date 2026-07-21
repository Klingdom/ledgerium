'use client';

/**
 * BackupStatusSection — admin-only view of the backup sidecar's status.
 *
 * WHY THIS EXISTS (SOP_BUILDER_REVIEW_001 B-4): the original failure mode
 * in this codebase was correct machinery built and never connected, and
 * nobody could see it — backup scripts existed for a long time but were
 * never deployed. The sidecar now ships (scripts/db-backup.sh +
 * scripts/evidence-backup.sh, hourly cron), but off-host storage is not
 * yet provisioned, so today's real state is "backing up locally, not
 * durable." This section exists to make that state visible rather than
 * silent — including the uncomfortable middle state where backups are
 * running but not yet safe.
 *
 * Self-fetching, like the top-level AdminOperationsDashboard (fetch +
 * useState + useEffect — see that file's header for why: TanStack Query
 * is not installed). A dedicated fetch to GET /api/admin/backup-status
 * rather than folding into the composite operations query, so a
 * filesystem read failure here never blocks the rest of the dashboard.
 *
 * Five states must read as visually distinct (never conflate "local-only"
 * with "durable" — see deriveStateBadgeMeta):
 *   never-run  — no status file has ever been written. Most severe.
 *   failing    — the most recent attempt errored, or recent attempts are
 *                not landing as successes.
 *   stale      — last success is meaningfully overdue.
 *   local-only — succeeding on schedule, but the artifact has not reached
 *                off-host storage. Genuinely better than nothing, and
 *                genuinely not safe — must not read as healthy.
 *   durable    — succeeding on schedule and stored off this server. The
 *                only state that reads as fully healthy.
 * A sixth, defensive state — 'unknown' — covers a status file that exists
 * but could not be read or parsed; this is NOT the same claim as
 * "never-run" (we know nothing ran) — it means this dashboard cannot
 * currently verify backup health either way.
 *
 * Tone precedent: AlignmentBadge (components/sop-view/SOPHeader.tsx) —
 * calm, factual disclosure rather than a fake green check or an alarmist
 * red banner. See deriveStateDescription for the copy this precedent
 * produced, especially the local-only wording.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Clock, Shield, ShieldCheck, HelpCircle } from 'lucide-react';
import { SectionCard } from './SectionCard.js';
import { RefreshControl } from './RefreshControl.js';
import { formatRelativeTime, formatBytes, formatNumber } from './format-utils.js';
import type {
  BackupStatusApiResponse,
  BackupStatusSummary,
  BackupComponentState,
  BackupStatusOverallState,
  DbBackupDerived,
  EvidenceBackupDerived,
} from '@/lib/admin-operations/backup-status.js';

const API_URL = '/api/admin/backup-status';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';
type ArtifactNoun = 'database' | 'evidence';

// ── Pure helpers (exported for tests) ─────────────────────────────────────────

export interface StateBadgeMeta {
  label: string;
  toneClass: string;
}

const RED_TONE = 'text-red-400 bg-red-500/10 border-red-500/30';
const AMBER_TONE = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
// "local-only" gets its own hue, distinct from both the amber "stale"
// warning and the neutral "unknown" disclosure — it is a specific,
// known, actionable incompleteness, not degradation and not an unknown.
const BLUE_TONE = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
const GREEN_TONE = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
const NEUTRAL_TONE =
  'text-[var(--content-secondary)] bg-[var(--surface-secondary)] border-[var(--border-default)]';

/**
 * Badge copy + tone per overall/component state. Every state maps to a
 * distinct tone — in particular `local-only` (blue) is never the same
 * tone as `durable` (green) or `stale` (amber): this is the one mapping
 * in this module that exists specifically so "succeeding but not durable"
 * cannot be visually mistaken for "healthy."
 */
export function deriveStateBadgeMeta(state: BackupStatusOverallState): StateBadgeMeta {
  switch (state) {
    case 'never-run':
      return { label: 'Never run', toneClass: RED_TONE };
    case 'failing':
      return { label: 'Failing', toneClass: RED_TONE };
    case 'stale':
      return { label: 'Stale', toneClass: AMBER_TONE };
    case 'local-only':
      return { label: 'Local only', toneClass: BLUE_TONE };
    case 'durable':
      return { label: 'Durable', toneClass: GREEN_TONE };
    case 'unknown':
      return { label: 'Status unknown', toneClass: NEUTRAL_TONE };
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

/**
 * Per-artifact description, factual rather than alarmist per the
 * AlignmentBadge tone precedent. The `local-only` copy is written to be
 * neither reassuring nor alarming: it names the real risk (a
 * server-level incident would still destroy this data) without
 * catastrophizing a state that is, in fact, better than nothing.
 */
export function deriveStateDescription(noun: ArtifactNoun, state: BackupComponentState): string {
  switch (state) {
    case 'never-run':
      return `No ${noun} backup has been attempted yet.`;
    case 'failing':
      return `The most recent ${noun} backup attempt did not succeed.`;
    case 'stale':
      return `The last successful ${noun} backup is overdue for a refresh.`;
    case 'local-only':
      return `${noun === 'database' ? 'Database' : 'Evidence'} backups are running on schedule but have not reached off-host storage yet — a server-level incident would still destroy this data.`;
    case 'durable':
      return `${noun === 'database' ? 'Database' : 'Evidence'} backups are running on schedule and stored off this server.`;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

/**
 * Panel-level message shown when there is no per-artifact data at all
 * (file absent, or file unreadable/invalid). Distinguishes the two:
 * "never-run" states plainly that nothing has ever been recorded;
 * "unknown" is explicit that the dashboard cannot currently verify
 * anything, one way or the other — it does not claim backups are broken.
 */
export function derivePanelMessage(
  overallState: 'never-run' | 'unknown',
  unknownReason: string | null,
): { title: string; body: string } {
  if (overallState === 'never-run') {
    return {
      title: 'No backup has ever run',
      body:
        'No backup status has been recorded for this deployment yet. Until a backup completes, this server has no recovery copy of its data.',
    };
  }
  return {
    title: 'Backup status unknown',
    body:
      `The backup status file could not be read${unknownReason ? ` (${unknownReason})` : ''}. ` +
      'This does not mean backups are failing — it means this dashboard cannot currently verify them.',
  };
}

// ── Presentational sub-components ───────────────────────────────────────────────

function StateIcon({ state }: { state: BackupStatusOverallState }) {
  switch (state) {
    case 'never-run':
    case 'failing':
      return <AlertTriangle className="h-3 w-3" aria-hidden="true" />;
    case 'stale':
      return <Clock className="h-3 w-3" aria-hidden="true" />;
    case 'local-only':
      return <Shield className="h-3 w-3" aria-hidden="true" />;
    case 'durable':
      return <ShieldCheck className="h-3 w-3" aria-hidden="true" />;
    case 'unknown':
      return <HelpCircle className="h-3 w-3" aria-hidden="true" />;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function StateBadge({ state }: { state: BackupStatusOverallState }) {
  const meta = deriveStateBadgeMeta(state);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${meta.toneClass}`}
      role="status"
      aria-label={meta.label}
      data-testid={`backup-state-badge-${state}`}
    >
      <StateIcon state={state} />
      {meta.label}
    </span>
  );
}

function ArtifactRow({
  label,
  noun,
  derived,
  detail,
}: {
  label: string;
  noun: ArtifactNoun;
  derived: DbBackupDerived | EvidenceBackupDerived;
  detail: string;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg bg-[var(--surface-primary)] px-4 py-3"
      data-testid={`backup-artifact-row-${noun}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--content-primary)]">{label}</p>
        <StateBadge state={derived.state} />
      </div>
      <p className="text-[12px] text-[var(--content-secondary)]">
        {deriveStateDescription(noun, derived.state)}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[var(--content-tertiary)]">
        <span>
          Last success:{' '}
          {formatRelativeTime(derived.lastSuccessAt ? new Date(derived.lastSuccessAt) : null)}
        </span>
        {derived.state === 'failing' && (
          <span>
            Last attempt:{' '}
            {formatRelativeTime(derived.lastAttemptAt ? new Date(derived.lastAttemptAt) : null)}
          </span>
        )}
        <span>{detail}</span>
      </div>
      {derived.lastError && (
        <p className="text-[11px] text-red-400" role="alert">
          {derived.lastError}
        </p>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BackupStatusSection() {
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [summary, setSummary] = useState<BackupStatusSummary | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');
    setErrorMessage(null);

    try {
      const res = await fetch(API_URL);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as BackupStatusApiResponse;
      if (!mountedRef.current) return;

      if (json.error) {
        setStatus('error');
        setErrorMessage(
          json.error.message ?? 'Could not load backup status — check your connection and retry.',
        );
      } else {
        setStatus('success');
        setSummary(json.data);
        setLastUpdatedAt(new Date());
      }
    } catch {
      if (!mountedRef.current) return;
      setStatus('error');
      setErrorMessage('Could not load backup status — check your connection and retry.');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isLoading = status === 'loading' || status === 'idle';

  return (
    <SectionCard
      title="Backup Status"
      isLoading={isLoading}
      loadingVariant="list"
      loadingRows={3}
      isEmpty={false}
      error={status === 'error' ? errorMessage : null}
      data-testid="section-backup-status"
    >
      <div className="flex flex-col gap-4">
        <RefreshControl
          onRefresh={fetchStatus}
          lastUpdatedAt={lastUpdatedAt}
          isRefreshing={isLoading}
          data-testid="backup-status-refresh"
        />

        {summary && !summary.db && (
          (() => {
            const overall = summary.overallState as 'never-run' | 'unknown';
            const panel = derivePanelMessage(overall, summary.unknownReason);
            return (
              <div
                className="flex flex-col items-start gap-2 rounded-lg bg-[var(--surface-primary)] px-4 py-3"
                data-testid="backup-status-panel-message"
              >
                <div className="flex items-center gap-2">
                  <StateBadge state={overall} />
                  <p className="text-[13px] font-medium text-[var(--content-primary)]">
                    {panel.title}
                  </p>
                </div>
                <p className="text-[12px] text-[var(--content-secondary)]">{panel.body}</p>
              </div>
            );
          })()
        )}

        {summary && summary.db && summary.evidence && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--content-tertiary)]">
              <span>Off-host storage:</span>
              <span
                className={
                  summary.offHostConfigured
                    ? 'font-medium text-emerald-400'
                    : 'font-medium text-[var(--content-secondary)]'
                }
              >
                {summary.offHostConfigured ? 'configured' : 'not configured'}
              </span>
              {summary.lastRunAt && (
                <span>· Last cycle {formatRelativeTime(new Date(summary.lastRunAt))}</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ArtifactRow
                label="Database"
                noun="database"
                derived={summary.db}
                detail={formatBytes(summary.db.sizeBytes)}
              />
              <ArtifactRow
                label="Evidence"
                noun="evidence"
                derived={summary.evidence}
                detail={`${formatNumber(summary.evidence.archiveCount)} archive${
                  summary.evidence.archiveCount === 1 ? '' : 's'
                }`}
              />
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
