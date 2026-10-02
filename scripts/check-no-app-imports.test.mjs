/**
 * #330 / PRD AC-1.1: no packages/* source may import from apps/*.
 * Fails on relative paths that resolve into <root>/apps, or on app package names.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo']);
const APP_NAMES = ['@ledgerium/web-app', '@ledgerium/extension-app'];
const SPEC_RE = /(?:from\s*|import\s*\(?\s*|require\(\s*|import\s+)['"]([^'"]+)['"]/g;

export function findViolations(root, text, file) {
  const out = [];
  for (const m of text.matchAll(SPEC_RE)) {
    const spec = m[1];
    const isApp = APP_NAMES.some((n) => spec === n || spec.startsWith(n + '/'));
    let intoApps = false;
    if (spec.startsWith('.')) {
      const rel = relative(root, resolve(dirname(file), spec)).split(sep);
      intoApps = rel[0] === 'apps';
    }
    if (isApp || intoApps) out.push(`${relative(root, file)}: ${spec}`);
  }
  return out;
}

function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(?:tsx?|mts|cts|mjs|js)$/.test(e)) acc.push(p);
  }
  return acc;
}

test('detector flags the pre-#330 decision-engine import', () => {
  const file = join(ROOT, 'packages/decision-engine/src/types.ts');
  const old = `from '../../../apps/web-app/src/lib/process-graph/types/closed-unions.js';`;
  assert.equal(findViolations(ROOT, old, file).length, 1);
  assert.equal(findViolations(ROOT, `import x from '@ledgerium/web-app/foo'`, file).length, 1);
  assert.equal(findViolations(ROOT, `import x from '@ledgerium/process-graph'`, file).length, 0);
});

test('no packages/* source imports from apps/*', () => {
  const pkgs = join(ROOT, 'packages');
  const bad = [];
  for (const p of readdirSync(pkgs)) {
    const src = join(pkgs, p, 'src');
    try { statSync(src); } catch { continue; }
    for (const f of walk(src, [])) bad.push(...findViolations(ROOT, readFileSync(f, 'utf8'), f));
  }
  assert.deepEqual(bad, []);
});
