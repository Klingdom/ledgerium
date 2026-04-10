/**
 * Intelligence Service — orchestrates @ledgerium/intelligence-engine
 * against stored workflow data and persists results.
 *
 * Responsibilities:
 * 1. Load process_output artifacts from DB for a set of workflows
 * 2. Convert them into ProcessRunBundle[] for the intelligence engine
 * 3. Run analyzePortfolio() and store the PortfolioIntelligence result
 * 4. Generate ProcessInsight records from the analysis
 * 5. Auto-cluster workflows into ProcessDefinitions by path signature
 * 6. Phase 5: Run title normalization, step fingerprinting, exact-group
 *    scoring, family detection, component detection, variant analysis,
 *    and relationship generation. Populate new schema fields.
 */

import {
  analyzePortfolio,
  computePathSignature,
  analyzeSopAlignment,
  computeStandardizationScore,
  computeDocumentationDriftScore,
  detectOutlierRuns,
  deriveRecommendedCanonicalPath,
  generateRecommendations,
  computeAutomationROI,
  // Phase 5 imports
  normalizeTitle,
  fingerprintWorkflowSteps,
  hashStepSequence,
  hashEventSequence,
  fingerprintEvent,
  detectComponents,
  scoreFamilyMembership,
  evaluatePossibleMatch,
  generateGroupRelationships,
  computeVariantDistance,
  scoreAutomationOpportunity,
  deriveAutomationFactors,
  buildExplanation,
  resolveConfidenceBand,
  SCORING_MODEL_VERSION,
  GROUPING_MODEL_VERSION,
  DEFAULT_SCORING_CONFIG,
} from '@ledgerium/intelligence-engine';
import type {
  ProcessRunBundle,
  PortfolioIntelligence,
  BottleneckStep,
  HighVarianceStep,
  DriftSignal,
  SOPAlignmentResult,
  StandardizationScore,
  DocumentationDriftScore,
  OutlierRun,
  RecommendedCanonicalPath,
  StepFingerprint,
  NormalizedTitle,
} from '@ledgerium/intelligence-engine';
import type { ProcessRun, ProcessDefinition as EngineProcessDefinition, SOP } from '@ledgerium/process-engine';
import { db } from '@/db';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkflowWithArtifacts {
  id: string;
  userId: string;
  title: string;
  durationMs: number | null;
  stepCount: number | null;
  processOutput: { processRun: ProcessRun; processDefinition: EngineProcessDefinition; sop?: SOP } | null;
}

// ─── Load bundles from DB ───────────────────────────────────────────────────

function loadBundlesForWorkflows(workflows: WorkflowWithArtifacts[]): ProcessRunBundle[] {
  const bundles: ProcessRunBundle[] = [];
  for (const w of workflows) {
    if (!w.processOutput) continue;
    bundles.push({
      processRun: w.processOutput.processRun,
      processDefinition: w.processOutput.processDefinition,
    });
  }
  return bundles;
}

async function getWorkflowsWithOutputs(userId: string, workflowIds?: string[]): Promise<WorkflowWithArtifacts[]> {
  const where: Record<string, unknown> = {
    userId,
    status: 'active',
  };
  if (workflowIds) {
    where.id = { in: workflowIds };
  }

  const workflows = await db.workflow.findMany({
    where,
    include: {
      artifacts: {
        where: { artifactType: 'process_output' },
        select: { contentJson: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return workflows.map((w) => ({
    id: w.id,
    userId: w.userId,
    title: w.title,
    durationMs: w.durationMs,
    stepCount: w.stepCount,
    processOutput: w.artifacts[0]?.contentJson
      ? JSON.parse(w.artifacts[0].contentJson)
      : null,
  }));
}

// ─── Path signature computation ─────────────────────────────────────────────

function getPathSignatureForBundle(bundle: ProcessRunBundle): string {
  const sig = computePathSignature(bundle);
  return sig.signature;
}

// ─── Auto-cluster into ProcessDefinitions ───────────────────────────────────

/**
 * Groups workflows by path signature and creates/updates ProcessDefinition records.
 * Conservative: only groups workflows with identical path signatures.
 */
export async function clusterWorkflows(userId: string): Promise<void> {
  const workflows = await getWorkflowsWithOutputs(userId);

  // Group by path signature
  const groups = new Map<string, WorkflowWithArtifacts[]>();
  for (const w of workflows) {
    if (!w.processOutput) continue;
    const bundle: ProcessRunBundle = {
      processRun: w.processOutput.processRun,
      processDefinition: w.processOutput.processDefinition,
    };
    const sig = getPathSignatureForBundle(bundle);
    const existing = groups.get(sig);
    if (existing) {
      existing.push(w);
    } else {
      groups.set(sig, [w]);
    }
  }

  // Phase 5 tracking maps — populated per group, used for family detection after
  const groupFingerprintMap = new Map<string, StepFingerprint[]>();
  const groupNormalizedTitles = new Map<string, NormalizedTitle>();
  const groupSystems = new Map<string, string[]>();
  const groupArtifacts = new Map<string, string[]>();
  const groupStartAnchors = new Map<string, string>();
  const groupEndAnchors = new Map<string, string>();
  const groupRunCounts = new Map<string, number>();
  const groupEventFps = new Map<string, string[]>();

  // For each group, create or update a ProcessDefinition
  for (const [signature, group] of groups) {
    if (group.length === 0) continue;

    // Derive canonical name from the most common title
    const titleCounts = new Map<string, number>();
    for (const w of group) {
      titleCounts.set(w.title, (titleCounts.get(w.title) ?? 0) + 1);
    }
    let canonicalName = group[0]!.title;
    let maxCount = 0;
    for (const [title, count] of titleCounts) {
      if (count > maxCount) {
        canonicalName = title;
        maxCount = count;
      }
    }

    // Compute metrics
    const durations = group.map((w) => w.durationMs).filter((d): d is number => d !== null);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : null;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const medianDuration = sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length / 2)]!
      : null;

    // Run intelligence if >= 1 run
    const bundles = loadBundlesForWorkflows(group);
    let intelligenceJson: string | null = null;
    let stabilityScore: number | null = null;
    let variantCount = 0;

    if (bundles.length >= 1) {
      try {
        const intelligence = analyzePortfolio({ runs: bundles });
        stabilityScore = intelligence.variance.sequenceStability;
        variantCount = intelligence.variants.variantCount;

        // Phase 3: compute additional process intelligence scores
        const standardization = computeStandardizationScore(
          intelligence.variants,
          intelligence.variance,
          intelligence.metrics,
        );
        const outlierRuns = detectOutlierRuns(bundles, intelligence.variants);
        const recommendedPath = deriveRecommendedCanonicalPath(bundles, intelligence.variants);

        // SOP alignment: derive SOP steps from the first workflow's process output
        const sopWorkflow = group.find((w) => w.processOutput?.sop?.steps?.length);
        const sopSteps = sopWorkflow?.processOutput?.sop?.steps?.map((s) => ({
          ordinal: s.ordinal,
          title: s.title,
          category: s.category,
        })) ?? [];

        let sopAlignment: SOPAlignmentResult | null = null;
        let documentationDrift: DocumentationDriftScore | null = null;

        if (sopSteps.length > 0) {
          const dominantVariant = intelligence.variants.standardPath ?? null;
          sopAlignment = analyzeSopAlignment(sopSteps, bundles, dominantVariant);
          documentationDrift = computeDocumentationDriftScore(sopAlignment);
        }

        // Phase 4: Recommendations
        let recommendations: unknown[] = [];
        try {
          const sopAlignmentResult = sopAlignment ?? null;
          const standardizationResult = standardization ?? null;
          recommendations = generateRecommendations(
            canonicalName, bundles, intelligence.metrics,
            intelligence.variants, intelligence.variance,
            intelligence.timestudy, intelligence.bottlenecks,
            sopAlignmentResult, standardizationResult,
          );
        } catch (err) {
          console.error('Recommendation generation failed:', err);
        }

        let automationROI: unknown[] = [];
        try {
          automationROI = computeAutomationROI(intelligence.timestudy, bundles.length);
        } catch (err) {
          console.error('Automation ROI computation failed:', err);
        }

        // Merge Phase 3 + Phase 4 scores into the intelligence JSON alongside portfolio data
        const extendedIntelligence = {
          ...intelligence,
          standardization,
          outlierRuns,
          recommendedPath,
          sopAlignment,
          documentationDrift,
          recommendations,
          automationROI,
        };

        intelligenceJson = JSON.stringify(extendedIntelligence);
      } catch {
        // Intelligence computation failed — store without it
      }
    }

    // ── Phase 5: Enrich with title normalization, fingerprints, anchors ───

    const normalized = normalizeTitle(canonicalName);

    // Fingerprint steps for the representative (first) bundle
    const representativeDef = bundles[0]?.processDefinition;
    let startAnchor = '';
    let endAnchor = '';
    let stepSigHash = '';
    let eventSigHash = '';
    let groupFingerprints: StepFingerprint[] = [];

    if (representativeDef) {
      groupFingerprints = fingerprintWorkflowSteps(
        representativeDef.stepDefinitions,
        group[0]!.id,
      );
      if (groupFingerprints.length > 0) {
        startAnchor = groupFingerprints[0]!.semanticSignature;
        endAnchor = groupFingerprints[groupFingerprints.length - 1]!.semanticSignature;
      }
      stepSigHash = hashStepSequence(groupFingerprints);
    }

    // Build event fingerprints from the representative bundle
    const eventFps: string[] = [];
    if (representativeDef) {
      for (const step of representativeDef.stepDefinitions) {
        eventFps.push(fingerprintEvent(step.category, null, step.systems[0] ?? null));
      }
      eventSigHash = hashEventSequence(eventFps);
    }

    // Compute confidence band
    const rawConfidence = group.length >= 3 ? 0.8 : group.length >= 2 ? 0.5 : 0.3;
    const confidenceBand = resolveConfidenceBand(rawConfidence, DEFAULT_SCORING_CONFIG);

    // Build explanation
    const supportingEntries = [];
    const weaknessEntries = [];
    if (group.length >= 3) {
      supportingEntries.push({ code: 'HIGH_STEP_OVERLAP' as const, weight: 0.3, detail: `${group.length} runs with identical step sequence` });
    }
    if (group.length < 3) {
      weaknessEntries.push({ code: 'LOW_SAMPLE_SIZE' as const, weight: 0.1, detail: `Only ${group.length} run(s) observed` });
    }
    if (startAnchor) {
      supportingEntries.push({ code: 'SAME_START_ANCHOR' as const, weight: 0.15 });
    }
    if (endAnchor) {
      supportingEntries.push({ code: 'SAME_END_ANCHOR' as const, weight: 0.15 });
    }
    const explanation = buildExplanation(supportingEntries, weaknessEntries, GROUPING_MODEL_VERSION);

    // Collect systems from all bundles
    const allSystems = new Set<string>();
    for (const b of bundles) {
      for (const sys of b.processRun.systemsUsed) allSystems.add(sys);
    }

    // Extended metrics
    const extendedMetrics = {
      avgDurationMs: avgDuration,
      medianDurationMs: medianDuration,
      commonPathPct: stabilityScore ?? 0,
      stepConsistencyScore: stabilityScore ?? 0,
      eventConsistencyScore: stabilityScore ?? 0,
      anomalyRate: 0,
      reworkRate: 0,
      delayHotspots: [] as number[],
    };

    // Upsert ProcessDefinition with Phase 5 fields
    const existing = await db.processDefinition.findFirst({
      where: { userId, pathSignature: signature },
    });

    const defData = {
      canonicalName,
      pathSignature: signature,
      runCount: group.length,
      variantCount,
      avgDurationMs: avgDuration,
      medianDurationMs: medianDuration,
      stabilityScore,
      confidenceScore: rawConfidence,
      intelligenceJson,
      analyzedAt: new Date(),
      // Phase 5 fields
      normalizedName: normalized.normalized,
      groupType: 'exact_group',
      startAnchor,
      endAnchor,
      confidenceBand,
      explanationJson: JSON.stringify(explanation),
      systems: JSON.stringify([...allSystems]),
      intentSignature: normalized.familySignature,
      nameSignature: normalized.exactSignature,
      stepSignatureHash: stepSigHash,
      eventSignatureHash: eventSigHash,
      metricsJson: JSON.stringify(extendedMetrics),
    };

    let defId: string;
    if (existing) {
      await db.processDefinition.update({
        where: { id: existing.id },
        data: defData,
      });
      defId = existing.id;
    } else {
      const created = await db.processDefinition.create({
        data: { id: crypto.randomUUID(), userId, ...defData },
      });
      defId = created.id;
    }

    // Link workflows to this definition
    const workflowIds = group.map((w) => w.id);
    await db.workflow.updateMany({
      where: { id: { in: workflowIds } },
      data: { processDefinitionId: defId },
    });

    // Generate insights from intelligence
    if (intelligenceJson && bundles.length >= 2) {
      await generateInsights(userId, defId, JSON.parse(intelligenceJson), workflowIds);
    }

    // Track for Phase 5 family detection
    groupFingerprintMap.set(defId, groupFingerprints);
    groupNormalizedTitles.set(defId, normalized);
    groupSystems.set(defId, [...allSystems]);
    groupArtifacts.set(defId, []);
    groupStartAnchors.set(defId, startAnchor);
    groupEndAnchors.set(defId, endAnchor);
    groupRunCounts.set(defId, group.length);
    groupEventFps.set(defId, eventFps);
  }

  // ── Phase 5.2: Family detection across process definitions ───────────

  await runFamilyDetection(userId, groupNormalizedTitles, groupFingerprintMap,
    groupSystems, groupArtifacts, groupStartAnchors, groupEndAnchors,
    groupRunCounts, groupEventFps);

  // ── Phase 5.3: Component detection ───────────────────────────────────

  await runComponentDetection(userId, groupFingerprintMap);
}

// ─── Analyze a single workflow ──────────────────────────────────────────────

export async function analyzeWorkflow(userId: string, workflowId: string): Promise<PortfolioIntelligence | null> {
  const workflows = await getWorkflowsWithOutputs(userId, [workflowId]);
  if (workflows.length === 0) return null;

  const bundles = loadBundlesForWorkflows(workflows);
  if (bundles.length === 0) return null;

  return analyzePortfolio({ runs: bundles });
}

// ─── Analyze portfolio (all or subset) ──────────────────────────────────────

export async function analyzeUserPortfolio(
  userId: string,
  workflowIds?: string[],
): Promise<PortfolioIntelligence | null> {
  const workflows = await getWorkflowsWithOutputs(userId, workflowIds);
  const bundles = loadBundlesForWorkflows(workflows);
  if (bundles.length === 0) return null;

  return analyzePortfolio({ runs: bundles });
}

// ─── Insight generation ─────────────────────────────────────────────────────

async function generateInsights(
  userId: string,
  processDefinitionId: string,
  intelligence: PortfolioIntelligence,
  affectedWorkflowIds: string[],
): Promise<void> {
  // Clear old insights for this definition
  await db.processInsight.deleteMany({
    where: { processDefinitionId },
  });

  const insights: Array<{
    insightType: string;
    severity: string;
    title: string;
    explanation: string;
    recommendation?: string;
    observedValue?: string;
    expectedValue?: string;
    evidenceJson?: string;
  }> = [];

  // Bottleneck insights
  for (const b of intelligence.bottlenecks.bottlenecks) {
    if (b.isHighDuration) {
      insights.push({
        insightType: 'bottleneck',
        severity: b.durationRatio >= 3 ? 'critical' : 'warning',
        title: `Step ${b.position} is a bottleneck`,
        explanation: `Step at position ${b.position} (${b.category}) averages ${Math.round(b.meanDurationMs / 1000)}s — ${b.durationRatio.toFixed(1)}x the overall step average.`,
        recommendation: 'Investigate why this step takes disproportionately long. Consider breaking it into sub-steps or automating part of it.',
        observedValue: `${Math.round(b.meanDurationMs / 1000)}s avg`,
        expectedValue: `${Math.round(b.overallMeanStepDurationMs / 1000)}s avg`,
        evidenceJson: JSON.stringify(b),
      });
    }
  }

  // High-variance steps
  for (const v of intelligence.variance.highVarianceSteps) {
    insights.push({
      insightType: 'variance',
      severity: v.coefficientOfVariation >= 1.0 ? 'warning' : 'info',
      title: `Step ${v.position} has high variation`,
      explanation: `Step at position ${v.position} (${v.category}) varies significantly across runs. Coefficient of variation: ${v.coefficientOfVariation.toFixed(2)}.`,
      recommendation: 'This step behaves inconsistently. It may indicate different user approaches or environmental factors worth standardizing.',
      observedValue: `CV ${v.coefficientOfVariation.toFixed(2)}`,
      expectedValue: 'CV < 0.5',
      evidenceJson: JSON.stringify(v),
    });
  }

  // Sequence stability
  if (intelligence.variance.sequenceStability < 0.5 && intelligence.runCount >= 3) {
    insights.push({
      insightType: 'variance',
      severity: 'warning',
      title: 'Low sequence consistency',
      explanation: `Only ${Math.round(intelligence.variance.sequenceStability * 100)}% of runs follow the standard path. The process is executed differently most of the time.`,
      recommendation: 'Consider defining a canonical process and training users, or investigate whether the variation serves a purpose.',
      observedValue: `${Math.round(intelligence.variance.sequenceStability * 100)}%`,
      expectedValue: '> 75%',
    });
  }

  // Variant insights
  if (intelligence.variants.variantCount > 2 && intelligence.runCount >= 3) {
    insights.push({
      insightType: 'variance',
      severity: 'info',
      title: `${intelligence.variants.variantCount} process variants detected`,
      explanation: `This process is executed in ${intelligence.variants.variantCount} distinct ways. The most common variant covers ${Math.round((intelligence.variants.standardPath?.frequency ?? 0) * 100)}% of runs.`,
      recommendation: 'Review the variants to determine which represent best practice, which are workarounds, and which should be standardized.',
      evidenceJson: JSON.stringify(intelligence.variants.variants.map((v) => ({
        id: v.variantId,
        frequency: v.frequency,
        runCount: v.runCount,
        isStandard: v.isStandardPath,
      }))),
    });
  }

  // Drift insights
  if (intelligence.drift) {
    for (const signal of intelligence.drift.driftSignals) {
      insights.push({
        insightType: 'drift',
        severity: signal.severity === 'high' ? 'critical' : signal.severity,
        title: `${signal.driftType} drift detected`,
        explanation: signal.description,
        observedValue: String(signal.currentValue),
        expectedValue: String(signal.baselineValue),
        evidenceJson: JSON.stringify(signal),
      });
    }
  }

  // Persist insights
  for (const insight of insights) {
    await db.processInsight.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        processDefinitionId,
        insightType: insight.insightType,
        severity: insight.severity,
        title: insight.title,
        explanation: insight.explanation,
        recommendation: insight.recommendation ?? null,
        observedValue: insight.observedValue ?? null,
        expectedValue: insight.expectedValue ?? null,
        evidenceJson: insight.evidenceJson ?? null,
        affectedRunIds: JSON.stringify(affectedWorkflowIds),
      },
    });
  }
}

// ─── Phase 5.2: Family detection ────────────────────────────────────────────

/**
 * Detect process families by scoring pairs of process definitions for
 * family-level similarity. Creates ProcessFamily records and links
 * definitions via familyId. Also creates GroupRelationship records.
 */
async function runFamilyDetection(
  userId: string,
  titles: Map<string, NormalizedTitle>,
  fingerprints: Map<string, StepFingerprint[]>,
  systems: Map<string, string[]>,
  artifacts: Map<string, string[]>,
  startAnchors: Map<string, string>,
  endAnchors: Map<string, string>,
  runCounts: Map<string, number>,
  eventFps: Map<string, string[]>,
): Promise<void> {
  const defIds = [...titles.keys()];
  if (defIds.length < 2) return;

  // Build lightweight WorkflowRunRecord-like objects for the scorer
  function makeRunRecord(defId: string) {
    return {
      id: defId,
      originalWorkflowId: defId,
      processGroupId: null,
      variantId: null,
      familyId: null,
      title: titles.get(defId)?.raw ?? '',
      normalizedTitle: titles.get(defId)!,
      startAnchor: startAnchors.get(defId) ?? '',
      endAnchor: endAnchors.get(defId) ?? '',
      stepCount: fingerprints.get(defId)?.length ?? 0,
      eventCount: (eventFps.get(defId)?.length ?? 0) * 2,
      systems: systems.get(defId) ?? [],
      artifacts: artifacts.get(defId) ?? [],
      actor: null,
      durationMs: null,
      pathHash: '',
      stepFingerprints: fingerprints.get(defId) ?? [],
      eventFingerprints: eventFps.get(defId) ?? [],
      clusteringScores: { exactGroupScore: 0, familyScore: 0, componentReuseScore: 0, anomalyScore: 0 },
    };
  }

  // Score all pairs for family membership
  // Use union-find to merge into families
  const parent = new Map<string, string>();
  for (const id of defIds) parent.set(id, id);

  function find(x: string): string {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  }

  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  }

  const relationships: Array<{
    sourceId: string; targetId: string;
    type: string; score: number;
    codes: string[]; text: string;
  }> = [];

  for (let i = 0; i < defIds.length; i++) {
    for (let j = i + 1; j < defIds.length; j++) {
      const a = makeRunRecord(defIds[i]!);
      const b = makeRunRecord(defIds[j]!);
      const result = scoreFamilyMembership(a, b);

      if (result.decision === 'same_family' || result.decision === 'likely_family') {
        union(defIds[i]!, defIds[j]!);
        relationships.push({
          sourceId: defIds[i]!, targetId: defIds[j]!,
          type: 'same_family', score: result.score,
          codes: result.explanation.supporting.map(e => e.code),
          text: result.explanation.summary,
        });
      } else if (result.decision === 'possible_related') {
        relationships.push({
          sourceId: defIds[i]!, targetId: defIds[j]!,
          type: 'possible_match', score: result.score,
          codes: result.explanation.supporting.map(e => e.code),
          text: result.explanation.summary,
        });
      }
    }
  }

  // Build families from union-find clusters
  const familyClusters = new Map<string, string[]>();
  for (const id of defIds) {
    const root = find(id);
    if (!familyClusters.has(root)) familyClusters.set(root, []);
    familyClusters.get(root)!.push(id);
  }

  // Clear old families and relationships for this user
  await db.groupRelationship.deleteMany({ where: { userId } });
  // Only delete families that have no groups left (orphan cleanup)
  const existingFamilies = await db.processFamily.findMany({ where: { userId }, select: { id: true } });
  for (const fam of existingFamilies) {
    const groupCount = await db.processDefinition.count({ where: { familyId: fam.id } });
    if (groupCount === 0) {
      await db.processFamily.delete({ where: { id: fam.id } });
    }
  }

  // Create family records for clusters with 2+ members
  for (const [_root, memberIds] of familyClusters) {
    if (memberIds.length < 2) {
      // Single member = standalone, clear any stale familyId
      await db.processDefinition.updateMany({
        where: { id: { in: memberIds } },
        data: { familyId: null },
      });
      continue;
    }

    // Derive family name from member titles
    const memberTitles = memberIds.map(id => titles.get(id)?.raw ?? '');
    const familyName = deriveFamilyNameFromTitles(memberTitles);
    const familySlug = slugify(familyName);

    // Collect family-level metrics
    const totalRuns = memberIds.reduce((s, id) => s + (runCounts.get(id) ?? 0), 0);
    const allFamilySystems = new Set<string>();
    for (const id of memberIds) {
      for (const sys of systems.get(id) ?? []) allFamilySystems.add(sys);
    }

    // Compute family confidence (average of member confidences)
    const memberConfidences: number[] = [];
    for (const id of memberIds) {
      const def = await db.processDefinition.findUnique({ where: { id }, select: { confidenceScore: true } });
      if (def?.confidenceScore) memberConfidences.push(def.confidenceScore);
    }
    const familyConfidence = memberConfidences.length > 0
      ? memberConfidences.reduce((s, c) => s + c, 0) / memberConfidences.length
      : 0.5;

    const familyBand = resolveConfidenceBand(familyConfidence, DEFAULT_SCORING_CONFIG);
    const familyExplanation = buildExplanation(
      [{ code: 'TITLE_PATTERN_MATCH' as const, weight: 0.3, detail: `${memberIds.length} groups share naming pattern` }],
      memberIds.length < 3 ? [{ code: 'LOW_SAMPLE_SIZE' as const, weight: 0.1 }] : [],
      GROUPING_MODEL_VERSION,
    );

    // Upsert family
    const existingFamily = await db.processFamily.findFirst({
      where: { userId, familySlug },
    });

    let familyId: string;
    const familyData = {
      familyName,
      familySlug,
      confidenceScore: familyConfidence,
      confidenceBand: familyBand,
      totalExactGroups: memberIds.length,
      totalRuns,
      canonicalIntent: titles.get(memberIds[0]!)?.familySignature ?? '',
      createdFromModelVersion: SCORING_MODEL_VERSION,
      explanationJson: JSON.stringify(familyExplanation),
      topSystems: JSON.stringify([...allFamilySystems]),
      metricsJson: JSON.stringify({ avgDurationMs: null, totalVariants: 0 }),
    };

    if (existingFamily) {
      await db.processFamily.update({ where: { id: existingFamily.id }, data: familyData });
      familyId = existingFamily.id;
    } else {
      const created = await db.processFamily.create({
        data: { id: crypto.randomUUID(), userId, ...familyData },
      });
      familyId = created.id;
    }

    // Link definitions to family
    await db.processDefinition.updateMany({
      where: { id: { in: memberIds } },
      data: { familyId },
    });
  }

  // Persist group relationships
  for (const rel of relationships) {
    await db.groupRelationship.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        sourceType: 'group',
        sourceId: rel.sourceId,
        targetType: 'group',
        targetId: rel.targetId,
        relationshipType: rel.type,
        confidenceScore: rel.score,
        explanationCodes: JSON.stringify(rel.codes),
        explanationText: rel.text,
        createdFromModelVersion: SCORING_MODEL_VERSION,
      },
    });
  }
}

// ─── Phase 5.3: Component detection ─────────────────────────────────────────

/**
 * Detect canonical shared components from step fingerprints across all
 * process definitions and persist to CanonicalComponentRecord table.
 */
async function runComponentDetection(
  userId: string,
  fingerprintsByGroup: Map<string, StepFingerprint[]>,
): Promise<void> {
  if (fingerprintsByGroup.size === 0) return;

  const result = detectComponents({ fingerprintsByWorkflow: fingerprintsByGroup }, 2);

  // Clear old components for this user
  await db.canonicalComponentRecord.deleteMany({ where: { userId } });

  // Persist detected components
  for (const comp of result.components) {
    await db.canonicalComponentRecord.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        componentName: comp.componentName,
        componentType: comp.componentType,
        canonicalVerb: comp.canonicalVerb,
        canonicalObject: comp.canonicalObject,
        canonicalSystem: comp.canonicalSystem,
        description: comp.description,
        usageCount: comp.usageCount,
        familyCount: comp.familyCount,
        groupCount: comp.groupCount,
        avgDurationMs: comp.avgDurationMs,
        commonPredecessors: JSON.stringify(comp.commonPredecessors),
        commonSuccessors: JSON.stringify(comp.commonSuccessors),
        relatedComponentIds: JSON.stringify(comp.relatedComponentIds),
      },
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveFamilyNameFromTitles(names: string[]): string {
  if (names.length === 0) return 'Unknown Family';
  if (names.length === 1) return names[0]!;

  // Find longest common prefix (word-level)
  const tokenized = names.map(n => n.split(/\s+/));
  const minLen = Math.min(...tokenized.map(t => t.length));
  const commonWords: string[] = [];
  for (let i = 0; i < minLen; i++) {
    const word = tokenized[0]![i]!.toLowerCase();
    if (tokenized.every(t => t[i]!.toLowerCase() === word)) {
      commonWords.push(tokenized[0]![i]!);
    } else {
      break;
    }
  }

  if (commonWords.length >= 2) return commonWords.join(' ');
  // Fallback: shortest name
  return names.reduce((shortest, n) => n.length < shortest.length ? n : shortest);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
