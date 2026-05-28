/**
 * UserDetailMemberships — unit tests for pure helper functions.
 *
 * Environment: Vitest (node) — no React, no DOM.
 * State-derivation pattern: imports and tests exported pure helpers directly.
 *
 * @iter 096 / ADM-002 PR-7
 */

import { describe, it, expect } from 'vitest';
import { formatRole, membershipStatusColorClass } from './UserDetailMemberships.js';

// ── formatRole ─────────────────────────────────────────────────────────────────

describe('formatRole', () => {
  it('capitalizes a lowercase role string', () => {
    expect(formatRole('member')).toBe('Member');
    expect(formatRole('owner')).toBe('Owner');
    expect(formatRole('admin')).toBe('Admin');
  });

  it('handles an already-capitalized string without double-capitalizing', () => {
    expect(formatRole('Member')).toBe('Member');
  });

  it('returns "—" for an empty string', () => {
    expect(formatRole('')).toBe('—');
  });

  it('handles single-character role strings', () => {
    expect(formatRole('a')).toBe('A');
  });
});

// ── membershipStatusColorClass ─────────────────────────────────────────────────

describe('membershipStatusColorClass', () => {
  it('returns emerald class for active status', () => {
    expect(membershipStatusColorClass('active')).toMatch(/emerald/);
  });

  it('returns amber class for invited and pending statuses', () => {
    expect(membershipStatusColorClass('invited')).toMatch(/amber/);
    expect(membershipStatusColorClass('pending')).toMatch(/amber/);
  });

  it('returns red class for removed and banned statuses', () => {
    expect(membershipStatusColorClass('removed')).toMatch(/red/);
    expect(membershipStatusColorClass('banned')).toMatch(/red/);
  });

  it('returns a fallback class string for an unknown status', () => {
    const result = membershipStatusColorClass('suspended');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
