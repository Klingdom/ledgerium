/**
 * Canonical Component Detector
 *
 * Discovers reusable step/event patterns that appear across multiple
 * workflows, groups, or families. Components are the building blocks
 * of processes — "Compose Email", "Download Report", "Submit Form".
 *
 * Detection strategy:
 * 1. Collect all step fingerprints across workflows
 * 2. Group by semantic signature (verb:object:system:eventType)
 * 3. Fingerprints that appear in 2+ workflows become candidate components
 * 4. Merge near-duplicate candidates (same verb+object, different system)
 * 5. Compute usage stats, predecessor/successor patterns
 *
 * Design:
 * - Deterministic: same inputs → same components
 * - Conservative: requires 2+ occurrences before creating a component
 * - No LLM calls — pure pattern matching on fingerprints
 */

import type { StepFingerprint, CanonicalComponent, ComponentType } from './groupingTypes.js';

// ─── Component type inference ────────────────────────────────────────────────

const VERB_TO_COMPONENT_TYPE: Record<string, ComponentType> = {
  // Actions
  click: 'action', select: 'action', submit: 'action', approve: 'action',
  reject: 'action', send: 'action', email: 'action', share: 'action',
  publish: 'action', sign: 'action', close: 'action', delete: 'action',
  create: 'action', update: 'action', save: 'action', copy: 'action',
  // Navigation
  navigate: 'navigation', open: 'navigation', browse: 'navigation',
  // Data entry
  enter: 'data_entry', fill: 'data_entry', edit: 'data_entry',
  // File actions
  upload: 'file_action', download: 'file_action', attach: 'file_action',
  export: 'file_action', import: 'file_action', print: 'file_action',
  // Verification
  verify: 'verification', review: 'verification', check: 'verification',
  // Decision
  filter: 'decision', sort: 'decision', search: 'decision',
  toggle: 'decision',
  // Integration
  login: 'integration', logout: 'integration', configure: 'integration',
  enable: 'integration', disable: 'integration',
};

function inferComponentType(verb: string | null): ComponentType {
  if (!verb) return 'action';
  return VERB_TO_COMPONENT_TYPE[verb] ?? 'action';
}

// ─── Component name generation ───────────────────────────────────────────────

/**
 * Generate a human-readable component name from parsed fingerprint fields.
 * Capitalizes and concatenates: "Verb Object" → "Send Email"
 */
function generateComponentName(
  verb: string | null,
  object: string | null,
  system: string | null,
): string {
  const parts: string[] = [];
  if (verb) parts.push(capitalize(verb));
  if (object) parts.push(capitalize(object.replace(/_/g, ' ')));
  if (parts.length === 0) return 'Unknown Component';
  // Append system qualifier if present and distinctive
  if (system) {
    return `${parts.join(' ')} (${capitalize(system.replace(/_/g, ' '))})`;
  }
  return parts.join(' ');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Component key ───────────────────────────────────────────────────────────

/**
 * Components are keyed by verb:object (system-agnostic) for merging.
 * "send:email:gmail" and "send:email:outlook" merge into one "Send Email" component.
 * If system specificity matters, use the full semantic signature instead.
 */
function componentKey(verb: string | null, object: string | null): string {
  return `${verb ?? '_'}:${object ?? '_'}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ComponentDetectionInput {
  /** All fingerprints across all workflows, grouped by workflow run ID. */
  fingerprintsByWorkflow: Map<string, StepFingerprint[]>;
  /** Map from workflow run ID → group ID (if assigned). */
  workflowToGroup?: Map<string, string>;
  /** Map from workflow run ID → family ID (if assigned). */
  workflowToFamily?: Map<string, string>;
}

export interface ComponentDetectionResult {
  components: CanonicalComponent[];
  /** Map from fingerprint ID → matched component ID. */
  fingerprintToComponent: Map<string, string>;
}

/**
 * Detect canonical components from a collection of step fingerprints.
 *
 * @param input - Fingerprints grouped by workflow, with optional group/family mappings
 * @param minOccurrences - Minimum number of distinct workflows a pattern must
 *   appear in to become a component (default: 2)
 */
export function detectComponents(
  input: ComponentDetectionInput,
  minOccurrences: number = 2,
): ComponentDetectionResult {
  const { fingerprintsByWorkflow, workflowToGroup, workflowToFamily } = input;

  // Step 1: Collect all fingerprints and group by component key
  const keyToFingerprints = new Map<string, StepFingerprint[]>();
  const keyToWorkflowIds = new Map<string, Set<string>>();
  const keyToGroupIds = new Map<string, Set<string>>();
  const keyToFamilyIds = new Map<string, Set<string>>();

  for (const [workflowId, fingerprints] of fingerprintsByWorkflow) {
    for (const fp of fingerprints) {
      const key = componentKey(fp.verb, fp.object);

      // Skip fingerprints with no verb and no object (unparseable)
      if (fp.verb === null && fp.object === null) continue;

      if (!keyToFingerprints.has(key)) {
        keyToFingerprints.set(key, []);
        keyToWorkflowIds.set(key, new Set());
        keyToGroupIds.set(key, new Set());
        keyToFamilyIds.set(key, new Set());
      }

      keyToFingerprints.get(key)!.push(fp);
      keyToWorkflowIds.get(key)!.add(workflowId);

      const groupId = workflowToGroup?.get(workflowId);
      if (groupId) keyToGroupIds.get(key)!.add(groupId);

      const familyId = workflowToFamily?.get(workflowId);
      if (familyId) keyToFamilyIds.get(key)!.add(familyId);
    }
  }

  // Step 2: Filter by minimum occurrence threshold
  const components: CanonicalComponent[] = [];
  const fingerprintToComponent = new Map<string, string>();
  let componentIndex = 0;

  for (const [key, fingerprints] of keyToFingerprints) {
    const workflowIds = keyToWorkflowIds.get(key)!;
    if (workflowIds.size < minOccurrences) continue;

    componentIndex++;
    const componentId = `comp-${componentIndex}`;

    // Use the first fingerprint's fields as representative
    const representative = fingerprints[0]!;
    const verb = representative.verb;
    const object = representative.object;

    // Collect all systems used by fingerprints with this key
    const systems = new Set<string>();
    for (const fp of fingerprints) {
      if (fp.system) systems.add(fp.system);
    }
    // Use the most common system, or null if multiple
    const canonicalSystem = systems.size === 1 ? [...systems][0]! : null;

    // Compute average duration from step durations (if available — not in
    // fingerprints directly; we use a placeholder for now)
    const avgDurationMs: number | null = null; // Enriched later from step definitions

    // Compute predecessor/successor patterns
    const predecessorCounts = new Map<string, number>();
    const successorCounts = new Map<string, number>();
    for (const fp of fingerprints) {
      if (fp.precedingStepFingerprintId) {
        // Find the preceding fingerprint's semantic signature
        const preceding = findFingerprintById(fingerprintsByWorkflow, fp.precedingStepFingerprintId);
        if (preceding) {
          const predKey = componentKey(preceding.verb, preceding.object);
          predecessorCounts.set(predKey, (predecessorCounts.get(predKey) ?? 0) + 1);
        }
      }
      if (fp.followingStepFingerprintId) {
        const following = findFingerprintById(fingerprintsByWorkflow, fp.followingStepFingerprintId);
        if (following) {
          const succKey = componentKey(following.verb, following.object);
          successorCounts.set(succKey, (successorCounts.get(succKey) ?? 0) + 1);
        }
      }
    }

    const component: CanonicalComponent = {
      id: componentId,
      componentName: generateComponentName(verb, object, canonicalSystem),
      componentType: inferComponentType(verb),
      canonicalVerb: verb ?? 'unknown',
      canonicalObject: object ?? 'unknown',
      canonicalSystem,
      description: `${generateComponentName(verb, object, null)} — appears in ${workflowIds.size} workflow(s)`,
      usageCount: fingerprints.length,
      familyCount: keyToFamilyIds.get(key)!.size,
      groupCount: keyToGroupIds.get(key)!.size,
      avgDurationMs,
      volatilityScore: null, // Computed during scoring (later prompt)
      automationOpportunityScore: null, // Computed during scoring (later prompt)
      commonPredecessors: topNKeys(predecessorCounts, 3),
      commonSuccessors: topNKeys(successorCounts, 3),
      relatedComponentIds: [], // Filled during relationship detection
    };

    components.push(component);

    // Map fingerprints to this component
    for (const fp of fingerprints) {
      fingerprintToComponent.set(fp.id, componentId);
    }
  }

  // Step 3: Sort components by usage count (most used first)
  components.sort((a, b) => b.usageCount - a.usageCount);

  // Step 4: Detect related components (share predecessor/successor patterns)
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i]!;
      const b = components[j]!;
      // Related if one commonly precedes/follows the other
      if (
        a.commonSuccessors.some(s => s === componentKey(b.canonicalVerb, b.canonicalObject)) ||
        b.commonPredecessors.some(p => p === componentKey(a.canonicalVerb, a.canonicalObject))
      ) {
        a.relatedComponentIds.push(b.id);
        b.relatedComponentIds.push(a.id);
      }
    }
  }

  return { components, fingerprintToComponent };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findFingerprintById(
  fingerprintsByWorkflow: Map<string, StepFingerprint[]>,
  fingerprintId: string,
): StepFingerprint | null {
  for (const fingerprints of fingerprintsByWorkflow.values()) {
    const found = fingerprints.find(fp => fp.id === fingerprintId);
    if (found) return found;
  }
  return null;
}

function topNKeys(counts: Map<string, number>, n: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}
