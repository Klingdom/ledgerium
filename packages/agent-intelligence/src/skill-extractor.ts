/**
 * Skill Extractor
 *
 * Converts StepIntelligence[] + Activity[] into a reusable SkillLibrary.
 *
 * Extraction rules:
 * 1. One skill per unique (verb, object, system) tuple.
 * 2. Skill naming: {verb}_{object} in snake_case. System appended when present and
 *    multiple systems share the same verb+object pair.
 * 3. Skill type derived from VERB_TO_SKILL_TYPE — defaults to 'navigation'.
 * 4. Input/output schema: union of all source steps' inputData / outputData.
 * 5. Reusability score computed from occurrence count, genericness, system-agnosticism,
 *    and automation potential.
 * 6. Clusters group skills sharing the same base verb+object regardless of system.
 *
 * All processing is deterministic: same input → same output.
 */

import type {
  StepIntelligence,
  Activity,
  Skill,
  SkillIO,
  SkillCluster,
  SkillLibrary,
  AutomationType,
  SkillType,
} from './types.js';
import { VERB_TO_SKILL_TYPE } from './verb-maps.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Verbs considered generic / highly reusable (navigation-class). */
const GENERIC_VERBS = new Set(['click', 'navigate', 'scroll', 'open', 'select']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a stable tuple key from (verb, object, system).
 * system=null is represented as the empty string to keep keys deterministic.
 */
function tupleKey(verb: string, object: string, system: string | null): string {
  return `${verb}::${object}::${system ?? ''}`;
}

/**
 * Build the base skill name from verb + object in snake_case.
 */
function baseSkillName(verb: string, object: string): string {
  return `${verb}_${object}`;
}

/**
 * Build the full skill name, appending system suffix when present.
 * Examples:
 *   send, email, null      → send_email
 *   fill, form, netsuite   → fill_form_in_netsuite
 *   navigate, page, null   → navigate_page
 */
function buildSkillName(verb: string, object: string, system: string | null): string {
  const base = baseSkillName(verb, object);
  if (system === null) return base;
  return `${base}_in_${system}`;
}

/**
 * Build the human-readable skill description.
 * Examples:
 *   send, email, gmail   → "Send email via Gmail"
 *   fill, form, netsuite → "Fill form in NetSuite"
 *   navigate, page, null → "Navigate to page"
 */
function buildDescription(verb: string, object: string, system: string | null): string {
  const verbCapitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
  const objectFormatted = object.replace(/_/g, ' ');
  if (system === null) {
    return `${verbCapitalized} ${objectFormatted}`;
  }
  // Use "via" for communication verbs, "in" for everything else
  const communicationVerbs = new Set(['send', 'email', 'notify', 'message', 'forward', 'reply']);
  const preposition = communicationVerbs.has(verb) ? 'via' : 'in';
  const systemFormatted = system.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `${verbCapitalized} ${objectFormatted} ${preposition} ${systemFormatted}`;
}

/**
 * Resolve the SkillType for a verb, defaulting to 'navigation' if not found.
 */
function resolveSkillType(verb: string): SkillType {
  return VERB_TO_SKILL_TYPE[verb] ?? 'navigation';
}

/**
 * Aggregate automation classification using the same rules as activity-builder.
 * - ANY manual_only   → manual_only
 * - ANY human_in_loop → human_in_loop
 * - ALL full_automation → full_automation
 * - Otherwise → ai_assisted
 */
function aggregateAutomation(steps: StepIntelligence[]): AutomationType {
  if (steps.some(s => s.automationClassification === 'manual_only')) return 'manual_only';
  if (steps.some(s => s.automationClassification === 'human_in_loop')) return 'human_in_loop';
  if (steps.every(s => s.automationClassification === 'full_automation')) return 'full_automation';
  return 'ai_assisted';
}

/**
 * Compute the reusability score (0-1) for a skill based on:
 * - Occurrence count (how many source steps feed it)
 * - Generic verb (navigation verbs are broadly reusable)
 * - System-agnostic (not tied to a specific system)
 * - Automation potential
 *
 * Scoring:
 *   Base from occurrence: 1→0.2, 2→0.5, 3+→0.8
 *   Generic verb bonus: +0.1
 *   System-agnostic bonus: +0.1
 *   Full automation bonus: +0.1
 *   AI-assisted bonus: +0.05
 *   Cap at 1.0
 */
function computeReusabilityScore(
  occurrenceCount: number,
  verb: string,
  system: string | null,
  automationClassification: AutomationType,
): number {
  let score = 0.2;
  if (occurrenceCount >= 3) {
    score = 0.8;
  } else if (occurrenceCount === 2) {
    score = 0.5;
  }

  if (GENERIC_VERBS.has(verb)) score += 0.1;
  if (system === null) score += 0.1;
  if (automationClassification === 'full_automation') score += 0.1;
  else if (automationClassification === 'ai_assisted') score += 0.05;

  return Math.min(1.0, Math.round(score * 1000) / 1000);
}

/**
 * Build SkillIO entries from a list of data field names.
 */
function buildSkillIOs(fieldNames: string[], required: boolean): SkillIO[] {
  return fieldNames.map(name => ({
    name,
    description: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    required,
  }));
}

/**
 * Find all activity IDs that contain at least one of the given step IDs.
 */
function findSourceActivityIds(stepIds: string[], activities: Activity[]): string[] {
  return activities
    .filter(a => a.stepIds.some(sid => stepIds.includes(sid)))
    .map(a => a.activityId);
}

// ─── Cluster building ─────────────────────────────────────────────────────────

/**
 * Build clusters from the extracted skills.
 *
 * Grouping rules:
 * 1. Skills with identical skillName → same cluster (canonicalSkillName = that name).
 * 2. Skills where verb+object match but system differs → grouped under the base
 *    name ({verb}_{object}) as the canonical skill name.
 *
 * Each skill participates in exactly one cluster. The canonical name is the
 * most general (system-less) representation.
 */
function buildClusters(skills: Skill[]): SkillCluster[] {
  // Map: canonicalName → list of skill IDs in this cluster
  const clusterMap = new Map<string, string[]>();

  for (const skill of skills) {
    // The canonical name is always the base (system-less) verb_object combination
    const canonical = baseSkillName(skill.verb, skill.object);
    const existing = clusterMap.get(canonical);
    if (existing) {
      existing.push(skill.skillId);
    } else {
      clusterMap.set(canonical, [skill.skillId]);
    }
  }

  // Build a lookup for quick skill access
  const skillById = new Map<string, Skill>(skills.map(s => [s.skillId, s]));

  const clusters: SkillCluster[] = [];

  for (const [canonicalSkillName, skillIds] of clusterMap) {
    const memberSkills = skillIds
      .map(id => skillById.get(id))
      .filter((s): s is Skill => s !== undefined);

    const occurrenceCount = memberSkills.reduce(
      (sum, s) => sum + s.sourceStepIds.length,
      0,
    );

    const averageReusabilityScore =
      memberSkills.reduce((sum, s) => sum + s.reusabilityScore, 0) / memberSkills.length;

    const averageConfidence =
      memberSkills.reduce((sum, s) => sum + s.confidence, 0) / memberSkills.length;

    clusters.push({
      clusterId: `cluster-${canonicalSkillName}`,
      canonicalSkillName,
      skillIds,
      occurrenceCount,
      workflowCount: 1,
      averageReusabilityScore: Math.round(averageReusabilityScore * 1000) / 1000,
      averageConfidence: Math.round(averageConfidence * 1000) / 1000,
    } satisfies SkillCluster);
  }

  // Sort deterministically by clusterId
  return clusters.sort((a, b) => a.clusterId.localeCompare(b.clusterId));
}

// ─── Skill type distribution ──────────────────────────────────────────────────

/** Build the skillTypeDistribution map initialised with all known SkillTypes. */
function buildSkillTypeDistribution(skills: Skill[]): Record<SkillType, number> {
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

  const dist = Object.fromEntries(ALL_SKILL_TYPES.map(t => [t, 0])) as Record<SkillType, number>;

  for (const skill of skills) {
    dist[skill.skillType] += 1;
  }

  return dist;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extract a reusable SkillLibrary from enriched step intelligence and activities.
 *
 * @param steps - StepIntelligence[] from the parse stage
 * @param activities - Activity[] from the activity-builder stage
 * @returns SkillLibrary with extracted skills, clusters, and aggregate metrics
 */
export function extractSkills(
  steps: StepIntelligence[],
  activities: Activity[],
): SkillLibrary {
  if (steps.length === 0) {
    const emptyDist = buildSkillTypeDistribution([]);
    return {
      skills: [],
      clusters: [],
      uniqueSkillCount: 0,
      reusableSkillCount: 0,
      skillTypeDistribution: emptyDist,
    };
  }

  // ── Phase 1: Group steps by (verb, object, system) tuple ──────────────────

  // Map: tupleKey → StepIntelligence[]
  const tupleGroups = new Map<string, StepIntelligence[]>();

  for (const step of steps) {
    const key = tupleKey(step.verb, step.object, step.system);
    const existing = tupleGroups.get(key);
    if (existing) {
      existing.push(step);
    } else {
      tupleGroups.set(key, [step]);
    }
  }

  // ── Phase 2: Build one Skill per tuple group ───────────────────────────────

  const skills: Skill[] = [];

  for (const [, groupSteps] of tupleGroups) {
    // All steps in a group share the same (verb, object, system) — use first as representative
    const representative = groupSteps[0]!;
    const { verb, object, system } = representative;

    const skillName = buildSkillName(verb, object, system);
    const skillId = `skill-${skillName}`;
    const description = buildDescription(verb, object, system);
    const skillType = resolveSkillType(verb);

    // Union of all input/output data from source steps (deduplicated, stable order)
    const allInputs = [...new Set(groupSteps.flatMap(s => s.inputData))];
    const allOutputs = [...new Set(groupSteps.flatMap(s => s.outputData))];

    const inputSchema = buildSkillIOs(allInputs, true);
    const outputSchema = buildSkillIOs(allOutputs, false);

    // Collect unique systems from all source steps
    const requiredSystems = [
      ...new Set(
        groupSteps
          .map(s => s.system)
          .filter((s): s is string => s !== null),
      ),
    ];

    const sourceStepIds = groupSteps.map(s => s.stepId);
    const sourceActivityIds = findSourceActivityIds(sourceStepIds, activities);

    const automationClassification = aggregateAutomation(groupSteps);

    const reusabilityScore = computeReusabilityScore(
      groupSteps.length,
      verb,
      system,
      automationClassification,
    );

    // Average confidence across all source steps
    const confidence =
      Math.round(
        (groupSteps.reduce((sum, s) => sum + s.confidence, 0) / groupSteps.length) * 1000,
      ) / 1000;

    skills.push({
      skillId,
      skillName,
      description,
      skillType,
      inputSchema,
      outputSchema,
      requiredSystems,
      sourceStepIds,
      sourceActivityIds,
      automationClassification,
      reusabilityScore,
      confidence,
      verb,
      object,
    } satisfies Skill);
  }

  // Sort skills deterministically by skillId
  skills.sort((a, b) => a.skillId.localeCompare(b.skillId));

  // ── Phase 3: Cluster skills ────────────────────────────────────────────────

  const clusters = buildClusters(skills);

  // ── Phase 4: Compute aggregate metrics ────────────────────────────────────

  const uniqueSkillCount = skills.length;
  const reusableSkillCount = skills.filter(s => s.reusabilityScore >= 0.6).length;
  const skillTypeDistribution = buildSkillTypeDistribution(skills);

  return {
    skills,
    clusters,
    uniqueSkillCount,
    reusableSkillCount,
    skillTypeDistribution,
  } satisfies SkillLibrary;
}
