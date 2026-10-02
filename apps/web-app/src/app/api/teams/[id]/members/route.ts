import { withApiRoute } from '@/lib/with-api-route';
import { parseJsonBody } from '@/lib/read-json-body';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { reportApiError } from '@/lib/api-error-reporting';
import { ROLE_ELEVATION_CODE, isActionOnHigherAuthority } from '@/lib/team-roles';

/**
 * GET /api/teams/:id/members — list team members
 *
 * Query params (row #261: each is validated, and a bad value is a 400 — it used
 * to fall back silently or, when huge, overflow Prisma's Int and 500):
 *   skip   — records to skip: a non-negative integer, at most MAX_SKIP (default 0)
 *   take   — max records to return: an integer >= 1 (default 50; above 100 is
 *            clamped to 100, as before)
 *   status — filter by member status: 'active' | 'deactivated' | 'all' (default 'active')
 *
 * Response adds `memberId` (TeamMember row id) and `status` fields to each member.
 *
 * DELETE /api/teams/:id/members — remove a member (owner/admin only, legacy body-based endpoint)
 *
 * @iter 082 / TEAM-P02 Part D
 */

/**
 * Upper bound on `?skip`. Prisma's `skip` is a 32-bit Int, so anything past
 * 2_147_483_647 throws inside the driver — a client-supplied number reported as
 * a server failure. 100_000 is ~1000 pages at the max page size: a roster that
 * large is not a real team (paid tiers cap seats at 5 / 15; Enterprise is
 * uncapped but nowhere near this), and it sits five orders of magnitude under
 * the overflow. Raising it is a one-line change if a customer ever needs it.
 */
const MAX_SKIP = 100_000;
const MAX_TAKE = 100;

/** Digits only: rejects '', '-1', '1.5', '1e3', ' 5', 'abc' that parseInt would half-accept. */
function parseNonNegativeInt(raw: string | null, fallback: number): number | null {
  if (raw === null) return fallback;
  if (!/^[0-9]+$/.test(raw)) return null;
  return Number(raw);
}

async function handleGET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify caller is an active member (P0-E: status:'active' guard)
    const membership = await db.teamMember.findFirst({
      where: { teamId: params.id, userId: session.user.id, status: 'active' },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    // Parse pagination + filter query params.
    const { searchParams } = new URL(req.url);
    const skip = parseNonNegativeInt(searchParams.get('skip'), 0);
    const rawTake = parseNonNegativeInt(searchParams.get('take'), 50);
    const statusFilter = searchParams.get('status') ?? 'active';

    if (skip === null || skip > MAX_SKIP) {
      return NextResponse.json(
        { error: `skip must be an integer between 0 and ${MAX_SKIP}` },
        { status: 400 },
      );
    }
    if (rawTake === null || rawTake < 1) {
      return NextResponse.json({ error: 'take must be an integer of at least 1' }, { status: 400 });
    }
    const take = Math.min(rawTake, MAX_TAKE);

    // Build WHERE clause based on status filter.
    let whereStatus: Record<string, unknown> = {};
    if (statusFilter === 'active') {
      whereStatus = { status: 'active' };
    } else if (statusFilter === 'deactivated') {
      whereStatus = { status: 'deactivated' };
    }
    // 'all' — no status filter applied.

    const [members, total] = await Promise.all([
      db.teamMember.findMany({
        where: { teamId: params.id, ...whereStatus },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
        skip,
        take,
      }),
      db.teamMember.count({
        where: { teamId: params.id, ...whereStatus },
      }),
    ]);

    return NextResponse.json({
      members: members.map((m) => ({
        memberId: m.id,
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        deactivatedAt: m.deactivatedAt ?? null,
        reactivationDeadline: m.reactivationDeadline ?? null,
      })),
      pagination: { skip, take, total },
    });
  } catch (err) {
    console.error('[teams/members/GET]', err);
    reportApiError('/api/teams/[id]/members', 500);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}

/**
 * Row #261. Producer: teams/[id]/page.tsx sends `{ userId: string }`. A missing
 * or empty `userId` keeps its own 400 ("userId is required"); a non-string used
 * to reach Prisma's `teamId_userId` lookup and throw.
 */
const removeMemberSchema = z.object({ userId: z.string().nullish() });

async function handleDELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await parseJsonBody(req, removeMemberSchema);
    const targetUserId = body.userId;
    if (!targetUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify caller is an active owner or admin (P0-E: status:'active' guard)
    const callerMembership = await db.teamMember.findFirst({
      where: { teamId: params.id, userId: session.user.id, status: 'active' },
    });
    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }

    // Fetch target membership.
    const targetMembership = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: params.id, userId: targetUserId } },
    });
    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Row #274: a non-owner may not remove an owner.
    if (isActionOnHigherAuthority(callerMembership.role, targetMembership.role)) {
      return NextResponse.json(
        { error: 'Only an owner can remove an owner', code: ROLE_ELEVATION_CODE },
        { status: 403 },
      );
    }

    // Sole-owner protection: count ACTIVE owners; refuse if this is the last one.
    // P0-I: UMAP-001 AC-6 mandates HTTP 409 (conflict) not 400 for this case.
    if (targetMembership.role === 'owner' && targetMembership.status === 'active') {
      const ownerCount = await db.teamMember.count({
        where: { teamId: params.id, role: 'owner', status: 'active' },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the sole owner of a workspace', code: 'sole_owner_protection' },
          { status: 409 },
        );
      }
    }

    // Sub-task 6 (iter 085 / TEAM-P03.7): soft-deactivate (status='removed')
    // instead of hard-delete to preserve audit trail. Parity with the
    // memberId-based DELETE handler at
    // /api/teams/:id/members/:memberId/route.ts. updateMany honors the
    // (teamId, userId) selector identical to the original deleteMany call.
    await db.teamMember.updateMany({
      where: { teamId: params.id, userId: targetUserId },
      data: {
        status: 'removed',
        deactivatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // readJsonBody throws a 400 Response for a malformed body; do not turn it into a 500.
    if (err instanceof Response) return err;
    console.error('[teams/members/DELETE]', err);
    reportApiError('/api/teams/[id]/members', 500);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}

export const GET = withApiRoute('/api/teams/[id]/members', handleGET);
export const DELETE = withApiRoute('/api/teams/[id]/members', handleDELETE);
