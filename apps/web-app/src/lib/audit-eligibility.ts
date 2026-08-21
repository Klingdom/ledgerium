/**
 * Process Audit purchase eligibility (SKU_SPEC_001 §2 hard qualification
 * gate).
 *
 * `getAuditEligibility()` is the SINGLE SOURCE OF TRUTH for "can this user
 * buy a Process Audit right now" — it is used both to render eligibility in
 * the UI (`/api/billing/audit-eligibility`, consumed by the account page's
 * Services card) and to enforce the gate server-side at checkout
 * (`checkout/route.ts`, `createOneTimeCheckoutSession`). Sharing one query
 * means the UI can never show "eligible" when checkout would actually
 * reject the purchase, or vice versa.
 *
 * A "process" here is a `ProcessDefinition` row (an exact-group cluster of
 * recorded workflow runs) — `runCount` is the number of recorded runs
 * grouped into it, already maintained by the ingest pipeline and used
 * elsewhere in the product (e.g. `/api/process-definitions`,
 * `/analytics/process/[id]`).
 */

import { db } from '@/db';
import { MIN_RECORDED_RUNS_FOR_AUDIT } from './service-skus';

export interface AuditEligibleProcess {
  id: string;
  canonicalName: string;
  runCount: number;
  qualifies: boolean;
}

export interface AuditEligibility {
  /** True IFF at least one process meets the hard qualification gate. */
  eligible: boolean;
  minRunsRequired: number;
  processes: AuditEligibleProcess[];
}

/**
 * Computes Process Audit purchase eligibility for a user.
 *
 * Deliberately does NOT require the `intelligenceLayer` plan feature —
 * eligibility is about how much the user has recorded, not what plan they
 * are on. A Free-tier user whose 5 recordings all happen to be the same
 * process is just as eligible as a Team subscriber.
 */
export async function getAuditEligibility(userId: string): Promise<AuditEligibility> {
  const definitions = await db.processDefinition.findMany({
    where: { userId },
    select: { id: true, canonicalName: true, runCount: true },
    orderBy: { runCount: 'desc' },
  });

  const processes: AuditEligibleProcess[] = definitions.map((d) => ({
    id: d.id,
    canonicalName: d.canonicalName,
    runCount: d.runCount,
    qualifies: d.runCount >= MIN_RECORDED_RUNS_FOR_AUDIT,
  }));

  return {
    eligible: processes.some((p) => p.qualifies),
    minRunsRequired: MIN_RECORDED_RUNS_FOR_AUDIT,
    processes,
  };
}
