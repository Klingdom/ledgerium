'use client';

/**
 * DemoDashboard — a robust, self-contained live demo of the Ledgerium workflow
 * library (dashboard) for the public marketing pages.
 *
 * Two levels, like the real product:
 *  - List view: the real PortfolioTimestudyBand (computed honestly from the
 *    dummy rows) over a filterable workflow list.
 *  - Detail view: click any workflow to open it — its SOP steps and a
 *    lightweight process-map flow, with metrics and a back button.
 *
 * Robust by construction — pure dummy data, no API, no auth, no DB, no React
 * Flow, SSR-safe. It cannot break the marketing page.
 */

import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, GitBranch } from 'lucide-react';
import PortfolioTimestudyBand from '@/components/dashboard-v2/band/PortfolioTimestudyBand';
import { computePortfolioSummary, type PortfolioSummaryInput } from '@/lib/dashboard-band-stats';
import { formatDuration } from '@/lib/format';

type OpportunityTag = 'automate' | 'standardize' | 'monitor' | 'healthy';

interface DemoStep {
  title: string;
  system: string;
  durationMs: number;
}

interface DemoWorkflow {
  title: string;
  runs: number;
  health: number;
  tag: OpportunityTag;
  lastRun: string;
  steps: DemoStep[];
}

const S = 1000;

// Dummy library — a realistic mid-market ops portfolio. Cycle time + systems
// are derived from each workflow's steps so the list, band, and detail agree.
const DEMO_WORKFLOWS: DemoWorkflow[] = [
  {
    title: 'Approve Expense Report', runs: 16, health: 82, tag: 'standardize', lastRun: '2h ago',
    steps: [
      { title: 'Open expense report', system: 'Concur', durationMs: 1.5 * S },
      { title: 'Review line items', system: 'Concur', durationMs: 8 * S },
      { title: 'Approve report', system: 'Concur', durationMs: 4 * S },
      { title: 'Notify employee', system: 'Concur', durationMs: 2 * S },
      { title: 'Archive to records', system: 'Concur', durationMs: 1 * S },
    ],
  },
  {
    title: 'Create Purchase Order', runs: 23, health: 91, tag: 'healthy', lastRun: '5h ago',
    steps: [
      { title: 'Open SAP MM module', system: 'SAP', durationMs: 6 * S },
      { title: 'Create purchase requisition', system: 'SAP', durationMs: 95 * S },
      { title: 'Enter vendor + line items', system: 'SAP', durationMs: 110 * S },
      { title: 'Submit for approval', system: 'SAP', durationMs: 8 * S },
      { title: 'Email PO to vendor', system: 'Outlook', durationMs: 53 * S },
    ],
  },
  {
    title: 'Onboard New Vendor', runs: 7, health: 64, tag: 'automate', lastRun: '1d ago',
    steps: [
      { title: 'Open Coupa supplier portal', system: 'Coupa', durationMs: 7 * S },
      { title: 'Enter vendor details', system: 'Coupa', durationMs: 140 * S },
      { title: 'Upload W-9 + banking', system: 'Coupa', durationMs: 95 * S },
      { title: 'Request approval', system: 'Coupa', durationMs: 10 * S },
      { title: 'Notify procurement', system: 'Slack', durationMs: 6 * S },
    ],
  },
  {
    title: 'Process Customer Refund', runs: 31, health: 73, tag: 'automate', lastRun: '38m ago',
    steps: [
      { title: 'Open order in Shopify', system: 'Shopify', durationMs: 8 * S },
      { title: 'Verify refund eligibility', system: 'Shopify', durationMs: 40 * S },
      { title: 'Issue refund in Stripe', system: 'Stripe', durationMs: 60 * S },
      { title: 'Update order status', system: 'Shopify', durationMs: 12 * S },
      { title: 'Email customer', system: 'Shopify', durationMs: 64 * S },
    ],
  },
  {
    title: 'Monthly Payroll Close', runs: 5, health: 58, tag: 'monitor', lastRun: '3d ago',
    steps: [
      { title: 'Export timesheets', system: 'Excel', durationMs: 120 * S },
      { title: 'Reconcile hours', system: 'Excel', durationMs: 300 * S },
      { title: 'Import to ADP', system: 'ADP', durationMs: 90 * S },
      { title: 'Run payroll preview', system: 'ADP', durationMs: 150 * S },
      { title: 'Submit payroll', system: 'ADP', durationMs: 75 * S },
    ],
  },
  {
    title: 'Update Employee Record', runs: 12, health: 88, tag: 'healthy', lastRun: '6h ago',
    steps: [
      { title: 'Search employee', system: 'Workday', durationMs: 8 * S },
      { title: 'Open record', system: 'Workday', durationMs: 6 * S },
      { title: 'Update fields', system: 'Workday', durationMs: 95 * S },
      { title: 'Save + confirm', system: 'Workday', durationMs: 19 * S },
    ],
  },
  {
    title: 'Submit Marketing Invoice', runs: 9, health: 69, tag: 'standardize', lastRun: '1d ago',
    steps: [
      { title: 'Open NetSuite', system: 'NetSuite', durationMs: 7 * S },
      { title: 'Create vendor bill', system: 'NetSuite', durationMs: 180 * S },
      { title: 'Attach invoice PDF', system: 'NetSuite', durationMs: 60 * S },
      { title: 'Submit for approval', system: 'NetSuite', durationMs: 12 * S },
      { title: 'Notify finance', system: 'Gmail', durationMs: 53 * S },
    ],
  },
];

const OPPORTUNITY: Record<OpportunityTag, { label: string; cls: string }> = {
  automate: { label: 'Automate', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
  standardize: { label: 'Standardize', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  monitor: { label: 'Monitor', cls: 'bg-red-50 border-red-200 text-red-700' },
  healthy: { label: 'Healthy', cls: 'bg-green-50 border-green-200 text-green-700' },
};

const FILTERS: { key: OpportunityTag | 'all'; label: string }[] = [
  { key: 'all', label: 'All workflows' },
  { key: 'automate', label: 'Automation candidates' },
  { key: 'standardize', label: 'Standardize' },
  { key: 'monitor', label: 'Needs attention' },
  { key: 'healthy', label: 'Healthy' },
];

function systemsOf(w: DemoWorkflow): string[] {
  return [...new Set(w.steps.map((s) => s.system))];
}
function msOf(w: DemoWorkflow): number {
  return w.steps.reduce((sum, s) => sum + s.durationMs, 0);
}
function slowestIndex(w: DemoWorkflow): number {
  let idx = 0;
  for (let i = 1; i < w.steps.length; i++) if (w.steps[i]!.durationMs > w.steps[idx]!.durationMs) idx = i;
  return idx;
}
function healthClasses(score: number): { text: string; rail: string } {
  if (score < 50) return { text: 'text-red-400', rail: 'bg-red-500' };
  if (score < 75) return { text: 'text-amber-400', rail: 'bg-amber-500' };
  return { text: 'text-green-400', rail: 'bg-green-500' };
}
function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function toSummaryInput(w: DemoWorkflow): PortfolioSummaryInput {
  return { runs: w.runs, avgTimeMs: msOf(w), systemCount: systemsOf(w).length, healthOverall: w.health, healthGated: false };
}

/* ── Detail view (click a workflow to open it) ───────────────────────────── */

function WorkflowDetail({ w, onBack }: { w: DemoWorkflow; onBack: () => void }) {
  const [tab, setTab] = useState<'sop' | 'map'>('sop');
  const h = healthClasses(w.health);
  const opp = OPPORTUNITY[w.tag];
  const slow = slowestIndex(w);

  return (
    <div>
      {/* Detail header */}
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-500 hover:text-brand-400 transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Workflows
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[var(--content-primary)] truncate">{w.title}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {systemsOf(w).map((s) => (
                <span key={s} className="text-[10px] text-[var(--content-tertiary)] bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <span className={`text-[10px] font-medium rounded-full border px-2 py-0.5 whitespace-nowrap ${opp.cls}`}>{opp.label}</span>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-4 divide-x divide-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
        {[
          { label: 'Cycle time', node: <span className="tabular-nums">{formatDuration(msOf(w))}</span> },
          { label: 'Runs', node: <span className="tabular-nums">{w.runs}</span> },
          { label: 'Health', node: <span className={`tabular-nums ${h.text}`}>{w.health}</span> },
          { label: 'Steps', node: <span className="tabular-nums">{w.steps.length}</span> },
        ].map((m) => (
          <div key={m.label} className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--content-tertiary)]">{m.label}</p>
            <p className="text-sm font-semibold text-[var(--content-primary)] mt-0.5">{m.node}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-5 pt-3 flex items-center gap-1.5">
        {[
          { key: 'sop' as const, label: 'SOP', icon: FileText },
          { key: 'map' as const, label: 'Process map', icon: GitBranch },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-3 py-1.5 transition-colors ${
              tab === key ? 'bg-brand-600 text-white' : 'text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="px-4 sm:px-5 py-4">
        {tab === 'sop' ? (
          <ol className="space-y-2">
            {w.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 px-3 py-2.5">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-900/20 text-[11px] font-semibold text-brand-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--content-primary)]">{s.title}</p>
                  <p className="text-[10px] text-[var(--content-tertiary)] mt-0.5">{s.system}</p>
                </div>
                <span className={`text-xs tabular-nums ${i === slow ? 'text-amber-400 font-medium' : 'text-[var(--content-tertiary)]'}`}>
                  {formatDuration(s.durationMs)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div>
            <div className="flex items-stretch gap-1.5 overflow-x-auto pb-3">
              <FlowPill label="Start" terminal />
              {w.steps.map((s, i) => (
                <div key={i} className="flex items-stretch gap-1.5">
                  <FlowArrow />
                  <FlowPill label={s.title} sub={formatDuration(s.durationMs)} slow={i === slow} />
                </div>
              ))}
              <FlowArrow />
              <FlowPill label="End" terminal />
            </div>
            <p className="text-[11px] text-[var(--content-tertiary)]">
              Built from {w.runs} observed runs. The amber step is where the most time is spent — your biggest improvement opportunity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowPill({ label, sub, terminal, slow }: { label: string; sub?: string; terminal?: boolean; slow?: boolean }) {
  if (terminal) {
    return (
      <div className="flex items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-[10px] font-medium text-[var(--content-tertiary)]">
        {label}
      </div>
    );
  }
  return (
    <div
      className={`flex w-[112px] flex-shrink-0 flex-col justify-center rounded-lg border px-2.5 py-2 ${
        slow ? 'border-amber-500/50 bg-amber-500/10' : 'border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60'
      }`}
    >
      <span className="text-[11px] font-medium text-[var(--content-primary)] leading-tight line-clamp-2">{label}</span>
      {sub && <span className={`text-[10px] mt-1 tabular-nums ${slow ? 'text-amber-400' : 'text-[var(--content-tertiary)]'}`}>{sub}</span>}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center text-[var(--content-tertiary)]">
      <ChevronRight className="h-4 w-4" />
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function DemoDashboard() {
  const [filter, setFilter] = useState<OpportunityTag | 'all'>('all');
  const [active, setActive] = useState<DemoWorkflow | null>(null);

  const rows = useMemo(
    () => (filter === 'all' ? DEMO_WORKFLOWS : DEMO_WORKFLOWS.filter((w) => w.tag === filter)),
    [filter],
  );
  const summary = useMemo(() => computePortfolioSummary(rows.map(toSummaryInput)), [rows]);

  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-lg shadow-[var(--border-default)]/50 bg-[var(--surface-elevated)]">
      {/* Browser chrome */}
      <div className="bg-[var(--surface-secondary)] border-b border-[var(--border-default)] px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[10px] text-[var(--content-tertiary)] ml-2 font-mono">
          {active ? `ledgerium.ai/workflows/${slug(active.title)}` : 'ledgerium.ai/dashboard'}
        </span>
      </div>

      {active ? (
        <WorkflowDetail w={active} onBack={() => setActive(null)} />
      ) : (
        <>
          {/* App header */}
          <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-base font-bold text-[var(--content-primary)]">Workflows</h3>
              <p className="text-[11px] text-[var(--content-tertiary)]">Your process library — measured from real recordings</p>
            </div>
            <span className="text-[10px] text-[var(--content-tertiary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-full px-2.5 py-1 whitespace-nowrap">
              Sample data
            </span>
          </div>

          {/* Portfolio timestudy band (real component, honest summary) */}
          <div className="px-4 sm:px-5 pt-4">
            <PortfolioTimestudyBand summary={summary} totalWorkflowCount={DEMO_WORKFLOWS.length} position="top" />
          </div>

          {/* Filter chips */}
          <div className="px-4 sm:px-5 pt-4 flex flex-wrap gap-2">
            {FILTERS.map(({ key, label }) => {
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`text-[11px] font-medium rounded-full border px-3 py-1.5 transition-colors ${
                    isActive
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:border-[var(--border-default)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Workflow list */}
          <div className="px-4 sm:px-5 py-4">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--content-tertiary)]">
              <span className="col-span-5">Workflow</span>
              <span className="col-span-2">Cycle time</span>
              <span className="col-span-1 text-right">Runs</span>
              <span className="col-span-2 text-right">Health</span>
              <span className="col-span-2 text-right">Opportunity</span>
            </div>

            <div className="space-y-1.5">
              {rows.map((w) => {
                const h = healthClasses(w.health);
                const opp = OPPORTUNITY[w.tag];
                return (
                  <button
                    key={w.title}
                    type="button"
                    onClick={() => setActive(w)}
                    title={`Open ${w.title}`}
                    className="group w-full text-left grid grid-cols-12 gap-3 items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 px-3 py-2.5 transition-colors hover:bg-[var(--surface-secondary)] hover:border-brand-600/40"
                  >
                    <div className="col-span-12 sm:col-span-5 min-w-0">
                      <p className="text-sm font-medium text-[var(--content-primary)] truncate group-hover:text-brand-400 transition-colors">{w.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {systemsOf(w).map((s) => (
                          <span key={s} className="text-[10px] text-[var(--content-tertiary)] bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <span className="text-sm text-[var(--content-secondary)] tabular-nums">{formatDuration(msOf(w))}</span>
                      <span className="block text-[10px] text-[var(--content-tertiary)]">{w.lastRun}</span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 text-right">
                      <span className="text-sm text-[var(--content-secondary)] tabular-nums">{w.runs}</span>
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${h.rail}`} />
                      <span className={`text-sm font-semibold tabular-nums ${h.text}`}>{w.health}</span>
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                      <span className={`text-[10px] font-medium rounded-full border px-2 py-0.5 ${opp.cls}`}>{opp.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-[var(--content-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
              {rows.length === 0 && (
                <p className="text-center text-sm text-[var(--content-tertiary)] py-8">No workflows match this filter.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
