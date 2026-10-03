import { describe, expect, it } from 'vitest';
import { detectDecisions } from './detectDecisions.js';
import { MODAL_OPENED_EVENT } from './signals.js';
import type { DetectedDecision, RunInput, StepInput } from './types.js';

// Row #342 (MR-063 section 3): the approval cap applies after all signals combine.

type Spec = [label: string, extra?: Partial<StepInput>];
const run = (runId: string, steps: Spec[], route = '/f'): RunInput => ({
  runId,
  steps: steps.map(([label, extra], i) => ({
    stepId: `${runId}-s${i + 1}`,
    normalizedLabel: label,
    routeTemplate: route,
    eventIds: [`${runId}-e${i + 1}a`, `${runId}-e${i + 1}b`],
    ...extra,
  })),
});
const opts = { offeredOptions: ['approve', 'reject'] };
const modal = { eventTypes: [MODAL_OPENED_EVENT] };

const modalOnApprove: RunInput[] = [
  run('a', [['review'], ['approve', modal]]),
  run('b', [['review'], ['approve', modal]]),
  run('c', [['review'], ['reject']]),
  run('d', [['review'], ['reject']]),
];
const modalOnReject: RunInput[] = [
  run('a', [['review'], ['approve']]),
  run('b', [['review'], ['approve']]),
  run('c', [['review'], ['reject', modal]]),
  run('d', [['review'], ['reject', modal]]),
];
const offeredOptions: RunInput[] = [
  run('a', [['review', opts], ['approve']]),
  run('b', [['review', opts], ['approve']]),
  run('c', [['review', opts], ['reject']]),
  run('d', [['review', opts], ['reject']]),
];
const both: RunInput[] = [
  run('a', [['review', opts], ['approve', modal]]),
  run('b', [['review', opts], ['approve', modal]]),
  run('c', [['review', opts], ['reject']]),
  run('d', [['review', opts], ['reject']]),
];
const bothErrorModal: RunInput[] = both.map((r) => ({
  ...r,
  steps: r.steps.map((s) => (s.eventTypes ? { ...s, modalKind: 'error' } : s)),
}));
// approve outcome retries an earlier step (signal 6 observed) while reject passes.
const retryOnApprove: RunInput[] = [
  run('a', [['review'], ['approve'], ['review']]),
  run('b', [['review'], ['approve'], ['review']]),
  run('c', [['review'], ['reject'], ['archive']]),
  run('d', [['review'], ['reject'], ['archive']]),
];

const strongNonApproval: RunInput[] = [
  run('run-a', [['review invoice', { uiState: 'Amount under limit' }], ['pay invoice']]),
  run('run-b', [['review invoice', { uiState: 'Amount under limit' }], ['pay invoice']]),
  run('run-c', [['review invoice', { uiState: 'Amount over limit' }], ['escalate invoice']]),
];
const createVsFind: RunInput[] = [
  run('a', [['open'], ['create customer', opts]]),
  run('b', [['open'], ['search customer', opts]]),
];
const roleBased: RunInput[] = [
  run('a', [['open'], ['review', { actorRole: 'manager' }], ['sign']]),
  run('b', [['open'], ['review', { actorRole: 'manager' }], ['sign']]),
  run('c', [['open'], ['review', { actorRole: 'clerk' }], ['submit']]),
  run('d', [['open'], ['review', { actorRole: 'clerk' }], ['submit']]),
];

const only = (runs: RunInput[]): DetectedDecision => {
  const r = detectDecisions({ runs });
  expect(r.decisions).toHaveLength(1);
  return r.decisions[0]!;
};
const shuffle = <T>(xs: T[], seed: number): T[] => {
  const a = [...xs];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

describe('#342 approval decisions are inferred whatever else is observed', () => {
  it.each([
    ['modal on approve side (signal 7)', modalOnApprove],
    ['modal on reject side (symmetric)', modalOnReject],
    ['consistent offered options (signal 3)', offeredOptions],
    ['modal + offered options together', both],
    ['error-kind modal + offered options', bothErrorModal],
    ['approve outcome retries (signal 6 observed)', retryOnApprove],
  ])('%s', (_n, runs) => {
    const d = only(runs);
    expect(d.decisionType).toBe('approval_decision');
    expect(d.confidenceScore).toBeLessThan(0.55);
    expect(d.isInferred).toBe(true);
  });

  it('observed conditions stay attached as evidence but do not lift confidence', () => {
    const d = only(both);
    const kinds = d.outcomes.flatMap((o) => o.conditions.map((c) => `${c.conditionType}:${c.inferenceMethod}`));
    expect(kinds).toContain('user_input:observed');
    expect(kinds).toContain('ui_state:observed');
    expect(d.rawConfidence).toBeGreaterThanOrEqual(0.55); // uncapped formula still reported
    expect(d.confidenceScore).toBe(0.54);
  });

  it('the cap does not touch non-approval exception decisions with a declared error modal', () => {
    const runs = [
      run('a', [['go'], ['pay', { ...modal, modalKind: 'error' }]]),
      run('b', [['go'], ['pay', { ...modal, modalKind: 'error' }]]),
      run('c', [['go'], ['skip']]),
    ];
    const d = only(runs);
    expect(d.decisionType).toBe('exception_handling');
    expect(d.isInferred).toBe(false);
  });

  it.each([
    ['modal', modalOnApprove],
    ['options', offeredOptions],
    ['both', both],
  ])('shuffled run order is byte-identical (%s)', (_n, runs) => {
    const base = JSON.stringify(detectDecisions({ runs }));
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(JSON.stringify(detectDecisions({ runs: shuffle(runs, seed) }))).toBe(base);
    }
  });
});

describe('#342 restored end-to-end 0.95 breakdown on a non-approval decision', () => {
  it('state-based non-approval decision: 0.30+0.30+0.15+0.10+0.10-0 = 0.95', () => {
    const d = only(strongNonApproval);
    expect(d.decisionType).toBe('system_state');
    expect(d.confidenceTerms).toEqual({
      runs: 3, consistency: 1, evidenceQuality: 1, labelClarity: 1, conflictingEvidence: 0,
    });
    expect(d.rawConfidence).toBe(0.95);
    expect(d.confidenceScore).toBe(0.95);
    expect(d.isInferred).toBe(false);
  });
});

describe('P01 property: isInferred iff confidenceScore < 0.55', () => {
  const fixtures: RunInput[][] = [
    modalOnApprove, modalOnReject, offeredOptions, both, bothErrorModal, retryOnApprove,
    strongNonApproval, createVsFind, roleBased,
    [
      run('run-a', [['open invoice'], ['review invoice', { uiState: 'Amount under limit' }], ['approve invoice'], ['send receipt']]),
      run('run-b', [['open invoice'], ['review invoice', { uiState: 'Amount under limit' }], ['approve invoice'], ['send receipt']]),
      run('run-c', [['open invoice'], ['review invoice', { uiState: 'Amount over limit' }], ['reject invoice']]),
    ],
  ];
  it('holds for every decision of every fixture and its reversal', () => {
    let n = 0;
    for (const f of fixtures) {
      for (const runs of [f, [...f].reverse()]) {
        for (const d of detectDecisions({ runs }).decisions) {
          n++;
          expect(d.isInferred).toBe(d.confidenceScore < 0.55);
          if (d.decisionType === 'approval_decision') expect(d.isInferred).toBe(true);
        }
      }
    }
    expect(n).toBeGreaterThanOrEqual(fixtures.length);
  });

  it('holds over generated inputs with random signal mixes', () => {
    let seed = 42;
    const rnd = (k: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed >> 8) % k;
    };
    let approvals = 0;
    for (let i = 0; i < 80; i++) {
      const useModalA = rnd(2) === 1;
      const useModalR = rnd(2) === 1;
      const useOpts = rnd(2) === 1;
      const approve = rnd(2) === 1 ? 'approve' : 'pay';
      const reject = rnd(2) === 1 ? 'reject' : 'skip';
      const kind = rnd(2) === 1 ? 'error' : undefined;
      const mk = (id: string, lab: string, m: boolean): RunInput =>
        run(id, [
          ['review', useOpts ? { offeredOptions: [approve, reject] } : {}],
          [lab, m ? { ...modal, ...(kind ? { modalKind: kind } : {}) } : {}],
        ]);
      const runs = [mk('a', approve, useModalA), mk('b', approve, useModalA), mk('c', reject, useModalR), mk('d', reject, useModalR)];
      for (const d of detectDecisions({ runs }).decisions) {
        expect(d.isInferred).toBe(d.confidenceScore < 0.55);
        if (d.decisionType === 'approval_decision') {
          approvals++;
          expect(d.confidenceScore).toBeLessThan(0.55);
        }
      }
    }
    expect(approvals).toBeGreaterThan(0);
  });
});
