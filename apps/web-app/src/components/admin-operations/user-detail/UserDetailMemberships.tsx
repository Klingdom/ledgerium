'use client';

/**
 * UserDetailMemberships — workspace memberships block for the UserDetailDrawer.
 *
 * Renders a list of team memberships with role/status badges.
 * Renders an empty state when the user has no memberships.
 *
 * @iter 096 / ADM-002 PR-7
 */

import type { AdminUserDetailData } from '@/app/api/admin/users/[id]/route.js';

type Membership = AdminUserDetailData['memberships'][number];

// ── Pure helpers (exported for tests) ─────────────────────────────────────────

/** Capitalize a role string, e.g. "member" → "Member". */
export function formatRole(role: string): string {
  if (!role) return '—';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Map a membership status to a Tailwind color class pair. */
export function membershipStatusColorClass(status: string): string {
  if (status === 'active') return 'bg-emerald-500/15 text-emerald-400';
  if (status === 'invited' || status === 'pending') return 'bg-amber-500/15 text-amber-400';
  if (status === 'removed' || status === 'banned') return 'bg-red-500/15 text-red-400';
  return 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MembershipRow({ membership }: { membership: Membership }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-secondary)] px-3 py-2">
      <span className="truncate text-[13px] text-[var(--content-primary)]">
        {membership.teamName}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-[11px] text-[var(--content-secondary)]">
          {formatRole(membership.role)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${membershipStatusColorClass(membership.status)}`}
        >
          {membership.status}
        </span>
      </div>
    </li>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface UserDetailMembershipsProps {
  memberships: AdminUserDetailData['memberships'];
}

export function UserDetailMemberships({ memberships }: UserDetailMembershipsProps) {
  return (
    <section aria-labelledby="user-detail-memberships-heading">
      <h3
        id="user-detail-memberships-heading"
        className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--content-tertiary)]"
      >
        Workspaces
      </h3>

      {memberships.length === 0 ? (
        <p
          className="text-[13px] text-[var(--content-tertiary)]"
          data-testid="memberships-empty"
        >
          Not a member of any workspace.
        </p>
      ) : (
        <ul className="space-y-1.5" data-testid="memberships-list">
          {memberships.map((m) => (
            <MembershipRow key={m.teamId} membership={m} />
          ))}
        </ul>
      )}
    </section>
  );
}
