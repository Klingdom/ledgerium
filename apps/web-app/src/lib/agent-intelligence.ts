/**
 * Agent Intelligence Service — orchestrates @ledgerium/agent-intelligence
 * against stored workflow data.
 *
 * Provides:
 * 1. analyzeWorkflowAgentIntelligence(userId, workflowId) → TransformationResult
 * 2. analyzePortfolioAgentIntelligence(userId, workflowIds?) → CrossWorkflowIntelligence
 */

import { transformWorkflow, analyzePortfolio } from '@ledgerium/agent-intelligence';
import type { TransformationResult, CrossWorkflowIntelligence } from '@ledgerium/agent-intelligence';
import type { ProcessOutput } from '@ledgerium/process-engine';
import { db } from '@/db';

/**
 * Load the full ProcessOutput for a workflow from the DB.
 * Returns null if the workflow doesn't exist or has no process_output artifact.
 */
async function loadProcessOutput(userId: string, workflowId: string): Promise<ProcessOutput | null> {
  const workflow = await db.workflow.findFirst({
    where: { id: workflowId, userId, status: 'active' },
    include: {
      artifacts: {
        where: { artifactType: 'process_output' },
        select: { contentJson: true },
      },
    },
  });

  if (!workflow || !workflow.artifacts[0]?.contentJson) return null;

  try {
    return JSON.parse(workflow.artifacts[0].contentJson) as ProcessOutput;
  } catch {
    return null;
  }
}

/**
 * Run the full agent intelligence pipeline on a single workflow.
 */
export async function analyzeWorkflowAgentIntelligence(
  userId: string,
  workflowId: string,
): Promise<TransformationResult | null> {
  const processOutput = await loadProcessOutput(userId, workflowId);
  if (!processOutput) return null;

  return transformWorkflow(processOutput);
}

/**
 * Run cross-workflow intelligence analysis on all (or selected) workflows.
 */
export async function analyzePortfolioAgentIntelligence(
  userId: string,
  workflowIds?: string[],
): Promise<CrossWorkflowIntelligence | null> {
  const where: Record<string, unknown> = { userId, status: 'active' };
  if (workflowIds) where.id = { in: workflowIds };

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

  const results: TransformationResult[] = [];
  for (const w of workflows) {
    const json = w.artifacts[0]?.contentJson;
    if (!json) continue;
    try {
      const processOutput = JSON.parse(json) as ProcessOutput;
      results.push(transformWorkflow(processOutput));
    } catch {
      // Skip workflows with invalid process output
    }
  }

  if (results.length === 0) return null;
  return analyzePortfolio(results);
}
