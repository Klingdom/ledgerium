/**
 * Email-based user lookup for login.
 *
 * Extracted out of lib/auth.ts (rather than co-located with the NextAuth
 * config) because importing lib/auth.ts directly in a Vitest (node) test
 * pulls in `next-auth`, which resolves `next/server` in a way that only
 * works inside the Next.js runtime — every existing test mocks
 * `@/lib/auth` wholesale rather than importing it. Keeping this lookup in
 * its own dependency-free module makes it directly unit-testable.
 *
 * Root-cause context (2026-07-09): login always did a raw, exact-case
 * `db.user.findUnique({ where: { email } })`. Signup now stores a normalized
 * (lowercased/trimmed) email, so login must look up by the normalized form
 * to find NEW accounts — while still finding any PRE-EXISTING account row
 * that may have been stored under a different casing before this fix
 * (fallback lookup), so no currently-working login regresses.
 */

import { db } from '@/db';
import { normalizeEmail } from '@/lib/email-normalize';

/**
 * Look up a user by email for login, preferring the normalized (canonical)
 * form and falling back to the as-typed raw form for backward compatibility
 * with any pre-existing account row stored under a different casing.
 *
 * This is strictly additive relative to a raw-only lookup — it can only find
 * MORE accounts than before, never fewer — so it cannot regress a login that
 * currently works.
 */
export async function findUserByEmailForLogin(rawEmail: string) {
  const normalizedEmail = normalizeEmail(rawEmail);
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (user) return user;
  if (normalizedEmail !== rawEmail) {
    return db.user.findUnique({ where: { email: rawEmail } });
  }
  return null;
}
