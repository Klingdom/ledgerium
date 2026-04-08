/**
 * Ingestion pipeline — transforms a Ledgerium recorder SessionBundle
 * into a durable workflow with structured artifacts.
 *
 * Uses the @ledgerium/process-engine for deterministic processing.
 * All transformation is server-side, pure, and environment-agnostic.
 */

import { processSession, validateProcessEngineInput, renderProcessMap, renderSOP, selectTemplates } from '@ledgerium/process-engine';
import type { ProcessEngineInput, ProcessOutput, ProcessMapTemplateType, SOPTemplateType } from '@ledgerium/process-engine';
import { z } from 'zod';

// ─── Bundle validation schema ───────────────────────────────────────────────

const sessionMetaSchema = z.object({
  sessionId: z.string().min(1),
  activityName: z.string().min(1),
  startedAt: z.string(),
  endedAt: z.string().optional(),
}).passthrough();

const canonicalEventSchema = z.object({
  event_id: z.string().min(1),
  session_id: z.string(),
  t_ms: z.number(),
  t_wall: z.string(),
  event_type: z.string(),
  actor_type: z.enum(['human', 'system', 'recorder']),
  normalization_meta: z.object({
    sourceEventId: z.string(),
    sourceEventType: z.string(),
    normalizationRuleVersion: z.string(),
    redactionApplied: z.boolean(),
  }).passthrough(),
}).passthrough();

const derivedStepSchema = z.object({
  step_id: z.string().min(1),
  session_id: z.string(),
  ordinal: z.number().int().min(1),
  title: z.string(),
  status: z.enum(['provisional', 'finalized']),
  grouping_reason: z.string(),
  confidence: z.number().min(0).max(1),
  source_event_ids: z.array(z.string()),
  start_t_ms: z.number(),
}).passthrough();

const bundleSchema = z.object({
  sessionJson: sessionMetaSchema,
  normalizedEvents: z.array(canonicalEventSchema),
  derivedSteps: z.array(derivedStepSchema),
  policyLog: z.array(z.any()).optional(),
  manifest: z.object({
    sessionId: z.string(),
    schemaVersion: z.string(),
  }).passthrough().optional(),
});

export type BundleValidationResult =
  | { valid: true; bundle: z.infer<typeof bundleSchema> }
  | { valid: false; errors: string[] };

/**
 * Validates an uploaded JSON file as a Ledgerium SessionBundle.
 */
export function validateBundle(raw: unknown): BundleValidationResult {
  const parsed = bundleSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`,
    );
    return { valid: false, errors };
  }
  return { valid: true, bundle: parsed.data };
}

/**
 * Runs the deterministic process engine on a validated bundle.
 * Returns the full ProcessOutput (processRun, processDefinition, processMap, sop).
 */
export function runProcessEngine(bundle: z.infer<typeof bundleSchema>): ProcessOutput {
  const input: ProcessEngineInput = {
    sessionJson: {
      sessionId: bundle.sessionJson.sessionId,
      activityName: bundle.sessionJson.activityName,
      startedAt: bundle.sessionJson.startedAt,
      ...(bundle.sessionJson.endedAt !== undefined ? { endedAt: bundle.sessionJson.endedAt } : {}),
    },
    normalizedEvents: bundle.normalizedEvents,
    derivedSteps: bundle.derivedSteps,
  };

  // Validate before processing — throws on invalid input
  const validation = validateProcessEngineInput(input);
  if (!validation.valid) {
    throw new Error(`Process engine validation failed: ${validation.errors.join('; ')}`);
  }

  return processSession(input);
}

// ─── Template artifact types ────────────────────────────────────────────────

const PROCESS_MAP_TEMPLATES: ProcessMapTemplateType[] = ['swimlane', 'bpmn_informed', 'sipoc_high_level'];
const SOP_TEMPLATES: SOPTemplateType[] = ['operator_centric', 'enterprise', 'decision_based'];

export interface TemplateArtifact {
  artifactType: string;
  contentJson: string;
}

/**
 * Renders all 6 template variants + selection metadata from a ProcessOutput.
 * Each template is wrapped in try/catch so one failure doesn't block others.
 */
export function renderAllTemplates(output: ProcessOutput): TemplateArtifact[] {
  const artifacts: TemplateArtifact[] = [];

  // Auto-selection (for storing the recommended default)
  try {
    const selection = selectTemplates(output);
    artifacts.push({
      artifactType: 'template_selection',
      contentJson: JSON.stringify(selection),
    });
  } catch (err) {
    console.error('Template selection failed:', err);
  }

  // Process map templates
  for (const template of PROCESS_MAP_TEMPLATES) {
    try {
      const rendered = renderProcessMap(output, template);
      artifacts.push({
        artifactType: `template_process_map_${template}`,
        contentJson: JSON.stringify(rendered),
      });
    } catch (err) {
      console.error(`Process map template "${template}" failed:`, err);
    }
  }

  // SOP templates
  for (const template of SOP_TEMPLATES) {
    try {
      const rendered = renderSOP(output, template);
      artifacts.push({
        artifactType: `template_sop_${template}`,
        contentJson: JSON.stringify(rendered),
      });
    } catch (err) {
      console.error(`SOP template "${template}" failed:`, err);
    }
  }

  return artifacts;
}

/**
 * Builds a workflow report from the process output.
 * Structured for canonical workflow_report.json format.
 */
export function buildWorkflowReportFromOutput(
  output: ProcessOutput,
  bundle: z.infer<typeof bundleSchema>,
): Record<string, unknown> {
  const { processRun, processDefinition, processMap, sop } = output;

  return {
    header: {
      reportId: `report-${processRun.sessionId}`,
      sessionId: processRun.sessionId,
      activityName: processRun.activityName,
      generatedAt: new Date().toISOString(),
      startedAt: processRun.startedAt,
      endedAt: processRun.endedAt ?? null,
      durationMs: processRun.durationMs ?? 0,
      durationLabel: processRun.durationLabel,
      schemaVersion: bundle.manifest?.schemaVersion ?? '1.0.0',
      engineVersion: processRun.engineVersion,
    },
    executiveSummary: {
      title: processRun.activityName,
      objective: `Recorded workflow for "${processRun.activityName}".`,
      applicationsUsed: processRun.systemsUsed,
      totalSteps: processRun.stepCount,
      totalPhases: processMap.phases.length,
      workflowConfidence: processDefinition.stepDefinitions.length > 0
        ? Math.round(
            (processDefinition.stepDefinitions.reduce((s, d) => s + d.confidence, 0) /
              processDefinition.stepDefinitions.length) * 100,
          ) / 100
        : 0,
    },
    workflowOverview: {
      title: processDefinition.name,
      description: processDefinition.description,
      systems: processDefinition.systems,
      steps: processDefinition.stepDefinitions.map((s) => ({
        ordinal: s.ordinal,
        stepId: s.stepId,
        title: s.title,
        category: s.category,
        categoryLabel: s.categoryLabel,
        confidence: s.confidence,
        durationLabel: s.durationLabel,
        eventCount: s.eventCount,
      })),
      phases: processMap.phases.map((p) => ({
        id: p.id,
        name: p.name,
        system: p.system,
        stepCount: p.stepNodeIds.length,
      })),
    },
    metrics: {
      totalDurationMs: processRun.durationMs ?? 0,
      totalDurationLabel: processRun.durationLabel,
      stepCount: processRun.stepCount,
      eventCount: processRun.eventCount,
      humanEventCount: processRun.humanEventCount,
      systemEventCount: processRun.systemEventCount,
      phaseCount: processMap.phases.length,
      systemsUsed: processRun.systemsUsed,
      errorStepCount: processRun.errorStepCount,
      navigationStepCount: processRun.navigationStepCount,
      completionStatus: processRun.completionStatus,
    },
    sop: {
      title: sop.title,
      purpose: sop.purpose,
      scope: sop.scope,
      systems: sop.systems,
      prerequisites: sop.prerequisites,
      estimatedTime: sop.estimatedTime,
      steps: sop.steps.map((s) => ({
        ordinal: s.ordinal,
        title: s.title,
        action: s.action,
        detail: s.detail,
        system: s.system,
        expectedOutcome: s.expectedOutcome,
        confidence: s.confidence,
        durationLabel: s.durationLabel,
      })),
      completionCriteria: sop.completionCriteria,
      notes: sop.notes,
    },
  };
}
