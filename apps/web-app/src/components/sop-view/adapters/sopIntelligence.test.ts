/**
 * Tests for sopIntelligence — the living-SOP alignment pill + per-step evidence
 * snippet derivations.
 *
 * The HONESTY CONTRACT is the core thing under test:
 *  - N < 2 → a neutral data-insufficiency DISCLOSURE, never a quality
 *    condemnation (even though the engine returns score 0 / 'critical' at N=0/1).
 *  - Evidence snippet is built ONLY from real captured signals; absent signals
 *    are omitted, never fabricated.
 *
 * All functions are pure + deterministic — same inputs → same output, no clock.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveAlignmentPill,
  deriveStepEvidence,
  type SopIntelligenceInput,
} from './sopIntelligence';

// ─── Fixtures ──────────────────────────────────────────────────────────────

function alignment(overrides: Partial<SopIntelligenceInput['sopAlignment'] & object> = {}) {
  return {
    alignmentScore: 0.92,
    alignmentLevel: 'high' as const,
    alignedRunCount: 18,
    totalRunCount: 20,
    driftIndicators: [],
    computedAt: '2026-06-10T00:00:00.000Z',
    ...overrides,
  };
}

function drift(overrides: Partial<SopIntelligenceInput['documentationDrift'] & object> = {}) {
  return {
    score: 8,
    level: 'aligned' as const,
    findings: ['SOP appears well-aligned with actual execution patterns.'],
    computedAt: '2026-06-10T00:00:00.000Z',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// deriveAlignmentPill — GATING (the honesty contract)
// ═══════════════════════════════════════════════════════════════════════════

describe('deriveAlignmentPill — N<2 gating (disclosure, NOT condemnation)', () => {
  it('returns an insufficient DISCLOSURE for N=0 — never a verdict', () => {
    const pill = deriveAlignmentPill({ sopAlignment: null, documentationDrift: null, runCount: 0 });
    expect(pill.kind).toBe('insufficient');
    expect(pill.hasSignal).toBe(false);
    expect(pill.alignmentPct).toBeNull();
    // Must NOT read as 'critical'/'drifting'/quality-condemnation.
    expect(pill.kind).not.toBe('drifting');
    expect(pill.label.toLowerCase()).not.toContain('critical');
  });

  it('returns the single-run disclosure for N=1 with review guidance', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ totalRunCount: 1, alignmentScore: 0, alignmentLevel: 'critical' }),
      documentationDrift: drift({ score: 100, level: 'outdated' }),
      runCount: 1,
    });
    expect(pill.kind).toBe('insufficient');
    expect(pill.hasSignal).toBe(false);
    expect(pill.runCount).toBe(1);
    expect(pill.label).toContain('1 recording');
    expect(pill.detail).toBe('Review before distributing');
    // Critically: even though the engine returned 'critical' / drift 100 at N=1,
    // we DO NOT surface a drifting/critical verdict.
    expect(pill.kind).not.toBe('drifting');
    expect(pill.alignmentPct).toBeNull();
  });

  it('treats a null sopAlignment as insufficient regardless of runCount field', () => {
    const pill = deriveAlignmentPill({ sopAlignment: null, documentationDrift: drift(), runCount: 5 });
    expect(pill.kind).toBe('insufficient');
    expect(pill.hasSignal).toBe(false);
  });

  it('uses the engine totalRunCount as authoritative when higher than cohort runCount', () => {
    // cohort runCount under-reports (1) but the alignment engine saw 4 runs.
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ totalRunCount: 4, alignmentScore: 0.9 }),
      documentationDrift: drift(),
      runCount: 1,
    });
    expect(pill.kind).toBe('aligned');
    expect(pill.runCount).toBe(4);
    expect(pill.hasSignal).toBe(true);
  });
});

describe('deriveAlignmentPill — N>=2 real signal', () => {
  it('returns an aligned pill with rounded percentage for a well-aligned SOP', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 0.923, totalRunCount: 20 }),
      documentationDrift: drift(),
      runCount: 20,
    });
    expect(pill.kind).toBe('aligned');
    expect(pill.label).toBe('Aligned');
    expect(pill.alignmentPct).toBe(92);
    expect(pill.runCount).toBe(20);
    expect(pill.hasSignal).toBe(true);
  });

  it('returns a drifting pill when drift level is significant', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 0.45, totalRunCount: 12 }),
      documentationDrift: drift({ score: 55, level: 'significant_drift' }),
      runCount: 12,
    });
    expect(pill.kind).toBe('drifting');
    expect(pill.label).toBe('Drifting');
    expect(pill.alignmentPct).toBe(45);
    expect(pill.hasSignal).toBe(true);
  });

  it('returns a drifting pill when a high-severity drift indicator exists', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({
        alignmentScore: 0.7,
        totalRunCount: 10,
        driftIndicators: [
          { severity: 'high', description: 'Step type "data_entry" appears in 90% of runs but is not documented.' },
        ],
      }),
      documentationDrift: drift({ score: 30, level: 'minor_drift' }),
      runCount: 10,
    });
    expect(pill.kind).toBe('drifting');
    expect(pill.detail).toContain('data_entry');
  });

  it('clamps an out-of-range alignmentScore deterministically', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 1.5, totalRunCount: 3 }),
      documentationDrift: drift(),
      runCount: 3,
    });
    expect(pill.alignmentPct).toBe(100);
  });

  it('is deterministic — same input yields identical output', () => {
    const input: SopIntelligenceInput = {
      sopAlignment: alignment({ totalRunCount: 6 }),
      documentationDrift: drift(),
      runCount: 6,
    };
    expect(deriveAlignmentPill(input)).toEqual(deriveAlignmentPill(input));
  });

  it('handles null/undefined input safely (insufficient, no throw)', () => {
    expect(deriveAlignmentPill(null).kind).toBe('insufficient');
    expect(deriveAlignmentPill(undefined).kind).toBe('insufficient');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deriveStepEvidence — real-signals-only (never fabricate)
// ═══════════════════════════════════════════════════════════════════════════

describe('deriveStepEvidence — real captured signals only', () => {
  it('joins app · page · action when all present', () => {
    const ev = deriveStepEvidence({
      applicationLabel: 'Salesforce',
      pageTitle: 'Opportunities',
      actionLabel: 'Save Opportunity',
    });
    expect(ev.hasEvidence).toBe(true);
    expect(ev.text).toBe('Salesforce · Opportunities · Save Opportunity');
    expect(ev.parts).toEqual(['Salesforce', 'Opportunities', 'Save Opportunity']);
  });

  it('omits absent parts (no fabrication) when only the app is known', () => {
    const ev = deriveStepEvidence({ applicationLabel: 'NetSuite', pageTitle: null, actionLabel: undefined });
    expect(ev.hasEvidence).toBe(true);
    expect(ev.text).toBe('NetSuite');
    expect(ev.parts).toEqual(['NetSuite']);
  });

  it('reports no evidence when every signal is absent — caller must omit', () => {
    const ev = deriveStepEvidence({ applicationLabel: '', pageTitle: '   ', actionLabel: null });
    expect(ev.hasEvidence).toBe(false);
    expect(ev.text).toBe('');
    expect(ev.parts).toEqual([]);
  });

  it('drops a pageTitle that merely duplicates the app label', () => {
    const ev = deriveStepEvidence({
      applicationLabel: 'Gmail',
      pageTitle: 'gmail',
      actionLabel: 'Send',
    });
    expect(ev.text).toBe('Gmail · Send');
    expect(ev.parts).toEqual(['Gmail', 'Send']);
  });

  it('trims whitespace and ignores empty-after-trim signals', () => {
    const ev = deriveStepEvidence({
      applicationLabel: '  Jira  ',
      pageTitle: '  ',
      actionLabel: ' Create Issue ',
    });
    expect(ev.text).toBe('Jira · Create Issue');
  });

  it('is deterministic for the same signals', () => {
    const signals = { applicationLabel: 'Zendesk', pageTitle: 'Tickets', actionLabel: 'Resolve' };
    expect(deriveStepEvidence(signals)).toEqual(deriveStepEvidence(signals));
  });
});
