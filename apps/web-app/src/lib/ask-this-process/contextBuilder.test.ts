/**
 * Tests for ask-context-builder — the deterministic grounding heart (Phase A).
 *
 * Under test (ADR-001 rule 1 + the honesty contract):
 *  - golden byte-identical bundle from a fixed SOP artifact
 *  - bundleHash determinism + reordered-input invariance + pinned-hash
 *  - CitationSet completeness (every ordinal + every sourceEventId + process)
 *  - observed-only evidence; PII-capped page titles; N<2 disclosure
 *  - no fabrication (absent ⇒ omitted/null)
 */

import { describe, it, expect } from 'vitest';

import { buildAskContext } from './contextBuilder';
import { canonicalSha256 } from './canonicalHash';
import {
  SAMPLE_SOP,
  SAMPLE_PROCESS_MAP,
  SAMPLE_INTEL_MULTI_RUN,
  SAMPLE_INTEL_SINGLE_RUN,
  EMPTY_SOP,
} from './__fixtures__/sampleSop';

/**
 * The single pinned hash for the canonical sample bundle. If this changes, the
 * canonical serializer or the bundle shape drifted — investigate before
 * updating (reproducibility / audit anchor; feasibility R-3).
 */
const PINNED_BUNDLE_HASH =
  'sha256:fd6e72d59edccb62ff357468aaa3615e7d56b68cf3b657ec05c75efda7628c07';

function buildSample() {
  return buildAskContext({
    sop: SAMPLE_SOP,
    processMap: SAMPLE_PROCESS_MAP,
    intelligence: SAMPLE_INTEL_MULTI_RUN,
  });
}

describe('buildAskContext — determinism (ADR-001 rule 1)', () => {
  it('produces a byte-identical bundle across two invocations (deep-equal)', () => {
    const a = buildSample().bundle;
    const b = buildSample().bundle;
    expect(b).toEqual(a);
  });

  it('produces a byte-identical canonical serialization across runs', () => {
    const a = canonicalSha256(buildSample().bundle as never);
    const b = canonicalSha256(buildSample().bundle as never);
    expect(a).toBe(b);
  });

  it('is invariant to input step order (reordered input ⇒ identical bundle + hash)', () => {
    const reordered = {
      ...SAMPLE_SOP,
      steps: [...SAMPLE_SOP.steps].reverse(),
    };
    const canonical = buildSample().bundle;
    const fromReversed = buildAskContext({
      sop: reordered,
      processMap: SAMPLE_PROCESS_MAP,
      intelligence: SAMPLE_INTEL_MULTI_RUN,
    }).bundle;
    expect(fromReversed).toEqual(canonical);
    expect(fromReversed.bundleHash).toBe(canonical.bundleHash);
  });

  it('does not mutate the caller artifact (steps left in original order)', () => {
    const originalFirstOrdinal = SAMPLE_SOP.steps[0]!.ordinal;
    buildSample();
    expect(SAMPLE_SOP.steps[0]!.ordinal).toBe(originalFirstOrdinal);
  });

  it('pins the exact bundleHash for the canonical sample (audit anchor)', () => {
    expect(buildSample().bundle.bundleHash).toBe(PINNED_BUNDLE_HASH);
  });

  it('excludes the bundleHash field from its own hash input', () => {
    const { bundle } = buildSample();
    const { bundleHash: _ignored, ...hashable } = bundle;
    expect(canonicalSha256(hashable as never)).toBe(bundle.bundleHash);
  });
});

describe('buildAskContext — golden bundle shape', () => {
  it('emits steps in canonical ordinal-ascending order', () => {
    const { bundle } = buildSample();
    expect(bundle.steps.map((s) => s.ordinal)).toEqual([1, 2, 3]);
  });

  it('carries the citation primitive (sourceEventId) on every instruction', () => {
    const { bundle } = buildSample();
    const allIds = bundle.steps.flatMap((s) => s.instructions.map((i) => i.sourceEventId));
    expect(allIds).toEqual(['evt_001', 'evt_002', 'evt_003', 'evt_004', 'evt_005', 'evt_006']);
  });

  it('matches a frozen snapshot of processMeta (counts + objective)', () => {
    const { bundle } = buildSample();
    expect(bundle.processMeta).toEqual({
      title: 'Log a Sales Opportunity',
      objective: 'Ensure every qualified lead becomes a tracked opportunity.',
      stepCount: 3,
      systems: ['Salesforce', 'Gmail'],
      estimatedTime: '4m 30s',
      confidence: null,
      generatedAt: '2026-06-10T14:03:00.000Z',
      decisionPointCount: 1,
      automationCandidateCount: 1,
    });
  });

  it('formats generatedAt as a stable UTC ISO string from the stored value', () => {
    const { bundle } = buildSample();
    expect(bundle.processMeta.generatedAt).toBe('2026-06-10T14:03:00.000Z');
  });
});

describe('buildAskContext — honesty (observed-only, PII cap, inferred flags)', () => {
  it('PII-caps a long page title in the evidence snippet (≤40 + ellipsis)', () => {
    const { bundle } = buildSample();
    const step3 = bundle.steps.find((s) => s.ordinal === 3)!;
    // The fixture page title is long + PII-bearing; the snippet must be truncated.
    expect(step3.evidenceSnippet).toContain('…');
    // The full PII string ("John Smith") must NOT survive in the snippet.
    expect(step3.evidenceSnippet).not.toContain('John Smith');
  });

  it('marks outcomeObserved true only when a verify instruction exists', () => {
    const { bundle } = buildSample();
    const byOrdinal = Object.fromEntries(bundle.steps.map((s) => [s.ordinal, s.outcomeObserved]));
    expect(byOrdinal[1]).toBe(false); // no verify instruction
    expect(byOrdinal[2]).toBe(false);
    expect(byOrdinal[3]).toBe(true); // evt_006 is a verify
  });

  it('derives an automationHint ONLY from a real observed friction signal', () => {
    const { bundle } = buildSample();
    const step3 = bundle.steps.find((s) => s.ordinal === 3)!;
    const step1 = bundle.steps.find((s) => s.ordinal === 1)!;
    expect(step3.automationHint).toBe('Re-entered the close date twice');
    expect(step1.automationHint).toBeNull(); // no friction ⇒ no fabricated hint
  });

  it('carries the decision point label observed-only', () => {
    const { bundle } = buildSample();
    const step2 = bundle.steps.find((s) => s.ordinal === 2)!;
    expect(step2.isDecisionPoint).toBe(true);
    expect(step2.decisionLabel).toBe('Is this a renewal or a new business opportunity?');
  });
});

describe('buildAskContext — N-gating of multi-run signals', () => {
  it('sets insufficientDataDisclosure=true at N<2 and nulls conformance', () => {
    const { bundle } = buildAskContext({
      sop: SAMPLE_SOP,
      processMap: SAMPLE_PROCESS_MAP,
      intelligence: SAMPLE_INTEL_SINGLE_RUN,
    });
    expect(bundle.signals.insufficientDataDisclosure).toBe(true);
    expect(bundle.signals.conformance).toBeNull();
    expect(bundle.signals.drift).toBeNull();
  });

  it('surfaces conformance honestly at N>=2 (aligned/total + pct)', () => {
    const { bundle } = buildSample();
    expect(bundle.signals.insufficientDataDisclosure).toBe(false);
    expect(bundle.signals.conformance).toEqual({
      alignedRunCount: 3,
      totalRunCount: 4,
      pct: 75,
    });
    expect(bundle.signals.drift).toEqual({
      level: 'minor_drift',
      findings: ['Step 2 record-type selection varies across runs'],
    });
  });

  it('treats a missing intelligence input as insufficient (no fabrication)', () => {
    const { bundle } = buildAskContext({
      sop: SAMPLE_SOP,
      processMap: SAMPLE_PROCESS_MAP,
      intelligence: null,
    });
    expect(bundle.signals.insufficientDataDisclosure).toBe(true);
    expect(bundle.signals.conformance).toBeNull();
  });
});

describe('buildAskContext — CitationSet completeness (closed universe)', () => {
  it('includes every step ordinal in the bundle', () => {
    const { citationSet } = buildSample();
    expect(citationSet.stepOrdinals).toEqual([1, 2, 3]);
  });

  it('includes every instruction sourceEventId in first-seen order', () => {
    const { citationSet } = buildSample();
    expect(citationSet.sourceEventIds).toEqual([
      'evt_001', 'evt_002', 'evt_003', 'evt_004', 'evt_005', 'evt_006',
    ]);
  });

  it('authorizes the process token for a non-empty bundle', () => {
    const { citationSet } = buildSample();
    expect(citationSet.processCitable).toBe(true);
    expect(citationSet.resolve.get('process')).toBeDefined();
  });

  it('resolves a step citation to a renderable reference', () => {
    const { citationSet } = buildSample();
    expect(citationSet.resolve.get('step::3')).toEqual({
      kind: 'step',
      stepOrdinal: 3,
      sourceEventId: null,
      recordedAt: '2026-06-10T14:03:00.000Z',
      label: 'step 3',
    });
  });

  it('resolves an event citation back to its owning step', () => {
    const { citationSet } = buildSample();
    expect(citationSet.resolve.get('event::evt_006')).toEqual({
      kind: 'event',
      stepOrdinal: 3,
      sourceEventId: 'evt_006',
      recordedAt: '2026-06-10T14:03:00.000Z',
      label: 'step 3 · Save Opportunity',
    });
  });

  it('the CitationSet exhaustively covers the bundle (no orphan ids)', () => {
    const { bundle, citationSet } = buildSample();
    const bundleOrdinals = new Set(bundle.steps.map((s) => s.ordinal));
    const bundleEvents = new Set(
      bundle.steps.flatMap((s) => s.instructions.map((i) => i.sourceEventId)),
    );
    expect(new Set(citationSet.stepOrdinals)).toEqual(bundleOrdinals);
    expect(new Set(citationSet.sourceEventIds)).toEqual(bundleEvents);
  });
});

describe('buildAskContext — empty SOP', () => {
  it('produces an empty, non-citable bundle (no process token)', () => {
    const { bundle, citationSet } = buildAskContext({
      sop: EMPTY_SOP,
      processMap: null,
      intelligence: SAMPLE_INTEL_SINGLE_RUN,
    });
    expect(bundle.steps).toEqual([]);
    expect(bundle.processMeta.stepCount).toBe(0);
    expect(citationSet.stepOrdinals).toEqual([]);
    expect(citationSet.sourceEventIds).toEqual([]);
    expect(citationSet.processCitable).toBe(false);
    expect(citationSet.resolve.get('process')).toBeUndefined();
  });
});
