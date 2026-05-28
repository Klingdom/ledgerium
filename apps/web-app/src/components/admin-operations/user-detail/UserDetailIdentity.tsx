'use client';

/**
 * UserDetailIdentity — identity block for the UserDetailDrawer.
 *
 * Renders: email, name, plan badge, subscription status badge, createdAt.
 * Admin-only surface — full email is acceptable (PII-1 exception).
 *
 * @iter 096 / ADM-002 PR-7
 */

import type { AdminUserDetailData } from '@/app/api/admin/users/[id]/route.js';

// ── Pure helpers (exported for tests) ─────────────────────────────────────────

/** Format a plan string to a readable label. */
export function formatPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    team: 'Team',
    growth: 'Growth',
    enterprise: 'Enterprise',
  };
  return labels[plan] ?? plan;
}

/** Map a subscription status to a display label. */
export function formatSubscriptionStatus(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    trialing: 'Trialing',
    past_due: 'Past due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
  };
  return labels[status] ?? status;
}

/** Map a subscription status to a Tailwind color class pair. */
export function statusColorClass(status: string): string {
  if (status === 'active' || status === 'trialing') {
    return 'bg-emerald-500/15 text-emerald-400';
  }
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') {
    return 'bg-amber-500/15 text-amber-400';
  }
  if (status === 'canceled' || status === 'incomplete_expired') {
    return 'bg-red-500/15 text-red-400';
  }
  return 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]';
}

/** Format an ISO datetime string to a short date, e.g. "Jan 15, 2024". */
export function formatJoinedDate(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

interface UserDetailIdentityProps {
  user: AdminUserDetailData['user'];
}

export function UserDetailIdentity({ user }: UserDetailIdentityProps) {
  return (
    <section aria-labelledby="user-detail-identity-heading">
      <h3
        id="user-detail-identity-heading"
        className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--content-tertiary)]"
      >
        Identity
      </h3>

      <dl className="space-y-2">
        {/* Email */}
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] text-[var(--content-tertiary)]">Email</dt>
          <dd className="break-all text-[13px] font-medium text-[var(--content-primary)]">
            {user.email}
          </dd>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] text-[var(--content-tertiary)]">Name</dt>
          <dd className="text-[13px] text-[var(--content-secondary)]">
            {user.name ?? '—'}
          </dd>
        </div>

        {/* Plan + subscription status */}
        <div className="flex items-center gap-2 pt-1">
          <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--content-secondary)]">
            {formatPlanLabel(user.plan)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColorClass(user.subscriptionStatus)}`}
          >
            {formatSubscriptionStatus(user.subscriptionStatus)}
          </span>
          {user.isAdmin && (
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-400">
              Admin
            </span>
          )}
        </div>

        {/* Joined */}
        <div className="flex flex-col gap-0.5 pt-1">
          <dt className="text-[11px] text-[var(--content-tertiary)]">Joined</dt>
          <dd className="text-[13px] text-[var(--content-secondary)]">
            {formatJoinedDate(user.createdAt)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
