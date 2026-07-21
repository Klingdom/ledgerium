/**
 * GET /api/admin/backup-status
 *
 * Admin-only endpoint reporting the status of the backup sidecar
 * (scripts/db-backup.sh + scripts/evidence-backup.sh), read from the
 * status file it writes each cycle (SOP_BUILDER_REVIEW_001 B-4). A
 * dedicated endpoint (rather than folding this into
 * GET /api/admin/operations) so a filesystem read failure here can never
 * take down the rest of the operations dashboard's composite query, and
 * vice versa — separate failure domains.
 *
 * Auth: same convention as /api/admin/operations — returns 404 (not
 * 401/403) for unauthenticated or non-admin callers, hiding the existence
 * of the admin surface (AC-6 precedent).
 *
 * Response shape: BackupStatusApiResponse — { data, error, meta }.
 *
 * @module api/admin/backup-status/route
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import { readBackupStatusFile, buildBackupStatusSummary } from '@/lib/admin-operations/backup-status';
import type { BackupStatusApiResponse } from '@/lib/admin-operations/backup-status';

// ── Helpers ────────────────────────────────────────────────────────────────────

function notFoundResponse(generatedAt: string): NextResponse {
  const body: BackupStatusApiResponse = {
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
  const body: BackupStatusApiResponse = {
    data: null,
    error: { code, message },
    meta: { generatedAt, queryDurationMs },
  };
  return NextResponse.json(body, { status });
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const generatedAt = new Date().toISOString();
  const startMs = Date.now();

  // ── Auth gate (AC-6 precedent): 404 hides admin surface from non-admin callers ──
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (!email || !isAdminUnlimited(email)) {
    return notFoundResponse(generatedAt);
  }

  try {
    const outcome = await readBackupStatusFile();
    const data = buildBackupStatusSummary(outcome, Date.now());
    const queryDurationMs = Date.now() - startMs;

    const body: BackupStatusApiResponse = {
      data,
      error: null,
      meta: { generatedAt, queryDurationMs },
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    // readBackupStatusFile/buildBackupStatusSummary do not throw on any
    // known failure path (absent/unreadable/invalid file all resolve to a
    // summary), so reaching here means something unexpected — degrade to
    // a 500 rather than surfacing a stack trace, matching the composite
    // operations endpoint's convention.
    console.error('[admin/backup-status GET]', err);
    const queryDurationMs = Date.now() - startMs;
    return errorResponse(
      'internal_error',
      'Failed to load backup status',
      500,
      generatedAt,
      queryDurationMs,
    );
  }
}
