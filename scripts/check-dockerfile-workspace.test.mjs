/** Tests for scripts/check-dockerfile-workspace.mjs. Run: node --test scripts/check-dockerfile-workspace.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-dockerfile-workspace.mjs');
const REAL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function fixture(dockerfile) {
  const root = mkdtempSync(join(tmpdir(), 'dw-'));
  const pkg = (path, name, deps = {}) => {
    mkdirSync(join(root, path), { recursive: true });
    writeFileSync(join(root, path, 'package.json'), JSON.stringify({ name, dependencies: deps }));
  };
  pkg('apps/web-app', 'web', { '@l/a': 'workspace:*', '@l/graph': 'workspace:*' });
  pkg('packages/a', '@l/a', { '@l/events': 'workspace:*' });
  pkg('packages/graph', '@l/graph');
  pkg('packages/events', '@l/events');
  pkg('packages/unused', '@l/unused');
  writeFileSync(join(root, 'Dockerfile'), dockerfile);
  return root;
}
const run = (env) => spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env: { ...process.env, ...env } });
const df = (manifests, sources) =>
  ['FROM node AS deps', ...manifests.map((p) => `COPY packages/${p}/package.json packages/${p}/`),
   'FROM node AS builder', 'COPY --from=deps /app/ ./', ...sources.map((p) => `COPY packages/${p}/ packages/${p}/`),
   'FROM node AS runner', ''].join('\n');

test('real repo passes', () => {
  const r = run({ CHECK_DOCKERFILE_ROOT: REAL_ROOT });
  assert.equal(r.status, 0, r.stderr);
});
test('fixture with all transitive deps passes (unused package not required)', () => {
  const all = ['a', 'graph', 'events'];
  assert.equal(run({ CHECK_DOCKERFILE_ROOT: fixture(df(all, all)) }).status, 0);
});
test('missing process-graph-like package fails in both stages', () => {
  const r = run({ CHECK_DOCKERFILE_ROOT: fixture(df(['a', 'events'], ['a', 'events'])) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /@l\/graph: deps stage lacks/);
  assert.match(r.stderr, /@l\/graph: builder stage lacks/);
});
test('transitive dep missing from builder only fails', () => {
  const r = run({ CHECK_DOCKERFILE_ROOT: fixture(df(['a', 'graph', 'events'], ['a', 'graph'])) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /@l\/events: builder stage lacks/);
});
