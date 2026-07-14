/**
 * /compare/diff — N-Way Process Diff (T2, Cross-Workflow Intelligence
 * program). Server Component shell; all data-fetching, plan gating
 * (401/403), and rendering states live in the Client Component
 * `ProcessDiffView` (the API route enforces auth + `intelligenceLayer`
 * plan-gating server-side; the client renders the resulting states rather
 * than duplicating the gate here) — same pattern as `/analytics/time-sinks`.
 */

import { ProcessDiffView } from '@/components/analytics/ProcessDiffView';

export const metadata = {
  title: 'Compare Process Steps — Ledgerium',
};

export default function ProcessDiffPage() {
  return <ProcessDiffView />;
}
