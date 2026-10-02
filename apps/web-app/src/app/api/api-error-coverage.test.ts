import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { API_ENDPOINT_PATTERN } from '@/lib/api-error-reporting';

/**
 * Coverage guard for row #246.
 *
 * Wiring 46 sites by hand fixes today's routes and nothing else: the next route
 * written with `{ status: 500 }` and no report would put the alert back into
 * the state this row found — green because nothing reports. So every explicit
 * 5xx this codebase sends is enforced here, structurally:
 *
 *  A. Every `{ status: 5xx }` literal is immediately preceded by
 *     `reportApiError('<this route's endpoint>', <that status>)`.
 *  B. Every route that builds a response from a VARIABLE status
 *     (`{ status }`) — the shape of a shared error helper — calls
 *     `reportApiError('<endpoint>', status)` in that helper.
 *  C. Every endpoint passed to `reportApiError` is the pattern derived from the
 *     file's own path. A copy-pasted call reporting another route's name would
 *     otherwise attribute this route's failures elsewhere — a wrong number,
 *     which is worse than a missing one.
 *
 * Not covered, and cannot be from source: an exception that escapes a handler
 * becomes a Next.js 500 without passing through any of this code. See the
 * module docstring in lib/api-error-reporting.ts.
 */

const API_ROOT = __dirname;
const APP_ROOT = join(__dirname, '..');

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routeFiles(p);
    return name === 'route.ts' ? [p] : [];
  });
}

function endpointFor(file: string): string {
  return '/' + relative(APP_ROOT, join(file, '..')).split(sep).join('/');
}

const ALL_ROUTES = routeFiles(APP_ROOT).map((file) => ({
  file: relative(APP_ROOT, file).split(sep).join('/'),
  endpoint: endpointFor(file),
  lines: readFileSync(file, 'utf8').split(/\r?\n/),
}));

const ROUTES = routeFiles(API_ROOT).map((file) => ({
  file: relative(API_ROOT, file).split(sep).join('/'),
  endpoint: endpointFor(file),
  lines: readFileSync(file, 'utf8').split(/\r?\n/),
}));

describe('api_error coverage guard (row #246)', () => {
  it('finds the route tree (a guard that scans nothing passes vacuously)', () => {
    expect(ROUTES.length).toBeGreaterThan(50);
    const literalSites = ROUTES.flatMap((r) => r.lines.filter((l) => /status: 5\d\d\b/.test(l)));
    // 46 at the time this guard was written. A floor, not an equality: the
    // point is that the scan is reaching real sites, not to freeze the count.
    expect(literalSites.length).toBeGreaterThanOrEqual(40);
  });

  it('A. every literal 5xx response is reported, with its own status', () => {
    const unreported: string[] = [];
    for (const r of ROUTES) {
      r.lines.forEach((line, i) => {
        const m = line.match(/status: (5\d\d)\b/);
        if (!m) return;
        let j = i;
        while (j >= 0 && !/^\s*return\b/.test(r.lines[j]!) && i - j < 15) j--;
        const before = j > 0 ? r.lines[j - 1]! : '';
        const expected = `reportApiError('${r.endpoint}', ${m[1]});`;
        if (before.trim() !== expected) unreported.push(`${r.file}:${i + 1} expected \`${expected}\` before its return`);
      });
    }
    expect(unreported).toEqual([]);
  });

  it('B. every variable-status response helper reports its status', () => {
    const missing = ROUTES
      // `{ status }` as an object literal — but not `${status}` inside a
      // template string, which is a log line, not a response.
      .filter((r) => r.lines.some((l) => /(^|[^$])\{\s*status\s*\}/.test(l)))
      .filter((r) => !r.lines.some((l) => l.trim() === `reportApiError('${r.endpoint}', status);`))
      .map((r) => r.file);
    expect(missing).toEqual([]);
  });

  it('C. every reported endpoint is the reporting route\'s own pattern', () => {
    const wrong: string[] = [];
    for (const r of ROUTES) {
      r.lines.forEach((line, i) => {
        for (const m of line.matchAll(/reportApiError\('([^']*)'/g)) {
          if (m[1] !== r.endpoint || !API_ENDPOINT_PATTERN.test(m[1]!)) {
            wrong.push(`${r.file}:${i + 1} reports '${m[1]}', file is '${r.endpoint}'`);
          }
        }
      });
    }
    expect(wrong).toEqual([]);
  });

  it("D. every exported HTTP method is wrapped with the file's own endpoint (rows #8 / #253)", () => {
    // An exception that escapes a handler becomes a Next.js 500 that no
    // application code sees. withApiRoute is what observes it, so a route that
    // exports a bare handler reopens that hole and fails here.
    const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const problems: string[] = [];
    let wrappedCount = 0;
    // MR-041 §3.3: this guard first scanned app/api only (72 of 74 files),
    // missing exactly the two force-static routes whose wrapping changes build
    // behaviour. It now scans every route.ts under app/.
    for (const r of ALL_ROUTES) {
      const text = r.lines.join('\n');
      // Every way a method can be exported: function declaration, const, or a
      // destructured re-export (`export const { GET } = handlers`).
      const exported = new Set<string>();
      for (const m of text.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)) exported.add(m[1]!);
      for (const m of text.matchAll(/^export\s+const\s+(\w+)\b/gm)) exported.add(m[1]!);
      // `export { handler as GET }` too — MR-041 found this form slipped past.
      for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
        for (const n of m[1]!.split(',')) exported.add(n.trim().split(/\s+as\s+/).pop()!.trim());
      }
      for (const m of text.matchAll(/^export\s+const\s*\{([^}]*)\}/gm)) {
        for (const n of m[1]!.split(',')) exported.add(n.trim().split(':')[0]!.trim());
      }
      const methods = METHODS.filter((mm) => exported.has(mm));
      if (methods.length === 0) problems.push(`${r.file}: exports no HTTP method`);
      // Escape EVERY regex metacharacter: route groups like `(public)` and
      // dotted names like `download.md` broke the bracket-only escape that
      // was here, the moment the scan reached outside app/api.
      const escapedEndpoint = r.endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const mm of methods) {
        const wrapped = new RegExp(`^export const ${mm} = withApiRoute\\('${escapedEndpoint}',`, 'm');
        if (wrapped.test(text)) wrappedCount++;
        else problems.push(`${r.file}: ${mm} is not wrapped as withApiRoute('${r.endpoint}', …)`);
      }
    }
    expect(problems).toEqual([]);
    // Vacuity floor: 95 handlers were wrapped when this guard was written.
    expect(wrappedCount).toBeGreaterThanOrEqual(95);
    expect(ALL_ROUTES.length, 'the route scan must reach outside app/api').toBeGreaterThan(ROUTES.length);
  });

  it('the route and root boundaries emit client_error with the constructor name only', () => {
    for (const [file, boundary] of [['error.tsx', 'route'], ['global-error.tsx', 'root']] as const) {
      const src = readFileSync(join(APP_ROOT, file), 'utf8');
      expect(src, file).toContain(
        `track({ event: 'client_error', errorName: safeErrorName(error), boundary: '${boundary}' });`,
      );
      // Never the message: no `error.message` may reach a track() call.
      expect(src.match(/track\([^)]*message/), file).toBeNull();
    }
  });
});
