/**
 * Regression lock for the canonical Organization entity.
 *
 * SEO_AEO_EFFECTIVENESS_REVIEW_001 §5 P1-2 / frontend_analysis.md P1-2: every
 * one of the 164 registry-driven leaf pages emitted TWO conflicting
 * `Organization` JSON-LD nodes — the canonical sitewide one from
 * `app/layout.tsx` (`@id`-linked) and a second, disconnected one from
 * `generateJsonLd()` (no `@id`, a `knowsAbout` list that had silently
 * diverged from the sitewide one). Consumers (Google's entity graph, LLM
 * retrieval) saw two different descriptions of the same company and could
 * not reconcile them.
 *
 * The fix: the full node is now defined exactly once, in
 * `@/lib/seo/organization`. `generateJsonLd()`'s per-page `Organization`
 * entry, `Article.publisher`, and `SoftwareApplication.provider` all
 * reference it by `@id` instead of restating it. This file locks that
 * invariant so a future edit cannot silently reintroduce a second,
 * divergent Organization definition on any page.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_PAGES } from '@/content/registry';
import { generateJsonLd } from './jsonLd';
import {
  SITE_ORGANIZATION_ID,
  SITE_WEBSITE_ID,
  SITE_ORGANIZATION_NODE,
  SITE_WEBSITE_NODE,
  SITE_ORGANIZATION_KNOWS_ABOUT,
  SITE_ORGANIZATION_SAME_AS,
  SITE_ORGANIZATION_LOGO_PATH,
} from './organization';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is .../apps/web-app/src/lib/seo
const PUBLIC_DIR = resolve(__dirname, '..', '..', '..', 'public');
const ROOT_LAYOUT_FILE = resolve(__dirname, '..', '..', 'app', 'layout.tsx');

const KNOWN_BROKEN_LINKEDIN_URL = 'https://www.linkedin.com/company/ledgerium';

describe('canonical Organization entity — single source of truth', () => {
  it('the canonical Organization node carries the sitewide @id and non-empty entity signals', () => {
    expect(SITE_ORGANIZATION_NODE['@id']).toBe(SITE_ORGANIZATION_ID);
    expect(SITE_ORGANIZATION_NODE['@type']).toBe('Organization');
    expect(SITE_ORGANIZATION_NODE.name).toBe('Ledgerium AI');
    expect(SITE_ORGANIZATION_NODE.alternateName).toBeTruthy();
    expect(SITE_ORGANIZATION_NODE.description.length).toBeGreaterThan(0);
    expect(SITE_ORGANIZATION_NODE.logo?.url).toContain(SITE_ORGANIZATION_LOGO_PATH);
    expect(SITE_ORGANIZATION_NODE.knowsAbout).toEqual([...SITE_ORGANIZATION_KNOWS_ABOUT]);
    expect(SITE_ORGANIZATION_NODE.sameAs).toEqual([...SITE_ORGANIZATION_SAME_AS]);
  });

  it('the canonical WebSite node references the canonical Organization by @id, not by restating it', () => {
    expect(SITE_WEBSITE_NODE['@id']).toBe(SITE_WEBSITE_ID);
    expect(SITE_WEBSITE_NODE.publisher).toEqual({ '@id': SITE_ORGANIZATION_ID });
  });

  it('the logo asset referenced by the canonical Organization node actually exists on disk', () => {
    // Guards against the exact failure mode this task was warned against:
    // referencing an image path that is not a real, served file.
    const logoFile = resolve(PUBLIC_DIR, `.${SITE_ORGANIZATION_LOGO_PATH}`);
    expect(existsSync(logoFile), `expected ${logoFile} to exist`).toBe(true);
  });

  it('no sameAs entry points at the known-broken LinkedIn URL (verified 404, 2026-08-17)', () => {
    expect(SITE_ORGANIZATION_SAME_AS).not.toContain(KNOWN_BROKEN_LINKEDIN_URL);
    for (const url of SITE_ORGANIZATION_SAME_AS) {
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it('generateJsonLd() never emits a page-level Organization node — the canonical one from app/layout.tsx is already present on every page', () => {
    // This is the actual fix for the reported defect: previously every page
    // whose jsonLd array included 'Organization' emitted a SECOND,
    // disconnected Organization object here, alongside the sitewide one
    // layout.tsx always renders. The 'Organization' case in generateJsonLd()
    // is now a deliberate no-op (mirrors the pre-existing 'ItemList' no-op
    // pattern) — re-emitting even a same-@id reference would still mean two
    // <script> blocks both claiming to define an Organization, when only one
    // needs to exist per page.
    const pagesWithOrg = ALL_PAGES.filter((p) => p.jsonLd.includes('Organization'));
    expect(pagesWithOrg.length).toBeGreaterThan(0);

    for (const page of pagesWithOrg) {
      const objs = generateJsonLd(page);
      const orgNodes = objs.filter((o) => o['@type'] === 'Organization');
      expect(orgNodes.length, `page ${page.type}:${page.slug} should emit zero page-level Organization nodes`).toBe(0);
    }
  });

  it('every page whose jsonLd includes Article references the canonical Organization as publisher, not a redeclaration', () => {
    const pagesWithArticle = ALL_PAGES.filter((p) => p.jsonLd.includes('Article'));
    expect(pagesWithArticle.length).toBeGreaterThan(0);

    for (const page of pagesWithArticle) {
      const objs = generateJsonLd(page);
      const article = objs.find((o) => o['@type'] === 'Article');
      expect(article, `page ${page.type}:${page.slug} declares Article in jsonLd but none was emitted`).toBeDefined();
      expect(article!.publisher).toEqual({ '@id': SITE_ORGANIZATION_ID });
    }
  });

  it('every page whose jsonLd includes SoftwareApplication references the canonical Organization as provider, not a redeclaration', () => {
    const pagesWithSoftwareApp = ALL_PAGES.filter((p) => p.jsonLd.includes('SoftwareApplication'));
    expect(pagesWithSoftwareApp.length).toBeGreaterThan(0);

    for (const page of pagesWithSoftwareApp) {
      const objs = generateJsonLd(page);
      const app = objs.find((o) => o['@type'] === 'SoftwareApplication');
      expect(app, `page ${page.type}:${page.slug} declares SoftwareApplication in jsonLd but none was emitted`).toBeDefined();
      expect(app!.provider).toEqual({ '@id': SITE_ORGANIZATION_ID });
    }
  });

  it('no page emits a second Organization-shaped object carrying its own name/knowsAbout/sameAs (the original defect)', () => {
    for (const page of ALL_PAGES) {
      const objs = generateJsonLd(page);
      for (const obj of objs) {
        if (obj['@type'] !== 'Organization') continue;
        expect(obj).not.toHaveProperty('knowsAbout');
        expect(obj).not.toHaveProperty('sameAs');
        expect(obj).not.toHaveProperty('name');
      }
    }
  });

  it('the root layout sources the sitewide entity from @/lib/seo/organization and embeds it exactly once (source-text regression guard)', () => {
    // Static-text check, not a full render — deliberately the same style as
    // ./sitemap.test.ts and ./canonicalCoverage.test.ts: cheap, no import
    // side effects (app/layout.tsx pulls in AuthProvider/PostHogProvider/
    // next/font, which do not belong in a unit-test import graph), and
    // directly guards against a future edit reintroducing a hardcoded,
    // divergent Organization literal in the root layout.
    const text = readFileSync(ROOT_LAYOUT_FILE, 'utf8');
    expect(text).toMatch(/from ['"]@\/lib\/seo\/organization['"]/);
    expect(text).toContain('SITE_ORGANIZATION_NODE');
    expect(text).toContain('SITE_WEBSITE_NODE');
    // Exactly one @graph array, and it is not a second, hand-rolled
    // Organization object literal.
    const graphMatches = text.match(/@graph/g) ?? [];
    expect(graphMatches.length).toBe(1);
    expect(text).not.toMatch(/'@type':\s*'Organization'/);
  });
});
