/**
 * Route-parity regression gate for the SEO sitemap engine.
 *
 * SEO_AEO_EFFECTIVENESS_REVIEW_001 §5 P0-1 / §9: `/answers` was listed in the
 * sitemap (via `HUB_TYPES`) for weeks with no corresponding route file,
 * producing a live 404 embedded in the sitemap itself, every answer page's
 * breadcrumb, its JSON-LD, and `/llms.txt`. Every existing gate missed it
 * because the sitemap *asserts* routes from `PARENT_HUB` data rather than
 * *deriving* them from the filesystem (root defect class per the review's §5.1).
 *
 * This is "Gate A" from the review's proposed-fix list: walk the filesystem
 * and assert every hub URL the sitemap emits actually resolves to a route file.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARENT_HUB } from '@/content/registry';
import { generateSeoSitemapEntries } from './sitemap';
import type { PageType } from '@/content/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is .../apps/web-app/src/lib/seo
const PUBLIC_APP_DIR = resolve(__dirname, '..', '..', 'app', '(public)');

/** Every non-null PARENT_HUB entry is a claim that a hub route exists at `path`. */
const HUB_ENTRIES = Object.entries(PARENT_HUB).filter(
  (entry): entry is [PageType, { label: string; path: string }] => entry[1] !== null,
);

describe('sitemap ↔ filesystem route parity (Gate A)', () => {
  it('every PARENT_HUB path resolves to a real page.tsx on disk', () => {
    for (const [type, hub] of HUB_ENTRIES) {
      const routeFile = resolve(PUBLIC_APP_DIR, `.${hub.path}`, 'page.tsx');
      expect(existsSync(routeFile), `type=${type} hub.path=${hub.path} → ${routeFile}`).toBe(true);
    }
  });

  it('the /answers hub route exists (regression lock — was a live 404)', () => {
    const routeFile = resolve(PUBLIC_APP_DIR, 'answers', 'page.tsx');
    expect(existsSync(routeFile)).toBe(true);
  });

  it('generateSeoSitemapEntries emits exactly one URL per hub type, all route-backed', () => {
    const entries = generateSeoSitemapEntries();
    for (const [, hub] of HUB_ENTRIES) {
      const matches = entries.filter((e) => e.url.endsWith(hub.path));
      expect(matches.length, `expected exactly one sitemap entry for ${hub.path}`).toBe(1);
    }
  });

  it('sitemap generation is deterministic', () => {
    const a = JSON.stringify(generateSeoSitemapEntries());
    const b = JSON.stringify(generateSeoSitemapEntries());
    expect(a).toBe(b);
  });

  /**
   * Closes the residual gap recorded in commit 3ab0832.
   *
   * The checks above iterate `PARENT_HUB`, but the sitemap actually emits hub
   * URLs from `HUB_TYPES` × `ROUTE_PREFIX` (sitemap.ts:38-46) — a different
   * source. The two agree today, but nothing enforced it: a `HUB_TYPES` entry
   * whose `ROUTE_PREFIX` had no route file, or that was missing from
   * `PARENT_HUB` entirely, would still have slipped through and reproduced the
   * original `/answers` 404.
   *
   * These two assert on the sitemap's ACTUAL OUTPUT, so they hold regardless of
   * which internal array drifts. Hub entries are identified structurally by
   * `changeFrequency: 'weekly'` (leaves are 'monthly', sitemap.ts:51).
   */
  const hubEntries = () =>
    generateSeoSitemapEntries().filter((e) => e.changeFrequency === 'weekly');

  it('every hub URL the sitemap actually emits resolves to a page.tsx on disk', () => {
    const entries = hubEntries();
    expect(entries.length, 'expected the sitemap to emit at least one hub URL').toBeGreaterThan(0);

    for (const entry of entries) {
      const pathname = new URL(entry.url).pathname;
      const routeFile = resolve(PUBLIC_APP_DIR, `.${pathname}`, 'page.tsx');
      expect(existsSync(routeFile), `sitemap emits ${pathname} → no route at ${routeFile}`).toBe(
        true,
      );
    }
  });

  it('HUB_TYPES and PARENT_HUB agree — every emitted hub URL is a known PARENT_HUB path', () => {
    const knownHubPaths = new Set(HUB_ENTRIES.map(([, hub]) => hub.path));

    for (const entry of hubEntries()) {
      const pathname = new URL(entry.url).pathname;
      expect(
        knownHubPaths.has(pathname),
        `sitemap emits hub ${pathname}, which is not a PARENT_HUB path — ` +
          `HUB_TYPES/ROUTE_PREFIX has drifted from PARENT_HUB`,
      ).toBe(true);
    }
  });
});
