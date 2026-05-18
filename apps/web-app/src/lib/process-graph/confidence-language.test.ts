/**
 * Path E — Confidence Language Taxonomy Tests (iter 079 / PATHE-P03)
 *
 * Verifies the 4-band mapping, HARD UX rule (n < 5 → 'unknown'), audit-honesty
 * IFF invariant alignment, determinism guarantee, and the 5 user-visible copy
 * strings.
 *
 * Test groups:
 *   A — 4-band boundary tests (8 minimum, 9 total)
 *   B — N<5 HARD UX rule tests (5 minimum, 5 total)
 *   C — Audit-honesty IFF invariant tests (5 minimum, 6 total)
 *   D — Determinism tests (3 minimum, 4 total)
 *   E — 5-string copy verification (5 minimum, 7 total)
 *
 * Total: 31 substantive it() blocks (well above MR-006 Change C ≥12 threshold).
 */

import { describe, expect, it } from 'vitest';

import {
  bandToColorHint,
  bandToLabel,
  confidenceToBand,
  formatLowConfidenceLabel,
  HIGH_CONFIDENCE_FLOOR,
  inferredToLabel,
  LOW_CONFIDENCE_FLOOR,
  MEDIUM_CONFIDENCE_FLOOR,
  MIN_OBSERVATIONS_FOR_HIGH,
} from './confidence-language.js';

// ── Fixtures (deterministic; no Date.now / Math.random) ──────────────────────
const N_OK = MIN_OBSERVATIONS_FOR_HIGH; // 5 — just meets the observation floor

// ── Group A: 4-band boundary tests ────────────────────────────────────────────
describe('Group A: confidenceToBand — 4-band boundary tests', () => {
  it('A1: c = HIGH_CONFIDENCE_FLOOR (0.80) with n = 5 → high (inclusive lower bound)', () => {
    expect(confidenceToBand(HIGH_CONFIDENCE_FLOOR, N_OK)).toBe('high');
  });

  it('A2: c = 0.79 with n = 5 → medium (exclusive upper bound of medium)', () => {
    expect(confidenceToBand(0.79, N_OK)).toBe('medium');
  });

  it('A3: c = MEDIUM_CONFIDENCE_FLOOR (0.55) with n = 5 → medium (inclusive)', () => {
    expect(confidenceToBand(MEDIUM_CONFIDENCE_FLOOR, N_OK)).toBe('medium');
  });

  it('A4: c = 0.54 with n = 5 → low (exclusive upper bound of low)', () => {
    expect(confidenceToBand(0.54, N_OK)).toBe('low');
  });

  it('A5: c = LOW_CONFIDENCE_FLOOR (0.30) with n = 5 → low (inclusive)', () => {
    expect(confidenceToBand(LOW_CONFIDENCE_FLOOR, N_OK)).toBe('low');
  });

  it('A6: c = 0.29 with n = 5 → unknown (below low floor)', () => {
    expect(confidenceToBand(0.29, N_OK)).toBe('unknown');
  });

  it('A7: c = 0.0 with n = 5 → unknown (minimum confidence)', () => {
    expect(confidenceToBand(0.0, N_OK)).toBe('unknown');
  });

  it('A8: c = 1.0 with n = 5 → high (maximum confidence)', () => {
    expect(confidenceToBand(1.0, N_OK)).toBe('high');
  });

  it('A9: c = 0.999 with n = 10 → high (well within high band)', () => {
    expect(confidenceToBand(0.999, 10)).toBe('high');
  });
});

// ── Group B: N<5 HARD UX rule tests ──────────────────────────────────────────
describe('Group B: confidenceToBand — N<5 HARD UX rule (architectural enforcement)', () => {
  it('B1: c = 0.99 with n = 4 → unknown (HARD RULE: n < 5 always unknown)', () => {
    expect(confidenceToBand(0.99, 4)).toBe('unknown');
  });

  it('B2: c = HIGH_CONFIDENCE_FLOOR (0.80) with n = 1 → unknown (HARD RULE)', () => {
    expect(confidenceToBand(HIGH_CONFIDENCE_FLOOR, 1)).toBe('unknown');
  });

  it('B3: c = HIGH_CONFIDENCE_FLOOR (0.80) with n = 0 → unknown (HARD RULE: zero observations)', () => {
    expect(confidenceToBand(HIGH_CONFIDENCE_FLOOR, 0)).toBe('unknown');
  });

  it('B4: c = MEDIUM_CONFIDENCE_FLOOR (0.55) with n = 4 → unknown (HARD RULE)', () => {
    expect(confidenceToBand(MEDIUM_CONFIDENCE_FLOOR, 4)).toBe('unknown');
  });

  it('B5: c = LOW_CONFIDENCE_FLOOR (0.30) with n = 2 → unknown (HARD RULE: n=2 < 5)', () => {
    expect(confidenceToBand(LOW_CONFIDENCE_FLOOR, 2)).toBe('unknown');
  });
});

// ── Group C: Audit-honesty IFF invariant tests ────────────────────────────────
describe('Group C: audit-honesty IFF invariant — confidence < 0.55 ↔ non-asserting label', () => {
  it('C1: c >= MEDIUM_CONFIDENCE_FLOOR (0.55) with n >= 5 → band is high or medium (not low/unknown)', () => {
    const highBand = confidenceToBand(0.90, N_OK);
    const medBand = confidenceToBand(0.60, N_OK);
    expect(['high', 'medium']).toContain(highBand);
    expect(['high', 'medium']).toContain(medBand);
  });

  it('C2: c < MEDIUM_CONFIDENCE_FLOOR (0.55) with n >= 5 → band is low or unknown', () => {
    const lowBand = confidenceToBand(0.45, N_OK);
    const unknownBand = confidenceToBand(0.20, N_OK);
    expect(['low', 'unknown']).toContain(lowBand);
    expect(['low', 'unknown']).toContain(unknownBand);
  });

  it('C3: IFF invariant at exact boundary 0.55 — exactly at floor is medium, not low', () => {
    expect(confidenceToBand(0.55, N_OK)).toBe('medium');
    expect(confidenceToBand(0.549, N_OK)).toBe('low');
  });

  it('C4: labels for low and unknown bands do NOT contain "Likely" or "Confident"', () => {
    const lowLabel = bandToLabel('low');
    const unknownLabel = bandToLabel('unknown');
    expect(lowLabel).not.toContain('Likely');
    expect(lowLabel).not.toContain('Confident');
    expect(unknownLabel).not.toContain('Likely');
    expect(unknownLabel).not.toContain('Confident');
  });

  it('C5: labels for high and medium bands DO contain asserting language ("Likely" / "Possible")', () => {
    const highLabel = bandToLabel('high');
    const medLabel = bandToLabel('medium');
    // High = "Likely decision" → asserting
    expect(highLabel).toContain('Likely');
    // Medium = "Possible condition" → asserting
    expect(medLabel).toContain('Possible');
  });

  it('C6: inferred label does not use "Likely" or "Confident" — honest about inference mechanism', () => {
    const inferred = inferredToLabel();
    expect(inferred).not.toContain('Likely');
    expect(inferred).not.toContain('Confident');
    expect(inferred).toContain('Inferred');
    expect(inferred).toContain('navigation');
  });
});

// ── Group D: Determinism tests ────────────────────────────────────────────────
describe('Group D: determinism — same input → byte-identical output across calls', () => {
  it('D1: confidenceToBand is deterministic across 5 calls with same input', () => {
    const results = Array.from({ length: 5 }, () => confidenceToBand(0.75, N_OK));
    const unique = new Set(results);
    expect(unique.size).toBe(1);
    expect(results[0]).toBe('medium');
  });

  it('D2: bandToLabel returns referentially identical string across calls (module constant)', () => {
    const first = bandToLabel('high');
    const second = bandToLabel('high');
    const third = bandToLabel('high');
    // Same string value — deterministic
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('D3: formatLowConfidenceLabel is deterministic for same (N, M)', () => {
    const first = formatLowConfidenceLabel(7, 22);
    const second = formatLowConfidenceLabel(7, 22);
    const third = formatLowConfidenceLabel(7, 22);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('D4: bandToColorHint is deterministic across all 4 bands', () => {
    const bands = ['high', 'medium', 'low', 'unknown'] as const;
    for (const band of bands) {
      const r1 = bandToColorHint(band);
      const r2 = bandToColorHint(band);
      expect(r1).toBe(r2);
    }
  });
});

// ── Group E: 5-string copy verification ──────────────────────────────────────
describe('Group E: 5-string copy verification — user-visible label correctness', () => {
  it('E1: bandToLabel("high") === "Likely decision"', () => {
    expect(bandToLabel('high')).toBe('Likely decision');
  });

  it('E2: bandToLabel("medium") === "Possible condition"', () => {
    expect(bandToLabel('medium')).toBe('Possible condition');
  });

  it('E3: bandToLabel("unknown") === "Needs more recordings"', () => {
    expect(bandToLabel('unknown')).toBe('Needs more recordings');
  });

  it('E4: inferredToLabel() === "Inferred from navigation behavior"', () => {
    expect(inferredToLabel()).toBe('Inferred from navigation behavior');
  });

  it('E5: formatLowConfidenceLabel(7, 22) contains "7", "22", and "runs"', () => {
    const label = formatLowConfidenceLabel(7, 22);
    expect(label).toContain('7');
    expect(label).toContain('22');
    expect(label).toContain('runs');
  });

  it('E6: formatLowConfidenceLabel guards against zero / negative inputs — safe fallback', () => {
    // Zero observations, zero total
    expect(formatLowConfidenceLabel(0, 0)).toBe('Observed in 0 of 0 runs');
    // Negative observation count clamped to 0
    expect(formatLowConfidenceLabel(-3, 10)).toBe('Observed in 0 of 10 runs');
    // Negative total count clamped to 0
    expect(formatLowConfidenceLabel(5, -1)).toBe('Observed in 5 of 0 runs');
  });

  it('E7: bandToLabel("low") returns the template string "Observed in N of M runs"', () => {
    // The template form for generic usage (callers use formatLowConfidenceLabel for real counts)
    expect(bandToLabel('low')).toBe('Observed in N of M runs');
  });

  // Color hint verification (companion to label verification)
  it('E8: bandToColorHint maps all 4 bands to the correct semantic color', () => {
    expect(bandToColorHint('high')).toBe('green');
    expect(bandToColorHint('medium')).toBe('amber');
    expect(bandToColorHint('low')).toBe('orange');
    expect(bandToColorHint('unknown')).toBe('grey');
  });
});
