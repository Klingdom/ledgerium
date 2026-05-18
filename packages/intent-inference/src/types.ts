/**
 * Type definitions for the Ledgerium intent-inference engine.
 *
 * PATHE-P02 — deterministic verb+object label synthesizer.
 * Zero external runtime dependencies. All types are pure value-objects.
 *
 * Determinism contract:
 *   Same `IntentInferenceInput` → byte-identical `IntentInferenceOutput`.
 *   No `Date.now()` / `Math.random()` / I/O inside `inferIntent()`.
 *
 * @see inferIntent.ts — main orchestrator
 * @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md §3.6 backend §A
 */

import type { CanonicalVerb } from './verbs.js';
import type { CanonicalObject } from './objects.js';

// ── EvidenceSignalSource ──────────────────────────────────────────────────────

/**
 * Named sources that feed the 14-signal evidence priority pipeline (§A1).
 * Ordered by quality weight descending.
 */
export type EvidenceSignalSource =
  | 'elementText'       // weight 1.0 — target_summary.label from label-extractor
  | 'ariaLabel'         // weight 1.0 — aria-label on button/menuitem
  | 'placeholder'       // weight 0.9 — input placeholder
  | 'buttonText'        // weight 0.9 — button/submit text
  | 'modalTitle'        // weight 0.85 — closest [role="dialog"] heading
  | 'urlSemantic'       // weight 0.8 — route template path segments
  | 'pageTitle'         // weight 0.7 — page_context.pageTitle
  | 'formFieldName'     // weight 0.6 — selector [name=...] parse
  | 'applicationLabel'  // weight 0.5 — domain → system map
  | 'contextWindow'     // weight 0.4 — adjacent step normalizedLabels
  | 'tableHeader'       // weight 0.0 — v1 deferred; neighbor context
  | 'breadcrumbs'       // weight 0.0 — v1 deferred; neighbor context
  | 'tabLabel'          // weight 0.0 — v1 deferred; neighbor context
  | 'nearbyLabels';     // weight 0.0 — v1 deferred; neighbor context

/** Per-source quality weights (§A1 table). */
export const EVIDENCE_WEIGHTS: Readonly<Record<EvidenceSignalSource, number>> = {
  elementText:      1.0,
  ariaLabel:        1.0,
  placeholder:      0.9,
  buttonText:       0.9,
  modalTitle:       0.85,
  urlSemantic:      0.8,
  pageTitle:        0.7,
  formFieldName:    0.6,
  applicationLabel: 0.5,
  contextWindow:    0.4,
  tableHeader:      0.0,   // v1 deferred
  breadcrumbs:      0.0,   // v1 deferred
  tabLabel:         0.0,   // v1 deferred
  nearbyLabels:     0.0,   // v1 deferred
};

// ── EvidenceSignal ────────────────────────────────────────────────────────────

/**
 * A single evidence signal produced by the 14-signal pipeline.
 * Carries raw text, inferred verb/object, weight, and source name.
 */
export interface EvidenceSignal {
  /** Named source of this signal. */
  readonly source: EvidenceSignalSource;
  /** Raw text extracted from the source (not transformed). */
  readonly rawText: string;
  /** Verb inferred from this signal; null when inconclusive. */
  readonly inferredVerb: CanonicalVerb | null;
  /** Object inferred from this signal; null when inconclusive. */
  readonly inferredObject: CanonicalObject | 'item' | null;
  /** Quality weight for this source (from EVIDENCE_WEIGHTS). */
  readonly weight: number;
}

// ── NeighborContextEvidence ───────────────────────────────────────────────────

/**
 * DOM-context evidence captured by the extension-side neighbor-context extractor.
 * All fields optional — absence degrades gracefully (lower confidence, no throw).
 *
 * PATHE-P02 ships v1 collection via `neighbor-context-extractor.ts`.
 * The inference engine uses `modalTitle` in v1; other fields are v2 roadmap.
 */
export interface NeighborContextEvidence {
  /** Nearest modal/dialog heading; null when not inside a dialog. */
  readonly modalTitle: string | null;
  /** Column header for clicks inside a table; null when not in a table. */
  readonly tableHeader: string | null;
  /** Breadcrumb trail ordered root→leaf; empty array when no breadcrumbs found. */
  readonly breadcrumbTrail: readonly string[];
  /** Active tab label; null when no tab-strip found. */
  readonly activeTabLabel: string | null;
  /** Nearby associated label texts (preceding sibling labels, [for=id] labels). */
  readonly nearbyLabels: readonly string[];
}

// ── IntentInferenceInput ──────────────────────────────────────────────────────

/**
 * Input to the intent-inference engine — a subset of `DerivedStep` fields
 * plus optional neighbor-context evidence.
 *
 * Designed to be constructible from a `DerivedStep` without modification;
 * fields are optional so that older records without `neighborContext` degrade
 * gracefully (lower confidence, no throw).
 */
export interface IntentInferenceInput {
  /** Step grouping reason from segmentation-engine (GroupingReason). */
  readonly groupingReason: string;
  /** Raw element-level label from `extractLabel()` (target_summary.label). */
  readonly elementText: string | null;
  /** Element role (target_summary.role). */
  readonly elementRole: string | null;
  /** Element type (target_summary.elementType). */
  readonly elementType: string | null;
  /** True when the target is sensitive (target_summary.isSensitive). */
  readonly isSensitive: boolean;
  /** URL route template (page_context.routeTemplate); null when unknown. */
  readonly routeTemplate: string | null;
  /** Page title (page_context.pageTitle); null when unknown. */
  readonly pageTitle: string | null;
  /** Application / system label (page_context.applicationLabel); null when unknown. */
  readonly applicationLabel: string | null;
  /** Target selector string (target_summary.selector); null when unknown. */
  readonly selector: string | null;
  /**
   * Neighbor-context evidence from DOM traversal (PATHE-P02 extension).
   * Absent in pre-PATHE-P02 records — engine degrades gracefully.
   */
  readonly neighborContext?: NeighborContextEvidence | null;
  /**
   * Normalized labels of adjacent steps for context-window signal (§A1 signal 11).
   * The caller passes `[prevLabel, nextLabel]`; either may be null.
   */
  readonly contextWindowLabels?: readonly [string | null, string | null] | null;
}

// ── IntentInferenceOutput ─────────────────────────────────────────────────────

/**
 * Output of the intent-inference engine.
 *
 * Determinism guarantee: same input → byte-identical output.
 */
export interface IntentInferenceOutput {
  /**
   * Synthesized human-readable label (≤ 60 chars).
   * Examples: "Submit invoice", "Navigate to customer list", "Select approval status: Pending"
   *
   * Fallback chain (§A4):
   *   1. `${titleCase(verb)} ${object}` when verb + object both inferred
   *   2. `${titleCase(verb)} item` when verb inferred but no object
   *   3. `Interact with ${object}` when object inferred but no verb
   *   4. `Interact with element` when no evidence yields verb or object
   */
  readonly normalizedLabel: string;
  /**
   * Confidence in [0, 1] computed by §A5 formula.
   * Audit-honesty IFF: `normalizedLabelConfidence < 0.55 IFF lowDataFlag === true`
   */
  readonly normalizedLabelConfidence: number;
  /**
   * True when confidence < 0.55 — indicates low evidence.
   * Audit-honesty invariant enforced by Group B test.
   */
  readonly lowDataFlag: boolean;
  /**
   * Winning verb from closed-enum `CANONICAL_VERBS`; null when no verb inferred.
   */
  readonly verb: CanonicalVerb | null;
  /**
   * Winning object from closed-enum `CANONICAL_OBJECTS` or 'item' fallback;
   * null when no object inferred.
   */
  readonly object: CanonicalObject | 'item' | null;
  /** All evidence signals collected during pipeline execution. */
  readonly evidenceSignals: readonly EvidenceSignal[];
  /** Version of the intent-inference engine that produced this output. */
  readonly inferenceVersion: string;
}
