import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import type { User } from '@prisma/client';

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
 * Plan limits for upload gating.
 */
export const PLAN_LIMITS = {
  free: { maxUploads: 5, maxLibrarySize: 10 },
  pro: { maxUploads: Infinity, maxLibrarySize: Infinity },
  team: { maxUploads: Infinity, maxLibrarySize: Infinity },
} as const;

export function canUpload(user: User): boolean {
  const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  return user.uploadCount < limits.maxUploads;
}
