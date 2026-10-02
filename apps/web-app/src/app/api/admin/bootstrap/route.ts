import { withApiRoute } from '@/lib/with-api-route';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/bootstrap — RETIRED (row #276 / AUTHZ_AUDIT_001 P1-1).
 *
 * This endpoint used to promote the calling user to `User.isAdmin = true` when
 * no admin row existed, guarded only by the DISABLE_ADMIN_BOOTSTRAP env var —
 * which never reached the production container. Admin authority is now defined
 * solely by the allowlist in `lib/admin-allowlist.ts` (`canAccessAdmin`), and
 * `User.isAdmin` confers no authority anywhere, so there is nothing left for a
 * bootstrap to do. Allowlisted admins need no promotion; the allowlist is
 * edited in code with CEO approval.
 *
 * The handler deliberately performs no auth, no DB access and no writes, and
 * consults no environment variable, so no configuration can reopen it.
 * It returns 410 Gone for any caller.
 */
async function handlePOST() {
  return NextResponse.json(
    { error: 'Gone: admin bootstrap has been retired' },
    { status: 410 },
  );
}

export const POST = withApiRoute('/api/admin/bootstrap', handlePOST);
