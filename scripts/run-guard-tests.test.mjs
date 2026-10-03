import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const runner = join(here, 'run-guard-tests.mjs');
const fx = (n) => join(here, 'fixtures', 'guard-tests', `${n}.fixture.mjs`);
const emptyAllow = join(here, 'allowed-skips.txt');

function run(args) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, [runner, ...args], { encoding: 'utf8', env });
  return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}
function allowFile(content) {
  const p = join(mkdtempSync(join(tmpdir(), 'allow-')), 'allow.txt');
  writeFileSync(p, content);
  return p;
}

test('healthy file passes at floor', () => {
  const r = run(['--min-tests', '2', '--min-files', '1', fx('healthy')]);
  assert.strictEqual(r.code, 0, r.out);
});
test('healthy file fails when test floor not met', () => {
  const r = run(['--min-tests', '3', fx('healthy')]);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /need >= 3/);
});
test('empty file alone fails the test floor', () => {
  const r = run(['--min-tests', '1', fx('empty')]);
  assert.strictEqual(r.code, 1, r.out);
});
test('all-skipped file fails (unexplained skips)', () => {
  const r = run(['--min-tests', '0', fx('allskip')]);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /unexplained SKIP/);
});
test('todo test fails', () => {
  const r = run(['--min-tests', '1', fx('todo')]);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /unexplained TODO/);
});
test('failing file fails', () => {
  const r = run(['--min-tests', '1', fx('failing')]);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /failed/);
});
test('five files, one empty and four all-skipped, fail (the MR-061 case)', () => {
  const r = run(['--min-files', '5', '--min-tests', '1',
    fx('empty'), fx('allskip'), fx('allskip'), fx('allskip'), fx('allskip')]);
  assert.strictEqual(r.code, 1, r.out);
});
test('allowlisted skips are not reported as unexplained (but a skip-only file still fails the zero check)', () => {
  const p = allowFile('# c\nskipped one | known flake\nskipped two | windows only\n');
  // #343 supersedes the old expectation (exit 0): a skip-only file executes zero tests.
  const r = run(['--min-tests', '0', '--allowlist', p, fx('healthy'), fx('allskip')]);
  assert.strictEqual(r.code, 1, r.out);
  assert.doesNotMatch(r.out, /unexplained/);
  const r2 = run(['--min-tests', '0', '--allowlist', p, fx('allskip')]);
  assert.strictEqual(r2.code, 1, 'skip-only file contributes zero executed tests');
  assert.match(r2.out, /allskip\.fixture\.mjs executed zero tests/);
});
test('allowlist entry without reason is rejected', () => {
  const r = run(['--allowlist', allowFile('skipped one\n'), fx('allskip')]);
  assert.notStrictEqual(r.code, 0);
});
test('zero test files fails the file floor', () => {
  const r = run(['--min-files', '1', '--allowlist', emptyAllow, '--dir', mkdtempSync(join(tmpdir(), 'nofiles-'))]);
  assert.strictEqual(r.code, 1);
});

// ---- row #343: manifest (per-file exact counts) and per-file zero check ----
const manifestFile = (obj) => allowFile(typeof obj === 'string' ? obj : JSON.stringify(obj));

test('#343 manifest exact match passes', () => {
  const m = manifestFile({ 'healthy.fixture.mjs': 2 });
  const r = run(['--manifest', m, fx('healthy')]);
  assert.strictEqual(r.code, 0, r.out);
});
test('#343 (a) deleted test fails: executed below manifest, names file and counts', () => {
  const m = manifestFile({ 'healthy.fixture.mjs': 3 });
  const r = run(['--manifest', m, fx('healthy')]);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /healthy\.fixture\.mjs executed 2 tests but .* expects 3: 1 test\(s\) deleted/);
});
test('#343 (b) added test without manifest bump fails with update instruction', () => {
  const m = manifestFile({ 'healthy.fixture.mjs': 1 });
  const r = run(['--manifest', m, fx('healthy')]);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /executed 2 tests but .* expects 1: update it to "healthy\.fixture\.mjs": 2 in the same commit/);
});
test('#343 file missing from manifest fails and names it', () => {
  const m = manifestFile({ 'other.fixture.mjs': 1 });
  const r = run(['--manifest', m, fx('healthy')]);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /healthy\.fixture\.mjs is not in .*add "healthy\.fixture\.mjs": 2/);
  assert.match(r.out, /lists other\.fixture\.mjs \(1 tests\) but it was not run/);
});
test('#343 (c) describe-only file fails per file even when the aggregate is fine', () => {
  const m = manifestFile({ 'healthy.fixture.mjs': 2, 'describeonly.fixture.mjs': 1 });
  const r = run(['--min-tests', '2', '--manifest', m, fx('healthy'), fx('describeonly')]);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /describeonly\.fixture\.mjs executed zero tests/);
  assert.doesNotMatch(r.out, /healthy\.fixture\.mjs executed zero/);
});
test('#343 (c) zero-test file is flagged without any manifest, aggregate floor satisfied', () => {
  const r = run(['--min-tests', '2', fx('healthy'), fx('describeonly')]);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /describeonly\.fixture\.mjs executed zero tests/);
});
test('#343 (c) empty file is named per file', () => {
  const r = run([fx('healthy'), fx('empty')]);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /empty\.fixture\.mjs executed zero tests/);
});
test('#343 (d) deterministic: identical runs give identical exit and error lines', () => {
  const m = manifestFile({ 'healthy.fixture.mjs': 3 });
  const errs = () => run(['--manifest', m, fx('healthy')]).out.split(String.fromCharCode(10)).filter((l) => l.startsWith('::error::')).join('|');
  assert.strictEqual(errs(), errs());
  assert.ok(errs().length > 0);
});
test('#343 malformed manifest is rejected, not ignored', () => {
  for (const bad of ['not json', '[]', '{"healthy.fixture.mjs": 0}', '{"healthy.fixture.mjs": "2"}']) {
    const r = run(['--manifest', manifestFile(bad), fx('healthy')]);
    assert.strictEqual(r.code, 1, bad + ' ' + r.out);
    assert.match(r.out, /cannot use manifest/);
  }
});
test('#343 unlisted file executing N>0 tests gets the add "<file>": N hint', () => {
  const r = run(['--manifest', manifestFile({ 'other.fixture.mjs': 1 }), fx('healthy')]);
  assert.match(r.out, /healthy\.fixture\.mjs is not in .*: add "healthy\.fixture\.mjs": 2/);
});
test('#343 unlisted file executing zero tests gets no "add <file>: 0" hint', () => {
  const r = run(['--manifest', manifestFile({ 'healthy.fixture.mjs': 2 }), fx('healthy'), fx('describeonly')]);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /describeonly\.fixture\.mjs is not in .* and executed zero tests: add tests to it, then list it in the manifest with its count/);
  assert.doesNotMatch(r.out, /add "describeonly\.fixture\.mjs": 0/);
  assert.match(r.out, /describeonly\.fixture\.mjs executed zero tests \(/);
});
test('#343 manifest entry of 0 is rejected with a clear message', () => {
  const r = run(['--manifest', manifestFile({ 'healthy.fixture.mjs': 0 }), fx('healthy')]);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /cannot use manifest .*count for healthy\.fixture\.mjs must be an integer >= 1, got 0 \(a file that executes zero tests is never valid/);
});
test('#343 missing manifest path fails', () => {
  const r = run(['--manifest', join(tmpdir(), 'no-such-manifest.json'), fx('healthy')]);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /cannot use manifest/);
});
