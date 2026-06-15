/**
 * Tests for sopIntelligence — the living-SOP CONFORMANCE pill + per-step evidence
 * snippet derivations.
 *
 * The HONESTY CONTRACT is the core thing under test:
 *  - The headline is REAL conformance: alignedRunCount / totalRunCount (the
 *    fraction of ALL recorded runs that follow the SOP), NEVER the structural
 *    self-similarity alignmentScore dressed up as "Aligned 100%".
 *  - The reassuring green check is reserved for high adherence on a meaningful
 *    sample (>=0.9 AND N>=10) — never a green 100% on a thin/tautological cohort.
 *  - N < 2 → a neutral data-insufficiency DISCLOSURE, never a quality
 *    condemnation (even though the engine returns score 0 / 'critical' at N=0/1).
 *  - Evidence snippet is built ONLY from real captured signals; absent signals
 *    are omitted, never fabricated; captured page titles are truncated (PII).
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
    expect(pill.conformancePct).toBeNull();
    expect(pill.showCheck).toBe(false);
    // Must NOT read as 'critical'/'drifting'/quality-condemnation.
    expect(pill.kind).not.toBe('drifting');
    expect(pill.label.toLowerCase()).not.toContain('critical');
  });

  it('returns the single-run disclosure for N=1 with review guidance', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ totalRunCount: 1, alignedRunCount: 1, alignmentScore: 0, alignmentLevel: 'critical' }),
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
    expect(pill.conformancePct).toBeNull();
    expect(pill.showCheck).toBe(false);
  });

  it('treats a null sopAlignment as insufficient regardless of runCount field', () => {
    const pill = deriveAlignmentPill({ sopAlignment: null, documentationDrift: drift(), runCount: 5 });
    expect(pill.kind).toBe('insufficient');
    expect(pill.hasSignal).toBe(false);
  });

  it('uses the engine totalRunCount as authoritative when higher than cohort runCount', () => {
    // cohort runCount under-reports (1) but the alignment engine saw 4 runs.
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ totalRunCount: 4, alignedRunCount: 4, alignmentScore: 0.9 }),
      documentationDrift: drift(),
      runCount: 1,
    });
    expect(pill.hasSignal).toBe(true);
    expect(pill.runCount).toBe(4);
  });

  it('admits a real signal at exactly N=2 (the < 2 gate is exclusive)', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ totalRunCount: 2, alignedRunCount: 2, alignmentScore: 1 }),
      documentationDrift: drift(),
      runCount: 2,
    });
    expect(pill.kind).not.toBe('insufficient');
    expect(pill.hasSignal).toBe(true);
    expect(pill.runCount).toBe(2);
    expect(pill.alignedRunCount).toBe(2);
    expect(pill.conformancePct).toBe(100);
    // Even at perfect adherence, N=2 is far below the meaningful-sample floor →
    // NO reassuring green check.
    expect(pill.showCheck).toBe(false);
  });
});

describe('deriveAlignmentPill — N>=2 honest conformance', () => {
  it('leads with real conformance (aligned/total), NOT structural similarity', () => {
    // The flagship-sample shape: 16 runs across variants, only 5 follow the SOP.
    // alignmentScore (self-similarity) ~1.0 must NOT become the headline.
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 1.0, alignedRunCount: 5, totalRunCount: 16 }),
      documentationDrift: drift({ score: 0, level: 'aligned' }),
      runCount: 16,
    });
    expect(pill.conformancePct).toBe(31); // 5/16 = 31%, NOT 100%
    expect(pill.alignedRunCount).toBe(5);
    expect(pill.runCount).toBe(16);
    expect(pill.label).toBe('5 of 16 runs follow this SOP');
    expect(pill.label).not.toMatch(/aligned/i);
    // 11 of 16 deviate → this is drift, and the deviation is surfaced.
    expect(pill.kind).toBe('drifting');
    expect(pill.detail).toBeTruthy();
  });

  it('NEVER shows a green check on a tautological self-similarity 100%', () => {
    // alignmentScore 1.0 but only 5/16 actually conform. Green check is banned.
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 1.0, alignedRunCount: 5, totalRunCount: 16 }),
      documentationDrift: drift(),
      runCount: 16,
    });
    expect(pill.showCheck).toBe(false);
    expect(pill.conformancePct).not.toBe(100);
  });

  it('reserves the green check ONLY for high adherence AND a meaningful N', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 0.95, alignedRunCount: 18, totalRunCount: 20 }),
      documentationDrift: drift(),
      runCount: 20,
    });
    expect(pill.kind).toBe('aligned');
    expect(pill.conformancePct).toBe(90); // 18/20
    expect(pill.showCheck).toBe(true); // >= 0.9 AND N >= 10
  });

  it('withholds the green check when adherence is high but N is thin', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 1.0, alignedRunCount: 5, totalRunCount: 5 }),
      documentationDrift: drift(),
      runCount: 5,
    });
    expect(pill.conformancePct).toBe(100); // genuinely 5/5, but...
    expect(pill.showCheck).toBe(false); // N < 10 → no reassurance
    expect(pill.kind).toBe('aligned');
  });

  it('flags drift when most runs do not follow the SOP (adherence < 0.5)', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 0.9, alignedRunCount: 4, totalRunCount: 12 }),
      // No concrete drift finding → the deviation count is the surfaced detail.
      documentationDrift: drift({ score: 10, level: 'aligned', findings: [] }),
      runCount: 12,
    });
    // Even though the engine's drift level says 'aligned', 4/12 conformance is
    // the honest signal → drifting.
    expect(pill.kind).toBe('drifting');
    expect(pill.conformancePct).toBe(33);
    expect(pill.detail).toContain('8 deviate');
  });

  it('prefers a concrete drift finding over the bare deviation count', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 0.45, alignedRunCount: 4, totalRunCount: 12 }),
      documentationDrift: drift({
        score: 55,
        level: 'significant_drift',
        findings: ['Only 4 of 12 runs align with the SOP (less than 50%).'],
      }),
      runCount: 12,
    });
    expect(pill.kind).toBe('drifting');
    expect(pill.detail).toContain('Only 4 of 12 runs align');
  });

  it('returns a drifting pill when drift level is significant', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 0.45, alignedRunCount: 7, totalRunCount: 12 }),
      documentationDrift: drift({ score: 55, level: 'significant_drift' }),
      runCount: 12,
    });
    expect(pill.kind).toBe('drifting');
    expect(pill.conformancePct).toBe(58); // 7/12
    expect(pill.hasSignal).toBe(true);
  });

  it('returns a drifting pill when a high-severity drift indicator exists', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({
        alignmentScore: 0.7,
        alignedRunCount: 9,
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
    // High-severity drift overrides the green check even at high adherence.
    expect(pill.showCheck).toBe(false);
  });

  it('clamps a malformed alignedRunCount into [0, total] deterministically', () => {
    const pill = deriveAlignmentPill({
      sopAlignment: alignment({ alignmentScore: 1.5, alignedRunCount: 99, totalRunCount: 3 }),
      documentationDrift: drift(),
      runCount: 3,
    });
    expect(pill.alignedRunCount).toBe(3); // clamped to total
    expect(pill.conformancePct).toBe(100);
  });

  it('is deterministic — same input yields identical output', () => {
    const input: SopIntelligenceInput = {
      sopAlignment: alignment({ totalRunCount: 6, alignedRunCount: 5 }),
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

  it('truncates a long PII-bearing page title to ~40 chars + ellipsis (observed-only)', () => {
    const longTitle = 'John Smith — Invoice #INV-2024-99812 — Acme Corp Billing Portal';
    const ev = deriveStepEvidence({
      applicationLabel: 'Salesforce',
      pageTitle: longTitle,
      actionLabel: 'Save',
    });
    const pagePart = ev.parts[1]!;
    expect(pagePart.length).toBeLessThanOrEqual(41); // 40 chars + ellipsis
    expect(pagePart.endsWith('…')).toBe(true);
    // Observed-only: the truncated value is a genuine prefix of the captured
    // title — nothing is fabricated.
    expect(longTitle.startsWith(pagePart.slice(0, -1).trimEnd())).toBe(true);
  });

  it('leaves a short page title intact (no needless ellipsis)', () => {
    const ev = deriveStepEvidence({ applicationLabel: 'Jira', pageTitle: 'Board', actionLabel: null });
    expect(ev.parts).toEqual(['Jira', 'Board']);
    expect(ev.text).toBe('Jira · Board');
  });
});
