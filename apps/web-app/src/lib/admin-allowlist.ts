/**
 * Admin-granted unlimited access allowlist.
 *
 * Emails in this list get enterprise-tier entitlements regardless of their
 * `user.plan` in the database. This is a defense-in-depth mechanism: Stripe
 * webhooks that sync plan changes cannot downgrade an allowlisted account
 * because all feature-gating checks consult this list first.
 *
 * Add emails here only with explicit CEO approval. Email comparisons are
 * case-insensitive and trimmed.
 */

import type { Session } from 'next-auth';

const ALLOWLIST: ReadonlySet<string> = new Set([
  'philklingmbb@gmail.com',
]);

/** True if the email is on the admin-unlimited allowlist. */
export function isAdminUnlimited(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWLIST.has(email.trim().toLowerCase());
}

/**
 * Unified admin authorization predicate.
 *
 * Returns true IFF the session has a valid email AND the email is on the
 * allowlist. This is the SINGLE source of truth for admin access across
 * all admin routes (per ADM-002 §10 D-02 coordinator decision Option A).
 *
 * The `User.isAdmin` DB field is no longer consumed for gating decisions.
 * (Bootstrap endpoint may still set it but its value is purely informational.)
 *
 * @iter 090 / ADM-002 PR-1
 */
export function canAccessAdmin(session: Session | null | undefined): boolean {
  const email = session?.user?.email;
  if (!email) return false;
  return isAdminUnlimited(email);
}
