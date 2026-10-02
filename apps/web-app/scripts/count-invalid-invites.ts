/**
 * count-invalid-invites.ts — READ-ONLY census of pending team invites that
 * `invites/accept` would refuse (row #273). Prints counts only: no emails, ids,
 * tokens, team names, or role strings. Performs no writes (findMany only).
 *
 * Uses the same predicate as acceptance and the pending-invite list
 * (`inviteRefusal` in src/lib/team-roles.ts), so the counts match what users see refused.
 *
 * USAGE (local dev DB — default from .env):
 *   pnpm --filter @ledgerium/web-app exec tsx scripts/count-invalid-invites.ts
 *
 * USAGE (production — operator runs this; it only reads):
 *   DATABASE_URL="<prod url>" pnpm --filter @ledgerium/web-app exec tsx scripts/count-invalid-invites.ts
 *
 * Output:
 *   pending_total               un-accepted, un-revoked, un-expired invites
 *   invalid_role                stored role outside {owner, admin, member, viewer}
 *   owner_from_non_owner        role `owner` but inviter is not a currently active owner
 *   acceptable                  pending_total - invalid_role - owner_from_non_owner
 *
 * Revoking such rows is a data change and needs CEO approval; this script never does it.
 */
import { PrismaClient } from '@prisma/client';
import { inviteRefusal } from '../src/lib/team-roles';

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const pending = await db.teamInvite.findMany({
      where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { teamId: true, role: true, invitedBy: true },
    });

    const ownerPairs = pending.filter((i) => i.role === 'owner');
    const activeOwners = ownerPairs.length === 0
      ? []
      : await db.teamMember.findMany({
          where: { role: 'owner', status: 'active', teamId: { in: Array.from(new Set(ownerPairs.map((i) => i.teamId))) } },
          select: { teamId: true, userId: true },
        });
    const ownerKeys = new Set(activeOwners.map((m) => `${m.teamId}:${m.userId}`));

    let invalidRole = 0;
    let ownerFromNonOwner = 0;
    for (const i of pending) {
      const refusal = inviteRefusal(i, ownerKeys.has(`${i.teamId}:${i.invitedBy}`) ? 'owner' : null);
      if (refusal === 'invalid_role') invalidRole++;
      else if (refusal === 'owner_not_from_owner') ownerFromNonOwner++;
    }

    console.log(`pending_total=${pending.length}`);
    console.log(`invalid_role=${invalidRole}`);
    console.log(`owner_from_non_owner=${ownerFromNonOwner}`);
    console.log(`acceptable=${pending.length - invalidRole - ownerFromNonOwner}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error('count-invalid-invites failed:', err instanceof Error ? err.message : 'unknown error');
  process.exit(1);
});
