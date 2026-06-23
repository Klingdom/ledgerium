'use client';

/**
 * DemoAnnotatedWorkflowViews — Container 2
 *
 * Browser-chrome container with a demo-level tab strip:
 *   "Process Maps" | "SOP"
 *
 * Process Maps tab renders the REAL WorkflowPageShell (via next/dynamic ssr:false)
 * fed from the hand-crafted demoProcessOutput fixture.  The Variants view is also
 * enabled by passing DEMO_VARIANT_INTELLIGENCE / DEMO_VARIANT_GRAPH from the
 * already-existing demoVariantsFixture.
 *
 * SOP tab reuses the existing DemoSOP.tsx (client-lazy wrapper for SOPPageShell).
 *
 * Hard constraints:
 *  - 'use client' — no server imports
 *  - No Date.now() / Math.random()
 *  - WorkflowPageShell loaded via dynamic({ ssr: false }) — it uses ReactFlow
 *  - DemoSOP already has its own dynamic boundary; import it directly
 *  - Additive only — RealProductDemo.tsx is untouched
 *  - "Sample data" framing throughout
 */

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import DemoAnnotations, { type DemoAnnotation } from './DemoAnnotations';
import {
  DEMO_VARIANT_INTELLIGENCE,
  DEMO_VARIANT_TOTAL_RUNS,
  DEMO_VARIANT_COUNT,
} from './demoVariantsFixture';

// Import the processOutput fixture as plain JSON — no engine pipeline involved
// eslint-disable-next-line @typescript-eslint/no-var-requires
const demoProcessOutput = require('./fixtures/demoProcessOutput.po.json') as Record<string, unknown>;

// ── Client-only dynamic imports ────────────────────────────────────────────────

const WorkflowPageShell = dynamic(
  () =>
    import('@/components/workflow-view/WorkflowPageShell').then(
      (m) => ({ default: m.WorkflowPageShell }),
    ),
  {
    ssr: false,
    loading: () => <WorkflowViewSkeleton />,
  },
);

// DemoSOP already owns its own dynamic boundary; we import it directly.
const DemoSOP = dynamic(() => import('./DemoSOP'), {
  ssr: false,
  loading: () => <SOPSkeleton />,
});

// ── Tab type ───────────────────────────────────────────────────────────────────

type DemoTab = 'flow' | 'sop';

// ── Demo workflow record (title / confidence shown in WorkflowHeader) ──────────

const DEMO_WORKFLOW_RECORD = {
  id: 'demo-01-approve-expense-report',
  title: 'Approve Expense Report',
  confidence: 0.92,
  createdAt: new Date(1_700_000_000_000 - 14 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'processed',
};

// ── Annotations for the Process Maps surface ───────────────────────────────────

const FLOW_ANNOTATIONS: DemoAnnotation[] = [
  {
    id: 'f1',
    number: 1,
    top: '32px',
    left: '18%',
    popoverSide: 'bottom',
    title: 'View mode switcher',
    body: 'Switch between Flow (this view), Swimlane (grouped by system), Variants (compare run paths), and Systems (tool touchpoints). Every mode reads the same underlying observation data.',
  },
  {
    id: 'f2',
    number: 2,
    top: '32px',
    left: '58%',
    popoverSide: 'bottom',
    title: 'Toolbar controls',
    body: 'Toggle step labels, inline metrics, insights strip, minimap, and legend independently — all layout preferences are per-session, not persisted to the database.',
  },
  {
    id: 'f3',
    number: 3,
    top: '52%',
    left: '50%',
    popoverSide: 'left',
    title: 'Process map node',
    body: 'Each node is a measured step: title, dominant action category, duration, and system badge. Click any node to open the inspector panel with the full step definition and evidence.',
  },
  {
    id: 'f4',
    number: 4,
    top: '30%',
    left: '72%',
    popoverSide: 'left',
    title: 'System phase lane',
    body: 'Steps are grouped and coloured by the tool used, so when a process spans multiple systems the handoffs between them are visually separated at a glance.',
  },
  {
    id: 'f5',
    number: 5,
    top: '82%',
    left: '50%',
    popoverSide: 'top',
    title: 'Sequence edge',
    body: 'Each edge is a real observed transition. The boundary reason (route change, action completed, target changed) is captured and shown in the inspector when you select the edge.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DemoAnnotatedWorkflowViews() {
  const [activeTab, setActiveTab] = useState<DemoTab>('flow');

  return (
    <section aria-label="Workflow views demo" className="w-full">
      {/* Section label */}
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/10 px-3 py-1 text-[12px] font-medium text-brand-400">
          <span aria-hidden>■</span> Container 2 — Workflow Views
        </span>
        <span className="text-[12px] text-[var(--content-secondary)]">
          Real WorkflowPageShell · Process Maps + SOP tabs · 5 annotations
        </span>
      </div>

      {/* Browser chrome frame */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-default)] shadow-2xl shadow-black/30">
        {/* Chrome bar */}
        <div className="flex items-center gap-3 bg-[var(--surface-elevated)] px-4 py-2.5 border-b border-[var(--border-subtle)]">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="block h-3 w-3 rounded-full bg-red-400" />
            <span className="block h-3 w-3 rounded-full bg-amber-400" />
            <span className="block h-3 w-3 rounded-full bg-green-400" />
          </div>
          {/* URL bar */}
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-md bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-3 py-1 text-[12px] text-[var(--content-secondary)] max-w-xs w-full">
              <svg aria-hidden className="h-3 w-3 shrink-0 opacity-50" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13z" clipRule="evenodd" />
                <path d="M8 3.5c-.83 0-1.5.67-1.5 1.5v5.5c0 .28.22.5.5.5h2a.5.5 0 00.5-.5V5c0-.83-.67-1.5-1.5-1.5z" />
              </svg>
              app.ledgerium.ai/workflows/approve-expense-report
            </div>
          </div>
          {/* Sample data badge */}
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/25">
            Sample data
          </span>
        </div>

        {/* Demo tab strip — mimics the in-app tab navigation */}
        <div
          className="flex items-center gap-0 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4"
          role="tablist"
          aria-label="Workflow view sections"
        >
          <TabButton
            id="tab-flow"
            controls="panel-flow"
            active={activeTab === 'flow'}
            onClick={() => setActiveTab('flow')}
          >
            Process Maps
          </TabButton>
          <TabButton
            id="tab-sop"
            controls="panel-sop"
            active={activeTab === 'sop'}
            onClick={() => setActiveTab('sop')}
          >
            SOP
          </TabButton>

          {/* Workflow metadata in the tab bar (right-aligned) */}
          <div className="ml-auto flex items-center gap-3 py-2">
            <span className="text-[11px] text-[var(--content-secondary)]">
              {DEMO_VARIANT_TOTAL_RUNS} runs · {DEMO_VARIANT_COUNT} variants
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-600/10 px-2 py-0.5 text-[11px] font-medium text-brand-400">
              Approve Expense Report
            </span>
          </div>
        </div>

        {/* Content panels */}
        <div className="bg-[var(--surface-primary)]">
          {/* Process Maps tab */}
          <div
            id="panel-flow"
            role="tabpanel"
            aria-labelledby="tab-flow"
            hidden={activeTab !== 'flow'}
          >
            <div className="relative" style={{ height: 560 }}>
              <DemoAnnotations annotations={FLOW_ANNOTATIONS}>
                {/* Fixed-height wrapper so ReactFlow has a bounded container */}
                <div style={{ height: 560, overflow: 'hidden' }}>
                  <WorkflowPageShell
                    processOutput={demoProcessOutput}
                    processMap={null}
                    sopArtifact={null}
                    workflowRecord={DEMO_WORKFLOW_RECORD}
                    isLoading={false}
                    error={null}
                    variantIntelligence={DEMO_VARIANT_INTELLIGENCE}
                    variantsStatus="loaded"
                  />
                </div>
              </DemoAnnotations>

              {/* Bottom gradient fade */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-16"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent, var(--surface-primary, #0d1117))',
                }}
              />
            </div>
          </div>

          {/* SOP tab */}
          <div
            id="panel-sop"
            role="tabpanel"
            aria-labelledby="tab-sop"
            hidden={activeTab !== 'sop'}
          >
            <div className="relative" style={{ height: 560, overflow: 'hidden' }}>
              <DemoSOP />

              {/* Bottom gradient fade */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-16"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent, var(--surface-primary, #0d1117))',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="mt-2 text-center text-[11px] text-[var(--content-tertiary)]">
        Click any numbered marker to learn what each surface measures. Switch tabs to see the SOP view.
      </p>
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface TabButtonProps {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ id, controls, active, onClick, children }: TabButtonProps) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={[
        'relative px-4 py-3 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1',
        active
          ? 'text-[var(--content-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-500'
          : 'text-[var(--content-secondary)] hover:text-[var(--content-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function WorkflowViewSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-4" style={{ height: 560 }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-4 w-32 rounded bg-[var(--surface-secondary)]" />
        <div className="h-4 w-20 rounded bg-[var(--surface-secondary)]" />
        <div className="h-4 w-20 rounded bg-[var(--surface-secondary)]" />
      </div>
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-8" style={{ width: 260 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="w-full flex flex-col items-center gap-2">
              <div className="h-14 w-48 rounded-lg bg-[var(--surface-secondary)]" />
              {n < 5 && <div className="h-8 w-0.5 bg-[var(--surface-secondary)]" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SOPSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-4" style={{ height: 560 }}>
      <div className="h-5 w-1/3 rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-full rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-5/6 rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-4/6 rounded bg-[var(--surface-secondary)]" />
      <div className="mt-6 space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full shrink-0 bg-[var(--surface-secondary)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[var(--surface-secondary)]" />
              <div className="h-2 w-full rounded bg-[var(--surface-secondary)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
