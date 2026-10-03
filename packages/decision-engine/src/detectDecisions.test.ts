import { describe, expect, it } from 'vitest';
import { detectDecisions } from './detectDecisions.js';
import { computeConfidence, evidenceQualityTerm, labelClarityTerm, shareTerm } from './confidence.js';
import { buildTrie, stepNodeKey } from './trie.js';
import { inferQuestion } from './question-inference.js';
import { END_OUTCOME_KEY, type RunInput, type StepInput } from './types.js';

const step = (runId: string, n: number, label: string, extra: Partial<StepInput> = {}): StepInput => ({
  stepId: `${runId}-s${n}`,
  normalizedLabel: label,
  routeTemplate: '/invoices/:id',
  eventIds: [`${runId}-e${n}a`, `${runId}-e${n}b`],
  ...extra,
});

const run = (runId: string, steps: Array<[string, Partial<StepInput>?]>): RunInput => ({
  runId,
  steps: steps.map(([label, extra], i) => step(runId, i + 1, label, extra)),
});

const approveRuns: RunInput[] = [
  run('run-a', [['open invoice'], ['review invoice', { uiState: 'Amount under limit' }], ['approve invoice'], ['send receipt']]),
  run('run-b', [['open invoice'], ['review invoice', { uiState: 'Amount under limit' }], ['approve invoice'], ['send receipt']]),
  run('run-c', [['open invoice'], ['review invoice', { uiState: 'Amount over limit' }], ['reject invoice']]),
];

describe('golden: 3-run approve/reject workflow', () => {
  const result = detectDecisions({ runs: approveRuns });

  it('finds exactly one decision at the review step', () => {
    expect(result.totalRuns).toBe(3);
    expect(result.decisions).toHaveLength(1);
    const d = result.decisions[0]!;
    expect(d.nodeLabel).toBe('review invoice');
    expect(d.prefixKeys).toEqual(['open invoice|/invoices/:id', 'review invoice|/invoices/:id']);
    expect(d.decisionType).toBe('approval_decision');
    expect(d.runsAtNode).toBe(3);
  });

  it('enumerates outcomes with frequency, most frequent first', () => {
    const d = result.decisions[0]!;
    expect(d.outcomes.map((o) => [o.label, o.frequency])).toEqual([
      ['approve invoice', 2],
      ['reject invoice', 1],
    ]);
    expect(d.outcomes[0]!.frequencyPct).toBeCloseTo(2 / 3, 10);
    expect(d.outcomes[0]!.runIds).toEqual(['run-a', 'run-b']);
  });

  it('approval pair: label-derived condition only; screen state is never quoted (#339 item 2)', () => {
    const [approve, reject] = result.decisions[0]!.outcomes;
    expect(approve!.conditions).toHaveLength(1);
    expect(approve!.conditions[0]!.conditionType).toBe('approval_status');
    expect(approve!.conditions[0]!.description).toBe('Action "approve invoice" records an approval');
    expect(approve!.conditions[0]!.evidence).toEqual([
      { runId: 'run-a', stepId: 'run-a-s3', eventIds: ['run-a-e3a', 'run-a-e3b'] },
      { runId: 'run-b', stepId: 'run-b-s3', eventIds: ['run-b-e3a', 'run-b-e3b'] },
    ]);
    expect(JSON.stringify(reject)).not.toContain('Amount over limit');
    expect(approve!.evidence[0]).toEqual({ runId: 'run-a', stepId: 'run-a-s3', eventIds: ['run-a-e3a', 'run-a-e3b'] });
  });

  it('approval pair is label-only evidence => capped inferred (#339 item 2)', () => {
    const d = result.decisions[0]!;
    expect(d.confidenceTerms.consistency).toBe(0);
    expect(d.confidenceScore).toBe(0.54);
    expect(d.isInferred).toBe(true);
  });
});

describe('degenerate inputs', () => {
  it('single-run workflow yields no decisions', () => {
    const r = detectDecisions({ runs: [approveRuns[0]!] });
    expect(r.decisions).toEqual([]);
    expect(r.totalRuns).toBe(1);
  });

  it('identical runs yield no branch', () => {
    const r = detectDecisions({ runs: [approveRuns[0]!, approveRuns[1]!, { ...approveRuns[0]!, runId: 'run-z' }] });
    expect(r.decisions).toEqual([]);
  });

  it('empty input and empty-step runs are ignored', () => {
    expect(detectDecisions({ runs: [] }).decisions).toEqual([]);
    expect(detectDecisions({ runs: [{ runId: 'x', steps: [] }, approveRuns[0]!] }).totalRuns).toBe(1);
  });

  it('rejects duplicate runIds', () => {
    expect(() => detectDecisions({ runs: [approveRuns[0]!, approveRuns[0]!] })).toThrow(/duplicate runId/);
  });
});

describe('other branch shapes', () => {
  it('divergence at the first step is a root branch point (empty prefix)', () => {
    const r = detectDecisions({
      runs: [run('r1', [['create customer']]), run('r2', [['search customer']])],
    });
    expect(r.decisions).toHaveLength(1);
    expect(r.decisions[0]!.prefixKeys).toEqual([]);
    expect(r.decisions[0]!.nodeLabel).toBe('start of workflow');
    expect(r.decisions[0]!.decisionType).toBe('data_condition');
  });

  it('a run that stops at the node is an END outcome (optional step)', () => {
    const r = detectDecisions({
      runs: [run('r1', [['open invoice']]), run('r2', [['open invoice'], ['add note']])],
    });
    const d = r.decisions[0]!;
    expect(d.outcomes.map((o) => o.outcomeKey)).toContain(END_OUTCOME_KEY);
    expect(d.outcomes).toHaveLength(2);
  });

  it('signal 3: offered options produce an observed user_choice with unknown-free conditions', () => {
    const opts = ['Email', 'Slack'];
    const r = detectDecisions({
      runs: [
        run('r1', [['notify team', { offeredOptions: opts }], ['email']]),
        run('r2', [['notify team', { offeredOptions: opts }], ['slack']]),
      ],
    });
    const d = r.decisions[0]!;
    expect(d.decisionType).toBe('user_choice');
    expect(d.outcomes.every((o) => o.conditions[0]!.conditionType === 'user_input')).toBe(true);
    expect(d.isInferred).toBe(false);
  });

  it('same uiState under both outcomes is conflicting evidence, not a condition', () => {
    const r = detectDecisions({
      runs: [
        run('r1', [['review', { uiState: 'Banner' }], ['pay now']]),
        run('r2', [['review', { uiState: 'Banner' }], ['pay later']]),
      ],
    });
    const d = r.decisions[0]!;
    expect(d.confidenceTerms.conflictingEvidence).toBe(1);
    expect(d.confidenceTerms.consistency).toBe(0);
    expect(d.decisionType).toBe('unknown_inferred');
    expect(d.isInferred).toBe(true);
    expect(d.outcomes[0]!.conditions[0]!.conditionType).toBe('inferred_unknown');
  });

  it('role-based branch maps to business_rule', () => {
    const r = detectDecisions({
      runs: [
        run('r1', [['open ticket', { actorRole: 'manager' }], ['escalate']]),
        run('r2', [['open ticket', { actorRole: 'agent' }], ['resolve']]),
      ],
    });
    expect(r.decisions[0]!.decisionType).toBe('business_rule');
    expect(r.decisions[0]!.outcomes[0]!.conditions[0]!.conditionType).toBe('role_permission');
  });
});

describe('determinism', () => {
  it('shuffled run order yields byte-identical output', () => {
    const base = JSON.stringify(detectDecisions({ runs: approveRuns }));
    const perms = [[2, 0, 1], [1, 2, 0], [2, 1, 0], [0, 2, 1], [1, 0, 2]];
    for (const p of perms) {
      const shuffled = p.map((i) => approveRuns[i]!);
      expect(JSON.stringify(detectDecisions({ runs: shuffled }))).toBe(base);
    }
  });

  it('repeat calls are identical and input is not mutated', () => {
    const snapshot = JSON.stringify(approveRuns);
    const a = JSON.stringify(detectDecisions({ runs: approveRuns }));
    const b = JSON.stringify(detectDecisions({ runs: approveRuns }));
    expect(a).toBe(b);
    expect(JSON.stringify(approveRuns)).toBe(snapshot);
  });
});

describe('confidence formula boundaries', () => {
  const zero = { runs: 0, consistency: 0, evidenceQuality: 0, labelClarity: 0, conflictingEvidence: 0 };
  it('floor of the formula is 0.30', () => {
    expect(computeConfidence(zero)).toBe(0.3);
  });
  it('runs term caps at 5', () => {
    expect(computeConfidence({ ...zero, runs: 5 })).toBe(0.8);
    expect(computeConfidence({ ...zero, runs: 500 })).toBe(0.8);
    expect(computeConfidence({ ...zero, runs: 2 })).toBe(0.5);
  });
  it('clamps high to 1 and never exceeds it', () => {
    expect(computeConfidence({ runs: 9, consistency: 1, evidenceQuality: 1, labelClarity: 1, conflictingEvidence: 0 })).toBe(1);
  });
  it('clamps low to 0 on out-of-range inputs', () => {
    expect(computeConfidence({ runs: -10, consistency: -5, evidenceQuality: 0, labelClarity: 0, conflictingEvidence: 99 })).toBe(0.2);
    expect(computeConfidence({ runs: 0, consistency: 0, evidenceQuality: 0, labelClarity: 0, conflictingEvidence: 1 })).toBe(0.2);
  });
  it('conflicting evidence subtracts exactly 0.10', () => {
    const t = { ...zero, runs: 2, consistency: 1 };
    expect(computeConfidence(t) - computeConfidence({ ...t, conflictingEvidence: 1 })).toBeCloseTo(0.1, 10);
  });
  it('term helpers: evidenceQuality, labelClarity, shareTerm', () => {
    expect(evidenceQualityTerm([])).toBe(0);
    expect(
      evidenceQualityTerm([
        { runId: 'a', stepId: 's', eventIds: ['e'] },
        { runId: 'b', stepId: 's', eventIds: [] },
      ]),
    ).toBe(0.5);
    expect(labelClarityTerm([])).toBe(0);
    expect(labelClarityTerm(['approve', 'Unknown', ' '])).toBeCloseTo(1 / 3, 10);
    expect(shareTerm(1, 0)).toBe(0);
    expect(shareTerm(5, 2)).toBe(1);
  });
  it('missing event ids lower the detected confidence', () => {
    const noEvents = approveRuns.map((r) => ({ ...r, steps: r.steps.map((s) => ({ ...s, eventIds: [] })) }));
    const d = detectDecisions({ runs: noEvents }).decisions[0]!;
    expect(d.confidenceTerms.evidenceQuality).toBe(0);
    // approval pair is capped inferred (#339); raw formula still reflects the missing ids.
    expect(d.rawConfidence).toBe(0.7);
    expect(d.confidenceScore).toBe(0.54);
  });
});

describe('trie key collision safety', () => {
  it('"a|b"+"c" and "a"+"b|c" produce distinct keys', () => {
    const k1 = stepNodeKey({ normalizedLabel: 'a|b', routeTemplate: 'c' });
    const k2 = stepNodeKey({ normalizedLabel: 'a', routeTemplate: 'b|c' });
    expect(k1).not.toBe(k2);
  });
  it('backslash escaping is injective', () => {
    const k1 = stepNodeKey({ normalizedLabel: 'a\\', routeTemplate: '|b' });
    const k2 = stepNodeKey({ normalizedLabel: 'a', routeTemplate: '\\||b' });
    expect(k1).not.toBe(k2);
  });
  it('plain keys keep the label|route constant form', () => {
    expect(stepNodeKey({ normalizedLabel: 'open invoice', routeTemplate: '/x/:id' })).toBe('open invoice|/x/:id');
  });
  it('colliding-looking steps are separate trie children', () => {
    const root = buildTrie([
      { runId: 'r1', steps: [{ stepId: 's', normalizedLabel: 'a|b', routeTemplate: 'c', eventIds: [] }] },
      { runId: 'r2', steps: [{ stepId: 's', normalizedLabel: 'a', routeTemplate: 'b|c', eventIds: [] }] },
    ]);
    expect(root.children.size).toBe(2);
  });
});

describe('question inference patterns', () => {
  const none = [] as const;
  it('approval pair', () => {
    expect(inferQuestion({ nodeLabel: 'n', outcomeLabels: ['approve request', 'deny request'], conditions: none }).decisionType).toBe('approval_decision');
  });
  it('approval needs a pair, not two approvals', () => {
    expect(inferQuestion({ nodeLabel: 'n', outcomeLabels: ['approve a', 'approve b'], conditions: none }).decisionType).toBe('unknown_inferred');
  });
  it('validation outcome', () => {
    // A validation word alone never classifies (#339 item 3); the pair does (signals.test.ts).
    expect(inferQuestion({ nodeLabel: 'n', outcomeLabels: ['submit form', 'fix errors'], conditions: none }).decisionType).toBe('unknown_inferred');
  });
  it('create vs find', () => {
    expect(inferQuestion({ nodeLabel: 'n', outcomeLabels: ['create account', 'search account'], conditions: none }).decisionType).toBe('data_condition');
  });
  it('generic fallback is unknown_inferred', () => {
    expect(inferQuestion({ nodeLabel: 'n', outcomeLabels: ['alpha', 'beta'], conditions: none }).decisionType).toBe('unknown_inferred');
  });
});

describe('loop-142 review revisions', () => {
  it('trie keys are injective for escape-sensitive labels', () => {
    const k = (l: string, r: string) => stepNodeKey({ normalizedLabel: l, routeTemplate: r });
    expect(k('a${c}', 'b')).not.toBe(k('a|', 'b'));
    expect(k('a\\', '|b')).not.toBe(k('a', '\\|b'));
    expect(k('a\\|', 'b')).not.toBe(k('a\\', '|b'));
  });

  it('5 runs with no signal: confidence < 0.55 and isInferred', () => {
    const runs = ['1', '2', '3', '4', '5'].map((n, i) =>
      run(`r${n}`, [['open'], [i % 2 === 0 ? 'path x' : 'path y']]),
    );
    const d = detectDecisions({ runs }).decisions[0]!;
    expect(d.rawConfidence).toBeGreaterThanOrEqual(0.55);
    expect(d.confidenceScore).toBeLessThan(0.55);
    expect(d.isInferred).toBe(true);
  });

  it('strong signal: confidence >= 0.55 and not inferred', () => {
    const d = detectDecisions({
      runs: [
        run('run-a', [['review invoice', { uiState: 'Amount under limit' }], ['pay invoice']]),
        run('run-b', [['review invoice', { uiState: 'Amount under limit' }], ['pay invoice']]),
        run('run-c', [['review invoice', { uiState: 'Amount over limit' }], ['escalate invoice']]),
      ],
    }).decisions[0]!;
    expect(d.confidenceScore).toBeGreaterThanOrEqual(0.55);
    expect(d.isInferred).toBe(false);
  });

  it('root branch point conditions trace to step and events', () => {
    const r = detectDecisions({ runs: [run('r1', [['alpha']]), run('r2', [['beta']])] });
    const d = r.decisions[0]!;
    expect(d.prefixKeys).toEqual([]);
    for (const o of d.outcomes) for (const c of o.conditions) for (const e of c.evidence) {
      expect(e.stepId).not.toBe('');
      expect(e.eventIds.length).toBeGreaterThanOrEqual(1);
    }
  });
});
