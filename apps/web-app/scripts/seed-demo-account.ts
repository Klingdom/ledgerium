/**
 * seed-demo-account.ts
 *
 * Deterministic, idempotent seed script for the Ledgerium AI demo environment.
 * Creates a demo user, team workspace, and 5-7 richly-populated demo workflows
 * with full intelligence pipeline outputs (ProcessDefinition, intelligenceJson,
 * WorkflowArtifacts for SOP + ProcessMap, ProcessGraph).
 *
 * Idempotency: the script DELETES any existing demo data (matched by email)
 * before recreating it. Re-runs produce byte-identical results thanks to the
 * fixed referenceTimestamp and deterministic UUIDs.
 *
 * Usage:
 *   tsx scripts/seed-demo-account.ts
 *   DEMO_EMAIL=... DEMO_PASSWORD=... tsx scripts/seed-demo-account.ts
 *
 * Environment variables (all optional — defaults shown):
 *   DEMO_EMAIL           demo@ledgerium.ai
 *   DEMO_PASSWORD        Demo2026!Workspace
 *   DEMO_WORKSPACE_NAME  Acme Operations
 *   DATABASE_URL         (required — set in .env)
 *
 * @see docs/runbooks/DEMO_ACCOUNT_SEED.md
 * @iter 089 — OP-3 demo account seed (Mode 2, directed)
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fixed epoch ms — 2024-05-25 00:00:00 UTC. Never use Date.now() in this script. */
export const REFERENCE_TIMESTAMP_MS = 1_716_595_200_000;

/** One day in milliseconds — used for relative timestamp offsets. */
const DAY_MS = 86_400_000;

/** bcrypt cost factor — matches the application's auth.ts pattern. */
const BCRYPT_COST = 12;

// ─── Environment ──────────────────────────────────────────────────────────────

export const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@ledgerium.ai';
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!Workspace';
export const DEMO_WORKSPACE_NAME = process.env.DEMO_WORKSPACE_NAME ?? 'Acme Operations';

// ─── Pure helper: intelligenceJson builder ────────────────────────────────────

/**
 * Build a valid intelligenceJson string matching the Zod schema consumed by
 * `parseIntelligenceJson()` in `src/lib/metrics-input-adapter.ts`.
 *
 * All fields intentionally satisfy the adapter's optional/nullable contract.
 * Extra fields are tolerated via `.passthrough()` — this structure is minimal.
 */
export function buildIntelligenceJson(opts: {
  sequenceStability: number | null;
  stepCountStdDev: number | null;
  variantCount: number | null;
  standardPathFrequency: number | null;
  /** Additional fields tolerated by passthrough (not validated by adapter). */
  automationROI?: number;
  bottleneckStepId?: string | null;
}): string {
  const payload = {
    variance: {
      sequenceStability: opts.sequenceStability,
      stepCountVariance: {
        stdDev: opts.stepCountStdDev,
      },
    },
    variants: {
      variantCount: opts.variantCount,
      standardPath: {
        frequency: opts.standardPathFrequency,
      },
    },
    // Extra fields tolerated via passthrough
    automationROI: opts.automationROI ?? null,
    bottleneckStepId: opts.bottleneckStepId ?? null,
  };
  return JSON.stringify(payload);
}

// ─── Pure helper: SOP content builder ────────────────────────────────────────

/**
 * Build a minimal SOP content JSON string suitable for storage as a
 * WorkflowArtifact with artifactType='sop'.
 */
export function buildSopContent(opts: {
  workflowTitle: string;
  steps: string[];
  systems: string[];
}): string {
  return JSON.stringify({
    title: opts.workflowTitle,
    version: '1.0',
    lastUpdated: new Date(REFERENCE_TIMESTAMP_MS).toISOString(),
    systems: opts.systems,
    steps: opts.steps.map((step, i) => ({
      ordinal: i + 1,
      title: step,
      type: 'action',
    })),
  });
}

// ─── Pure helper: ProcessMap content builder ──────────────────────────────────

/**
 * Build a minimal ProcessMap content JSON string suitable for storage as a
 * WorkflowArtifact with artifactType='process_map'.
 */
export function buildProcessMapContent(opts: {
  workflowTitle: string;
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ from: string; to: string }>;
}): string {
  return JSON.stringify({
    title: opts.workflowTitle,
    schemaVersion: '2.0',
    computedAtMs: REFERENCE_TIMESTAMP_MS,
    nodes: opts.nodes,
    edges: opts.edges,
  });
}

// ─── Pure helper: demo workflow definitions ───────────────────────────────────

/** Configuration shape for a single demo workflow. */
export interface DemoWorkflowConfig {
  title: string;
  description: string;
  /** JSON-encoded array of tool names. */
  toolsUsed: string[];
  durationMs: number;
  stepCount: number;
  confidence: number;
  /** Health score shown in the dashboard (0-100). */
  healthScore: number;
  /** AI opportunity score driving the opportunityTag threshold. */
  aiOpportunityScore: number;
  /** Number of distinct execution variants. */
  variantCount: number;
  /** Number of recorded sessions (Workflow rows) to create. */
  sessionCount: number;
  /** Sequence-stability (0-1). Higher = fewer variants. */
  sequenceStability: number;
  /** Standard-path frequency (0-1). Share of runs on the dominant path. */
  standardPathFrequency: number;
  /** SOP step descriptions. */
  sopSteps: string[];
  /** Day offset from referenceTimestamp for createdAt. */
  createdDaysAgo: number;
}

/**
 * Return the canonical set of demo workflow definitions.
 * Pure function — deterministic, no I/O.
 */
export function getDemoWorkflowConfigs(): DemoWorkflowConfig[] {
  return [
    {
      title: 'Customer support ticket triage',
      description:
        'Route incoming support tickets from Zendesk to the correct Slack channel and assignee based on priority and category.',
      toolsUsed: ['Zendesk', 'Slack'],
      durationMs: 420_000,
      stepCount: 8,
      confidence: 0.82,
      healthScore: 78,
      aiOpportunityScore: 48,
      variantCount: 2,
      sessionCount: 6,
      sequenceStability: 0.82,
      standardPathFrequency: 0.72,
      sopSteps: [
        'Open Zendesk ticket queue',
        'Review ticket subject and description',
        'Classify ticket category (billing, technical, account)',
        'Assign priority level (P1-P4)',
        'Route to correct Slack channel',
        'Set assignee and SLA timer',
        'Send acknowledgement to customer',
        'Log ticket in tracking sheet',
      ],
      createdDaysAgo: 30,
    },
    {
      title: 'Invoice approval workflow',
      description:
        'End-to-end invoice review in NetSuite, approval via Outlook email, and signature collection in DocuSign.',
      toolsUsed: ['NetSuite', 'Outlook', 'DocuSign'],
      durationMs: 1_800_000,
      stepCount: 10,
      confidence: 0.91,
      healthScore: 81,
      aiOpportunityScore: 82,
      variantCount: 1,
      sessionCount: 4,
      sequenceStability: 0.95,
      standardPathFrequency: 0.96,
      sopSteps: [
        'Log into NetSuite AP module',
        'Locate pending invoice in queue',
        'Verify vendor name and invoice number',
        'Check line-item totals against PO',
        'Flag discrepancies for review',
        'Open approval email template in Outlook',
        'Send approval request to budget owner',
        'Await and record approval decision',
        'Upload signed invoice to DocuSign',
        'Mark invoice as approved in NetSuite',
      ],
      createdDaysAgo: 45,
    },
    {
      title: 'Sales lead qualification',
      description:
        'Qualify inbound leads from LinkedIn via Salesforce opportunity scoring and Gmail outreach sequencing.',
      toolsUsed: ['Salesforce', 'LinkedIn', 'Gmail'],
      durationMs: 900_000,
      stepCount: 12,
      confidence: 0.67,
      healthScore: 57,
      aiOpportunityScore: 35,
      variantCount: 5,
      sessionCount: 5,
      sequenceStability: 0.41,
      standardPathFrequency: 0.28,
      sopSteps: [
        'Review new lead from LinkedIn Sales Navigator',
        'Check company size and industry fit',
        'Look up existing Salesforce contact',
        'Create or update lead record in Salesforce',
        'Score lead using BANT criteria',
        'Draft personalised outreach email in Gmail',
        'Send email and log activity in Salesforce',
        'Set follow-up reminder',
        'Review lead response and update score',
        'Move qualified leads to Opportunity stage',
        'Assign to account executive',
        'Log meeting notes in Salesforce',
      ],
      createdDaysAgo: 60,
    },
    {
      title: 'Quarterly compliance review',
      description:
        'Aggregate evidence from Confluence, track action items in Jira, and verify control status in Drata.',
      toolsUsed: ['Confluence', 'Jira', 'Drata'],
      durationMs: 3_600_000,
      stepCount: 9,
      confidence: 0.88,
      healthScore: 85,
      aiOpportunityScore: 22,
      variantCount: 1,
      sessionCount: 3,
      sequenceStability: 0.93,
      standardPathFrequency: 0.94,
      sopSteps: [
        'Open compliance checklist in Confluence',
        'Review each control against Drata evidence',
        'Flag controls with insufficient evidence',
        'Create Jira tickets for remediation items',
        'Assign Jira tickets to control owners',
        'Follow up on open Jira items weekly',
        'Mark completed controls in Drata',
        'Compile evidence package in Confluence',
        'Submit review summary to CISO',
      ],
      createdDaysAgo: 90,
    },
    {
      title: 'New employee onboarding',
      description:
        'Provision new hire accounts across Workday, Okta, Slack, and Notion within the first 48 hours.',
      toolsUsed: ['Workday', 'Okta', 'Slack', 'Notion'],
      durationMs: 2_700_000,
      stepCount: 11,
      confidence: 0.76,
      healthScore: 72,
      aiOpportunityScore: 55,
      variantCount: 2,
      sessionCount: 4,
      sequenceStability: 0.78,
      standardPathFrequency: 0.68,
      sopSteps: [
        'Receive new hire start date confirmation from Workday',
        'Create Okta user account with role-based groups',
        'Verify SSO provisioning to downstream apps',
        'Create Slack account and add to team channels',
        'Set up Notion workspace access',
        'Send welcome message in Slack with onboarding links',
        'Create onboarding Notion page from template',
        'Assign onboarding buddy in Slack',
        'Schedule 30/60/90-day check-ins in Workday',
        'Confirm equipment delivery in Workday',
        'Mark onboarding complete in Workday',
      ],
      createdDaysAgo: 20,
    },
    {
      title: 'Marketing campaign approval',
      description:
        'Collect creative briefs in Asana, coordinate feedback via Slack, and publish final assets to Google Drive.',
      toolsUsed: ['Asana', 'Slack', 'Google Drive'],
      durationMs: 1_200_000,
      stepCount: 8,
      confidence: 0.79,
      healthScore: 74,
      aiOpportunityScore: 44,
      variantCount: 1,
      sessionCount: 3,
      sequenceStability: 0.88,
      standardPathFrequency: 0.89,
      sopSteps: [
        'Create campaign brief task in Asana',
        'Attach creative assets to Asana task',
        'Notify stakeholders via Slack campaign channel',
        'Collect feedback and revisions in Asana comments',
        'Apply final revisions to assets',
        'Upload approved assets to Google Drive campaign folder',
        'Update Asana task status to Approved',
        'Archive campaign files in Google Drive',
      ],
      createdDaysAgo: 14,
    },
  ];
}

// ─── Database helpers ─────────────────────────────────────────────────────────

/**
 * Delete all demo data for the given email in FK-safe order.
 * Team must be deleted BEFORE User because Team.createdBy has no onDelete: Cascade.
 */
export async function deleteDemoData(
  prisma: PrismaClient,
  email: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return;

  // Delete teams this user created (TeamMember, TeamInvite, ApiKey cascade from Team)
  await prisma.team.deleteMany({ where: { createdBy: user.id } });

  // Delete user (cascades Workflow, ProcessDefinition, WorkflowArtifact, Upload, etc.)
  await prisma.user.delete({ where: { id: user.id } });
}

/**
 * Create the demo user and team workspace.
 * Returns the created user id and team id.
 */
export async function createDemoUser(
  prisma: PrismaClient,
  opts: {
    email: string;
    password: string;
    workspaceName: string;
  },
): Promise<{ userId: string; teamId: string }> {
  const passwordHash = await hash(opts.password, BCRYPT_COST);

  const slug = opts.workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const user = await prisma.user.create({
    data: {
      email: opts.email,
      name: 'Demo User',
      passwordHash,
      plan: 'team',
      subscriptionStatus: 'active',
      isAdmin: false,
      stripeCustomerId: null,
      createdAt: new Date(REFERENCE_TIMESTAMP_MS - 60 * DAY_MS),
      updatedAt: new Date(REFERENCE_TIMESTAMP_MS - 60 * DAY_MS),
    },
  });

  const team = await prisma.team.create({
    data: {
      name: opts.workspaceName,
      slug,
      createdBy: user.id,
      plan: 'team',
      subscriptionStatus: 'active',
      createdAt: new Date(REFERENCE_TIMESTAMP_MS - 60 * DAY_MS),
      updatedAt: new Date(REFERENCE_TIMESTAMP_MS - 60 * DAY_MS),
    },
  });

  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: user.id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(REFERENCE_TIMESTAMP_MS - 60 * DAY_MS),
    },
  });

  return { userId: user.id, teamId: team.id };
}

/**
 * Create one demo workflow with full intelligence pipeline output.
 *
 * Produces:
 *   - ProcessDefinition with intelligenceJson
 *   - Primary Workflow row (the "definition" workflow)
 *   - sessionCount-1 additional Workflow rows (session runs)
 *   - WorkflowArtifact for SOP
 *   - WorkflowArtifact for ProcessMap
 *   - ProcessGraph with nodes and edges (on primary workflow)
 */
export async function createDemoWorkflow(
  prisma: PrismaClient,
  userId: string,
  config: DemoWorkflowConfig,
): Promise<{ workflowId: string; processDefinitionId: string }> {
  const baseTs = REFERENCE_TIMESTAMP_MS - config.createdDaysAgo * DAY_MS;
  const toolsJson = JSON.stringify(config.toolsUsed);
  const pathSignature = config.sopSteps
    .map((s) => s.split(' ')[0]?.toLowerCase() ?? 'action')
    .join(':');

  const intelligenceJson = buildIntelligenceJson({
    sequenceStability: config.sequenceStability,
    stepCountStdDev: Math.max(0.5, config.variantCount * 0.8),
    variantCount: config.variantCount,
    standardPathFrequency: config.standardPathFrequency,
    automationROI: config.aiOpportunityScore * 1.2,
  });

  // Create ProcessDefinition
  const processDef = await prisma.processDefinition.create({
    data: {
      userId,
      canonicalName: config.title,
      description: config.description,
      pathSignature,
      runCount: config.sessionCount,
      variantCount: config.variantCount,
      avgDurationMs: config.durationMs,
      medianDurationMs: Math.round(config.durationMs * 0.95),
      stabilityScore: config.sequenceStability,
      confidenceScore: config.confidence,
      intelligenceJson,
      analyzedAt: new Date(baseTs + DAY_MS),
      systems: toolsJson,
      groupType: 'exact_group',
      confidenceBand: config.confidence >= 0.85 ? 'very_high' : config.confidence >= 0.7 ? 'high' : 'medium',
      createdAt: new Date(baseTs),
      updatedAt: new Date(baseTs + DAY_MS),
    },
  });

  // Create primary (definition) Workflow row
  const primaryWorkflow = await prisma.workflow.create({
    data: {
      userId,
      title: config.title,
      description: config.description,
      toolsUsed: toolsJson,
      durationMs: config.durationMs,
      stepCount: config.stepCount,
      confidence: config.confidence,
      status: 'active',
      processDefinitionId: processDef.id,
      lastViewedAt: new Date(baseTs + 2 * DAY_MS),
      createdAt: new Date(baseTs),
      updatedAt: new Date(baseTs + DAY_MS),
    },
  });

  // Create session run Workflow rows (sessionCount - 1 additional runs)
  for (let i = 1; i < config.sessionCount; i++) {
    const sessionOffset = i * Math.round(DAY_MS * 0.5);
    const durationVariance = config.durationMs * (0.85 + i * 0.05);
    await prisma.workflow.create({
      data: {
        userId,
        title: config.title,
        description: config.description,
        toolsUsed: toolsJson,
        durationMs: Math.round(durationVariance),
        stepCount: config.stepCount + (i % 2 === 0 ? 1 : 0),
        confidence: config.confidence * (0.9 + i * 0.02),
        status: 'active',
        processDefinitionId: processDef.id,
        createdAt: new Date(baseTs + sessionOffset),
        updatedAt: new Date(baseTs + sessionOffset + 3600_000),
      },
    });
  }

  // Create SOP WorkflowArtifact on primary workflow
  await prisma.workflowArtifact.create({
    data: {
      workflowId: primaryWorkflow.id,
      artifactType: 'sop',
      schemaVersion: '1.0',
      contentJson: buildSopContent({
        workflowTitle: config.title,
        steps: config.sopSteps,
        systems: config.toolsUsed,
      }),
      createdAt: new Date(baseTs + DAY_MS),
    },
  });

  // Build process map nodes and edges from sopSteps
  const mapNodes = config.sopSteps.map((step, i) => ({
    id: `node-${i + 1}`,
    label: step,
    type: i === 0 ? 'start' : i === config.sopSteps.length - 1 ? 'end' : 'task',
  }));
  const mapEdges = config.sopSteps.slice(0, -1).map((_, i) => ({
    from: `node-${i + 1}`,
    to: `node-${i + 2}`,
  }));

  // Create ProcessMap WorkflowArtifact on primary workflow
  await prisma.workflowArtifact.create({
    data: {
      workflowId: primaryWorkflow.id,
      artifactType: 'process_map',
      schemaVersion: '2.0',
      contentJson: buildProcessMapContent({
        workflowTitle: config.title,
        nodes: mapNodes,
        edges: mapEdges,
      }),
      createdAt: new Date(baseTs + DAY_MS),
    },
  });

  // Create ProcessGraph on primary workflow
  const processGraph = await prisma.processGraph.create({
    data: {
      workflowId: primaryWorkflow.id,
      graphVersion: 1,
      graphSchemaVersion: '2.0',
      runCount: config.sessionCount,
      computedAtMs: BigInt(baseTs + DAY_MS),
      isInferred: false,
      confidenceScore: config.confidence,
      createdAt: new Date(baseTs + DAY_MS),
      updatedAt: new Date(baseTs + DAY_MS),
    },
  });

  // Create ProcessNodes for the graph
  for (let i = 0; i < config.sopSteps.length; i++) {
    const step = config.sopSteps[i]!;
    await prisma.processNode.create({
      data: {
        id: `${processGraph.id}-node-${i + 1}`,
        processGraphId: processGraph.id,
        nodeType: i === 0 ? 'start' : i === config.sopSteps.length - 1 ? 'end' : 'task',
        rawLabel: step,
        normalizedLabel: step.toLowerCase(),
        applicationLabel: config.toolsUsed[i % config.toolsUsed.length] ?? null,
        confidenceScore: config.confidence,
        isInferred: false,
        observationCount: config.sessionCount,
      },
    });
  }

  // Create ProcessEdges
  for (let i = 0; i < config.sopSteps.length - 1; i++) {
    await prisma.processEdge.create({
      data: {
        id: `${processGraph.id}-edge-${i + 1}`,
        processGraphId: processGraph.id,
        fromNodeId: `${processGraph.id}-node-${i + 1}`,
        toNodeId: `${processGraph.id}-node-${i + 2}`,
        edgeType: 'sequential',
        runFrequency: config.sessionCount,
        runFrequencyPct: 1.0,
        confidenceScore: config.confidence,
        isInferred: false,
      },
    });
  }

  return { workflowId: primaryWorkflow.id, processDefinitionId: processDef.id };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    console.log('=== Ledgerium Demo Account Seed ===');
    console.log(`Email:     ${DEMO_EMAIL}`);
    console.log(`Workspace: ${DEMO_WORKSPACE_NAME}`);
    console.log('');

    // Step 1: Delete existing demo data
    console.log('Step 1/3: Deleting existing demo data…');
    await deleteDemoData(prisma, DEMO_EMAIL);
    console.log('          Done.');

    // Step 2: Create user and team
    console.log('Step 2/3: Creating demo user and workspace…');
    const { userId, teamId } = await createDemoUser(prisma, {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      workspaceName: DEMO_WORKSPACE_NAME,
    });
    console.log(`          User ID:  ${userId}`);
    console.log(`          Team ID:  ${teamId}`);

    // Step 3: Create workflows
    const configs = getDemoWorkflowConfigs();
    console.log(`Step 3/3: Creating ${configs.length} demo workflows…`);
    for (const config of configs) {
      const { workflowId, processDefinitionId } = await createDemoWorkflow(
        prisma,
        userId,
        config,
      );
      console.log(`          ✓ ${config.title}`);
      console.log(`            workflow=${workflowId.slice(0, 8)}… pd=${processDefinitionId.slice(0, 8)}…`);
    }

    console.log('');
    console.log('=== Seed complete ===');
    console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Only call main() when this file is executed directly (not imported by tests)
if (process.argv[1] && process.argv[1].endsWith('seed-demo-account.ts')) {
  main().catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
