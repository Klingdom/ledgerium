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
  | 'alternatives'
  | 'competitors'
  | 'answer'
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
  | 'Organization'
  | 'DefinedTerm';

export interface Faq {
  readonly q: string;
  readonly a: string;
}

export interface WorkflowStep {
  readonly title: string;
  readonly detail: string;
  /** Optional system/tool this step runs in (renders a chip when present). */
  readonly system?: string;
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
  /**
   * 3–5 self-contained, quotable sentences (AEO TL;DR). Each must stand alone
   * out of context. Required (gate-enforced) since the iter backfill completed.
   */
  readonly keyTakeaways: readonly string[];
  /**
   * One sentence, UNIQUE per page, naming the specific subject + what Ledgerium
   * records + the insight produced. De-boilerplates the capture section for AEO.
   * Required (gate-enforced) since the iter backfill completed.
   */
  readonly mechanismIntro: string;
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

export interface SopSection {
  readonly heading: string;
  readonly detail: string;
}

export interface SopTemplatePage extends BasePage {
  readonly type: 'sopTemplate';
  readonly whoUsesIt: string;
  readonly whenToUseIt: string;
  /** Editable SOP structure (Purpose, Scope, Roles, Procedure, Exceptions, Records...). */
  readonly sopSections: readonly SopSection[];
  /** Worked example procedure. */
  readonly exampleProcedure: readonly WorkflowStep[];
  readonly commonMistakes: readonly string[];
  readonly howLedgeriumGenerates: string;
  /** Slug of the paired workflow page, if any (renders a "see the full workflow" link). */
  readonly relatedWorkflowSlug?: string;
}

export interface AiOpportunityPage extends BasePage {
  readonly type: 'aiOpportunity';
  readonly functionArea: string;
  readonly commonRepetitiveWork: readonly string[];
  readonly whereAiHelps: readonly string[];
  readonly whereAutomationHelps: readonly string[];
  readonly whereHumansStayInvolved: readonly string[];
  readonly readinessChecklist: readonly string[];
  readonly exampleAnalysis: string;
}

export interface DepartmentPage extends BasePage {
  readonly type: 'department';
  readonly overview: string;
  readonly commonWorkflows: readonly string[];
  readonly documentationProblems: readonly string[];
  readonly sopNeeds: readonly string[];
  readonly aiOpportunities: readonly string[];
}

export interface IndustryPage extends BasePage {
  readonly type: 'industry';
  readonly industryContext: string;
  readonly commonWorkflows: readonly string[];
  readonly documentationConcerns: readonly string[];
  readonly complianceConcerns: readonly string[];
  readonly aiOpportunities: readonly string[];
}

export interface AlternativeOption {
  readonly name: string;
  readonly bestFor: string;
  /** Honest one-liner: what it is and a real tradeoff. */
  readonly note: string;
}

export interface AlternativesPage extends BasePage {
  readonly type: 'alternatives';
  /** The tool people want alternatives to, e.g. "Scribe". */
  readonly targetTool: string;
  readonly whyPeopleSwitch: string;
  /** 5-8 options, including Ledgerium, each with an honest note. */
  readonly options: readonly AlternativeOption[];
  readonly ledgeriumAngle: string;
  readonly whenTargetStillFits: string;
  readonly evaluationCriteria: readonly string[];
  /** "verified as of [Month YYYY]" for all third-party claims. */
  readonly verifiedAsOf: string;
}

export interface CompetitorSegment {
  readonly segment: string;
  readonly players: string;
  readonly fitFor: string;
}

export interface CompetitorsPage extends BasePage {
  readonly type: 'competitors';
  /** The tool or category whose competitive landscape this maps, e.g. "Scribe". */
  readonly subject: string;
  readonly landscape: string;
  readonly segments: readonly CompetitorSegment[];
  readonly ledgeriumPosition: string;
  readonly evaluationCriteria: readonly string[];
  readonly verifiedAsOf: string;
}

/** Definitional body + "how does X work" expansion section for an AnswerPage. */
export interface AnswerSection {
  readonly heading: string;
  readonly body: string;
}

/** Concept-vs-concept definitional table (e.g. process mining vs task mining). */
export interface ComparisonRow {
  readonly label: string;
  readonly itemA: string;
  readonly itemB: string;
}
export interface ComparisonTable {
  readonly itemA: string; // e.g. "Process mining"
  readonly itemB: string; // e.g. "Task mining"
  readonly rows: readonly ComparisonRow[];
}

/** Inline glossary chip → /answers/<slug>. Presentational; authority lives in `related`. */
export interface GlossaryLink {
  readonly term: string;
  /** Slug of another `answer` page. SHOULD also appear in `related` as `answer:<slug>`. */
  readonly slug: string;
}

/** Freshness / citation entry. Feeds the on-page Sources block + optional Article.citation. */
export interface AnswerSource {
  readonly label: string;
  readonly url?: string;
  /** ISO date the source was checked. Feeds the visible "verified" line. */
  readonly retrievedAt?: string;
}

export interface AnswerPage extends BasePage {
  readonly type: 'answer';
  /** Canonical defined term. Feeds DefinedTerm.name. */
  readonly term: string;
  /** Formal 2–4 sentence definition. UNIQUE wording vs shortAnswer. Feeds DefinedTerm.description. */
  readonly definition: string;
  /** Definitional body + "how does X work" expansion. 2–4 sections. Clears the 400-word floor. */
  readonly inDepth: readonly AnswerSection[];
  /** Present ⇒ this is an "X vs Y (definitional)" page. Absent ⇒ a "what is X" page. */
  readonly comparisonTable?: ComparisonTable;
  /** Inline glossary cross-links. */
  readonly relatedTerms: readonly GlossaryLink[];
  /** Citation / freshness sources. */
  readonly sources: readonly AnswerSource[];
}

/** Authored union. Extend as later types are authored. */
export type SeoPage =
  | WorkflowPage
  | SoftwarePage
  | ComparePage
  | PersonaPage
  | ProblemPage
  | SopTemplatePage
  | AiOpportunityPage
  | DepartmentPage
  | IndustryPage
  | AlternativesPage
  | CompetitorsPage
  | AnswerPage;
