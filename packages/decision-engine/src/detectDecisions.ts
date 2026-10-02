/**
 * detectDecisions - PATHE-P05 decision detection, signals 1-3.
 *
 * Signal 1 prefix divergence (trie), signal 2 UI state, signal 3 user options.
 * Pure and deterministic; see types.ts for the contract.
 */

import { analyzeConditions, refOf, type OutcomeDraft } from './conditions.js';
import {
  computeConfidence,
  evidenceQualityTerm,
  labelClarityTerm,
  shareTerm,
} from './confidence.js';
import { inferQuestion } from './question-inference.js';
import { buildTrie, compareKeys, type TrieNode } from './trie.js';
import {
  DECISION_ENGINE_VERSION,
  END_OUTCOME_KEY,
  MIN_RUNS_FOR_BRANCH,
  type DecisionDetectionInput,
  type DecisionDetectionResult,
  type DecisionOutcome,
  type DetectedDecision,
  type EvidenceRef,
} from './types.js';

const INFERRED_CONFIDENCE_THRESHOLD = 0.55;
const INFERRED_CONFIDENCE_CAP = 0.54;
const END_LABEL = '(end of workflow)';
const ROOT_LABEL = 'start of workflow';

function branchPointAt(node: TrieNode, prefixKeys: readonly string[]): DetectedDecision | null {
  const runsAtNode = node.visits.length;
  if (runsAtNode < MIN_RUNS_FOR_BRANCH) return null;

  const drafts: OutcomeDraft[] = [];
  const evidenceByOutcome = new Map<string, EvidenceRef[]>();
  const visitByRun = new Map(node.visits.map((v) => [v.runId, v]));

  for (const k of [...node.children.keys()].sort(compareKeys)) {
    const child = node.children.get(k)!;
    const runIds = child.visits.map((v) => v.runId);
    drafts.push({
      outcomeKey: k,
      label: child.label,
      runIds,
      branchVisits: runIds.map((r) => visitByRun.get(r)!),
      // Root branch visits carry no step; the outcome's first step traces to events.
      evidenceVisits: child.visits,
    });
    evidenceByOutcome.set(k, child.visits.map(refOf));
  }
  if (node.endingRunIds.length > 0) {
    const runIds = [...node.endingRunIds];
    const branchVisits = runIds.map((r) => visitByRun.get(r)!);
    drafts.push({ outcomeKey: END_OUTCOME_KEY, label: END_LABEL, runIds, branchVisits });
    evidenceByOutcome.set(END_OUTCOME_KEY, branchVisits.map(refOf));
  }
  if (drafts.length < 2) return null;

  const nodeLabel = prefixKeys.length === 0 ? ROOT_LABEL : node.label;
  const analysis = analyzeConditions(drafts, nodeLabel);
  const allConditions = drafts.flatMap((d) => [...analysis.conditionsByOutcome.get(d.outcomeKey)!]);
  const { decisionType, question } = inferQuestion({
    nodeLabel,
    outcomeLabels: drafts.map((d) => d.label),
    conditions: allConditions,
  });

  const outcomes: DecisionOutcome[] = drafts
    .map((d) => ({
      outcomeKey: d.outcomeKey,
      label: d.label,
      frequency: d.runIds.length,
      frequencyPct: d.runIds.length / runsAtNode,
      runIds: d.runIds,
      conditions: analysis.conditionsByOutcome.get(d.outcomeKey)!,
      evidence: evidenceByOutcome.get(d.outcomeKey)!,
    }))
    .sort((a, b) => b.frequency - a.frequency || compareKeys(a.outcomeKey, b.outcomeKey));

  const confidenceTerms = {
    runs: runsAtNode,
    consistency: shareTerm(analysis.explainedRuns, runsAtNode),
    evidenceQuality: evidenceQualityTerm(outcomes.flatMap((o) => [...o.evidence])),
    labelClarity: labelClarityTerm(outcomes.map((o) => o.label)),
    conflictingEvidence: shareTerm(analysis.conflictingRuns, runsAtNode),
  };

  const rawConfidence = computeConfidence(confidenceTerms);
  // P01 IFF: isInferred <=> confidence < 0.55. No real signal => cap below threshold.
  const allInferred = allConditions.every((c) => c.inferenceMethod === 'inferred');
  const confidenceScore = allInferred
    ? Math.min(rawConfidence, INFERRED_CONFIDENCE_CAP)
    : rawConfidence;

  return {
    decisionId: `bp:${JSON.stringify(prefixKeys)}`,
    prefixKeys: [...prefixKeys],
    nodeLabel,
    question,
    decisionType,
    runsAtNode,
    outcomes,
    confidenceScore,
    rawConfidence,
    confidenceTerms,
    isInferred: confidenceScore < INFERRED_CONFIDENCE_THRESHOLD,
  };
}

export function detectDecisions(input: DecisionDetectionInput): DecisionDetectionResult {
  const runs = input.runs.filter((r) => r.steps.length > 0);
  const totalRuns = runs.length;
  const decisions: DetectedDecision[] = [];
  if (totalRuns >= MIN_RUNS_FOR_BRANCH) {
    const walk = (node: TrieNode, path: readonly string[]): void => {
      const d = branchPointAt(node, path);
      if (d) decisions.push(d);
      for (const k of [...node.children.keys()].sort(compareKeys)) {
        walk(node.children.get(k)!, [...path, k]);
      }
    };
    walk(buildTrie(runs), []);
  }
  return { engineVersion: DECISION_ENGINE_VERSION, totalRuns, decisions };
}
