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

// ── relative imports into packages/<name>/ require a builder COPY (transitively) ──
const ALL = ['a', 'graph', 'events'];
const baseDf = (extra = []) => df(ALL, [...ALL, ...extra]); // extra = package dir names COPYed in builder
const COPY_N = 'norm';
const put = (root, rel, body) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
};
const withImport = (rel, body, copies = []) => {
  const root = fixture(baseDf(copies));
  put(root, 'packages/norm/package.json', JSON.stringify({ name: '@l/norm' }));
  put(root, 'packages/norm/src/index.ts', 'export const x = 1;');
  put(root, rel, body);
  return root;
};
// apps/web-app/scripts/lib/x/y.ts -> repo root is 5 levels up
const U = "'../../../../../packages/norm/src/index'";
const shapes = {
  'import from': `import { x } from ${U};`,
  'import type from': `import type { X } from ${U};`,
  'export from': `export { x } from ${U};`,
  'side-effect import': `import ${U};`,
  'dynamic import': `const m = await import(${U});`,
  'require': `const m = require(${U});`,
};
for (const [name, body] of Object.entries(shapes)) {
  test(`relative ${name} into an uncopied package fails, naming file and COPY`, () => {
    const r = run({ CHECK_DOCKERFILE_ROOT: withImport('apps/web-app/scripts/lib/x/y.ts', body) });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /apps\/web-app\/scripts\/lib\/x\/y\.ts imports/);
    assert.match(r.stderr, /builder stage lacks COPY packages\/norm\/ packages\/norm\//);
  });
}
test('a .tsx file under src/ is scanned', () => {
  const r = run({ CHECK_DOCKERFILE_ROOT: withImport('apps/web-app/src/app/p.tsx',
    `import { x } from '../../../../packages/norm/src/index';`) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /src\/app\/p\.tsx/);
});
test('same imports pass once the COPY exists', () => {
  const body = Object.values(shapes).join('\n');
  assert.equal(run({ CHECK_DOCKERFILE_ROOT: withImport('apps/web-app/scripts/lib/x/a.ts', body, [COPY_N]) }).status, 0);
});
test('node_modules and .next under web-app are not scanned', () => {
  const body = shapes['import from'];
  assert.equal(run({ CHECK_DOCKERFILE_ROOT: withImport('apps/web-app/node_modules/z/q/i.ts', body) }).status, 0);
  assert.equal(run({ CHECK_DOCKERFILE_ROOT: withImport('apps/web-app/.next/q/r/i.ts', body) }).status, 0);
});
test('transitive: web-app -> packages/norm (copied) -> packages/deep (not copied) fails', () => {
  const root = withImport('apps/web-app/scripts/lib/x/a.ts', shapes['import from'], [COPY_N]);
  put(root, 'packages/deep/src/index.ts', 'export const d = 1;');
  put(root, 'packages/norm/src/uses-deep.ts', "import { d } from '../../deep/src/index';");
  const r = run({ CHECK_DOCKERFILE_ROOT: root });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /packages\/norm\/src\/uses-deep\.ts imports/);
  assert.match(r.stderr, /builder stage lacks COPY packages\/deep\/ packages\/deep\//);
});
test('transitive passes when both packages are copied', () => {
  const root = withImport('apps/web-app/scripts/lib/x/a.ts', shapes['import from'],
    [COPY_N, 'deep']);
  put(root, 'packages/norm/src/uses-deep.ts', "import { d } from '../../deep/src/index';");
  assert.equal(run({ CHECK_DOCKERFILE_ROOT: root }).status, 0);
});
test('test files inside a package are not followed', () => {
  const root = withImport('apps/web-app/scripts/lib/x/a.ts', shapes['import from'], [COPY_N]);
  put(root, 'packages/norm/src/thing.test.ts', "import { d } from '../../deep/src/index';");
  put(root, 'packages/norm/src/thing.spec.ts', "import { d } from '../../deep/src/index';");
  assert.equal(run({ CHECK_DOCKERFILE_ROOT: root }).status, 0);
});
