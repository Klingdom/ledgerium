/**
 * Tests for scripts/validate-backlog.mjs (#312, widened at MR-056 §4.1).
 *
 * Run with:  node --test scripts/validate-backlog.test.mjs   (pnpm test:validate-backlog)
 * CI runs it in deploy.yml, step "Test backlog validator", right before the validator.
 * It is NOT a vitest file: the root vitest config only includes packages/* and apps/*
 * `src`, so a test here would silently never run (the same trap the validator documents).
 *
 * Each test drives the real script against fixture backlog/log files, through the
 * VALIDATE_BACKLOG_* env seams, so it proves the script's observable behaviour.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// VALIDATE_BACKLOG_SCRIPT lets a revert proof point the same tests at an old copy.
const SCRIPT = process.env.VALIDATE_BACKLOG_SCRIPT ?? join(HERE, 'validate-backlog.mjs');

/** Canonical 15-cell row: id, desc, 2 filler, I A L C E R (3,3,3,3,1,1), score 10, birth, status. */
const row = (id, desc = 'a row', status = 'open', struck = false) =>
  `| ${struck ? `~~${id}~~` : id} | ${desc} | x | y | 3 | 3 | 3 | 3 | 1 | 1 | **10** | L1 | ${status} |`;

// #344: scope is by position above the loop-133 anchor heading, and a missing anchor or zero
// in-scope summary lines FAILS. So run() appends a canonical filler summary line and the anchor
// below whatever `log` the test supplies; `rawLog` bypasses that for anchor/scope tests.
const ANCHOR = '## 2026-10-02 (loop 133) — anchor';
const FILLER = '- **Follow-ups:** 0 created, 0 closed.';
function run({ backlog, log = '', rawLog = null, baseline = { malformed: [], v4: [] }, extraEnv = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'vb-'));
  writeFileSync(join(dir, 'b.md'), backlog.join('\n') + '\n');
  writeFileSync(join(dir, 'l.md'), rawLog ?? log + FILLER + '\n' + ANCHOR + '\n');
  const r = spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    env: {
      ...process.env,
      VALIDATE_BACKLOG_FILE: join(dir, 'b.md'),
      VALIDATE_ITERATION_LOG_FILE: join(dir, 'l.md'),
      VALIDATE_BACKLOG_BASELINE_JSON: JSON.stringify(baseline),
      ...extraEnv,
    },
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

test('clean fixture exits 0 (exit-code contract)', () => {
  const r = run({ backlog: [row(9001), row(9002, 'done', 'closed', true)] });
  assert.equal(r.code, 0, r.out);
});

// ── Defect 1: pipe escaping ──────────────────────────────────────────────────
test('V2: an escaped \\| in prose does not add a cell', () => {
  // 20 rows: more than the old count budget (19) could hide, so the old split fails here.
  const backlog = Array.from({ length: 20 }, (_, i) => row(9100 + i, 'type is A \\| B'));
  const r = run({ backlog });
  assert.equal(r.code, 0, r.out);
});

test('V2: an unescaped | in prose is still a malformed row', () => {
  const r = run({ backlog: [row(9001, 'type is A | B')] });
  assert.equal(r.code, 1);
  assert.match(r.out, /#9001/);
});

// ── Defect 2: V4 parses the current log format ───────────────────────────────
test('V4: a closure in "N closed (#a, #b)" form must be struck', () => {
  const r = run({
    backlog: [row(9001), row(9002, 'done', 'closed', true)],
    log: '- **Follow-ups:** 0 created, 2 closed (#9001, #9002).\n',
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /V4\s+#9001 is described as closed/);
  assert.doesNotMatch(r.out, /V4\s+#9002/);
});

test('V4: "1 created (#n), 1 closed (#m)" reads the closed list, not the created one', () => {
  const r = run({
    backlog: [row(9001), row(9002, 'done', 'closed', true)],
    log: '- **Follow-ups:** 1 created (#9001), 1 closed (#9002).\n',
  });
  assert.equal(r.code, 0, r.out);
});

test('V4: "0 closed (#n ...)" names a row that did NOT close', () => {
  const r = run({
    backlog: [row(9001)],
    log: '- **Follow-ups:** 0 created, 0 closed (#9001 -> blocked on the CEO).\n',
  });
  assert.equal(r.code, 0, r.out);
});

test('V4: a closure inside a fully ~~retracted~~ line is not a claim', () => {
  const r = run({
    backlog: [row(9001)],
    log: '- **Follow-ups:** ~~0 created, 1 closed (#9001).~~\n',
  });
  assert.equal(r.code, 0, r.out);
});

test('V4: a baselined mismatch passes; a baseline entry that is now struck fails as stale', () => {
  const log = '- **Follow-ups:** 0 created, 1 closed (#9001).\n';
  const ok = run({ backlog: [row(9001)], log, baseline: { malformed: [], v4: [9001] } });
  assert.equal(ok.code, 0, ok.out);
  const stale = run({
    backlog: [row(9001, 'done', 'closed', true)],
    log,
    baseline: { malformed: [], v4: [9001] },
  });
  assert.equal(stale.code, 1);
  assert.match(stale.out, /V4_MISMATCH_BASELINE/);
});

// ── Defect 3: "New offenders" lists only non-baselined rows ──────────────────
test('V2: "New offenders" omits rows already in the baseline', () => {
  const r = run({
    backlog: [row(9001, 'A | B'), row(9003, 'C | D')],
    baseline: { malformed: [9001], v4: [] },
  });
  assert.equal(r.code, 1);
  const line = r.out.split('\n').find((l) => l.includes('New offenders'));
  assert.ok(line, r.out);
  assert.match(line, /#9003/);
  assert.doesNotMatch(line, /#9001/);
});

// ── Defect 4: the baseline is a set of ids, not a count ──────────────────────
test('V2: swapping one malformed row for another fails', () => {
  // Baseline says #9001 is the known-bad row. #9001 was fixed, #9003 broke.
  const r = run({
    backlog: [row(9001), row(9003, 'C | D')],
    baseline: { malformed: [9001], v4: [] },
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /New offenders: #9003/);
});

test('V2: fixing a baselined row fails until it is removed from the baseline', () => {
  const r = run({ backlog: [row(9001)], baseline: { malformed: [9001], v4: [] } });
  assert.equal(r.code, 1);
  assert.match(r.out, /no longer malformed[^]*#9001/);
});

test('V2: the baselined malformed row alone passes', () => {
  const r = run({ backlog: [row(9001, 'A | B')], baseline: { malformed: [9001], v4: [] } });
  assert.equal(r.code, 0, r.out);
});

// ── The real repo ────────────────────────────────────────────────────────────
test('the real backlog + log validate clean against the committed baselines', () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

// ── #322: V4 spellings + canary ──────────────────────────────────────────────
const NL = String.fromCharCode(10);
test('V4 (#322): a non-bold "- Follow-ups:" line is parsed', () => {
  const r = run({ backlog: [row(9001)], log: '- Follow-ups: 0 created, 1 closed (#9001).' + NL });
  assert.equal(r.code, 1);
  assert.match(r.out, /V4\s+#9001 is described as closed/);
});
test('V4 (#322): a number word ("two closed") is parsed', () => {
  const r = run({ backlog: [row(9001), row(9002)], log: '- **Follow-ups:** 0 created, two closed (#9001, #9002).' + NL });
  assert.equal(r.code, 1);
  assert.match(r.out, /#9001/);
  assert.match(r.out, /#9002/);
});
test('V4 (#322): a Follow-ups line claiming closure with no id list is non-canonical and fails', () => {
  const r = run({ backlog: [row(9001)], log: '- **Follow-ups:** 1 created, three closed.' + NL });
  assert.equal(r.code, 1);
  assert.match(r.out, /non-canonical/);
});
test('V4 (#322): canary - a parser that matches nothing makes the validator fail', () => {
  const r = run({ backlog: [row(9001)], extraEnv: { VALIDATE_BACKLOG_V4_SABOTAGE: '1' } });
  assert.equal(r.code, 1);
  assert.match(r.out, /canary failed.*parser broken/);
  assert.equal(run({ backlog: [row(9001)] }).code, 0);
});

// ── #325: every in-scope Follow-ups line must parse canonically or fail ──────
const LOOP_HDR = (n) => `## 2026-10-02 (loop ${n}) - fixture` + NL;
test('V4 (#325): a malformed in-scope Follow-ups line fails, naming line number and text', () => {
  const log = LOOP_HDR(200) + '- **Follow-ups:** 0 created; closed #316' + NL;
  const r = run({ backlog: [row(9001)], log });
  assert.equal(r.code, 1);
  assert.match(r.out, /ITERATION_LOG\.md:2\b/);
  assert.match(r.out, /0 created; closed #316/);
});
test('V4 (#325): the same canonical-shape line passes', () => {
  const log = LOOP_HDR(200) + '- **Follow-ups:** 0 created, 1 closed (#9002). #9001 is extended.' + NL;
  const r = run({ backlog: [row(9001), row(9002, 'done', 'closed', true)], log });
  assert.equal(r.code, 0, r.out);
});
test('V4 (#325): a malformed line below the anchor heading is out of scope and does not fail', () => {
  const rawLog = LOOP_HDR(200) + '- **Follow-ups:** 0 created, 0 closed (#9001 blocked).' + NL +
    ANCHOR + NL + LOOP_HDR(50) + '- **Follow-ups:** 0 created; closed #316' + NL;
  const r = run({ backlog: [row(9001)], rawLog });
  assert.equal(r.code, 0, r.out);
});
test('V4 (#325): prose mentioning "closed" that is not a Follow-ups line does not fail', () => {
  const log = LOOP_HDR(200) + '- The review closed out the row; nothing about follow-ups here, closed.' + NL +
    '  - Follow-ups were discussed and the gate closed.' + NL;
  const r = run({ backlog: [row(9001)], log });
  assert.equal(r.code, 0, r.out);
});

// ── #344: scope by position, near-miss spellings, id/count checks, struck lines ─
const REAL_LOG = join(HERE, '..', 'ITERATION_LOG.md');
const runReal = (logText) => {
  const dir = mkdtempSync(join(tmpdir(), 'vb-real-'));
  writeFileSync(join(dir, 'l.md'), logText);
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env: { ...process.env, VALIDATE_ITERATION_LOG_FILE: join(dir, 'l.md') } });
  return { code: r.status, out: r.stdout + r.stderr };
};
const B2 = [row(9001), row(9002, 'done', 'closed', true)];

test('V4 (#344.1): a newer heading ending "(loop 12)" does not switch the check off', () => {
  const rawLog = '## 2026-10-03 (loop 200) - newest, mentions the old (loop 12)' + NL +
    '## 2026-10-03 - MR recorded (loop 12)' + NL +
    '- **Follow-ups:** 0 created; closed #316' + NL + FILLER + NL + ANCHOR + NL;
  const r = run({ backlog: B2, rawLog });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /non-canonical Follow-ups line at ITERATION_LOG\.md:3\b/);
});
test('V4 (#344.1): a heading\'s own loop number is the leading "(loop N)", not a later one', () => {
  // A "(loop 133)" later in a title is not the anchor.
  const rawLog = FILLER + NL + '## 2026-10-02 - something (loop 133)' + NL;
  const r = run({ backlog: B2, rawLog });
  assert.equal(r.code, 1);
  assert.match(r.out, /anchor heading .*not found/);
});
test('V4 (#344.1): a missing anchor heading fails loudly instead of checking 0 lines', () => {
  const r = run({ backlog: B2, rawLog: FILLER + NL + '## 2026-10-02 (loop 200) - x' + NL });
  assert.equal(r.code, 1);
  assert.match(r.out, /anchor heading .*not found/);
});
test('V4 (#344.1): zero in-scope summary lines fails', () => {
  const r = run({ backlog: B2, rawLog: '## 2026-10-02 (loop 200) - x' + NL + ANCHOR + NL });
  assert.equal(r.code, 1);
  assert.match(r.out, /0 summary lines in scope/);
});
test('V4 (#344.2): near-miss spellings are recognised and fail, naming the canonical label', () => {
  for (const bad of ['- **Follow-ups :** 0 created, 0 closed.', '- Follow-up: 0 created, 0 closed.', '- Followups: 0 created, 0 closed.', '- **Follow-up:** 0 created, 0 closed.', '- follow-ups: 0 created, 0 closed.']) {
    const r = run({ backlog: B2, log: bad + NL });
    assert.equal(r.code, 1, bad + ' -> ' + r.out);
    assert.match(r.out, /use "Follow-ups:"/, bad);
  }
});
test('V4 (#344.2): prose with no colon is not a summary line', () => {
  const r = run({ backlog: B2, log: '- Follow-up work was discussed.' + NL + '- Followups were triaged' + NL });
  assert.equal(r.code, 0, r.out);
});
test('V4 (#344.3): a closed id that is not a backlog row fails', () => {
  const r = run({ backlog: B2, log: '- **Follow-ups:** 0 created, 1 closed (#9999).' + NL });
  assert.equal(r.code, 1);
  assert.match(r.out, /closed id\(s\) not in the backlog: #9999/);
});
test('V4 (#344.3): a closed count that does not match the listed ids fails (both directions)', () => {
  const few = run({ backlog: B2, log: '- **Follow-ups:** 0 created, 3 closed (#9002).' + NL });
  assert.equal(few.code, 1);
  assert.match(few.out, /closed count 3 != 1 listed/);
  const many = run({ backlog: B2, log: '- **Follow-ups:** 0 created, 1 closed (#9002, #9001).' + NL });
  assert.equal(many.code, 1);
  assert.match(many.out, /closed count 1 != 2 listed/);
});
test('V4 (#344.3): a created count that does not match its listed ids fails; created with no ids is allowed', () => {
  const bad = run({ backlog: B2, log: '- **Follow-ups:** 2 created (#9001), 0 closed.' + NL });
  assert.equal(bad.code, 1);
  assert.match(bad.out, /created count 2 != 1 listed/);
  const ok = run({ backlog: B2, log: '- **Follow-ups:** 2 created, 0 closed.' + NL });
  assert.equal(ok.code, 0, ok.out);
});
test('V4 (#344.3): "N closed" with N > 0 and no id list fails; "0 closed (#id blocked)" is not checked', () => {
  assert.equal(run({ backlog: B2, log: '- **Follow-ups:** 0 created, 1 closed.' + NL }).code, 1);
  assert.equal(run({ backlog: B2, log: '- **Follow-ups:** 0 created, 0 closed (#9999 blocked).' + NL }).code, 0);
});
test('V4 (#344.4): a struck line followed by free text is NOT exempt; a fully struck line is', () => {
  const trailing = run({ backlog: B2, log: '- **Follow-ups:** ~~0 created, 1 closed (#9002).~~ corrected, nothing closed' + NL });
  assert.equal(trailing.code, 1, trailing.out);
  assert.match(trailing.out, /non-canonical Follow-ups line/);
  const trailing2 = run({ backlog: B2, log: '~~- **Follow-ups:** 0 created, 1 closed (#9002).~~ see below' + NL });
  assert.equal(trailing2.code, 1, trailing2.out);
  const full = run({ backlog: B2, log: '~~- **Follow-ups:** 0 created, 1 closed (#9002).~~' + NL });
  assert.equal(full.code, 0, full.out);
});
test('V4 (#344): tamper on a COPY of the real ITERATION_LOG.md - the unmodified copy passes', () => {
  const r = runReal(readFileSync(REAL_LOG, 'utf8'));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /strict-checked [1-9]\d* Follow-ups line/);
});
test('V4 (#344): tamper on a COPY of the real log - a malformed line near the top fails with its line number', () => {
  const lines = readFileSync(REAL_LOG, 'utf8').split('\n');
  const at = lines.findIndex((l) => /^## /.test(l)) + 1;
  lines.splice(at, 0, '- **Follow-ups:** 0 created; closed #316');
  const r = runReal(lines.join('\n'));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp('ITERATION_LOG\\.md:' + (at + 1) + '\\b'));
});
test('V4 (#344.1): tamper on a COPY of the real log - a newer "(loop 12)" heading above a tampered line cannot hide it', () => {
  const lines = readFileSync(REAL_LOG, 'utf8').split('\n');
  const at = lines.findIndex((l) => /^## /.test(l));
  lines.splice(at, 0, '## 2026-10-03 (loop 12) - injected', '- Followups: 0 created, 5 closed (#999999).');
  const r = runReal(lines.join('\n'));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /use "Follow-ups:"/);
  assert.doesNotMatch(r.out, /strict-checked 0 /);
});
