/** Tests for scripts/check-typecheck-coverage.mjs (#317). Run: node --test scripts/check-typecheck-coverage.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-typecheck-coverage.mjs');

function fixture(pkgs) {
  const root = mkdtempSync(join(tmpdir(), 'tc-'));
  writeFileSync(join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n  - 'packages/*'\n");
  for (const [path, { scripts, files = ['src/a.ts'] }] of Object.entries(pkgs)) {
    mkdirSync(join(root, path, 'src'), { recursive: true });
    writeFileSync(join(root, path, 'package.json'), JSON.stringify({ name: path, scripts }));
    for (const f of files) writeFileSync(join(root, path, f), 'export {};\n');
  }
  return root;
}
const run = (root, version = '10.32.1') =>
  spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env: { ...process.env, CHECK_TYPECHECK_ROOT: root, CHECK_PNPM_VERSION: version } });

test('passes when every TS package has typecheck', () => {
  assert.equal(run(fixture({ 'packages/a': { scripts: { typecheck: 'tsc' } } })).status, 0);
});
test('fails when a TS package lacks a typecheck script (renamed/removed)', () => {
  const r = run(fixture({ 'packages/a': { scripts: { typecheck: 'tsc' } }, 'packages/b': { scripts: { 'type-check': 'tsc' } } }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /packages\/b/);
});
test('ignores packages with no TypeScript sources', () => {
  assert.equal(run(fixture({ 'packages/js': { scripts: {}, files: ['src/a.js'] } })).status, 0);
});
test('fails on pnpm 9 and names the reason', () => {
  const r = run(fixture({ 'packages/a': { scripts: { typecheck: 'tsc' } } }), '9.15.9');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /fail-if-no-match/);
});
