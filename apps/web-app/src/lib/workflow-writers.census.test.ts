/**
 * Row #319 guard: `Workflow.updatedAt` is the deletion clock for the retention
 * purge. Any new writer to the workflow table can bump it on a deleted row (delays
 * the purge) or set it explicitly (can destroy data early). This census fails when
 * a writer appears that is not listed here, so someone must consider deleted rows.
 *
 * Allowlist key = `file:count` of writes. Known weak writers are listed, NOT fixed
 * here (follow-ups: add `status: { not: 'deleted' }` to intelligence.ts and the
 * share view-count update).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
const toPosix = (p: string) => p.split(path.sep).join('/');

const ALLOWLIST: Record<string, string> = {
  'app/api/workflows/[id]/route.ts:3': 'GET view-count (skips deleted), PATCH (deleted accepts restore only), DELETE (idempotent); pinned by workflow-retention.test.ts',
  'lib/intelligence.ts:1': 'updateMany by id list without a status filter (TOCTOU, fail-late); follow-up',
  'app/api/share/[token]/route.ts:1': 'view-count update on a shared workflow read as status active; the write itself is unfiltered; follow-up',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

const WRITE_RE = /\bworkflow\.(update|updateMany|upsert)\s*\(/g;
const RAW_RE = /\$(execute|query)Raw(Unsafe)?\s*(<[^>]*>)?\s*(\(|`)/g;

/** Source text of each call (balanced parentheses, or the template literal). */
function callBodies(src: string, re: RegExp): string[] {
  const bodies: string[] = [];
  for (const m of src.matchAll(re)) {
    const start = m.index! + m[0].length - 1;
    if (src[start] === '`') {
      bodies.push(src.slice(start, src.indexOf('`', start + 1) + 1));
      continue;
    }
    let depth = 0;
    let i = start;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')' && --depth === 0) break;
    }
    bodies.push(src.slice(start, i + 1));
  }
  return bodies;
}

export function scanWriters(files: Array<{ rel: string; src: string }>) {
  const counts: Record<string, number> = {};
  const explicitUpdatedAt: string[] = [];
  for (const { rel, src } of files) {
    const wf = callBodies(src, WRITE_RE);
    const raw = callBodies(src, RAW_RE).filter(
      (b) => /\bworkflows?\b/i.test(b) && /\b(UPDATE|INSERT|DELETE)\b/i.test(b),
    );
    const n = wf.length + raw.length;
    if (n > 0) counts[rel] = n;
    for (const b of [...wf, ...raw]) if (/updatedAt/.test(b)) explicitUpdatedAt.push(rel);
  }
  return { counts, explicitUpdatedAt };
}

const load = () => walk(SRC).map((f) => ({ rel: toPosix(path.relative(SRC, f)), src: fs.readFileSync(f, 'utf8') }));

describe('#319 writers to the Workflow deletion clock (updatedAt)', () => {
  it('every workflow write site is in the allowlist (file:count), and none sets updatedAt explicitly', () => {
    const { counts, explicitUpdatedAt } = scanWriters(load());
    const actual = Object.entries(counts).map(([f, n]) => `${f}:${n}`).sort();
    expect(actual, 'workflow writer set changed: review deleted-row behaviour, then update ALLOWLIST').toEqual(
      Object.keys(ALLOWLIST).sort(),
    );
    expect(explicitUpdatedAt, 'a workflow write sets updatedAt explicitly (would corrupt the deletion clock)').toEqual([]);
  });

  it('the scanner detects a new writer and an explicit updatedAt', () => {
    const { counts, explicitUpdatedAt } = scanWriters([
      { rel: 'lib/scratch.ts', src: "await db.workflow.update({ where: { id }, data: { title: 'x' } });" },
      { rel: 'lib/scratch2.ts', src: 'await tx.workflow.updateMany({ data: { updatedAt: new Date() } });' },
      { rel: 'lib/scratch3.ts', src: 'await db.$executeRaw`UPDATE "Workflow" SET "updatedAt" = now()`;' },
    ]);
    expect(counts).toEqual({ 'lib/scratch.ts': 1, 'lib/scratch2.ts': 1, 'lib/scratch3.ts': 1 });
    expect(explicitUpdatedAt).toEqual(['lib/scratch2.ts', 'lib/scratch3.ts']);
  });
});
