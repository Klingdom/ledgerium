/**
 * answer-templates — deterministic, NO-LLM grounded answers (Phase A).
 *
 * A PURE question classifier + templated grounded answers for the Phase-A
 * question classes the evidence can answer WITHOUT a model:
 *
 *   - COUNT       — how many steps / systems / decisions / automation candidates
 *   - SHAPE       — what systems / the step sequence / handoffs
 *   - DECISION    — what branches / decision points
 *   - CONFORMANCE — alignment / drift, honestly N>=2 gated
 *
 * Each grounded answer is built ONLY from the `GroundedEvidenceBundle` and
 * carries its citations (drawn from the `CitationSet`, validated through
 * `validateCitations` so citations ⊆ CitationSet is structurally guaranteed).
 *
 * For anything it cannot deterministically ground — the PRD must-not-answer
 * classes (ROI, compliance, headcount/cost, prediction, intent, out-of-evidence
 * PII, general world knowledge) and free-form questions no template matches — it
 * returns an HONEST REFUSAL / SCOPED-DECLINE (a first-class result, not an
 * error), naming WHY and never fabricating. N<2 gates conformance to a refusal.
 *
 * DETERMINISM (ADR-001 rule 1): no `Date.now()` / `Math.random()` / network /
 * I/O. The classifier is a fixed lexical matcher; same question + same bundle ⇒
 * identical result. ZERO LLM / provider / network import (no-import test).
 *
 * @module ask-this-process/answerTemplates
 */

import {
  validateCitations,
  type ClaimedCitation,
} from './citationValidator';
import type {
  GroundedEvidenceBundle,
  CitationSet,
  AskResult,
  ResolvedCitation,
  RefusalReason,
  QuestionClass,
} from './types';

// ─── Question classification (deterministic lexical matcher) ──────────────────

/**
 * Must-not-answer classes (PRD §6.2). Order matters: these are checked FIRST so
 * a question like "what's the ROI of automating step 3?" is declined even though
 * it also contains automation/step keywords. Each carries a scoped-decline voice
 * (PRD DD-E: decline the unsupported claim, then offer the observable).
 */
interface MustNotAnswerRule {
  id: string;
  patterns: RegExp[];
  /** The scoped-decline body (no fabrication; names the missing evidence class). */
  decline: string;
}

const MUST_NOT_ANSWER_RULES: MustNotAnswerRule[] = [
  {
    id: 'roi_financial',
    patterns: [/\broi\b/i, /\bsav(e|ing|ings)\b/i, /\bdollar/i, /\$/, /\bmoney\b/i, /\brevenue\b/i, /\bcost savings?\b/i, /\bpayback\b/i],
    decline:
      "I can't give a dollar figure or ROI — Ledgerium has no labor-cost or pricing data. I can tell you which steps look automatable and how the process is shaped, but not the financial value.",
  },
  {
    id: 'compliance',
    patterns: [/\bcomplian(t|ce)\b/i, /\bsox\b/i, /\bhipaa\b/i, /\bgdpr\b/i, /\bregulat/i, /\baudit(ed)? (for|against)\b/i, /\bcertif/i],
    decline:
      "I can't certify regulatory compliance. Ledgerium observes behavior and provides an immutable evidence trail of what was recorded, but it does not attest SOX/HIPAA/GDPR or any compliance standard.",
  },
  {
    id: 'headcount_cost',
    patterns: [/\bhow many people\b/i, /\bheadcount\b/i, /\bstaff(ing)?\b/i, /\bfte\b/i, /\bhow much does (it|this) cost\b/i, /\bcost to run\b/i],
    decline:
      "I can't answer headcount, staffing, or running-cost questions — no labor or cost data is observed. I can describe the steps, systems, and decision points that were recorded.",
  },
  {
    id: 'prediction',
    patterns: [/\bpredict/i, /\bforecast/i, /\bwill (it|this) (break|fail|happen)\b/i, /\bnext (quarter|month|year|time)\b/i, /\bgoing to\b/i, /\bin the future\b/i],
    decline:
      "I can't forecast or predict future behavior. I can only report what was observed in the recording(s) — past observation, never a prediction.",
  },
  {
    id: 'intent',
    patterns: [/\bwhy did (the user|they|the person|someone)\b/i, /\bwhat were they thinking\b/i, /\bintent(ion)?\b/i, /\bon purpose\b/i, /\bmotivation\b/i],
    decline:
      "I can tell you what was done and on which screen, but not why the person chose to — I can't attribute human intent or motivation, only the observed action.",
  },
  {
    id: 'pii_out_of_evidence',
    patterns: [/\bcustomer'?s? name\b/i, /\bwhat is the (name|email|phone|address|value)\b/i, /\bfield value\b/i, /\bssn\b/i, /\bcredit card\b/i, /\bpassword\b/i],
    decline:
      "I can't surface specific field values, names, or other personal data. Evidence is observed-only and PII-capped — I won't reconstruct values that aren't part of the abstracted recording.",
  },
  {
    id: 'general_knowledge',
    patterns: [/\bbest (crm|tool|software|practice)\b/i, /\bwhat is the best\b/i, /\bshould i use\b/i, /\bcompare(d)? to (other|my) (tools?|software|products?)\b/i, /\bindustry (standard|benchmark)\b/i],
    decline:
      "That's outside what this surface answers. I only answer about this one recorded process — not general knowledge, tool recommendations, or comparisons to other products.",
  },
];

interface AnswerableRule {
  klass: Exclude<QuestionClass, 'must_not_answer' | 'unmatched'>;
  patterns: RegExp[];
}

/**
 * Answerable-class lexical rules. Checked AFTER must-not-answer. First match
 * wins (CONFORMANCE before COUNT so "how aligned…" routes to conformance).
 */
const ANSWERABLE_RULES: AnswerableRule[] = [
  {
    klass: 'conformance',
    patterns: [/\bconform/i, /\balign/i, /\bdrift/i, /\bmatch(es)? reality\b/i, /\bup to date\b/i, /\bout of date\b/i, /\bfollow this sop\b/i, /\bhow many runs\b/i, /\bfresh(ness)?\b/i],
  },
  {
    klass: 'decision',
    patterns: [/\bdecision/i, /\bbranch/i, /\bif\b.*\bthen\b/i, /\bchoose|choice\b/i, /\bfork\b/i, /\bcondition(al|s)?\b/i, /\bwhen does (it|the process)\b/i],
  },
  {
    klass: 'count',
    patterns: [/\bhow many\b/i, /\bnumber of\b/i, /\bcount\b/i, /\bhow much\b/i, /\bhow long is\b/i, /\btotal\b/i],
  },
  {
    klass: 'shape',
    patterns: [/\bshape\b/i, /\bwhat systems?\b/i, /\bwhich (systems?|apps?|tools?)\b/i, /\bhandoff/i, /\bsequence\b/i, /\bsteps?\b/i, /\bwalk me through\b/i, /\bwhat happens\b/i, /\boverview\b/i, /\bsummar(y|ize)\b/i, /\bflow\b/i],
  },
];

export interface ClassifyResult {
  klass: QuestionClass;
  /** For must-not-answer: the matched rule id + scoped-decline body. */
  mustNotAnswer: { id: string; decline: string } | null;
}

/** Deterministic question classifier. Must-not-answer is checked first. */
export function classifyQuestion(question: string): ClassifyResult {
  const q = typeof question === 'string' ? question : '';

  for (const rule of MUST_NOT_ANSWER_RULES) {
    if (rule.patterns.some((p) => p.test(q))) {
      return { klass: 'must_not_answer', mustNotAnswer: { id: rule.id, decline: rule.decline } };
    }
  }
  for (const rule of ANSWERABLE_RULES) {
    if (rule.patterns.some((p) => p.test(q))) {
      return { klass: rule.klass, mustNotAnswer: null };
    }
  }
  return { klass: 'unmatched', mustNotAnswer: null };
}

// ─── Result builders ──────────────────────────────────────────────────────────

/**
 * Build a grounded result. Citations are ALWAYS routed through
 * `validateCitations` so the invariant "citations ⊆ CitationSet" holds
 * structurally — a template can never emit an unauthorized citation. If, after
 * validation, zero citations survive, the answer is downgraded to a refusal
 * (cite-or-refuse).
 */
function grounded(
  bundle: GroundedEvidenceBundle,
  citationSet: CitationSet,
  klass: QuestionClass,
  answer: string,
  claimed: ClaimedCitation[],
): AskResult {
  const { valid } = validateCitations(claimed, citationSet);
  if (valid.length === 0) {
    return refusal(bundle, klass, 'no_relevant_evidence',
      "I couldn't ground that answer in this recording's evidence.");
  }
  return {
    kind: 'grounded',
    answer,
    refused: false,
    refusalReason: null,
    questionClass: klass,
    citations: valid,
    isAuthoritative: false,
    bundleHash: bundle.bundleHash,
  };
}

function refusal(
  bundle: GroundedEvidenceBundle,
  klass: QuestionClass,
  reason: RefusalReason,
  answer: string,
): AskResult {
  return {
    kind: 'refused',
    answer,
    refused: true,
    refusalReason: reason,
    questionClass: klass,
    citations: [],
    isAuthoritative: false,
    bundleHash: bundle.bundleHash,
  };
}

// ─── Per-class deterministic answers ──────────────────────────────────────────

function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : plural ?? singular + 's'}`;
}

function answerCount(
  bundle: GroundedEvidenceBundle,
  citationSet: CitationSet,
): AskResult {
  const meta = bundle.processMeta;
  if (meta.stepCount === 0) {
    return refusal(bundle, 'count', 'insufficient_data',
      "This recording has no steps yet, so I can't give you any counts.");
  }
  const sys = meta.systems.length;
  const parts = [
    `This process has ${pluralize(meta.stepCount, 'step')}`,
    `${pluralize(sys, 'system')}`,
    `${pluralize(meta.decisionPointCount, 'decision point')}`,
    `and ${pluralize(meta.automationCandidateCount, 'automation candidate')}`,
  ];
  const answer = `${parts.join(', ')} [[process]].`;
  return grounded(bundle, citationSet, 'count', answer, [{ kind: 'process' }]);
}

function answerShape(
  bundle: GroundedEvidenceBundle,
  citationSet: CitationSet,
): AskResult {
  const steps = bundle.steps;
  if (steps.length === 0) {
    return refusal(bundle, 'shape', 'insufficient_data',
      "This recording has no steps yet, so there's no process shape to describe.");
  }
  const claimed: ClaimedCitation[] = [{ kind: 'process' }];
  const systems = bundle.processMeta.systems;
  const sequenceParts: string[] = [];
  for (const step of steps) {
    claimed.push({ kind: 'step', ordinal: step.ordinal });
    const sys = step.system ? ` (${step.system})` : '';
    sequenceParts.push(`${step.ordinal}. ${step.title || step.action || 'step'}${sys} [[step:${step.ordinal}]]`);
  }
  const systemsLine = systems.length > 0
    ? `It touches ${pluralize(systems.length, 'system')}: ${systems.join(', ')}.`
    : 'No distinct systems were observed.';
  const answer = `This process has ${pluralize(steps.length, 'step')} [[process]]. ${systemsLine}\n\n${sequenceParts.join('\n')}`;
  return grounded(bundle, citationSet, 'shape', answer, claimed);
}

function answerDecision(
  bundle: GroundedEvidenceBundle,
  citationSet: CitationSet,
): AskResult {
  const decisionSteps = bundle.steps.filter((s) => s.isDecisionPoint);
  if (decisionSteps.length === 0) {
    // In-scope question, but this specific process has no decision evidence.
    return refusal(bundle, 'decision', 'no_relevant_evidence',
      "No decision points or branches were observed in this recording — it ran as a single linear path. If a branch exists but wasn't recorded, it won't appear here.");
  }
  const claimed: ClaimedCitation[] = [];
  const lines: string[] = [];
  for (const step of decisionSteps) {
    claimed.push({ kind: 'step', ordinal: step.ordinal });
    const label = step.decisionLabel ?? (step.title || step.action || 'decision point');
    lines.push(`• Step ${step.ordinal}: ${label} [[step:${step.ordinal}]]`);
  }
  const answer = `This process has ${pluralize(decisionSteps.length, 'observed decision point')}:\n${lines.join('\n')}`;
  return grounded(bundle, citationSet, 'decision', answer, claimed);
}

function answerConformance(
  bundle: GroundedEvidenceBundle,
  citationSet: CitationSet,
): AskResult {
  const signals = bundle.signals;
  // N<2 gating: conformance is undefined on a single recording.
  if (signals.insufficientDataDisclosure || signals.conformance === null) {
    const basis = signals.runCount <= 1
      ? `Based on ${signals.runCount === 0 ? 'no' : 'a single'} recording`
      : 'Conformance is not yet available';
    return refusal(bundle, 'conformance', 'insufficient_data',
      `${basis}, I can't report conformance — it needs at least 2 recorded runs to compare. I can describe this recording's steps, systems, and decision points instead.`);
  }
  const c = signals.conformance;
  let answer = `${c.alignedRunCount} of ${c.totalRunCount} recorded runs follow this SOP (${c.pct}%) [[process]].`;
  if (signals.drift && signals.drift.findings.length > 0) {
    answer += ` Drift observed: ${signals.drift.findings[0]}.`;
  }
  return grounded(bundle, citationSet, 'conformance', answer, [{ kind: 'process' }]);
}

// ─── Public entry: answerQuestion ─────────────────────────────────────────────

/**
 * Deterministically answer a question from the grounded bundle, or honestly
 * refuse. NO LLM. The single Phase-A entry point.
 *
 * PURE: same (question, bundle, citationSet) ⇒ identical `AskResult`.
 */
export function answerQuestion(
  question: string,
  bundle: GroundedEvidenceBundle,
  citationSet: CitationSet,
): AskResult {
  const classification = classifyQuestion(question);

  switch (classification.klass) {
    case 'must_not_answer':
      return refusal(
        bundle,
        'must_not_answer',
        'out_of_scope',
        classification.mustNotAnswer?.decline ??
          "That's outside what this surface can answer from the recorded evidence.",
      );
    case 'count':
      return answerCount(bundle, citationSet);
    case 'shape':
      return answerShape(bundle, citationSet);
    case 'decision':
      return answerDecision(bundle, citationSet);
    case 'conformance':
      return answerConformance(bundle, citationSet);
    case 'unmatched':
    default:
      return refusal(
        bundle,
        'unmatched',
        'no_relevant_evidence',
        "I can't ground that question in this recording. I can answer about this process's steps, systems, decision points, and (with 2+ runs) how well it conforms to how the work is actually done — try asking one of those.",
      );
  }
}

/** Re-export for callers that want only the resolved-citation type. */
export type { ResolvedCitation };
