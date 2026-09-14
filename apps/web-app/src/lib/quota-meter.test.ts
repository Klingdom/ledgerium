/**
 * Replaces the old UsageQuotaMeter.test.tsx, which tested a hand-copied mirror
 * of the component's logic. These tests exercise the one real implementation.
 */

import { describe, it, expect } from 'vitest';
import { quotaMeterState, QUOTA_WARNING_PCT, UNCAPPED_PLAN_LABEL } from './quota-meter';
import { getPlanConfig, PLAN_HIERARCHY } from './plans';

describe('hidden when there is nothing true to say', () => {
  it('hides for unlimited plans', () => {
    expect(quotaMeterState(0, 'unlimited').show).toBe(false);
    expect(quotaMeterState(0, Number.MAX_SAFE_INTEGER).show).toBe(false);
  });

  it('hides while loading or on malformed data', () => {
    expect(quotaMeterState(undefined, undefined).show).toBe(false);
    expect(quotaMeterState(null, 5).show).toBe(false);
    expect(quotaMeterState(3, 0).show).toBe(false);
    expect(quotaMeterState(Number.NaN, 5).show).toBe(false);
  });
});

describe('thresholds', () => {
  it('is neutral with no call to action below the warning threshold', () => {
    const s = quotaMeterState(3, 5); // 60%
    expect(s.tone).toBe('neutral');
    expect(s.cta).toBeNull();
    expect(s.label).toBe('3 / 5 recordings');
  });

  it('79% is still neutral; 80% shows the prompt', () => {
    expect(quotaMeterState(79, 100).tone).toBe('neutral');
    const at80 = quotaMeterState(QUOTA_WARNING_PCT, 100);
    expect(at80.tone).toBe('attention');
    expect(at80.cta).not.toBeNull();
  });

  it('99% is attention, 100% is limit', () => {
    expect(quotaMeterState(99, 100).tone).toBe('attention');
    expect(quotaMeterState(100, 100).tone).toBe('limit');
  });

  it('clamps over-limit usage to 100%', () => {
    const s = quotaMeterState(7, 5);
    expect(s.pct).toBe(100);
    expect(s.tone).toBe('limit');
  });

  it('counts remaining with correct plurality', () => {
    expect(quotaMeterState(4, 5).detail).toMatch(/^1 recording left this month\./);
    expect(quotaMeterState(3, 5).detail).toMatch(/^2 recordings left this month\./);
  });

  it('treats negative usage as zero', () => {
    expect(quotaMeterState(-2, 5).used).toBe(0);
  });

  it('is deterministic', () => {
    expect(quotaMeterState(4, 5)).toEqual(quotaMeterState(4, 5));
  });
});

describe('copy is honest', () => {
  it('never names Team (not self-serve) and never implies data loss', () => {
    for (const used of [0, 4, 5, 9]) {
      const s = quotaMeterState(used, 5);
      expect(`${s.cta ?? ''} ${s.detail}`).not.toMatch(/Team/);
      expect(s.detail).not.toMatch(/delet|lose|lost/i);
    }
  });

  it('states at the limit that existing workflows are unaffected', () => {
    expect(quotaMeterState(5, 5).detail).toMatch(/existing workflows are unaffected/);
  });

  it(`the named plan really has no monthly cap, and is the lowest tier that doesn't`, () => {
    // Binds the CTA to plans.ts. If limits change, this fails instead of the
    // copy silently becoming false.
    const uncapped = PLAN_HIERARCHY.find(
      (p) => getPlanConfig(p).maxRecordingsPerMonth === Number.MAX_SAFE_INTEGER,
    );
    expect(uncapped).toBe(UNCAPPED_PLAN_LABEL.toLowerCase());
  });

  it('Starter is capped, so the prompt must not point at it', () => {
    expect(getPlanConfig('starter').maxRecordingsPerMonth).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(quotaMeterState(5, 5).cta).not.toMatch(/Starter/);
  });

  it('the reset claim matches the UTC calendar-month counter', () => {
    expect(quotaMeterState(1, 5).detail).toMatch(/1st \(UTC\)/);
  });
});
