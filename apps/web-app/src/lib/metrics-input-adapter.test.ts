/**
 * Metrics Input Adapter — tests
 *
 * iter-049 / WDC-R03 contract-prep: validates that `toMetricsInput` parses
 * `ProcessDefinition.intelligenceJson` into the typed Layer 3 slice on
 * `WorkflowMetricsInput.intelligence` and that all failure modes degrade
 * gracefully to `null` without throwing.
 *
 * Determinism contract: same input → byte-identical output.
 */

import { describe, expect, it } from 'vitest';

import { parseIntelligenceJson, toMetricsInput } from './metrics-input-adapter';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXED_CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const FIXED_LAST_VIEWED_AT = new Date('2026-04-01T00:00:00.000Z');

/**
 * Minimal valid PortfolioIntelligence-shaped blob carrying the four Layer 3
 * fields the adapter consumes. Mirrors the engine output produced by
 * apps/web-app/src/lib/intelligence.ts at line 262 (extendedIntelligence).
 */
const VALID_INTELLIGENCE = {
  processTitle: 'Test Process',
  runCount: 12,
  ruleVersion: 'rv-1',
  computedAt: '2026-04-25T00:00:00.000Z',
  variance: {
    sequenceStability: 0.83,
    stepCountVariance: { stdDev: 1.42 },
    durationVariance: { stdDevMs: 9100, coefficientOfVariation: 0.21, isHighVariance: false },
  },
  variants: {
    variantCount: 3,
    standardPath: { frequency: 0.67 },
  },
  // Extended fields produced by intelligence.ts — must be tolerated.
  standardization: { score: 0.5 },
  recommendations: [],
};

/**
 * Build a minimal Prisma-shaped workflow row carrying the supplied
 * `intelligenceJson` value. All other fields are fixed.
 */
function makeWorkflow(intelligenceJson: string | null) {
  return {
    id: 'wf-1',
    confidence: 0.8,
    stepCount: 5,
    durationMs: 120_000,
    phaseCount: 3,
    toolsUsed: JSON.stringify(['Salesforce', 'Slack']),
    createdAt: FIXED_CREATED_AT,
    lastViewedAt: FIXED_LAST_VIEWED_AT,
    processDefinition: {
      runCount: 8,
      variantCount: 2,
      avgDurationMs: 115_000,
      medianDurationMs: 110_000,
      stabilityScore: 0.8,
      confidenceScore: 0.8,
      intelligenceJson,
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('toMetricsInput: WDC-R03 intelligenceJson parsing (iter-049)', () => {
  it('null intelligenceJson → intelligence === null (no Layer 3 signal)', () => {
    const result = toMetricsInput(makeWorkflow(null), []);
    expect(result.intelligence).toBeNull();
  });

  it('valid JSON with all 4 Layer 3 fields → intelligence populated 1:1 with engine paths', () => {
    const result = toMetricsInput(makeWorkflow(JSON.stringify(VALID_INTELLIGENCE)), []);
    expect(result.intelligence).toEqual({
      sequenceStability: 0.83,
      stepCountVarianceStdDev: 1.42,
      standardPathFrequency: 0.67,
      variantCount: 3,
    });
  });

  it('malformed JSON string → intelligence === null (no throw)', () => {
    const result = toMetricsInput(makeWorkflow('{not valid json'), []);
    expect(result.intelligence).toBeNull();
  });

  it('valid JSON missing variance/variants entirely → all 4 fields null but intelligence is non-null object', () => {
    // An empty object is still a valid PortfolioIntelligence-shaped slice
    // for our schema (every consumed key is .optional()). Adapter returns a
    // typed object with all-null fields rather than null itself — this lets
    // future consumers distinguish "no intelligence cached" from "engine
    // produced an output we couldn't extract anything from".
    const result = toMetricsInput(makeWorkflow('{}'), []);
    expect(result.intelligence).toEqual({
      sequenceStability: null,
      stepCountVarianceStdDev: null,
      standardPathFrequency: null,
      variantCount: null,
    });
  });

  it('valid JSON with extra unknown fields → tolerated (passthrough), known fields populated', () => {
    const blob = {
      ...VALID_INTELLIGENCE,
      // Future engine output may add fields we do not consume. Adapter must
      // not reject these; it must tolerate forward-compatible extension.
      futureField: { someValue: 42 },
      anotherUnknownTopLevelKey: 'anything',
    };
    const result = toMetricsInput(makeWorkflow(JSON.stringify(blob)), []);
    expect(result.intelligence).toEqual({
      sequenceStability: 0.83,
      stepCountVarianceStdDev: 1.42,
      standardPathFrequency: 0.67,
      variantCount: 3,
    });
  });

  it('valid JSON with variants.standardPath === null → standardPathFrequency falls through to null', () => {
    // Engine produces standardPath: null when run count is 0 or no dominant
    // path emerges. Adapter must handle this without throwing and surface
    // null, not undefined.
    const blob = {
      variance: { sequenceStability: 0.5, stepCountVariance: { stdDev: 0.9 } },
      variants: { variantCount: 0, standardPath: null },
    };
    const result = toMetricsInput(makeWorkflow(JSON.stringify(blob)), []);
    expect(result.intelligence).toEqual({
      sequenceStability: 0.5,
      stepCountVarianceStdDev: 0.9,
      standardPathFrequency: null,
      variantCount: 0,
    });
  });

  it('determinism: same input twice → byte-identical output', () => {
    const json = JSON.stringify(VALID_INTELLIGENCE);
    const a = toMetricsInput(makeWorkflow(json), []);
    const b = toMetricsInput(makeWorkflow(json), []);
    // Deep equality + same intelligence shape is sufficient — all fields are
    // primitives; no Date / no clock-dependent values are introduced by the
    // adapter on this code path.
    expect(a.intelligence).toEqual(b.intelligence);
    expect(JSON.stringify(a.intelligence)).toBe(JSON.stringify(b.intelligence));
  });

  it('parseIntelligenceJson: empty string distinguished from null but produces same null result (no throw on either)', () => {
    expect(parseIntelligenceJson(null)).toBeNull();
    expect(parseIntelligenceJson('')).toBeNull();
    // Both return null. The distinction is that empty-string input must not
    // hit JSON.parse at all (would throw) — the early-return on '' is a
    // contract assertion.
  });
});
