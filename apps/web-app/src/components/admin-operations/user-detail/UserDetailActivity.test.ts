/**
 * UserDetailActivity — unit tests for pure helper functions.
 *
 * Environment: Vitest (node) — no React, no DOM.
 * State-derivation pattern: imports and tests exported pure helpers directly.
 *
 * @iter 096 / ADM-002 PR-7
 */

import { describe, it, expect } from 'vitest';
import { formatLastActivity } from './UserDetailActivity.js';

// ── formatLastActivity ─────────────────────────────────────────────────────────

describe('formatLastActivity', () => {
  it('returns "—" for null', () => {
    expect(formatLastActivity(null)).toBe('—');
  });

  it('returns "—" for an invalid ISO string', () => {
    expect(formatLastActivity('not-a-date')).toBe('—');
  });

  it('returns "—" for an empty string', () => {
    expect(formatLastActivity('')).toBe('—');
  });

  it('returns a non-empty relative time string for a recent valid ISO date', () => {
    const recentDate = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    const result = formatLastActivity(recentDate);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('—');
  });

  it('returns a non-empty relative time string for an older valid ISO date', () => {
    const olderDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
    const result = formatLastActivity(olderDate);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('—');
  });

  it('returns a deterministic result for the same input called twice', () => {
    const isoString = '2024-01-15T12:00:00.000Z';
    expect(formatLastActivity(isoString)).toBe(formatLastActivity(isoString));
  });
});
