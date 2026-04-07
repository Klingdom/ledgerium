import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * POST /api/admin/bootstrap
 *
 * Promotes the current authenticated user to admin.
 * Only works when there are zero admins in the system (first-run bootstrap).
 * Once an admin exists, this endpoint is permanently disabled.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if any admin already exists
  const existingAdmin = await db.user.findFirst({
    where: { isAdmin: true },
    select: { id: true },
  });

  if (existingAdmin) {
    return NextResponse.json(
      { error: 'Admin already exists. Bootstrap is disabled.' },
      { status: 403 },
    );
  }

  // Promote current user to admin
  await db.user.update({
    where: { id: session.user.id },
    data: { isAdmin: true },
  });

  return NextResponse.json({
    ok: true,
    message: 'You are now an admin. Log out and log back in for changes to take effect.',
  });
}
