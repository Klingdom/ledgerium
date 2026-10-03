import { describe, expect, it } from 'vitest';
import { detectDecisions } from './detectDecisions.js';
import { inferQuestion } from './question-inference.js';
import { APPROVAL_RE, REJECTION_RE, MODAL_OPENED_EVENT } from './signals.js';
import type { DetectedDecision, RunInput, StepInput } from './types.js';

type Spec = [label: string, extra?: Partial<StepInput>];
const run = (runId: string, steps: Spec[]): RunInput => ({
  runId,
  steps: steps.map(([label, extra], i) => ({
    stepId: `${runId}-s${i + 1}`,
    normalizedLabel: label,
    routeTemplate: '/f',
    eventIds: [`${runId}-e${i + 1}`],
    ...extra,
  })),
});
const MODAL = { eventTypes: ['click', MODAL_OPENED_EVENT] };

// One golden fixture per signal.
const navigationRuns = [
  run('r1', [['open list'], ['view', { routeTemplate: '/a' }]]),
  run('r2', [['open list'], ['view', { routeTemplate: '/b' }]]),
  run('r3', [['open list'], ['view', { routeTemplate: '/a' }]]),
];
const approvalRuns = [
  run('r1', [['open request'], ['Approve request']]),
  run('r2', [['open request'], ['DECLINED request']]),
  run('r3', [['open request'], ['Approve request']]),
];
const validationRuns = [
  run('r1', [['open form'], ['fill form'], ['submit form'], ['confirmation page']]),
  run('r2', [['open form'], ['fill form'], ['submit form'], ['fill form'], ['submit form'], ['confirmation page']]),
  run('r3', [['open form'], ['fill form'], ['submit form'], ['confirmation page']]),
];
const modalRuns = [
  run('r1', [['open form'], ['submit form'], ['dismiss dialog', MODAL]]),
  run('r2', [['open form'], ['submit form'], ['confirmation page']]),
  run('r3', [['open form'], ['submit form'], ['confirmation page']]),
];

const only = (runs: RunInput[]): DetectedDecision => {
  const r = detectDecisions({ runs });
  const target = r.decisions.filter((d) => d.runsAtNode === runs.length);
  expect(target.length).toBeGreaterThan(0);
  return target[target.length - 1]!;
};

describe('signal 4: navigation', () => {
  const d = only(navigationRuns);
  it('different routes after the same prefix form a user_choice decision, inferred', () => {
    expect(d.decisionType).toBe('user_choice');
    expect(d.question).toBe('Which page does the user go to after "open list"?');
    expect(d.outcomes.map((o) => o.frequency)).toEqual([2, 1]);
    expect(d.isInferred).toBe(true);
    expect(d.confidenceScore).toBeLessThan(0.55);
  });
});

describe('signal 5: approval / rejection', () => {
  it('regexes are word-bounded and case-insensitive', () => {
    expect(APPROVAL_RE.test('APPROVE it')).toBe(true);
    expect(APPROVAL_RE.test('Approved')).toBe(true);
    expect(APPROVAL_RE.test('Approval queue')).toBe(false);
    expect(APPROVAL_RE.test('disapprove')).toBe(false);
    expect(REJECTION_RE.test('Declined')).toBe(true);
    expect(REJECTION_RE.test('disapprove')).toBe(true);
    expect(REJECTION_RE.test('predeclined')).toBe(false);
  });
  it('action-label pair -> approval_decision with inferred approval_status conditions', () => {
    const d = only(approvalRuns);
    expect(d.decisionType).toBe('approval_decision');
    expect(d.isInferred).toBe(true);
    for (const o of d.outcomes) {
      expect(o.conditions[0]!.conditionType).toBe('approval_status');
      expect(o.conditions[0]!.inferenceMethod).toBe('inferred');
    }
  });
  it('an approve label without a reject counterpart is not an approval decision', () => {
    expect(inferQuestion({ nodeLabel: 'n', outcomeLabels: ['approve a', 'send b'], conditions: [] }).decisionType)
      .toBe('unknown_inferred');
  });
});

describe('signal 6: validation', () => {
  const d = only(validationRuns);
  it('retry edge + pass outcome -> validation_result with observed validation_status', () => {
    expect(d.decisionType).toBe('validation_result');
    expect(d.prefixKeys).toHaveLength(3);
    const retry = d.outcomes.find((o) => o.label === 'fill form')!;
    const pass = d.outcomes.find((o) => o.label === 'confirmation page')!;
    expect(retry.conditions[0]!.conditionType).toBe('validation_status');
    expect(retry.conditions[0]!.description).toContain('returns to an earlier step');
    expect(pass.conditions[0]!.description).toContain('validation passed');
    expect(retry.conditions[0]!.inferenceMethod).toBe('observed');
    expect(d.isInferred).toBe(false);
  });
  it('requires a pass/fail pair: two different retry outcomes are not validation', () => {
    const runs = [
      run('r1', [['open form'], ['fill form'], ['submit form'], ['fill form']]),
      run('r2', [['open form'], ['fill form'], ['submit form'], ['open form']]),
    ];
    const r = detectDecisions({ runs }).decisions.find((x) => x.runsAtNode === 2 && x.prefixKeys.length === 3)!;
    expect(r.decisionType).not.toBe('validation_result');
  });
  it('a lone validation-word outcome no longer implies validation (#338 item 1, validation part)', () => {
    expect(inferQuestion({ nodeLabel: 'n', outcomeLabels: ['retry upload'], conditions: [] }).decisionType)
      .toBe('unknown_inferred');
    expect(inferQuestion({ nodeLabel: 'n', outcomeLabels: ['show error', 'continue'], conditions: [] }).decisionType)
      .toBe('unknown_inferred');
  });
});

describe('signal 7: error modals', () => {
  const d = only(modalRuns);
  it('modal in some outcomes only -> exception_handling, generic dialog wording, capped inferred (#339 item 4)', () => {
    expect(d.decisionType).toBe('exception_handling');
    const m = d.outcomes.find((o) => o.label === 'dismiss dialog')!;
    expect(m.conditions[0]!.description).toBe('A modal dialog opens on this path');
    expect(m.conditions[0]!.inferenceMethod).toBe('observed');
    expect(d.question).not.toMatch(/error/i);
    expect(d.isInferred).toBe(true);
    expect(d.confidenceScore).toBeLessThan(0.55);
  });
  it('without modal events upstream the signal is dormant', () => {
    const plain = modalRuns.map((r) => ({ ...r, steps: r.steps.map(({ eventTypes: _e, ...s }) => s) }));
    const x = only(plain);
    expect(x.decisionType).not.toBe('exception_handling');
  });
  it('a modal mixed inside one outcome does not create a modal condition', () => {
    const runs = [
      run('r1', [['open form'], ['submit form'], ['next', MODAL]]),
      run('r2', [['open form'], ['submit form'], ['next']]),
      run('r3', [['open form'], ['submit form'], ['other']]),
    ];
    const x = only(runs);
    expect(x.decisionType).not.toBe('exception_handling');
  });
});

describe('precedence when several signals match one branch point', () => {
  it('approval > exception: approve/reject labels with a modal on one side', () => {
    const d = only([
      run('r1', [['open'], ['approve request']]),
      run('r2', [['open'], ['reject request', MODAL]]),
    ]);
    expect(d.decisionType).toBe('approval_decision');
    // lower-precedence evidence is still attached (modal ui_state observed)
    expect(d.outcomes.some((o) => o.conditions.some((c) => c.description.includes('modal')))).toBe(true);
  });
  it('validation > exception: retry edge + modal', () => {
    const d = only([
      run('r1', [['open form'], ['submit form'], ['open form', MODAL]]),
      run('r2', [['open form'], ['submit form'], ['done']]),
    ]);
    expect(d.decisionType).toBe('validation_result');
  });
  it('exception > navigation: modal outcome and a different route', () => {
    const d = only([
      run('r1', [['open'], ['dismiss dialog', { ...MODAL, routeTemplate: '/err' }]]),
      run('r2', [['open'], ['continue', { routeTemplate: '/ok' }]]),
    ]);
    expect(d.decisionType).toBe('exception_handling');
  });
  it('navigation is last: different routes without other signals', () => {
    expect(only(navigationRuns).decisionType).toBe('user_choice');
  });
});

describe('guarantees across the new signals', () => {
  const fixtures: Record<string, RunInput[]> = {
    navigation: navigationRuns,
    approval: approvalRuns,
    validation: validationRuns,
    modal: modalRuns,
  };
  for (const [name, runs] of Object.entries(fixtures)) {
    it(`${name}: deterministic under shuffled run order`, () => {
      const a = JSON.stringify(detectDecisions({ runs }));
      const b = JSON.stringify(detectDecisions({ runs: [...runs].reverse() }));
      expect(b).toBe(a);
    });
    it(`${name}: P01 confidence contract and non-empty evidence refs`, () => {
      for (const d of detectDecisions({ runs }).decisions) {
        expect(d.isInferred).toBe(d.confidenceScore < 0.55);
        for (const o of d.outcomes) {
          expect(o.evidence.length).toBeGreaterThan(0);
          for (const ev of [...o.evidence, ...o.conditions.flatMap((c) => c.evidence)]) {
            expect(ev.stepId).not.toBe('');
            expect(ev.eventIds.length).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });
  }

  it('PII: names/emails in action labels never reach the output', () => {
    const r = detectDecisions({
      runs: [
        run('r1', [['open'], ['approve alice@example.com']]),
        run('r2', [['open'], ['reject bob@example.com', MODAL]]),
      ],
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain('alice');
    expect(json).not.toContain('bob@');
    expect(json).not.toContain(MODAL_OPENED_EVENT);
    expect(r.decisions[0]!.decisionType).toBe('approval_decision');
  });
});
