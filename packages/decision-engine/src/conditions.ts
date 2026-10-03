/**
 * Condition inference for signals 2 (UI state) and 3 (user options), plus the
 * role attribute used by the role-based question pattern.
 *
 * An attribute value "explains" an outcome only if it maps to that outcome
 * alone; a value seen under >1 outcome is conflicting evidence.
 */

import { capDescription, isFreeText, safeLabel } from './text-safety.js';
import type { TrieVisit } from './trie.js';
import type { EvidenceRef, InferredCondition } from './types.js';

export interface OutcomeDraft {
  readonly outcomeKey: string;
  readonly label: string;
  readonly runIds: readonly string[];
  /** Visits at the BRANCH node belonging to this outcome's runs (sorted by runId). */
  readonly branchVisits: readonly TrieVisit[];
  /** Visits used as evidence for inferred_unknown (defaults to branchVisits). */
  readonly evidenceVisits?: readonly TrieVisit[];
}

export interface ConditionAnalysis {
  readonly conditionsByOutcome: ReadonlyMap<string, readonly InferredCondition[]>;
  /** Runs whose outcome has >=1 observed (non-fallback) condition. */
  readonly explainedRuns: number;
  /** Runs whose attribute value also appears under a different outcome. */
  readonly conflictingRuns: number;
}

type Attr = 'uiState' | 'actorRole';

const norm = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  // Free text (names, numbers, dates, placeholders) is instance data, not a
  // structural condition: it never explains an outcome (loop 144, #331 item 7).
  return t === '' || isFreeText(t, true) ? null : t;
};
const lower = (s: string): string => s.trim().toLowerCase();

export function refOf(v: TrieVisit): EvidenceRef {
  return { runId: v.runId, stepId: v.step?.stepId ?? '', eventIds: v.step?.eventIds ?? [] };
}

function attrValue(v: TrieVisit, a: Attr): string | null {
  return norm(v.step?.[a]);
}

export function analyzeConditions(
  drafts: readonly OutcomeDraft[],
  nodeLabel: string,
): ConditionAnalysis {
  const byOutcome = new Map<string, InferredCondition[]>();
  for (const d of drafts) byOutcome.set(d.outcomeKey, []);
  const conflicting = new Set<string>();

  const attrs: ReadonlyArray<{ attr: Attr; type: 'ui_state' | 'role_permission' }> = [
    { attr: 'uiState', type: 'ui_state' },
    { attr: 'actorRole', type: 'role_permission' },
  ];

  for (const { attr, type } of attrs) {
    const valueToOutcomes = new Map<string, Set<string>>();
    for (const d of drafts) {
      for (const v of d.branchVisits) {
        const val = attrValue(v, attr);
        if (val === null) continue;
        let set = valueToOutcomes.get(val);
        if (!set) {
          set = new Set();
          valueToOutcomes.set(val, set);
        }
        set.add(d.outcomeKey);
      }
    }
    for (const d of drafts) {
      const perValue = new Map<string, TrieVisit[]>();
      for (const v of d.branchVisits) {
        const val = attrValue(v, attr);
        if (val === null) continue;
        if ((valueToOutcomes.get(val)?.size ?? 0) > 1) {
          conflicting.add(v.runId);
        } else {
          const list = perValue.get(val) ?? [];
          list.push(v);
          perValue.set(val, list);
        }
      }
      for (const val of [...perValue.keys()].sort()) {
        const description =
          type === 'ui_state'
            ? `When "${val}" is shown at "${safeLabel(nodeLabel)}", users take "${safeLabel(d.label)}"`
            : `When the actor role is "${val}", users take "${safeLabel(d.label)}"`;
        byOutcome.get(d.outcomeKey)!.push({
          conditionType: type,
          description: capDescription(description),
          inferenceMethod: 'observed',
          evidence: perValue.get(val)!.map(refOf),
        });
      }
    }
  }

  // Signal 3: user options offered at the branch step (every run of the outcome
  // must have been offered >=2 options including this outcome's label).
  for (const d of drafts) {
    if (d.branchVisits.length === 0) continue;
    const target = lower(d.label);
    const allOffered = d.branchVisits.every((v) => {
      const raw = (v.step?.offeredOptions ?? []).map((o) => o.trim()).filter((o) => o !== '');
      if (raw.some((o) => isFreeText(o, true))) return false;
      const set = new Set(raw.map(lower));
      return set.size >= 2 && set.has(target);
    });
    if (allOffered) {
      const shown = (d.branchVisits[0]!.step?.offeredOptions ?? []).map((o) => o.trim());
      byOutcome.get(d.outcomeKey)!.push({
        conditionType: 'user_input',
        description: capDescription(
          `User chooses "${safeLabel(d.label)}" from the offered options: ${shown.join(', ')}`,
        ),
        inferenceMethod: 'observed',
        evidence: d.branchVisits.map(refOf),
      });
    }
  }

  let explainedRuns = 0;
  for (const d of drafts) {
    const list = byOutcome.get(d.outcomeKey)!;
    if (list.length > 0) {
      explainedRuns += d.runIds.length;
    } else {
      list.push({
        conditionType: 'inferred_unknown',
        description: capDescription(
          `No distinguishing condition observed for "${safeLabel(d.label)}" (${d.runIds.length} run${d.runIds.length === 1 ? '' : 's'})`,
        ),
        inferenceMethod: 'inferred',
        evidence: (d.evidenceVisits ?? d.branchVisits).map(refOf),
      });
    }
  }

  return { conditionsByOutcome: byOutcome, explainedRuns, conflictingRuns: conflicting.size };
}
