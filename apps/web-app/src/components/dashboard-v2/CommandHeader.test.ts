/**
 * CommandHeader — unit tests for delta rendering logic and health band.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests pure logic helpers that mirror CommandHeader.tsx behaviour.
 *
 * iter-024 §4.1 item (a): period-over-period delta display paths.
 * iter-024 §4.1 item (c): health band thresholds tightened to 60/80.
 */

import { describe, it, expect } from 'vitest';

// ── Mirrors CommandHeader.tsx healthBand ──────────────────────────────────────

function healthBand(score: number): { label: 'poor' | 'fair' | 'good'; colorClass: string } {
  if (score < 60) {
    return { label: 'poor', colorClass: 'text-red-600' };
  }
  if (score < 80) {
    return { label: 'fair', colorClass: 'text-amber-600' };
  }
  return { label: 'good', colorClass: 'text-green-600' };
}

// ── Mirrors CommandHeader.tsx delta label derivation ─────────────────────────

function buildDeltaLabel(delta: number | null): string {
  if (delta === null) return '— vs last 30d';
  if (delta === 0) return '= 0 vs last 30d';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} vs last 30d`;
}

function buildDeltaColorClass(delta: number | null): string {
  if (delta === null || delta === 0) return 'text-[var(--content-tertiary)]';
  return delta > 0 ? 'text-green-600' : 'text-red-600';
}

function buildDeltaAriaFragment(delta: number | null): string {
  if (delta === null) return ', no prior-period data';
  if (delta === 0) return ', unchanged versus last 30 days';
  if (delta > 0) return `, up ${delta} versus last 30 days`;
  return `, down ${Math.abs(delta)} versus last 30 days`;
}

// ── Tests: health band (60/80 thresholds) ────────────────────────────────────

describe('CommandHeader healthBand (iter-024 60/80 thresholds)', () => {
  it('score < 60 → poor / red', () => {
    expect(healthBand(0).label).toBe('poor');
    expect(healthBand(59).label).toBe('poor');
    expect(healthBand(0).colorClass).toBe('text-red-600');
  });

  it('score 60–79 → fair / amber', () => {
    expect(healthBand(60).label).toBe('fair');
    expect(healthBand(79).label).toBe('fair');
    expect(healthBand(60).colorClass).toBe('text-amber-600');
  });

  it('score >= 80 → good / green', () => {
    expect(healthBand(80).label).toBe('good');
    expect(healthBand(100).label).toBe('good');
    expect(healthBand(80).colorClass).toBe('text-green-600');
  });
});

// ── Tests: delta label rendering (iter-024 §4.1 item a) ─────────────────────

describe('CommandHeader delta label (iter-024 §4.1 item a)', () => {
  it('null delta renders "— vs last 30d"', () => {
    expect(buildDeltaLabel(null)).toBe('— vs last 30d');
  });

  it('delta=0 renders "= 0 vs last 30d"', () => {
    expect(buildDeltaLabel(0)).toBe('= 0 vs last 30d');
  });

  it('positive delta renders "+N vs last 30d"', () => {
    expect(buildDeltaLabel(4)).toBe('+4 vs last 30d');
    expect(buildDeltaLabel(12)).toBe('+12 vs last 30d');
  });

  it('negative delta renders "-N vs last 30d" (no double sign)', () => {
    expect(buildDeltaLabel(-4)).toBe('-4 vs last 30d');
    expect(buildDeltaLabel(-1)).toBe('-1 vs last 30d');
  });
});

// ── Tests: delta color class ─────────────────────────────────────────────────

describe('CommandHeader delta color class', () => {
  it('null delta → neutral (tertiary)', () => {
    expect(buildDeltaColorClass(null)).toBe('text-[var(--content-tertiary)]');
  });

  it('delta=0 → neutral', () => {
    expect(buildDeltaColorClass(0)).toBe('text-[var(--content-tertiary)]');
  });

  it('positive delta → green', () => {
    expect(buildDeltaColorClass(5)).toBe('text-green-600');
  });

  it('negative delta → red', () => {
    expect(buildDeltaColorClass(-5)).toBe('text-red-600');
  });
});

// ── Tests: delta aria fragment ───────────────────────────────────────────────

describe('CommandHeader delta aria fragment', () => {
  it('null → no prior-period data', () => {
    expect(buildDeltaAriaFragment(null)).toContain('no prior-period data');
  });

  it('delta=0 → unchanged versus last 30 days', () => {
    expect(buildDeltaAriaFragment(0)).toContain('unchanged');
  });

  it('positive delta → "up N versus last 30 days"', () => {
    const frag = buildDeltaAriaFragment(4);
    expect(frag).toContain('up 4 versus last 30 days');
  });

  it('negative delta → "down N versus last 30 days"', () => {
    const frag = buildDeltaAriaFragment(-4);
    expect(frag).toContain('down 4 versus last 30 days');
    // Should not say "down -4" (double negative)
    expect(frag).not.toContain('-4');
  });
});
