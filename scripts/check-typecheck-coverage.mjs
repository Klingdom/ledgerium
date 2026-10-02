/**
 * #317 / MR-056 section 3. Two CI guards, one script:
 *  1. Every workspace package that contains TypeScript sources must define a
 *     `typecheck` script. `pnpm -r typecheck` silently SKIPS packages without
 *     one, so a renamed/removed script would drop a package from the gate.
 *  2. pnpm major must be >= 10. Under pnpm 9, `--fail-if-no-match` does not fail
 *     on a missing/renamed script (exit 0), so script-rename protection is void.
 * Seams for tests: CHECK_TYPECHECK_ROOT (workspace root), CHECK_PNPM_VERSION.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
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

// --- typecheck coverage (#322)
// Package list comes from pnpm itself ('pnpm -r ls --json --depth -1'), NOT a hand-rolled
// pnpm-workspace.yaml parser: pnpm already understands block/flow lists, '**' globs, explicit
// paths and '!' negations, and it is the same resolver 'pnpm -r typecheck' uses, so the gate
// checks exactly the set the gate would run. The script already requires pnpm >= 10.
// Seam: CHECK_TYPECHECK_PACKAGES_JSON supplies the pnpm output for unit tests of the failure path.
// Rules per package: (a) TS sources (.ts/.tsx/.mts/.cts, not .d.ts) => a 'typecheck' script must
// exist; (b) that script must invoke tsc / tsc -b / vue-tsc (a no-op like 'echo ok' is rejected).
const TS_RE = /\.(?:tsx?|mts|cts)$/;
const DTS_RE = /\.d\.(?:ts|mts|cts)$/;
const RUNS_TSC = /(?:^|[\s&;|(])(?:vue-)?tsc(?:\.cmd)?(?=$|[\s&;|)])/;
const hasTs = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name) && hasTs(join(dir, e.name))) return true;
    } else if (TS_RE.test(e.name) && !DTS_RE.test(e.name)) return true;
  }
  return false;
};
let listing = process.env.CHECK_TYPECHECK_PACKAGES_JSON;
if (listing === undefined) {
  const r = spawnSync('pnpm -r ls --json --depth -1', { cwd: ROOT, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) errors.push(`'pnpm -r ls --json --depth -1' failed (exit ${r.status}): ${(r.stderr ?? '').trim().slice(0, 300)}`);
  listing = r.stdout ?? '';
}
let pkgs = [];
try {
  pkgs = JSON.parse(listing);
} catch {
  errors.push('could not parse the package list from pnpm (not JSON); refusing to report success on an unread workspace.');
}
const norm = (p) => resolve(p).toLowerCase();
pkgs = pkgs.filter((p) => p && p.path && norm(p.path) !== norm(ROOT));
let checked = 0;
for (const p of pkgs) {
  const pj = join(p.path, 'package.json');
  if (!existsSync(pj)) continue;
  checked++;
  const name = relative(ROOT, p.path).split(sep).join('/') || p.name;
  const script = (JSON.parse(readFileSync(pj, 'utf8')).scripts ?? {}).typecheck;
  if (!hasTs(p.path)) continue;
  if (!script) errors.push(`${name} has TypeScript sources but no "typecheck" script; 'pnpm -r typecheck' would silently skip it.`);
  else if (!RUNS_TSC.test(script)) errors.push(`${name} "typecheck" script is ${JSON.stringify(script)}, which does not invoke tsc / tsc -b / vue-tsc; it would pass while checking nothing.`);
}
if (checked === 0) {
  errors.push(`0 workspace packages found/checked. Globs read from ${join(ROOT, 'pnpm-workspace.yaml')}: ${
    existsSync(join(ROOT, 'pnpm-workspace.yaml')) ? JSON.stringify(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8').split(/\r?\n/).filter((l) => /^\s*-\s|packages:/.test(l)).map((l) => l.trim())) : '(file missing)'
  }. A gate that checked nothing must not report success.`);
}

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  process.exit(1);
}
console.log(`OK: pnpm ${version}; ${checked} workspace packages checked, all TS packages have a tsc-invoking typecheck script.`);
