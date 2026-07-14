/**
 * /analytics/time-sinks — Portfolio Time-Sink Ranking (T1, Cross-Workflow
 * Intelligence program). Server Component shell; all data-fetching, plan
 * gating (401/403), and rendering states live in the Client Component
 * `TimeSinkRanking` (the API route enforces auth + `intelligenceLayer`
 * plan-gating server-side; the client renders the resulting states rather
 * than duplicating the gate here).
 */

import { TimeSinkRanking } from '@/components/analytics/TimeSinkRanking';

export const metadata = {
  title: 'Where Your Time Goes — Ledgerium',
};

export default function TimeSinksPage() {
  return <TimeSinkRanking />;
}
