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
/**
 * Authority rule (row #274): a non-owner may not remove or change the role of an owner.
 * Admins are peers of each other: the invite and PATCH rules already let an admin grant
 * `admin`, so an admin may remove or change another admin. Callers must already have
 * verified the actor is an active owner or admin.
 */
export function isActionOnHigherAuthority(actorRole: string, targetRole: string): boolean {
  return targetRole === 'owner' && actorRole !== 'owner';
}

/** Response body shared by every path that refuses with `forbidden_role_elevation`. */
export const ROLE_ELEVATION_CODE = 'forbidden_role_elevation';

export function isRoleElevation(actorRole: string, requestedRole: string): boolean {
  return requestedRole === 'owner' && actorRole !== 'owner';
}
