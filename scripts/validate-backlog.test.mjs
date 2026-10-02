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
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// VALIDATE_BACKLOG_SCRIPT lets a revert proof point the same tests at an old copy.
const SCRIPT = process.env.VALIDATE_BACKLOG_SCRIPT ?? join(HERE, 'validate-backlog.mjs');

/** Canonical 15-cell row: id, desc, 2 filler, I A L C E R (3,3,3,3,1,1), score 10, birth, status. */
const row = (id, desc = 'a row', status = 'open', struck = false) =>
  `| ${struck ? `~~${id}~~` : id} | ${desc} | x | y | 3 | 3 | 3 | 3 | 1 | 1 | **10** | L1 | ${status} |`;

function run({ backlog, log = '', baseline = { malformed: [], v4: [] }, extraEnv = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'vb-'));
  writeFileSync(join(dir, 'b.md'), backlog.join('\n') + '\n');
  writeFileSync(join(dir, 'l.md'), log);
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

test('V4: a closure inside a ~~retraction~~ is not a claim', () => {
  const r = run({
    backlog: [row(9001)],
    log: '- **Follow-ups:** ~~0 created, 1 closed (#9001).~~ corrected.\n',
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
