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

    // Upsert ProcessDefinition
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
      confidenceScore: group.length >= 3 ? 0.8 : group.length >= 2 ? 0.5 : 0.3,
      intelligenceJson,
      analyzedAt: new Date(),
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
  }
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
