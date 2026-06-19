/**
 * GET /api/admin/operations?range=7d|30d|90d
 *
 * Admin-only composite endpoint for the Operations Dashboard.
 *
 * Auth:
 *   Returns 404 (not 401/403) for unauthenticated or non-admin callers.
 *   This hides the existence of the admin surface from non-admin users
 *   (AC-6, PRD §5).
 *
 * Query params:
 *   range — "7d" | "30d" | "90d" (default "30d")
 *
 * Response shape: AdminOperationsApiResponse
 *   { data: AdminOperationsResponse | null, error: {...} | null, meta: {...} }
 *
 * Performance target: ≤2000ms (AC-7). All Prisma queries run in parallel via
 * Promise.all.
 *
 * @module api/admin/operations/route
 * @iter 071
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import {
  getUserVolume,
  getRecordingVolume,
  getWorkflowVolume,
  getSystemHealth,
  getMemoryUsage,
  getSubscriptionBreakdown,
} from '@/lib/admin-operations/queries';
import type {
  AdminOperationsApiResponse,
  TimeRangeDays,
} from '@/lib/admin-operations/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_RANGES = new Set<string>(['7d', '30d', '90d']);
const DEFAULT_RANGE: TimeRangeDays = 30;

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseRange(raw: string | null): TimeRangeDays {
  if (!raw || !VALID_RANGES.has(raw)) return DEFAULT_RANGE;
  return parseInt(raw, 10) as TimeRangeDays;
}

function notFoundResponse(generatedAt: string): NextResponse {
  const body: AdminOperationsApiResponse = {
    data: null,
    error: { code: 'not_found', message: 'Not Found' },
    meta: { generatedAt, queryDurationMs: 0 },
  };
  return NextResponse.json(body, { status: 404 });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  generatedAt: string,
  queryDurationMs: number,
): NextResponse {
  const body: AdminOperationsApiResponse = {
    data: null,
    error: { code, message },
    meta: { generatedAt, queryDurationMs },
  };
  return NextResponse.json(body, { status });
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const generatedAt = new Date().toISOString();
  const startMs = Date.now();

  // ── Auth gate (AC-6): 404 hides admin surface from non-admin callers ─────────
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (!email || !isAdminUnlimited(email)) {
    return notFoundResponse(generatedAt);
  }

  // ── Parse range param ────────────────────────────────────────────────────────
  const rawRange = request.nextUrl.searchParams.get('range');
  const rangeDays = parseRange(rawRange);

  const now = new Date();
  const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const endDate = now;

  // ── Execute all queries in parallel ─────────────────────────────────────────
  try {
    const [
      userVolume,
      recordingVolume,
      workflowProcessing,
      systemHealth,
      subscriptionBreakdown,
    ] = await Promise.all([
      getUserVolume(startDate, endDate),
      getRecordingVolume(startDate, endDate),
      getWorkflowVolume(startDate, endDate),
      getSystemHealth(),
      getSubscriptionBreakdown(),
    ]);

    // Memory is synchronous — no async needed
    const memoryUsage = getMemoryUsage();

    const queryDurationMs = Date.now() - startMs;

    // ── Assemble KPI tiles ─────────────────────────────────────────────────────
    // Existing 6 tiles preserved verbatim; 5 new growth tiles appended.
    const kpi = {
      // ── Existing 6 (unchanged) ───────────────────────────────────────────────
      totalUsers: userVolume.totalUsers,
      mau30d: userVolume.mau30d,
      uploadsInRange: recordingVolume.uploadsInRange,
      dbSizeBytes: systemHealth.dbSize.available
        ? systemHealth.dbSize.totalBytes
        : null,
      nodeHeapUsedBytes: memoryUsage.heapUsedBytes,
      errorEvents24hTotal: systemHealth.errorEvents24hTotal,
      // ── New growth tiles ─────────────────────────────────────────────────────
      mrrUsd: subscriptionBreakdown.mrr.estimatedUsd,
      payingSubscribers: subscriptionBreakdown.paidUserCount,
      signupsInRange: userVolume.newUsersInRange,
      freeToPaidConversionPct: subscriptionBreakdown.freeToPaidConversionPct,
      activationRatePct: userVolume.activationRatePct,
    };

    const body: AdminOperationsApiResponse = {
      data: {
        rangeApplied: rangeDays,
        kpi,
        userVolume,
        recordingVolume,
        workflowProcessing,
        systemHealth,
        memoryUsage,
        subscriptionBreakdown,
      },
      error: null,
      meta: {
        generatedAt,
        queryDurationMs,
      },
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error('[admin/operations GET]', err);
    const queryDurationMs = Date.now() - startMs;
    return errorResponse(
      'internal_error',
      'Failed to load operations data',
      500,
      generatedAt,
      queryDurationMs,
    );
  }
}
