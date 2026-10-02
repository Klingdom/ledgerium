/**
 * Tests for seat-management helpers
 * (iter 082 / TEAM-P02 Part E)
 *
 * Covers:
 *   softDeactivateExcessMembers:
 *   - Returns empty array when maxSeats is MAX_SAFE_INTEGER
 *   - Returns empty array when within quota
 *   - Deactivates most-recently-joined non-owners first
 *   - Never deactivates owners
 *   - Sets deactivatedAt and reactivationDeadline (nowMs + 30 days)
 *   - Returns correct deactivatedIds
 *
 *   countActiveMembers:
 *   - Queries with status='active'
 *
 *   countPendingInvites:
 *   - Queries with acceptedAt=null, revokedAt=null, expiresAt > nowMs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks (must precede vi.mock factories) ───────────────────────────

const {
  mockTeamMemberFindMany,
  mockTeamMemberUpdateMany,
  mockTeamMemberCount,
  mockTeamInviteFindMany,
} = vi.hoisted(() => ({
  mockTeamMemberFindMany: vi.fn(),
  mockTeamMemberUpdateMany: vi.fn(),
  mockTeamMemberCount: vi.fn(),
  mockTeamInviteFindMany: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    teamMember: {
      findMany: mockTeamMemberFindMany,
      updateMany: mockTeamMemberUpdateMany,
      count: mockTeamMemberCount,
    },
    teamInvite: {
      findMany: mockTeamInviteFindMany,
    },
  },
}));

import {
  softDeactivateExcessMembers,
  countActiveMembers,
  countPendingInvites,
} from './seat-management';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW_MS = 1_700_000_000_000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ─── softDeactivateExcessMembers tests ───────────────────────────────────────

describe('softDeactivateExcessMembers', () => {
  beforeEach(() => {
    mockTeamMemberFindMany.mockResolvedValue([]);
    mockTeamMemberUpdateMany.mockResolvedValue({ count: 0 });
  });

  it('returns empty array when maxSeats is MAX_SAFE_INTEGER (unlimited)', async () => {
    const result = await softDeactivateExcessMembers('t1', Number.MAX_SAFE_INTEGER, NOW_MS);
    expect(result.deactivatedIds).toEqual([]);
    expect(mockTeamMemberFindMany).not.toHaveBeenCalled();
  });

  it('returns empty array when active count is within quota', async () => {
    mockTeamMemberFindMany.mockResolvedValue([
      { id: 'mem-1', role: 'member', joinedAt: new Date('2024-01-01') },
      { id: 'mem-2', role: 'member', joinedAt: new Date('2024-02-01') },
    ]);
    const result = await softDeactivateExcessMembers('t1', 5, NOW_MS);
    expect(result.deactivatedIds).toEqual([]);
    expect(mockTeamMemberUpdateMany).not.toHaveBeenCalled();
  });

  it('deactivates most-recently-joined non-owners first', async () => {
    // 3 non-owners, maxSeats=2 → 1 must be deactivated (most recently joined)
    mockTeamMemberFindMany.mockResolvedValue([
      { id: 'mem-old', role: 'member', joinedAt: new Date('2023-01-01') },
      { id: 'mem-mid', role: 'member', joinedAt: new Date('2023-06-01') },
      { id: 'mem-new', role: 'member', joinedAt: new Date('2024-01-01') }, // newest → deactivated
    ]);
    const result = await softDeactivateExcessMembers('t1', 2, NOW_MS);
    expect(result.deactivatedIds).toEqual(['mem-new']);
    const updateCall = mockTeamMemberUpdateMany.mock.calls[0][0];
    expect(updateCall.where.id.in).toEqual(['mem-new']);
  });

  it('never deactivates owners regardless of join order', async () => {
    // 2 non-owners + 2 owners; maxSeats=2 → both non-owners deactivated, owners protected
    mockTeamMemberFindMany.mockResolvedValue([
      { id: 'owner-1', role: 'owner', joinedAt: new Date('2022-01-01') },
      { id: 'owner-2', role: 'owner', joinedAt: new Date('2022-06-01') },
      { id: 'mem-1', role: 'member', joinedAt: new Date('2023-01-01') },
      { id: 'mem-2', role: 'member', joinedAt: new Date('2024-01-01') },
    ]);
    const result = await softDeactivateExcessMembers('t1', 2, NOW_MS);
    // Both members deactivated; owners untouched
    expect(result.deactivatedIds).toContain('mem-1');
    expect(result.deactivatedIds).toContain('mem-2');
    expect(result.deactivatedIds).not.toContain('owner-1');
    expect(result.deactivatedIds).not.toContain('owner-2');
  });

  it('stamps deactivatedAt = new Date(nowMs)', async () => {
    mockTeamMemberFindMany.mockResolvedValue([
      { id: 'mem-1', role: 'member', joinedAt: new Date('2024-01-01') },
      { id: 'mem-2', role: 'member', joinedAt: new Date('2024-02-01') },
    ]);
    await softDeactivateExcessMembers('t1', 1, NOW_MS);
    const updateCall = mockTeamMemberUpdateMany.mock.calls[0][0];
    expect(updateCall.data.deactivatedAt).toEqual(new Date(NOW_MS));
  });

  it('stamps reactivationDeadline = nowMs + 30 days', async () => {
    mockTeamMemberFindMany.mockResolvedValue([
      { id: 'mem-1', role: 'member', joinedAt: new Date('2024-01-01') },
      { id: 'mem-2', role: 'member', joinedAt: new Date('2024-02-01') },
    ]);
    await softDeactivateExcessMembers('t1', 1, NOW_MS);
    const updateCall = mockTeamMemberUpdateMany.mock.calls[0][0];
    expect(updateCall.data.reactivationDeadline).toEqual(new Date(NOW_MS + THIRTY_DAYS_MS));
  });

  it('sets status to deactivated on updated rows', async () => {
    mockTeamMemberFindMany.mockResolvedValue([
      { id: 'mem-1', role: 'admin', joinedAt: new Date('2024-01-01') },
      { id: 'mem-2', role: 'member', joinedAt: new Date('2024-06-01') },
    ]);
    await softDeactivateExcessMembers('t1', 1, NOW_MS);
    const updateCall = mockTeamMemberUpdateMany.mock.calls[0][0];
    expect(updateCall.data.status).toBe('deactivated');
  });
});

// ─── countActiveMembers tests ─────────────────────────────────────────────────

describe('countActiveMembers', () => {
  it('queries with teamId and status=active', async () => {
    mockTeamMemberCount.mockResolvedValue(3);
    const result = await countActiveMembers('t1');
    expect(result).toBe(3);
    const countCall = mockTeamMemberCount.mock.calls[0][0];
    expect(countCall.where.teamId).toBe('t1');
    expect(countCall.where.status).toBe('active');
  });
});

// ─── countPendingInvites tests ────────────────────────────────────────────────

const live = (role = 'member', invitedBy = 'u1') => ({ role, invitedBy });

describe('countPendingInvites', () => {
  beforeEach(() => {
    mockTeamInviteFindMany.mockReset();
    mockTeamMemberFindMany.mockReset();
  });

  it('queries with acceptedAt=null, revokedAt=null, and future expiresAt', async () => {
    mockTeamInviteFindMany.mockResolvedValue([live(), live()]);
    const result = await countPendingInvites('t1', NOW_MS);
    expect(result).toBe(2);
    const call = mockTeamInviteFindMany.mock.calls[0][0];
    expect(call.where.teamId).toBe('t1');
    expect(call.where.acceptedAt).toBeNull();
    expect(call.where.revokedAt).toBeNull();
    expect(call.where.expiresAt.gt).toEqual(new Date(NOW_MS));
  });

  it('returns 0 when no pending invites', async () => {
    mockTeamInviteFindMany.mockResolvedValue([]);
    expect(await countPendingInvites('t1', NOW_MS)).toBe(0);
  });

  // Row #323: refused invites do not consume a seat.
  it('does not count an out-of-set role invite', async () => {
    mockTeamInviteFindMany.mockResolvedValue([live('superadmin')]);
    expect(await countPendingInvites('t1', NOW_MS)).toBe(0);
  });

  it('does not count an owner invite whose inviter is no longer an active owner', async () => {
    mockTeamInviteFindMany.mockResolvedValue([live('owner', 'gone')]);
    mockTeamMemberFindMany.mockResolvedValue([]);
    expect(await countPendingInvites('t1', NOW_MS)).toBe(0);
  });

  it('counts an owner invite whose inviter is an active owner', async () => {
    mockTeamInviteFindMany.mockResolvedValue([live('owner', 'o1')]);
    mockTeamMemberFindMany.mockResolvedValue([{ userId: 'o1' }]);
    expect(await countPendingInvites('t1', NOW_MS)).toBe(1);
  });

  it('counts only live invites in a mix, with a single inviter lookup', async () => {
    mockTeamInviteFindMany.mockResolvedValue([
      live('member'),
      live('admin'),
      live('superadmin'),
      live('owner', 'o1'),
      live('owner', 'gone'),
    ]);
    mockTeamMemberFindMany.mockResolvedValue([{ userId: 'o1' }]);
    expect(await countPendingInvites('t1', NOW_MS)).toBe(3);
    expect(mockTeamMemberFindMany).toHaveBeenCalledTimes(1);
  });
});
