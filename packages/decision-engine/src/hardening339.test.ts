import { describe, expect, it } from 'vitest';
import { detectDecisions } from './detectDecisions.js';
import { inferQuestion } from './question-inference.js';
import { isApprovalLabel, isRejectionLabel, MODAL_OPENED_EVENT } from './signals.js';
import { maskOutputText, sanitizeText } from './text-safety.js';
import type { RunInput, StepInput } from './types.js';

// Row #339 (MR-062 adversarial findings).

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
const approvalPair = (ui: string): RunInput[] => [
  run('a', [['review', { uiState: ui }], ['approve']]),
  run('b', [['review', { uiState: ui }], ['approve']]),
  run('c', [['review', { uiState: 'ok' }], ['reject']]),
  run('d', [['review', { uiState: 'ok' }], ['reject']]),
];

describe('(1) text-carrying output fields are masked', () => {
  it.each([
    ['+1 (555) 123-4567', '555'],
    ['555 123 4567', '4567'],
    ['GB82 WEST 1234 5698 7654 32', 'WEST'],
    ['DE89370400440532013000', '3704'],
    ['ops@localhost', 'localhost'],
  ])('sanitizeText masks %s', (tok, frag) => {
    const out = sanitizeText(`call ${tok} now`);
    expect(out).not.toContain(frag);
    expect(out).toBe(sanitizeText(out)); // idempotent
    expect(maskOutputText(out)).toBe(out);
  });
  it('leaves ordinary text alone', () => {
    expect(sanitizeText('Approve request')).toBe('Approve request');
    expect(sanitizeText('Save Draft')).toBe('Save Draft');
  });
  it('labels, nodeLabel, outcomeKey and prefixKeys never carry the tokens', () => {
    const r = (id: string, tail: string): RunInput =>
      run(id, [['open ops@localhost'], ['dial +1 (555) 123-4567'], [tail]]);
    const out = detectDecisions({
      runs: [r('a', 'pay GB82 WEST 1234 5698 7654 32'), r('b', 'pay GB82 WEST 1234 5698 7654 32'), r('c', 'skip 555 123 4567')],
    });
    expect(out.decisions.length).toBeGreaterThan(0);
    const s = JSON.stringify(out).replace(/"decisionId":"[0-9a-f]{64}"/g, ''); // hex ids may contain digit runs
    for (const t of ['localhost', '555', 'WEST', '4567', '5698']) expect(s).not.toContain(t);
  });
  it('decisionId depends only on the (sanitized) structural key path and is order-stable', () => {
    const runs = [run('a', [['go ops@localhost'], ['x']]), run('b', [['go ops@localhost'], ['y']])];
    const a = detectDecisions({ runs });
    const b = detectDecisions({ runs: [...runs].reverse() });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.decisions[0]!.prefixKeys).toEqual(['go [email]|/f']);
  });
  it('property: generated inputs with email/phone/IBAN/name tokens never appear in full output', () => {
    const emails = ['jane.doe@example.com', 'ops@localhost', 'a@b.io'];
    const phones = ['+1 (555) 123-4567', '555 123 4567', '020-7946-0958'];
    const ibans = ['GB82 WEST 1234 5698 7654 32', 'DE89370400440532013000'];
    const names = ['Jane Doe', '张伟'];
    const secrets = [...emails, ...phones, ...ibans];
    const frags = ['jane.doe', 'localhost', 'a@b', '5551234567', '123-4567', '123 4567', '7946', 'WEST', '5698', '3704', 'Jane', '张伟'];
    let seed = 7;
    const rnd = (n: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const pick = (xs: string[]): string => xs[rnd(xs.length)]!;
    for (let iter = 0; iter < 60; iter++) {
      const s1 = pick(secrets);
      const s2 = pick(secrets);
      const nm = pick(names);
      const runs: RunInput[] = [
        run('a', [[`open ${s1}`], [`review ${s2}`, { uiState: `Account Of ${nm} ${s1}`, actorRole: nm, offeredOptions: [`approve ${s1}`, `reject ${s2}`] }], [`approve ${s1}`]]),
        run('b', [[`open ${s1}`], [`review ${s2}`, { uiState: `Account Of ${nm}` }], [`reject ${s2}`]]),
        run('c', [[`open ${s1}`], [`review ${s2}`, { uiState: `Account Of ${nm}` }], [`approve ${s1}`]]),
      ];
      const json = JSON.stringify(detectDecisions({ runs })).replace(/"decisionId":"[0-9a-f]{64}"/g, '');
      for (const f of frags) expect(json, `iter ${iter} leaked ${f}`).not.toContain(f);
    }
  });
});

describe('(2) approval derives only from action labels', () => {
  it.each(['Account Of Jane Doe', '张伟'])('state text %s cannot raise confidence or appear', (ui) => {
    const d = detectDecisions({ runs: approvalPair(ui) }).decisions[0]!;
    expect(d.decisionType).toBe('approval_decision');
    expect(d.isInferred).toBe(true);
    expect(d.confidenceScore).toBeLessThan(0.55);
    expect(JSON.stringify(d)).not.toContain(ui);
    expect(d.outcomes.flatMap((o) => o.conditions.map((c) => c.conditionType))).toEqual(['approval_status', 'approval_status']);
  });
  it('a state alone (no approve/reject action labels) never yields approval_decision', () => {
    const runs = [
      run('a', [['review', { uiState: 'Approved by Jane Doe' }], ['save']]),
      run('b', [['review', { uiState: 'Rejected by John Roe' }], ['discard']]),
    ];
    expect(detectDecisions({ runs }).decisions[0]!.decisionType).not.toBe('approval_decision');
  });
});

describe('(3) lone validation word is not validation_result', () => {
  it('outcome labels "Correct address" vs "Ship order"', () => {
    const q = inferQuestion({ nodeLabel: 'n', outcomeLabels: ['Correct address', 'Ship order'], conditions: [] });
    expect(q.decisionType).not.toBe('validation_result');
    const d = detectDecisions({
      runs: [run('a', [['form'], ['Correct address']]), run('b', [['form'], ['Ship order']])],
    }).decisions[0]!;
    expect(d.decisionType).not.toBe('validation_result');
  });
  it('the retry + pass structure still classifies', () => {
    const runs = [
      run('a', [['open'], ['fill'], ['submit'], ['fill']]),
      run('b', [['open'], ['fill'], ['submit'], ['done']]),
    ];
    const d = detectDecisions({ runs }).decisions.find((x) => x.prefixKeys.length === 3)!;
    expect(d.decisionType).toBe('validation_result');
  });
});

describe('(4) signal 7 does not over-claim "error dialog"', () => {
  const M = { eventTypes: [MODAL_OPENED_EVENT] };
  const mk = (kind?: string): RunInput[] => [
    run('a', [['submit'], ['dismiss', { ...M, ...(kind ? { modalKind: kind } : {}) }]]),
    run('b', [['submit'], ['dismiss', { ...M, ...(kind ? { modalKind: kind } : {}) }]]),
    run('c', [['submit'], ['continue']]),
    run('d', [['submit'], ['continue']]),
  ];
  it('unknown modal: generic wording, inferred, < 0.55', () => {
    const d = detectDecisions({ runs: mk() }).decisions[0]!;
    expect(d.decisionType).toBe('exception_handling');
    expect(d.question).not.toMatch(/error/i);
    expect(d.isInferred).toBe(true);
    expect(d.confidenceScore).toBeLessThan(0.55);
  });
  it('non-error modal kind stays generic', () => {
    const d = detectDecisions({ runs: mk('confirm') }).decisions[0]!;
    expect(d.question).not.toMatch(/error/i);
    expect(d.isInferred).toBe(true);
  });
  it('declared error kind establishes an error dialog (uncapped)', () => {
    const d = detectDecisions({ runs: mk('error') }).decisions[0]!;
    expect(d.question).toMatch(/error dialog/);
    expect(d.isInferred).toBe(false);
  });
});

describe('(5) approval/rejection patterns are not over-broad', () => {
  it.each([
    'Accept all cookies', 'Accept cookies', 'Accept terms', 'Sign off', 'Sign out', 'Sign in', 'Log off',
    'Reject all cookies', 'Decline tracking',
  ])('%s is neither approval nor rejection', (l) => {
    expect(isApprovalLabel(l)).toBe(false);
    expect(isRejectionLabel(l)).toBe(false);
  });
  it.each(['Approve', 'Approve request', 'Accept invoice', 'Authorize payment', 'Approve all'])('%s still approves', (l) => {
    expect(isApprovalLabel(l)).toBe(true);
  });
  it.each(['Reject', 'Decline request', 'Deny access'])('%s still rejects', (l) => {
    expect(isRejectionLabel(l)).toBe(true);
  });
  it('a cookie banner accept/reject pair is not an approval decision', () => {
    const q = inferQuestion({ nodeLabel: 'n', outcomeLabels: ['Accept all cookies', 'Reject all cookies'], conditions: [] });
    expect(q.decisionType).not.toBe('approval_decision');
  });
});
