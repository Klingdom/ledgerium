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

const ALLOWLIST: ReadonlySet<string> = new Set([
  'philklingmbb@gmail.com',
]);

/** True if the email is on the admin-unlimited allowlist. */
export function isAdminUnlimited(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWLIST.has(email.trim().toLowerCase());
}
