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
test('allowlisted skips with reasons are accepted', () => {
  const p = allowFile('# c\nskipped one | known flake\nskipped two | windows only\n');
  const r = run(['--min-tests', '0', '--allowlist', p, fx('allskip')]);
  assert.strictEqual(r.code, 0, r.out);
});
test('allowlist entry without reason is rejected', () => {
  const r = run(['--allowlist', allowFile('skipped one\n'), fx('allskip')]);
  assert.notStrictEqual(r.code, 0);
});
test('zero test files fails the file floor', () => {
  const r = run(['--min-files', '1', '--allowlist', emptyAllow, '--dir', mkdtempSync(join(tmpdir(), 'nofiles-'))]);
  assert.strictEqual(r.code, 1);
});
