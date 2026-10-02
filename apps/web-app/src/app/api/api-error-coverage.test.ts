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

describe('malformed-body guard (row #258)', () => {
  /**
   * A bare `req.json()` turns `{not json` into a thrown SyntaxError → a 500 that
   * counts against `api_error_spike`: a client mistake reported as a server
   * failure. A direct parse is allowed only when (a) it carries `.catch(`, or
   * (b) the file is listed here with the reason its failure is NOT a 5xx.
   * Everything else must go through `readJsonBody` (lib/read-json-body.ts).
   *
   * MR-041: the first count of this defect was a grep for the token and was
   * wrong by ~2x. This test checks the property per call site, and the list is
   * exact — a stale entry (site removed or converted) also fails, so the
   * allowlist cannot rot into a blanket exemption. The reasons are asserted by
   * review, not by this test: it cannot see what a catch block returns, which
   * is why each converted route that has its own try/catch has a route test.
   */
  const ALLOWED: Record<string, { sites: number; reason: string }> = {
    'api/admin/alerts/route.ts': { sites: 1, reason: 'own try; catch falls back to the default threshold' },
    'api/admin/email-test/route.ts': { sites: 1, reason: 'own try; catch falls back to the default recipient' },
    'api/admin/normalize-emails/route.ts': { sites: 1, reason: 'own try; catch falls back to dry-run' },
    'api/admin/password-reset-link/route.ts': { sites: 1, reason: 'own try; catch returns 400 bad_request' },
    'api/analytics/compare/route.ts': { sites: 1, reason: 'own try; catch returns 400' },
    'api/analytics/extension/route.ts': { sites: 1, reason: 'own try; catch returns 400' },
    'api/analytics/process-diff/route.ts': { sites: 1, reason: 'own try; catch returns 400 INVALID_JSON' },
    'api/dashboard/preferences/route.ts': { sites: 1, reason: 'own try; catch returns 400' },
    'api/sync/route.ts': { sites: 1, reason: 'own try; catch returns 400' },
    'api/workflows/[id]/ask/route.ts': { sites: 1, reason: 'own try; catch returns 400 INVALID_QUESTION' },
    'api/analytics/events/route.ts': {
      sites: 1,
      reason: 'fire-and-forget beacon: malformed batch answers 200 ok:false by design (#243), not a 5xx',
    },
  };

  const BARE = /\b(?:req|request)\.json\(\)/;

  function bareSites(): Map<string, number[]> {
    const out = new Map<string, number[]>();
    for (const r of ALL_ROUTES) {
      r.lines.forEach((line, i) => {
        if (!BARE.test(line)) return;
        const next = r.lines[i + 1] ?? '';
        if (/\.catch\(/.test(line) || /^\s*\.catch\(/.test(next)) return;
        const key = r.file;
        out.set(key, [...(out.get(key) ?? []), i + 1]);
      });
    }
    return out;
  }

  // ALL_ROUTES paths are relative to app/, e.g. api/tags/route.ts.
  it('no route parses a body with a bare req.json() unless allowlisted with a reason', () => {
    const found = bareSites();
    const unlisted = [...found].filter(([f]) => !(f in ALLOWED)).map(([f, ls]) => `${f}:${ls.join(',')}`);
    expect(unlisted, 'use readJsonBody(req) from @/lib/read-json-body, or add `.catch(`').toEqual([]);
  });

  it('every allowlist entry still matches exactly its stated number of sites (no stale exemptions)', () => {
    const found = bareSites();
    const stale = Object.entries(ALLOWED)
      .filter(([f, a]) => (found.get(f)?.length ?? 0) !== a.sites)
      .map(([f]) => f);
    expect(stale).toEqual([]);
  });
});

describe('error-text-in-response guard (row #262)', () => {
  /*
    Property: no route returns an error's message or stack to the client.
    Error messages in this codebase interpolate recorded user content (see
    lib/safe-error-name.ts); `withApiRoute` returns a fixed 500 body for that
    reason, and a hand-built `{ detail: err.message }` bypasses it. Row #262
    found three (`/api/upload`, `/api/seed-demo-data`, and `String(err)` in
    `/api/upload` + `/api/sync` 422 bodies) after a loop had claimed the class
    closed. This is a source scan, so it reads each route file for the shapes
    those leaks took; it cannot see a message laundered through a helper in
    lib/ (none exists today: grep found no NextResponse in lib/ outside
    feature-gating, read-json-body and with-api-route).
  */
  const LEAK = /\b(?:err|error|e|ex)\??\.(?:message|stack)\b|\bString\(\s*(?:err|error|e|ex)\s*\)|\.stack\b/;

  // Exact, reasoned exemptions. Each is a Zod issue `.message` — a description
  // of which field failed validation of the CALLER'S OWN request body, returned
  // only to that caller. Not an Error thrown by the server.
  const ALLOWED: Array<{ file: string; line: string; reason: string }> = [
    {
      file: 'api/analytics/extension/route.ts',
      line: "{ data: null, error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(', ')}` },",
      reason: 'Zod issue messages for the caller\'s own body',
    },
    {
      file: 'api/dashboard/preferences/route.ts',
      line: "error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(', ')}`,",
      reason: 'Zod issue messages for the caller\'s own body',
    },
    {
      file: 'api/workflows/[id]/route.ts',
      line: "details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),",
      reason: 'Zod issue messages for the caller\'s own body',
    },
    {
      file: 'api/sync/route.ts',
      line: 'validationErrors: JSON.stringify([String(err)]),',
      reason: 'DB write to Upload.validationErrors for support; the column is never read into a response (grep, row #262)',
    },
    {
      file: 'api/upload/route.ts',
      line: 'validationErrors: JSON.stringify([String(err)]),',
      reason: 'same as sync: a stored diagnostic, not a response body',
    },
  ];

  function leaks(): string[] {
    const out: string[] = [];
    for (const r of ALL_ROUTES) {
      r.lines.forEach((line, i) => {
        if (!LEAK.test(line)) return;
        const trimmed = line.trim();
        // Comments may name the pattern (this fix's own notes do).
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        if (ALLOWED.some((a) => a.file === r.file && a.line === trimmed)) return;
        out.push(`${r.file}:${i + 1} ${trimmed}`);
      });
    }
    return out;
  }

  it('no route builds a response from an error message, stack or String(err)', () => {
    expect(ALL_ROUTES.length).toBeGreaterThan(70); // a scan of nothing passes vacuously
    expect(leaks()).toEqual([]);
  });

  it('every allowlist entry still matches a real line (no stale exemptions)', () => {
    const stale = ALLOWED.filter((a) => {
      const route = ALL_ROUTES.find((r) => r.file === a.file);
      return !route || !route.lines.some((l) => l.trim() === a.line);
    }).map((a) => a.file);
    expect(stale).toEqual([]);
  });

  it('the scan pattern catches the shapes the leaks actually took', () => {
    for (const bad of [
      "detail: err?.message,",
      "const message = err instanceof Error ? err.message : 'x';",
      "details: [String(err)],",
      "{ stack: error.stack }",
    ]) {
      expect(LEAK.test(bad), bad).toBe(true);
    }
    expect(LEAK.test("error: 'Internal server error'")).toBe(false);
  });
});

describe('body-shape guard (row #261)', () => {
  /**
   * Property: a route that reads a JSON body puts a SCHEMA between the parse and
   * the first field read. Well-formed JSON of the wrong shape (`{"email": 5}`,
   * `null`) otherwise reaches a handler that dereferences it — a TypeError, a
   * Prisma validation error — and becomes a reported 5xx for a client mistake.
   *
   * Two things hold the property:
   *  1. TYPES. `readJsonBody` returns `unknown`, so a field read on its result
   *     does not compile. That is the real enforcement for `readJsonBody`.
   *  2. THIS SCAN, for what the types cannot see: a cast (`as {…}`) on the
   *     result defeats (1) — `keys` DELETE did exactly that — and the raw
   *     `req.json()` family returns `any`, so it has no type protection at all.
   *
   * A parse site passes when it is (a) `parseJsonBody(` (the schema is a
   * required argument), (b) `.safeParse(` on the same line, (c) assigned to a
   * name that the same file later passes to `.safeParse(` / `.parse(`, or (d)
   * listed below with the reason its handler validates inline. The scan is
   * textual: it proves a schema is APPLIED to the parsed value, not that the
   * schema is right — that is what the per-route tests and the producer table in
   * the row's close-out are for. It also cannot see a body read some other way
   * (`req.formData()`, `req.text()`): `/api/upload` type-checks its form field
   * and `/api/billing/webhook` verifies the Stripe signature before parsing.
   */
  const INLINE_VALIDATED: Record<string, { sites: number; reason: string }> = {
    'api/admin/alerts/route.ts': { sites: 1, reason: 'own try; `threshold` accepted only if === "P1"|"P2"|"P3"; anything else keeps the default' },
    'api/admin/email-test/route.ts': { sites: 1, reason: 'own try; `to` accepted only if typeof string and non-empty; anything else keeps the default' },
    'api/admin/normalize-emails/route.ts': { sites: 1, reason: 'own try; `apply` accepted only if typeof boolean; anything else is a dry run' },
    'api/admin/password-reset-link/route.ts': { sites: 1, reason: '`email` is typeof-checked before use; a non-string is a 400 bad_request' },
    'api/analytics/events/route.ts': { sites: 1, reason: 'beacon: own try; any non-conforming body answers 200 ok:false by design (#243), never a 5xx' },
    'api/billing/checkout/route.ts': { sites: 1, reason: 'own try; every field is allow-listed or typeof-checked and falls back to a default' },
    'api/invites/accept/route.ts': { sites: 1, reason: '`token` is typeof-checked before use; anything else is a 400' },
    'api/sync/route.ts': { sites: 1, reason: 'the bundle goes to validateBundle (a structural validator answering 422), not a Zod schema' },
  };

  const PARSE = /\breadJsonBody\(|\b(?:req|request)\.json\(\)/;

  function classify(lines: string[], i: number): 'schema' | 'inline' | 'cast' | 'unvalidated' {
    const line = lines[i]!;
    if (/\breadJsonBody\(.*\bas\b|\bas\b.*\breadJsonBody\(/.test(line) || /readJsonBody\([^)]*\)\s*\)?\s+as\s/.test(line)) return 'cast';
    // The schema must be applied to THIS parse (`safeParse(await req.json()…)`), not merely
    // appear on the line — `x = await readJsonBody(req); schema.safeParse({})` is a decoy.
    if (/\.safeParse\(\s*await\s+(?:readJsonBody\(|(?:req|request)\.json\(\))/.test(line)) return 'schema';
    const name = line.match(/^\s*(?:const|let)?\s*([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*await\b/)?.[1];
    if (name) {
      const rest = lines.slice(i + 1).join('\n');
      if (new RegExp(String.raw`\.(?:safeParse|parse)\(\s*${name}\s*\)`).test(rest)) return 'schema';
    }
    return 'inline';
  }

  function scan(files: Array<{ file: string; lines: string[] }>) {
    const unvalidated: string[] = [];
    const casts: string[] = [];
    const inlineByFile = new Map<string, number>();
    let schemaSites = 0;
    for (const r of files) {
      r.lines.forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('import ')) return;
        if (/\bparseJsonBody\(/.test(line)) {
          schemaSites++;
          return;
        }
        if (!PARSE.test(line)) return;
        const kind = classify(r.lines, i);
        if (kind === 'cast') casts.push(`${r.file}:${i + 1}`);
        else if (kind === 'schema') schemaSites++;
        else inlineByFile.set(r.file, (inlineByFile.get(r.file) ?? 0) + 1);
      });
    }
    for (const [f, n] of inlineByFile) {
      if (INLINE_VALIDATED[f]?.sites !== n) unvalidated.push(`${f} (${n} site${n === 1 ? '' : 's'})`);
    }
    const stale = Object.entries(INLINE_VALIDATED)
      .filter(([f, a]) => (inlineByFile.get(f) ?? 0) !== a.sites)
      .map(([f]) => f);
    return { unvalidated, casts, stale, schemaSites };
  }

  it('every parsed JSON body meets a schema, or is listed with its inline validation', () => {
    const { unvalidated, schemaSites } = scan(ALL_ROUTES);
    expect(schemaSites, 'the scan must reach real schema sites (vacuity floor)').toBeGreaterThanOrEqual(25);
    expect(unvalidated, 'apply a Zod schema (parseJsonBody) or list the file with a reason').toEqual([]);
  });

  it('no readJsonBody result is cast — a cast reopens the `any` hole the unknown type closed', () => {
    expect(scan(ALL_ROUTES).casts).toEqual([]);
  });

  it('every inline-validated entry still matches exactly its stated number of sites', () => {
    expect(scan(ALL_ROUTES).stale).toEqual([]);
  });

  it('the scan classifies the shapes it exists to catch (self-test)', () => {
    const f = (lines: string[]) => scan([{ file: 'api/x/route.ts', lines }]);
    // Violations
    expect(f(['const body = await readJsonBody(req);', 'return body.email;']).unvalidated).toHaveLength(1);
    expect(f(['const { id } = (await readJsonBody(req)) as { id: string };']).casts).toHaveLength(1);
    expect(f(['const body = await req.json().catch(() => ({}));', 'const label = body.label;']).unvalidated).toHaveLength(1);
    expect(f(['const { email } = await req.json().catch(() => null);']).unvalidated).toHaveLength(1);
    // Passes
    expect(f(['const body = await readJsonBody(req);', 'const p = schema.safeParse(body);']).unvalidated).toEqual([]);
    expect(f(['const p = schema.safeParse(await req.json().catch(() => null));']).unvalidated).toEqual([]);
    expect(f(['body = await req.json();', '}', 'const parsed = schema.safeParse(body);']).unvalidated).toEqual([]);
    expect(f(['const b = await parseJsonBody(req, schema);']).unvalidated).toEqual([]);
    expect(f(['const body = await readJsonBody(req); schema.safeParse({});']).unvalidated).toHaveLength(1);
    // A schema applied to a DIFFERENT value does not launder this one.
    expect(f(['const body = await readJsonBody(req);', 'const p = schema.safeParse(other);']).unvalidated).toHaveLength(1);
  });
});
