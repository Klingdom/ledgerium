import { describe, it, expect } from 'vitest';
import type { SeoPage, WorkflowPage } from '@/content/types';
import { ALL_PAGES, pagePath } from '@/content/registry';
import {
  buildLinkGraph,
  findOrphanedPages,
  getRelatedPages,
  MAX_ASSIGNED_OUTBOUND,
  MAX_RELATED_LINKS,
  MIN_INBOUND_LINKS,
  type LinkGraph,
} from './related';

/**
 * Internal-link graph invariant suite.
 *
 * The load-bearing assertion in this file is "zero published pages with fewer
 * than MIN_INBOUND_LINKS inbound contextual links". Before the graph builder
 * landed, 58 of 164 published pages had ZERO inbound contextual links (every
 * `alternatives` page, 7 of 10 `competitors` including `/competitors/soroco`,
 * 7 of 9 `industry`, ...) and 91 were below two. Nothing in the codebase
 * detected that, because each page's outbound row was decided locally.
 *
 * These tests exist so a future registry edit that re-orphans a page fails CI
 * instead of silently costing internal link equity.
 */

const PUBLISHED = ALL_PAGES.filter((p) => p.published);
const PUBLISHED_IDS = new Set(PUBLISHED.map((p) => `${p.type}:${p.slug}`));

function idOf(page: Pick<SeoPage, 'type' | 'slug'>): string {
  return `${page.type}:${page.slug}`;
}

function inboundOf(graph: LinkGraph, id: string): readonly string[] {
  return graph.inbound.get(id) ?? [];
}

/** Order-preserving, Map-free projection so two graphs can be compared byte-wise. */
function serialize(graph: LinkGraph): string {
  return JSON.stringify({
    nodeIds: graph.nodeIds,
    rows: graph.nodeIds.map((id) => ({
      id,
      curated: graph.curatedOutbound.get(id) ?? [],
      assigned: graph.assignedOutbound.get(id) ?? [],
      inbound: graph.inbound.get(id) ?? [],
      outbound: graph.outbound.get(id) ?? [],
    })),
    assignedEdges: graph.assignedEdges,
  });
}

/** Curated tokens a page is expected to keep, resolved exactly as the builder does. */
function expectedCurated(page: SeoPage): string[] {
  const self = idOf(page);
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const token of page.related) {
    if (token === self) continue;
    if (!PUBLISHED_IDS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    kept.push(token);
  }
  return kept;
}

// ── The invariant ────────────────────────────────────────────────────────────

describe('internal-link graph invariant', () => {
  it('leaves ZERO published pages below the minimum inbound-link count', () => {
    const orphans = findOrphanedPages();
    // Named so a regression report says WHICH pages were re-orphaned.
    expect(orphans).toEqual([]);
  });

  it('gives every published page at least MIN_INBOUND_LINKS inbound links', () => {
    const graph = buildLinkGraph();
    const underLinked = PUBLISHED.map((p) => idOf(p))
      .filter((id) => inboundOf(graph, id).length < MIN_INBOUND_LINKS);
    expect(underLinked).toEqual([]);
  });

  it('holds for every page type, including the types that were fully orphaned', () => {
    const graph = buildLinkGraph();
    const worstByType = new Map<string, number>();
    for (const page of PUBLISHED) {
      const count = inboundOf(graph, idOf(page)).length;
      const current = worstByType.get(page.type);
      if (current === undefined || count < current) worstByType.set(page.type, count);
    }
    for (const [type, worst] of worstByType) {
      expect(worst, `worst inbound count for type "${type}"`).toBeGreaterThanOrEqual(MIN_INBOUND_LINKS);
    }
    // `alternatives` was 15/15 orphaned and `competitors` 7/10 before the fix.
    expect(worstByType.get('alternatives') ?? 0).toBeGreaterThanOrEqual(MIN_INBOUND_LINKS);
    expect(worstByType.get('competitors') ?? 0).toBeGreaterThanOrEqual(MIN_INBOUND_LINKS);
  });

  it('links to /competitors/soroco, the one page with verified organic visibility', () => {
    const graph = buildLinkGraph();
    expect(inboundOf(graph, 'competitors:soroco').length).toBeGreaterThanOrEqual(MIN_INBOUND_LINKS);
  });

  it('reaches every published page from at least one other published page', () => {
    const graph = buildLinkGraph();
    const reachable = new Set<string>();
    for (const id of graph.nodeIds) {
      for (const link of graph.outbound.get(id) ?? []) reachable.add(link.path);
    }
    const unreached = PUBLISHED.map((p) => pagePath(p)).filter((path) => !reachable.has(path));
    expect(unreached).toEqual([]);
  });
});

// ── Determinism (Ledgerium core principle) ───────────────────────────────────

describe('internal-link graph determinism', () => {
  it('produces a byte-identical graph across two independent builds', () => {
    // Distinct array identities defeat the pool-keyed cache, so this really is
    // two full builds rather than one build read twice.
    const a = buildLinkGraph([...ALL_PAGES]);
    const b = buildLinkGraph([...ALL_PAGES]);
    expect(serialize(a)).toBe(serialize(b));
  });

  it('is insensitive to the order pages arrive in', () => {
    // Node order is pinned by (type asc, slug asc) inside the builder, so a
    // reversed registry must yield the same graph. This is the assertion that
    // catches an accidental reliance on registry declaration order.
    const forward = buildLinkGraph([...ALL_PAGES]);
    const reversed = buildLinkGraph([...ALL_PAGES].reverse());
    expect(serialize(reversed)).toBe(serialize(forward));
  });

  it('returns byte-identical rows from getRelatedPages across calls', () => {
    for (const page of ALL_PAGES) {
      expect(JSON.stringify(getRelatedPages(page))).toBe(JSON.stringify(getRelatedPages(page)));
    }
  });
});

// ── Curated intent is never dropped or reordered ─────────────────────────────

describe('curated `related` preservation', () => {
  it('keeps every resolvable curated token, in authored order', () => {
    const graph = buildLinkGraph();
    for (const page of PUBLISHED) {
      expect(graph.curatedOutbound.get(idOf(page)), idOf(page)).toEqual(expectedCurated(page));
    }
  });

  it('renders curated links first, before any auto-assigned link', () => {
    const pathById = new Map<string, string>(PUBLISHED.map((p): [string, string] => [idOf(p), pagePath(p)]));
    for (const page of PUBLISHED) {
      const curated = expectedCurated(page);
      const head = getRelatedPages(page)
        .slice(0, curated.length)
        .map((link) => link.path);
      expect(head, idOf(page)).toEqual(curated.map((id) => pathById.get(id)));
    }
  });
});

// ── Shape / quality guards on the rendered rows ──────────────────────────────

describe('rendered related-links rows', () => {
  it('never exceeds the rendered ceiling and never renders a dead end', () => {
    for (const page of PUBLISHED) {
      const row = getRelatedPages(page);
      expect(row.length, idOf(page)).toBeLessThanOrEqual(MAX_RELATED_LINKS);
      expect(row.length, idOf(page)).toBeGreaterThanOrEqual(2);
    }
  });

  it('never self-links and never repeats a target within a row', () => {
    for (const page of PUBLISHED) {
      const row = getRelatedPages(page);
      const own = pagePath(page);
      const paths = row.map((link) => link.path);
      expect(paths, idOf(page)).not.toContain(own);
      expect(new Set(paths).size, idOf(page)).toBe(paths.length);
    }
  });

  it('only ever points at published pages (no dangling targets)', () => {
    const publishedPaths = new Set(PUBLISHED.map((p) => pagePath(p)));
    for (const page of PUBLISHED) {
      for (const link of getRelatedPages(page)) {
        expect(publishedPaths.has(link.path), `${idOf(page)} -> ${link.path}`).toBe(true);
      }
    }
  });

  it('gives every link a non-empty "why related" label', () => {
    for (const page of PUBLISHED) {
      for (const link of getRelatedPages(page)) {
        expect(link.why.trim().length, `${idOf(page)} -> ${link.path}`).toBeGreaterThan(0);
      }
    }
  });
});

// ── Equity: added links are surgical, not a link farm ────────────────────────

describe('auto-assigned edges distribute equity instead of pooling it', () => {
  it('hosts at most MAX_ASSIGNED_OUTBOUND extra links on any single page', () => {
    const graph = buildLinkGraph();
    for (const id of graph.nodeIds) {
      expect((graph.assignedOutbound.get(id) ?? []).length, id).toBeLessThanOrEqual(MAX_ASSIGNED_OUTBOUND);
    }
  });

  it('only adds inbound links to pages the curated graph left short', () => {
    const graph = buildLinkGraph();
    const curatedInbound = new Map<string, number>(graph.nodeIds.map((id): [string, number] => [id, 0]));
    for (const id of graph.nodeIds) {
      for (const target of graph.curatedOutbound.get(id) ?? []) {
        curatedInbound.set(target, (curatedInbound.get(target) ?? 0) + 1);
      }
    }
    for (const edge of graph.assignedEdges) {
      expect(curatedInbound.get(edge.to) ?? 0, `assigned inbound to ${edge.to}`).toBeLessThan(MIN_INBOUND_LINKS);
    }
  });

  it('never over-serves a page beyond the minimum it needed', () => {
    const graph = buildLinkGraph();
    const received = new Map<string, number>();
    for (const edge of graph.assignedEdges) {
      received.set(edge.to, (received.get(edge.to) ?? 0) + 1);
    }
    for (const [id, count] of received) {
      expect(count, id).toBeLessThanOrEqual(MIN_INBOUND_LINKS);
    }
  });

  it('picks every donor on a positive affinity score, never at random', () => {
    const graph = buildLinkGraph();
    const zeroScore = graph.assignedEdges.filter((e) => e.score <= 0).map((e) => `${e.from} -> ${e.to}`);
    expect(zeroScore).toEqual([]);
  });
});

// ── Mechanism tests on synthetic pools (independent of current content) ──────

function makeWorkflow(slug: string, tags: readonly string[], related: readonly string[], published = true): WorkflowPage {
  return {
    type: 'workflow',
    slug,
    metaTitle: `Meta title for ${slug}`,
    metaDescription: `Meta description for ${slug}`,
    h1: `H1 ${slug}`,
    eyebrow: 'Workflow',
    shortAnswer: `Short answer for ${slug}.`,
    primaryKeyword: slug,
    secondaryKeywords: [],
    searchIntent: 'informational',
    tags,
    related,
    originalDataPoint: `Data point for ${slug}.`,
    keyTakeaways: ['One.', 'Two.', 'Three.'],
    mechanismIntro: `Mechanism intro for ${slug}.`,
    honestLimitation: `Limitation for ${slug}.`,
    faqs: [],
    jsonLd: [],
    author: { name: 'Test Author' },
    updatedAt: '2026-01-01',
    published,
    whoUsesIt: '',
    systems: [],
    oldWay: '',
    ledgeriumWay: '',
    steps: [],
    commonMistakes: [],
    metrics: [],
    aiOpportunities: [],
  };
}

describe('graph builder mechanism', () => {
  it('auto-fills inbound links for pages the curated graph never references', () => {
    // alpha and bravo are already well linked. charlie, delta, echo and foxtrot
    // are hard orphans — exactly the shape the 58 real orphans had.
    const pool: SeoPage[] = [
      makeWorkflow('alpha', ['finance', 'approval'], ['workflow:bravo']),
      makeWorkflow('bravo', ['finance', 'approval'], ['workflow:alpha']),
      makeWorkflow('charlie', ['finance', 'invoice'], ['workflow:alpha', 'workflow:bravo']),
      makeWorkflow('delta', ['hr', 'onboarding'], []),
      makeWorkflow('echo', ['hr', 'onboarding'], []),
      makeWorkflow('foxtrot', ['it', 'access'], []),
    ];

    expect(findOrphanedPages(pool)).toEqual([]);

    const graph = buildLinkGraph(pool);
    for (const id of graph.nodeIds) {
      expect((graph.inbound.get(id) ?? []).length, id).toBeGreaterThanOrEqual(MIN_INBOUND_LINKS);
    }
    // The single curated edge survives, and stays first in alpha's row.
    expect(graph.curatedOutbound.get('workflow:alpha')).toEqual(['workflow:bravo']);
    const alphaRow = graph.outbound.get('workflow:alpha') ?? [];
    expect(alphaRow[0]?.path).toBe('/workflow-library/bravo');
  });

  it('prefers a topical donor over an unrelated one', () => {
    const pool: SeoPage[] = [
      makeWorkflow('target-page', ['payroll', 'timesheets'], []),
      makeWorkflow('topical-one', ['payroll', 'timesheets'], []),
      makeWorkflow('topical-two', ['payroll', 'timesheets'], []),
      makeWorkflow('unrelated-one', ['shipping'], []),
      makeWorkflow('unrelated-two', ['shipping'], []),
    ];
    const graph = buildLinkGraph(pool);
    const sources = graph.inbound.get('workflow:target-page') ?? [];
    expect(sources).toEqual(['workflow:topical-one', 'workflow:topical-two']);
  });

  it('excludes unpublished pages as both nodes and link targets', () => {
    const pool: SeoPage[] = [
      makeWorkflow('alpha', ['finance'], ['workflow:draft']),
      makeWorkflow('bravo', ['finance'], []),
      makeWorkflow('charlie', ['finance'], []),
      makeWorkflow('draft', ['finance'], [], false),
    ];
    const graph = buildLinkGraph(pool);
    expect(graph.nodeIds).not.toContain('workflow:draft');
    expect(graph.curatedOutbound.get('workflow:alpha')).toEqual([]);
    for (const id of graph.nodeIds) {
      for (const link of graph.outbound.get(id) ?? []) {
        expect(link.path).not.toBe('/workflow-library/draft');
      }
    }
  });

  it('is deterministic on a synthetic pool regardless of input order', () => {
    const build = (): SeoPage[] => [
      makeWorkflow('alpha', ['finance', 'approval'], ['workflow:bravo']),
      makeWorkflow('bravo', ['finance'], []),
      makeWorkflow('charlie', ['hr'], []),
      makeWorkflow('delta', ['hr', 'approval'], []),
    ];
    expect(serialize(buildLinkGraph(build().reverse()))).toBe(serialize(buildLinkGraph(build())));
  });

  it('degrades without throwing when the pool is too small to satisfy the invariant', () => {
    // Two pages can only ever give each other one inbound link apiece. The
    // builder must report the shortfall rather than loop, throw, or fabricate a
    // self-link — this is what proves the invariant assertion above is operative
    // and not vacuously true.
    const pool: SeoPage[] = [makeWorkflow('alpha', ['finance'], []), makeWorkflow('bravo', ['finance'], [])];
    const graph = buildLinkGraph(pool);
    expect((graph.inbound.get('workflow:alpha') ?? []).length).toBe(1);
    expect((graph.inbound.get('workflow:bravo') ?? []).length).toBe(1);
    expect(findOrphanedPages(pool)).toEqual(['workflow:alpha', 'workflow:bravo']);
  });
});
