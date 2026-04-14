import { describe, it, expect } from 'vitest';
import { computeHealthScore } from './health-scores.js';
import type { HealthScore } from './health-scores.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function allNull(): HealthScore {
  return computeHealthScore({
    stepCount: null,
    confidence: null,
    durationMs: null,
    phaseCount: null,
  });
}

// ── Overall invariants ────────────────────────────────────────────────────────

describe('computeHealthScore — invariants', () => {
  it('returns overall as sum of sub-scores', () => {
    const score = computeHealthScore({
      stepCount: 5,
      confidence: 0.8,
      durationMs: 120_000,
      phaseCount: 3,
    });
    expect(score.overall).toBe(
      score.completeness + score.confidence + score.duration + score.complexity,
    );
  });

  it('overall is bounded 0–100', () => {
    const max = computeHealthScore({
      stepCount: 100,
      confidence: 1,
      durationMs: 60_000,
      phaseCount: 5,
    });
    expect(max.overall).toBeLessThanOrEqual(100);
    expect(max.overall).toBeGreaterThanOrEqual(0);
  });

  it('all-null inputs return overall 0', () => {
    const score = allNull();
    expect(score.overall).toBe(0);
    expect(score.completeness).toBe(0);
    expect(score.confidence).toBe(0);
    expect(score.duration).toBe(0);
    expect(score.complexity).toBe(0);
  });

  it('is deterministic — same inputs produce same outputs', () => {
    const input = { stepCount: 7, confidence: 0.65, durationMs: 200_000, phaseCount: 4 };
    expect(computeHealthScore(input)).toEqual(computeHealthScore(input));
  });
});

// ── Completeness (stepCount) ──────────────────────────────────────────────────

describe('computeHealthScore — completeness sub-score', () => {
  it('returns 0 for null stepCount', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: null }).completeness).toBe(0);
  });

  it('returns 0 for 0 steps', () => {
    expect(computeHealthScore({ stepCount: 0, confidence: null, durationMs: null, phaseCount: null }).completeness).toBe(0);
  });

  it('returns 25 for stepCount >= 3', () => {
    expect(computeHealthScore({ stepCount: 3, confidence: null, durationMs: null, phaseCount: null }).completeness).toBe(25);
    expect(computeHealthScore({ stepCount: 10, confidence: null, durationMs: null, phaseCount: null }).completeness).toBe(25);
  });

  it('returns proportional score for stepCount < 3', () => {
    // 1 step → round(1/3 * 25) = round(8.33) = 8
    expect(computeHealthScore({ stepCount: 1, confidence: null, durationMs: null, phaseCount: null }).completeness).toBe(8);
    // 2 steps → round(2/3 * 25) = round(16.67) = 17
    expect(computeHealthScore({ stepCount: 2, confidence: null, durationMs: null, phaseCount: null }).completeness).toBe(17);
  });
});

// ── Confidence ────────────────────────────────────────────────────────────────

describe('computeHealthScore — confidence sub-score', () => {
  it('returns 0 for null confidence', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: null }).confidence).toBe(0);
  });

  it('returns 25 for confidence 1.0', () => {
    expect(computeHealthScore({ stepCount: null, confidence: 1, durationMs: null, phaseCount: null }).confidence).toBe(25);
  });

  it('returns 0 for confidence 0', () => {
    expect(computeHealthScore({ stepCount: null, confidence: 0, durationMs: null, phaseCount: null }).confidence).toBe(0);
  });

  it('returns ~13 for confidence 0.5', () => {
    expect(computeHealthScore({ stepCount: null, confidence: 0.5, durationMs: null, phaseCount: null }).confidence).toBe(13);
  });

  it('returns ~20 for confidence 0.8', () => {
    expect(computeHealthScore({ stepCount: null, confidence: 0.8, durationMs: null, phaseCount: null }).confidence).toBe(20);
  });

  it('clamps values above 1 to 25', () => {
    expect(computeHealthScore({ stepCount: null, confidence: 2, durationMs: null, phaseCount: null }).confidence).toBe(25);
  });

  it('clamps negative values to 0', () => {
    expect(computeHealthScore({ stepCount: null, confidence: -0.5, durationMs: null, phaseCount: null }).confidence).toBe(0);
  });
});

// ── Duration ──────────────────────────────────────────────────────────────────

describe('computeHealthScore — duration sub-score', () => {
  it('returns 0 for null duration', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: null }).duration).toBe(0);
  });

  it('returns 25 for ideal range (30s – 30min)', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: 30_000, phaseCount: null }).duration).toBe(25);
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: 300_000, phaseCount: null }).duration).toBe(25);
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: 1_800_000, phaseCount: null }).duration).toBe(25);
  });

  it('returns 5 for duration below 10s', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: 5_000, phaseCount: null }).duration).toBe(5);
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: 0, phaseCount: null }).duration).toBe(5);
  });

  it('returns 5 for duration above 60 min', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: 3_600_001, phaseCount: null }).duration).toBe(5);
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: 7_200_000, phaseCount: null }).duration).toBe(5);
  });

  it('ramps up linearly from 10s to 30s', () => {
    // At exactly 10s → floor (5), at exactly 30s → full (25)
    const at10s = computeHealthScore({ stepCount: null, confidence: null, durationMs: 10_000, phaseCount: null }).duration;
    const at20s = computeHealthScore({ stepCount: null, confidence: null, durationMs: 20_000, phaseCount: null }).duration;
    const at30s = computeHealthScore({ stepCount: null, confidence: null, durationMs: 30_000, phaseCount: null }).duration;
    expect(at10s).toBe(5);
    expect(at20s).toBeGreaterThan(at10s);
    expect(at20s).toBeLessThan(at30s);
    expect(at30s).toBe(25);
  });

  it('ramps down linearly from 30min to 60min', () => {
    const at30min = computeHealthScore({ stepCount: null, confidence: null, durationMs: 1_800_000, phaseCount: null }).duration;
    const at45min = computeHealthScore({ stepCount: null, confidence: null, durationMs: 2_700_000, phaseCount: null }).duration;
    const at60min = computeHealthScore({ stepCount: null, confidence: null, durationMs: 3_600_000, phaseCount: null }).duration;
    expect(at30min).toBe(25);
    expect(at45min).toBeGreaterThan(at60min);
    expect(at45min).toBeLessThan(at30min);
    expect(at60min).toBe(5);
  });
});

// ── Complexity (phaseCount) ───────────────────────────────────────────────────

describe('computeHealthScore — complexity sub-score', () => {
  it('returns 0 for null phaseCount', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: null }).complexity).toBe(0);
  });

  it('returns 0 for phaseCount 0', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: 0 }).complexity).toBe(0);
  });

  it('returns 10 for exactly 1 phase', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: 1 }).complexity).toBe(10);
  });

  it('returns 25 for phaseCount 2–8', () => {
    for (const p of [2, 3, 5, 8]) {
      expect(
        computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: p }).complexity,
        `phaseCount=${p}`,
      ).toBe(25);
    }
  });

  it('scales down for phaseCount > 8', () => {
    const at8 = computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: 8 }).complexity;
    const at12 = computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: 12 }).complexity;
    const at20 = computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: 20 }).complexity;
    expect(at8).toBe(25);
    expect(at12).toBeLessThan(at8);
    expect(at20).toBeLessThan(at12);
  });

  it('returns 0 for phaseCount >= 24', () => {
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: 24 }).complexity).toBe(0);
    expect(computeHealthScore({ stepCount: null, confidence: null, durationMs: null, phaseCount: 50 }).complexity).toBe(0);
  });
});

// ── Full score examples ───────────────────────────────────────────────────────

describe('computeHealthScore — known full examples', () => {
  it('perfect workflow scores 100', () => {
    const score = computeHealthScore({
      stepCount: 10,
      confidence: 1,
      durationMs: 300_000, // 5 min — well inside ideal range
      phaseCount: 4,
    });
    expect(score.overall).toBe(100);
    expect(score.completeness).toBe(25);
    expect(score.confidence).toBe(25);
    expect(score.duration).toBe(25);
    expect(score.complexity).toBe(25);
  });

  it('minimal valid workflow scores reasonably low', () => {
    const score = computeHealthScore({
      stepCount: 1,
      confidence: 0.3,
      durationMs: 5_000, // 5s — below 10s floor
      phaseCount: 1,
    });
    expect(score.overall).toBeLessThan(35);
  });
});
