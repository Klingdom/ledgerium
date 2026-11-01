/**
 * Guard: every transitive workspace dependency of apps/web-app must be COPYed in the
 * Dockerfile, in BOTH the deps stage (package.json manifest) and the builder stage (sources).
 * Otherwise `pnpm install --frozen-lockfile` / `next build` fails in the image build.
 * Builder stage: every relative import in apps/web-app (incl. scripts/) that reaches packages/<name>/ (followed
 * transitively through package sources) must have that package COPYed (next build type-checks it).
 * Runner stage: every relative require()/import in apps/web-app/next.config.js must be COPYed
 * (`next start` loads next.config.js at runtime; a missing file = MODULE_NOT_FOUND at boot).
 * Seams: CHECK_DOCKERFILE_ROOT (repo root), CHECK_DOCKERFILE_PATH (Dockerfile path).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.CHECK_DOCKERFILE_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCKERFILE = process.env.CHECK_DOCKERFILE_PATH ?? join(ROOT, 'Dockerfile');
const APP = 'apps/web-app';
const errors = [];

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const byName = new Map();
const pkgsDir = join(ROOT, 'packages');
if (existsSync(pkgsDir)) {
  for (const d of readdirSync(pkgsDir)) {
    const pj = join(pkgsDir, d, 'package.json');
    if (existsSync(pj)) byName.set(readJson(pj).name, { dir: `packages/${d}`, json: readJson(pj) });
  }
}
const wsDeps = (json) =>
  Object.entries({ ...json.dependencies, ...json.devDependencies, ...json.optionalDependencies })
    .filter(([, v]) => String(v).startsWith('workspace:')).map(([n]) => n);

const needed = new Map();
const queue = wsDeps(readJson(join(ROOT, APP, 'package.json')));
while (queue.length) {
  const n = queue.shift();
  if (needed.has(n)) continue;
  const pkg = byName.get(n);
  if (!pkg) { errors.push(`workspace dependency ${n} has no packages/*/package.json`); continue; }
  needed.set(n, pkg.dir);
  queue.push(...wsDeps(pkg.json));
}

// Split Dockerfile into stages: { name -> COPY source args[] }
const stages = new Map();
let cur = null;
for (const raw of readFileSync(DOCKERFILE, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  const from = /^FROM\s+\S+(?:\s+AS\s+(\S+))?/i.exec(line);
  if (from) { cur = (from[1] ?? `stage${stages.size}`).toLowerCase(); stages.set(cur, []); continue; }
  const copy = /^COPY\s+(?!--from)(.+)$/i.exec(line);
  if (copy && cur) stages.get(cur).push(...copy[1].trim().split(/\s+/).slice(0, -1).map((s) => s.replace(/\/+$/, '')));
}
const deps = stages.get('deps') ?? [];
const builder = stages.get('builder') ?? [];
if (!stages.has('deps')) errors.push('Dockerfile has no "deps" stage');
if (!stages.has('builder')) errors.push('Dockerfile has no "builder" stage');

for (const [name, dir] of needed) {
  if (!deps.includes(`${dir}/package.json`)) errors.push(`${name}: deps stage lacks COPY ${dir}/package.json`);
  if (!builder.includes(dir)) errors.push(`${name}: builder stage lacks COPY ${dir}/ ${dir}/`);
}

// Relative imports that reach into packages/<name>/ (no workspace:* dependency involved).
// `next build` type-checks everything under apps/web-app (tsconfig include **/*.ts, **/*.tsx), including
// scripts/, and tsc follows imports transitively, so the builder stage needs those package sources.
// Inspected shapes: `from '...'` (import/export/import type), side-effect `import '...'`,
// `import('...')`, `require('...')`, for ./ and ../ specifiers only. NOT inspected: tsconfig `paths`
// aliases, bare/package specifiers, template-literal or computed specifiers. Specifiers inside
// comments or strings are matched too (accepted false positives).
const SRC_EXT = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const TEST_FILE = /\.(?:test|spec)\.[^/]+$/;
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git']);
const SPEC_RES = [
  /\bfrom\s*['"](\.{1,2}\/[^'"\n]*)['"]/g,
  /\bimport\s*['"](\.{1,2}\/[^'"\n]*)['"]/g,
  /\bimport\s*\(\s*['"](\.{1,2}\/[^'"\n]*)['"]/g,
  /\brequire\s*\(\s*['"](\.{1,2}\/[^'"\n]*)['"]/g,
];
function* walk(relDir, skipTests) {
  const abs = join(ROOT, relDir);
  if (!existsSync(abs)) return;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${relDir}/${e.name}`;
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* walk(rel, skipTests); }
    else if (SRC_EXT.test(e.name) && !(skipTests && TEST_FILE.test(e.name))) yield rel;
  }
}
const packageImports = (file) => {
  const found = new Map(); // pkg dir -> first specifier
  const code = readFileSync(join(ROOT, file), 'utf8');
  for (const re of SPEC_RES) for (const m of code.matchAll(re)) {
    const target = posix.normalize(posix.join(posix.dirname(file), m[1]));
    const hit = /^packages\/([^/]+)(?:\/|$)/.exec(target);
    if (hit && !found.has(`packages/${hit[1]}`)) found.set(`packages/${hit[1]}`, m[1]);
  }
  return found;
};
{
  const scanned = new Set();
  const pending = []; // package dirs to scan for package->package imports
  const require_ = (file, dir, spec) => {
    if (!builder.includes(dir)) {
      errors.push(`${file} imports ${spec} (${dir}) but builder stage lacks COPY ${dir}/ ${dir}/ (next build type-check would fail with TS2307)`);
    }
    if (!scanned.has(dir)) { scanned.add(dir); pending.push(dir); }
  };
  for (const f of walk(APP, false)) for (const [dir, spec] of packageImports(f)) require_(f, dir, spec);
  while (pending.length) {
    const dir = pending.shift();
    for (const f of walk(dir, true)) for (const [other, spec] of packageImports(f)) {
      if (other !== dir) require_(f, other, spec);
    }
  }
}

// Runner stage: COPY --from=builder /app/<src> ./<dest>; collect (src, dest) pairs.
const runnerCopies = [];
{
  let stage = null;
  for (const raw of readFileSync(DOCKERFILE, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    const from = /^FROM\s+\S+(?:\s+AS\s+(\S+))?/i.exec(line);
    if (from) { stage = (from[1] ?? '').toLowerCase(); continue; }
    const c = /^COPY\s+--from=\S+\s+(.+)$/i.exec(line);
    if (c && stage === 'runner') {
      const parts = c[1].trim().split(/\s+/);
      const dest = parts.pop().replace(/^\.\//, '').replace(/^\/app\//, '').replace(/\/+$/, '');
      for (const src of parts) runnerCopies.push([src.replace(/^\/app\//, '').replace(/\/+$/, ''), dest]);
    }
  }
}
// A file is available at runtime only if some runner COPY maps it to the same relative path.
const isCopiedToRunner = (rel) =>
  runnerCopies.some(([src, dest]) => (rel === src || rel.startsWith(src + '/')) && dest + rel.slice(src.length) === rel);

// `next start` loads next.config.js at runtime: every relative require/import must exist in the runner.
const configPath = join(ROOT, APP, 'next.config.js');
if (existsSync(configPath)) {
  const code = readFileSync(configPath, 'utf8');
  const specs = new Set();
  for (const re of [
    /\brequire\(\s*['"](\.{1,2}\/[^'"]*)['"]\s*\)/g,
    /\bfrom\s+['"](\.{1,2}\/[^'"]*)['"]/g,
    /\bimport\(\s*['"](\.{1,2}\/[^'"]*)['"]\s*\)/g,
  ]) for (const m of code.matchAll(re)) specs.add(m[1]);
  for (const spec of specs) {
    const base = posix.normalize(`${APP}/${spec}`);
    const candidates = [base, `${base}.js`, `${base}.cjs`, `${base}.mjs`, `${base}.json`, `${base}/index.js`];
    const found = candidates.find((c) => existsSync(join(ROOT, c)) && statSync(join(ROOT, c)).isFile());
    if (!found) { errors.push(`next.config.js requires ${spec} but no such file exists under ${APP}/`); continue; }
    if (!isCopiedToRunner(found)) {
      errors.push(`next.config.js requires ${spec} (${found}) but the runner stage does not COPY it to ./${found} (container would fail to boot with MODULE_NOT_FOUND)`);
    }
  }
}

if (errors.length) {
  console.error('check-dockerfile-workspace FAILED:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`check-dockerfile-workspace OK: ${[...needed.keys()].join(', ')}`);
