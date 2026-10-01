/**
 * UserDetailIdentity — unit tests for pure helper functions.
 *
 * Environment: Vitest (node) — no React, no DOM.
 * State-derivation pattern: imports and tests exported pure helpers directly.
 *
 * @iter 096 / ADM-002 PR-7
 */

import { describe, it, expect } from 'vitest';
import {
  formatPlanLabel,
  formatSubscriptionStatus,
  statusColorClass,
  formatJoinedDate,
} from './UserDetailIdentity.js';

// ── formatPlanLabel ────────────────────────────────────────────────────────────

describe('formatPlanLabel', () => {
  it('returns correct label for known plans', () => {
    expect(formatPlanLabel('free')).toBe('Free');
    expect(formatPlanLabel('starter')).toBe('Starter');
    expect(formatPlanLabel('team')).toBe('Team');
    expect(formatPlanLabel('growth')).toBe('Growth');
    expect(formatPlanLabel('enterprise')).toBe('Enterprise');
  });

  it('returns the raw value for an unknown plan slug', () => {
    expect(formatPlanLabel('pro_legacy')).toBe('pro_legacy');
    expect(formatPlanLabel('unknown')).toBe('unknown');
  });
});

// ── formatSubscriptionStatus ───────────────────────────────────────────────────

describe('formatSubscriptionStatus', () => {
  it('returns correct labels for all known statuses', () => {
    expect(formatSubscriptionStatus('active')).toBe('Active');
    expect(formatSubscriptionStatus('trialing')).toBe('Trialing');
    expect(formatSubscriptionStatus('past_due')).toBe('Past due');
    expect(formatSubscriptionStatus('canceled')).toBe('Canceled');
    expect(formatSubscriptionStatus('unpaid')).toBe('Unpaid');
    expect(formatSubscriptionStatus('incomplete')).toBe('Incomplete');
    expect(formatSubscriptionStatus('incomplete_expired')).toBe('Expired');
  });

  it('returns the raw value for an unknown status', () => {
    expect(formatSubscriptionStatus('paused')).toBe('paused');
  });
});

// ── statusColorClass ───────────────────────────────────────────────────────────

describe('statusColorClass', () => {
  it('returns the success tone for active and trialing', () => {
    const emeraldPattern = /status-success/;  // row #236: semantic, not hue
    expect(statusColorClass('active')).toMatch(emeraldPattern);
    expect(statusColorClass('trialing')).toMatch(emeraldPattern);
  });

  it('returns the warning tone for past_due, unpaid, and incomplete', () => {
    const amberPattern = /status-warning/;  // row #236: semantic, not hue
    expect(statusColorClass('past_due')).toMatch(amberPattern);
    expect(statusColorClass('unpaid')).toMatch(amberPattern);
    expect(statusColorClass('incomplete')).toMatch(amberPattern);
  });

  it('returns the danger tone for canceled and incomplete_expired', () => {
    const redPattern = /status-danger/;  // row #236: semantic, not hue
    expect(statusColorClass('canceled')).toMatch(redPattern);
    expect(statusColorClass('incomplete_expired')).toMatch(redPattern);
  });

  it('returns a fallback class for unknown status', () => {
    const result = statusColorClass('unknown_status');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── formatJoinedDate ───────────────────────────────────────────────────────────

describe('formatJoinedDate', () => {
  it('formats a valid ISO date to a short date string', () => {
    // 2024-01-15T00:00:00.000Z → "Jan 15, 2024"
    expect(formatJoinedDate('2024-01-15T00:00:00.000Z')).toBe('Jan 15, 2024');
  });

  it('formats another valid ISO date correctly', () => {
    expect(formatJoinedDate('2023-06-01T12:00:00.000Z')).toBe('Jun 1, 2023');
  });

  it('returns the original string for an invalid date', () => {
    expect(formatJoinedDate('not-a-date')).toBe('not-a-date');
  });
});
