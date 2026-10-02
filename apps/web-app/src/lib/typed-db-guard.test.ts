import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Guard for row #11: database calls must stay type-checked.
 *
 * `(db as any).model.method(...)` turns off the compiler for that query. If the
 * model, field, relation or enum value does not exist in prisma/schema.prisma it
 * becomes a runtime failure instead of a compile error. Row #11 removed 71 such
 * casts (they were stale: Team/Analytics/Stripe models were added to the schema
 * after the casts were written and the casts were then copied forward). None hid
 * a real mismatch — but the next one might.
 *
 * Flagged (non-test source under src/):
 *   - `db as any` / `prisma as any` / `tx as any` (parenthesised or not)
 *   - `db.<delegate> as any`
 *   - a Prisma call whose result is cast `as any`
 *   - an interactive-transaction client typed `tx: any`
 *   - `@ts-ignore` / `@ts-expect-error` directly above a line that touches db/prisma/tx
 *
 * Use `Prisma.TransactionClient` for `tx`. For a genuinely dynamic delegate,
 * add the exact file + count to ALLOWED_UNTYPED_DB below with a reason.
 */

const SRC_ROOT = join(__dirname, '..');

/** file (posix, relative to src/) -> { count, reason }. Exact; empty today. */
const ALLOWED_UNTYPED_DB: Record<string, { count: number; reason: string }> = {};

export const UNTYPED_DB_PATTERNS: readonly RegExp[] = [
  /\b(?:db|prisma|tx|trx)\s+as\s+any\b/,
  /\b(?:db|prisma)\.\w+\s+as\s+any\b/,
  /\b(?:db|prisma|tx|trx)\.\w+\.\w+\([^)]*\)\s*as\s+any\b/,
  /\b(?:tx|trx)\s*:\s*any\b/,
];

const DB_TOUCH = /\b(?:db|prisma|tx|trx)\b/;
const TS_SUPPRESS = /@ts-(?:ignore|expect-error)/;

/** Returns 1-based line numbers of untyped-db sites in `source`. */
export function findUntypedDbSites(source: string): number[] {
  const lines = source.split(/\r?\n/);
  const hits: number[] = [];
  lines.forEach((line, i) => {
    const code = line.replace(/^\s*\/\/.*$/, '');
    if (UNTYPED_DB_PATTERNS.some((re) => re.test(code))) {
      hits.push(i + 1);
    } else if (TS_SUPPRESS.test(line) && DB_TOUCH.test(lines[i + 1] ?? '')) {
      hits.push(i + 1);
    }
  });
  return hits;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    if (!/\.tsx?$/.test(name)) return [];
    if (/\.(test|spec)\.tsx?$/.test(name)) return [];
    return [p];
  });
}

const FILES = sourceFiles(SRC_ROOT).map((p) => ({
  file: relative(SRC_ROOT, p).split(sep).join('/'),
  hits: findUntypedDbSites(readFileSync(p, 'utf8')),
}));

describe('typed-db guard (row #11)', () => {
  it('scans the source tree (a guard that scans nothing passes vacuously)', () => {
    expect(FILES.length).toBeGreaterThan(200);
  });

  it('detector flags every cast shape in the class', () => {
    expect(findUntypedDbSites('await (db as any).team.findMany({})')).toEqual([1]);
    expect(findUntypedDbSites('await db as any')).toEqual([1]);
    expect(findUntypedDbSites('const d = (prisma as any).user')).toEqual([1]);
    expect(findUntypedDbSites('const d = db.workflow as any;')).toEqual([1]);
    expect(findUntypedDbSites('const r = db.team.findMany({ where }) as any;')).toEqual([1]);
    expect(findUntypedDbSites('db.$transaction(async (tx: any) => {})')).toEqual([1]);
    expect(findUntypedDbSites('// @ts-expect-error stale\nawait db.team.count();')).toEqual([1]);
  });

  it('detector does not flag typed code or unrelated any', () => {
    expect(findUntypedDbSites('await db.team.findMany({})')).toEqual([]);
    expect(findUntypedDbSites('async (tx: Prisma.TransactionClient) => {}')).toEqual([]);
    expect(findUntypedDbSites('(window as any).__x = 1')).toEqual([]);
    expect(findUntypedDbSites('// was (db as any) before row #11')).toEqual([]);
  });

  it('no untyped db access outside the allowlist', () => {
    const offenders = FILES.filter((f) => {
      const allowed = ALLOWED_UNTYPED_DB[f.file]?.count ?? 0;
      return f.hits.length > allowed;
    }).map((f) => `${f.file}:${f.hits.join(',')}`);
    expect(
      offenders,
      'Untyped database access — use the typed client (Prisma.TransactionClient for tx). ' +
        'If genuinely dynamic, add an exact entry with a reason to ALLOWED_UNTYPED_DB.',
    ).toEqual([]);
  });

  it('allowlist entries are exact and carry a reason (no stale or padded entries)', () => {
    for (const [file, entry] of Object.entries(ALLOWED_UNTYPED_DB)) {
      const found = FILES.find((f) => f.file === file);
      expect(found, `allowlisted file not found: ${file}`).toBeDefined();
      expect(found!.hits.length, `allowlist count for ${file} is stale`).toBe(entry.count);
      expect(entry.reason.trim().length).toBeGreaterThan(10);
    }
  });
});
