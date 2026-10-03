import { describe, expect, it } from 'vitest';
import { detectDecisions } from './detectDecisions.js';
import { sha256Hex } from './text-safety.js';
import { stepNodeKey } from './trie.js';
import type { RunInput, StepInput } from './types.js';

// Loop 144, row #331 items 2, 3, 7, 8, 9 (engine-boundary hardening).

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
  run('run-a', [['open invoice'], ['review invoice', { uiState: 'Amount under limit' }], ['approve invoice']]),
  run('run-b', [['open invoice'], ['review invoice', { uiState: 'Amount under limit' }], ['approve invoice']]),
  run('run-c', [['open invoice'], ['review invoice', { uiState: 'Amount over limit' }], ['reject invoice']]),
];

const stateRuns: RunInput[] = [
  run('run-a', [['open invoice'], ['review invoice', { uiState: 'Amount under limit' }], ['pay invoice']]),
  run('run-b', [['open invoice'], ['review invoice', { uiState: 'Amount under limit' }], ['pay invoice']]),
  run('run-c', [['open invoice'], ['review invoice', { uiState: 'Amount over limit' }], ['escalate invoice']]),
];

describe('(7) free-text-only differences', () => {
  it('uiState differing only by a person name is inferred and not quoted', () => {
    const r = detectDecisions({
      runs: [
        run('r1', [['search customer', { uiState: 'Welcome back, Jane Doe' }], ['create customer']]),
        run('r2', [['search customer', { uiState: 'Welcome back, Bob Lee' }], ['open existing customer']]),
      ],
    });
    const d = r.decisions[0]!;
    expect(d.isInferred).toBe(true);
    expect(d.confidenceScore).toBeLessThan(0.55);
    expect(d.outcomes.every((o) => o.conditions.every((c) => c.inferenceMethod === 'inferred'))).toBe(true);
    expect(JSON.stringify(d)).not.toMatch(/Jane|Bob/);
  });

  it('numeric uiState differences are free text; structural ones stay observed', () => {
    const free = detectDecisions({
      runs: [
        run('r1', [['review', { uiState: 'Total 1200' }], ['approve']]),
        run('r2', [['review', { uiState: 'Total 80' }], ['reject']]),
      ],
    }).decisions[0]!;
    expect(free.isInferred).toBe(true);
    // (#339: approval pairs are label-derived and always inferred, so the
    // "structural stays observed" half uses a non-approval fixture.)
    expect(detectDecisions({ runs: stateRuns }).decisions[0]!.isInferred).toBe(false);
  });

  it('Title Case modal titles are structural, not names', () => {
    const d = detectDecisions({
      runs: [
        run('r1', [['review', { uiState: 'Confirm Delete' }], ['save draft']]),
        run('r2', [['review', { uiState: 'Edit Details' }], ['discard draft']]),
      ],
    }).decisions[0]!;
    expect(d.isInferred).toBe(false);
  });

  it('outcomes differing only in label digits are no decision; mixed ones are forced inferred', () => {
    expect(
      detectDecisions({ runs: [run('r1', [['open invoice 4521']]), run('r2', [['open invoice 4522']])] }).decisions,
    ).toEqual([]);
    const mixed = detectDecisions({
      runs: [
        run('r1', [['open', { uiState: 'Draft banner' }], ['view order 11']]),
        run('r2', [['open', { uiState: 'Sent banner' }], ['view order 12']]),
        run('r3', [['open', { uiState: 'Closed banner' }], ['export report']]),
      ],
    }).decisions[0]!;
    expect(mixed.isInferred).toBe(true);
    expect(mixed.confidenceScore).toBeLessThan(0.55);
  });

  it('free-text offered options never produce an observed user_choice', () => {
    const opts = ['Email jane', 'Slack 42'];
    const d = detectDecisions({
      runs: [
        run('r1', [['notify team', { offeredOptions: opts }], ['email jane']]),
        run('r2', [['notify team', { offeredOptions: opts }], ['slack 42']]),
      ],
    }).decisions[0]!;
    expect(d.isInferred).toBe(true);
  });
});

describe('(8) PII boundary', () => {
  it('emails and policy-sensitive text never reach any output field', () => {
    const r = detectDecisions({
      runs: [
        run('r1', [['open jane.doe@acme.com profile', { uiState: 'Sent to jane.doe@acme.com', actorRole: 'bob@x.io' }], ['create']]),
        run('r2', [['open other@acme.com profile', { uiState: 'Sent to other@acme.com' }], ['find existing']]),
        run('r3', [['open reset token page'], ['create']]),
      ],
    });
    expect(r.decisions.length).toBeGreaterThan(0);
    const all = JSON.stringify(r);
    expect(all).not.toMatch(/@acme|@x\.io|jane\.doe|other@/);
    expect(all).not.toMatch(/reset token/);
  });

  it('an un-templated email route is stripped from keys and ids', () => {
    const r = detectDecisions({
      runs: [
        { runId: 'a', steps: [{ ...step('a', 1, 'search'), routeTemplate: '/customers/jane.doe@acme.com' }, step('a', 2, 'create')] },
        { runId: 'b', steps: [{ ...step('b', 1, 'search'), routeTemplate: '/customers/jane.doe@acme.com' }, step('b', 2, 'find')] },
      ],
    });
    expect(r.decisions.length).toBe(1);
    expect(JSON.stringify(r)).not.toMatch(/jane\.doe|acme/);
  });

  it('does not mutate its input', () => {
    const runs = [run('r1', [['open a@b.co'], ['x']]), run('r2', [['open a@b.co'], ['y']])];
    const before = JSON.stringify(runs);
    detectDecisions({ runs });
    expect(JSON.stringify(runs)).toBe(before);
  });
});

describe('(9) unicode normalization', () => {
  it('NFC and NFD "cafe" do not create a false branch', () => {
    const nfc = 'café order';
    const nfd = 'café order';
    expect(nfc).not.toBe(nfd);
    expect(detectDecisions({ runs: [run('r1', [[nfc], ['ship']]), run('r2', [[nfd], ['ship']])] }).decisions).toEqual([]);
    expect(stepNodeKey({ normalizedLabel: nfc, routeTemplate: '/x' })).toBe(
      stepNodeKey({ normalizedLabel: nfd, routeTemplate: '/x' }),
    );
  });
});

describe('(2) decisionId', () => {
  it('sha-256 matches known vectors', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('café')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is 64 hex chars, label-free, and order independent', () => {
    const d = detectDecisions({ runs: approveRuns }).decisions[0]!;
    expect(d.decisionId).toMatch(/^[0-9a-f]{64}$/);
    expect(d.decisionId).not.toMatch(/invoice|review/);
    expect(detectDecisions({ runs: [...approveRuns].reverse() }).decisions[0]!.decisionId).toBe(d.decisionId);
  });
});

describe('(3) description cap', () => {
  it('long offered-option lists are capped at 200 chars with an ellipsis', () => {
    const many = Array.from({ length: 40 }, (_, i) => `choice ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i * 7) % 26))}`.replace(/\d/g, ''));
    const opts = ['first pick', 'second pick', ...many];
    const d = detectDecisions({
      runs: [
        run('r1', [['pick', { offeredOptions: opts }], ['first pick']]),
        run('r2', [['pick', { offeredOptions: opts }], ['second pick']]),
      ],
    }).decisions[0]!;
    const c = d.outcomes.flatMap((o) => o.conditions).find((x) => x.conditionType === 'user_input')!;
    expect(c.description.length).toBeLessThanOrEqual(200);
    expect(c.description.endsWith('…')).toBe(true);
    expect(c.description).not.toMatch(/\s…$/);
  });
});

describe('determinism with sanitization', () => {
  it('shuffled input is byte-identical', () => {
    const runs = [
      run('r1', [['open', { uiState: 'Hi, Jane Doe' }], ['create x@y.com']]),
      run('r2', [['open', { uiState: 'Hi, Bob Lee' }], ['find 12']]),
      run('r3', [['open', { uiState: 'Plain banner' }], ['find 13']]),
    ];
    const base = JSON.stringify(detectDecisions({ runs }));
    expect(JSON.stringify(detectDecisions({ runs: [runs[2]!, runs[0]!, runs[1]!] }))).toBe(base);
    expect(base).not.toMatch(/x@y\.com/);
  });
});
