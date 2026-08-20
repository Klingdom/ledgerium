/**
 * GET /api/admin/disputes
 *
 * Admin-only endpoint listing recorded Stripe chargeback disputes (P1-1,
 * billing hardening 2026-08). Read-only over the `StripeDispute` ledger
 * written by `charge.dispute.created` / `charge.dispute.closed` in
 * apps/web-app/src/app/api/billing/webhook/route.ts — see that file's
 * inline comments for why disputes do not affect plan/entitlement.
 *
 * Auth: same convention as the other /api/admin/* endpoints — returns 404
 * (not 401/403) for unauthenticated or non-admin callers, hiding the
 * existence of the admin surface (AC-6 precedent, canAccessAdmin per
 * ADM-002 §10 D-02 single source of truth).
 *
 * Response shape: { data, error, meta } — matches the established
 * admin-operations envelope convention.
 *
 * @module api/admin/disputes/route
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AdminDisputeRow {
  id: string;
  chargeId: string;
  userId: string | null;
  teamId: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDisputesApiResponse {
  data: { disputes: AdminDisputeRow[] } | null;
  error: { code: string; message: string } | null;
  meta: { generatedAt: string; durationMs: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Cap the response size — disputes are rare; this is a safety ceiling, not a real page limit. */
const MAX_DISPUTES = 200;

function notFoundResponse(generatedAt: string): NextResponse {
  const body: AdminDisputesApiResponse = {
    data: null,
    error: { code: 'not_found', message: 'Not Found' },
    meta: { generatedAt, durationMs: 0 },
  };
  return NextResponse.json(body, { status: 404 });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  generatedAt: string,
  durationMs: number,
): NextResponse {
  const body: AdminDisputesApiResponse = {
    data: null,
    error: { code, message },
    meta: { generatedAt, durationMs },
  };
  return NextResponse.json(body, { status });
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  // DET-1-style single upstream clock boundary.
  const referenceNowMs = Date.now();
  const generatedAt = new Date(referenceNowMs).toISOString();

  // AUTH: 404 hides admin surface from non-admin callers (canAccessAdmin —
  // single source of truth per ADM-002 §10 D-02).
  const session = await auth();
  if (!canAccessAdmin(session)) {
    return notFoundResponse(generatedAt);
  }

  try {
    const rows = await (db as any).stripeDispute.findMany({
      orderBy: { createdAt: 'desc' },
      take: MAX_DISPUTES,
    });

    const disputes: AdminDisputeRow[] = rows.map((row: any) => ({
      id: row.id,
      chargeId: row.chargeId,
      userId: row.userId,
      teamId: row.teamId,
      amount: row.amount,
      currency: row.currency,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    const durationMs = Date.now() - referenceNowMs;
    const body: AdminDisputesApiResponse = {
      data: { disputes },
      error: null,
      meta: { generatedAt, durationMs },
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error('[admin/disputes GET]', err);
    const durationMs = Date.now() - referenceNowMs;
    return errorResponse('internal_error', 'Failed to load disputes', 500, generatedAt, durationMs);
  }
}
