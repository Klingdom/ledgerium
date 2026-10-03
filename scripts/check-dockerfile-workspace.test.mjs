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

// ── next.config.js relative requires must be COPYed into the runner stage ──
const withConfig = (config, files, runnerCopies) => {
  const all = ['a', 'graph', 'events'];
  const root = fixture(df(all, all) + runnerCopies.join('\n') + '\n');
  writeFileSync(join(root, 'apps/web-app/next.config.js'), config);
  for (const f of files) {
    mkdirSync(dirname(join(root, 'apps/web-app', f)), { recursive: true });
    writeFileSync(join(root, 'apps/web-app', f), 'module.exports = {};');
  }
  return root;
};
const CFG = "const { x } = require('./security-headers');\nmodule.exports = {};";
const CFG_COPY = 'COPY --from=builder /app/apps/web-app/next.config.js ./apps/web-app/next.config.js';
test('next.config require not copied to runner fails, naming the file', () => {
  const r = run({ CHECK_DOCKERFILE_ROOT: withConfig(CFG, ['security-headers.js'], [CFG_COPY]) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /security-headers/);
  assert.match(r.stderr, /runner stage does not COPY/);
});
test('next.config require copied to runner passes (file or parent dir)', () => {
  const file = 'COPY --from=builder /app/apps/web-app/security-headers.js ./apps/web-app/security-headers.js';
  assert.equal(run({ CHECK_DOCKERFILE_ROOT: withConfig(CFG, ['security-headers.js'], [file]) }).status, 0);
  const dir = 'COPY --from=builder /app/apps/web-app ./apps/web-app';
  assert.equal(run({ CHECK_DOCKERFILE_ROOT: withConfig(CFG, ['security-headers.js'], [dir]) }).status, 0);
});
test('next.config require copied to the WRONG destination fails', () => {
  const r = run({ CHECK_DOCKERFILE_ROOT: withConfig(CFG, ['security-headers.js'],
    ['COPY --from=builder /app/apps/web-app/security-headers.js ./security-headers.js']) });
  assert.equal(r.status, 1);
});
test('next.config requiring a nonexistent file fails', () => {
  const r = run({ CHECK_DOCKERFILE_ROOT: withConfig(CFG, [], []) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no such file/);
});
test('the BROKEN pre-fix shape (module under src/lib, not copied) fails', () => {
  const r = run({ CHECK_DOCKERFILE_ROOT: withConfig("require('./src/lib/security-headers');",
    ['src/lib/security-headers.js'], [CFG_COPY]) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /src\/lib\/security-headers/);
});
