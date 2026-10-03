/**
 * Prefix trie over normalized run steps (signal 1: prefix divergence).
 *
 * Node key = escape(normalizedLabel) + '|' + escape(routeTemplate). `\` and `|`
 * inside either part are backslash-escaped, so keys are injective: distinct
 * (label, route) pairs can never collide (e.g. "a|b"+"c" vs "a"+"b|c").
 */

import { ROOT_NODE_KEY } from './types.js';
import type { RunInput, StepInput } from './types.js';

export interface TrieVisit {
  readonly runId: string;
  /** Step at this node; undefined for the virtual root. */
  readonly step: StepInput | undefined;
}

export interface TrieNode {
  readonly key: string;
  readonly label: string;
  readonly visits: TrieVisit[];
  readonly children: Map<string, TrieNode>;
  /** Runs that terminate exactly at this node. */
  readonly endingRunIds: string[];
  /** Number of steps from the root (root = 0). */
  readonly depth: number;
}

function escapePart(s: string): string {
  return s.normalize('NFC').replace(/[\\|]/g, (c) => `\\${c}`);
}

export function stepNodeKey(step: Pick<StepInput, 'normalizedLabel' | 'routeTemplate'>): string {
  return `${escapePart(step.normalizedLabel)}|${escapePart(step.routeTemplate)}`;
}

/** Deterministic code-unit comparison (locale independent). */
export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function makeNode(key: string, label: string, depth: number): TrieNode {
  return { key, label, visits: [], children: new Map(), endingRunIds: [], depth };
}

/**
 * Build the trie. Runs are sorted by runId before insertion so output never
 * depends on input order. Duplicate runIds are rejected (ambiguous evidence).
 */
export function buildTrie(runs: readonly RunInput[]): TrieNode {
  const sorted = [...runs].sort((a, b) => compareKeys(a.runId, b.runId));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.runId === sorted[i - 1]!.runId) {
      throw new Error(`decision-engine: duplicate runId "${sorted[i]!.runId}"`);
    }
  }
  const root = makeNode(ROOT_NODE_KEY, '', 0);
  for (const run of sorted) {
    let node = root;
    node.visits.push({ runId: run.runId, step: undefined });
    for (const step of run.steps) {
      const key = stepNodeKey(step);
      let child = node.children.get(key);
      if (!child) {
        child = makeNode(key, step.normalizedLabel.normalize('NFC'), node.depth + 1);
        node.children.set(key, child);
      }
      child.visits.push({ runId: run.runId, step });
      node = child;
    }
    node.endingRunIds.push(run.runId);
  }
  return root;
}
