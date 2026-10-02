/** Tests for scripts/check-typecheck-coverage.mjs (#317, #322). Run: node --test scripts/check-typecheck-coverage.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), process.env.TC_SCRIPT ?? 'check-typecheck-coverage.mjs');
const DEFAULT_YAML = ['packages:', "  - 'apps/*'", "  - 'packages/*'", ''].join('\n');

function fixture(pkgs, yaml = DEFAULT_YAML) {
  const root = mkdtempSync(join(tmpdir(), 'tc-'));
  writeFileSync(join(root, 'pnpm-workspace.yaml'), yaml);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture-root', private: true }));
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

// ── #322: the gate must never pass while checking nothing ──
test('fails when zero packages are found, and prints the globs it read', () => {
  const r = run(fixture({}, ['packages:', "  - 'nowhere/*'", ''].join('\n')));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /0 workspace packages/);
  assert.match(r.stderr, /nowhere/);
});
test('flow-style list is resolved (packages found, TS package without typecheck fails)', () => {
  const r = run(fixture({ 'packages/b': { scripts: {} } }, "packages: ['apps/*', 'packages/*']\n"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /packages\/b/);
});
test('explicit path and ** glob are resolved', () => {
  const r1 = run(fixture({ 'tools/q': { scripts: {} } }, ['packages:', "  - 'tools/q'", ''].join('\n')));
  assert.match(r1.stderr, /tools\/q/);
  const r2 = run(fixture({ 'packages/deep/x': { scripts: {} } }, ['packages:', "  - 'packages/**'", ''].join('\n')));
  assert.match(r2.stderr, /packages\/deep\/x/);
});
test('negation (!pkg) excludes a package', () => {
  const yaml = ['packages:', "  - 'packages/*'", "  - '!packages/skip'", ''].join('\n');
  const root = fixture({ 'packages/a': { scripts: { typecheck: 'tsc' } }, 'packages/skip': { scripts: {} } }, yaml);
  assert.equal(run(root).status, 0);
});
test('.mts-only and .cts-only packages without typecheck fail', () => {
  assert.equal(run(fixture({ 'packages/m': { scripts: {}, files: ['src/a.mts'] } })).status, 1);
  assert.equal(run(fixture({ 'packages/m': { scripts: {}, files: ['src/a.cts'] } })).status, 1);
});
test('no-op typecheck script ("echo ok") fails; tsc / tsc -b / vue-tsc pass', () => {
  const bad = run(fixture({ 'packages/a': { scripts: { typecheck: 'echo ok' } } }));
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /does not invoke tsc/);
  for (const good of ['tsc --noEmit', 'tsc -b', 'vue-tsc --noEmit', 'node x && tsc -p .']) {
    assert.equal(run(fixture({ 'packages/a': { scripts: { typecheck: good } } })).status, 0, good);
  }
});
