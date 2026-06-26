/**
 * SEO/AEO page-engine content model (Phase 1 / Tranche 0).
 *
 * Source of truth: docs/meta/SEO_AEO_SUPERPROMPT_V2.md.
 *
 * Design rules enforced here:
 * - Discriminated union on `type` (NO 40-field god-object). Each page interface
 *   carries ONLY its own fields.
 * - Relationships live ONLY in `tags` + `related`. No parallel graph shape.
 * - `canonical` and `breadcrumbs` are DERIVED (see lib/seo), not authored, to
 *   remove a whole class of self-reference errors.
 *
 * Tranche 0 ships three page types: compare | workflow | software.
 * Remaining types are declared in the union for forward-compatibility but are
 * not yet authored or routed.
 */

export type PageType =
  | 'workflow'
  | 'sopTemplate'
  | 'aiOpportunity'
  | 'department'
  | 'software'
  | 'industry'
  | 'persona'
  | 'problem'
  | 'compare'
  | 'libraryIndex';

export type SearchIntent = 'informational' | 'commercial' | 'transactional';

/** JSON-LD @type names the engine knows how to emit. */
export type JsonLdType =
  | 'Article'
  | 'HowTo'
  | 'FAQPage'
  | 'SoftwareApplication'
  | 'BreadcrumbList'
  | 'ItemList'
  | 'WebPage'
  | 'Organization';

export interface Faq {
  readonly q: string;
  readonly a: string;
}

export interface WorkflowStep {
  readonly title: string;
  readonly detail: string;
}

export interface Metric {
  readonly label: string;
  readonly note: string;
}

export interface CompareRow {
  readonly label: string;
  readonly competitor: string | boolean;
  readonly ledgerium: string | boolean;
}

export interface PageAuthor {
  readonly name: string;
  readonly sameAs?: readonly string[];
}

/**
 * Fields shared by every page type. Authored per record.
 * `canonical` is intentionally NOT here — it is derived from type+slug.
 */
export interface BasePage {
  readonly type: PageType;
  /** Unique within type. Lowercase kebab: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ */
  readonly slug: string;
  /** 30–65 chars, unique across all pages. */
  readonly metaTitle: string;
  /** 120–160 chars, unique across all pages. */
  readonly metaDescription: string;
  readonly h1: string;
  readonly eyebrow: string;
  /** AEO direct answer: <=100 words, stands alone, no jargon. Renders first. */
  readonly shortAnswer: string;
  readonly primaryKeyword: string;
  readonly secondaryKeywords: readonly string[];
  readonly searchIntent: SearchIntent;
  /** ONLY relationship source besides `related`. */
  readonly tags: readonly string[];
  /** Explicit cross-page slugs (any type), as `${type}:${slug}`. */
  readonly related: readonly string[];
  /** >=1 real Ledgerium-sourced fact. Required for a page to be published. */
  readonly originalDataPoint: string;
  /** One honest product constraint relevant to the page topic. */
  readonly honestLimitation: string;
  /** 3–10 entries. First answer must be page-specific (uniqueness floor). */
  readonly faqs: readonly Faq[];
  readonly jsonLd: readonly JsonLdType[];
  readonly author: PageAuthor;
  /** ISO 8601. Feeds sitemap lastModified + visible "Updated" date. */
  readonly updatedAt: string;
  /** Gates sitemap inclusion + indexability. false ⇒ noindex, excluded. */
  readonly published: boolean;
}

export interface WorkflowPage extends BasePage {
  readonly type: 'workflow';
  readonly whoUsesIt: string;
  readonly systems: readonly string[];
  readonly oldWay: string;
  readonly ledgeriumWay: string;
  readonly steps: readonly WorkflowStep[];
  readonly commonMistakes: readonly string[];
  readonly metrics: readonly Metric[];
  readonly aiOpportunities: readonly string[];
}

export interface SoftwarePage extends BasePage {
  readonly type: 'software';
  readonly vendor: string;
  /** Editorial frame, e.g. "How to document a workflow in Salesforce". */
  readonly documentationFrame: string;
  readonly commonWorkflows: readonly string[];
  readonly documentationChallenges: readonly string[];
  readonly oldWay: string;
  readonly ledgeriumWay: string;
  readonly commonMistakes: readonly string[];
}

export interface ComparePage extends BasePage {
  readonly type: 'compare';
  readonly competitor: string;
  /** Why this comparison matters — renders before the table. */
  readonly whyItMatters: string;
  readonly rows: readonly CompareRow[];
  /** Honest concession: where the competitor is stronger. */
  readonly competitorStrength: string;
  readonly whenCompetitorFits: readonly string[];
  readonly whenLedgeriumFits: readonly string[];
  /** "verified as of [Month YYYY]" for all competitor claims. */
  readonly verifiedAsOf: string;
}

export interface PersonaPage extends BasePage {
  readonly type: 'persona';
  /** One-line "who this is for". */
  readonly whoThisIsFor: string;
  readonly painPoints: readonly string[];
  readonly whatTheySearchFor: readonly string[];
  readonly jobsToBeDone: readonly string[];
  readonly commonWorkflowsToDocument: readonly string[];
  /** Short empathy narrative — a day in this person's work. */
  readonly dayInTheLife: string;
  readonly howLedgeriumHelps: string;
}

export interface ProblemPage extends BasePage {
  readonly type: 'problem';
  readonly whyItHappens: string;
  /** "How to tell you have this problem" — diagnostic signals. */
  readonly diagnostic: readonly string[];
  readonly manualApproach: string;
  readonly ledgeriumApproach: string;
  readonly steps: readonly WorkflowStep[];
  readonly commonMistakes: readonly string[];
}

/** Authored union. Extend as later types are authored. */
export type SeoPage = WorkflowPage | SoftwarePage | ComparePage | PersonaPage | ProblemPage;
