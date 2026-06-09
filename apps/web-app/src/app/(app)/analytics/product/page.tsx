'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Users,
  Zap,
  TrendingUp,
  Activity,
  AlertTriangle,
  Trash2,
  Shield,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    periodDays: number;
    since: string;
  };
  eventCounts: Record<string, number>;
  dailyCounts: Record<string, Record<string, number>>;
  funnels: {
    activation: FunnelStep[];
    conversion: FunnelStep[];
  };
  topPages: Array<{ path: string; count: number }>;
}

interface FunnelStep {
  step: string;
  count: number;
  dropoff: number;
  rate: number;
}

// ─── Engagement types ─────────────────────────────────────────────────────────

interface EngagementUser {
  userId: string;
  name: string | null;
  email: string;
  plan: string;
  engagementScore: number;
  workflowCount: number;
  lastActive: string | null;
  signupDate: string;
}

interface EngagementData {
  distribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
  users: EngagementUser[];
}

// ─── Retention types ──────────────────────────────────────────────────────────

interface RetentionCohort {
  week: string;
  signups: number;
  retention: number[]; // indices 0–4 = Week 0 through Week 4+
}

interface RetentionData {
  cohorts: RetentionCohort[];
  averageRetention: number[];
}

// ─── Alerts types ─────────────────────────────────────────────────────────────

interface AlertItem {
  id: string;
  severity: 'P1' | 'P2' | 'P3';
  status: 'ok' | 'firing' | 'insufficient_data';
  message: string;
  value?: number;
  threshold?: number;
  checkedAt: string;
}

interface AlertsData {
  alerts: AlertItem[];
  summary: { firing: number; ok: number; insufficientData: number };
}

// ─── Cleanup types ────────────────────────────────────────────────────────────

interface CleanupResult {
  deletedCount: number;
  dryRun: boolean;
  olderThan: string;
  retainedCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  signup_completed: 'Signups',
  login_completed: 'Logins',
  login_failed: 'Login Failures',
  workflow_uploaded: 'Workflows Uploaded',
  workflow_viewed: 'Workflows Viewed',
  workflow_exported: 'Exports',
  workflow_deleted: 'Deletions',
  workflow_favorited: 'Favorites',
  tab_switched: 'Tab Switches',
  analysis_run: 'Analyses Run',
  sample_workflow_loaded: 'Sample Loaded',
  onboarding_started: 'Onboarding Started',
  onboarding_completed: 'Onboarding Completed',
  onboarding_dismissed: 'Onboarding Dismissed',
  onboarding_step_completed: 'Onboarding Steps',
  upgrade_prompt_viewed: 'Upgrade Prompts Shown',
  upgrade_clicked: 'Upgrade Clicks',
  checkout_started: 'Checkouts Started',
  subscription_created: 'Subscriptions',
  plan_limit_hit: 'Plan Limits Hit',
  share_link_created: 'Share Links Created',
  shared_workflow_viewed: 'Shared Views',
  team_created: 'Teams Created',
  team_invite_sent: 'Invites Sent',
  upload_failed: 'Upload Failures',
  page_viewed: 'Page Views',
  first_workflow_uploaded: 'First Workflows',
  first_sop_viewed: 'First SOP Views',
  first_process_map_viewed: 'First Map Views',
  sop_usefulness_response: 'SOP Usefulness Responses',
  sop_section_viewed: 'SOP Section Views',
  signup_from_shared_sop: 'Signups from Shared SOP',
};

const FUNNEL_LABELS: Record<string, string> = {
  signup_completed: 'Sign Up',
  workflow_uploaded: 'Upload Workflow',
  first_sop_viewed: 'View SOP',
  first_process_map_viewed: 'View Process Map',
  plan_limit_hit: 'Hit Free Limit',
  upgrade_prompt_viewed: 'See Upgrade Prompt',
  upgrade_clicked: 'Click Upgrade',
  checkout_started: 'Start Checkout',
  subscription_created: 'Subscribe',
};

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreTier(score: number): 'high' | 'medium' | 'low' | 'inactive' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 1) return 'low';
  return 'inactive';
}

const TIER_CLASSES: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-orange-100 text-orange-700',
  inactive: 'bg-red-100 text-red-700',
};

// ─── Retention heat-map helpers ───────────────────────────────────────────────

function retentionBg(pct: number | undefined): string {
  if (pct === undefined || pct === null) return 'bg-[var(--surface-secondary)]';
  if (pct >= 80) return 'bg-emerald-700 text-white';
  if (pct >= 60) return 'bg-emerald-500 text-white';
  if (pct >= 40) return 'bg-emerald-300 text-emerald-900';
  if (pct >= 20) return 'bg-emerald-100 text-emerald-800';
  if (pct > 0) return 'bg-emerald-50 text-emerald-700';
  return 'bg-[var(--surface-secondary)] text-[var(--content-tertiary)]';
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function ProductAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [forbidden, setForbidden] = useState(false);

  // Engagement state
  const [engagementData, setEngagementData] = useState<EngagementData | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [engagementError, setEngagementError] = useState<string | null>(null);

  // Retention state
  const [retentionData, setRetentionData] = useState<RetentionData | null>(null);
  const [retentionLoading, setRetentionLoading] = useState(true);
  const [retentionError, setRetentionError] = useState<string | null>(null);

  // Alerts state
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Cleanup state
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.isAdmin) {
      router.replace('/dashboard');
      return;
    }
    void loadData();
    void loadEngagement();
    void loadRetention();
    void loadAlerts();
  }, [days, status, session, router]);

  async function loadData() {
    setIsLoading(true);
    const res = await fetch(`/api/analytics/events?days=${days}`);
    if (res.status === 403) {
      setForbidden(true);
      setIsLoading(false);
      return;
    }
    if (res.ok) {
      setData(await res.json());
    }
    setIsLoading(false);
  }

  async function loadEngagement() {
    setEngagementLoading(true);
    setEngagementError(null);
    try {
      const res = await fetch('/api/analytics/engagement');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEngagementData(await res.json());
    } catch (err) {
      setEngagementError(err instanceof Error ? err.message : 'Failed to load engagement data');
    } finally {
      setEngagementLoading(false);
    }
  }

  async function loadRetention() {
    setRetentionLoading(true);
    setRetentionError(null);
    try {
      const res = await fetch('/api/analytics/retention');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRetentionData(await res.json());
    } catch (err) {
      setRetentionError(err instanceof Error ? err.message : 'Failed to load retention data');
    } finally {
      setRetentionLoading(false);
    }
  }

  async function loadAlerts() {
    setAlertsLoading(true);
    try {
      const res = await fetch('/api/admin/alerts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlertsData(await res.json());
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setAlertsData(null);
    } finally {
      setAlertsLoading(false);
    }
  }

  async function handleCheckCleanup() {
    setCleanupLoading(true);
    setCleanupError(null);
    setPurgeSuccess(null);
    try {
      const res = await fetch('/api/admin/cleanup-events?dryRun=true&days=90');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCleanupResult(await res.json());
    } catch (err) {
      setCleanupError(err instanceof Error ? err.message : 'Failed to check events');
    } finally {
      setCleanupLoading(false);
    }
  }

  async function handlePurge() {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${cleanupResult?.deletedCount ?? 0} events older than 90 days? This cannot be undone.`
    );
    if (!confirmed) return;

    setCleanupLoading(true);
    setCleanupError(null);
    setPurgeSuccess(null);
    try {
      const res = await fetch('/api/admin/cleanup-events?dryRun=false&days=90');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: CleanupResult = await res.json();
      setPurgeSuccess(`Successfully deleted ${result.deletedCount} events.`);
      setCleanupResult(null);
    } catch (err) {
      setCleanupError(err instanceof Error ? err.message : 'Purge failed');
    } finally {
      setCleanupLoading(false);
    }
  }

  if (status === 'loading' || (isLoading && !data && !forbidden)) {
    return <div className="text-center text-ds-sm text-[var(--content-tertiary)] py-20">Loading analytics...</div>;
  }

  if (forbidden || !session?.user?.isAdmin) {
    return <div className="text-center text-ds-sm text-[var(--content-tertiary)] py-20">Access denied.</div>;
  }

  if (!data) {
    return <div className="text-center text-ds-sm text-[var(--content-tertiary)] py-20">Failed to load analytics.</div>;
  }

  // Categorize events for display
  const activationEvents = ['signup_completed', 'first_workflow_uploaded', 'first_sop_viewed', 'first_process_map_viewed'];
  const engagementEvents = ['workflow_uploaded', 'workflow_viewed', 'workflow_exported', 'tab_switched', 'analysis_run', 'workflow_favorited'];
  const conversionEvents = ['plan_limit_hit', 'upgrade_prompt_viewed', 'upgrade_clicked', 'checkout_started', 'subscription_created'];
  const collaborationEvents = ['share_link_created', 'shared_workflow_viewed', 'team_created', 'team_invite_sent'];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-ds-6">
        <div>
          <Link href="/account" className="inline-flex items-center gap-1 text-ds-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] mb-ds-2">
            <ArrowLeft className="h-4 w-4" /> Back to Account
          </Link>
          <h1 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">Product Analytics</h1>
          <p className="text-ds-sm text-[var(--content-secondary)]">
            {data.summary.totalEvents.toLocaleString()} events · {data.summary.uniqueUsers} users · last {days} days
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="input-field w-36 text-ds-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-4 mb-ds-8">
        <MetricCard icon={Activity} label="Total Events" value={data.summary.totalEvents.toLocaleString()} />
        <MetricCard icon={Users} label="Unique Users" value={data.summary.uniqueUsers} />
        <MetricCard icon={Zap} label="Workflows Created" value={data.eventCounts['workflow_uploaded'] ?? 0} />
        <MetricCard icon={TrendingUp} label="Subscriptions" value={data.eventCounts['subscription_created'] ?? 0} />
      </div>

      {/* System Alerts */}
      <section className="ds-section mb-ds-8">
        <div className="flex items-center gap-ds-2 mb-ds-4">
          <Shield className="h-4 w-4 text-[var(--content-secondary)]" aria-hidden="true" />
          <h2 className="ds-section-label mb-0">System Alerts</h2>
        </div>

        {alertsLoading && (
          <div className="card px-ds-5 py-ds-4 text-center">
            <p className="text-ds-sm text-[var(--content-tertiary)]">Loading alerts…</p>
          </div>
        )}

        {!alertsLoading && !alertsData && (
          <div className="card px-ds-5 py-ds-4 text-center border border-[var(--border-subtle)]">
            <p className="text-ds-sm text-[var(--content-tertiary)]">Alerts unavailable.</p>
          </div>
        )}

        {!alertsLoading && alertsData && (
          <>
            {/* Status banner */}
            {alertsData.summary.firing > 0 ? (
              <div className="mb-ds-4 flex items-center gap-ds-2 rounded-ds-md bg-red-50 border border-red-200 px-ds-4 py-ds-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <p className="text-ds-sm font-medium text-red-700">
                  {alertsData.summary.firing} alert{alertsData.summary.firing !== 1 ? 's' : ''} firing
                </p>
              </div>
            ) : (
              <div className="mb-ds-4 flex items-center gap-ds-2 rounded-ds-md bg-emerald-50 border border-emerald-200 px-ds-4 py-ds-3">
                <Shield className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <p className="text-ds-sm font-medium text-emerald-700">All systems operational</p>
              </div>
            )}

            {/* Alert rows */}
            {(() => {
              const visibleAlerts = showAllAlerts
                ? alertsData.alerts
                : alertsData.alerts.filter((a) => a.status !== 'ok');

              const hasHiddenOkAlerts = !showAllAlerts && alertsData.alerts.some((a) => a.status === 'ok');

              return (
                <>
                  {visibleAlerts.length > 0 && (
                    <div className="card overflow-hidden mb-ds-3">
                      {visibleAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between px-ds-4 py-ds-3 border-b border-[var(--border-subtle)] last:border-0"
                        >
                          <div className="flex items-center gap-ds-2 min-w-0">
                            <span
                              className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-ds-xs font-semibold ${
                                alert.severity === 'P1'
                                  ? 'bg-red-100 text-red-700'
                                  : alert.severity === 'P2'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="text-ds-sm text-[var(--content-primary)] truncate">{alert.message}</span>
                          </div>
                          <div className="flex items-center gap-ds-2 ml-ds-4 shrink-0">
                            {alert.value !== undefined && alert.threshold !== undefined && (
                              <span className="text-ds-xs text-[var(--content-tertiary)] tabular-nums">
                                {alert.value} / {alert.threshold}
                              </span>
                            )}
                            <span
                              className={
                                alert.status === 'firing'
                                  ? 'h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse'
                                  : alert.status === 'ok'
                                  ? 'h-2.5 w-2.5 rounded-full bg-emerald-500'
                                  : 'h-2.5 w-2.5 rounded-full bg-gray-300'
                              }
                              aria-label={alert.status}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(hasHiddenOkAlerts || showAllAlerts) && (
                    <button
                      onClick={() => setShowAllAlerts((prev) => !prev)}
                      className="text-ds-xs text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors"
                    >
                      {showAllAlerts ? 'Hide ok alerts' : `Show all (${alertsData.alerts.length})`}
                    </button>
                  )}

                  {visibleAlerts.length === 0 && !hasHiddenOkAlerts && (
                    <p className="text-ds-sm text-[var(--content-tertiary)] text-center py-ds-4">No alerts configured.</p>
                  )}
                </>
              );
            })()}
          </>
        )}
      </section>

      {/* Activation funnel */}
      <section className="ds-section mb-ds-8">
        <h2 className="ds-section-label">Activation Funnel</h2>
        <FunnelChart steps={data.funnels.activation} />
      </section>

      {/* Conversion funnel */}
      <section className="ds-section mb-ds-8">
        <h2 className="ds-section-label">Conversion Funnel</h2>
        <FunnelChart steps={data.funnels.conversion} />
      </section>

      {/* Event categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-6 mb-ds-8">
        <EventCategory title="Activation" events={activationEvents} counts={data.eventCounts} />
        <EventCategory title="Engagement" events={engagementEvents} counts={data.eventCounts} />
        <EventCategory title="Conversion" events={conversionEvents} counts={data.eventCounts} />
        <EventCategory title="Collaboration" events={collaborationEvents} counts={data.eventCounts} />
      </div>

      {/* Top pages */}
      {data.topPages.length > 0 && (
        <section className="ds-section mb-ds-8">
          <h2 className="ds-section-label">Top Pages</h2>
          <div className="card overflow-hidden">
            {data.topPages.map((page, i) => (
              <div key={page.path} className="flex items-center justify-between px-ds-5 py-ds-3 border-b border-[var(--border-subtle)] last:border-0">
                <div className="flex items-center gap-ds-3">
                  <span className="text-ds-xs text-[var(--content-tertiary)] w-5 text-right tabular-nums">{i + 1}</span>
                  <span className="text-ds-sm text-[var(--content-primary)] font-mono">{page.path}</span>
                </div>
                <span className="text-ds-sm font-semibold text-[var(--content-primary)] tabular-nums">{page.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Daily activity sparkline */}
      <section className="ds-section mb-ds-8">
        <h2 className="ds-section-label">Daily Activity</h2>
        <DailyChart dailyCounts={data.dailyCounts} />
      </section>

      {/* ── Section A: Engagement Score Distribution ─────────────────────────── */}
      <section className="ds-section mb-ds-8">
        <h2 className="ds-section-label">Engagement Score Distribution</h2>

        {engagementLoading && (
          <div className="card px-ds-6 py-ds-8 text-center">
            <p className="text-ds-sm text-[var(--content-tertiary)]">Loading engagement data…</p>
          </div>
        )}

        {engagementError && !engagementLoading && (
          <div className="card px-ds-6 py-ds-4 text-center border border-red-200">
            <p className="text-ds-sm text-red-600">{engagementError}</p>
          </div>
        )}

        {!engagementLoading && engagementData && (
          <>
            {/* Tier summary tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-4 mb-ds-6">
              <TierCard label="High (70-100)" count={engagementData.distribution.high} colorClass="text-emerald-700" bgClass="bg-emerald-50" />
              <TierCard label="Medium (40-69)" count={engagementData.distribution.medium} colorClass="text-amber-700" bgClass="bg-amber-50" />
              <TierCard label="Low (1-39)" count={engagementData.distribution.low} colorClass="text-orange-700" bgClass="bg-orange-50" />
              <TierCard label="Inactive (0)" count={engagementData.distribution.inactive} colorClass="text-red-700" bgClass="bg-red-50" />
            </div>

            {/* User table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-ds-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
                      <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">User</th>
                      <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Plan</th>
                      <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Score</th>
                      <th className="text-right py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Workflows</th>
                      <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Last Active</th>
                      <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Signup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagementData.users.slice(0, 50).map((user) => {
                      const tier = scoreTier(user.engagementScore);
                      return (
                        <tr key={user.userId} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-secondary)] transition-colors">
                          <td className="py-ds-2 px-ds-4">
                            <p className="text-[var(--content-primary)] font-medium leading-tight">{user.name ?? '—'}</p>
                            <p className="text-ds-xs text-[var(--content-tertiary)]">{user.email}</p>
                          </td>
                          <td className="py-ds-2 px-ds-4 text-[var(--content-secondary)] capitalize">{user.plan}</td>
                          <td className="py-ds-2 px-ds-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-ds-xs font-semibold tabular-nums ${TIER_CLASSES[tier]}`}>
                              {user.engagementScore}
                            </span>
                          </td>
                          <td className="py-ds-2 px-ds-4 text-right text-[var(--content-primary)] tabular-nums">{user.workflowCount}</td>
                          <td className="py-ds-2 px-ds-4 text-[var(--content-secondary)] text-ds-xs">
                            {user.lastActive ? new Date(user.lastActive).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '—'}
                          </td>
                          <td className="py-ds-2 px-ds-4 text-[var(--content-secondary)] text-ds-xs">
                            {new Date(user.signupDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {engagementData.users.length === 0 && (
                <p className="px-ds-6 py-ds-8 text-center text-ds-sm text-[var(--content-tertiary)]">No user engagement data yet.</p>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Section B: Retention Cohorts ─────────────────────────────────────── */}
      <section className="ds-section mb-ds-8">
        <h2 className="ds-section-label">Retention Cohorts</h2>

        {retentionLoading && (
          <div className="card px-ds-6 py-ds-8 text-center">
            <p className="text-ds-sm text-[var(--content-tertiary)]">Loading retention data…</p>
          </div>
        )}

        {retentionError && !retentionLoading && (
          <div className="card px-ds-6 py-ds-4 text-center border border-red-200">
            <p className="text-ds-sm text-red-600">{retentionError}</p>
          </div>
        )}

        {!retentionLoading && retentionData && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-ds-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
                    <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium whitespace-nowrap">Cohort</th>
                    <th className="text-center py-ds-2 px-ds-3 text-[var(--content-secondary)] font-medium whitespace-nowrap">Week 0</th>
                    <th className="text-center py-ds-2 px-ds-3 text-[var(--content-secondary)] font-medium whitespace-nowrap">Week 1</th>
                    <th className="text-center py-ds-2 px-ds-3 text-[var(--content-secondary)] font-medium whitespace-nowrap">Week 2</th>
                    <th className="text-center py-ds-2 px-ds-3 text-[var(--content-secondary)] font-medium whitespace-nowrap">Week 3</th>
                    <th className="text-center py-ds-2 px-ds-3 text-[var(--content-secondary)] font-medium whitespace-nowrap">Week 4+</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionData.cohorts.map((cohort) => (
                    <tr key={cohort.week} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="py-ds-2 px-ds-4 whitespace-nowrap">
                        <p className="text-[var(--content-primary)] font-medium text-ds-xs">
                          Week of {new Date(cohort.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                        </p>
                        <p className="text-[var(--content-tertiary)] text-[10px]">{cohort.signups} users</p>
                      </td>
                      {cohort.retention.map((pct, weekIdx) => (
                        <td key={weekIdx} className={`py-ds-2 px-ds-3 text-center text-ds-xs font-semibold tabular-nums rounded-sm ${retentionBg(pct)}`}>
                          {pct !== null && pct !== undefined ? `${pct}%` : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Average row */}
                  {retentionData.averageRetention.length > 0 && (
                    <tr className="border-t-2 border-[var(--border-default)] bg-[var(--surface-secondary)]">
                      <td className="py-ds-2 px-ds-4 text-[var(--content-primary)] font-semibold text-ds-xs whitespace-nowrap">Average</td>
                      {retentionData.averageRetention.map((pct, weekIdx) => (
                        <td key={weekIdx} className={`py-ds-2 px-ds-3 text-center text-ds-xs font-bold tabular-nums ${retentionBg(pct)}`}>
                          {pct !== null && pct !== undefined ? `${pct}%` : '—'}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {retentionData.cohorts.length === 0 && (
              <p className="px-ds-6 py-ds-8 text-center text-ds-sm text-[var(--content-tertiary)]">No retention data yet. Cohorts appear after users have been active for at least one week.</p>
            )}
          </div>
        )}
      </section>

      {/* All events table */}
      <section className="ds-section mb-ds-8">
        <h2 className="ds-section-label">All Event Counts</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-ds-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
                <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Event</th>
                <th className="text-right py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.eventCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([event, count]) => (
                  <tr key={event} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="py-ds-2 px-ds-4 text-[var(--content-primary)]">
                      {EVENT_LABELS[event] ?? event.replace(/_/g, ' ')}
                      <span className="text-ds-xs text-[var(--content-tertiary)] ml-ds-2 font-mono">{event}</span>
                    </td>
                    <td className="py-ds-2 px-ds-4 text-right font-semibold text-[var(--content-primary)] tabular-nums">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section C: Event Cleanup ─────────────────────────────────────────── */}
      <section className="ds-section">
        <h2 className="ds-section-label">Event Retention</h2>
        <div className="card px-ds-5 py-ds-4">
          <div className="flex items-start justify-between gap-ds-4">
            <div className="flex-1 min-w-0">
              <p className="text-ds-sm font-medium text-[var(--content-primary)] mb-ds-1">Manage old analytics events</p>
              <p className="text-ds-xs text-[var(--content-secondary)]">
                Check how many events are older than 90 days, then purge if needed.
              </p>

              {cleanupError && (
                <p className="mt-ds-3 text-ds-xs text-red-600">{cleanupError}</p>
              )}

              {purgeSuccess && (
                <p className="mt-ds-3 text-ds-xs text-emerald-600 font-medium">{purgeSuccess}</p>
              )}

              {cleanupResult && !purgeSuccess && (
                <p className="mt-ds-3 text-ds-sm text-[var(--content-primary)]">
                  <span className="font-semibold tabular-nums">{cleanupResult.deletedCount.toLocaleString()}</span> events older than 90 days
                  {' '}(<span className="tabular-nums">{cleanupResult.retainedCount.toLocaleString()}</span> retained)
                </p>
              )}
            </div>

            <div className="flex items-center gap-ds-2 flex-shrink-0">
              <button
                onClick={handleCheckCleanup}
                disabled={cleanupLoading}
                className="btn-secondary text-ds-xs gap-1.5"
              >
                <Activity className="h-3.5 w-3.5" />
                {cleanupLoading ? 'Checking…' : 'Check'}
              </button>

              {cleanupResult && !purgeSuccess && (
                <button
                  onClick={handlePurge}
                  disabled={cleanupLoading || cleanupResult.deletedCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-ds-sm px-ds-3 py-ds-2 text-ds-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Purge {cleanupResult.deletedCount.toLocaleString()} events
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="card px-ds-5 py-ds-4">
      <div className="flex items-center gap-ds-2 mb-ds-1">
        <Icon className="h-4 w-4 text-brand-600" />
        <p className="ds-metric-label">{label}</p>
      </div>
      <p className="ds-metric-value">{value}</p>
    </div>
  );
}

function TierCard({
  label,
  count,
  colorClass,
  bgClass,
}: {
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={`card px-ds-5 py-ds-4 ${bgClass}`}>
      <p className={`text-ds-xs font-medium mb-ds-1 ${colorClass}`}>{label}</p>
      <p className={`text-ds-2xl font-bold tabular-nums ${colorClass}`}>{count}</p>
    </div>
  );
}

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0 || steps.every(s => s.count === 0)) {
    return (
      <div className="card px-ds-6 py-ds-8 text-center">
        <p className="text-ds-sm text-[var(--content-tertiary)]">No funnel data yet. Events will appear as users interact with the product.</p>
      </div>
    );
  }

  const maxCount = Math.max(...steps.map(s => s.count), 1);

  return (
    <div className="card px-ds-5 py-ds-4">
      <div className="space-y-ds-3">
        {steps.map((step, i) => (
          <div key={step.step}>
            <div className="flex items-center justify-between mb-ds-1">
              <div className="flex items-center gap-ds-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                  {i + 1}
                </span>
                <span className="text-ds-sm font-medium text-[var(--content-primary)]">
                  {FUNNEL_LABELS[step.step] ?? step.step.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-ds-3 text-ds-xs">
                <span className="font-semibold text-[var(--content-primary)] tabular-nums">{step.count} users</span>
                {i > 0 && step.rate < 100 && (
                  <span className={`${step.rate >= 50 ? 'text-emerald-600' : step.rate >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                    {step.rate}% →
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${Math.max(2, (step.count / maxCount) * 100)}%` }}
              />
            </div>
            {i > 0 && step.dropoff > 0 && (
              <p className="text-[10px] text-[var(--content-tertiary)] mt-0.5">
                ↓ {step.dropoff} dropped ({100 - step.rate}%)
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCategory({
  title,
  events,
  counts,
}: {
  title: string;
  events: string[];
  counts: Record<string, number>;
}) {
  const total = events.reduce((sum, e) => sum + (counts[e] ?? 0), 0);

  return (
    <div className="card px-ds-5 py-ds-4">
      <div className="flex items-center justify-between mb-ds-3">
        <h3 className="text-ds-sm font-semibold text-[var(--content-primary)]">{title}</h3>
        <span className="text-ds-xs text-[var(--content-tertiary)]">{total} total</span>
      </div>
      <div className="space-y-ds-2">
        {events.map(event => {
          const count = counts[event] ?? 0;
          return (
            <div key={event} className="flex items-center justify-between">
              <span className="text-ds-xs text-[var(--content-secondary)]">{EVENT_LABELS[event] ?? event.replace(/_/g, ' ')}</span>
              <span className="text-ds-sm font-medium text-[var(--content-primary)] tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyChart({ dailyCounts }: { dailyCounts: Record<string, Record<string, number>> }) {
  const days = Object.keys(dailyCounts).sort();
  if (days.length === 0) {
    return (
      <div className="card px-ds-6 py-ds-8 text-center">
        <p className="text-ds-sm text-[var(--content-tertiary)]">No daily activity data yet.</p>
      </div>
    );
  }

  const dailyTotals = days.map(day => {
    const counts = dailyCounts[day]!;
    return { day, total: Object.values(counts).reduce((sum, c) => sum + c, 0) };
  });

  const maxTotal = Math.max(...dailyTotals.map(d => d.total), 1);

  return (
    <div className="card px-ds-5 py-ds-4">
      <div className="flex items-end gap-[2px] h-24">
        {dailyTotals.map(({ day, total }) => (
          <div
            key={day}
            className="flex-1 bg-brand-400 rounded-t-sm transition-all hover:bg-brand-600 group relative"
            style={{ height: `${Math.max(2, (total / maxTotal) * 100)}%` }}
            title={`${day}: ${total} events`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-ds-2 text-[10px] text-[var(--content-tertiary)]">
        <span>{days[0]}</span>
        <span>{days[days.length - 1]}</span>
      </div>
    </div>
  );
}
