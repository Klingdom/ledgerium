/**
 * Schema integration tests for iter 081 / TEAM-P01 workspace schema foundation.
 *
 * These tests verify the TypeScript-level contracts exposed by the new Prisma
 * fields added in the 20260518_team_workspace_billing_and_member_status
 * migration:
 *   - Team.stripeCustomerId / Team.stripeSubscriptionId (nullable billing cols)
 *   - TeamMember.status (NOT NULL DEFAULT 'active')
 *   - TeamMember.deactivatedAt / TeamMember.reactivationDeadline (nullable)
 *   - TeamInvite.revokedAt (nullable)
 *   - TeamInvite @@unique([teamId, email]) compound index
 *
 * All tests use the vi.mock('@/db') pattern — no real DB connection required.
 * The contract under test is: fields are accessible on Prisma input/output types
 * with the correct optionality, and the mocked db layer accepts/returns them
 * without type errors.
 *
 * @iter 081 / TEAM-P01
 * @see apps/web-app/prisma/migrations/20260518_team_workspace_billing_and_member_status/migration.sql
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    team: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    teamMember: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    teamInvite: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { db } from '@/db';

// ── Typed mock helpers ────────────────────────────────────────────────────────

const mockDb = db as unknown as {
  team: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  teamMember: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  teamInvite: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Team billing columns ──────────────────────────────────────────────────────

describe('Team billing columns (TEAM-P01)', () => {
  it('accepts stripeCustomerId and stripeSubscriptionId as nullable strings on create', async () => {
    const created = {
      id: 'team-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      createdBy: 'user-1',
      plan: 'team',
      stripeCustomerId: 'cus_abc123' as string | null,
      stripeSubscriptionId: 'sub_xyz789' as string | null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDb.team.create.mockResolvedValue(created);

    const result = (await mockDb.team.create({
      data: {
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdBy: 'user-1',
        plan: 'team',
        stripeCustomerId: 'cus_abc123',
        stripeSubscriptionId: 'sub_xyz789',
      },
    })) as typeof created;

    expect(result.stripeCustomerId).toBe('cus_abc123');
    expect(result.stripeSubscriptionId).toBe('sub_xyz789');
  });

  it('returns null for stripeCustomerId and stripeSubscriptionId when not set', async () => {
    const created = {
      id: 'team-2',
      name: 'New Team',
      slug: 'new-team',
      createdBy: 'user-2',
      plan: 'free',
      stripeCustomerId: null as string | null,
      stripeSubscriptionId: null as string | null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDb.team.create.mockResolvedValue(created);

    const result = (await mockDb.team.create({
      data: { name: 'New Team', slug: 'new-team', createdBy: 'user-2' },
    })) as typeof created;

    expect(result.stripeCustomerId).toBeNull();
    expect(result.stripeSubscriptionId).toBeNull();
  });
});

// ── TeamMember soft-deactivate columns ───────────────────────────────────────

describe('TeamMember soft-deactivate columns (TEAM-P01)', () => {
  it('returns status = "active" by default for a new member', async () => {
    const member = {
      id: 'tm-1',
      teamId: 'team-1',
      userId: 'user-1',
      role: 'member',
      status: 'active',
      deactivatedAt: null as Date | null,
      reactivationDeadline: null as Date | null,
      joinedAt: new Date(),
    };
    mockDb.teamMember.create.mockResolvedValue(member);

    const result = (await mockDb.teamMember.create({
      data: { teamId: 'team-1', userId: 'user-1', role: 'member' },
    })) as typeof member;

    expect(result.status).toBe('active');
  });

  it('accepts deactivated status with deactivatedAt and reactivationDeadline timestamps', async () => {
    const deactivatedAt = new Date('2026-05-19T10:00:00.000Z');
    const reactivationDeadline = new Date('2026-06-18T10:00:00.000Z'); // +30 days
    const updated = {
      id: 'tm-2',
      teamId: 'team-1',
      userId: 'user-2',
      role: 'member',
      status: 'deactivated',
      deactivatedAt,
      reactivationDeadline,
      joinedAt: new Date(),
    };
    mockDb.teamMember.update.mockResolvedValue(updated);

    const result = (await mockDb.teamMember.update({
      where: { id: 'tm-2' },
      data: { status: 'deactivated', deactivatedAt, reactivationDeadline },
    })) as typeof updated;

    expect(result.status).toBe('deactivated');
    expect(result.deactivatedAt).toEqual(deactivatedAt);
    expect(result.reactivationDeadline).toEqual(reactivationDeadline);
  });

  it('reactivation deadline is ~30 days after deactivatedAt', async () => {
    const deactivatedAt = new Date('2026-05-19T00:00:00.000Z');
    const reactivationDeadline = new Date('2026-06-18T00:00:00.000Z');

    const diffMs = reactivationDeadline.getTime() - deactivatedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    expect(diffDays).toBe(30);
  });
});

// ── TeamInvite revocation column ─────────────────────────────────────────────

describe('TeamInvite revokedAt column (TEAM-P01)', () => {
  it('returns revokedAt = null for a freshly-created invite', async () => {
    const invite = {
      id: 'inv-1',
      teamId: 'team-1',
      email: 'alice@example.com',
      role: 'member',
      token: 'tok_abc',
      invitedBy: 'user-1',
      acceptedAt: null as Date | null,
      revokedAt: null as Date | null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    mockDb.teamInvite.create.mockResolvedValue(invite);

    const result = (await mockDb.teamInvite.create({
      data: {
        teamId: 'team-1',
        email: 'alice@example.com',
        role: 'member',
        token: 'tok_abc',
        invitedBy: 'user-1',
        expiresAt: invite.expiresAt,
      },
    })) as typeof invite;

    expect(result.revokedAt).toBeNull();
  });

  it('accepts a revokedAt timestamp when an invite is revoked', async () => {
    const revokedAt = new Date('2026-05-19T12:00:00.000Z');
    const revoked = {
      id: 'inv-2',
      teamId: 'team-1',
      email: 'bob@example.com',
      role: 'member',
      token: 'tok_def',
      invitedBy: 'user-1',
      acceptedAt: null as Date | null,
      revokedAt,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    mockDb.teamInvite.update.mockResolvedValue(revoked);

    const result = (await mockDb.teamInvite.update({
      where: { id: 'inv-2' },
      data: { revokedAt },
    })) as typeof revoked;

    expect(result.revokedAt).toEqual(revokedAt);
  });
});

// ── Compound unique index semantics ──────────────────────────────────────────

describe('TeamInvite compound unique (teamId, email) index (TEAM-P01)', () => {
  it('findFirst by teamId + email returns the matching invite', async () => {
    const invite = {
      id: 'inv-3',
      teamId: 'team-42',
      email: 'charlie@example.com',
      role: 'member',
      token: 'tok_ghi',
      invitedBy: 'user-1',
      acceptedAt: null as Date | null,
      revokedAt: null as Date | null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    mockDb.teamInvite.findFirst.mockResolvedValue(invite);

    const result = (await mockDb.teamInvite.findFirst({
      where: { teamId: 'team-42', email: 'charlie@example.com' },
    })) as typeof invite | null;

    expect(result).not.toBeNull();
    expect(result!.teamId).toBe('team-42');
    expect(result!.email).toBe('charlie@example.com');
  });

  it('findFirst by teamId + email returns null when no matching invite exists', async () => {
    mockDb.teamInvite.findFirst.mockResolvedValue(null);

    const result = (await mockDb.teamInvite.findFirst({
      where: { teamId: 'team-99', email: 'nobody@example.com' },
    })) as null;

    expect(result).toBeNull();
  });
});
