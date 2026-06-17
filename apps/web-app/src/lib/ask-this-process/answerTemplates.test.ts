/**
 * Tests for answer-templates — deterministic, NO-LLM grounded answers + honest
 * refusals (Phase A).
 *
 * Under test:
 *  - the question classifier (count / shape / decision / conformance / must-not-answer)
 *  - grounded answers per class, each carrying citations ⊆ CitationSet
 *  - the citations ⊆ CitationSet INVARIANT (the load-bearing honesty test)
 *  - must-not-answer scoped-decline (ROI / compliance / headcount / prediction /
 *    intent / PII / general knowledge)
 *  - refusal / scoped-decline for unmatchable + N<2 + empty cases
 *  - determinism (same question + bundle ⇒ identical result)
 */

import { describe, it, expect } from 'vitest';

import { classifyQuestion, answerQuestion } from './answerTemplates';
import { buildAskContext } from './contextBuilder';
import { citationResolveKey, type ResolvedCitation, type CitationSet } from './types';
import {
  SAMPLE_SOP,
  SAMPLE_PROCESS_MAP,
  SAMPLE_INTEL_MULTI_RUN,
  SAMPLE_INTEL_SINGLE_RUN,
  EMPTY_SOP,
} from './__fixtures__/sampleSop';

function ctx(intel = SAMPLE_INTEL_MULTI_RUN) {
  return buildAskContext({
    sop: SAMPLE_SOP,
    processMap: SAMPLE_PROCESS_MAP,
    intelligence: intel,
  });
}

/** Assert every citation in the result is a member of the closed CitationSet. */
function assertCitationsSubsetOf(citations: ResolvedCitation[], cs: CitationSet) {
  for (const c of citations) {
    let key: string;
    if (c.kind === 'step') key = citationResolveKey.step(c.stepOrdinal!);
    else if (c.kind === 'event') key = citationResolveKey.event(c.sourceEventId!);
    else key = citationResolveKey.process();
    expect(cs.resolve.has(key)).toBe(true);
  }
}

describe('classifyQuestion — deterministic classifier', () => {
  it('routes count questions to count', () => {
    expect(classifyQuestion('How many steps are there?').klass).toBe('count');
    expect(classifyQuestion('What is the number of systems?').klass).toBe('count');
  });

  it('routes shape questions to shape', () => {
    expect(classifyQuestion('What systems does this touch?').klass).toBe('shape');
    expect(classifyQuestion('Walk me through the sequence').klass).toBe('shape');
  });

  it('routes decision questions to decision', () => {
    expect(classifyQuestion('What are the decision points?').klass).toBe('decision');
    expect(classifyQuestion('Where does the process branch?').klass).toBe('decision');
  });

  it('routes conformance questions to conformance (before count)', () => {
    expect(classifyQuestion('How aligned is this SOP with reality?').klass).toBe('conformance');
    expect(classifyQuestion('Is there drift in how many runs follow this SOP?').klass).toBe('conformance');
  });

  it('routes must-not-answer questions FIRST even when other keywords present', () => {
    // contains "automat..." and "steps" but is an ROI question → must_not_answer.
    const r = classifyQuestion('What is the ROI of automating these steps?');
    expect(r.klass).toBe('must_not_answer');
    expect(r.mustNotAnswer?.id).toBe('roi_financial');
  });

  it('classifies an unmatched free-form question as unmatched', () => {
    expect(classifyQuestion('Tell me a joke about this').klass).toBe('unmatched');
  });
});

describe('answerQuestion — COUNT (grounded)', () => {
  it('answers counts and cites the process token', () => {
    const { bundle, citationSet } = ctx();
    const r = answerQuestion('How many steps and systems are there?', bundle, citationSet);
    expect(r.kind).toBe('grounded');
    expect(r.questionClass).toBe('count');
    expect(r.answer).toContain('3 steps');
    expect(r.answer).toContain('2 systems');
    expect(r.answer).toContain('1 decision point');
    expect(r.answer).toContain('1 automation candidate');
    expect(r.citations.map((c) => c.kind)).toEqual(['process']);
    assertCitationsSubsetOf(r.citations, citationSet);
    expect(r.isAuthoritative).toBe(false);
    expect(r.bundleHash).toBe(bundle.bundleHash);
  });
});

describe('answerQuestion — SHAPE (grounded)', () => {
  it('answers the step sequence and cites the process + every step', () => {
    const { bundle, citationSet } = ctx();
    const r = answerQuestion('Walk me through the steps and systems', bundle, citationSet);
    expect(r.kind).toBe('grounded');
    expect(r.questionClass).toBe('shape');
    expect(r.answer).toContain('Salesforce, Gmail');
    expect(r.answer).toContain('1. Open Opportunities');
    expect(r.answer).toContain('3. Save Opportunity');
    const kinds = r.citations.map((c) => c.kind);
    expect(kinds).toContain('process');
    expect(r.citations.filter((c) => c.kind === 'step').map((c) => c.stepOrdinal)).toEqual([1, 2, 3]);
    assertCitationsSubsetOf(r.citations, citationSet);
  });
});

describe('answerQuestion — DECISION (grounded / honest no-evidence)', () => {
  it('answers observed decision points and cites the decision step', () => {
    const { bundle, citationSet } = ctx();
    const r = answerQuestion('What decision points exist?', bundle, citationSet);
    expect(r.kind).toBe('grounded');
    expect(r.questionClass).toBe('decision');
    expect(r.answer).toContain('Step 2');
    expect(r.answer).toContain('renewal or a new business');
    expect(r.citations.map((c) => c.stepOrdinal)).toEqual([2]);
    assertCitationsSubsetOf(r.citations, citationSet);
  });

  it('honestly refuses when the process has no observed decision points', () => {
    const noDecisionSop = {
      ...SAMPLE_SOP,
      steps: SAMPLE_SOP.steps.map((s) => {
        const { isDecisionPoint: _i, decisionLabel: _d, ...rest } = s;
        return rest;
      }),
    };
    const { bundle, citationSet } = buildAskContext({
      sop: noDecisionSop,
      processMap: SAMPLE_PROCESS_MAP,
      intelligence: SAMPLE_INTEL_MULTI_RUN,
    });
    const r = answerQuestion('What are the branches?', bundle, citationSet);
    expect(r.kind).toBe('refused');
    expect(r.refusalReason).toBe('no_relevant_evidence');
    expect(r.citations).toEqual([]);
    expect(r.answer).toContain('single linear path');
  });
});

describe('answerQuestion — CONFORMANCE (grounded / N-gated refusal)', () => {
  it('answers conformance at N>=2 and cites the process', () => {
    const { bundle, citationSet } = ctx();
    const r = answerQuestion('How conformant is this SOP?', bundle, citationSet);
    expect(r.kind).toBe('grounded');
    expect(r.questionClass).toBe('conformance');
    expect(r.answer).toContain('3 of 4 recorded runs follow this SOP (75%)');
    expect(r.answer).toContain('Drift observed');
    expect(r.citations.map((c) => c.kind)).toEqual(['process']);
    assertCitationsSubsetOf(r.citations, citationSet);
  });

  it('REFUSES conformance at N<2 with insufficient_data (honest N-gating)', () => {
    const { bundle, citationSet } = ctx(SAMPLE_INTEL_SINGLE_RUN);
    const r = answerQuestion('Does this SOP match reality?', bundle, citationSet);
    expect(r.kind).toBe('refused');
    expect(r.refusalReason).toBe('insufficient_data');
    expect(r.answer).toContain('single recording');
    expect(r.answer).toContain('2 recorded runs');
    expect(r.citations).toEqual([]);
  });
});

describe('answerQuestion — MUST-NOT-ANSWER (scoped decline, out_of_scope)', () => {
  const cases: Array<[string, string]> = [
    ['What is the ROI of automating this?', 'dollar figure'],
    ['How much money will this save?', 'dollar figure'],
    ['Is this process SOX compliant?', 'compliance'],
    ['How many people do I need to run this?', 'headcount'],
    ['Will this break next quarter?', 'forecast'],
    ['Why did the user click that?', 'intent'],
    ["What is the customer's name in step 3?", 'field values'],
    ['What is the best CRM?', 'outside what this surface'],
  ];

  it.each(cases)('declines %s (out_of_scope, no fabrication, zero citations)', (q, marker) => {
    const { bundle, citationSet } = ctx();
    const r = answerQuestion(q, bundle, citationSet);
    expect(r.kind).toBe('refused');
    expect(r.refusalReason).toBe('out_of_scope');
    expect(r.questionClass).toBe('must_not_answer');
    expect(r.citations).toEqual([]);
    expect(r.isAuthoritative).toBe(false);
    expect(r.answer.toLowerCase()).toContain(marker.toLowerCase());
  });

  it('never produces a dollar figure for an ROI question', () => {
    const { bundle, citationSet } = ctx();
    const r = answerQuestion('How much will automating step 3 save in dollars?', bundle, citationSet);
    expect(r.refused).toBe(true);
    expect(r.answer).not.toMatch(/\$\s?\d/);
  });
});

describe('answerQuestion — UNMATCHED (honest no-relevant-evidence)', () => {
  it('refuses a free-form unmatchable question and offers a reframing', () => {
    const { bundle, citationSet } = ctx();
    const r = answerQuestion('Tell me something interesting', bundle, citationSet);
    expect(r.kind).toBe('refused');
    expect(r.refusalReason).toBe('no_relevant_evidence');
    expect(r.questionClass).toBe('unmatched');
    expect(r.answer).toContain('steps, systems, decision points');
  });
});

describe('answerQuestion — EMPTY SOP', () => {
  it('refuses count on an empty SOP with insufficient_data', () => {
    const { bundle, citationSet } = buildAskContext({
      sop: EMPTY_SOP,
      processMap: null,
      intelligence: SAMPLE_INTEL_SINGLE_RUN,
    });
    const r = answerQuestion('How many steps?', bundle, citationSet);
    expect(r.kind).toBe('refused');
    expect(r.refusalReason).toBe('insufficient_data');
    expect(r.citations).toEqual([]);
  });

  it('refuses shape on an empty SOP', () => {
    const { bundle, citationSet } = buildAskContext({
      sop: EMPTY_SOP,
      processMap: null,
      intelligence: SAMPLE_INTEL_SINGLE_RUN,
    });
    const r = answerQuestion('What is the shape of this process?', bundle, citationSet);
    expect(r.kind).toBe('refused');
    expect(r.refusalReason).toBe('insufficient_data');
  });
});

describe('answerQuestion — INVARIANTS', () => {
  it('every grounded answer carries citations ⊆ CitationSet (load-bearing)', () => {
    const { bundle, citationSet } = ctx();
    const questions = [
      'how many steps?',
      'what systems are used?',
      'what are the decision points?',
      'how conformant is it?',
    ];
    for (const q of questions) {
      const r = answerQuestion(q, bundle, citationSet);
      if (r.kind === 'grounded') {
        expect(r.citations.length).toBeGreaterThan(0);
        assertCitationsSubsetOf(r.citations, citationSet);
      }
    }
  });

  it('a grounded answer always has ≥1 citation; a refusal always has 0', () => {
    const { bundle, citationSet } = ctx();
    const grounded = answerQuestion('how many steps?', bundle, citationSet);
    expect(grounded.citations.length).toBeGreaterThanOrEqual(1);
    const refused = answerQuestion('what is the ROI?', bundle, citationSet);
    expect(refused.citations).toEqual([]);
  });

  it('every result is non-authoritative and carries the bundleHash', () => {
    const { bundle, citationSet } = ctx();
    const r = answerQuestion('how many steps?', bundle, citationSet);
    expect(r.isAuthoritative).toBe(false);
    expect(r.bundleHash).toBe(bundle.bundleHash);
  });

  it('is deterministic — same question + bundle ⇒ identical result', () => {
    const { bundle, citationSet } = ctx();
    const a = answerQuestion('walk me through the steps', bundle, citationSet);
    const b = answerQuestion('walk me through the steps', bundle, citationSet);
    expect(b).toEqual(a);
  });
});
