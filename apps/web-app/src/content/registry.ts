/**
 * SEO page registry — collection access, route derivation, reserved-slug carve-out.
 *
 * RESERVED_SLUGS protects existing hand-built leaf pages from being shadowed or
 * duplicated by the dynamic engine (per SEO_AEO_SUPERPROMPT_V2 §1.2). The dynamic
 * routes' generateStaticParams MUST exclude these.
 */

import type { PageType, SeoPage } from './types';
import { COMPARE_PAGES } from './pages/compare';
import { WORKFLOW_PAGES } from './pages/workflow';
import { SOFTWARE_PAGES } from './pages/software';
import { PERSONA_PAGES } from './pages/persona';
import { PROBLEM_PAGES } from './pages/problem';
import { SOP_TEMPLATE_PAGES } from './pages/sop-template';
import { AI_OPPORTUNITY_PAGES } from './pages/ai-opportunity';
import { DEPARTMENT_PAGES } from './pages/department';
import { INDUSTRY_PAGES } from './pages/industry';
import { ALTERNATIVES_PAGES } from './pages/alternatives';
import { COMPETITORS_PAGES } from './pages/competitors';

/**
 * URL prefix per page type.
 * NOTE: workflow SEO pages live under /workflow-library/[slug], NOT /workflows —
 * the authenticated app already owns /workflows/[id], and Next.js forbids two
 * parallel dynamic routes at the same path. /workflow-library also matches the
 * strategy's "workflow library" concept.
 */
export const ROUTE_PREFIX: Record<PageType, string> = {
  workflow: '/workflow-library',
  sopTemplate: '/sop-templates',
  aiOpportunity: '/ai-opportunities',
  department: '/departments',
  software: '/software',
  industry: '/industries',
  persona: '/use-cases/personas',
  problem: '/use-cases/problems',
  compare: '/compare',
  alternatives: '/alternatives',
  competitors: '/competitors',
  libraryIndex: '/workflow-library',
};

/** Breadcrumb parent hub path per type (after Home). */
export const PARENT_HUB: Record<PageType, { label: string; path: string } | null> = {
  workflow: { label: 'Workflow Library', path: '/workflow-library' },
  sopTemplate: { label: 'SOP Templates', path: '/sop-templates' },
  aiOpportunity: { label: 'AI Opportunities', path: '/ai-opportunities' },
  department: { label: 'Departments', path: '/departments' },
  software: { label: 'Software', path: '/software' },
  industry: { label: 'Industries', path: '/industries' },
  persona: { label: 'Personas', path: '/use-cases/personas' },
  problem: { label: 'Problems', path: '/use-cases/problems' },
  // No public /compare hub (the authed app owns /compare); breadcrumb stops at Home.
  compare: null,
  alternatives: { label: 'Alternatives', path: '/alternatives' },
  competitors: { label: 'Competitors', path: '/competitors' },
  libraryIndex: null,
};

/**
 * Slugs owned by existing hand-built filesystem leaf pages. The dynamic engine
 * MUST NOT generate or claim these. Keyed by route segment.
 */
export const RESERVED_SLUGS: Record<string, ReadonlySet<string>> = {
  '/compare': new Set(['scribe']),
  // /use-cases/operations|compliance|ai-implementation are leaf pages but live at
  // /use-cases/<slug>, a different segment than /use-cases/personas|problems, so
  // they do not collide with the engine. Declared here for documentation only.
  '/use-cases': new Set(['operations', 'compliance', 'ai-implementation']),
};

export function isReservedSlug(type: PageType, slug: string): boolean {
  const reserved = RESERVED_SLUGS[ROUTE_PREFIX[type]];
  return reserved ? reserved.has(slug) : false;
}

/** All authored pages across Tranche-0 types. */
export const ALL_PAGES: readonly SeoPage[] = [
  ...COMPARE_PAGES,
  ...WORKFLOW_PAGES,
  ...SOFTWARE_PAGES,
  ...PERSONA_PAGES,
  ...PROBLEM_PAGES,
  ...SOP_TEMPLATE_PAGES,
  ...AI_OPPORTUNITY_PAGES,
  ...DEPARTMENT_PAGES,
  ...INDUSTRY_PAGES,
  ...ALTERNATIVES_PAGES,
  ...COMPETITORS_PAGES,
];

export function getPagesByType<T extends PageType>(type: T): SeoPage[] {
  return ALL_PAGES.filter((p) => p.type === type);
}

export function getBySlug(type: PageType, slug: string): SeoPage | undefined {
  return ALL_PAGES.find((p) => p.type === type && p.slug === slug);
}

/** Published + non-reserved pages — the set that is routable and indexable. */
export function getPublishedPages(): SeoPage[] {
  return ALL_PAGES.filter((p) => p.published && !isReservedSlug(p.type, p.slug));
}

/** Relative path for a page, e.g. /compare/tango. */
export function pagePath(page: Pick<SeoPage, 'type' | 'slug'>): string {
  return `${ROUTE_PREFIX[page.type]}/${page.slug}`;
}
