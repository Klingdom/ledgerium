/**
 * format-utils — unit tests for Admin Operations Dashboard formatters.
 *
 * Environment: Vitest (node) — pure functions, no React, no DOM.
 *
 * @iter 072
 */

import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatDuration,
  formatIsoDate,
  formatUptime,
} from './format-utils.js';

// ── formatBytes ────────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  it('returns "—" for null', () => {
    expect(formatBytes(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatBytes(undefined)).toBe('—');
  });

  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes below 1 KB', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    // 428_000_000 / 1024^2 = ~408.4 MB
    const result = formatBytes(428_000_000);
    expect(result).toMatch(/MB$/);
    expect(result).toContain('408');
  });

  it('formats gigabytes', () => {
    const result = formatBytes(1_500_000_000);
    expect(result).toMatch(/GB$/);
  });
});

// ── formatNumber ───────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('returns "—" for null', () => {
    expect(formatNumber(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatNumber(undefined)).toBe('—');
  });

  it('formats with locale separators', () => {
    expect(formatNumber(1234)).toBe('1,234');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('compact: formats thousands as k', () => {
    expect(formatNumber(1234, { compact: true })).toBe('1.2k');
  });

  it('compact: formats millions as M', () => {
    expect(formatNumber(2_500_000, { compact: true })).toBe('2.5M');
  });

  it('compact: small numbers unchanged', () => {
    expect(formatNumber(42, { compact: true })).toBe('42');
  });
});

// ── formatPercent ──────────────────────────────────────────────────────────────

describe('formatPercent', () => {
  it('returns "—" for null', () => {
    expect(formatPercent(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatPercent(undefined)).toBe('—');
  });

  it('formats with 1 decimal by default', () => {
    expect(formatPercent(67.5)).toBe('67.5%');
  });

  it('formats with 0 fractionDigits', () => {
    expect(formatPercent(67.5, { fractionDigits: 0 })).toBe('68%');
  });

  it('formats 0%', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats 100%', () => {
    expect(formatPercent(100)).toBe('100.0%');
  });
});

// ── formatRelativeTime ────────────────────────────────────────────────────────

describe('formatRelativeTime', () => {
  it('returns "—" for null', () => {
    expect(formatRelativeTime(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('—');
  });

  it('shows seconds for < 60s', () => {
    const d = new Date(Date.now() - 10_000);
    expect(formatRelativeTime(d)).toBe('10s ago');
  });

  it('shows minutes for < 60min', () => {
    const d = new Date(Date.now() - 90_000);
    expect(formatRelativeTime(d)).toBe('1m ago');
  });

  it('shows hours for < 24h', () => {
    const d = new Date(Date.now() - 7_200_000);
    expect(formatRelativeTime(d)).toBe('2h ago');
  });

  it('shows days for >= 24h', () => {
    const d = new Date(Date.now() - 86_400_000 * 2);
    expect(formatRelativeTime(d)).toBe('2d ago');
  });
});

// ── formatDuration ────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('returns "—" for null', () => {
    expect(formatDuration(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatDuration(undefined)).toBe('—');
  });

  it('formats sub-second as ms', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1400)).toBe('1.4s');
  });

  it('formats minutes + seconds', () => {
    expect(formatDuration(75_000)).toBe('1m 15s');
  });

  it('formats whole minutes', () => {
    expect(formatDuration(120_000)).toBe('2m');
  });
});

// ── formatIsoDate ─────────────────────────────────────────────────────────────

describe('formatIsoDate', () => {
  it('returns "—" for null', () => {
    expect(formatIsoDate(null)).toBe('—');
  });

  it('formats a valid ISO date', () => {
    expect(formatIsoDate('2026-05-16')).toBe('May 16');
  });

  it('returns the input string for invalid date', () => {
    expect(formatIsoDate('not-a-date')).toBe('not-a-date');
  });
});

// ── formatUptime ──────────────────────────────────────────────────────────────

describe('formatUptime', () => {
  it('returns "—" for null', () => {
    expect(formatUptime(null)).toBe('—');
  });

  it('formats hours and minutes', () => {
    expect(formatUptime(3600)).toBe('1h 0m');
  });

  it('formats days and hours', () => {
    expect(formatUptime(90_000)).toBe('1d 1h');
  });

  it('formats minutes and seconds for < 1h', () => {
    const result = formatUptime(90);
    expect(result).toBe('1m 30s');
  });
});

// ── formatCurrency ────────────────────────────────────────────────────────────

import { formatCurrency } from './format-utils.js';

describe('formatCurrency', () => {
  it('returns "—" for null', () => {
    expect(formatCurrency(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('formats zero as $0', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats integer amount', () => {
    expect(formatCurrency(49)).toBe('$49');
  });

  it('formats amount with thousands separator', () => {
    expect(formatCurrency(1249)).toBe('$1,249');
  });

  it('formats large amount', () => {
    expect(formatCurrency(10_000)).toBe('$10,000');
  });

  it('truncates fractional dollars (no decimal digits)', () => {
    // 49.99 → "$49" (maximumFractionDigits: 0 rounds via toLocaleString)
    expect(formatCurrency(49.99)).toBe('$50');
  });

  it('is deterministic: same input returns same output', () => {
    const a = formatCurrency(1249);
    const b = formatCurrency(1249);
    expect(a).toBe(b);
  });
});
