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
  Clock,
  Activity,
  ChevronDown,
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

export default function ProductAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.isAdmin) {
      router.replace('/dashboard');
      return;
    }
    loadData();
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

  if (status === 'loading' || (isLoading && !data && !forbidden)) {
    return <div className="text-center text-ds-sm text-gray-400 py-20">Loading analytics...</div>;
  }

  if (forbidden || !session?.user?.isAdmin) {
    return <div className="text-center text-ds-sm text-gray-400 py-20">Access denied.</div>;
  }

  if (!data) {
    return <div className="text-center text-ds-sm text-gray-400 py-20">Failed to load analytics.</div>;
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
          <Link href="/account" className="inline-flex items-center gap-1 text-ds-sm text-gray-500 hover:text-gray-700 mb-ds-2">
            <ArrowLeft className="h-4 w-4" /> Back to Account
          </Link>
          <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">Product Analytics</h1>
          <p className="text-ds-sm text-gray-500">
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
              <div key={page.path} className="flex items-center justify-between px-ds-5 py-ds-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-ds-3">
                  <span className="text-ds-xs text-gray-400 w-5 text-right tabular-nums">{i + 1}</span>
                  <span className="text-ds-sm text-gray-800 font-mono">{page.path}</span>
                </div>
                <span className="text-ds-sm font-semibold text-gray-900 tabular-nums">{page.count}</span>
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

      {/* All events table */}
      <section className="ds-section">
        <h2 className="ds-section-label">All Event Counts</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-ds-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left py-ds-2 px-ds-4 text-gray-500 font-medium">Event</th>
                <th className="text-right py-ds-2 px-ds-4 text-gray-500 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.eventCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([event, count]) => (
                  <tr key={event} className="border-b border-gray-100 last:border-0">
                    <td className="py-ds-2 px-ds-4 text-gray-800">
                      {EVENT_LABELS[event] ?? event.replace(/_/g, ' ')}
                      <span className="text-ds-xs text-gray-400 ml-ds-2 font-mono">{event}</span>
                    </td>
                    <td className="py-ds-2 px-ds-4 text-right font-semibold text-gray-900 tabular-nums">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
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

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0 || steps.every(s => s.count === 0)) {
    return (
      <div className="card px-ds-6 py-ds-8 text-center">
        <p className="text-ds-sm text-gray-400">No funnel data yet. Events will appear as users interact with the product.</p>
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
                <span className="text-ds-sm font-medium text-gray-800">
                  {FUNNEL_LABELS[step.step] ?? step.step.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-ds-3 text-ds-xs">
                <span className="font-semibold text-gray-900 tabular-nums">{step.count} users</span>
                {i > 0 && step.rate < 100 && (
                  <span className={`${step.rate >= 50 ? 'text-emerald-600' : step.rate >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                    {step.rate}% →
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${Math.max(2, (step.count / maxCount) * 100)}%` }}
              />
            </div>
            {i > 0 && step.dropoff > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">
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
        <h3 className="text-ds-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-ds-xs text-gray-400">{total} total</span>
      </div>
      <div className="space-y-ds-2">
        {events.map(event => {
          const count = counts[event] ?? 0;
          return (
            <div key={event} className="flex items-center justify-between">
              <span className="text-ds-xs text-gray-600">{EVENT_LABELS[event] ?? event.replace(/_/g, ' ')}</span>
              <span className="text-ds-sm font-medium text-gray-900 tabular-nums">{count}</span>
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
        <p className="text-ds-sm text-gray-400">No daily activity data yet.</p>
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
      <div className="flex justify-between mt-ds-2 text-[10px] text-gray-400">
        <span>{days[0]}</span>
        <span>{days[days.length - 1]}</span>
      </div>
    </div>
  );
}
