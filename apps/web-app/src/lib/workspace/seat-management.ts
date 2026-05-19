/**
 * Seat management helpers for workspace quota enforcement.
 *
 * All functions follow the single-upstream-clock-boundary pattern established
 * at iter 037 (MDR-P03/P04): callers inject `nowMs` so the entire call stack
 * derives timestamps from one reference point.
 *
 * @iter 082 / TEAM-P02 Part E
 */

import { db } from '@/db';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Outcome returned by softDeactivateExcessMembers. */
export interface SeatDeactivationResult {
  /** IDs of TeamMember rows that were set to status='deactivated'. */
  deactivatedIds: string[];
}

// ── Core helper ───────────────────────────────────────────────────────────────

/**
 * Soft-deactivate excess members when a workspace seat quota drops below the
 * current active member count.
 *
 * Ordering contract (owners are protected):
 *   1. Members with role 'owner' are NEVER deactivated.
 *   2. Among non-owner active members, most-recently-joined are deactivated
 *      first (joinedAt DESC) until active count <= maxSeats.
 *
 * Clock contract: `nowMs` is injected by the caller so the entire request
 * shares a single upstream clock boundary (iter 037 MDR-P03/P04 pattern).
 * `reactivationDeadline` is set to nowMs + 30 days.
 *
 * @param teamId  - ID of the workspace to enforce quotas on.
 * @param maxSeats - Maximum seats allowed for this workspace's plan.
 * @param nowMs   - Current epoch milliseconds (injected, deterministic).
 * @returns SeatDeactivationResult with array of newly-deactivated member IDs.
 */
export async function softDeactivateExcessMembers(
  teamId: string,
  maxSeats: number,
  nowMs: number,
): Promise<SeatDeactivationResult> {
  // Unlimited seats — nothing to do.
  if (maxSeats === Number.MAX_SAFE_INTEGER) {
    return { deactivatedIds: [] };
  }

  // Fetch all active members for this team.
  const activeMembers = await (db as any).teamMember.findMany({
    where: {
      teamId,
      status: 'active',
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
    },
  });

  // If within quota, nothing to do.
  const activeCount: number = activeMembers.length;
  if (activeCount <= maxSeats) {
    return { deactivatedIds: [] };
  }

  // Split into owners (protected) and non-owners (deactivation candidates).
  // Owners are placed last so they are never selected for deactivation.
  const owners: Array<{ id: string; role: string; joinedAt: Date }> =
    activeMembers.filter((m: { id: string; role: string; joinedAt: Date }) => m.role === 'owner');
  const nonOwners: Array<{ id: string; role: string; joinedAt: Date }> =
    activeMembers.filter((m: { id: string; role: string; joinedAt: Date }) => m.role !== 'owner');

  // Sort non-owners by joinedAt DESC — most recently joined are deactivated first.
  nonOwners.sort(
    (a: { joinedAt: Date }, b: { joinedAt: Date }) => b.joinedAt.getTime() - a.joinedAt.getTime(),
  );

  // Build the prioritized list: non-owners first (candidates), then owners (protected).
  // We only ever touch the front of this list.
  const orderedCandidates = nonOwners;

  // Determine how many we need to deactivate.
  // We protect owners: if ownerCount >= maxSeats, we still cannot deactivate owners —
  // in that edge case the excess is all non-owners and we deactivate all of them.
  const ownerCount = owners.length;
  const protectedSeats = Math.min(ownerCount, maxSeats);
  const availableNonOwnerSeats = Math.max(0, maxSeats - protectedSeats);
  const excessCount = Math.max(0, nonOwners.length - availableNonOwnerSeats);

  if (excessCount === 0) {
    return { deactivatedIds: [] };
  }

  // Slice the front of orderedCandidates — those are the most-recently-joined non-owners.
  const toDeactivate = orderedCandidates.slice(0, excessCount);
  const idsToDeactivate: string[] = toDeactivate.map((m: { id: string }) => m.id);

  // Compute timestamps.
  const deactivatedAt = new Date(nowMs);
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const reactivationDeadline = new Date(nowMs + THIRTY_DAYS_MS);

  // Perform a batched update using updateMany (single round-trip).
  await (db as any).teamMember.updateMany({
    where: {
      id: { in: idsToDeactivate },
    },
    data: {
      status: 'deactivated',
      deactivatedAt,
      reactivationDeadline,
    },
  });

  return { deactivatedIds: idsToDeactivate };
}

// ── Seat-count helpers (used by quota guard in invite route) ─────────────────

/**
 * Count active (non-deactivated) members in a workspace.
 * Returns only members with status='active'.
 */
export async function countActiveMembers(teamId: string): Promise<number> {
  return (db as any).teamMember.count({
    where: {
      teamId,
      status: 'active',
    },
  });
}

/**
 * Count pending invites for a workspace.
 * "Pending" means: not accepted, not revoked, and not expired.
 *
 * @param teamId - Workspace to query.
 * @param nowMs  - Current epoch milliseconds for expiry comparison (clock injection).
 */
export async function countPendingInvites(teamId: string, nowMs: number): Promise<number> {
  return (db as any).teamInvite.count({
    where: {
      teamId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date(nowMs) },
    },
  });
}
