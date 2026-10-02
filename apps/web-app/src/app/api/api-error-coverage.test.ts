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

describe('error-text-in-response guard (rows #262, #267)', () => {
  /*
    Property: no route, and no lib/ helper whose return value can flow into a
    response, returns an error's message or stack to the client. Error messages
    in this codebase interpolate recorded user content (lib/safe-error-name.ts);
    `withApiRoute` returns a fixed 500 body for that reason.

    Row #262 scanned route files for catch variables named err|error|e|ex. Row
    #267 found the two holes that left: a helper in lib/ that returned
    `(err as Error).message` (lib/email.ts, spread into the admin/email-test
    502), and any catch binding with another name. This version:

      1. Collects EVERY catch binding in the file (`catch (x)`, `.catch((x) =>`,
         `.catch(function (x)`), on top of the usual names.
      2. Flags `.message` / `.stack` on ANYTHING (not just those names), and for
         each collected binding: `String(x)`, `${x}`, `x.toString()`,
         `JSON.stringify(x)`, and `error|err|detail|details|reason|cause: x`
         (the raw error object handed back inside a result).
      3. Scans BOTH route files and every non-test file under lib/.

    Lines that are comments or console.* log calls are exempt (a log is not a
    response). Everything else needs an exact, reasoned allowlist entry.

    LIMITS (a source scan, not taint analysis): it is line-based, so a message
    split across lines (`err\n.message`) or read through a destructure
    (`const { message } = err`) is invisible; it does not follow a raw error
    object passed through a variable into a response (`const out = err; return
    json(out)`), only the `error: x` shape; and it does not scan components,
    hooks, pages, server components, middleware or scripts. Those render in the
    caller's own browser or never reach a response body; if one ever builds a
    response it is a route or lib file, which are scanned. The property is held
    for what the scan can see and by review for what it cannot.
  */
  // `e` is deliberately not listed: as a loop variable it is everywhere, and a real
  // `catch (e)` / `.catch((e) =>` is collected below anyway.
  const ALWAYS_NAMES = ['err', 'error'];

  function bindingNames(lines: string[]): string[] {
    const text = lines.join('\n');
    const names = new Set(ALWAYS_NAMES);
    for (const m of text.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]!);
    for (const m of text.matchAll(/\.catch\(\s*(?:async\s*)?(?:function\s*\w*\s*)?\(?\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]!);
    return [...names];
  }

  function leakShapes(names: string[]): RegExp[] {
    const alt = names.map((n) => n.replace(/\$/g, '\\$')).join('|');
    return [
      /\.(?:message|stack)\b/,
      new RegExp(String.raw`\bString\(\s*(?:${alt})\s*\)`),
      new RegExp(String.raw`\$\{\s*(?:${alt})\s*\}`),
      new RegExp(String.raw`\b(?:${alt})\??\.toString\(\)`),
      new RegExp(String.raw`\bJSON\.stringify\(\s*(?:${alt})\s*\)`),
      new RegExp(String.raw`\b(?:error|err|detail|details|reason|cause)\s*:\s*(?:${alt})\s*[,}]`),
    ];
  }

  function isExemptLine(trimmed: string): boolean {
    return (
      trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || /^console\.\w+\(/.test(trimmed)
    );
  }

  /** Pure scan of one file's lines; returns the trimmed line + 1-based number per leak. */
  function scanFile(lines: string[]): Array<{ n: number; line: string }> {
    const shapes = leakShapes(bindingNames(lines));
    const out: Array<{ n: number; line: string }> = [];
    lines.forEach((raw, i) => {
      const trimmed = raw.trim();
      if (isExemptLine(trimmed)) return;
      if (shapes.some((re) => re.test(trimmed))) out.push({ n: i + 1, line: trimmed });
    });
    return out;
  }

  // Exact, reasoned exemptions.
  const ZOD = "Zod issue messages for the caller's own body";
  const ALERT = 'an alert object built from fixed templates in compute-alerts.ts - not an Error';
  const ALLOWED: Array<{ file: string; line: string; reason: string }> = [
    {
      file: 'api/analytics/extension/route.ts',
      line: "{ data: null, error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(', ')}` },",
      reason: ZOD,
    },
    {
      file: 'api/dashboard/preferences/route.ts',
      line: "error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(', ')}`,",
      reason: ZOD,
    },
    {
      file: 'api/workflows/[id]/route.ts',
      line: "details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),",
      reason: ZOD,
    },
    {
      file: 'lib/ingestion.ts',
      line: "(e) => `${e.path.join('.')}: ${e.message}`,",
      reason: `${ZOD}: validateBundle's errors reach the 422 of /api/upload and /api/sync, echoing the caller's own uploaded bundle to the caller`,
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
    {
      file: 'api/auth/signup/route.ts',
      line: "{ error: parsed.error.errors[0]?.message ?? 'Invalid input' },",
      reason: "signupSchema's own authored strings; its fields have no enum/literal, so Zod's default messages name a type, not the caller's value",
    },
    { file: 'lib/notifications.ts', line: '`[alert] ${SEVERITY_EMOJI[alert.severity]} ${alert.severity}: ${alert.title} — ${alert.message}`,', reason: ALERT },
    {
      file: 'lib/notifications.ts',
      line: "text: `${emoji} *${alert.severity}: ${alert.title}*\\n${alert.message}${alert.value != null ? `\\nValue: \\`${alert.value}\\`` : ''}`,",
      reason: ALERT,
    },
    {
      file: 'lib/notifications.ts',
      line: '<p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">${alert.message}</p>',
      reason: ALERT,
    },
    { file: 'api/admin/alerts/route.ts', line: 'message: a.message,', reason: ALERT },
    { file: 'api/admin/alerts/check/route.ts', line: 'message: a.message,', reason: ALERT },
  ];

  const SRC_LIB = join(__dirname, '..', '..', 'lib');
  function libFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return name === '__tests__' ? [] : libFiles(p);
      return /\.tsx?$/.test(name) && !/\.(?:test|spec)\.tsx?$/.test(name) ? [p] : [];
    });
  }
  const LIB = libFiles(SRC_LIB).map((file) => ({
    file: 'lib/' + relative(SRC_LIB, file).split(sep).join('/'),
    lines: readFileSync(file, 'utf8').split(/\r?\n/),
  }));
  const SCANNED = [...ALL_ROUTES.map((r) => ({ file: r.file, lines: r.lines })), ...LIB];

  function leaks(): string[] {
    const out: string[] = [];
    for (const f of SCANNED) {
      for (const hit of scanFile(f.lines)) {
        if (ALLOWED.some((a) => a.file === f.file && a.line === hit.line)) continue;
        out.push(`${f.file}:${hit.n} ${hit.line}`);
      }
    }
    return out;
  }

  it('no route or lib helper builds a response value from an error message, stack or String(err)', () => {
    expect(ALL_ROUTES.length).toBeGreaterThan(70); // a scan of nothing passes vacuously
    expect(LIB.length, 'the lib scan must reach real files').toBeGreaterThan(30);
    expect(leaks()).toEqual([]);
  });

  it('every allowlist entry still matches a real line (no stale exemptions)', () => {
    const stale = ALLOWED.filter((a) => {
      const f = SCANNED.find((s) => s.file === a.file);
      return !f || !f.lines.some((l) => l.trim() === a.line);
    }).map((a) => `${a.file}: ${a.line}`);
    expect(stale).toEqual([]);
  });

  it('the scan pattern catches the shapes the leaks actually took', () => {
    for (const bad of [
      'detail: err?.message,',
      "const message = err instanceof Error ? err.message : 'x';",
      'details: [String(err)],',
      '{ stack: error.stack }',
      'error: (err as Error).message,', // lib/email.ts, row #267
    ]) {
      expect(scanFile([bad]).length, bad).toBe(1);
    }
    expect(scanFile(["error: 'Internal server error'"])).toEqual([]);
    expect(scanFile(["console.error('[x] failed', err.message);"])).toEqual([]);
    expect(scanFile(['// notes may say err.message'])).toEqual([]);
  });

  it('MUTATION: a leak through a catch binding with ANY name is caught (the old guard saw only err|error|e|ex)', () => {
    for (const src of [
      ['try { f(); } catch (thrown) {', '  return json({ detail: String(thrown) });', '}'],
      ['try { f(); } catch (boom) {', '  return json({ detail: `${boom}` });', '}'],
      ['try { f(); } catch (boom) {', '  return json({ detail: boom.toString() });', '}'],
      ['try { f(); } catch (cause) {', '  return json({ error: JSON.stringify(cause) });', '}'],
      ['try { f(); } catch (delErr) {', '  return json({ error: delErr });', '}'],
      ['p.catch((reason2) => json({ detail: String(reason2) }));'],
      ['p.catch(function (oops) { return json({ detail: `${oops}` }); });'],
      ['try { f(); } catch (anything) {', '  return json({ detail: anything.message });', '}'],
    ]) {
      expect(scanFile(src).length, src.join(' / ')).toBeGreaterThan(0);
    }
    // And the binding name does not make a clean file dirty.
    expect(scanFile(['try { f(); } catch (thrown) {', "  return json({ error: 'x' });", '}'])).toEqual([]);
  });

  it('MUTATION: a lib helper that returns an error message is caught (row #267)', () => {
    const helper = [
      'export async function probe() {',
      '  try {',
      '    await send();',
      '    return { ok: true, error: null };',
      '  } catch (failure) {',
      '    return { ok: false, error: (failure as Error).message };',
      '  }',
      '}',
    ];
    expect(scanFile(helper)).toEqual([{ n: 6, line: 'return { ok: false, error: (failure as Error).message };' }]);
    // The raw error object handed back in a result is the other shape.
    expect(scanFile(['  } catch (failure) {', '    return { ok: false, error: failure };']).length).toBe(1);
    // lib/email.ts as shipped is clean.
    const email = LIB.find((f) => f.file === 'lib/email.ts');
    expect(email).toBeDefined();
    expect(scanFile(email!.lines)).toEqual([]);
    // ...and the real file with its old line put back is not.
    const regressed = email!.lines.map((l) =>
      l.includes('return failure(provider, true, classifyEmailError(err), config);')
        ? 'return { provider, attempted: true, success: false, error: (err as Error).message, config };'
        : l,
    );
    expect(regressed).not.toEqual(email!.lines);
    expect(scanFile(regressed).length).toBe(1);
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
