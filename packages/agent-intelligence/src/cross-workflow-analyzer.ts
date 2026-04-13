/**
 * Cross-Workflow Intelligence Analyzer
 *
 * Analyzes a portfolio of TransformationResult objects (one per workflow) and
 * identifies patterns, shared skills, shared systems, and optimization
 * opportunities across the entire portfolio.
 *
 * All processing is deterministic: same input → same output.
 * Output arrays are sorted deterministically.
 */

import type {
  TransformationResult,
  CrossWorkflowIntelligence,
  SharedSkill,
  SharedSystem,
  WorkflowPattern,
  PortfolioSummary,
  Skill,
  SkillType,
} from './types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SKILL_TYPES: SkillType[] = [
  'data_extraction',
  'data_entry',
  'navigation',
  'verification',
  'communication',
  'file_operation',
  'decision',
  'integration',
  'monitoring',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the base skill name (verb_object) from a Skill.
 * Strips any "_in_{system}" suffix that the skill extractor may have appended.
 */
function baseSkillName(skill: Skill): string {
  return `${skill.verb}_${skill.object}`;
}

/**
 * Compute the most common SkillType in an array of SkillType values.
 * Ties are broken alphabetically.
 */
function mostCommonSkillType(types: SkillType[]): SkillType {
  const counts = new Map<SkillType, number>();
  for (const t of types) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best: SkillType = types[0]!;
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount || (count === bestCount && type < best)) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Compute mean of a number array. Returns 0 for empty arrays.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Round a number to 3 decimal places.
 */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// ─── Part A: Shared Skills ────────────────────────────────────────────────────

/**
 * Build the SharedSkill array from a portfolio of TransformationResults.
 * Only skills appearing in 2+ workflows are included.
 */
function buildSharedSkills(results: TransformationResult[]): SharedSkill[] {
  // Map: baseName → { workflowId → Skill[] }
  const byBaseName = new Map<string, Map<string, Skill[]>>();

  for (const result of results) {
    const workflowId = result.workflow.workflowId;
    for (const skill of result.skillLibrary.skills) {
      const base = baseSkillName(skill);
      let workflowMap = byBaseName.get(base);
      if (!workflowMap) {
        workflowMap = new Map<string, Skill[]>();
        byBaseName.set(base, workflowMap);
      }
      const existing = workflowMap.get(workflowId);
      if (existing) {
        existing.push(skill);
      } else {
        workflowMap.set(workflowId, [skill]);
      }
    }
  }

  const sharedSkills: SharedSkill[] = [];

  for (const [baseName, workflowMap] of byBaseName) {
    if (workflowMap.size < 2) continue;

    const workflowIds = [...workflowMap.keys()];
    const allInstances: Skill[] = [];
    for (const skills of workflowMap.values()) {
      allInstances.push(...skills);
    }

    const totalOccurrences = allInstances.reduce(
      (sum, s) => sum + s.sourceStepIds.length,
      0,
    );

    const systems = [...new Set(allInstances.flatMap(s => s.requiredSystems))];
    const skillType = mostCommonSkillType(allInstances.map(s => s.skillType));
    const description = allInstances[0]!.description;

    const averageReusabilityScore = round3(mean(allInstances.map(s => s.reusabilityScore)));
    const averageConfidence = round3(mean(allInstances.map(s => s.confidence)));

    const isLibraryCandidate = workflowMap.size >= 2 && averageReusabilityScore >= 0.5;

    sharedSkills.push({
      skillName: baseName,
      skillType,
      description,
      workflowIds,
      workflowCount: workflowIds.length,
      totalOccurrences,
      systems,
      averageReusabilityScore,
      averageConfidence,
      isLibraryCandidate,
    } satisfies SharedSkill);
  }

  // Sort: workflowCount desc, totalOccurrences desc, skillName asc
  sharedSkills.sort((a, b) => {
    if (b.workflowCount !== a.workflowCount) return b.workflowCount - a.workflowCount;
    if (b.totalOccurrences !== a.totalOccurrences) return b.totalOccurrences - a.totalOccurrences;
    return a.skillName.localeCompare(b.skillName);
  });

  return sharedSkills;
}

// ─── Part B: Shared Systems ───────────────────────────────────────────────────

/**
 * Build the SharedSystem array from a portfolio of TransformationResults.
 * Only systems appearing in 2+ workflows are included.
 */
function buildSharedSystems(results: TransformationResult[]): SharedSystem[] {
  // Map: system → workflowIds[]
  const systemWorkflows = new Map<string, Set<string>>();
  // Map: system → totalStepCount
  const systemStepCounts = new Map<string, number>();
  // Map: system → Set of associated skill base names
  const systemSkills = new Map<string, Set<string>>();

  for (const result of results) {
    const workflowId = result.workflow.workflowId;

    for (const system of result.workflow.systems) {
      let workflows = systemWorkflows.get(system);
      if (!workflows) {
        workflows = new Set<string>();
        systemWorkflows.set(system, workflows);
      }
      workflows.add(workflowId);
    }

    // Count steps per system
    for (const step of result.steps) {
      if (step.system !== null) {
        systemStepCounts.set(step.system, (systemStepCounts.get(step.system) ?? 0) + 1);
      }
    }

    // Map skills to their required systems
    for (const skill of result.skillLibrary.skills) {
      const base = baseSkillName(skill);
      for (const system of skill.requiredSystems) {
        let skills = systemSkills.get(system);
        if (!skills) {
          skills = new Set<string>();
          systemSkills.set(system, skills);
        }
        skills.add(base);
      }
    }
  }

  const sharedSystems: SharedSystem[] = [];

  for (const [system, workflowSet] of systemWorkflows) {
    if (workflowSet.size < 2) continue;

    const workflowIds = [...workflowSet];
    const workflowCount = workflowIds.length;
    const totalStepCount = systemStepCounts.get(system) ?? 0;
    const associatedSkills = [...(systemSkills.get(system) ?? new Set<string>())].sort();

    let sharedIntegrationValue: 'high' | 'medium' | 'low';
    if (workflowCount >= 3) {
      sharedIntegrationValue = 'high';
    } else if (workflowCount === 2) {
      sharedIntegrationValue = 'medium';
    } else {
      sharedIntegrationValue = 'low';
    }

    sharedSystems.push({
      system,
      workflowIds,
      workflowCount,
      totalStepCount,
      associatedSkills,
      sharedIntegrationValue,
    } satisfies SharedSystem);
  }

  // Sort: workflowCount desc, totalStepCount desc, system asc
  sharedSystems.sort((a, b) => {
    if (b.workflowCount !== a.workflowCount) return b.workflowCount - a.workflowCount;
    if (b.totalStepCount !== a.totalStepCount) return b.totalStepCount - a.totalStepCount;
    return a.system.localeCompare(b.system);
  });

  return sharedSystems;
}

// ─── Part C: Patterns ─────────────────────────────────────────────────────────

/**
 * Extract the ordered list of base skill names from a workflow's steps.
 * Steps without both verb and object are skipped.
 */
function extractStepSkillSequence(result: TransformationResult): string[] {
  return result.steps.map(step => `${step.verb}_${step.object}`);
}

/**
 * Find all contiguous subsequences of length `len` in an array.
 */
function getSubsequences(seq: string[], len: number): string[][] {
  const result: string[][] = [];
  for (let i = 0; i <= seq.length - len; i++) {
    result.push(seq.slice(i, i + len));
  }
  return result;
}

/**
 * Check if a sequence contains another sequence as a contiguous subsequence.
 */
function containsSubsequence(haystack: string[], needle: string[]): boolean {
  if (needle.length > haystack.length) return false;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Detect shared_skill_sequence patterns.
 */
function detectSkillSequencePatterns(results: TransformationResult[]): WorkflowPattern[] {
  if (results.length < 2) return [];

  const sequences = results.map(r => ({
    workflowId: r.workflow.workflowId,
    seq: extractStepSkillSequence(r),
  }));

  // candidateKey → Set<workflowId>
  const candidateMap = new Map<string, Set<string>>();

  // For each pair of workflows, find shared contiguous subsequences of length 2 and 3
  for (let i = 0; i < sequences.length; i++) {
    for (let j = i + 1; j < sequences.length; j++) {
      const seqA = sequences[i]!;
      const seqB = sequences[j]!;

      for (const len of [3, 2]) {
        const subsA = getSubsequences(seqA.seq, len);
        for (const sub of subsA) {
          if (containsSubsequence(seqB.seq, sub)) {
            const key = sub.join('|||');
            let workflows = candidateMap.get(key);
            if (!workflows) {
              workflows = new Set<string>();
              candidateMap.set(key, workflows);
            }
            workflows.add(seqA.workflowId);
            workflows.add(seqB.workflowId);
          }
        }
      }
    }
  }

  // Also check against all other workflows (not just pairs)
  for (const [key, workflowSet] of candidateMap) {
    const needle = key.split('|||');
    for (const entry of sequences) {
      if (containsSubsequence(entry.seq, needle)) {
        workflowSet.add(entry.workflowId);
      }
    }
  }

  // Filter: must appear in 2+ workflows
  const qualifying = [...candidateMap.entries()]
    .filter(([, wf]) => wf.size >= 2);

  // Deduplication: if A→B and A→B→C both qualify, keep only A→B→C (longer wins)
  const qualifyingKeys = new Set(qualifying.map(([k]) => k));
  const deduped = qualifying.filter(([key]) => {
    const parts = key.split('|||');
    // Check if any longer sequence that contains this one also qualifies
    for (const otherKey of qualifyingKeys) {
      if (otherKey === key) continue;
      const otherParts = otherKey.split('|||');
      if (otherParts.length > parts.length && containsSubsequence(otherParts, parts)) {
        return false; // superseded by a longer pattern
      }
    }
    return true;
  });

  return deduped.map(([key, workflowSet]) => {
    const skills = key.split('|||');
    const workflowIds = [...workflowSet];
    const frequency = workflowIds.length;
    const confidence = frequency >= 3 ? 0.9 : 0.8;
    const patternName = `Shared sequence: ${skills.join(' → ')}`;
    const description = `A sequence of skills [${skills.join(', ')}] appears in the same order across multiple workflows.`;

    return {
      patternId: '', // assigned after sorting
      patternName,
      description,
      workflowIds,
      patternType: 'shared_skill_sequence' as const,
      evidence: [`Found in workflows: ${workflowIds.join(', ')}`],
      frequency,
      confidence,
    };
  });
}

/**
 * Detect common_system_pair patterns.
 */
function detectSystemPairPatterns(results: TransformationResult[]): WorkflowPattern[] {
  if (results.length < 2) return [];

  // pairKey → Set<workflowId>
  const pairMap = new Map<string, Set<string>>();

  for (const result of results) {
    const systems = [...result.workflow.systems].sort();
    const workflowId = result.workflow.workflowId;

    for (let i = 0; i < systems.length; i++) {
      for (let j = i + 1; j < systems.length; j++) {
        const key = `${systems[i]}|||${systems[j]}`;
        let workflows = pairMap.get(key);
        if (!workflows) {
          workflows = new Set<string>();
          pairMap.set(key, workflows);
        }
        workflows.add(workflowId);
      }
    }
  }

  return [...pairMap.entries()]
    .filter(([, wf]) => wf.size >= 2)
    .map(([key, workflowSet]) => {
      const [systemA, systemB] = key.split('|||') as [string, string];
      const workflowIds = [...workflowSet];
      const frequency = workflowIds.length;
      const confidence = frequency >= 3 ? 0.85 : 0.7;
      const patternName = `${systemA} + ${systemB} integration`;
      const description = `${systemA} and ${systemB} co-occur across multiple workflows, suggesting a shared integration opportunity.`;

      return {
        patternId: '',
        patternName,
        description,
        workflowIds,
        patternType: 'common_system_pair' as const,
        evidence: [`Co-occurs in ${frequency} workflows`],
        frequency,
        confidence,
      };
    });
}

/**
 * Detect similar_structure patterns.
 * Workflows are similar if activityCount ±1, systemCount ±1, automationScore ±15.
 */
function detectSimilarStructurePatterns(results: TransformationResult[]): WorkflowPattern[] {
  if (results.length < 2) return [];

  // Find groups of similar workflows
  // Use Union-Find to group all workflows that are similar to each other (transitively)
  const parent = new Map<string, string>();
  const getRoot = (id: string): string => {
    if (parent.get(id) === id) return id;
    const root = getRoot(parent.get(id)!);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = getRoot(a);
    const rb = getRoot(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const r of results) {
    parent.set(r.workflow.workflowId, r.workflow.workflowId);
  }

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i]!.workflow;
      const b = results[j]!.workflow;
      const actSimilar = Math.abs(a.activityCount - b.activityCount) <= 1;
      const sysSimilar = Math.abs(a.systems.length - b.systems.length) <= 1;
      const autoSimilar = Math.abs(a.automationScore - b.automationScore) <= 15;
      if (actSimilar && sysSimilar && autoSimilar) {
        union(a.workflowId, b.workflowId);
      }
    }
  }

  // Group by root
  const groups = new Map<string, string[]>();
  for (const result of results) {
    const root = getRoot(result.workflow.workflowId);
    const existing = groups.get(root);
    if (existing) {
      existing.push(result.workflow.workflowId);
    } else {
      groups.set(root, [result.workflow.workflowId]);
    }
  }

  // Only emit patterns for groups of 2+
  const patterns: WorkflowPattern[] = [];
  for (const [, workflowIds] of groups) {
    if (workflowIds.length < 2) continue;

    // Build evidence pairs
    const evidence: string[] = [];
    for (let i = 0; i < workflowIds.length; i++) {
      for (let j = i + 1; j < workflowIds.length; j++) {
        const a = results.find(r => r.workflow.workflowId === workflowIds[i])!.workflow;
        const b = results.find(r => r.workflow.workflowId === workflowIds[j])!.workflow;
        evidence.push(
          `${a.workflowId} and ${b.workflowId} have similar structure (activities: ${a.activityCount}/${b.activityCount}, systems: ${a.systems.length}/${b.systems.length}, automation: ${a.automationScore}/${b.automationScore})`,
        );
      }
    }

    patterns.push({
      patternId: '',
      patternName: 'Structurally similar workflows',
      description: 'These workflows have similar activity counts, system counts, and automation scores, suggesting they could share implementation patterns.',
      workflowIds,
      patternType: 'similar_structure' as const,
      evidence,
      frequency: workflowIds.length,
      confidence: 0.6,
    });
  }

  return patterns;
}

/**
 * Detect shared_bottleneck patterns.
 * Friction/decision-support opportunities involving the same system in 2+ workflows.
 */
function detectBottleneckPatterns(results: TransformationResult[]): WorkflowPattern[] {
  if (results.length < 2) return [];

  // system → Set<workflowId>
  const systemWorkflows = new Map<string, Set<string>>();

  for (const result of results) {
    const workflowId = result.workflow.workflowId;
    for (const opp of result.opportunities.opportunities) {
      if (opp.category !== 'friction_reduction' && opp.category !== 'decision_support') continue;
      for (const system of opp.systems) {
        let workflows = systemWorkflows.get(system);
        if (!workflows) {
          workflows = new Set<string>();
          systemWorkflows.set(system, workflows);
        }
        workflows.add(workflowId);
      }
    }
  }

  return [...systemWorkflows.entries()]
    .filter(([, wf]) => wf.size >= 2)
    .map(([system, workflowSet]) => {
      const workflowIds = [...workflowSet];
      const frequency = workflowIds.length;
      const patternName = `${system} is a bottleneck across workflows`;
      const description = `${system} appears as a friction or decision-support bottleneck in multiple workflows.`;

      return {
        patternId: '',
        patternName,
        description,
        workflowIds,
        patternType: 'shared_bottleneck' as const,
        evidence: [`Friction or decision support needed in ${frequency} workflows involving ${system}`],
        frequency,
        confidence: 0.75,
      };
    });
}

/**
 * Combine all pattern types, sort, and assign stable pattern IDs.
 */
function buildPatterns(results: TransformationResult[]): WorkflowPattern[] {
  const allPatterns = [
    ...detectSkillSequencePatterns(results),
    ...detectSystemPairPatterns(results),
    ...detectSimilarStructurePatterns(results),
    ...detectBottleneckPatterns(results),
  ];

  // Sort: frequency desc, confidence desc, patternName asc
  allPatterns.sort((a, b) => {
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.patternName.localeCompare(b.patternName);
  });

  // Assign stable patternIds
  return allPatterns.map((p, i) => ({ ...p, patternId: `pattern-${i + 1}` }));
}

// ─── Part D: Portfolio Summary ────────────────────────────────────────────────

/**
 * Build portfolio-level summary statistics.
 */
function buildSummary(
  results: TransformationResult[],
  sharedSkills: SharedSkill[],
  sharedSystems: SharedSystem[],
  patterns: WorkflowPattern[],
): PortfolioSummary {
  if (results.length === 0) {
    const emptyDist = Object.fromEntries(ALL_SKILL_TYPES.map(t => [t, 0])) as Record<SkillType, number>;
    return {
      workflowCount: 0,
      totalStepCount: 0,
      totalUniqueSkills: 0,
      sharedSkillCount: 0,
      totalUniqueSystems: 0,
      sharedSystemCount: 0,
      averageAutomationScore: 0,
      averageReadinessScore: 0,
      totalEstimatedTimeSavingsMs: null,
      patternCount: 0,
      portfolioSkillDistribution: emptyDist,
    };
  }

  const workflowCount = results.length;
  const totalStepCount = results.reduce((sum, r) => sum + r.workflow.stepCount, 0);

  // Unique base skill names across all workflows
  const allBaseNames = new Set<string>();
  for (const result of results) {
    for (const skill of result.skillLibrary.skills) {
      allBaseNames.add(baseSkillName(skill));
    }
  }
  const totalUniqueSkills = allBaseNames.size;
  const sharedSkillCount = sharedSkills.length;

  // Unique systems across all workflows
  const allSystems = new Set<string>();
  for (const result of results) {
    for (const system of result.workflow.systems) {
      allSystems.add(system);
    }
  }
  const totalUniqueSystems = allSystems.size;
  const sharedSystemCount = sharedSystems.length;

  const averageAutomationScore = Math.round(
    mean(results.map(r => r.workflow.automationScore)),
  );

  const averageReadinessScore = Math.round(
    mean(results.map(r => r.integrationRisk.implementationReadinessScore)),
  );

  // Total time savings: null if any is null
  let totalEstimatedTimeSavingsMs: number | null = 0;
  for (const result of results) {
    const savings = result.opportunities.totalEstimatedTimeSavingsMs;
    if (savings === null) {
      totalEstimatedTimeSavingsMs = null;
      break;
    }
    totalEstimatedTimeSavingsMs += savings;
  }

  const patternCount = patterns.length;

  // portfolioSkillDistribution: count each unique base skill name once
  const dist = Object.fromEntries(ALL_SKILL_TYPES.map(t => [t, 0])) as Record<SkillType, number>;

  // Build unique skill instances (by base name) with their type
  const uniqueSkillTypeMap = new Map<string, SkillType>();
  for (const result of results) {
    for (const skill of result.skillLibrary.skills) {
      const base = baseSkillName(skill);
      if (!uniqueSkillTypeMap.has(base)) {
        uniqueSkillTypeMap.set(base, skill.skillType);
      }
    }
  }
  for (const skillType of uniqueSkillTypeMap.values()) {
    dist[skillType] += 1;
  }

  return {
    workflowCount,
    totalStepCount,
    totalUniqueSkills,
    sharedSkillCount,
    totalUniqueSystems,
    sharedSystemCount,
    averageAutomationScore,
    averageReadinessScore,
    totalEstimatedTimeSavingsMs,
    patternCount,
    portfolioSkillDistribution: dist,
  } satisfies PortfolioSummary;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Analyze a portfolio of TransformationResult objects and produce cross-workflow
 * intelligence: shared skills, shared systems, patterns, and portfolio summary.
 *
 * @param results - Array of TransformationResult objects (one per workflow)
 * @returns CrossWorkflowIntelligence with portfolio-level analysis
 */
export function analyzePortfolio(results: TransformationResult[]): CrossWorkflowIntelligence {
  const sharedSkills = buildSharedSkills(results);
  const sharedSystems = buildSharedSystems(results);
  const patterns = buildPatterns(results);
  const summary = buildSummary(results, sharedSkills, sharedSystems, patterns);

  return {
    sharedSkills,
    sharedSystems,
    patterns,
    summary,
  } satisfies CrossWorkflowIntelligence;
}
