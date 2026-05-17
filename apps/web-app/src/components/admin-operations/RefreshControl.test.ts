/**
 * RefreshControl — unit tests for pure helper functions.
 *
 * Environment: Vitest (node) — no React, no DOM.
 *
 * @iter 072
 */

import { describe, it, expect } from 'vitest';
import { parseStoredInterval, intervalToMs } from './RefreshControl.js';

// ── parseStoredInterval ───────────────────────────────────────────────────────

describe('parseStoredInterval', () => {
  it('returns "off" for null', () => {
    expect(parseStoredInterval(null)).toBe('off');
  });

  it('returns "off" for empty string', () => {
    expect(parseStoredInterval('')).toBe('off');
  });

  it('returns "off" for unknown value', () => {
    expect(parseStoredInterval('5m')).toBe('off');
  });

  it('returns "off" for numeric string', () => {
    expect(parseStoredInterval('30000')).toBe('off');
  });

  it('parses "off" correctly', () => {
    expect(parseStoredInterval('off')).toBe('off');
  });

  it('parses "30s" correctly', () => {
    expect(parseStoredInterval('30s')).toBe('30s');
  });

  it('parses "60s" correctly', () => {
    expect(parseStoredInterval('60s')).toBe('60s');
  });
});

// ── intervalToMs ─────────────────────────────────────────────────────────────

describe('intervalToMs', () => {
  it('returns null for "off"', () => {
    expect(intervalToMs('off')).toBeNull();
  });

  it('returns 30000 for "30s"', () => {
    expect(intervalToMs('30s')).toBe(30_000);
  });

  it('returns 60000 for "60s"', () => {
    expect(intervalToMs('60s')).toBe(60_000);
  });
});
