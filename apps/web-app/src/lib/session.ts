import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import type { User } from '@prisma/client';
import { checkRecordingLimit } from './feature-gating';

/**
 * Get the authenticated user or redirect to login.
 * Use in server components and server actions.
 */
export async function requireUser(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect('/login');
  }

  return user;
}

/**
 * Return true if the user is allowed to upload another recording this month.
 * Delegates to checkRecordingLimit for plan-aware, monthly-reset logic.
 *
 * @deprecated Prefer using checkRecordingLimit() directly for richer error info.
 */
export async function canUpload(user: User): Promise<boolean> {
  const result = await checkRecordingLimit(user);
  return result.allowed;
}
