/**
 * "Ask This Process" — Phase A contract types (PURE, DETERMINISTIC, NO-LLM).
 *
 * These types define the deterministic grounding substrate decided in
 * `docs/features/ask-this-process/adr/ADR-001-determinism-boundary.md`:
 *
 *   - `GroundedEvidenceBundle` — the closed, deterministically-ordered evidence
 *     a Phase-B LLM (and the Phase-A templates) may ground an answer on, and
 *     NOTHING else.
 *   - `CitationSet` — the closed, authoritative universe of citable ids (every
 *     step ordinal + every sourceEventId in the bundle, plus the `[[process]]`
 *     token). A claimed id outside this set can never be a valid citation.
 *   - `AskResult` — the first-class result of a deterministic template answer:
 *     `grounded` (carries citations ⊆ CitationSet) or `refused` (an honest,
 *     successful non-answer that names why).
 *
 * HARD CONSTRAINTS (ADR-001):
 *   - No `Date.now()` / `Math.random()` / `new Date()`-of-now / network / I/O.
 *   - All output is NON-AUTHORITATIVE derived data (`isAuthoritative` is always
 *     false; there is no path to true).
 *   - This module dir has ZERO LLM / provider / network imports (enforced by a
 *     no-import test).
 *
 * @module ask-this-process/types
 */

// ─── Citation primitives (the grammar, as a closed union) ─────────────────────

/** The three — and only three — citation kinds. See ADR-001 Decision 2. */
export type CitationKind = 'step' | 'event' | 'process';

/**
 * A single resolved, renderable citation reference. Every field is derived
 * deterministically from the `GroundedEvidenceBundle`; `recordedAt` is a stored
 * artifact timestamp (UTC), never a wall-clock value.
 */
export interface ResolvedCitation {
  kind: CitationKind;
  /** Present for `step` and `event`; null for `process`. */
  stepOrdinal: number | null;
  /** Present for `event`; null otherwise. */
  sourceEventId: string | null;
  /** Provenance timestamp of the cited evidence (SOP.generatedAt), UTC ISO. */
  recordedAt: string;
  /** Render label, e.g. "step 4" / "step 4 · Save Opportunity" / "this process". */
  label: string;
}

// ─── GroundedEvidenceBundle (what may ground an answer — and nothing else) ─────

/** A friction indicator carried into the bundle (observed-only, abstracted). */
export interface BundleFriction {
  type: string;
  label: string;
  severity: string;
}

/** One instruction within a step — carries the event-level citation key. */
export interface BundleInstruction {
  /** 1-based position within the step. */
  sequence: number;
  /** Imperative instruction text (observed-derived). */
  text: string;
  /** action | wait | verify | note (defaults to 'action' when unclassified). */
  type: 'action' | 'wait' | 'verify' | 'note';
  /** CITATION KEY (event-level) — traceable to observed evidence. */
  sourceEventId: string;
}

/** One step in the bundle — carries the step-level citation key (ordinal). */
export interface BundleStep {
  /** CITATION KEY (step-level), 1-based. */
  ordinal: number;
  title: string;
  action: string;
  system: string | null;
  expectedOutcome: string;
  /**
   * Honesty flag: true when a `verify`-type instruction observed the outcome,
   * false when the outcome is inferred. Mirrors the existing observed-vs-inferred
   * SOP rule.
   */
  outcomeObserved: boolean;
  durationLabel: string;
  confidence: number;
  isDecisionPoint: boolean;
  decisionLabel: string | null;
  friction: BundleFriction[];
  /** Observed automation hint for this step, or null (never fabricated). */
  automationHint: string | null;
  /** "Salesforce · Opportunities · Save" — observed-only, PII-capped. '' if none. */
  evidenceSnippet: string;
  instructions: BundleInstruction[];
}

/** Conformance signal (multi-run; N>=2 gated honestly). */
export interface BundleConformance {
  alignedRunCount: number;
  totalRunCount: number;
  /** alignedRunCount / totalRunCount * 100, rounded. Null when not meaningful. */
  pct: number | null;
}

/** Documentation-drift signal (multi-run). */
export interface BundleDrift {
  level: string;
  findings: string[];
}

export interface BundleSignals {
  /** Present only when meaningful (N>=2). Null otherwise. */
  conformance: BundleConformance | null;
  drift: BundleDrift | null;
  /** true when N<2 — the LLM/templates MUST disclose single-recording basis. */
  insufficientDataDisclosure: boolean;
  /** The honest cohort run count (number of runs the signals were computed over). */
  runCount: number;
}

export interface BundleProcessMeta {
  title: string;
  objective: string;
  stepCount: number;
  systems: string[];
  estimatedTime: string;
  confidence: number | null;
  /** SOP.generatedAt — the "recorded" provenance timestamp (UTC ISO string). */
  generatedAt: string;
  /** Count of steps flagged as decision points. */
  decisionPointCount: number;
  /** Count of steps carrying an observed automation hint. */
  automationCandidateCount: number;
}

/**
 * The closed, deterministically-ordered grounding context. Same SOP artifact ⇒
 * byte-identical bundle ⇒ identical `bundleHash`.
 */
export interface GroundedEvidenceBundle {
  processMeta: BundleProcessMeta;
  /** Steps in canonical (ordinal-ascending) order. */
  steps: BundleStep[];
  signals: BundleSignals;
  /**
   * sha256 over the canonical-serialized bundle, EXCLUDING this field. The
   * reproducibility / audit anchor. Format: "sha256:<hex>".
   */
  bundleHash: string;
}

// ─── CitationSet (the closed authoritative universe) ──────────────────────────

/**
 * The closed set of every id that may be cited. A claimed id outside this set
 * can never be a valid citation (the anti-fabrication guarantee).
 *
 * `resolve` maps a parsed citation token to its renderable reference. Keys:
 *   - step:    the numeric ordinal (number key)
 *   - event:   the sourceEventId (string key, prefixed `evt::` to avoid
 *              collision with a numeric-looking sourceEventId)
 *   - process: the literal string 'process'
 */
export interface CitationSet {
  /** Every step ordinal present in the bundle, ascending. */
  stepOrdinals: number[];
  /** Every instruction sourceEventId present in the bundle, in first-seen order. */
  sourceEventIds: string[];
  /** Whether the bundle is non-empty enough to authorize the `[[process]]` token. */
  processCitable: boolean;
  /** Resolver: parsed-token-key → renderable citation. */
  resolve: Map<string, ResolvedCitation>;
}

/** Key helpers for `CitationSet.resolve` — keep keying logic in one place. */
export const citationResolveKey = {
  step: (ordinal: number): string => `step::${ordinal}`,
  event: (sourceEventId: string): string => `event::${sourceEventId}`,
  process: (): string => 'process',
} as const;

// ─── AskResult (the first-class grounded-or-refused result) ───────────────────

export type AskResultKind = 'grounded' | 'refused';

/**
 * Refusal-reason classes (ADR-001 Decision 3). A refusal is a SUCCESSFUL,
 * evidence-honest non-answer — never an error.
 */
export type RefusalReason = 'insufficient_data' | 'out_of_scope' | 'no_relevant_evidence';

/** The deterministic question class a template matched (or 'refusal'/'unknown'). */
export type QuestionClass =
  | 'count'
  | 'shape'
  | 'decision'
  | 'conformance'
  | 'must_not_answer'
  | 'unmatched';

export interface AskResult {
  kind: AskResultKind;
  /** The grounded answer text, or the honest refusal/scoped-decline text. */
  answer: string;
  /** Convenience mirror of `kind === 'refused'`. */
  refused: boolean;
  /** Present IFF refused. */
  refusalReason: RefusalReason | null;
  /** The matched question class (diagnostic; also identifies must-not-answer). */
  questionClass: QuestionClass;
  /** Citations ⊆ CitationSet. Always [] for a refusal. */
  citations: ResolvedCitation[];
  /** ALWAYS false — disclosed, non-authoritative derived artifact. */
  isAuthoritative: false;
  /** Reproducibility anchor copied from the bundle. */
  bundleHash: string;
}
