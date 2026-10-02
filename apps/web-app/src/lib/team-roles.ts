/**
 * Team role set and the role-elevation rule — single source of truth (row #272).
 *
 * Hierarchy: owner > admin > member > viewer (UMAP-001 §3 AC-11).
 * Every path that creates or changes a TeamMember.role / TeamInvite.role on behalf of
 * an acting user (PATCH /members/:memberId, POST /invite) uses this module, and
 * invites/accept re-checks a stored invite against it.
 */

/** Order is part of the PATCH 400 message contract: "owner, admin, member, viewer". */
export const TEAM_ROLES: readonly string[] = ['owner', 'admin', 'member', 'viewer'];

const TEAM_ROLE_SET: ReadonlySet<string> = new Set(TEAM_ROLES);

export function isTeamRole(value: unknown): value is string {
  return typeof value === 'string' && TEAM_ROLE_SET.has(value);
}

/**
 * Elevation rule: only an owner may grant `owner`. An admin may grant admin, member,
 * viewer (as PATCH has always allowed). Callers must already have verified that the
 * actor is an active owner or admin; this function only judges the requested role.
 */
export function isRoleElevation(actorRole: string, requestedRole: string): boolean {
  return requestedRole === 'owner' && actorRole !== 'owner';
}
