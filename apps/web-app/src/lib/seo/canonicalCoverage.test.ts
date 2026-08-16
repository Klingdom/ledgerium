/**
 * Gate B — static-page canonical presence regression test.
 *
 * SEO_AEO_EFFECTIVENESS_REVIEW_001 §5 P0-2 / qa_analysis.md §5 "Gate B": 19
 * hand-built marketing pages (home, /product, /pricing, /docs, /blog + posts,
 * /support, /about, /security, /install, /privacy, /terms, /compare/scribe,
 * the 3 /use-cases/{operations,compliance,ai-implementation} leaves) shipped
 * with no `alternates.canonical` for months. They have just been fixed. But
 * `validateContent()` (`./validate.ts`, exercised by `content.test.ts`) is a
 * pure function over the 164-record `ALL_PAGES` registry — hand-built
 * `page.tsx` files are never `SeoPage` records, so they are structurally
 * invisible to it (qa_analysis.md §1). Nothing currently prevents the next
 * hand-built page from shipping the same way. This file is that gate.
 *
 * Design (matches qa_analysis.md §5 Gate B): source-text static analysis, not
 * a runtime `import()` of every page component. Dynamically importing every
 * `page.tsx` would pull in each component's full dependency graph (icons,
 * client components, env-dependent imports) just to read one field — slow,
 * brittle, and prone to unrelated false failures. A source-text scan is fast,
 * has zero import side effects, and matches this codebase's own precedent of
 * pure-data validation (`validate.ts`'s regex-based `SLUG_RE` check).
 *
 * HONESTY ABOUT WHAT THIS CAN AND CANNOT DETECT:
 *   - It CAN verify the `export const metadata` object literal contains an
 *     `alternates` key whose value contains a `canonical` key.
 *   - It CANNOT verify the canonical URL *resolves to the page's own route*
 *     (a page whose canonical literal points at a *different* page — a
 *     copy-paste mistake — would pass this gate; qa_analysis.md §5 Gate B
 *     assertion 2 flags this as a stretch goal, not implemented here).
 *   - It CANNOT see canonicals set via `generateMetadata` (dynamic, per-slug)
 *     — those are registry-driven pages, out of scope by design (see below).
 *   - It is a regex/brace-balance scan of source text, not a TypeScript AST
 *     walk. It will not survive adversarial reformatting of the metadata
 *     object literal designed to defeat it. It matches this file's plain,
 *     consistent authoring style, which is the only thing it needs to.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is .../apps/web-app/src/lib/seo
const PUBLIC_APP_DIR = resolve(__dirname, '..', '..', 'app', '(public)');

interface DiscoveredPage {
  /** Absolute filesystem path to the page.tsx file. */
  readonly file: string;
  /** URL route it serves, route-group segments already stripped by construction
   *  (we start the walk at the `(public)` directory itself, so `(public)` never
   *  appears in the derived route). '/' for the root page.tsx. */
  readonly route: string;
}

/**
 * Recursively walk a directory tree for every literal `page.tsx` file,
 * deriving each one's URL route from its position in the tree. No `next
 * build` required — this is a plain source-tree walk, deterministic and fast.
 * Sibling files (`layout.tsx`, client-component co-located files like
 * `LoginPageClient.tsx`, `ROICalculator.tsx`) are ignored; only the exact
 * filename `page.tsx` is treated as a route entry point, matching Next.js App
 * Router convention.
 */
function walkPageFiles(dir: string, urlPrefix = ''): DiscoveredPage[] {
  const out: DiscoveredPage[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkPageFiles(full, `${urlPrefix}/${entry.name}`));
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      out.push({ file: full, route: urlPrefix || '/' });
    }
  }
  return out;
}

/**
 * Dynamic route segments (`[slug]`, `[token]`, `[...rest]`) are registry- or
 * data-driven leaf pages. Their metadata is produced by a `generateMetadata`
 * function that ultimately delegates to `generateSeoMetadata()`
 * (`./metadata.ts:36`), which unconditionally sets `alternates: { canonical:
 * url }` for every `SeoPage` — it structurally cannot ship without a
 * canonical (already covered by the determinism assertions in
 * `content.test.ts`). Out of scope for this static scan by design: the task
 * is "hand-built pages ... NOT registry-driven."
 */
function isDynamicSegmentRoute(route: string): boolean {
  return route.split('/').some((seg) => /^\[.*\]$/.test(seg));
}

/** True if the file text declares a `generateMetadata` function (the dynamic,
 *  registry-driven pattern). Checked independently of the dynamic-segment
 *  filter above as a defensive belt-and-suspenders: today every
 *  `generateMetadata` page also happens to be a `[slug]` route, but nothing
 *  guarantees that stays true, and a page using this pattern is registry-
 *  driven regardless of its URL shape. */
function hasGenerateMetadata(text: string): boolean {
  return /export\s+(async\s+)?function\s+generateMetadata/.test(text);
}

/**
 * Extract the `export const metadata = { ... }` object-literal source text
 * via balanced-brace scanning (not a lazy regex across the whole file — a
 * lazy `[\s\S]*?` scan risks matching an unrelated later occurrence of the
 * word "canonical" elsewhere in the file, e.g. in a JSON-LD block, producing
 * a false pass). Returns null if no such export is found.
 */
function extractMetadataBlock(text: string): string | null {
  const idx = text.indexOf('export const metadata');
  if (idx === -1) return null;
  const braceStart = text.indexOf('{', idx);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(braceStart, i + 1);
    }
  }
  return null; // unbalanced braces — malformed source; treated as "no block found"
}

/** Does the extracted metadata block declare `alternates: { canonical: ... }`? */
function hasCanonical(metadataBlock: string): boolean {
  return /alternates\s*:\s*\{[^}]*canonical\s*:/s.test(metadataBlock);
}

// ---------------------------------------------------------------------------
// Real-repo scan
// ---------------------------------------------------------------------------

const ALL_PAGE_FILES = walkPageFiles(PUBLIC_APP_DIR);
const STATIC_PAGE_FILES = ALL_PAGE_FILES.filter((p) => !isDynamicSegmentRoute(p.route));

/**
 * Explicit, reviewable exclusion allowlist. Mirrors the `EXCLUDE_FROM_SITEMAP`
 * design proposed in qa_analysis.md §5 Gate A assertion 2 — a small, named,
 * commented list rather than a silent skip. Every entry needs a reason. Any
 * hand-built page NOT in this list, and not a dynamic-segment route, MUST
 * carry `alternates.canonical` or this gate fails and names the file.
 *
 * This is intentionally a route-keyed allowlist, not a page-content
 * hardcode: adding a canonical to a currently-excluded page does not require
 * touching this file, and a brand-new hand-built page is enforced by default
 * — it must either ship a canonical or be added here with a reason. That is
 * the "robust to the next page" property the task requires.
 */
const ACKNOWLEDGED_EXCEPTIONS: Record<string, string> = {
  '/demo':
    'next.config.js redirects() permanently redirects "/demo" → "/product" (source: "/demo", permanent: true). ' +
    'The request never reaches this page.tsx — Next.js intercepts and 301s before rendering. A canonical on an ' +
    'unreachable page is moot. (Same defect-class reasoning the review used to explain why /demo is correctly ' +
    'absent from the sitemap — SEO_AEO_EFFECTIVENESS_REVIEW_001 §5 footnote.)',
  '/install-extension':
    'next.config.js redirects() permanently redirects "/install-extension" → "/install" (301, unreachable). ' +
    'Same reasoning as /demo above; /install (the real, live page) already has a canonical.',
  '/login':
    'Auth/transactional page, not part of the SEO content surface: not in sitemap.ts staticEntries, not linked ' +
    'from the primary nav content sections, and produces zero organic-ranking value by design. Whether auth ' +
    'flows should be noindex\'d or canonical\'d is a separate, unaddressed question — flagged here, not silently ' +
    'fixed, and out of scope for the P0-2 marketing-page canonical defect this gate protects.',
  '/signup': 'Same reasoning as /login.',
  '/forgot-password': 'Same reasoning as /login.',
  '/reset-password':
    'Fully client-rendered page.tsx ("use client" at the top of the file) — the Next.js App Router forbids ' +
    'exporting `metadata` or `generateMetadata` from a Client Component, so this file structurally cannot carry ' +
    'a canonical without being restructured into a server-component wrapper (the pattern /login and ' +
    '/forgot-password already use via *PageClient.tsx). Same auth-flow scope exclusion as /login; the ' +
    'restructuring question is separate and unaddressed.',
};

describe('static-page canonical presence (Gate B)', () => {
  it('walker discovers the known hand-built and hub page.tsx set (sanity check)', () => {
    // Loose sanity lock on the walker itself, not an exhaustive inventory —
    // if this ever finds zero pages, or misses well-known routes, the walker
    // itself is broken and every other assertion below is meaningless.
    const routes = new Set(ALL_PAGE_FILES.map((p) => p.route));
    for (const known of ['/', '/product', '/pricing', '/answers', '/workflow-library', '/privacy/extension']) {
      expect(routes.has(known), `walker did not discover expected route ${known}`).toBe(true);
    }
    expect(ALL_PAGE_FILES.length).toBeGreaterThan(30);
  });

  it('every ACKNOWLEDGED_EXCEPTIONS entry corresponds to a real page.tsx under (public) — catches stale exclusions', () => {
    const knownRoutes = new Set(ALL_PAGE_FILES.map((p) => p.route));
    for (const route of Object.keys(ACKNOWLEDGED_EXCEPTIONS)) {
      expect(knownRoutes.has(route), `ACKNOWLEDGED_EXCEPTIONS has a stale entry: "${route}" — no page.tsx exists there anymore`).toBe(true);
    }
  });

  it('every enforced hand-built page.tsx exports alternates.canonical', () => {
    // SCOPE DECISION — /privacy/extension (per task instruction, decided and
    // documented here rather than silently excluded):
    //
    // /privacy/extension is a real, live, server-rendered page.tsx with a
    // static `export const metadata` block — structurally identical in kind
    // to /privacy and /terms (both of which DO have a canonical). It is
    // deliberately absent from `navConfig.ts` and `sitemap.ts` (almost
    // certainly because its purpose is the Chrome Web Store listing's
    // required privacy-policy link, not organic discovery). But it is NOT
    // disallowed in robots.ts (`disallow: ['/api/', '/dashboard/',
    // '/settings/', '/share/']` — `/privacy/extension` is not in that list)
    // and carries no `noindex`. If the Chrome Web Store listing (an external,
    // out-of-repo inbound link) or any other source ever links to it, it is
    // fully crawlable and indexable, and would compete with /privacy as
    // near-duplicate content with no canonical to declare which is
    // authoritative — exactly the P0-2 defect class this gate exists to
    // catch, just on a page the live-crawl audit could not have found
    // (SEO_AEO_EFFECTIVENESS_REVIEW_001 §9's crawl only covered the 194
    // *sitemap* URLs; an orphan page absent from both nav and sitemap is
    // invisible to a crawl-based audit by construction — the same kind of
    // structural blind spot §1 of qa_analysis.md describes for the
    // registry-validator).
    //
    // "Deliberately unlinked" is not one of this gate's principled exclusion
    // categories (unreachable-via-redirect / structurally-cannot-export-
    // metadata / auth-transactional-flow — see ACKNOWLEDGED_EXCEPTIONS
    // above). Manufacturing a one-off exception here, keyed on discoverability
    // rather than page kind, would be exactly the kind of ad hoc hand-
    // maintained carve-out this whole review is about eliminating. DECISION:
    // in scope. It currently has no canonical, so this assertion is expected
    // to fail on it until fixed — that is the gate working correctly on its
    // first run, not a bug in the gate. Reported separately as a new finding.
    const failures: string[] = [];
    for (const { file, route } of STATIC_PAGE_FILES) {
      if (ACKNOWLEDGED_EXCEPTIONS[route]) continue;
      const text = readFileSync(file, 'utf-8');
      if (hasGenerateMetadata(text)) continue; // belt-and-suspenders; see hasGenerateMetadata doc
      const block = extractMetadataBlock(text);
      if (block === null) {
        failures.push(
          `${route} (${file}) — no static "export const metadata" block found, and not in ` +
            `ACKNOWLEDGED_EXCEPTIONS. If this page intentionally has no per-page metadata (e.g. a Client ` +
            `Component inheriting the parent layout's metadata), add it to ACKNOWLEDGED_EXCEPTIONS with a reason.`,
        );
        continue;
      }
      if (!hasCanonical(block)) {
        failures.push(`${route} (${file}) — "export const metadata" has no alternates.canonical`);
      }
    }
    expect(failures, failures.length > 0 ? `\n${failures.join('\n')}` : '').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Self-test of the detection mechanism against synthetic fixtures.
//
// Proves the scanner itself (walkPageFiles / extractMetadataBlock /
// hasCanonical) actually discriminates canonical-present from canonical-
// absent pages, independent of the current state of the real repo. Runs
// entirely against a scratch temp directory created and torn down by the
// test — zero production source is read or written by this describe block.
// ---------------------------------------------------------------------------

describe('Gate B detection mechanism — self-test against synthetic fixtures', () => {
  function withScratchPage(source: string, run: (discovered: DiscoveredPage) => void): void {
    const scratch = mkdtempSync(join(tmpdir(), 'gate-b-selftest-'));
    try {
      const pageDir = join(scratch, 'synthetic-page');
      mkdirSync(pageDir, { recursive: true });
      writeFileSync(join(pageDir, 'page.tsx'), source);
      const discovered = walkPageFiles(scratch);
      expect(discovered).toHaveLength(1);
      run(discovered[0]!);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }

  it('FAILS to detect a canonical on a synthetic page that has none (proves the guard can actually fail)', () => {
    withScratchPage(
      `import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Synthetic page with no canonical',
  description: 'This mirrors the exact shape the 19 broken pages shipped with for months.',
};
export default function SyntheticPage() { return null; }
`,
      ({ file }) => {
        const text = readFileSync(file, 'utf-8');
        expect(hasGenerateMetadata(text)).toBe(false);
        const block = extractMetadataBlock(text);
        expect(block).not.toBeNull();
        expect(hasCanonical(block!)).toBe(false);
      },
    );
  });

  it('PASSES a synthetic page that does declare alternates.canonical', () => {
    withScratchPage(
      `import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Synthetic page with a canonical',
  description: 'This mirrors the correct, fixed shape.',
  alternates: { canonical: '/synthetic-page' },
};
export default function SyntheticPage() { return null; }
`,
      ({ file }) => {
        const block = extractMetadataBlock(readFileSync(file, 'utf-8'));
        expect(block).not.toBeNull();
        expect(hasCanonical(block!)).toBe(true);
      },
    );
  });

  it('does not false-positive on an unrelated "canonical" string outside the metadata block', () => {
    // Regression lock for the exact false-positive risk called out in the
    // module doc comment: a lazy `[\s\S]*?` scan across the whole file would
    // match this and incorrectly report a canonical. The balanced-brace
    // extraction must not.
    withScratchPage(
      `import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Synthetic page with no alternates block at all',
  description: 'Nothing in here declares an alternates key.',
};
const jsonLd = { '@type': 'WebPage', note: 'the canonical URL is https://example.com/elsewhere' };
export default function SyntheticPage() { return null; }
`,
      ({ file }) => {
        const block = extractMetadataBlock(readFileSync(file, 'utf-8'));
        expect(block).not.toBeNull();
        expect(block).not.toContain('canonical'); // proves extraction is scoped, not whole-file
        expect(hasCanonical(block!)).toBe(false);
      },
    );
  });

  it('a page using generateMetadata is correctly recognized as registry-driven and out of scope', () => {
    withScratchPage(
      `import type { Metadata } from 'next';
export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Dynamic', description: 'No static canonical block exists to scan.' };
}
export default function SyntheticSlugPage() { return null; }
`,
      ({ file }) => {
        expect(hasGenerateMetadata(readFileSync(file, 'utf-8'))).toBe(true);
      },
    );
  });

  it('isDynamicSegmentRoute recognizes [slug]-shaped route segments anywhere in the path', () => {
    expect(isDynamicSegmentRoute('/answers/[slug]')).toBe(true);
    expect(isDynamicSegmentRoute('/use-cases/personas/[slug]')).toBe(true);
    expect(isDynamicSegmentRoute('/share/[token]')).toBe(true);
    expect(isDynamicSegmentRoute('/answers')).toBe(false);
    expect(isDynamicSegmentRoute('/use-cases/personas')).toBe(false);
  });
});
