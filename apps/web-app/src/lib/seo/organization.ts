import { SITE_CONFIG } from '@/lib/config';

/**
 * Canonical sitewide Organization + WebSite entity.
 *
 * SEO_AEO_EFFECTIVENESS_REVIEW_001 §5 P1-2 / frontend_analysis.md P1-2: every
 * leaf page emitted a SECOND, disconnected `Organization` JSON-LD node (no
 * `@id`, a `knowsAbout` list that diverged from the sitewide one) alongside
 * the canonical one in `app/layout.tsx` — two different fact sets describing
 * the same real-world entity in the same document. Several hand-built pages
 * (`methodology`, 3 blog posts) independently re-declared a third, fourth,
 * fifth shape of the same entity.
 *
 * This file is now the single source of truth. `app/layout.tsx` embeds the
 * full node once, sitewide, via `SITE_WEBSITE_NODE` / `SITE_ORGANIZATION_NODE`.
 * Every other JSON-LD block that needs to say "this is published by /
 * provided by / about Ledgerium AI" references it by `@id`
 * (`SITE_ORGANIZATION_ID`) instead of restating it — the standard JSON-LD
 * node-reference convention, already used correctly elsewhere in this
 * codebase for `WebSite` (`jsonLd.ts`'s `webPage().isPartOf`).
 *
 * Deliberately depends on nothing but `@/lib/config` (which itself has zero
 * imports). `app/layout.tsx` is the ROOT layout and wraps every route in the
 * app, including the authenticated dashboard — importing the 164-page
 * content registry (as `./jsonLd.ts` does, for `PARENT_HUB` breadcrumbs)
 * into that import graph would be an avoidable bundle-size regression on
 * pages that have nothing to do with the public SEO surface.
 */

export const SITE_WEBSITE_ID = `${SITE_CONFIG.url}/#website`;
export const SITE_ORGANIZATION_ID = `${SITE_CONFIG.url}/#organization`;

/**
 * Genuine expertise areas only — not keyword-stuffing. Reconciled from two
 * divergent lists (layout.tsx had 5 incl. "AI integration"; jsonLd.ts's
 * per-page duplicate had 4, missing it). "AI integration" is kept: the
 * product ships an `aiOpportunity` content type and AI-opportunity scoring
 * is a real, shipped part of the product surface, not aspirational.
 */
export const SITE_ORGANIZATION_KNOWS_ABOUT = [
  'process intelligence',
  'workflow automation',
  'SOP documentation',
  'process mining',
  'AI integration',
] as const;

/**
 * Verified 2026-08-17 by direct fetch (not guessed): `GET
 * https://www.linkedin.com/company/ledgerium-ai` -> 200, canonical link
 * matches, `<title>Ledgerium AI | LinkedIn</title>`.
 *
 * The URL every one of these files previously shipped
 * (`/company/ledgerium`, no `-ai`) returns a live 404 — LinkedIn's generic
 * 404 shell, no "ledgerium" text anywhere in the response. That bug is fixed
 * here, not just "strengthened".
 *
 * No further profiles are added. Checked and deliberately NOT added:
 * `github.com/ledgerium` returns 200 but resolves to a different company
 * ("LUCA+", an unrelated auditing/blockchain project — consistent with the
 * brand-collision risk SEO_AEO_EFFECTIVENESS_REVIEW_001 §2.2 flags, and
 * exactly the kind of mistake a `sameAs` entry must not make). Crunchbase,
 * G2, and ProductHunt candidate URLs all returned 403 (bot-blocked,
 * unverifiable either way). X/Twitter handle candidates returned 404.
 */
export const SITE_ORGANIZATION_SAME_AS = ['https://www.linkedin.com/company/ledgerium-ai'] as const;

/**
 * `public/img/ledgerium_primary_logo.png` — 1536x512 wordmark lockup, the
 * only logo-shaped asset in `public/img/` that is actually the company's
 * brand mark. (`ledgerium_recorder_logo.png`, 1024x1024, is an unreferenced
 * extension-icon export — frontend_analysis.md P2-2 — not a company logo.)
 * Verified served 2026-08-17: `GET /img/ledgerium_primary_logo.png` -> 200
 * `image/png`, `content-length: 100817`, matching the committed file byte
 * for byte.
 */
export const SITE_ORGANIZATION_LOGO_PATH = '/img/ledgerium_primary_logo.png';
export const SITE_ORGANIZATION_LOGO_WIDTH = 1536;
export const SITE_ORGANIZATION_LOGO_HEIGHT = 512;

export const SITE_WEBSITE_NODE = {
  '@type': 'WebSite',
  '@id': SITE_WEBSITE_ID,
  url: SITE_CONFIG.url,
  name: 'Ledgerium AI',
  description: 'Evidence-based workflow intelligence: record real work, generate real documentation.',
  publisher: { '@id': SITE_ORGANIZATION_ID },
};

export const SITE_ORGANIZATION_NODE = {
  '@type': 'Organization',
  '@id': SITE_ORGANIZATION_ID,
  name: 'Ledgerium AI',
  // Disambiguates against unrelated same-name entities (an existing 2018
  // Ethereum-ICO "Ledgerium" token — SEO_AEO_EFFECTIVENESS_REVIEW_001 §2.2)
  // by stating plainly, in `alternateName` and `description` both, exactly
  // what kind of company this is.
  alternateName: 'Ledgerium',
  url: SITE_CONFIG.url,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_CONFIG.url}${SITE_ORGANIZATION_LOGO_PATH}`,
    width: SITE_ORGANIZATION_LOGO_WIDTH,
    height: SITE_ORGANIZATION_LOGO_HEIGHT,
  },
  description:
    'Ledgerium AI is workflow intelligence software. It records real browser-based work and turns it into SOPs, process maps, workflow intelligence reports, and AI opportunity reports.',
  knowsAbout: [...SITE_ORGANIZATION_KNOWS_ABOUT],
  sameAs: [...SITE_ORGANIZATION_SAME_AS],
};
