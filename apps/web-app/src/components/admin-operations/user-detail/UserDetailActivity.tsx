'use client';

/**
 * UserDetailActivity — activity block for the UserDetailDrawer.
 *
 * Renders: uploadCount, workflowCount, lastActivityAt (relative time).
 *
 * @iter 096 / ADM-002 PR-7
 */

import type { AdminUserDetailData } from '@/app/api/admin/users/[id]/route.js';
import { formatRelativeTime } from '../format-utils.js';

// ── Pure helpers (exported for tests) ─────────────────────────────────────────

/** Convert an ISO lastActivityAt string to a human-readable relative time. */
export function formatLastActivity(isoString: string | null): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return formatRelativeTime(d);
}

// ── Component ──────────────────────────────────────────────────────────────────

interface UserDetailActivityProps {
  activity: AdminUserDetailData['activity'];
}

export function UserDetailActivity({ activity }: UserDetailActivityProps) {
  return (
    <section aria-labelledby="user-detail-activity-heading">
      <h3
        id="user-detail-activity-heading"
        className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--content-tertiary)]"
      >
        Activity
      </h3>

      <dl className="space-y-2">
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-[var(--content-secondary)]">Recordings</dt>
          <dd className="tabular-nums text-[13px] font-semibold text-[var(--content-primary)]">
            {activity.uploadCount.toLocaleString('en-US')}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-[var(--content-secondary)]">Workflows</dt>
          <dd className="tabular-nums text-[13px] font-semibold text-[var(--content-primary)]">
            {activity.workflowCount.toLocaleString('en-US')}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-[var(--content-secondary)]">Last activity</dt>
          <dd className="text-[13px] text-[var(--content-secondary)]">
            {formatLastActivity(activity.lastActivityAt)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
