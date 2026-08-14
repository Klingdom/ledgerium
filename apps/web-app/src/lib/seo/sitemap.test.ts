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
});
