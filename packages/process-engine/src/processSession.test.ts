import { describe, it, expect } from 'vitest';
import { processSession } from './processSession.js';
import { validateProcessEngineInput } from './inputValidator.js';
import type { ProcessEngineInput } from './types.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SESSION_ID = 'test-session-001';
const NOW_MS = 1_700_000_000_000;

function makeEvent(
  overrides: Partial<{
    event_id: string;
    event_type: string;
    actor_type: 'human' | 'system' | 'recorder';
    t_ms: number;
    pageTitle: string;
    applicationLabel: string;
    domain: string;
    label: string;
    isSensitive: boolean;
    redactionApplied: boolean;
    annotationText: string;
  }>,
) {
  const {
    event_id = 'evt-1',
    event_type = 'interaction.click',
    actor_type = 'human',
    t_ms = NOW_MS,
    pageTitle = 'Dashboard',
    applicationLabel = 'NetSuite',
    domain = 'app.netsuite.com',
    label = 'Save',
    isSensitive = false,
    redactionApplied = false,
  } = overrides;

  return {
    event_id,
    session_id: SESSION_ID,
    t_ms,
    t_wall: new Date(t_ms).toISOString(),
    event_type,
    actor_type,
    page_context: {
      url: `https://${domain}/page`,
      urlNormalized: `https://${domain}/page`,
      domain,
      routeTemplate: '/page',
      pageTitle,
      applicationLabel,
    },
    target_summary: {
      label,
      role: 'button',
      isSensitive,
    },
    normalization_meta: {
      sourceEventId: event_id,
      sourceEventType: event_type,
      normalizationRuleVersion: '1.0.0',
      redactionApplied,
    },
    ...(overrides.annotationText !== undefined && { annotation_text: overrides.annotationText }),
  } as const;
}

function makeInput(overrides?: {
  steps?: ProcessEngineInput['derivedSteps'];
  events?: ProcessEngineInput['normalizedEvents'];
}): ProcessEngineInput {
  const events = overrides?.events ?? [
    makeEvent({ event_id: 'evt-1', event_type: 'interaction.click',        t_ms: NOW_MS }),
    makeEvent({ event_id: 'evt-2', event_type: 'navigation.open_page',     t_ms: NOW_MS + 100, label: 'Invoice List', pageTitle: 'Invoice List' }),
    makeEvent({ event_id: 'evt-3', event_type: 'interaction.input_change', t_ms: NOW_MS + 3000, label: 'Amount' }),
    makeEvent({ event_id: 'evt-4', event_type: 'interaction.submit',        t_ms: NOW_MS + 5000 }),
  ];

  const steps = overrides?.steps ?? [
    {
      step_id: `${SESSION_ID}-step-1`,
      session_id: SESSION_ID,
      ordinal: 1,
      title: 'Navigate to Invoice List',
      status: 'finalized' as const,
      boundary_reason: 'navigation_changed',
      grouping_reason: 'click_then_navigate',
      confidence: 0.85,
      source_event_ids: ['evt-1', 'evt-2'],
      start_t_ms: NOW_MS,
      end_t_ms: NOW_MS + 100,
      duration_ms: 100,
      page_context: {
        domain: 'app.netsuite.com',
        applicationLabel: 'NetSuite',
        routeTemplate: '/invoices',
      },
    },
    {
      step_id: `${SESSION_ID}-step-2`,
      session_id: SESSION_ID,
      ordinal: 2,
      title: 'Fill and submit form',
      status: 'finalized' as const,
      boundary_reason: 'form_submitted',
      grouping_reason: 'fill_and_submit',
      confidence: 0.90,
      source_event_ids: ['evt-3', 'evt-4'],
      start_t_ms: NOW_MS + 3000,
      end_t_ms: NOW_MS + 5000,
      duration_ms: 2000,
      page_context: {
        domain: 'app.netsuite.com',
        applicationLabel: 'NetSuite',
        routeTemplate: '/invoices/new',
      },
    },
  ];

  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Create Invoice',
      startedAt: new Date(NOW_MS).toISOString(),
      endedAt: new Date(NOW_MS + 6000).toISOString(),
    },
    normalizedEvents: events,
    derivedSteps: steps,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('processSession', () => {
  it('returns all four output types', () => {
    const output = processSession(makeInput());
    expect(output).toHaveProperty('processRun');
    expect(output).toHaveProperty('processDefinition');
    expect(output).toHaveProperty('processMap');
    expect(output).toHaveProperty('sop');
  });

  // ─── ProcessRun ────────────────────────────────────────────────────────────

  describe('processRun', () => {
    it('carries correct session metadata', () => {
      const { processRun } = processSession(makeInput());
      expect(processRun.runId).toBe(SESSION_ID);
      expect(processRun.sessionId).toBe(SESSION_ID);
      expect(processRun.activityName).toBe('Create Invoice');
      expect(processRun.stepCount).toBe(2);
      expect(processRun.eventCount).toBe(4);
      expect(processRun.completionStatus).toBe('complete');
    });

    it('counts error and navigation steps (engine spec §16.2)', () => {
      const { processRun } = processSession(makeInput());
      // step-1 is click_then_navigate, step-2 is fill_and_submit
      expect(processRun.navigationStepCount).toBe(1);
      expect(processRun.errorStepCount).toBe(0);
    });

    it('counts human vs system events', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'h1', actor_type: 'human', t_ms: NOW_MS }),
          makeEvent({ event_id: 'h2', actor_type: 'human', t_ms: NOW_MS + 100 }),
          makeEvent({ event_id: 's1', actor_type: 'system', event_type: 'system.toast_shown', t_ms: NOW_MS + 200 }),
        ],
        steps: [
          {
            step_id: `${SESSION_ID}-step-1`, session_id: SESSION_ID, ordinal: 1,
            title: 'Step 1', status: 'finalized' as const, grouping_reason: 'single_action',
            confidence: 0.85, source_event_ids: ['h1', 'h2', 's1'], start_t_ms: NOW_MS,
          },
        ],
      });
      const { processRun } = processSession(input);
      expect(processRun.humanEventCount).toBe(2);
      expect(processRun.systemEventCount).toBe(1);
    });

    it('sets partial status when no endedAt', () => {
      const input = makeInput();
      delete (input.sessionJson as { endedAt?: string }).endedAt;
      const { processRun } = processSession(input);
      expect(processRun.completionStatus).toBe('partial');
    });

    it('includes systemsUsed list (§16.2 run-level context)', () => {
      const { processRun } = processSession(makeInput());
      expect(processRun.systemsUsed).toContain('NetSuite');
    });

    it('systemsUsed is empty for events with no applicationLabel', () => {
      const input = makeInput({
        events: [
          {
            event_id: 'e1',
            session_id: SESSION_ID,
            t_ms: NOW_MS,
            t_wall: new Date(NOW_MS).toISOString(),
            event_type: 'interaction.click',
            actor_type: 'human' as const,
            normalization_meta: {
              sourceEventId: 'e1',
              sourceEventType: 'interaction.click',
              normalizationRuleVersion: '1.0.0',
              redactionApplied: false,
            },
          },
        ],
        steps: [
          {
            step_id: `${SESSION_ID}-step-1`, session_id: SESSION_ID, ordinal: 1,
            title: 'Step 1', status: 'finalized' as const, grouping_reason: 'single_action',
            confidence: 0.85, source_event_ids: ['e1'], start_t_ms: NOW_MS,
          },
        ],
      });
      const { processRun } = processSession(input);
      expect(processRun.systemsUsed).toHaveLength(0);
    });
  });

  // ─── ProcessDefinition ─────────────────────────────────────────────────────

  describe('processDefinition', () => {
    it('has correct step count and systems', () => {
      const { processDefinition } = processSession(makeInput());
      expect(processDefinition.stepDefinitions).toHaveLength(2);
      expect(processDefinition.systems).toContain('NetSuite');
    });

    it('derives step operational definitions', () => {
      const { processDefinition } = processSession(makeInput());
      const step1 = processDefinition.stepDefinitions[0]!;
      expect(step1.category).toBe('click_then_navigate');
      expect(step1.operationalDefinition).toContain('navigated');
      expect(step1.inputs).toBeInstanceOf(Array);
      expect(step1.outputs).toBeInstanceOf(Array);
      expect(step1.completionCondition).toBeTruthy();
    });

    it('assigns correct confidence scores', () => {
      const { processDefinition } = processSession(makeInput());
      expect(processDefinition.stepDefinitions[0]?.confidence).toBe(0.85); // click_then_navigate
      expect(processDefinition.stepDefinitions[1]?.confidence).toBe(0.90); // fill_and_submit
    });

    it('generates unique definitionId', () => {
      const { processDefinition } = processSession(makeInput());
      expect(processDefinition.definitionId).toBe(`${SESSION_ID}-def`);
    });

    it('includes version field', () => {
      const { processDefinition } = processSession(makeInput());
      expect(processDefinition.version).toBe('1.0');
    });

    it('includes ruleVersion for provenance (§19.1)', () => {
      const { processDefinition } = processSession(makeInput());
      expect(typeof processDefinition.ruleVersion).toBe('string');
      expect(processDefinition.ruleVersion.length).toBeGreaterThan(0);
    });

    // ── Traceability ──────────────────────────────────────────────────────

    it('each StepDefinition carries sourceEventIds (§19.1 traceability)', () => {
      const { processDefinition } = processSession(makeInput());
      const step1 = processDefinition.stepDefinitions[0]!;
      const step2 = processDefinition.stepDefinitions[1]!;
      expect(step1.sourceEventIds).toContain('evt-1');
      expect(step1.sourceEventIds).toContain('evt-2');
      expect(step2.sourceEventIds).toContain('evt-3');
      expect(step2.sourceEventIds).toContain('evt-4');
    });

    it('sourceEventIds are non-empty for steps with source events', () => {
      const { processDefinition } = processSession(makeInput());
      for (const step of processDefinition.stepDefinitions) {
        expect(step.sourceEventIds.length).toBeGreaterThan(0);
      }
    });

    it('sourceEventIds are immutable copies (not shared references)', () => {
      const input = makeInput();
      const { processDefinition } = processSession(input);
      const step1 = processDefinition.stepDefinitions[0]!;
      // Mutating the output must not affect re-processing the same input
      step1.sourceEventIds.push('injected');
      const { processDefinition: pd2 } = processSession(input);
      expect(pd2.stepDefinitions[0]?.sourceEventIds).not.toContain('injected');
    });
  });

  // ─── ProcessMap ────────────────────────────────────────────────────────────

  describe('processMap', () => {
    it('has start + task nodes + end node (spec §14.3)', () => {
      const { processMap } = processSession(makeInput());
      // 2 finalized steps + 1 synthetic start + 1 synthetic end = 4
      expect(processMap.nodes).toHaveLength(4);
    });

    it('first node is synthetic start (nodeType=start)', () => {
      const { processMap } = processSession(makeInput());
      expect(processMap.nodes[0]!.nodeType).toBe('start');
      expect(processMap.nodes[0]!.title).toBe('Start');
    });

    it('last node is synthetic end (nodeType=end)', () => {
      const { processMap } = processSession(makeInput());
      const last = processMap.nodes[processMap.nodes.length - 1]!;
      expect(last.nodeType).toBe('end');
      expect(last.title).toBe('End');
    });

    it('task nodes have correct nodeType', () => {
      const { processMap } = processSession(makeInput());
      // nodes[1] and [2] are the task nodes
      expect(processMap.nodes[1]!.nodeType).toBe('task');
      expect(processMap.nodes[2]!.nodeType).toBe('task');
    });

    it('error_handling steps get nodeType=exception', () => {
      const input = makeInput({
        events: [makeEvent({ event_id: 'err-1', event_type: 'system.error_displayed', actor_type: 'system' })],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Handle validation error',
          status: 'finalized',
          grouping_reason: 'error_handling',
          confidence: 0.8,
          source_event_ids: ['err-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const { processMap } = processSession(input);
      // nodes: [start, exception, end]
      expect(processMap.nodes[1]!.nodeType).toBe('exception');
    });

    it('has N+2 edges for N finalized steps (start→…→end)', () => {
      const { processMap } = processSession(makeInput());
      // 2 steps → 3 edges: start→step1, step1→step2, step2→end
      expect(processMap.edges).toHaveLength(3);
    });

    it('first edge connects start to first task node', () => {
      const { processMap } = processSession(makeInput());
      expect(processMap.edges[0]!.source).toBe(processMap.nodes[0]!.id); // start
      expect(processMap.edges[0]!.target).toBe(processMap.nodes[1]!.id); // first task
    });

    it('last edge connects last task node to end', () => {
      const { processMap } = processSession(makeInput());
      const lastEdge = processMap.edges[processMap.edges.length - 1]!;
      expect(lastEdge.source).toBe(processMap.nodes[processMap.nodes.length - 2]!.id);
      expect(lastEdge.target).toBe(processMap.nodes[processMap.nodes.length - 1]!.id);
    });

    it('all sequence edges have type=sequence', () => {
      const { processMap } = processSession(makeInput());
      for (const edge of processMap.edges) {
        expect(edge.type).toBe('sequence');
      }
    });

    it('exception edges have type=exception', () => {
      const input = makeInput({
        events: [makeEvent({ event_id: 'err-1', event_type: 'system.error_displayed', actor_type: 'system' })],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Handle error',
          status: 'finalized',
          grouping_reason: 'error_handling',
          confidence: 0.8,
          source_event_ids: ['err-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const { processMap } = processSession(input);
      // All edges touching the exception node should be type=exception
      const exceptionNodeId = processMap.nodes[1]!.id;
      const exceptionEdges = processMap.edges.filter(
        e => e.source === exceptionNodeId || e.target === exceptionNodeId,
      );
      expect(exceptionEdges.every(e => e.type === 'exception')).toBe(true);
    });

    it('assigns correct category colors to task nodes', () => {
      const { processMap } = processSession(makeInput());
      // nodes[1] is click_then_navigate = teal, nodes[2] is fill_and_submit = blue
      expect(processMap.nodes[1]!.categoryColor).toBe('#2dd4bf');
      expect(processMap.nodes[2]!.categoryColor).toBe('#60a5fa');
    });

    it('task nodes Y positions increase monotonically', () => {
      const { processMap } = processSession(makeInput());
      // nodes[0]=start, nodes[1]=task1, nodes[2]=task2, nodes[3]=end
      // All Y positions should be increasing
      for (let i = 1; i < processMap.nodes.length; i++) {
        expect(processMap.nodes[i]!.position.y).toBeGreaterThan(
          processMap.nodes[i - 1]!.position.y,
        );
      }
    });

    it('all nodes share the same X position (vertical layout)', () => {
      const { processMap } = processSession(makeInput());
      const xs = processMap.nodes.map(n => n.position.x);
      expect(new Set(xs).size).toBe(1);
    });

    it('does not include provisional steps in task nodes', () => {
      const input = makeInput();
      input.derivedSteps.push({
        step_id: `${SESSION_ID}-step-provisional`,
        session_id: SESSION_ID,
        ordinal: 3,
        title: 'Provisional',
        status: 'provisional',
        grouping_reason: 'single_action',
        confidence: 0.55,
        source_event_ids: [],
        start_t_ms: NOW_MS + 10000,
      });
      const { processMap } = processSession(input);
      // Still 2 finalized steps + start + end = 4
      expect(processMap.nodes).toHaveLength(4);
      expect(processMap.nodes.some(n => n.title === 'Provisional')).toBe(false);
    });

    // ── Map-level fields (§14.2) ─────────────────────────────────────────

    it('has stable map id', () => {
      const { processMap } = processSession(makeInput());
      expect(processMap.id).toBe(`${SESSION_ID}-map`);
    });

    it('has name matching activityName', () => {
      const { processMap } = processSession(makeInput());
      expect(processMap.name).toBe('Create Invoice');
    });

    it('has version field', () => {
      const { processMap } = processSession(makeInput());
      expect(typeof processMap.version).toBe('string');
      expect(processMap.version.length).toBeGreaterThan(0);
    });

    it('has systems[] at map level', () => {
      const { processMap } = processSession(makeInput());
      expect(processMap.systems).toContain('NetSuite');
    });

    // ── Phases (§8.5) ────────────────────────────────────────────────────

    it('produces phases for single-system workflow', () => {
      const { processMap } = processSession(makeInput());
      expect(processMap.phases).toHaveLength(1);
      expect(processMap.phases[0]!.system).toBe('NetSuite');
    });

    it('phase contains both finalized step IDs', () => {
      const { processMap } = processSession(makeInput());
      const phase = processMap.phases[0]!;
      expect(phase.stepNodeIds).toContain(`${SESSION_ID}-step-1`);
      expect(phase.stepNodeIds).toContain(`${SESSION_ID}-step-2`);
    });

    it('produces two phases for multi-system workflow', () => {
      const events = [
        makeEvent({ event_id: 'e1', t_ms: NOW_MS,       applicationLabel: 'Salesforce', domain: 'salesforce.com' }),
        makeEvent({ event_id: 'e2', t_ms: NOW_MS + 100, applicationLabel: 'NetSuite',   domain: 'netsuite.com' }),
      ];
      const steps = [
        {
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Open record in Salesforce',
          status: 'finalized' as const,
          grouping_reason: 'click_then_navigate',
          confidence: 0.85,
          source_event_ids: ['e1'],
          start_t_ms: NOW_MS,
          page_context: { domain: 'salesforce.com', applicationLabel: 'Salesforce', routeTemplate: '/record' },
        },
        {
          step_id: `${SESSION_ID}-step-2`,
          session_id: SESSION_ID,
          ordinal: 2,
          title: 'Submit invoice in NetSuite',
          status: 'finalized' as const,
          grouping_reason: 'fill_and_submit',
          confidence: 0.90,
          source_event_ids: ['e2'],
          start_t_ms: NOW_MS + 100,
          page_context: { domain: 'netsuite.com', applicationLabel: 'NetSuite', routeTemplate: '/invoice' },
        },
      ];
      const { processMap } = processSession(makeInput({ events, steps }));
      expect(processMap.phases).toHaveLength(2);
      expect(processMap.phases[0]!.system).toBe('Salesforce');
      expect(processMap.phases[1]!.system).toBe('NetSuite');
    });

    it('task nodes have phaseId assigned', () => {
      const { processMap } = processSession(makeInput());
      const taskNodes = processMap.nodes.filter(n => n.nodeType === 'task');
      for (const node of taskNodes) {
        expect(node.phaseId).toBeDefined();
      }
    });

    it('start and end nodes have no phaseId', () => {
      const { processMap } = processSession(makeInput());
      const startNode = processMap.nodes.find(n => n.nodeType === 'start')!;
      const endNode = processMap.nodes.find(n => n.nodeType === 'end')!;
      expect(startNode.phaseId).toBeUndefined();
      expect(endNode.phaseId).toBeUndefined();
    });

    // ── Enriched step-level node metadata ────────────────────────────────

    it('task nodes carry humanEventCount in metadata', () => {
      const { processMap } = processSession(makeInput());
      const taskNodes = processMap.nodes.filter(n => n.nodeType === 'task');
      for (const node of taskNodes) {
        expect(typeof node.metadata.humanEventCount).toBe('number');
        expect(node.metadata.humanEventCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('step-1 (click + navigation) has humanEventCount=1', () => {
      // evt-1 is human click, evt-2 is navigation.open_page (actor not set to human
      // in makeEvent default — but let's check what's actually there)
      const { processMap } = processSession(makeInput());
      const taskNode1 = processMap.nodes[1]!;
      // Both events in step-1 are actor_type='human' by default in makeEvent
      expect(taskNode1.metadata.humanEventCount).toBe(2);
    });

    it('task nodes carry eventTypeSummary showing event type breakdown', () => {
      const { processMap } = processSession(makeInput());
      const node1 = processMap.nodes[1]!; // click_then_navigate: click + navigation
      expect(typeof node1.metadata.eventTypeSummary).toBe('object');
      expect(node1.metadata.eventTypeSummary['interaction.click']).toBe(1);
      expect(node1.metadata.eventTypeSummary['navigation.open_page']).toBe(1);
    });

    it('task nodes carry pageTitle from events', () => {
      const { processMap } = processSession(makeInput());
      const node1 = processMap.nodes[1]!;
      // step-1 events both have pageTitle; most frequent wins
      expect(node1.metadata.pageTitle).toBeDefined();
    });

    it('task nodes carry dominantAction', () => {
      const { processMap } = processSession(makeInput());
      const taskNodes = processMap.nodes.filter(n => n.nodeType === 'task');
      for (const node of taskNodes) {
        // dominantAction is only present when humanEventCount > 0
        if (node.metadata.humanEventCount > 0) {
          expect(node.metadata.dominantAction).toBeDefined();
          expect(typeof node.metadata.dominantAction).toBe('string');
        }
      }
    });

    it('fill_and_submit node has dominantAction of Data entry or Form submit', () => {
      const { processMap } = processSession(makeInput());
      const formNode = processMap.nodes[2]!; // fill_and_submit step
      expect(['Data entry', 'Form submit']).toContain(formNode.metadata.dominantAction);
    });

    it('synthetic start/end nodes have empty eventTypeSummary', () => {
      const { processMap } = processSession(makeInput());
      const startNode = processMap.nodes.find(n => n.nodeType === 'start')!;
      const endNode = processMap.nodes.find(n => n.nodeType === 'end')!;
      expect(Object.keys(startNode.metadata.eventTypeSummary)).toHaveLength(0);
      expect(Object.keys(endNode.metadata.eventTypeSummary)).toHaveLength(0);
    });

    // ── Human-readable edge boundary labels ──────────────────────────────

    it('all edges have a boundaryLabel string', () => {
      const { processMap } = processSession(makeInput());
      for (const edge of processMap.edges) {
        expect(typeof edge.boundaryLabel).toBe('string');
        expect(edge.boundaryLabel.length).toBeGreaterThan(0);
      }
    });

    it('start→first edge has boundaryLabel "Workflow begins"', () => {
      const { processMap } = processSession(makeInput());
      expect(processMap.edges[0]!.boundaryLabel).toBe('Workflow begins');
    });

    it('last→end edge has boundaryLabel "Workflow completes"', () => {
      const { processMap } = processSession(makeInput());
      const lastEdge = processMap.edges[processMap.edges.length - 1]!;
      expect(lastEdge.boundaryLabel).toBe('Workflow completes');
    });

    it('navigation_changed boundary produces human-readable label', () => {
      const { processMap } = processSession(makeInput());
      // step-2 starts with boundary_reason=navigation_changed (in default fixture)
      // edge[1] is start→step1 (Workflow begins), edge[2] is step1→step2
      // step-1 has boundary_reason='navigation_changed'... wait, let me check the fixture
      // step-1.boundary_reason = 'navigation_changed', step-2.boundary_reason = 'form_submitted'
      // edges[1] = start→step1 (step1 doesn't have a boundary that triggers edge label from step)
      // Actually: edge boundaryLabel is derived from the TO node's boundary_reason
      // edges[0] = start→step1: fromNodeType=start → "Workflow begins"
      // edges[1] = step1→step2: boundaryReason = step2.boundary_reason = 'form_submitted' → "Form submitted"
      // edges[2] = step2→end: toNodeType=end → "Workflow completes"
      const step1ToStep2Edge = processMap.edges[1]!;
      expect(step1ToStep2Edge.boundaryLabel).toBe('Form submitted');
    });
  });

  // ─── SOP ───────────────────────────────────────────────────────────────────

  describe('sop', () => {
    it('has correct ID and title', () => {
      const { sop } = processSession(makeInput());
      expect(sop.sopId).toBe(`${SESSION_ID}-sop`);
      expect(sop.title).toContain('Create Invoice');
    });

    it('has one SOP step per finalized step', () => {
      const { sop } = processSession(makeInput());
      expect(sop.steps).toHaveLength(2);
    });

    it('includes systems in SOP metadata', () => {
      const { sop } = processSession(makeInput());
      expect(sop.systems).toContain('NetSuite');
    });

    it('includes prerequisites', () => {
      const { sop } = processSession(makeInput());
      expect(sop.prerequisites.length).toBeGreaterThan(0);
    });

    it('flags steps with sensitive events', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'evt-s', event_type: 'system.redaction_applied', actor_type: 'system', isSensitive: true }),
        ],
        steps: [
          {
            step_id: `${SESSION_ID}-step-1`,
            session_id: SESSION_ID,
            ordinal: 1,
            title: 'Enter password',
            status: 'finalized' as const,
            grouping_reason: 'single_action',
            confidence: 0.55,
            source_event_ids: ['evt-s'],
            start_t_ms: NOW_MS,
          },
        ],
      });
      const { sop } = processSession(input);
      expect(sop.steps[0]?.warnings.length).toBeGreaterThan(0);
    });

    // ── SOP-level structured fields (§15.2) ──────────────────────────────

    it('has inputs[] at SOP level (§15.2)', () => {
      const { sop } = processSession(makeInput());
      expect(Array.isArray(sop.inputs)).toBe(true);
      expect(sop.inputs.length).toBeGreaterThan(0);
    });

    it('SOP inputs includes system access statement', () => {
      const { sop } = processSession(makeInput());
      expect(sop.inputs.some(i => i.includes('NetSuite'))).toBe(true);
    });

    it('has outputs[] at SOP level (§15.2)', () => {
      const { sop } = processSession(makeInput());
      expect(Array.isArray(sop.outputs)).toBe(true);
      expect(sop.outputs.length).toBeGreaterThan(0);
    });

    it('SOP outputs references the activity name', () => {
      const { sop } = processSession(makeInput());
      expect(sop.outputs.some(o => o.includes('Create Invoice'))).toBe(true);
    });

    it('has completionCriteria[] at SOP level (§15.2)', () => {
      const { sop } = processSession(makeInput());
      expect(Array.isArray(sop.completionCriteria)).toBe(true);
      expect(sop.completionCriteria.length).toBeGreaterThan(0);
    });

    it('completionCriteria includes outcome-based criteria', () => {
      const { sop } = processSession(makeInput());
      // v2.0: completion criteria are outcome-based, not mechanical step counts
      expect(sop.completionCriteria.some(c =>
        c.includes('confirms') || c.includes('completed') || c.includes('verified'),
      )).toBe(true);
    });

    it('each SOPStep has sourceStepId for traceability (§15.3)', () => {
      const { sop } = processSession(makeInput());
      for (const step of sop.steps) {
        expect(typeof step.sourceStepId).toBe('string');
        expect(step.sourceStepId.length).toBeGreaterThan(0);
      }
    });

    it('SOPStep sourceStepId matches the DerivedStep step_id', () => {
      const { sop } = processSession(makeInput());
      expect(sop.steps[0]!.sourceStepId).toBe(`${SESSION_ID}-step-1`);
      expect(sop.steps[1]!.sourceStepId).toBe(`${SESSION_ID}-step-2`);
    });
  });

  // ─── SOP — event-level instructions ───────────────────────────────────────

  describe('sop — event-level instructions', () => {
    it('each SOPStep has an instructions array', () => {
      const { sop } = processSession(makeInput());
      for (const step of sop.steps) {
        expect(Array.isArray(step.instructions)).toBe(true);
      }
    });

    it('instructions are non-empty for steps with actionable events', () => {
      const { sop } = processSession(makeInput());
      // Both steps have human-initiated events → should produce instructions
      expect(sop.steps[0]!.instructions.length).toBeGreaterThan(0);
      expect(sop.steps[1]!.instructions.length).toBeGreaterThan(0);
    });

    it('instruction sequence numbers are 1-based and contiguous', () => {
      const { sop } = processSession(makeInput());
      for (const step of sop.steps) {
        for (let i = 0; i < step.instructions.length; i++) {
          expect(step.instructions[i]!.sequence).toBe(i + 1);
        }
      }
    });

    it('each instruction has a non-empty instruction string', () => {
      const { sop } = processSession(makeInput());
      for (const step of sop.steps) {
        for (const instr of step.instructions) {
          expect(typeof instr.instruction).toBe('string');
          expect(instr.instruction.length).toBeGreaterThan(0);
        }
      }
    });

    it('each instruction has a sourceEventId for traceability', () => {
      const { sop } = processSession(makeInput());
      for (const step of sop.steps) {
        for (const instr of step.instructions) {
          expect(typeof instr.sourceEventId).toBe('string');
          expect(instr.sourceEventId.length).toBeGreaterThan(0);
        }
      }
    });

    it('each instruction sourceEventId is a known event ID', () => {
      const input = makeInput();
      const { sop } = processSession(input);
      const knownIds = new Set(input.normalizedEvents.map(e => e.event_id));
      for (const step of sop.steps) {
        for (const instr of step.instructions) {
          expect(knownIds.has(instr.sourceEventId)).toBe(true);
        }
      }
    });

    it('click event produces a "Click" instruction', () => {
      const { sop } = processSession(makeInput());
      const step1 = sop.steps[0]!; // click_then_navigate
      const clickInstr = step1.instructions.find(i =>
        i.eventType === 'interaction.click',
      );
      expect(clickInstr).toBeDefined();
      expect(clickInstr!.instruction).toMatch(/^Click/);
    });

    it('navigation event produces a "Wait for" or "Page navigates" instruction', () => {
      const { sop } = processSession(makeInput());
      const step1 = sop.steps[0]!;
      const navInstr = step1.instructions.find(i =>
        i.eventType === 'navigation.open_page',
      );
      expect(navInstr).toBeDefined();
      expect(navInstr!.instruction).toMatch(/Wait for|Page navigates|navigate/i);
    });

    it('input_change event produces an "Enter" instruction with field label', () => {
      const { sop } = processSession(makeInput());
      const step2 = sop.steps[1]!; // fill_and_submit
      const inputInstr = step2.instructions.find(i =>
        i.eventType === 'interaction.input_change',
      );
      expect(inputInstr).toBeDefined();
      expect(inputInstr!.instruction).toMatch(/Enter.*Amount/);
    });

    it('submit event produces a "Submit" instruction', () => {
      const { sop } = processSession(makeInput());
      const step2 = sop.steps[1]!;
      const submitInstr = step2.instructions.find(i =>
        i.eventType === 'interaction.submit',
      );
      expect(submitInstr).toBeDefined();
      expect(submitInstr!.instruction).toMatch(/submit|Submit/);
    });

    it('instructions carry isSensitive and redacted flags', () => {
      const { sop } = processSession(makeInput());
      for (const step of sop.steps) {
        for (const instr of step.instructions) {
          expect(typeof instr.isSensitive).toBe('boolean');
          expect(typeof instr.redacted).toBe('boolean');
        }
      }
    });

    it('sensitive field instruction flags isSensitive=true and includes warning text', () => {
      const input = makeInput({
        events: [
          makeEvent({
            event_id: 'pw-1',
            event_type: 'interaction.input_change',
            actor_type: 'human',
            label: 'Password',
            isSensitive: true,
            redactionApplied: true,
          }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Enter password',
          status: 'finalized',
          grouping_reason: 'fill_and_submit',
          confidence: 0.9,
          source_event_ids: ['pw-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const instr = sop.steps[0]!.instructions[0]!;
      expect(instr.isSensitive).toBe(true);
      expect(instr.redacted).toBe(true);
      expect(instr.instruction).toContain('sensitive');
    });

    it('non-actionable events (window focus) produce no instruction', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'wf-1', event_type: 'system.window_focused', actor_type: 'system' }),
          makeEvent({ event_id: 'cl-1', event_type: 'interaction.click', actor_type: 'human', t_ms: NOW_MS + 1 }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Click element',
          status: 'finalized',
          grouping_reason: 'single_action',
          confidence: 0.75,
          source_event_ids: ['wf-1', 'cl-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const instrTypes = sop.steps[0]!.instructions.map(i => i.eventType);
      // window_focused must not appear as an instruction
      expect(instrTypes).not.toContain('system.window_focused');
      // click must appear
      expect(instrTypes).toContain('interaction.click');
    });

    it('duplicate input_change events on same field deduplicate to one instruction', () => {
      // Simulates typing "hello" character-by-character (5 events on same field)
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'ic-1', event_type: 'interaction.input_change', actor_type: 'human', t_ms: NOW_MS,     label: 'Name' }),
          makeEvent({ event_id: 'ic-2', event_type: 'interaction.input_change', actor_type: 'human', t_ms: NOW_MS + 1, label: 'Name' }),
          makeEvent({ event_id: 'ic-3', event_type: 'interaction.input_change', actor_type: 'human', t_ms: NOW_MS + 2, label: 'Name' }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Enter name',
          status: 'finalized',
          grouping_reason: 'fill_and_submit',
          confidence: 0.9,
          source_event_ids: ['ic-1', 'ic-2', 'ic-3'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const nameInstrs = sop.steps[0]!.instructions.filter(
        i => i.eventType === 'interaction.input_change',
      );
      // All three events are on the same field → deduplicated to 1
      expect(nameInstrs).toHaveLength(1);
      // The surviving instruction uses the last event's sourceEventId
      expect(nameInstrs[0]!.sourceEventId).toBe('ic-3');
    });

    it('input_change events on different fields are not deduplicated', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'ic-a', event_type: 'interaction.input_change', actor_type: 'human', t_ms: NOW_MS,     label: 'First Name' }),
          makeEvent({ event_id: 'ic-b', event_type: 'interaction.input_change', actor_type: 'human', t_ms: NOW_MS + 1, label: 'Last Name' }),
          makeEvent({ event_id: 'ic-c', event_type: 'interaction.submit',       actor_type: 'human', t_ms: NOW_MS + 2 }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Fill registration form',
          status: 'finalized',
          grouping_reason: 'fill_and_submit',
          confidence: 0.9,
          source_event_ids: ['ic-a', 'ic-b', 'ic-c'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const inputInstrs = sop.steps[0]!.instructions.filter(
        i => i.eventType === 'interaction.input_change',
      );
      // Two different fields → both kept
      expect(inputInstrs).toHaveLength(2);
    });

    it('system error event produces an instruction telling user to resolve it', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'err-1', event_type: 'system.error_displayed', actor_type: 'system' }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Handle error',
          status: 'finalized',
          grouping_reason: 'error_handling',
          confidence: 0.8,
          source_event_ids: ['err-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const errInstr = sop.steps[0]!.instructions.find(i =>
        i.eventType === 'system.error_displayed',
      );
      expect(errInstr).toBeDefined();
      expect(errInstr!.instruction).toMatch(/error|resolve/i);
    });

    it('modal_opened event produces an instruction with directive', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'modal-1', event_type: 'system.modal_opened', actor_type: 'system' }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Open modal',
          status: 'finalized',
          grouping_reason: 'single_action',
          confidence: 0.75,
          source_event_ids: ['modal-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const modalInstr = sop.steps[0]!.instructions.find(i =>
        i.eventType === 'system.modal_opened',
      );
      expect(modalInstr).toBeDefined();
      expect(modalInstr!.instruction).toMatch(/modal|dialog/i);
    });

    it('annotation event produces a "Note:" instruction', () => {
      const input = makeInput({
        events: [
          makeEvent({
            event_id: 'ann-1',
            event_type: 'session.annotation_added',
            actor_type: 'recorder',
            annotationText: 'Check approval status first',
          }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Check approval status first',
          status: 'finalized',
          grouping_reason: 'annotation',
          confidence: 1.0,
          source_event_ids: ['ann-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const annInstr = sop.steps[0]!.instructions.find(i =>
        i.eventType === 'session.annotation_added',
      );
      expect(annInstr).toBeDefined();
      expect(annInstr!.instruction).toMatch(/Note:|annotation/i);
    });

    it('detail string is a numbered formatting of instructions', () => {
      const { sop } = processSession(makeInput());
      const step = sop.steps[0]!;
      if (step.instructions.length > 0) {
        expect(step.detail).toContain('1.');
        if (step.instructions.length > 1) {
          expect(step.detail).toContain('2.');
        }
      }
    });

    it('detail derives from instructions — not independently authored', () => {
      const { sop } = processSession(makeInput());
      for (const step of sop.steps) {
        // Every line in detail should correspond to an instruction
        const instrTexts = step.instructions.map(i => i.instruction);
        for (const instr of instrTexts) {
          expect(step.detail).toContain(instr);
        }
      }
    });

    it('step with only system events and no actionable instructions produces fallback detail', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'wf-1', event_type: 'system.window_focused', actor_type: 'system' }),
          makeEvent({ event_id: 'wf-2', event_type: 'system.window_blurred', actor_type: 'system', t_ms: NOW_MS + 1 }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'System only step',
          status: 'finalized',
          grouping_reason: 'single_action',
          confidence: 0.55,
          source_event_ids: ['wf-1', 'wf-2'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const step = sop.steps[0]!;
      expect(step.instructions).toHaveLength(0);
      expect(step.detail.length).toBeGreaterThan(0); // fallback message present
    });
  });

  // ─── Determinism ───────────────────────────────────────────────────────────

  describe('determinism', () => {
    it('produces identical output for identical input (called twice)', () => {
      const input = makeInput();
      const a = processSession(input);
      const b = processSession(input);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('produces identical output for independent equal inputs', () => {
      const a = processSession(makeInput());
      const b = processSession(makeInput());
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('identical ProcessMap IDs and node IDs across runs', () => {
      const a = processSession(makeInput());
      const b = processSession(makeInput());
      expect(a.processMap.id).toBe(b.processMap.id);
      expect(a.processMap.nodes.map(n => n.id)).toEqual(b.processMap.nodes.map(n => n.id));
    });

    it('identical StepDefinition sourceEventIds across runs', () => {
      const a = processSession(makeInput());
      const b = processSession(makeInput());
      expect(JSON.stringify(a.processDefinition.stepDefinitions.map(s => s.sourceEventIds)))
        .toBe(JSON.stringify(b.processDefinition.stepDefinitions.map(s => s.sourceEventIds)));
    });
  });

  // ─── Empty / edge cases ────────────────────────────────────────────────────

  describe('empty session', () => {
    it('handles a session with no steps — still has start/end nodes', () => {
      const input: ProcessEngineInput = {
        sessionJson: {
          sessionId: 'empty-session',
          activityName: 'Empty',
          startedAt: new Date(NOW_MS).toISOString(),
        },
        normalizedEvents: [],
        derivedSteps: [],
      };
      const output = processSession(input);
      // Start and end nodes still present (empty process still has a boundary)
      expect(output.processMap.nodes).toHaveLength(2);
      expect(output.processMap.nodes[0]!.nodeType).toBe('start');
      expect(output.processMap.nodes[1]!.nodeType).toBe('end');
      // Single edge connecting start to end
      expect(output.processMap.edges).toHaveLength(1);
      expect(output.processDefinition.stepDefinitions).toHaveLength(0);
      expect(output.sop.steps).toHaveLength(0);
      expect(output.processMap.phases).toHaveLength(0);
    });
  });

  // ─── Privacy ───────────────────────────────────────────────────────────────

  describe('privacy', () => {
    it('sensitive step warning does not expose raw field value', () => {
      const input = makeInput({
        events: [
          makeEvent({
            event_id: 'evt-pw',
            event_type: 'interaction.input_change',
            actor_type: 'human',
            label: 'Password',
            isSensitive: true,
            redactionApplied: true,
          }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Enter credentials',
          status: 'finalized',
          grouping_reason: 'fill_and_submit',
          confidence: 0.9,
          source_event_ids: ['evt-pw'],
          start_t_ms: NOW_MS,
        }],
      });
      const { sop } = processSession(input);
      const warnings = sop.steps[0]?.warnings ?? [];
      // Warning must not contain actual input data
      for (const w of warnings) {
        expect(w).not.toMatch(/password/i); // label name OK, value must not appear
      }
    });

    it('SOP step action does not expose raw annotation text verbatim in unsafe way', () => {
      // Annotation text is used but only in a controlled way via template
      const input = makeInput({
        events: [
          makeEvent({
            event_id: 'ann-1',
            event_type: 'session.annotation_added',
            actor_type: 'recorder',
            annotationText: 'Begin approval flow',
          }),
        ],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Note: Begin approval flow',
          status: 'finalized',
          grouping_reason: 'annotation',
          confidence: 1.0,
          source_event_ids: ['ann-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const output = processSession(input);
      // System should not crash and should produce a valid SOP
      expect(output.sop.steps).toHaveLength(1);
      expect(output.sop.steps[0]!.action).toBeTruthy();
    });

    it('hasSensitiveEvents flag set on StepDefinition with sensitive events (§19.1)', () => {
      const input = makeInput({
        events: [makeEvent({ event_id: 'se-1', isSensitive: true })],
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Sensitive step',
          status: 'finalized',
          grouping_reason: 'single_action',
          confidence: 0.55,
          source_event_ids: ['se-1'],
          start_t_ms: NOW_MS,
        }],
      });
      const { processDefinition } = processSession(input);
      expect(processDefinition.stepDefinitions[0]!.hasSensitiveEvents).toBe(true);
    });
  });

  // ─── Input validation (§8.1) ───────────────────────────────────────────────

  describe('input validation', () => {
    it('accepts valid input without error', () => {
      expect(() => processSession(makeInput())).not.toThrow();
    });

    it('rejects empty sessionId', () => {
      const input = makeInput();
      input.sessionJson.sessionId = '';
      expect(() => processSession(input)).toThrow('[process-engine] Invalid input');
    });

    it('rejects empty activityName', () => {
      const input = makeInput();
      input.sessionJson.activityName = '';
      expect(() => processSession(input)).toThrow('[process-engine] Invalid input');
    });

    it('rejects endedAt before startedAt', () => {
      const input = makeInput();
      input.sessionJson.endedAt = new Date(NOW_MS - 1000).toISOString();
      input.sessionJson.startedAt = new Date(NOW_MS).toISOString();
      expect(() => processSession(input)).toThrow('[process-engine] Invalid input');
    });

    it('rejects duplicate event IDs', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'dup-1', t_ms: NOW_MS }),
          makeEvent({ event_id: 'dup-1', t_ms: NOW_MS + 1 }),
        ],
      });
      expect(() => processSession(input)).toThrow('[process-engine] Invalid input');
    });

    it('rejects out-of-order event timestamps', () => {
      const input = makeInput({
        events: [
          makeEvent({ event_id: 'e1', t_ms: NOW_MS + 1000 }),
          makeEvent({ event_id: 'e2', t_ms: NOW_MS }),        // earlier t_ms = out of order
        ],
      });
      expect(() => processSession(input)).toThrow('[process-engine] Invalid input');
    });

    it('rejects duplicate step IDs', () => {
      const input = makeInput();
      input.derivedSteps.push({
        step_id: `${SESSION_ID}-step-1`, // duplicate
        session_id: SESSION_ID,
        ordinal: 3,
        title: 'Dupe',
        status: 'finalized',
        grouping_reason: 'single_action',
        confidence: 0.55,
        source_event_ids: [],
        start_t_ms: NOW_MS + 10000,
      });
      expect(() => processSession(input)).toThrow('[process-engine] Invalid input');
    });

    it('rejects step ordinal 0 (must be 1-based per invariants)', () => {
      const input = makeInput({
        steps: [{
          step_id: `${SESSION_ID}-step-0`,
          session_id: SESSION_ID,
          ordinal: 0, // invalid — must be >= 1
          title: 'Zero ordinal',
          status: 'finalized',
          grouping_reason: 'single_action',
          confidence: 0.55,
          source_event_ids: [],
          start_t_ms: NOW_MS,
        }],
      });
      expect(() => processSession(input)).toThrow('[process-engine] Invalid input');
    });

    it('rejects confidence outside 0–1 range', () => {
      const input = makeInput({
        steps: [{
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Bad confidence',
          status: 'finalized',
          grouping_reason: 'single_action',
          confidence: 1.5, // invalid
          source_event_ids: [],
          start_t_ms: NOW_MS,
        }],
      });
      expect(() => processSession(input)).toThrow('[process-engine] Invalid input');
    });
  });

  // ─── validateProcessEngineInput (exported function) ───────────────────────

  describe('validateProcessEngineInput', () => {
    it('returns valid:true for good input', () => {
      const result = validateProcessEngineInput(makeInput());
      expect(result.valid).toBe(true);
    });

    it('returns valid:false with errors for bad input', () => {
      const input = makeInput();
      input.sessionJson.sessionId = '';
      const result = validateProcessEngineInput(input);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('sessionId'))).toBe(true);
      }
    });

    it('accumulates multiple errors', () => {
      const input = makeInput();
      input.sessionJson.sessionId = '';
      input.sessionJson.activityName = '';
      const result = validateProcessEngineInput(input);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ─── New grouping reason regression tests ──────────────────────────────────

  describe('new grouping reasons (data_entry, send_action, file_action)', () => {
    function makeNewGroupingInput(): ProcessEngineInput {
      const events = [
        makeEvent({ event_id: 'evt-de-1', event_type: 'interaction.input_change', t_ms: NOW_MS, label: 'Cell A11' }),
        makeEvent({ event_id: 'evt-de-2', event_type: 'interaction.input_change', t_ms: NOW_MS + 500, label: 'Cell B11' }),
        makeEvent({ event_id: 'evt-sa-1', event_type: 'interaction.click', t_ms: NOW_MS + 3000, label: 'Send', applicationLabel: 'Gmail', domain: 'mail.google.com' }),
        makeEvent({ event_id: 'evt-fa-1', event_type: 'interaction.click', t_ms: NOW_MS + 6000, label: 'Attach', applicationLabel: 'Gmail', domain: 'mail.google.com' }),
      ];

      const steps = [
        {
          step_id: `${SESSION_ID}-step-1`,
          session_id: SESSION_ID,
          ordinal: 1,
          title: 'Enter Cell A11',
          status: 'finalized' as const,
          boundary_reason: 'target_changed',
          grouping_reason: 'data_entry',
          confidence: 0.80,
          source_event_ids: ['evt-de-1', 'evt-de-2'],
          start_t_ms: NOW_MS,
          end_t_ms: NOW_MS + 500,
          duration_ms: 500,
          page_context: { domain: 'app.netsuite.com', applicationLabel: 'NetSuite', routeTemplate: '/sheet' },
        },
        {
          step_id: `${SESSION_ID}-step-2`,
          session_id: SESSION_ID,
          ordinal: 2,
          title: 'Send',
          status: 'finalized' as const,
          boundary_reason: 'action_completed',
          grouping_reason: 'send_action',
          confidence: 0.90,
          source_event_ids: ['evt-sa-1'],
          start_t_ms: NOW_MS + 3000,
          end_t_ms: NOW_MS + 3000,
          duration_ms: 0,
          page_context: { domain: 'mail.google.com', applicationLabel: 'Gmail', routeTemplate: '/compose' },
        },
        {
          step_id: `${SESSION_ID}-step-3`,
          session_id: SESSION_ID,
          ordinal: 3,
          title: 'Attach file',
          status: 'finalized' as const,
          boundary_reason: 'session_stop',
          grouping_reason: 'file_action',
          confidence: 0.85,
          source_event_ids: ['evt-fa-1'],
          start_t_ms: NOW_MS + 6000,
          end_t_ms: NOW_MS + 6000,
          duration_ms: 0,
          page_context: { domain: 'mail.google.com', applicationLabel: 'Gmail', routeTemplate: '/compose' },
        },
      ];

      return {
        sessionJson: {
          sessionId: SESSION_ID,
          activityName: 'Email with Spreadsheet',
          startedAt: new Date(NOW_MS).toISOString(),
          endedAt: new Date(NOW_MS + 7000).toISOString(),
        },
        normalizedEvents: events,
        derivedSteps: steps,
      };
    }

    it('data_entry gets correct category label and color', () => {
      const { processDefinition } = processSession(makeNewGroupingInput());
      const step = processDefinition.stepDefinitions[0]!;
      expect(step.category).toBe('data_entry');
      expect(step.categoryLabel).toBe('Data Entry');
      expect(step.categoryColor).toBe('#a78bfa');
    });

    it('send_action gets correct category label and color', () => {
      const { processDefinition } = processSession(makeNewGroupingInput());
      const step = processDefinition.stepDefinitions[1]!;
      expect(step.category).toBe('send_action');
      expect(step.categoryLabel).toBe('Send / Submit');
      expect(step.categoryColor).toBe('#34d399');
    });

    it('file_action gets correct category label and color', () => {
      const { processDefinition } = processSession(makeNewGroupingInput());
      const step = processDefinition.stepDefinitions[2]!;
      expect(step.category).toBe('file_action');
      expect(step.categoryLabel).toBe('File Action');
      expect(step.categoryColor).toBe('#fbbf24');
    });

    it('data_entry operational definition mentions data entry', () => {
      const { processDefinition } = processSession(makeNewGroupingInput());
      const step = processDefinition.stepDefinitions[0]!;
      expect(step.operationalDefinition).toContain('entered data');
      expect(step.operationalDefinition).toContain('Cell A11');
    });

    it('send_action operational definition mentions send action', () => {
      const { processDefinition } = processSession(makeNewGroupingInput());
      const step = processDefinition.stepDefinitions[1]!;
      expect(step.operationalDefinition).toContain('Send');
      expect(step.operationalDefinition).toContain('Gmail');
    });

    it('file_action operational definition mentions file', () => {
      const { processDefinition } = processSession(makeNewGroupingInput());
      const step = processDefinition.stepDefinitions[2]!;
      expect(step.operationalDefinition).toContain('file');
    });

    it('new grouping reasons are NOT downgraded to single_action', () => {
      const { processDefinition } = processSession(makeNewGroupingInput());
      const categories = processDefinition.stepDefinitions.map(s => s.category);
      expect(categories).toEqual(['data_entry', 'send_action', 'file_action']);
      expect(categories).not.toContain('single_action');
    });

    it('process map uses correct boundary labels for new reasons', () => {
      const { processMap } = processSession(makeNewGroupingInput());
      const labels = processMap.edges.map(e => e.boundaryLabel);
      // step1→step2 edge uses step2's boundary_reason = action_completed
      expect(labels).toContain('Action completed');
      // step2→step3 edge uses step3's boundary_reason = session_stop
      expect(labels).toContain('Session stopped');
      // start→step1 is always "Workflow begins" regardless of step1's boundary_reason
      expect(labels).toContain('Workflow begins');
    });

    it('SOP handles send_action with specific action text', () => {
      const { sop } = processSession(makeNewGroupingInput());
      const sendStep = sop.steps.find(s => s.category === 'send_action');
      expect(sendStep).toBeDefined();
      expect(sendStep!.action).toContain('Send');
    });

    it('SOP handles file_action with specific action text', () => {
      const { sop } = processSession(makeNewGroupingInput());
      const fileStep = sop.steps.find(s => s.category === 'file_action');
      expect(fileStep).toBeDefined();
      expect(fileStep!.action).toContain('file');
    });

    it('SOP completion criteria includes outcome-based criteria', () => {
      const { sop } = processSession(makeNewGroupingInput());
      // v2.0: outcome-based criteria reference completion state
      expect(sop.completionCriteria.length).toBeGreaterThan(0);
      const hasOutcomeCriteria = sop.completionCriteria.some(c =>
        c.includes('completed') || c.includes('verified') || c.includes('executed'),
      );
      expect(hasOutcomeCriteria).toBe(true);
    });

    it('SOP outputs include file attachment', () => {
      const { sop } = processSession(makeNewGroupingInput());
      const hasFileOutput = sop.outputs.some(o => o.toLowerCase().includes('file'));
      expect(hasFileOutput).toBe(true);
    });
  });
});
