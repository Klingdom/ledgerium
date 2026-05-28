'use client';

/**
 * UserDetailActions — action buttons block for the UserDetailDrawer.
 *
 * All buttons are DISABLED placeholders. Real mutations ship in PR-9/PR-10.
 * Tooltip text explains why each action is unavailable in the current build.
 *
 * @iter 096 / ADM-002 PR-7
 */

// ── Component ──────────────────────────────────────────────────────────────────

export function UserDetailActions() {
  return (
    <section aria-labelledby="user-detail-actions-heading">
      <h3
        id="user-detail-actions-heading"
        className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--content-tertiary)]"
      >
        Actions
      </h3>

      <div className="flex flex-col gap-2">
        {/* Extend trial — disabled placeholder */}
        <button
          type="button"
          disabled
          title="Coming in next PRs"
          aria-disabled="true"
          className="flex w-full items-center justify-between rounded-lg bg-[var(--surface-secondary)] px-3 py-2.5 text-[13px] font-medium text-[var(--content-tertiary)] opacity-50 cursor-not-allowed"
          data-testid="action-extend-trial"
        >
          <span>Extend trial</span>
          <span className="text-[11px] font-normal text-[var(--content-tertiary)]">
            Coming soon
          </span>
        </button>

        {/* Adjust quota — disabled placeholder */}
        <button
          type="button"
          disabled
          title="Coming in next PRs"
          aria-disabled="true"
          className="flex w-full items-center justify-between rounded-lg bg-[var(--surface-secondary)] px-3 py-2.5 text-[13px] font-medium text-[var(--content-tertiary)] opacity-50 cursor-not-allowed"
          data-testid="action-adjust-quota"
        >
          <span>Adjust quota</span>
          <span className="text-[11px] font-normal text-[var(--content-tertiary)]">
            Coming soon
          </span>
        </button>
      </div>
    </section>
  );
}
