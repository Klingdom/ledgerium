/**
 * Tests for citation-validator — the anti-fabrication one-way gate (Phase A).
 *
 * Core invariant under test (ADR-001 Decision 2): it is impossible for a claimed
 * id outside the CitationSet to survive. Hallucinated ids are dropped; valid ids
 * are kept and resolved.
 */

import { describe, it, expect } from 'vitest';

import {
  parseClaimedCitations,
  validateCitations,
  shouldDowngradeToRefusal,
} from './citationValidator';
import { buildAskContext } from './contextBuilder';
import {
  SAMPLE_SOP,
  SAMPLE_PROCESS_MAP,
  SAMPLE_INTEL_MULTI_RUN,
} from './__fixtures__/sampleSop';

function sampleCitationSet() {
  return buildAskContext({
    sop: SAMPLE_SOP,
    processMap: SAMPLE_PROCESS_MAP,
    intelligence: SAMPLE_INTEL_MULTI_RUN,
  }).citationSet;
}

describe('parseClaimedCitations — citation grammar', () => {
  it('parses step / event / process tokens', () => {
    const parsed = parseClaimedCitations('See [[step:3]] and [[event:evt_005]] and [[process]].');
    expect(parsed).toEqual([
      { kind: 'step', ordinal: 3 },
      { kind: 'event', sourceEventId: 'evt_005' },
      { kind: 'process' },
    ]);
  });

  it('ignores malformed tokens (no false positives)', () => {
    const parsed = parseClaimedCitations('[[step:]] [[step:0]] [[event:]] [[bogus]] [[ step:1 ]]');
    expect(parsed).toEqual([]);
  });

  it('returns [] for empty / non-string input', () => {
    expect(parseClaimedCitations('')).toEqual([]);
    expect(parseClaimedCitations(undefined as never)).toEqual([]);
  });
});

describe('validateCitations — claimed ∩ authorized (anti-fabrication)', () => {
  it('keeps valid ids and DROPS hallucinated ids (the core gate)', () => {
    const cs = sampleCitationSet();
    const claimed = [
      { kind: 'step' as const, ordinal: 3 },          // valid
      { kind: 'event' as const, sourceEventId: 'evt_005' }, // valid
      { kind: 'event' as const, sourceEventId: 'evt_HALLUCINATED' }, // drop
      { kind: 'step' as const, ordinal: 99 },         // drop (out of set)
    ];
    const { valid, droppedCount } = validateCitations(claimed, cs);
    expect(valid.map((v) => `${v.kind}:${v.sourceEventId ?? v.stepOrdinal}`)).toEqual([
      'step:3',
      'event:evt_005',
    ]);
    expect(droppedCount).toBe(2);
  });

  it('is impossible for an id outside the CitationSet to survive', () => {
    const cs = sampleCitationSet();
    const { valid } = validateCitations(
      [
        { kind: 'step', ordinal: 1000 },
        { kind: 'event', sourceEventId: 'evt_does_not_exist' },
      ],
      cs,
    );
    expect(valid).toEqual([]);
  });

  it('parses + validates directly from an answer string', () => {
    const cs = sampleCitationSet();
    const { valid, droppedCount } = validateCitations(
      'Confirmed in [[step:3]] [[event:evt_006]], not [[event:evt_FAKE]].',
      cs,
    );
    expect(valid).toHaveLength(2);
    expect(droppedCount).toBe(1);
  });

  it('de-duplicates a repeated valid citation without counting a drop', () => {
    const cs = sampleCitationSet();
    const { valid, droppedCount } = validateCitations(
      [
        { kind: 'step', ordinal: 1 },
        { kind: 'step', ordinal: 1 },
      ],
      cs,
    );
    expect(valid).toHaveLength(1);
    expect(droppedCount).toBe(0);
  });

  it('resolves a surviving citation to renderable evidence', () => {
    const cs = sampleCitationSet();
    const { valid } = validateCitations([{ kind: 'event', sourceEventId: 'evt_006' }], cs);
    expect(valid[0]).toEqual({
      kind: 'event',
      stepOrdinal: 3,
      sourceEventId: 'evt_006',
      recordedAt: '2026-06-10T14:03:00.000Z',
      label: 'step 3 · Save Opportunity',
    });
  });

  it('authorizes the process token when the bundle is non-empty', () => {
    const cs = sampleCitationSet();
    const { valid } = validateCitations([{ kind: 'process' }], cs);
    expect(valid).toHaveLength(1);
    expect(valid[0]!.kind).toBe('process');
  });

  it('drops the process token when the bundle is empty (not citable)', () => {
    const cs = buildAskContext({
      sop: { ...SAMPLE_SOP, steps: [] },
      processMap: null,
      intelligence: SAMPLE_INTEL_MULTI_RUN,
    }).citationSet;
    const { valid, droppedCount } = validateCitations([{ kind: 'process' }], cs);
    expect(valid).toEqual([]);
    expect(droppedCount).toBe(1);
  });
});

describe('shouldDowngradeToRefusal — cite-or-refuse policy', () => {
  it('downgrades an affirmative answer with zero valid citations', () => {
    expect(shouldDowngradeToRefusal({ madeAffirmativeClaim: true, validCitationCount: 0 })).toBe(true);
  });

  it('does not downgrade when ≥1 valid citation survives', () => {
    expect(shouldDowngradeToRefusal({ madeAffirmativeClaim: true, validCitationCount: 1 })).toBe(false);
  });

  it('does not downgrade a non-affirmative answer', () => {
    expect(shouldDowngradeToRefusal({ madeAffirmativeClaim: false, validCitationCount: 0 })).toBe(false);
  });
});
