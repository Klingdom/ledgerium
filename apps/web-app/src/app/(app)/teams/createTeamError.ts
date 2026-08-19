/**
 * Maps a failed `POST /api/teams` response to what the user should be told.
 *
 * P0-F: this path previously did not exist. `handleCreate()` in `page.tsx` had
 * `if (res.ok) { ... }` with no `else`, so every failure — the 403 plan gate,
 * the 404 that `DEMO_MODE_DISABLE_TEAMS` produces, validation errors, 500s —
 * simply stopped the spinner and showed the user nothing at all.
 *
 * The API had always returned everything needed to do better:
 * `api/teams/route.ts` emits `code: 'plan_upgrade_required'` alongside
 * `requiredPlan` and `upgradeUrl`, with a comment explicitly noting the
 * frontend can use it to render an upgrade CTA. Only the frontend was missing,
 * which is why `TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001.md` recorded P0-F as
 * closed when only its backend half had shipped (see
 * `docs/meta/REVENUE_PLAN_20K/team_workspace_status.md`).
 *
 * Lives in its own module rather than `page.tsx` because Next.js permits only
 * a fixed set of named exports from route files — and so this can be unit
 * tested directly instead of through a mirrored copy of the component logic.
 */

export interface CreateTeamError {
  message: string;
  upgradeUrl?: string;
  /** Present only for the plan-gate case, so the caller can emit the upgrade-prompt event. */
  requiredPlan?: string;
}

export function mapCreateTeamError(status: number, body: unknown): CreateTeamError {
  const payload = (body ?? {}) as Record<string, unknown>;

  if (payload.code === 'plan_upgrade_required') {
    const requiredPlan = typeof payload.requiredPlan === 'string' ? payload.requiredPlan : 'Team';
    return {
      message: `Team workspaces are included on the ${requiredPlan} plan.`,
      upgradeUrl: typeof payload.upgradeUrl === 'string' ? payload.upgradeUrl : '/pricing',
      requiredPlan,
    };
  }

  // DEMO_MODE_DISABLE_TEAMS gates POST /api/teams to 404. Say so plainly rather
  // than implying the user did something wrong — and do NOT offer an upgrade
  // here: the tier is switched off entirely, so taking their money would be
  // dishonest.
  if (status === 404) {
    return { message: 'Team workspaces are not available yet. We will email you when invites go live.' };
  }

  return {
    message: typeof payload.error === 'string' ? payload.error : 'Could not create the team — please try again.',
  };
}
