/**
 * ask-context-builder — the deterministic heart of "Ask This Process" (Phase A).
 *
 * `buildAskContext(input)` is a PURE transform over the raw persisted
 * `process_output` SOP artifact (`@ledgerium/process-engine` `SOP`/`ProcessMap`)
 * + the already-computed `SopIntelligenceInput` multi-run signals. It produces:
 *
 *   - a `GroundedEvidenceBundle` — the closed, deterministically-ordered evidence
 *     that may ground an answer, and NOTHING else; and
 *   - a closed `CitationSet` — the exhaustive universe of citable ids (every step
 *     ordinal + every instruction sourceEventId + the `[[process]]` token).
 *
 * SUBSTRATE CORRECTION (feasibility G-1): the citation primitive
 * `sourceEventId` + `ordinal` survives ONLY on the raw engine SOP, not on the
 * client `SOPViewModel`. This builder therefore consumes the RAW artifact
 * server-side. Page context (pageTitle/routeTemplate) comes from the
 * `ProcessMap.nodes[].metadata`, keyed by ordinal.
 *
 * DETERMINISM (ADR-001 rule 1): no `Date.now()` / `Math.random()` / `new Date()`
 * -of-now / network / I/O. Steps are emitted ordinal-ascending. The only
 * timestamp is `SOP.generatedAt` (a stored value), reformatted UTC. Same artifact
 * ⇒ byte-identical bundle ⇒ identical `bundleHash`.
 *
 * HONESTY (ADR-001 rule 3 + the SOP honesty contract): observed-only evidence;
 * page titles PII-capped via `deriveStepEvidence`/`truncatePageTitle`; N<2 sets
 * `insufficientDataDisclosure`; nothing fabricated (absent ⇒ omitted/null).
 *
 * ZERO LLM / provider / network import (enforced by a no-import test).
 *
 * @module ask-this-process/contextBuilder
 */

import type {
  SOP,
  SOPStep,
  SOPInstruction,
  ProcessMap,
} from '@ledgerium/process-engine';

import {
  deriveStepEvidence,
  deriveAlignmentPill,
  type SopIntelligenceInput,
} from '@/components/sop-view/adapters/sopIntelligence';

import { canonicalSha256, type CanonicalValue } from './canonicalHash';
import {
  citationResolveKey,
  type GroundedEvidenceBundle,
  type BundleStep,
  type BundleInstruction,
  type BundleFriction,
  type BundleSignals,
  type BundleProcessMeta,
  type CitationSet,
  type ResolvedCitation,
} from './types';

/** Input to the builder. All fields are already persisted + loaded by the route. */
export interface BuildAskContextInput {
  /** The raw `process_output.sop` artifact (carries ordinal + sourceEventId). */
  sop: SOP;
  /** The raw `process_output.processMap` — supplies per-step page context. */
  processMap: ProcessMap | null | undefined;
  /** Already-computed multi-run signals (alignment/drift + cohort runCount). */
  intelligence: SopIntelligenceInput | null | undefined;
}

export interface BuildAskContextResult {
  bundle: GroundedEvidenceBundle;
  citationSet: CitationSet;
}

const MAX_PAGE_TITLE = 40;

/** Cap a captured page title (PII guard); observed-only, truncate-not-fabricate. */
function truncatePageTitle(value: string | null): string | null {
  if (value === null) return null;
  if (value.length <= MAX_PAGE_TITLE) return value;
  return value.slice(0, MAX_PAGE_TITLE).replace(/\s+$/, '') + '…';
}

function cleanString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * Reformat a stored timestamp to a stable UTC ISO string. Uses the artifact's
 * OWN stored value — NOT the wall clock. An unparseable value passes through
 * verbatim (we never fabricate a timestamp).
 */
function toUtcIso(stored: string | null | undefined): string {
  const s = cleanString(stored);
  if (s === null) return '';
  const parsed = Date.parse(s);
  if (Number.isNaN(parsed)) return s;
  // `new Date(<fixed epoch>)` is deterministic — it is a fixed stored value, not now().
  return new Date(parsed).toISOString();
}

/**
 * Derive whether a step's outcome was OBSERVED vs inferred. Honesty flag:
 * observed IFF the step carries at least one `verify`-type instruction (the
 * recorder captured a confirmation event). Mirrors the view-model rule. Pure.
 */
function deriveOutcomeObserved(step: SOPStep): boolean {
  return step.instructions.some((i) => i.instructionType === 'verify');
}

/**
 * Derive a single observed automation hint for a step, or null. Observed-only:
 * we surface a hint ONLY when a real friction signal indicates a repetitive /
 * manual-workaround / redundant pattern at this step — never a fabricated
 * "this could be automated". Deterministic (reads existing fields only).
 */
function deriveAutomationHint(step: SOPStep): string | null {
  const indicators = step.frictionIndicators ?? [];
  // The friction types that map to an automation opportunity, observed-only.
  const automatable = indicators.find(
    (f) =>
      f.type === 'redundant_action' ||
      f.type === 'manual_workaround' ||
      f.type === 'repeated_error' ||
      f.type === 'excessive_navigation',
  );
  if (!automatable) return null;
  // Use the observed friction label verbatim — it is a real captured signal.
  const label = cleanString(automatable.label);
  return label;
}

function mapInstructionType(
  t: SOPInstruction['instructionType'],
): BundleInstruction['type'] {
  // Default unclassified instructions to 'action' (the dominant observed kind).
  if (t === 'wait' || t === 'verify' || t === 'note') return t;
  return 'action';
}

/** Build the page-context lookup (ordinal → pageTitle) from the process map. */
function buildPageTitleByOrdinal(
  processMap: ProcessMap | null | undefined,
): Map<number, string | null> {
  const map = new Map<number, string | null>();
  if (!processMap) return map;
  for (const node of processMap.nodes) {
    // Only step nodes carry an ordinal we cite on (start/end are synthetic).
    if (typeof node.ordinal === 'number') {
      map.set(node.ordinal, cleanString(node.metadata?.pageTitle));
    }
  }
  return map;
}

/**
 * Build one bundle step from a raw SOPStep + its page context. Deterministic.
 */
function buildStep(
  step: SOPStep,
  pageTitle: string | null,
): BundleStep {
  const instructions: BundleInstruction[] = step.instructions.map((ins) => ({
    sequence: ins.sequence,
    text: cleanString(ins.instruction) ?? '',
    type: mapInstructionType(ins.instructionType),
    sourceEventId: ins.sourceEventId,
  }));

  const friction: BundleFriction[] = (step.frictionIndicators ?? []).map((f) => ({
    type: f.type,
    label: f.label,
    severity: f.severity,
  }));

  // Evidence snippet: reuse the existing observed-only, PII-capped derivation.
  const firstInstructionLabel = cleanString(step.instructions[0]?.targetLabel);
  const evidence = deriveStepEvidence({
    applicationLabel: cleanString(step.system),
    pageTitle,
    actionLabel: firstInstructionLabel,
  });

  return {
    ordinal: step.ordinal,
    title: cleanString(step.title) ?? '',
    action: cleanString(step.action) ?? '',
    system: cleanString(step.system),
    expectedOutcome: cleanString(step.expectedOutcome) ?? '',
    outcomeObserved: deriveOutcomeObserved(step),
    durationLabel: cleanString(step.durationLabel) ?? '',
    confidence: Number.isFinite(step.confidence) ? step.confidence : 0,
    isDecisionPoint: step.isDecisionPoint === true,
    decisionLabel: cleanString(step.decisionLabel),
    friction,
    automationHint: deriveAutomationHint(step),
    evidenceSnippet: evidence.text,
    instructions,
  };
}

/** Build the honesty-gated multi-run signals block. */
function buildSignals(
  intelligence: SopIntelligenceInput | null | undefined,
): BundleSignals {
  const pill = deriveAlignmentPill(intelligence ?? null);
  const runCount = Math.max(0, Math.trunc(intelligence?.runCount ?? 0));
  const insufficient = pill.kind === 'insufficient';

  // Conformance is meaningful ONLY when the pill gated it in (N>=2 + hasSignal).
  const conformance =
    pill.hasSignal && pill.conformancePct !== null
      ? {
          alignedRunCount: pill.alignedRunCount,
          totalRunCount: pill.runCount,
          pct: pill.conformancePct,
        }
      : null;

  const driftSource = intelligence?.documentationDrift ?? null;
  const drift =
    !insufficient && driftSource
      ? {
          level: driftSource.level,
          findings: (driftSource.findings ?? []).map((f) => String(f)),
        }
      : null;

  return {
    conformance,
    drift,
    insufficientDataDisclosure: insufficient,
    runCount: Math.max(runCount, pill.runCount),
  };
}

function buildProcessMeta(sop: SOP, steps: BundleStep[]): BundleProcessMeta {
  const objective =
    cleanString(sop.businessObjective) ?? cleanString(sop.purpose) ?? '';
  const decisionPointCount = steps.filter((s) => s.isDecisionPoint).length;
  const automationCandidateCount = steps.filter(
    (s) => s.automationHint !== null,
  ).length;
  const confidence =
    sop.qualityIndicators && Number.isFinite(sop.qualityIndicators.averageConfidence)
      ? sop.qualityIndicators.averageConfidence
      : null;

  return {
    title: cleanString(sop.title) ?? '',
    objective,
    stepCount: steps.length,
    systems: (sop.systems ?? []).map((s) => String(s)),
    estimatedTime: cleanString(sop.estimatedTime) ?? '',
    confidence,
    generatedAt: toUtcIso(sop.generatedAt),
    decisionPointCount,
    automationCandidateCount,
  };
}

/**
 * Build the closed CitationSet from the (already canonically ordered) bundle.
 * A pure fold: every step ordinal + every instruction sourceEventId + the
 * process token. The `resolve` map is built in the same pass.
 */
function buildCitationSet(bundle: GroundedEvidenceBundle): CitationSet {
  const stepOrdinals: number[] = [];
  const sourceEventIds: string[] = [];
  const seenEvents = new Set<string>();
  const resolve = new Map<string, ResolvedCitation>();
  const recordedAt = bundle.processMeta.generatedAt;

  for (const step of bundle.steps) {
    stepOrdinals.push(step.ordinal);
    const stepLabelSuffix = step.title ? ` · ${step.title}` : '';
    resolve.set(citationResolveKey.step(step.ordinal), {
      kind: 'step',
      stepOrdinal: step.ordinal,
      sourceEventId: null,
      recordedAt,
      label: `step ${step.ordinal}`,
    });

    for (const ins of step.instructions) {
      const id = ins.sourceEventId;
      if (!id || seenEvents.has(id)) continue;
      seenEvents.add(id);
      sourceEventIds.push(id);
      resolve.set(citationResolveKey.event(id), {
        kind: 'event',
        stepOrdinal: step.ordinal,
        sourceEventId: id,
        recordedAt,
        label: `step ${step.ordinal}${stepLabelSuffix}`,
      });
    }
  }

  const processCitable = bundle.steps.length > 0;
  if (processCitable) {
    resolve.set(citationResolveKey.process(), {
      kind: 'process',
      stepOrdinal: null,
      sourceEventId: null,
      recordedAt,
      label: 'this process',
    });
  }

  return { stepOrdinals, sourceEventIds, processCitable, resolve };
}

/**
 * Build the deterministic `GroundedEvidenceBundle` + closed `CitationSet` from
 * the raw persisted SOP artifact. PURE + DETERMINISTIC: same input ⇒ byte-
 * identical bundle + identical hash, regardless of input step order (steps are
 * canonicalized ordinal-ascending before serialization).
 */
export function buildAskContext(input: BuildAskContextInput): BuildAskContextResult {
  const { sop, processMap, intelligence } = input;

  const pageTitleByOrdinal = buildPageTitleByOrdinal(processMap);

  // Canonical order: ordinal ascending, stable tie-break by stepId. Sort a COPY
  // so we never mutate the caller's artifact.
  const orderedSteps = [...(sop.steps ?? [])].sort((a, b) => {
    if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
    return a.stepId < b.stepId ? -1 : a.stepId > b.stepId ? 1 : 0;
  });

  const steps: BundleStep[] = orderedSteps.map((step) =>
    buildStep(step, pageTitleByOrdinal.get(step.ordinal) ?? null),
  );

  const processMeta = buildProcessMeta(sop, steps);
  const signals = buildSignals(intelligence);

  // Assemble the bundle WITHOUT the hash first, then hash, then attach.
  const hashable = { processMeta, steps, signals };
  const bundleHash = canonicalSha256(hashable as unknown as CanonicalValue);

  const bundle: GroundedEvidenceBundle = {
    processMeta,
    steps,
    signals,
    bundleHash,
  };

  const citationSet = buildCitationSet(bundle);

  return { bundle, citationSet };
}
