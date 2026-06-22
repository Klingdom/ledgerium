'use client';

/**
 * DemoDashboard — a robust, self-contained live demo of the Ledgerium workflow
 * library (dashboard), for the public marketing pages.
 *
 * Mirrors the current dashboard look & feel: the real PortfolioTimestudyBand
 * (computed honestly from the dummy rows via computePortfolioSummary) over a
 * workflow list with health scores, cycle time, runs, systems, and opportunity
 * tags. Interactive: the filter chips re-filter the rows AND recompute the band.
 *
 * Robust by construction — pure dummy data, no API, no auth, no DB, no React
 * Flow, SSR-safe. It cannot break the marketing page.
 */

import { useMemo, useState } from 'react';
import PortfolioTimestudyBand from '@/components/dashboard-v2/band/PortfolioTimestudyBand';
import { computePortfolioSummary, type PortfolioSummaryInput } from '@/lib/dashboard-band-stats';
import { formatDuration } from '@/lib/format';

type OpportunityTag = 'automate' | 'standardize' | 'monitor' | 'healthy';

interface DemoWorkflow {
  title: string;
  systems: string[];
  runs: number;
  avgTimeMs: number;
  health: number;
  tag: OpportunityTag;
  lastRun: string;
}

// Dummy library — a realistic mid-market ops portfolio.
const DEMO_WORKFLOWS: DemoWorkflow[] = [
  { title: 'Approve Expense Report', systems: ['Concur'], runs: 16, avgTimeMs: 16_500, health: 82, tag: 'standardize', lastRun: '2h ago' },
  { title: 'Create Purchase Order', systems: ['SAP', 'Outlook'], runs: 23, avgTimeMs: 272_000, health: 91, tag: 'healthy', lastRun: '5h ago' },
  { title: 'Onboard New Vendor', systems: ['Coupa', 'Slack'], runs: 7, avgTimeMs: 358_000, health: 64, tag: 'automate', lastRun: '1d ago' },
  { title: 'Process Customer Refund', systems: ['Shopify', 'Stripe'], runs: 31, avgTimeMs: 184_000, health: 73, tag: 'automate', lastRun: '38m ago' },
  { title: 'Monthly Payroll Close', systems: ['ADP', 'Excel'], runs: 5, avgTimeMs: 735_000, health: 58, tag: 'monitor', lastRun: '3d ago' },
  { title: 'Update Employee Record', systems: ['Workday'], runs: 12, avgTimeMs: 128_000, health: 88, tag: 'healthy', lastRun: '6h ago' },
  { title: 'Submit Marketing Invoice', systems: ['NetSuite', 'Gmail'], runs: 9, avgTimeMs: 312_000, health: 69, tag: 'standardize', lastRun: '1d ago' },
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

function healthClasses(score: number): { text: string; rail: string } {
  if (score < 50) return { text: 'text-red-400', rail: 'bg-red-500' };
  if (score < 75) return { text: 'text-amber-400', rail: 'bg-amber-500' };
  return { text: 'text-green-400', rail: 'bg-green-500' };
}

function toSummaryInput(w: DemoWorkflow): PortfolioSummaryInput {
  return { runs: w.runs, avgTimeMs: w.avgTimeMs, systemCount: w.systems.length, healthOverall: w.health, healthGated: false };
}

export default function DemoDashboard() {
  const [filter, setFilter] = useState<OpportunityTag | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);

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
        <span className="text-[10px] text-[var(--content-tertiary)] ml-2 font-mono">ledgerium.ai/dashboard</span>
      </div>

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
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`text-[11px] font-medium rounded-full border px-3 py-1.5 transition-colors ${
                active
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
        {/* Column header */}
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
            const isSelected = selected === w.title;
            return (
              <button
                key={w.title}
                type="button"
                onClick={() => setSelected(isSelected ? null : w.title)}
                className={`w-full text-left grid grid-cols-12 gap-3 items-center rounded-lg border px-3 py-2.5 transition-colors ${
                  isSelected
                    ? 'border-brand-600/50 bg-brand-900/10'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)] hover:border-[var(--border-default)]'
                }`}
              >
                {/* Title + systems */}
                <div className="col-span-12 sm:col-span-5 min-w-0">
                  <p className="text-sm font-medium text-[var(--content-primary)] truncate">{w.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.systems.map((s) => (
                      <span key={s} className="text-[10px] text-[var(--content-tertiary)] bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cycle time */}
                <div className="col-span-4 sm:col-span-2">
                  <span className="text-sm text-[var(--content-secondary)] tabular-nums">{formatDuration(w.avgTimeMs)}</span>
                  <span className="block text-[10px] text-[var(--content-tertiary)]">{w.lastRun}</span>
                </div>

                {/* Runs */}
                <div className="col-span-2 sm:col-span-1 text-right">
                  <span className="text-sm text-[var(--content-secondary)] tabular-nums">{w.runs}</span>
                </div>

                {/* Health */}
                <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${h.rail}`} />
                  <span className={`text-sm font-semibold tabular-nums ${h.text}`}>{w.health}</span>
                </div>

                {/* Opportunity */}
                <div className="col-span-3 sm:col-span-2 flex justify-end">
                  <span className={`text-[10px] font-medium rounded-full border px-2 py-0.5 ${opp.cls}`}>{opp.label}</span>
                </div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <p className="text-center text-sm text-[var(--content-tertiary)] py-8">No workflows match this filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}
