/**
 * Regression lock for the additive `sopIntelligence` API field
 * (QA_SOP_P0_REVIEW P1-B).
 *
 * `extractSopIntelligence` is the pure, defensive parser that turns the persisted
 * `ProcessDefinition.intelligenceJson` blob into the small alignment+drift slice
 * the SOP conformance pill consumes. It MUST degrade to `null` on absent /
 * legacy / malformed input and surface the slice (plus an honest runCount) on
 * valid input — without ever throwing.
 */
import { describe, it, expect } from 'vitest';
import { extractSopIntelligence } from './sopIntelligenceExtract';

describe('extractSopIntelligence — additive field degradation (regression lock)', () => {
  it('returns null when processDefinition is null (legacy workflow)', () => {
    expect(extractSopIntelligence(null)).toBeNull();
  });

  it('returns null when processDefinition is undefined', () => {
    expect(extractSopIntelligence(undefined)).toBeNull();
  });

  it('returns null when intelligenceJson is null', () => {
    expect(extractSopIntelligence({ intelligenceJson: null, runCount: 5 })).toBeNull();
  });

  it('returns null when intelligenceJson is an empty string', () => {
    expect(extractSopIntelligence({ intelligenceJson: '', runCount: 5 })).toBeNull();
  });

  it('returns null on malformed JSON (never throws)', () => {
    expect(extractSopIntelligence({ intelligenceJson: '{ not json', runCount: 5 })).toBeNull();
  });

  it('returns null when neither sopAlignment nor documentationDrift is present', () => {
    const json = JSON.stringify({ variants: { variantCount: 3 }, runCount: 16 });
    expect(extractSopIntelligence({ intelligenceJson: json, runCount: 16 })).toBeNull();
  });

  it('surfaces the alignment + drift slice on valid input', () => {
    const json = JSON.stringify({
      sopAlignment: {
        alignmentScore: 1.0,
        alignmentLevel: 'high',
        alignedRunCount: 5,
        totalRunCount: 16,
        driftIndicators: [],
      },
      documentationDrift: { score: 0, level: 'aligned', findings: [] },
      runCount: 16,
    });
    const result = extractSopIntelligence({ intelligenceJson: json, runCount: 16 });
    expect(result).not.toBeNull();
    expect(result!.sopAlignment).toMatchObject({ alignedRunCount: 5, totalRunCount: 16 });
    expect(result!.documentationDrift).toMatchObject({ level: 'aligned' });
    // The honest denominator flows from the persisted runCount.
    expect(result!.runCount).toBe(16);
  });

  it('prefers the ProcessDefinition.runCount over the JSON runCount', () => {
    const json = JSON.stringify({
      sopAlignment: { alignmentScore: 0.9, alignmentLevel: 'high', alignedRunCount: 5, totalRunCount: 16 },
      documentationDrift: null,
      runCount: 999,
    });
    const result = extractSopIntelligence({ intelligenceJson: json, runCount: 16 });
    expect(result!.runCount).toBe(16);
  });

  it('surfaces drift alone when alignment is absent', () => {
    const json = JSON.stringify({
      documentationDrift: { score: 40, level: 'significant_drift', findings: ['drift'] },
      runCount: 12,
    });
    const result = extractSopIntelligence({ intelligenceJson: json, runCount: 12 });
    expect(result).not.toBeNull();
    expect(result!.sopAlignment).toBeNull();
    expect(result!.documentationDrift).toMatchObject({ level: 'significant_drift' });
  });
});
