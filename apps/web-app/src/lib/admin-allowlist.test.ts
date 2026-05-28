/**
 * Unit tests for admin-allowlist helpers.
 *
 * Covers:
 *  - isAdminUnlimited: null/undefined/empty/match/no-match
 *  - canAccessAdmin: null session, undefined session, no email, valid email,
 *    non-admin email, DB isAdmin flag ignored (privilege-inversion fix)
 *
 * @iter 090 / ADM-002 PR-1
 */

import { describe, it, expect } from 'vitest';
import { isAdminUnlimited, canAccessAdmin } from './admin-allowlist';
import type { Session } from 'next-auth';

// ── isAdminUnlimited ──────────────────────────────────────────────────────────

describe('isAdminUnlimited', () => {
  it('returns false for null email', () => {
    expect(isAdminUnlimited(null)).toBe(false);
  });

  it('returns false for undefined email', () => {
    expect(isAdminUnlimited(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAdminUnlimited('')).toBe(false);
  });

  it('returns true for the allowlisted email (exact match)', () => {
    expect(isAdminUnlimited('philklingmbb@gmail.com')).toBe(true);
  });

  it('returns true for the allowlisted email (case-insensitive)', () => {
    expect(isAdminUnlimited('PHILKLINGMBB@GMAIL.COM')).toBe(true);
  });

  it('returns false for a non-allowlisted email', () => {
    expect(isAdminUnlimited('random@example.com')).toBe(false);
  });
});

// ── canAccessAdmin ─────────────────────────────────────────────────────────────

describe('canAccessAdmin', () => {
  it('returns false when session is null', () => {
    expect(canAccessAdmin(null)).toBe(false);
  });

  it('returns false when session is undefined', () => {
    expect(canAccessAdmin(undefined)).toBe(false);
  });

  it('returns false when session.user.email is missing', () => {
    // Construct a session-shaped object without email
    const session = { user: { id: 'u1', name: 'Test' } } as unknown as Session;
    expect(canAccessAdmin(session)).toBe(false);
  });

  it('returns true for an allowlisted email (privilege granted)', () => {
    const session: Session = {
      user: { id: 'u1', email: 'philklingmbb@gmail.com', name: 'Phil' },
      expires: '2099-01-01T00:00:00.000Z',
    };
    expect(canAccessAdmin(session)).toBe(true);
  });

  it('returns false for a non-allowlisted email (access denied)', () => {
    const session: Session = {
      user: { id: 'u2', email: 'random@example.com', name: 'Random' },
      expires: '2099-01-01T00:00:00.000Z',
    };
    expect(canAccessAdmin(session)).toBe(false);
  });

  it('returns true for allowlisted email even when DB isAdmin flag is false (DB flag ignored)', () => {
    // ADM-002 PR-1: DB isAdmin flag no longer gates access; only allowlist matters.
    const session = {
      user: { id: 'u1', email: 'philklingmbb@gmail.com', isAdmin: false },
      expires: '2099-01-01T00:00:00.000Z',
    } as unknown as Session;
    expect(canAccessAdmin(session)).toBe(true);
  });

  it('returns false for non-allowlisted email even when DB isAdmin flag is true (privilege-inversion fix)', () => {
    // This was the EXACT privilege inversion bug: a user promoted via
    // /api/admin/bootstrap (isAdmin: true in DB) could access destructive
    // endpoints (alerts, cleanup-events) but NOT the operations dashboard.
    // After ADM-002 PR-1, canAccessAdmin() gates ALL admin surfaces uniformly
    // and the DB flag is purely informational.
    const session = {
      user: { id: 'u3', email: 'random@example.com', isAdmin: true },
      expires: '2099-01-01T00:00:00.000Z',
    } as unknown as Session;
    expect(canAccessAdmin(session)).toBe(false);
  });
});
