/**
 * GET /api/admin/users/[id]
 *
 * Admin-only user-detail endpoint for the ADM-002 drill-down + growth sprint.
 *
 * Auth (AUTH-1 / AUTH-2):
 *   Returns 404 (not 401/403) for unauthenticated or non-admin callers.
 *   This hides the existence of the admin surface from non-admin users.
 *   Uses canAccessAdmin(session) — single source of truth (PR-1 / ADM-002 §10 D-02).
 *
 * Response shape:
 *   { data: AdminUserDetailData | null, error: {...} | null, meta: {...} }
 *
 * Determinism (DET-1):
 *   Single `Date.now()` boundary at handler entry (`referenceNowMs`).
 *   No subsequent `Date.now()` or `new Date()` calls.
 *
 * PII (PII-1):
 *   Full email returned — admin-only endpoint; acceptable per checklist exception.
 *   Nested userId references in memberships are passed through (already user's own id);
 *   no third-party userId truncation needed in this response shape.
 *
 * Audit (AUDIT-1):
 *   Read-only — no audit row required for GET reads.
 *
 * DB (DB-1):
 *   Prisma `findUnique` / `count` / `findMany` — safe on both SQLite and Postgres.
 *   No raw SQL.
 *
 * @module api/admin/users/[id]/route
 * @iter 095 / ADM-002 PR-6
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { toPlanType } from '@/lib/plans';
import { normalizeStripeStatus } from '@/lib/workspace/subscription-status';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AdminUserDetailData {
  user: {
    userId: string;
    email: string;
    name: string | null;
    plan: string;
    subscriptionStatus: string;
    stripeCustomerId: string | null;
    isAdmin: boolean;
    createdAt: string;
    updatedAt: string;
    /** Reserved for future schema extension. Always null until trialEndsAt is added to User. */
    trialEndsAt: null;
  };
  activity: {
    uploadCount: number;
    workflowCount: number;
    lastActivityAt: string | null;
  };
  memberships: Array<{
    teamId: string;
    teamName: string;
    role: string;
    status: string;
    joinedAt: string;
  }>;
}

export interface AdminUserDetailApiResponse {
  data: AdminUserDetailData | null;
  error: { code: string; message: string } | null;
  meta: { generatedAt: string; durationMs: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function notFoundResponse(generatedAt: string): NextResponse {
  const body: AdminUserDetailApiResponse = {
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
  const body: AdminUserDetailApiResponse = {
    data: null,
    error: { code, message },
    meta: { generatedAt, durationMs },
  };
  return NextResponse.json(body, { status });
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // DET-1: single upstream clock boundary
  const referenceNowMs = Date.now();
  const generatedAt = new Date(referenceNowMs).toISOString();

  // AUTH-1 / AUTH-2: 404 hides admin surface from non-admin callers
  const session = await auth();
  if (!canAccessAdmin(session)) {
    return notFoundResponse(generatedAt);
  }

  // Await dynamic route params (Next.js 15 async params)
  const { id } = await params;

  if (!id || typeof id !== 'string' || id.trim() === '') {
    return notFoundResponse(generatedAt);
  }

  const userId = id.trim();

  try {
    // DB-1: parallel Prisma queries — safe on SQLite and Postgres
    const [user, uploadCount, workflowCount, lastUpload, memberships] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      db.upload.count({
        where: { userId },
      }),

      db.workflow.count({
        where: {
          userId,
          status: { not: 'deleted' },
        },
      }),

      db.upload.findFirst({
        where: { userId },
        orderBy: { uploadedAt: 'desc' },
        select: { uploadedAt: true },
      }),

      db.teamMember.findMany({
        where: { userId },
        select: {
          teamId: true,
          role: true,
          status: true,
          joinedAt: true,
          team: {
            select: { name: true },
          },
        },
      }),
    ]);

    // User not found — return same 404 shape as auth failure (no enumeration leak)
    if (!user) {
      return notFoundResponse(generatedAt);
    }

    const durationMs = Date.now() - referenceNowMs;

    const body: AdminUserDetailApiResponse = {
      data: {
        user: {
          userId: user.id,
          email: user.email,
          name: user.name,
          plan: toPlanType(user.plan ?? 'free'),
          subscriptionStatus: normalizeStripeStatus(user.subscriptionStatus ?? 'unpaid'),
          stripeCustomerId: user.stripeCustomerId,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          trialEndsAt: null,
        },
        activity: {
          uploadCount,
          workflowCount,
          lastActivityAt: lastUpload?.uploadedAt.toISOString() ?? null,
        },
        memberships: memberships.map((m) => ({
          teamId: m.teamId,
          teamName: m.team.name,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt.toISOString(),
        })),
      },
      error: null,
      meta: { generatedAt, durationMs },
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error('[admin/users/[id] GET]', err);
    const durationMs = Date.now() - referenceNowMs;
    return errorResponse(
      'internal_error',
      'Failed to load user detail',
      500,
      generatedAt,
      durationMs,
    );
  }
}
