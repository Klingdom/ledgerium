import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuditEligibility } from '@/lib/audit-eligibility';

/**
 * GET /api/billing/audit-eligibility
 *
 * Authenticated. Returns the current user's Process Audit purchase
 * eligibility (SKU_SPEC_001 §2 hard qualification gate) — which of their
 * recorded processes meet the minimum-run threshold, and whether they can
 * buy an audit at all right now.
 *
 * Uses the SAME query the checkout route enforces at purchase time
 * (getAuditEligibility / audit-eligibility.ts) — this endpoint is display
 * only; it does not grant anything. A response of `eligible: true` here is
 * informational, not authorization — /api/billing/checkout re-derives
 * eligibility independently before creating a Checkout Session.
 *
 * Deliberately does not require the `intelligenceLayer` plan feature (unlike
 * /api/process-definitions) — a Free-tier user should be able to see how
 * close they are to qualifying without needing a paid plan first.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const eligibility = await getAuditEligibility(session.user.id);

  return NextResponse.json({ data: eligibility });
}
