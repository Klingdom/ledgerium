/**
 * Shared rendering helpers for all process map and SOP templates.
 *
 * These utilities transform ProcessOutput data into clean, presentation-ready
 * content that multiple template renderers consume.
 *
 * All functions are pure and deterministic.
 */

import type {
  ProcessOutput,
  ProcessMapNode,
  ProcessMapPhase,
  SOPStep,
} from '../types.js';

// ─── Step naming ─────────────────────────────────────────────────────────────

/**
 * Produces a concise, verb-led step label suitable for process maps.
 * Strips noise from raw titles, caps length, ensures imperative voice.
 */
export function conciseStepLabel(title: string, maxLength: number = 40): string {
  let label = title.trim();
  if (label.length > maxLength) {
    label = label.slice(0, maxLength - 1).trim() + '…';
  }
  return label;
}

/**
 * Derives the primary page/context where a step occurs for display purposes.
 */
export function stepPageContext(node: ProcessMapNode): string {
  return node.metadata.pageTitle ?? node.metadata.routeTemplate ?? '';
}

// ─── Lane / pool assignment ──────────────────────────────────────────────────

/**
 * Builds lane assignments from process map phases.
 * Each phase (system context group) becomes a lane.
 */
export function buildLanes(
  phases: ProcessMapPhase[],
  nodes: ProcessMapNode[],
): Array<{ id: string; label: string; system: string; stepCount: number }> {
  return phases.map(phase => ({
    id: phase.id,
    label: phase.name,
    system: phase.system,
    stepCount: phase.stepNodeIds.length,
  }));
}

/**
 * Finds the lane ID for a given node.
 */
export function nodeLaneId(node: ProcessMapNode, phases: ProcessMapPhase[]): string {
  for (const phase of phases) {
    if (phase.stepNodeIds.includes(node.id)) return phase.id;
  }
  return phases[0]?.id ?? 'default';
}

// ─── Handoff detection ───────────────────────────────────────────────────────

/**
 * Detects handoffs — transitions where the lane (system/owner) changes
 * between consecutive steps.
 */
export function detectHandoffs(
  nodes: ProcessMapNode[],
  phases: ProcessMapPhase[],
): Array<{
  fromStepOrdinal: number;
  toStepOrdinal: number;
  fromLane: string;
  toLane: string;
  label: string;
}> {
  const handoffs: Array<{
    fromStepOrdinal: number;
    toStepOrdinal: number;
    fromLane: string;
    toLane: string;
    label: string;
  }> = [];

  const taskNodes = nodes
    .filter(n => n.nodeType !== 'start' && n.nodeType !== 'end')
    .sort((a, b) => a.ordinal - b.ordinal);

  for (let i = 0; i < taskNodes.length - 1; i++) {
    const current = taskNodes[i]!;
    const next = taskNodes[i + 1]!;
    const currentLane = nodeLaneId(current, phases);
    const nextLane = nodeLaneId(next, phases);

    if (currentLane !== nextLane) {
      const fromPhase = phases.find(p => p.id === currentLane);
      const toPhase = phases.find(p => p.id === nextLane);
      handoffs.push({
        fromStepOrdinal: current.ordinal,
        toStepOrdinal: next.ordinal,
        fromLane: fromPhase?.system ?? 'Unknown',
        toLane: toPhase?.system ?? 'Unknown',
        label: `Handoff: ${fromPhase?.system ?? '?'} → ${toPhase?.system ?? '?'}`,
      });
    }
  }

  return handoffs;
}

// ─── Phase → stage clustering ────────────────────────────────────────────────

/**
 * Collapses phases into high-level stages for SIPOC-style maps.
 * Merges consecutive phases on the same system and limits to maxStages.
 */
export function clusterIntoStages(
  phases: ProcessMapPhase[],
  nodes: ProcessMapNode[],
  maxStages: number = 7,
): Array<{
  ordinal: number;
  title: string;
  description: string;
  system: string;
  stepCount: number;
}> {
  if (phases.length === 0) return [];

  // Start with phases as-is
  const rawStages = phases.map((phase, i) => {
    const phaseNodes = nodes.filter(n => phase.stepNodeIds.includes(n.id));
    const dominantActions = phaseNodes
      .map(n => n.metadata.dominantAction)
      .filter((a): a is string => a !== undefined);
    const mainAction = mostFrequent(dominantActions) ?? 'Process';

    return {
      ordinal: i + 1,
      title: phase.name,
      description: `${mainAction} in ${phase.system} (${phaseNodes.length} step${phaseNodes.length !== 1 ? 's' : ''})`,
      system: phase.system,
      stepCount: phaseNodes.length,
    };
  });

  // If within limit, return directly
  if (rawStages.length <= maxStages) return rawStages;

  // Merge smallest adjacent stages until within limit
  const merged = [...rawStages];
  while (merged.length > maxStages) {
    // Find the smallest stage to merge with its neighbor
    let minIdx = 0;
    let minCount = Infinity;
    for (let i = 0; i < merged.length; i++) {
      if (merged[i]!.stepCount < minCount) {
        minCount = merged[i]!.stepCount;
        minIdx = i;
      }
    }
    // Merge with the smaller neighbor
    const mergeWith = minIdx > 0
      ? (merged[minIdx - 1]!.stepCount <= (merged[minIdx + 1]?.stepCount ?? Infinity) ? minIdx - 1 : minIdx + 1)
      : minIdx + 1;

    if (mergeWith >= merged.length) break;

    const target = Math.min(minIdx, mergeWith);
    const source = Math.max(minIdx, mergeWith);
    merged[target] = {
      ordinal: merged[target]!.ordinal,
      title: `${merged[target]!.system} & ${merged[source]!.system}`,
      description: `Combined processing (${merged[target]!.stepCount + merged[source]!.stepCount} steps)`,
      system: merged[target]!.system,
      stepCount: merged[target]!.stepCount + merged[source]!.stepCount,
    };
    merged.splice(source, 1);
  }

  // Renumber
  return merged.map((s, i) => ({ ...s, ordinal: i + 1 }));
}

// ─── SIPOC derivation helpers ────────────────────────────────────────────────

/**
 * Infers suppliers from the workflow — who/what provides inputs.
 */
export function inferSuppliers(output: ProcessOutput): string[] {
  const suppliers: string[] = [];
  const systems = output.processMap.systems;

  if (systems.length > 0) {
    suppliers.push(...systems.map(s => `${s} system`));
  }

  // The operator is always a supplier of manual input
  const roles = output.sop.roles ?? ['Operator'];
  suppliers.push(...roles);

  return [...new Set(suppliers)].slice(0, 6);
}

/**
 * Infers customers — who consumes the process outputs.
 */
export function inferCustomers(output: ProcessOutput): string[] {
  const customers: string[] = [];
  const systems = output.processMap.systems;

  // Systems that receive submitted data are customers
  const submitSteps = output.sop.steps.filter(
    s => s.category === 'fill_and_submit' || s.category === 'send_action',
  );
  for (const step of submitSteps) {
    if (step.system) customers.push(`${step.system} (data recipient)`);
  }

  // The process owner / operator is a customer of the documented procedure
  customers.push('Process owner (documentation)');

  return [...new Set(customers)].slice(0, 6);
}

// ─── SOP step formatting ─────────────────────────────────────────────────────

/**
 * Extracts the most actionable instruction from an SOP step's instructions list.
 */
export function primaryInstruction(step: SOPStep): string {
  const actions = step.instructions.filter(i => i.instructionType === 'action');
  if (actions.length > 0) {
    return actions.map(a => a.instruction).join('. ') + '.';
  }
  return step.action;
}

/**
 * Derives a caution note for a step if one is warranted.
 */
export function stepCaution(step: SOPStep): string {
  if (step.warnings.length > 0) return step.warnings[0]!;
  if (step.isDecisionPoint) return 'Verify the outcome before proceeding.';
  if (step.category === 'error_handling') return 'Handle the error before continuing.';
  return '';
}

/**
 * Derives common mistakes from friction indicators and error patterns.
 */
export function deriveCommonMistakes(output: ProcessOutput): string[] {
  const mistakes: string[] = [];

  const errorSteps = output.sop.steps.filter(s => s.category === 'error_handling');
  if (errorSteps.length > 0) {
    mistakes.push('Submitting forms before all required fields are complete');
  }

  const friction = output.sop.frictionSummary ?? [];
  for (const f of friction) {
    if (f.type === 'backtracking') {
      mistakes.push('Navigating away from a page before completing the required action');
    }
    if (f.type === 'excessive_navigation') {
      mistakes.push('Taking an indirect path instead of navigating directly to the target page');
    }
    if (f.type === 'context_switching') {
      mistakes.push('Losing context by switching between systems without completing the current task');
    }
  }

  if (mistakes.length === 0) {
    mistakes.push('Skipping prerequisite data gathering before starting the workflow');
  }

  return [...new Set(mistakes)].slice(0, 5);
}

/**
 * Derives tips and shortcuts from workflow patterns.
 */
export function deriveTips(output: ProcessOutput): string[] {
  const tips: string[] = [];

  if (output.processMap.systems.length > 1) {
    tips.push(`Ensure you are logged into all ${output.processMap.systems.length} systems before starting to avoid mid-workflow authentication delays.`);
  }

  const dataEntrySteps = output.sop.steps.filter(
    s => s.category === 'fill_and_submit' || s.category === 'data_entry',
  );
  if (dataEntrySteps.length > 0) {
    tips.push('Gather all required data values before beginning the form entry to complete it in one pass.');
  }

  const longSteps = output.processDefinition.stepDefinitions.filter(
    s => (s.durationMs ?? 0) > 10_000,
  );
  if (longSteps.length > 0) {
    tips.push('System processing steps may take a few seconds — wait for confirmation before clicking again.');
  }

  if (tips.length === 0) {
    tips.push('Complete each step fully before moving to the next to ensure data consistency.');
  }

  return tips.slice(0, 4);
}

// ─── Markdown rendering primitives ──────────────────────────────────────────

export function mdHeading(level: number, text: string): string {
  return `${'#'.repeat(level)} ${text}`;
}

export function mdBullet(text: string): string {
  return `- ${text}`;
}

export function mdNumbered(num: number, text: string): string {
  return `${num}. ${text}`;
}

export function mdBold(text: string): string {
  return `**${text}**`;
}

export function mdTable(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map(r => `| ${r.join(' | ')} |`);
  return [headerRow, separator, ...dataRows].join('\n');
}

export function mdCallout(label: string, text: string): string {
  return `> **${label}:** ${text}`;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function mostFrequent(items: string[]): string | undefined {
  if (items.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let best = '';
  let max = 0;
  for (const [key, count] of counts) {
    // Tie-break alphabetically for determinism
    if (count > max || (count === max && key < best)) {
      best = key;
      max = count;
    }
  }
  return best;
}
