/**
 * Which pending invites are LIVE (row #323, follow-up to #273).
 *
 * A live invite is unaccepted, unrevoked, unexpired AND acceptable per
 * `isAcceptableInvite` (team-roles.ts). Every consumer of a pending invite -
 * pending list, seat count, duplicate-invite guard - must go through
 * `filterLiveInvites` so they cannot disagree about what counts.
 */

import { db } from '@/db';
import { isAcceptableInvite } from '@/lib/team-roles';

interface InviteLike {
  role: unknown;
  invitedBy: string;
}

/**
 * Apply the acceptance predicate to already-fetched, time-valid pending invites.
 * Inviter roles are loaded with ONE query, and only if an owner invite exists.
 */
export async function filterLiveInvites<T extends InviteLike>(
  teamId: string,
  invites: T[],
): Promise<T[]> {
  const ownerInviterIds = Array.from(
    new Set(invites.filter((i) => i.role === 'owner').map((i) => i.invitedBy)),
  );
  const activeOwnerIds = new Set<string>(
    ownerInviterIds.length === 0
      ? []
      : (
          await db.teamMember.findMany({
            where: { teamId, userId: { in: ownerInviterIds }, status: 'active', role: 'owner' },
            select: { userId: true },
          })
        ).map((m: { userId: string }) => m.userId),
  );
  return invites.filter((i) => isAcceptableInvite(i, activeOwnerIds.has(i.invitedBy) ? 'owner' : null));
}
