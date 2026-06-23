'use client';

/**
 * DemoSOPInner — renders the REAL `SOPPageShell` against the demo fixture SOP.
 *
 * Loaded client-only (no SSR) via `DemoSOP` using `next/dynamic { ssr: false }`.
 * `workflowId` is intentionally omitted so SOPPageShell suppresses PostHog
 * analytics events (the guard at `if (!viewModel || !workflowId) return;` fires).
 *
 * No server modules are imported here. DEMO_SOP is plain JSON-compatible data.
 */

import { SOPPageShell } from '@/components/sop-view/SOPPageShell';
import { DEMO_SOP } from './demoSopFixture';

/** Minimal workflow record to populate metadata in the SOP header. */
const DEMO_WORKFLOW_RECORD = {
  id: 'demo-01-approve-expense-report',
  title: 'Approve Expense Report',
  confidence: 0.87,
  createdAt: '2023-10-15T10:00:00Z',
  status: 'active',
} as const;

export default function DemoSOPInner() {
  return (
    <SOPPageShell
      sop={DEMO_SOP}
      workflowRecord={DEMO_WORKFLOW_RECORD}
      // workflowId intentionally omitted — suppresses analytics in demo context
      isLoading={false}
      error={null}
    />
  );
}
