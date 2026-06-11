import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { ensureSampleVariants } from '@/lib/sample-variants';

/**
 * POST /api/admin/seed-sample-variants
 *
 * Auto-seed the variant sample ("Approve Expense Report" recorded 8 ways) for
 * allowlisted ADMIN accounts only. The dashboard fires this once on load so the
 * Process Variants demo is always present on admin accounts without a click.
 *
 * Non-admins get a fast no-op (the allowlist check stays server-side). Idempotent —
 * ensureSampleVariants returns the existing set if already present.
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gate to allowlisted admins (by session email). Everyone else: no-op.
  if (!canAccessAdmin(session)) {
    return NextResponse.json({ skipped: true });
  }

  const result = await ensureSampleVariants(session.user.id);
  return NextResponse.json({
    id: result?.id ?? null,
    created: result?.created ?? false,
    count: result?.count ?? 0,
  });
}
