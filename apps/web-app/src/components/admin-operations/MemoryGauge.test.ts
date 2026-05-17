/**
 * MemoryGauge — unit tests for pure helper functions.
 *
 * Environment: Vitest (node) — no React, no DOM.
 *
 * @iter 072
 */

import { describe, it, expect } from 'vitest';
import { deriveMemoryBarColor } from './MemoryGauge.js';

// ── deriveMemoryBarColor ──────────────────────────────────────────────────────

describe('deriveMemoryBarColor', () => {
  it('returns accent green at 0%', () => {
    expect(deriveMemoryBarColor(0)).toBe('bg-[var(--accent,#20f2a6)]');
  });

  it('returns accent green at exactly 60%', () => {
    expect(deriveMemoryBarColor(60)).toBe('bg-[var(--accent,#20f2a6)]');
  });

  it('returns amber at 61%', () => {
    expect(deriveMemoryBarColor(61)).toBe('bg-amber-500');
  });

  it('returns amber at exactly 80%', () => {
    expect(deriveMemoryBarColor(80)).toBe('bg-amber-500');
  });

  it('returns red at 81%', () => {
    expect(deriveMemoryBarColor(81)).toBe('bg-red-500');
  });

  it('returns red at 100%', () => {
    expect(deriveMemoryBarColor(100)).toBe('bg-red-500');
  });

  it('returns green at 50%', () => {
    expect(deriveMemoryBarColor(50)).toBe('bg-[var(--accent,#20f2a6)]');
  });

  it('returns amber at 70%', () => {
    expect(deriveMemoryBarColor(70)).toBe('bg-amber-500');
  });
});
