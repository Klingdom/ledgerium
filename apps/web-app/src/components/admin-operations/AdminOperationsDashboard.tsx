'use client';

/**
 * AdminOperationsDashboard — Client Component for the Admin Operations page.
 *
 * Data fetching follows the existing codebase pattern:
 *   fetch + useState + useEffect
 *   (TanStack Query not installed — see DashboardV2Shell FRONTEND_NOTES deviation)
 *
 * State:
 *   - range: 7d | 30d | 90d  (affects charts; persisted in localStorage)
 *   - data: AdminOperationsApiResponse | null
 *   - status: 'idle' | 'loading' | 'success' | 'error'
 *   - lastUpdatedAt: Date | null
 *
 * Layout:
 *   1. Sticky header strip — two KPI rows (5 growth + 5 product/ops) + refresh control + range selector
 *   2. 7 section cards in a 2-column grid (wide screens)
 *   3. Footer timestamp
 *
 * @iter 072 — original
 * @extended iter 096 / ADM-002 PR-7 — UserDetailDrawer integration
 * @extended iter B — Growth Intelligence Extension (KPI rework + Growth Overview + Subscription Breakdown)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdminOperationsApiResponse, TimeRangeDays } from '@/lib/admin-operations/types.js';
import { KpiTile } from './KpiTile.js';
import { SectionCard } from './SectionCard.js';
import { TimeSeriesChart } from './TimeSeriesChart.js';
import { LeaderboardTable } from './LeaderboardTable.js';
import { MemoryGauge } from './MemoryGauge.js';
import { RefreshControl } from './RefreshControl.js';
import { LoadingSkeleton } from './LoadingSkeleton.js';
import { UserDetailDrawer } from './user-detail/UserDetailDrawer.js';
import { SubscriptionPlanBar } from './SubscriptionPlanBar.js';
import { SubscriptionStatusBar } from './SubscriptionStatusBar.js';
import {
  formatNumber,
  formatBytes,
  formatPercent,
  formatCurrency,
  formatUptime,
  formatRelativeTime,
} from './format-utils.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const LS_RANGE_KEY = 'ledgerium_admin_ops_range';
const VALID_RANGES: TimeRangeDays[] = [7, 30, 90];

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';
type RangeLabel = '7d' | '30d' | '90d';

const RANGE_LABELS: Record<TimeRangeDays, RangeLabel> = {
  7: '7d',
  30: '30d',
  90: '90d',
};

// ── Pure helpers (exported for tests) ─────────────────────────────────────────

/** Parse a stored range value; returns 30 as default for invalid input. */
export function parseStoredRange(raw: string | null): TimeRangeDays {
  const n = parseInt(raw ?? '', 10) as TimeRangeDays;
  return VALID_RANGES.includes(n) ? n : 30;
}

/** Build the API URL for a given range. */
export function buildApiUrl(range: TimeRangeDays): string {
  return `/api/admin/operations?range=${RANGE_LABELS[range]}`;
}

/**
 * Derive the upload status breakdown as a human-readable summary.
 * Returns null when all counts are 0 (empty state).
 */
export function deriveUploadStatusSummary(
  pending: number,
  valid: number,
  invalid: number,
): string | null {
  const total = pending + valid + invalid;
  if (total === 0) return null;
  return `${valid} valid · ${pending} pending · ${invalid} invalid`;
}

/**
 * Derive a processing success rate label.
 * Returns '—' when rate is null.
 */
export function deriveSuccessRateLabel(rate: number | null): string {
  if (rate == null) return '—';
  return formatPercent(rate);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AdminOperationsDashboard() {
  const [range, setRange] = useState<TimeRangeDays>(30);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [apiResponse, setApiResponse] = useState<AdminOperationsApiResponse | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drawer state — null means closed
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Hydrate range from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_RANGE_KEY);
    const parsed = parseStoredRange(stored);
    setRange(parsed);
  }, []);

  // Fetch data
  const fetchData = useCallback(
    async (r: TimeRangeDays) => {
      if (!mountedRef.current) return;
      setStatus('loading');
      setErrorMessage(null);

      try {
        const res = await fetch(buildApiUrl(r));
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as AdminOperationsApiResponse;
        if (!mountedRef.current) return;

        if (json.error) {
          setStatus('error');
          setErrorMessage(json.error.message ?? 'Could not load data — check your connection and retry.');
        } else {
          setStatus('success');
          setApiResponse(json);
          setLastUpdatedAt(new Date());
        }
      } catch {
        if (!mountedRef.current) return;
        setStatus('error');
        setErrorMessage('Could not load operations data — check your connection and retry.');
      }
    },
    [],
  );

  // Initial load and re-fetch on range change
  useEffect(() => {
    fetchData(range);
  }, [fetchData, range]);

  // Handle range change
  function handleRangeChange(next: TimeRangeDays) {
    setRange(next);
    localStorage.setItem(LS_RANGE_KEY, String(next));
  }

  // Manual/auto refresh (always uses current range)
  const handleRefresh = useCallback(() => {
    fetchData(range);
  }, [fetchData, range]);

  const isLoading = status === 'loading' || status === 'idle';
  const data = apiResponse?.data ?? null;

  // ── KPI tile values ──────────────────────────────────────────────────────────

  const kpiTiles = data?.kpi;

  // ── Subscription breakdown state derivation ──────────────────────────────────

  const sub = data?.subscriptionBreakdown;
  const hasStripeData = sub != null && sub.paidUserCount + sub.byStatus.trialing > 0;
  const hasPaidUsers = (sub?.paidUserCount ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[var(--surface-primary)]">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 border-b border-[var(--border-default)] bg-[var(--surface-elevated)]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-screen-xl px-6 py-3">
          {/* Row 1: title + controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[15px] font-semibold text-[var(--content-primary)]">
              Operations
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* Time-range selector (affects charts) */}
              <div
                className="flex overflow-hidden rounded-md border border-[var(--border-default)]"
                role="group"
                aria-label="Chart time range"
              >
                {VALID_RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRangeChange(r)}
                    className={`px-3 py-1.5 text-[12px] transition-colors ${
                      range === r
                        ? 'bg-[var(--accent,#20f2a6)] font-semibold text-black'
                        : 'bg-[var(--surface-elevated)] text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]'
                    }`}
                    aria-pressed={range === r}
                  >
                    {RANGE_LABELS[r]}
                  </button>
                ))}
              </div>
              <RefreshControl
                onRefresh={handleRefresh}
                lastUpdatedAt={lastUpdatedAt}
                isRefreshing={isLoading}
              />
            </div>
          </div>

          {/* ── KPI rows: two rows of 5 ── */}

          {/* Row 2 — Growth row */}
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--content-tertiary)]">
              Growth
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-[var(--surface-secondary)] px-4 py-3">
                    <LoadingSkeleton variant="tile" />
                  </div>
                ))
              ) : (
                <>
                  <KpiTile
                    label="Total Users"
                    value={formatNumber(kpiTiles?.totalUsers)}
                  />
                  <KpiTile
                    label="New Signups"
                    value={formatNumber(kpiTiles?.signupsInRange)}
                    delta={`in ${RANGE_LABELS[range]}`}
                  />
                  <KpiTile
                    label="Paid Users"
                    value={formatNumber(kpiTiles?.payingSubscribers)}
                  />
                  <KpiTile
                    label="Est. MRR"
                    value={formatCurrency(kpiTiles?.mrrUsd)}
                    sublabel="active subs, list price"
                    accent
                  />
                  <KpiTile
                    label="Free → Paid %"
                    value={formatPercent(kpiTiles?.freeToPaidConversionPct)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Row 3 — Product / Ops row */}
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--content-tertiary)]">
              Product / Ops
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-[var(--surface-secondary)] px-4 py-3">
                    <LoadingSkeleton variant="tile" />
                  </div>
                ))
              ) : (
                <>
                  <KpiTile
                    label="Total Recordings"
                    value={formatNumber(kpiTiles?.uploadsInRange)}
                    delta={`in ${RANGE_LABELS[range]}`}
                  />
                  <KpiTile
                    label="Activation %"
                    value={formatPercent(kpiTiles?.activationRatePct)}
                    sublabel="≥1 workflow / total users"
                  />
                  <KpiTile
                    label="MAU 30d"
                    value={formatNumber(kpiTiles?.mau30d)}
                    sublabel="active accounts, 30d"
                  />
                  {(() => {
                    const dbParts = kpiTiles?.dbSizeBytes != null
                      ? formatBytes(kpiTiles.dbSizeBytes).split(' ')
                      : null;
                    const dbValue = dbParts != null ? (dbParts[0] ?? '—') : '—';
                    const dbUnit = dbParts?.[1];
                    return (
                      <KpiTile
                        label="DB Size"
                        value={dbValue}
                        {...(dbUnit !== undefined ? { unit: dbUnit } : {})}
                      />
                    );
                  })()}
                  <KpiTile
                    label="Errors (24h)"
                    value={formatNumber(kpiTiles?.errorEvents24hTotal)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-screen-xl px-6 py-6">
        {status === 'error' && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400"
          >
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Section: Growth Overview (full width) ── */}
          <div className="lg:col-span-2">
            <SectionCard
              title="Growth Overview"
              isLoading={isLoading}
              loadingVariant="chart"
              isEmpty={false}
              data-testid="section-growth-overview"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Left: signup trend */}
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
                    New Signups / Day
                  </p>
                  <TimeSeriesChart
                    data={data?.userVolume.newUsersTimeSeries ?? []}
                    ariaLabel="New signups per day chart"
                    seriesALabel="Signups"
                  />
                </div>
                {/* Right: workflow created + uploads (dual chart) */}
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
                    Workflows Created vs Uploads / Day
                  </p>
                  <TimeSeriesChart
                    data={data?.workflowProcessing.workflowsTimeSeries ?? []}
                    ariaLabel="Workflows created and uploads per day chart"
                    seriesALabel="Workflows"
                    seriesB={{
                      data: data?.recordingVolume.uploadsTimeSeries ?? [],
                      label: 'Uploads',
                      strokeColor: '#f59e0b',
                      fillColor: '#f59e0b',
                    }}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── Section 1: User Volume ── */}
          <SectionCard
            title="User Volume"
            isLoading={isLoading}
            loadingVariant="chart"
            isEmpty={!isLoading && data?.userVolume.newUsersTimeSeries.length === 0}
            emptyLabel="No new users in this range."
            data-testid="section-user-volume"
          >
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 text-[13px]">
                <div>
                  <p className="text-[11px] text-[var(--content-tertiary)]">Total users</p>
                  <p className="tabular-nums font-semibold text-[var(--content-primary)]">
                    {formatNumber(data?.userVolume.totalUsers)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--content-tertiary)]">MAU 30d</p>
                  <p className="tabular-nums font-semibold text-[var(--content-primary)]">
                    {formatNumber(data?.userVolume.mau30d)}
                  </p>
                </div>
              </div>
              <TimeSeriesChart
                data={data?.userVolume.newUsersTimeSeries ?? []}
                ariaLabel="New users per day chart"
              />
              {(data?.userVolume.topUploaders.length ?? 0) > 0 && (
                <>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
                    Top Uploaders
                  </p>
                  <LeaderboardTable
                    rows={data?.userVolume.topUploaders ?? []}
                    countLabel="Uploads"
                    maxRows={5}
                    data-testid="top-uploaders-table"
                    onRowClick={(userId) => setSelectedUserId(userId)}
                  />
                </>
              )}
            </div>
          </SectionCard>

          {/* ── Section 2: Recording Volume ── */}
          <SectionCard
            title="Recording Volume"
            isLoading={isLoading}
            loadingVariant="chart"
            isEmpty={!isLoading && (data?.recordingVolume.uploadsInRange ?? 0) === 0}
            emptyLabel="No recordings in this range."
            data-testid="section-recording-volume"
          >
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 text-[13px]">
                <div>
                  <p className="text-[11px] text-[var(--content-tertiary)]">Total in range</p>
                  <p className="tabular-nums font-semibold text-[var(--content-primary)]">
                    {formatNumber(data?.recordingVolume.uploadsInRange)}
                  </p>
                </div>
                {data?.recordingVolume.uploadsByStatus && (
                  <div>
                    <p className="text-[11px] text-[var(--content-tertiary)]">Status</p>
                    <p className="text-[12px] text-[var(--content-secondary)]">
                      {deriveUploadStatusSummary(
                        data.recordingVolume.uploadsByStatus.pending,
                        data.recordingVolume.uploadsByStatus.valid,
                        data.recordingVolume.uploadsByStatus.invalid,
                      ) ?? '—'}
                    </p>
                  </div>
                )}
              </div>
              <TimeSeriesChart
                data={data?.recordingVolume.uploadsTimeSeries ?? []}
                ariaLabel="Uploads per day chart"
              />
            </div>
          </SectionCard>

          {/* ── Section 3: Workflow Processing ── */}
          <SectionCard
            title="Workflow Processing"
            isLoading={isLoading}
            loadingVariant="chart"
            isEmpty={!isLoading && (data?.workflowProcessing.totalWorkflows ?? 0) === 0}
            emptyLabel="No workflows yet."
            data-testid="section-workflow-processing"
          >
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 text-[13px]">
                <div>
                  <p className="text-[11px] text-[var(--content-tertiary)]">Total workflows</p>
                  <p className="tabular-nums font-semibold text-[var(--content-primary)]">
                    {formatNumber(data?.workflowProcessing.totalWorkflows)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--content-tertiary)]">Success rate</p>
                  <p className="tabular-nums font-semibold text-[var(--content-primary)]">
                    {deriveSuccessRateLabel(
                      data?.workflowProcessing.processingSuccessRate ?? null,
                    )}
                  </p>
                </div>
              </div>
              <TimeSeriesChart
                data={data?.workflowProcessing.workflowsTimeSeries ?? []}
                ariaLabel="New workflows per day chart"
              />
            </div>
          </SectionCard>

          {/* ── Section 4: System Health ── */}
          <SectionCard
            title="System Health"
            isLoading={isLoading}
            loadingVariant="list"
            isEmpty={!isLoading && !data?.systemHealth}
            emptyLabel="No system health data."
            data-testid="section-system-health"
          >
            <div className="flex flex-col gap-4">
              {/* DB size */}
              <div>
                <p className="mb-1 text-[11px] text-[var(--content-tertiary)]">Database size</p>
                {(() => {
                  const dbSize = data?.systemHealth.dbSize;
                  if (!dbSize) return null;
                  if (dbSize.available) {
                    return (
                      <p className="tabular-nums text-[13px] text-[var(--content-primary)]">
                        {dbSize.humanReadable}
                      </p>
                    );
                  }
                  return (
                    <p className="text-[13px] text-[var(--content-tertiary)]">
                      {dbSize.reason ?? 'Unavailable'}
                    </p>
                  );
                })()}
              </div>

              {/* Error events */}
              <div>
                <p className="mb-2 text-[11px] text-[var(--content-tertiary)]">
                  Error events (24h) — {formatNumber(data?.systemHealth.errorEvents24hTotal)} total
                </p>
                {(data?.systemHealth.errorEvents24h.length ?? 0) === 0 ? (
                  <p className="text-[13px] text-[var(--content-tertiary)]">No error events.</p>
                ) : (
                  <table className="w-full text-[13px]" aria-label="Error events in last 24 hours">
                    <tbody>
                      {data?.systemHealth.errorEvents24h.map((row) => (
                        <tr
                          key={row.eventName}
                          className="border-b border-[var(--border-default)] last:border-0"
                        >
                          <td className="py-1.5 font-mono text-[12px] text-[var(--content-secondary)]">
                            {row.eventName}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-[var(--content-primary)]">
                            {row.count.toLocaleString('en-US')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ── Section 5: Memory and Process — full width ── */}
          <div className="lg:col-span-2">
            <SectionCard
              title="Node Runtime"
              isLoading={isLoading}
              loadingVariant="gauge"
              isEmpty={!isLoading && !data?.memoryUsage}
              emptyLabel="No memory data."
              data-testid="section-memory"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <MemoryGauge
                  heapUsedBytes={data?.memoryUsage.heapUsedBytes ?? 0}
                  heapTotalBytes={data?.memoryUsage.heapTotalBytes ?? 0}
                  rssBytes={data?.memoryUsage.rssBytes ?? 0}
                  heapUsedPercent={data?.memoryUsage.heapUsedPercent ?? 0}
                />
                <dl className="grid grid-cols-1 gap-2">
                  <div className="rounded-lg bg-[var(--surface-secondary)] px-3 py-2">
                    <dt className="text-[11px] text-[var(--content-tertiary)]">Uptime</dt>
                    <dd className="mt-0.5 text-[13px] tabular-nums text-[var(--content-primary)]">
                      {formatUptime(data?.memoryUsage.uptimeSeconds)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-secondary)] px-3 py-2">
                    <dt className="text-[11px] text-[var(--content-tertiary)]">RSS</dt>
                    <dd className="mt-0.5 text-[13px] tabular-nums text-[var(--content-primary)]">
                      {formatBytes(data?.memoryUsage.rssBytes)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-secondary)] px-3 py-2">
                    <dt className="text-[11px] text-[var(--content-tertiary)]">
                      Last updated
                    </dt>
                    <dd className="mt-0.5 text-[13px] text-[var(--content-secondary)]">
                      {lastUpdatedAt
                        ? formatRelativeTime(lastUpdatedAt)
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </SectionCard>
          </div>

          {/* ── Section 6: Subscription Breakdown — full width ── */}
          <div className="lg:col-span-2">
            <SectionCard
              title="Subscription Breakdown"
              isLoading={isLoading}
              loadingVariant="list"
              isEmpty={false}
              data-testid="section-subscription-breakdown"
            >
              {!isLoading && !hasStripeData ? (
                /* Empty state: Stripe not configured */
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <p className="text-[14px] font-medium text-[var(--content-primary)]">
                    Subscription data unavailable — configure Stripe
                  </p>
                  <p className="max-w-sm text-[12px] text-[var(--content-tertiary)]">
                    Set <code className="font-mono">STRIPE_SECRET_KEY</code> and run at least one
                    sync to populate subscription data.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Plan distribution bar */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
                      Plan Distribution
                    </p>
                    <SubscriptionPlanBar
                      byPlan={sub?.byPlan ?? {
                        free: 0, starter: 0, team: 0, growth: 0, enterprise: 0,
                      }}
                    />
                  </div>

                  {/* Status distribution bar */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
                      Subscription Status
                    </p>
                    <SubscriptionStatusBar
                      byStatus={sub?.byStatus ?? {
                        none: 0, trialing: 0, active: 0, past_due: 0, canceled: 0,
                      }}
                    />
                  </div>

                  {/* Spotlight tiles: Est. MRR + conversion */}
                  {!hasPaidUsers ? (
                    <p className="text-[13px] text-[var(--content-tertiary)]" data-testid="no-paid-subscribers-msg">
                      No paid subscribers yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {/* Est. MRR */}
                      <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface-secondary)] px-4 py-3">
                        <p className="text-[11px] text-[var(--content-tertiary)]">
                          Est. MRR
                          {' '}
                          <span
                            title="List price × active subscribers; excludes annual plans, discounts, and enterprise."
                            className="cursor-help underline decoration-dotted"
                          >
                            (Est.)
                          </span>
                        </p>
                        <p className="text-[20px] font-semibold tabular-nums text-[var(--accent,#20f2a6)]" data-testid="mrr-spotlight">
                          {formatCurrency(sub?.mrr.estimatedUsd)}
                        </p>
                        {(sub?.mrr.enterpriseCount ?? 0) > 0 && (
                          <p className="text-[11px] text-[var(--content-tertiary)]">
                            +{formatNumber(sub?.mrr.enterpriseCount)} enterprise (custom pricing)
                          </p>
                        )}
                      </div>

                      {/* Paid subscribers */}
                      <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface-secondary)] px-4 py-3">
                        <p className="text-[11px] text-[var(--content-tertiary)]">Paid subscribers</p>
                        <p className="text-[20px] font-semibold tabular-nums text-[var(--content-primary)]">
                          {formatNumber(sub?.paidUserCount)}
                        </p>
                      </div>

                      {/* Free → Paid % */}
                      <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface-secondary)] px-4 py-3">
                        <p className="text-[11px] text-[var(--content-tertiary)]">Free → Paid %</p>
                        <p className="text-[20px] font-semibold tabular-nums text-[var(--content-primary)]">
                          {formatPercent(sub?.freeToPaidConversionPct, { fractionDigits: 1 })}
                        </p>
                      </div>

                      {/* Active trials */}
                      <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface-secondary)] px-4 py-3">
                        <p className="text-[11px] text-[var(--content-tertiary)]">Active trials</p>
                        <p className="text-[20px] font-semibold tabular-nums text-[var(--content-primary)]">
                          {formatNumber(sub?.byStatus.trialing ?? 0)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

        </div>

        {/* Footer */}
        {lastUpdatedAt && (
          <p className="mt-6 text-center text-[11px] text-[var(--content-tertiary)]">
            Generated at{' '}
            {apiResponse?.meta.generatedAt
              ? new Date(apiResponse.meta.generatedAt).toLocaleTimeString('en-US', { timeZone: 'UTC' })
              : '—'}{' '}
            · Query took{' '}
            {apiResponse?.meta.queryDurationMs != null
              ? `${apiResponse.meta.queryDurationMs}ms`
              : '—'}
          </p>
        )}
      </main>

      {/* ── User Detail Drawer (ADM-002 PR-7) ── */}
      <UserDetailDrawer
        selectedUserId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
