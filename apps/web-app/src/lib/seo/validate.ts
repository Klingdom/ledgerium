import type { SeoPage } from '@/content/types';
import { ALL_PAGES, isReservedSlug, PARENT_HUB } from '@/content/registry';

export interface ValidationResult {
  readonly errors: string[];
  readonly warnings: string[];
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NEAR_DUP_FAIL = 0.7;
const NEAR_DUP_WARN = 0.5;
const WORD_FLOOR_LEAF = 400;

function words(strings: string[]): string[] {
  return strings
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Prose fields that count toward content depth, per page type. */
function proseSources(page: SeoPage): string[] {
  const base: string[] = [
    page.shortAnswer,
    page.originalDataPoint,
    page.honestLimitation,
    ...page.faqs.flatMap((f) => [f.q, f.a]),
  ];
  if (page.type === 'workflow') {
    base.push(
      page.whoUsesIt,
      page.oldWay,
      page.ledgeriumWay,
      ...page.steps.flatMap((s) => [s.title, s.detail]),
      ...page.commonMistakes,
      ...page.metrics.flatMap((m) => [m.label, m.note]),
      ...page.aiOpportunities,
    );
  } else if (page.type === 'software') {
    base.push(
      page.documentationFrame,
      ...page.commonWorkflows,
      ...page.documentationChallenges,
      page.oldWay,
      page.ledgeriumWay,
      ...page.commonMistakes,
    );
  } else if (page.type === 'compare') {
    base.push(
      page.whyItMatters,
      page.competitorStrength,
      ...page.whenCompetitorFits,
      ...page.whenLedgeriumFits,
      ...page.rows.flatMap((r) => [
        r.label,
        typeof r.competitor === 'string' ? r.competitor : '',
        typeof r.ledgerium === 'string' ? r.ledgerium : '',
      ]),
    );
  } else if (page.type === 'persona') {
    base.push(
      page.whoThisIsFor,
      page.dayInTheLife,
      page.howLedgeriumHelps,
      ...page.painPoints,
      ...page.whatTheySearchFor,
      ...page.jobsToBeDone,
      ...page.commonWorkflowsToDocument,
    );
  } else if (page.type === 'problem') {
    base.push(
      page.whyItHappens,
      page.manualApproach,
      page.ledgeriumApproach,
      ...page.diagnostic,
      ...page.steps.flatMap((s) => [s.title, s.detail]),
      ...page.commonMistakes,
    );
  } else if (page.type === 'sopTemplate') {
    base.push(
      page.whoUsesIt,
      page.whenToUseIt,
      page.howLedgeriumGenerates,
      ...page.sopSections.flatMap((s) => [s.heading, s.detail]),
      ...page.exampleProcedure.flatMap((s) => [s.title, s.detail]),
      ...page.commonMistakes,
    );
  } else if (page.type === 'aiOpportunity') {
    base.push(
      page.functionArea,
      page.exampleAnalysis,
      ...page.commonRepetitiveWork,
      ...page.whereAiHelps,
      ...page.whereAutomationHelps,
      ...page.whereHumansStayInvolved,
      ...page.readinessChecklist,
    );
  } else if (page.type === 'department') {
    base.push(
      page.overview,
      ...page.commonWorkflows,
      ...page.documentationProblems,
      ...page.sopNeeds,
      ...page.aiOpportunities,
    );
  } else if (page.type === 'industry') {
    base.push(
      page.industryContext,
      ...page.commonWorkflows,
      ...page.documentationConcerns,
      ...page.complianceConcerns,
      ...page.aiOpportunities,
    );
  } else if (page.type === 'alternatives') {
    base.push(
      page.whyPeopleSwitch,
      page.ledgeriumAngle,
      page.whenTargetStillFits,
      ...page.options.flatMap((o) => [o.name, o.bestFor, o.note]),
      ...page.evaluationCriteria,
    );
  } else if (page.type === 'competitors') {
    base.push(
      page.landscape,
      page.ledgeriumPosition,
      ...page.segments.flatMap((s) => [s.segment, s.players, s.fitFor]),
      ...page.evaluationCriteria,
    );
  }
  return base;
}

/** k=5 word-shingle frequency vector for near-duplicate detection. */
function shingles(tokens: string[], k = 5): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i + k <= tokens.length; i++) {
    const key = tokens.slice(i, i + k).join(' ');
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (vb) dot += va * vb;
  }
  const mag = (m: Map<string, number>) => Math.sqrt([...m.values()].reduce((s, v) => s + v * v, 0));
  const denom = mag(a) * mag(b);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Build-time content quality gate. Returns blocking errors and non-blocking
 * warnings. Pure and deterministic. Run by scripts/validate-seo-content.ts and
 * by lib/seo/content.test.ts.
 */
export function validateContent(pages: readonly SeoPage[] = ALL_PAGES): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const slugByType = new Map<string, Set<string>>();
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const known = new Set(pages.map((p) => `${p.type}:${p.slug}`));

  for (const p of pages) {
    const id = `${p.type}:${p.slug}`;

    if (!SLUG_RE.test(p.slug)) errors.push(`${id}: slug "${p.slug}" fails kebab-case regex`);
    if (isReservedSlug(p.type, p.slug)) errors.push(`${id}: claims a RESERVED slug owned by a hand-built page`);

    const set = slugByType.get(p.type) ?? new Set<string>();
    if (set.has(p.slug)) errors.push(`${id}: duplicate slug within type`);
    set.add(p.slug);
    slugByType.set(p.type, set);

    if (titles.has(p.metaTitle)) errors.push(`${id}: duplicate metaTitle with ${titles.get(p.metaTitle)}`);
    titles.set(p.metaTitle, id);
    if (descriptions.has(p.metaDescription)) errors.push(`${id}: duplicate metaDescription with ${descriptions.get(p.metaDescription)}`);
    descriptions.set(p.metaDescription, id);

    if (p.metaTitle.length < 30 || p.metaTitle.length > 65) errors.push(`${id}: metaTitle length ${p.metaTitle.length} outside 30–65`);
    if (p.metaDescription.length < 120 || p.metaDescription.length > 160) errors.push(`${id}: metaDescription length ${p.metaDescription.length} outside 120–160`);

    const shortAnswerWords = words([p.shortAnswer]).length;
    if (shortAnswerWords > 100) errors.push(`${id}: shortAnswer ${shortAnswerWords} words exceeds 100`);

    if (p.faqs.length < 3 || p.faqs.length > 10) errors.push(`${id}: faq count ${p.faqs.length} outside 3–10`);

    if (!p.originalDataPoint.trim()) errors.push(`${id}: missing originalDataPoint (required to publish)`);
    if (!p.honestLimitation.trim()) errors.push(`${id}: missing honestLimitation`);

    if (Number.isNaN(Date.parse(p.updatedAt))) errors.push(`${id}: updatedAt "${p.updatedAt}" is not a valid date`);

    if (PARENT_HUB[p.type] === undefined) errors.push(`${id}: no parent hub defined for type (orphan)`);

    for (const token of p.related) {
      if (token === id) errors.push(`${id}: self-link in related`);
      else if (!known.has(token)) errors.push(`${id}: related token "${token}" does not resolve`);
    }
    if (p.related.length === 0) warnings.push(`${id}: no related links (orphan risk)`);

    const depth = words(proseSources(p)).length;
    if (p.published && depth < WORD_FLOOR_LEAF) errors.push(`${id}: content depth ${depth} words below floor ${WORD_FLOOR_LEAF}`);
  }

  // Near-duplicate detection within the same type.
  const vectors = pages.map((p) => ({ id: `${p.type}:${p.slug}`, type: p.type, vec: shingles(words(proseSources(p))) }));
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const a = vectors[i];
      const b = vectors[j];
      if (!a || !b || a.type !== b.type) continue;
      const sim = cosine(a.vec, b.vec);
      if (sim >= NEAR_DUP_FAIL) errors.push(`${a.id} vs ${b.id}: near-duplicate (cosine ${sim.toFixed(2)})`);
      else if (sim >= NEAR_DUP_WARN) warnings.push(`${a.id} vs ${b.id}: high similarity (cosine ${sim.toFixed(2)})`);
    }
  }

  return { errors, warnings };
}
