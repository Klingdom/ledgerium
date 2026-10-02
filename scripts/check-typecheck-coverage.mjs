/**
 * #317 / MR-056 section 3. Two CI guards, one script:
 *  1. Every workspace package that contains TypeScript sources must define a
 *     `typecheck` script. `pnpm -r typecheck` silently SKIPS packages without
 *     one, so a renamed/removed script would drop a package from the gate.
 *  2. pnpm major must be >= 10. Under pnpm 9, `--fail-if-no-match` does not fail
 *     on a missing/renamed script (exit 0), so script-rename protection is void.
 * Seams for tests: CHECK_TYPECHECK_ROOT (workspace root), CHECK_PNPM_VERSION.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = process.env.CHECK_TYPECHECK_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'dist', '.next', 'build', 'coverage', '.turbo']);
const errors = [];

// --- pnpm version guard
let version = process.env.CHECK_PNPM_VERSION;
if (!version) {
  const r = spawnSync('pnpm --version', { encoding: 'utf8', shell: true });
  version = (r.stdout ?? '').trim().split('\n').pop();
}
const major = parseInt(version, 10);
if (!Number.isInteger(major) || major < 10) {
  errors.push(
    `pnpm ${version || '(unknown)'} detected; pnpm >= 10 is required: under pnpm 9 --fail-if-no-match does not fail ` +
      `on a renamed/missing script (MR-056), so CI would silently skip gates.`,
  );
}

// --- typecheck coverage
const hasTs = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name) && hasTs(join(dir, e.name))) return true;
    } else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) return true;
  }
  return false;
};
const globs = [...readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8').matchAll(/^\s*-\s*['"]?([^'"\s]+)\/\*['"]?\s*$/gm)].map((m) => m[1]);
let checked = 0;
for (const g of globs) {
  const base = join(ROOT, g);
  if (!existsSync(base)) continue;
  for (const name of readdirSync(base)) {
    const dir = join(base, name);
    const pj = join(dir, 'package.json');
    if (!statSync(dir).isDirectory() || !existsSync(pj)) continue;
    checked++;
    const scripts = JSON.parse(readFileSync(pj, 'utf8')).scripts ?? {};
    if (!scripts.typecheck && hasTs(dir)) {
      errors.push(`${g}/${name} has TypeScript sources but no "typecheck" script; 'pnpm -r typecheck' would silently skip it.`);
    }
  }
}

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  process.exit(1);
}
console.log(`OK: pnpm ${version}; ${checked} workspace packages checked, all TS packages have a typecheck script.`);
