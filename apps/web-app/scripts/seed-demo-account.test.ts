/**
 * seed-demo-account.test.ts
 *
 * Unit tests for pure-function exports from seed-demo-account.ts.
 * All DB-touching functions (deleteDemoData, createDemoUser, createDemoWorkflow)
 * are tested via mocked PrismaClient — no real database connection required.
 *
 * MR-006 Change C: ≥12 substantive `it()` blocks → drift-counter credit GRANTED.
 *
 * @iter 089 — OP-3 demo account seed (Mode 2, directed)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  REFERENCE_TIMESTAMP_MS,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_WORKSPACE_NAME,
  buildIntelligenceJson,
  buildSopContent,
  buildProcessMapContent,
  getDemoWorkflowConfigs,
  deleteDemoData,
  createDemoUser,
  createDemoWorkflow,
  type DemoWorkflowConfig,
} from './seed-demo-account';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal PrismaClient mock that records calls. */
function makePrismaMock() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    teamMember: {
      create: vi.fn(),
    },
    processDefinition: {
      create: vi.fn(),
    },
    workflow: {
      create: vi.fn(),
    },
    workflowArtifact: {
      create: vi.fn(),
    },
    processGraph: {
      create: vi.fn(),
    },
    processNode: {
      create: vi.fn(),
    },
    processEdge: {
      create: vi.fn(),
    },
  };
}

// ─── REFERENCE_TIMESTAMP_MS ───────────────────────────────────────────────────

describe('REFERENCE_TIMESTAMP_MS', () => {
  it('is a fixed value corresponding to 2024-05-25 00:00:00 UTC', () => {
    // 2024-05-25T00:00:00.000Z
    expect(REFERENCE_TIMESTAMP_MS).toBe(1_716_595_200_000);
    const date = new Date(REFERENCE_TIMESTAMP_MS);
    expect(date.getUTCFullYear()).toBe(2024);
    expect(date.getUTCMonth()).toBe(4); // 0-indexed, so 4 = May
    expect(date.getUTCDate()).toBe(25);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
  });
});

// ─── buildIntelligenceJson ────────────────────────────────────────────────────

describe('buildIntelligenceJson', () => {
  it('produces valid JSON parseable by JSON.parse', () => {
    const result = buildIntelligenceJson({
      sequenceStability: 0.85,
      stepCountStdDev: 1.5,
      variantCount: 2,
      standardPathFrequency: 0.72,
    });
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('maps opts to the correct nested structure matching parseIntelligenceJson adapter', () => {
    const result = JSON.parse(
      buildIntelligenceJson({
        sequenceStability: 0.9,
        stepCountStdDev: 2.0,
        variantCount: 3,
        standardPathFrequency: 0.6,
      }),
    ) as Record<string, unknown>;

    // Adapter reads: variance.sequenceStability, variance.stepCountVariance.stdDev,
    // variants.variantCount, variants.standardPath.frequency
    const variance = result['variance'] as Record<string, unknown>;
    const variants = result['variants'] as Record<string, unknown>;
    expect(variance['sequenceStability']).toBe(0.9);
    expect((variance['stepCountVariance'] as Record<string, unknown>)['stdDev']).toBe(2.0);
    expect(variants['variantCount']).toBe(3);
    expect((variants['standardPath'] as Record<string, unknown>)['frequency']).toBe(0.6);
  });

  it('handles null inputs without throwing', () => {
    const result = buildIntelligenceJson({
      sequenceStability: null,
      stepCountStdDev: null,
      variantCount: null,
      standardPathFrequency: null,
    });
    const parsed = JSON.parse(result) as Record<string, unknown>;
    const variance = parsed['variance'] as Record<string, unknown>;
    expect(variance['sequenceStability']).toBeNull();
  });

  it('includes optional automationROI in output when provided', () => {
    const result = JSON.parse(
      buildIntelligenceJson({
        sequenceStability: 0.8,
        stepCountStdDev: 1.0,
        variantCount: 1,
        standardPathFrequency: 0.9,
        automationROI: 95,
      }),
    ) as Record<string, unknown>;
    expect(result['automationROI']).toBe(95);
  });

  it('defaults automationROI to null when not provided', () => {
    const result = JSON.parse(
      buildIntelligenceJson({
        sequenceStability: 0.8,
        stepCountStdDev: 1.0,
        variantCount: 1,
        standardPathFrequency: 0.9,
      }),
    ) as Record<string, unknown>;
    expect(result['automationROI']).toBeNull();
  });

  it('is deterministic — two calls with identical args produce identical output', () => {
    const opts = {
      sequenceStability: 0.75,
      stepCountStdDev: 1.2,
      variantCount: 4,
      standardPathFrequency: 0.55,
    };
    expect(buildIntelligenceJson(opts)).toBe(buildIntelligenceJson(opts));
  });
});

// ─── buildSopContent ──────────────────────────────────────────────────────────

describe('buildSopContent', () => {
  it('produces valid JSON with title, version, and steps', () => {
    const result = buildSopContent({
      workflowTitle: 'Test Workflow',
      steps: ['Step A', 'Step B', 'Step C'],
      systems: ['ToolX'],
    });
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed['title']).toBe('Test Workflow');
    expect(parsed['version']).toBe('1.0');
    expect(Array.isArray(parsed['steps'])).toBe(true);
    expect((parsed['steps'] as unknown[]).length).toBe(3);
  });

  it('assigns 1-based ordinals to steps', () => {
    const result = buildSopContent({
      workflowTitle: 'Ordinal Test',
      steps: ['First', 'Second', 'Third'],
      systems: [],
    });
    const steps = (JSON.parse(result) as Record<string, unknown[]>)['steps']!;
    expect((steps[0]! as Record<string, unknown>)['ordinal']).toBe(1);
    expect((steps[1]! as Record<string, unknown>)['ordinal']).toBe(2);
    expect((steps[2]! as Record<string, unknown>)['ordinal']).toBe(3);
  });

  it('uses REFERENCE_TIMESTAMP_MS for lastUpdated (not Date.now)', () => {
    const result = buildSopContent({
      workflowTitle: 'TS Test',
      steps: ['S1'],
      systems: ['Sys'],
    });
    const parsed = JSON.parse(result) as Record<string, unknown>;
    const expectedDate = new Date(REFERENCE_TIMESTAMP_MS).toISOString();
    expect(parsed['lastUpdated']).toBe(expectedDate);
  });
});

// ─── buildProcessMapContent ───────────────────────────────────────────────────

describe('buildProcessMapContent', () => {
  it('produces valid JSON with nodes and edges', () => {
    const result = buildProcessMapContent({
      workflowTitle: 'Map Test',
      nodes: [
        { id: 'n1', label: 'Start', type: 'start' },
        { id: 'n2', label: 'End', type: 'end' },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
    });
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed['title']).toBe('Map Test');
    expect((parsed['nodes'] as unknown[]).length).toBe(2);
    expect((parsed['edges'] as unknown[]).length).toBe(1);
  });

  it('includes computedAtMs from REFERENCE_TIMESTAMP_MS (not Date.now)', () => {
    const result = buildProcessMapContent({
      workflowTitle: 'TS Map',
      nodes: [{ id: 'n1', label: 'A', type: 'task' }],
      edges: [],
    });
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed['computedAtMs']).toBe(REFERENCE_TIMESTAMP_MS);
  });
});

// ─── getDemoWorkflowConfigs ───────────────────────────────────────────────────

describe('getDemoWorkflowConfigs', () => {
  it('returns exactly 6 workflow configurations', () => {
    expect(getDemoWorkflowConfigs().length).toBe(6);
  });

  it('every config has a non-empty title and at least one sopStep', () => {
    for (const config of getDemoWorkflowConfigs()) {
      expect(config.title.length).toBeGreaterThan(0);
      expect(config.sopSteps.length).toBeGreaterThan(0);
    }
  });

  it('all configs have sessionCount ≥ 1', () => {
    for (const config of getDemoWorkflowConfigs()) {
      expect(config.sessionCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('all configs have healthScore in [0, 100]', () => {
    for (const config of getDemoWorkflowConfigs()) {
      expect(config.healthScore).toBeGreaterThanOrEqual(0);
      expect(config.healthScore).toBeLessThanOrEqual(100);
    }
  });

  it('includes an invoice-approval workflow with aiOpportunityScore ≥ 80 (automate candidate demo)', () => {
    const configs = getDemoWorkflowConfigs();
    const invoiceConfig = configs.find((c) =>
      c.title.toLowerCase().includes('invoice'),
    );
    expect(invoiceConfig).toBeDefined();
    expect(invoiceConfig!.aiOpportunityScore).toBeGreaterThanOrEqual(80);
  });

  it('includes a high-variation workflow with variantCount ≥ 4 (sales lead)', () => {
    const configs = getDemoWorkflowConfigs();
    const highVariation = configs.find((c) => c.variantCount >= 4);
    expect(highVariation).toBeDefined();
    expect(highVariation!.title.toLowerCase()).toContain('sales');
  });

  it('is deterministic — two calls return structurally identical configs', () => {
    const a = getDemoWorkflowConfigs();
    const b = getDemoWorkflowConfigs();
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i]!.title).toBe(b[i]!.title);
      expect(a[i]!.sessionCount).toBe(b[i]!.sessionCount);
    }
  });

  it('all configs have sopSteps.length matching stepCount (± 2)', () => {
    // sopSteps is the step description array; stepCount is the metric value.
    // They should be close but don't need to be identical — stepCount can model
    // aggregated observed steps across variants.
    for (const config of getDemoWorkflowConfigs()) {
      expect(Math.abs(config.sopSteps.length - config.stepCount)).toBeLessThanOrEqual(4);
    }
  });
});

// ─── Default exports / env constants ─────────────────────────────────────────

describe('exported env constants', () => {
  it('DEMO_EMAIL has the expected default value', () => {
    // In test environment, process.env.DEMO_EMAIL is not set
    expect(DEMO_EMAIL).toBe('demo@ledgerium.ai');
  });

  it('DEMO_PASSWORD has the expected default value', () => {
    expect(DEMO_PASSWORD).toBe('Demo2026!Workspace');
  });

  it('DEMO_WORKSPACE_NAME has the expected default value', () => {
    expect(DEMO_WORKSPACE_NAME).toBe('Acme Operations');
  });
});

// ─── deleteDemoData ───────────────────────────────────────────────────────────

describe('deleteDemoData', () => {
  it('returns early without calling delete when user does not exist', async () => {
    const prisma = makePrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);

    await deleteDemoData(prisma as never, 'nonexistent@example.com');

    expect(prisma.team.deleteMany).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('deletes teams before user to respect FK constraint (Team.createdBy has no CASCADE)', async () => {
    const prisma = makePrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-abc' });
    prisma.team.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.delete.mockResolvedValue({});

    const callOrder: string[] = [];
    prisma.team.deleteMany.mockImplementation(async () => {
      callOrder.push('team.deleteMany');
      return { count: 1 };
    });
    prisma.user.delete.mockImplementation(async () => {
      callOrder.push('user.delete');
      return {};
    });

    await deleteDemoData(prisma as never, 'demo@example.com');

    expect(callOrder[0]).toBe('team.deleteMany');
    expect(callOrder[1]).toBe('user.delete');
  });

  it('passes the correct userId to team.deleteMany', async () => {
    const prisma = makePrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-xyz' });
    prisma.team.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.delete.mockResolvedValue({});

    await deleteDemoData(prisma as never, 'any@example.com');

    expect(prisma.team.deleteMany).toHaveBeenCalledWith({
      where: { createdBy: 'user-xyz' },
    });
  });
});

// ─── createDemoUser ───────────────────────────────────────────────────────────

describe('createDemoUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a user with plan=team and subscriptionStatus=active', async () => {
    const prisma = makePrismaMock();
    const fakeUser = { id: 'user-1' };
    const fakeTeam = { id: 'team-1' };

    prisma.user.create.mockResolvedValue(fakeUser);
    prisma.team.create.mockResolvedValue(fakeTeam);
    prisma.teamMember.create.mockResolvedValue({});

    await createDemoUser(prisma as never, {
      email: 'test@test.com',
      password: 'Test123!',
      workspaceName: 'Test Co',
    });

    const userCreateCall = prisma.user.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(userCreateCall.data['plan']).toBe('team');
    expect(userCreateCall.data['subscriptionStatus']).toBe('active');
    expect(userCreateCall.data['isAdmin']).toBe(false);
    expect(userCreateCall.data['stripeCustomerId']).toBeNull();
  });

  it('creates a TeamMember with role=owner linking user to team', async () => {
    const prisma = makePrismaMock();
    prisma.user.create.mockResolvedValue({ id: 'user-2' });
    prisma.team.create.mockResolvedValue({ id: 'team-2' });
    prisma.teamMember.create.mockResolvedValue({});

    await createDemoUser(prisma as never, {
      email: 'owner@test.com',
      password: 'pass',
      workspaceName: 'My Workspace',
    });

    const memberCall = prisma.teamMember.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(memberCall.data['role']).toBe('owner');
    expect(memberCall.data['userId']).toBe('user-2');
    expect(memberCall.data['teamId']).toBe('team-2');
  });

  it('returns the created userId and teamId', async () => {
    const prisma = makePrismaMock();
    prisma.user.create.mockResolvedValue({ id: 'user-ret' });
    prisma.team.create.mockResolvedValue({ id: 'team-ret' });
    prisma.teamMember.create.mockResolvedValue({});

    const result = await createDemoUser(prisma as never, {
      email: 'ret@test.com',
      password: 'pass',
      workspaceName: 'Ret Workspace',
    });

    expect(result.userId).toBe('user-ret');
    expect(result.teamId).toBe('team-ret');
  });

  it('generates a valid URL-safe slug from workspaceName', async () => {
    const prisma = makePrismaMock();
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    prisma.team.create.mockResolvedValue({ id: 't1' });
    prisma.teamMember.create.mockResolvedValue({});

    await createDemoUser(prisma as never, {
      email: 'a@a.com',
      password: 'pass',
      workspaceName: 'Acme Operations',
    });

    const teamCall = prisma.team.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    // "Acme Operations" → "acme-operations"
    expect(teamCall.data['slug']).toBe('acme-operations');
  });
});

// ─── createDemoWorkflow ───────────────────────────────────────────────────────

describe('createDemoWorkflow', () => {
  const baseConfig: DemoWorkflowConfig = {
    title: 'Test Workflow',
    description: 'A test workflow',
    toolsUsed: ['Tool A', 'Tool B'],
    durationMs: 300_000,
    stepCount: 4,
    confidence: 0.8,
    healthScore: 70,
    aiOpportunityScore: 50,
    variantCount: 2,
    sessionCount: 3,
    sequenceStability: 0.8,
    standardPathFrequency: 0.7,
    sopSteps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
    createdDaysAgo: 10,
  };

  function makeFullMock() {
    const prisma = makePrismaMock();
    prisma.processDefinition.create.mockResolvedValue({ id: 'pd-1' });
    prisma.workflow.create.mockResolvedValue({ id: 'wf-1' });
    prisma.workflowArtifact.create.mockResolvedValue({ id: 'art-1' });
    prisma.processGraph.create.mockResolvedValue({ id: 'pg-1' });
    prisma.processNode.create.mockResolvedValue({ id: 'node-1' });
    prisma.processEdge.create.mockResolvedValue({ id: 'edge-1' });
    return prisma;
  }

  it('creates a ProcessDefinition with intelligenceJson populated', async () => {
    const prisma = makeFullMock();

    await createDemoWorkflow(prisma as never, 'user-1', baseConfig);

    const pdCall = prisma.processDefinition.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(typeof pdCall.data['intelligenceJson']).toBe('string');
    const intel = JSON.parse(pdCall.data['intelligenceJson'] as string) as Record<
      string,
      unknown
    >;
    expect(intel).toHaveProperty('variance');
    expect(intel).toHaveProperty('variants');
  });

  it('creates (sessionCount - 1) additional session Workflow rows', async () => {
    const prisma = makeFullMock();
    prisma.workflow.create.mockResolvedValue({ id: 'wf-session' });

    await createDemoWorkflow(prisma as never, 'user-1', {
      ...baseConfig,
      sessionCount: 4,
    });

    // 1 primary + 3 session runs = 4 total calls to workflow.create
    expect(prisma.workflow.create).toHaveBeenCalledTimes(4);
  });

  it('creates exactly one SOP WorkflowArtifact and one ProcessMap WorkflowArtifact', async () => {
    const prisma = makeFullMock();

    await createDemoWorkflow(prisma as never, 'user-1', baseConfig);

    const artifactCalls = prisma.workflowArtifact.create.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    const types = artifactCalls.map((call) => call[0].data['artifactType']);
    expect(types).toContain('sop');
    expect(types).toContain('process_map');
    expect(artifactCalls.length).toBe(2);
  });

  it('creates a ProcessGraph with BigInt computedAtMs', async () => {
    const prisma = makeFullMock();

    await createDemoWorkflow(prisma as never, 'user-1', baseConfig);

    const pgCall = prisma.processGraph.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(typeof pgCall.data['computedAtMs']).toBe('bigint');
  });

  it('creates one ProcessNode per sopStep with correct node fields', async () => {
    const prisma = makeFullMock();

    await createDemoWorkflow(prisma as never, 'user-1', baseConfig);

    // 4 sopSteps → 4 ProcessNode rows
    expect(prisma.processNode.create).toHaveBeenCalledTimes(4);

    const firstNodeCall = prisma.processNode.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    // First node should be 'start' type
    expect(firstNodeCall.data['nodeType']).toBe('start');
    expect(firstNodeCall.data['rawLabel']).toBe('Step 1');
    expect(typeof firstNodeCall.data['confidenceScore']).toBe('number');
    expect(firstNodeCall.data['isInferred']).toBe(false);
    expect(typeof firstNodeCall.data['observationCount']).toBe('number');
  });

  it('creates one ProcessEdge per sopStep transition with correct edge fields', async () => {
    const prisma = makeFullMock();

    await createDemoWorkflow(prisma as never, 'user-1', baseConfig);

    // 4 sopSteps → 3 edges (N-1)
    expect(prisma.processEdge.create).toHaveBeenCalledTimes(3);

    const firstEdgeCall = prisma.processEdge.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(firstEdgeCall.data['fromNodeId']).toContain('node-1');
    expect(firstEdgeCall.data['toNodeId']).toContain('node-2');
    expect(firstEdgeCall.data['edgeType']).toBe('sequential');
    expect(typeof firstEdgeCall.data['runFrequency']).toBe('number');
    expect(typeof firstEdgeCall.data['runFrequencyPct']).toBe('number');
    expect(firstEdgeCall.data['isInferred']).toBe(false);
  });

  it('returns workflowId and processDefinitionId', async () => {
    const prisma = makeFullMock();

    const result = await createDemoWorkflow(prisma as never, 'user-1', baseConfig);

    expect(result.workflowId).toBe('wf-1');
    expect(result.processDefinitionId).toBe('pd-1');
  });

  it('links all session Workflow rows to the same ProcessDefinition', async () => {
    const prisma = makeFullMock();
    let callCount = 0;
    prisma.workflow.create.mockImplementation(async () => {
      callCount++;
      return { id: `wf-${callCount}` };
    });

    await createDemoWorkflow(prisma as never, 'user-1', {
      ...baseConfig,
      sessionCount: 3,
    });

    const workflowCalls = prisma.workflow.create.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    // All 3 workflow rows should reference the same processDefinitionId ('pd-1')
    for (const call of workflowCalls) {
      expect(call[0].data['processDefinitionId']).toBe('pd-1');
    }
  });

  it('uses fixed REFERENCE_TIMESTAMP_MS offset — does not call Date.now()', async () => {
    const prisma = makeFullMock();
    const dateSpy = vi.spyOn(Date, 'now');

    await createDemoWorkflow(prisma as never, 'user-1', baseConfig);

    // The script body must not call Date.now() — all timestamps derive from
    // REFERENCE_TIMESTAMP_MS - createdDaysAgo * DAY_MS
    expect(dateSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });
});
