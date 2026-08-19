/**
 * P0-F regression: create-team failures must not be silent.
 *
 * `TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001.md` logged P0-F ("Free user 'Create
 * Team' form silently fails (no upgrade CTA)") and it was subsequently recorded
 * as closed — but only the BACKEND half shipped. `api/teams/route.ts` returns a
 * rich payload with `code: 'plan_upgrade_required'` and an explicit comment
 * saying the frontend can use it to render an upgrade CTA. The frontend never
 * did: `handleCreate()` had `if (res.ok) { ... }` with no `else`, so every
 * failure stopped the spinner and showed nothing.
 *
 * `docs/meta/REVENUE_PLAN_20K/team_workspace_status.md` identified this as a
 * false-closure claim. These tests lock the mapping so it cannot regress to
 * silence.
 */

import { describe, it, expect } from 'vitest';
import { mapCreateTeamError } from './createTeamError';

describe('mapCreateTeamError — P0-F, failures must be explained', () => {
  it('turns the 403 plan gate into an upgrade CTA carrying the API-supplied URL', () => {
    const result = mapCreateTeamError(403, {
      error: 'Feature not available on your plan',
      code: 'plan_upgrade_required',
      feature: 'teamWorkspace',
      requiredPlan: 'team',
      upgradeUrl: '/pricing',
    });

    expect(result.message).toContain('team');
    expect(result.upgradeUrl).toBe('/pricing');
    // requiredPlan drives the upgrade_prompt_viewed analytics event.
    expect(result.requiredPlan).toBe('team');
  });

  it('falls back to /pricing when the API omits upgradeUrl', () => {
    const result = mapCreateTeamError(403, { code: 'plan_upgrade_required' });
    expect(result.upgradeUrl).toBe('/pricing');
    expect(result.requiredPlan).toBe('Team');
  });

  it('explains the 404 that DEMO_MODE_DISABLE_TEAMS produces, without blaming the user', () => {
    const result = mapCreateTeamError(404, { error: 'Not found' });

    expect(result.message).toMatch(/not available yet/i);
    // Not an upgrade moment — the tier is gated off entirely, so offering to
    // take the user's money here would be dishonest.
    expect(result.upgradeUrl).toBeUndefined();
    expect(result.requiredPlan).toBeUndefined();
  });

  it("surfaces the API's own error text for other failures", () => {
    const result = mapCreateTeamError(400, { error: 'Team name must be at least 2 characters' });
    expect(result.message).toBe('Team name must be at least 2 characters');
    expect(result.upgradeUrl).toBeUndefined();
  });

  it('still produces a message when the body is unparseable or null', () => {
    // handleCreate passes null when res.json() rejects.
    const result = mapCreateTeamError(500, null);
    expect(result.message).toBeTruthy();
    expect(result.message).toMatch(/try again/i);
  });

  it('never returns an empty message for any status — silence is the bug', () => {
    for (const status of [400, 401, 403, 404, 409, 500, 503]) {
      const result = mapCreateTeamError(status, null);
      expect(result.message.trim().length, `status ${status} produced an empty message`).toBeGreaterThan(0);
    }
  });
});
