/**
 * Guard: every transitive workspace dependency of apps/web-app must be COPYed in the
 * Dockerfile, in BOTH the deps stage (package.json manifest) and the builder stage (sources).
 * Otherwise `pnpm install --frozen-lockfile` / `next build` fails in the image build.
 * Seams: CHECK_DOCKERFILE_ROOT (repo root), CHECK_DOCKERFILE_PATH (Dockerfile path).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
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

if (errors.length) {
  console.error('check-dockerfile-workspace FAILED:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`check-dockerfile-workspace OK: ${[...needed.keys()].join(', ')}`);
