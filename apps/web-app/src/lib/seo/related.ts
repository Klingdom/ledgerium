import type { PageType, SeoPage } from '@/content/types';
import { ALL_PAGES, ROUTE_PREFIX } from '@/content/registry';

/**
 * Deterministic internal-link graph for the SEO/AEO page engine.
 *
 * ── Why this is a graph builder and not a per-page lookup ────────────────────
 * Inbound link count is a GLOBAL property. The previous resolver decided each
 * page's outbound links locally (curated `related` tokens first, tag-overlap
 * fill to `limit`), which meant:
 *   - 159 of 164 published pages declare exactly 3 curated tokens, so the
 *     tag-overlap fill at `limit = 3` was unreachable dead code, and
 *   - the rendered graph was exactly the curated graph, which left 58 published
 *     pages with ZERO inbound contextual links (all 15 `alternatives` pages,
 *     7 of 10 `competitors` including `/competitors/soroco`, 7 of 9 `industry`,
 *     and so on) and 91 pages below two inbound links.
 *
 * Internal links are the only link equity a zero-authority domain fully
 * controls, so orphaning is a real ranking cost, not a cosmetic one. This
 * module therefore builds the whole graph once and enforces a structural
 * invariant over it:
 *
 *   EVERY published page has at least MIN_INBOUND_LINKS inbound contextual
 *   links from other published pages.
 *
 * ── How ──────────────────────────────────────────────────────────────────────
 * 1. Curated edges are taken verbatim: every resolvable `related` token, in
 *    authored order, always first in the rendered row. Nothing is dropped or
 *    reordered.
 * 2. Pages still below MIN_INBOUND_LINKS are given exactly enough extra inbound
 *    edges to reach it — never more. Donors are chosen by an integer affinity
 *    score (subject identity > declared workflow pairing > reciprocity >
 *    IDF-weighted tag overlap + editorial type affinity).
 * 3. Each donor hosts at most MAX_ASSIGNED_OUTBOUND extra links, so equity is
 *    spread across the corpus instead of pooling on a handful of hubs, and no
 *    page renders more than MAX_RELATED_LINKS links in total.
 *
 * ── Determinism (Ledgerium core principle) ───────────────────────────────────
 * Same registry in ⇒ byte-identical graph out, always:
 *   - no `Date`, no `Math.random`;
 *   - no `localeCompare` / `Intl` — all ordering uses `compareAscii`, a plain
 *     code-unit comparison over ASCII kebab/camel identifiers;
 *   - never relies on `Map` / object key iteration order for a decision: every
 *     traversal that affects output runs over an explicitly sorted array;
 *   - every comparator is TOTAL (ties always fall through to the unique node
 *     id), so the result does not depend on `Array#sort` stability;
 *   - scores are integers only, so there is no float-rounding tie ambiguity.
 */

export interface RelatedLink {
  readonly title: string;
  readonly path: string;
  readonly type: SeoPage['type'];
  readonly eyebrow: string;
  /** Plain-language reason this page is related, for the "why related" label. */
  readonly why: string;
}

/** An edge added by the auto-fill stage (not authored in a `related` array). */
export interface AssignedEdge {
  /** Node id (`type:slug`) of the page that hosts the extra outbound link. */
  readonly from: string;
  /** Node id of the page that needed the inbound link. */
  readonly to: string;
  /** Affinity score that won this donor the slot. Always > 0 in practice. */
  readonly score: number;
}

export interface LinkGraph {
  /** All published node ids, in pinned (type asc, slug asc) order. */
  readonly nodeIds: readonly string[];
  /** node id → rendered outbound links (curated first, then assigned). */
  readonly outbound: ReadonlyMap<string, readonly RelatedLink[]>;
  /** node id → ids that link TO it, in pinned ascending order. */
  readonly inbound: ReadonlyMap<string, readonly string[]>;
  /** node id → resolved curated target ids, in authored order. */
  readonly curatedOutbound: ReadonlyMap<string, readonly string[]>;
  /** node id → auto-assigned target ids, in assignment order. */
  readonly assignedOutbound: ReadonlyMap<string, readonly string[]>;
  /** Every auto-assigned edge, in assignment order. */
  readonly assignedEdges: readonly AssignedEdge[];
}

/** The enforced graph invariant: no published page below this many inbound links. */
export const MIN_INBOUND_LINKS = 2;
/** Extra outbound links a single page may host, so equity spreads. */
export const MAX_ASSIGNED_OUTBOUND = 2;
/** Hard ceiling on rendered links per page (curated + assigned). */
export const MAX_RELATED_LINKS = 5;

// ── Affinity weights (integers; relative magnitude is the whole design) ───────

/**
 * Same slug, different type — e.g. `compare:tango` → `alternatives:tango`.
 * The registry's tags deliberately do NOT encode the vendor (`alternatives:scribe`
 * and `alternatives:tango` carry byte-identical tags), so the slug is the only
 * subject-identity signal available without adding a registry field. It is also
 * the highest-precision one we have.
 */
const W_SUBJECT_IDENTITY = 100;
/**
 * `sopTemplate.relatedWorkflowSlug` — an already-authored pairing, used in the
 * reverse direction (workflow page → the SOP template built from it).
 */
const W_PAIRED_WORKFLOW = 90;
/**
 * The target already links to this candidate, so an editor has already asserted
 * the pair is relevant. A bonus, deliberately not large enough to outrank a real
 * topical match.
 */
const W_RECIPROCAL = 20;
/**
 * Per shared tag: `floor(TAG_IDF_SCALE / corpusFrequency)`. Rare tags
 * ('work-management' on 2 pages → 30) carry signal; type-marker tags
 * ('documentation' on 47, 'workflow' on 42 → 1) are correctly near-worthless.
 */
const TAG_IDF_SCALE = 60;

type Affinity = Partial<Record<PageType, number>>;

/**
 * Editorial donor→target type affinity. Encodes "which kind of page should send
 * a reader to which other kind" — e.g. a competitor-landscape page is the right
 * referrer for an alternatives list (30), a workflow page is the right referrer
 * for the SOP template of that workflow (25). Absent pairs score 0.
 */
const TYPE_AFFINITY: Record<PageType, Affinity> = {
  aiOpportunity: { department: 25, workflow: 15, problem: 12, software: 8, compare: 8, competitors: 8, alternatives: 8 },
  alternatives: { competitors: 20, compare: 18, alternatives: 10, persona: 10, problem: 10, software: 8 },
  answer: { answer: 20, problem: 20, compare: 12, sopTemplate: 10, alternatives: 8, competitors: 8 },
  compare: { competitors: 25, alternatives: 18, persona: 12, compare: 10, problem: 10, software: 8, workflow: 8 },
  competitors: { alternatives: 30, compare: 25, persona: 15, problem: 12, competitors: 10, software: 8 },
  department: { aiOpportunity: 25, workflow: 15, sopTemplate: 12, problem: 12, software: 10, persona: 10, industry: 10 },
  industry: { workflow: 15, persona: 15, department: 12, problem: 12, sopTemplate: 10, aiOpportunity: 8, software: 8 },
  persona: { alternatives: 15, competitors: 15, workflow: 15, problem: 15, compare: 12, industry: 10, department: 10, sopTemplate: 10, software: 10, aiOpportunity: 10 },
  problem: { sopTemplate: 15, aiOpportunity: 15, department: 15, persona: 15, problem: 15, answer: 15, industry: 12, alternatives: 12, competitors: 12, workflow: 12, compare: 10, software: 8 },
  software: { workflow: 15, department: 15, sopTemplate: 12, software: 10, industry: 10, persona: 10, aiOpportunity: 8, compare: 8, alternatives: 8 },
  sopTemplate: { workflow: 15, sopTemplate: 10, department: 10, persona: 10, problem: 10, software: 8, industry: 8 },
  workflow: { sopTemplate: 25, department: 20, industry: 20, software: 20, aiOpportunity: 15, persona: 15, problem: 12, workflow: 10, compare: 8, alternatives: 8, competitors: 8 },
  // Hub/index pages are not authored leaf records and never take part in the graph.
  libraryIndex: {},
};

// ── "Why related" labels ─────────────────────────────────────────────────────

const WHY_CURATED = 'Hand-picked next step for this topic';
const WHY_SUBJECT = 'Same subject, covered from another angle';
const WHY_PAIRED_WORKFLOW = 'The SOP template built from this recorded workflow';
const WHY_ADJACENT = 'Related topic in this part of the library';
function whyTags(overlap: number): string {
  return `Shares ${overlap} topic ${overlap === 1 ? 'tag' : 'tags'} with this page`;
}

// ── Small deterministic helpers ──────────────────────────────────────────────

/** Locale-independent code-unit comparison. Never use `localeCompare` here. */
function compareAscii(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function idOf(page: Pick<SeoPage, 'type' | 'slug'>): string {
  return `${page.type}:${page.slug}`;
}

/** Map access that fails loudly rather than silently producing a wrong graph. */
function mustGet<T>(map: Map<string, T>, key: string): T {
  const value = map.get(key);
  if (value === undefined) throw new Error(`related graph: unknown node "${key}"`);
  return value;
}

function prefixFor(type: SeoPage['type']): string {
  return ROUTE_PREFIX[type];
}

function toLink(page: SeoPage, why: string): RelatedLink {
  return {
    title: page.h1,
    path: `${prefixFor(page.type)}/${page.slug}`,
    type: page.type,
    eyebrow: page.eyebrow,
    why,
  };
}

/** True when `to` is the SOP template that documents `from`'s recorded workflow. */
function isPairedWorkflow(from: SeoPage, to: SeoPage): boolean {
  return from.type === 'workflow' && to.type === 'sopTemplate' && to.relatedWorkflowSlug === from.slug;
}

// ── Graph construction ───────────────────────────────────────────────────────

function buildGraph(pool: readonly SeoPage[]): LinkGraph {
  // Pinned node order. Every later traversal that affects output uses this.
  const nodes = pool
    .filter((p) => p.published)
    .slice()
    .sort((a, b) => compareAscii(a.type, b.type) || compareAscii(a.slug, b.slug));

  const byId = new Map<string, SeoPage>();
  for (const node of nodes) byId.set(idOf(node), node);

  // Corpus tag frequency → IDF weight. Counted over the pinned node list, and
  // per-page de-duplicated so a repeated tag cannot inflate a page's own weight.
  const tagFrequency = new Map<string, number>();
  for (const node of nodes) {
    for (const tag of new Set(node.tags)) {
      tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
    }
  }
  const tagWeight = new Map<string, number>();
  for (const [tag, frequency] of tagFrequency) {
    tagWeight.set(tag, Math.floor(TAG_IDF_SCALE / frequency));
  }
  const tagsById = new Map<string, ReadonlySet<string>>();
  for (const node of nodes) tagsById.set(idOf(node), new Set(node.tags));

  // ── Stage 1: curated edges, verbatim ───────────────────────────────────────
  const curatedOut = new Map<string, string[]>();
  const curatedOutSet = new Map<string, Set<string>>();
  const allOutSet = new Map<string, Set<string>>();
  const inboundSources = new Map<string, string[]>();
  for (const node of nodes) {
    const id = idOf(node);
    curatedOut.set(id, []);
    curatedOutSet.set(id, new Set<string>());
    allOutSet.set(id, new Set<string>());
    inboundSources.set(id, []);
  }

  for (const node of nodes) {
    const from = idOf(node);
    for (const token of node.related) {
      if (token === from) continue; // self-link; validate.ts already errors on this
      if (!byId.has(token)) continue; // unresolvable or unpublished target
      if (mustGet(allOutSet, from).has(token)) continue; // duplicate token
      mustGet(curatedOut, from).push(token);
      mustGet(curatedOutSet, from).add(token);
      mustGet(allOutSet, from).add(token);
      mustGet(inboundSources, token).push(from);
    }
  }

  // ── Stage 2: score a candidate donor for a page that needs inbound links ───
  function scoreEdge(from: SeoPage, to: SeoPage): number {
    let score = 0;
    if (from.slug === to.slug) score += W_SUBJECT_IDENTITY;
    if (isPairedWorkflow(from, to)) score += W_PAIRED_WORKFLOW;
    // Reciprocity is measured against the CURATED graph only, so it cannot drift
    // as assignments are made during this pass.
    if (mustGet(curatedOutSet, idOf(to)).has(idOf(from))) score += W_RECIPROCAL;
    const toTags = tagsById.get(idOf(to));
    if (toTags) {
      for (const tag of new Set(from.tags)) {
        if (toTags.has(tag)) score += tagWeight.get(tag) ?? 0;
      }
    }
    score += TYPE_AFFINITY[from.type][to.type] ?? 0;
    return score;
  }

  const inboundCount = new Map<string, number>();
  for (const node of nodes) {
    inboundCount.set(idOf(node), mustGet(inboundSources, idOf(node)).length);
  }

  const assignedOut = new Map<string, string[]>();
  for (const node of nodes) assignedOut.set(idOf(node), []);

  /** How many extra outbound links this page may still host. */
  function spareCapacity(id: string): number {
    const ceiling = Math.min(
      MAX_ASSIGNED_OUTBOUND,
      Math.max(0, MAX_RELATED_LINKS - mustGet(curatedOut, id).length),
    );
    return ceiling - mustGet(assignedOut, id).length;
  }

  // Neediest first, ties broken lexically. Deficits never change while this loop
  // runs (an assignment only raises the TARGET's inbound count, and each target
  // is visited exactly once), so the traversal order is fully determined here.
  const deficient = nodes
    .filter((node) => mustGet(inboundCount, idOf(node)) < MIN_INBOUND_LINKS)
    .sort(
      (a, b) =>
        mustGet(inboundCount, idOf(a)) - mustGet(inboundCount, idOf(b)) ||
        compareAscii(a.type, b.type) ||
        compareAscii(a.slug, b.slug),
    );

  const assignedEdges: AssignedEdge[] = [];

  for (const target of deficient) {
    const targetId = idOf(target);
    let needed = MIN_INBOUND_LINKS - mustGet(inboundCount, targetId);
    if (needed <= 0) continue;

    const ranked = nodes
      .filter((candidate) => {
        const candidateId = idOf(candidate);
        if (candidateId === targetId) return false;
        if (mustGet(allOutSet, candidateId).has(targetId)) return false;
        return spareCapacity(candidateId) > 0;
      })
      .map((candidate) => ({ candidate, score: scoreEdge(candidate, target) }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          // Prefer donors that are not already carrying an extra link, so equity
          // spreads before it pools.
          mustGet(assignedOut, idOf(a.candidate)).length - mustGet(assignedOut, idOf(b.candidate)).length ||
          compareAscii(a.candidate.type, b.candidate.type) ||
          compareAscii(a.candidate.slug, b.candidate.slug),
      );

    for (const { candidate, score } of ranked) {
      if (needed <= 0) break;
      const candidateId = idOf(candidate);
      if (spareCapacity(candidateId) <= 0) continue;
      mustGet(assignedOut, candidateId).push(targetId);
      mustGet(allOutSet, candidateId).add(targetId);
      mustGet(inboundSources, targetId).push(candidateId);
      inboundCount.set(targetId, mustGet(inboundCount, targetId) + 1);
      assignedEdges.push({ from: candidateId, to: targetId, score });
      needed -= 1;
    }
    // If `needed` is still positive the corpus has no spare capacity at all
    // (total capacity is 2x the node count, so this cannot happen for any pool
    // large enough to satisfy the invariant). The related.test.ts invariant
    // assertion is what surfaces it.
  }

  // ── Stage 3: materialise rendered rows ─────────────────────────────────────

  /** Label for an auto-assigned link, chosen by the signal that earned it. */
  function whyFor(from: SeoPage, to: SeoPage): string {
    if (from.slug === to.slug) return WHY_SUBJECT;
    if (isPairedWorkflow(from, to)) return WHY_PAIRED_WORKFLOW;
    const toTags = tagsById.get(idOf(to));
    let overlap = 0;
    if (toTags) {
      for (const tag of new Set(from.tags)) if (toTags.has(tag)) overlap += 1;
    }
    return overlap > 0 ? whyTags(overlap) : WHY_ADJACENT;
  }

  const outbound = new Map<string, readonly RelatedLink[]>();
  for (const node of nodes) {
    const id = idOf(node);
    const links: RelatedLink[] = [];
    for (const targetId of mustGet(curatedOut, id)) {
      links.push(toLink(mustGet(byId, targetId), WHY_CURATED));
    }
    for (const targetId of mustGet(assignedOut, id)) {
      const target = mustGet(byId, targetId);
      links.push(toLink(target, whyFor(node, target)));
    }
    outbound.set(id, Object.freeze(links));
  }

  const inbound = new Map<string, readonly string[]>();
  for (const node of nodes) {
    const id = idOf(node);
    inbound.set(id, Object.freeze(mustGet(inboundSources, id).slice().sort(compareAscii)));
  }

  const readonlyCurated = new Map<string, readonly string[]>();
  const readonlyAssigned = new Map<string, readonly string[]>();
  for (const node of nodes) {
    const id = idOf(node);
    readonlyCurated.set(id, Object.freeze(mustGet(curatedOut, id).slice()));
    readonlyAssigned.set(id, Object.freeze(mustGet(assignedOut, id).slice()));
  }

  return {
    nodeIds: Object.freeze(nodes.map(idOf)),
    outbound,
    inbound,
    curatedOutbound: readonlyCurated,
    assignedOutbound: readonlyAssigned,
    assignedEdges: Object.freeze(assignedEdges),
  };
}

/**
 * Cache keyed on the pool array identity. The builder is pure, so this is a
 * performance detail only — an uncached call returns an identical graph.
 */
const GRAPH_CACHE = new WeakMap<readonly SeoPage[], LinkGraph>();

/** Build (or reuse) the deterministic link graph for a page pool. */
export function buildLinkGraph(pool: readonly SeoPage[] = ALL_PAGES): LinkGraph {
  const cached = GRAPH_CACHE.get(pool);
  if (cached) return cached;
  const graph = buildGraph(pool);
  GRAPH_CACHE.set(pool, graph);
  return graph;
}

/**
 * Deterministic related-page resolver.
 *
 * Returns this page's row from the link graph: curated `related` targets in
 * authored order first, then any auto-assigned links that exist to keep other
 * pages above MIN_INBOUND_LINKS. Self is always excluded, targets are always
 * published, and the row never exceeds MAX_RELATED_LINKS.
 *
 * NOTE: passing a `limit` below MAX_RELATED_LINKS truncates assigned links and
 * therefore breaks the inbound invariant at render time. Callers that render the
 * canonical related block must use the default.
 */
export function getRelatedPages(
  page: SeoPage,
  limit = MAX_RELATED_LINKS,
  pool: readonly SeoPage[] = ALL_PAGES,
): RelatedLink[] {
  const row = buildLinkGraph(pool).outbound.get(idOf(page));
  if (!row) return [];
  return row.slice(0, Math.max(0, limit));
}

/** Node ids with fewer than MIN_INBOUND_LINKS inbound links. Empty by contract. */
export function findOrphanedPages(pool: readonly SeoPage[] = ALL_PAGES): string[] {
  const graph = buildLinkGraph(pool);
  return graph.nodeIds.filter((id) => (graph.inbound.get(id) ?? []).length < MIN_INBOUND_LINKS);
}
