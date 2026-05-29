import { db } from '@/db';
import { runProcessEngine, buildWorkflowReportFromOutput } from '@/lib/ingestion';

/**
 * Sample workflow seeding.
 *
 * Every account gets one built-in example workflow — a realistic
 * "Create Purchase Order" flow across SAP and Outlook — so users can
 * immediately explore an SOP, process map, and report without recording first.
 *
 * `ensureSampleWorkflow` is idempotent: it no-ops if the account already has
 * the sample. It is called:
 *   - at signup (every new account, see api/auth/signup/route.ts)
 *   - on-demand via POST /api/sample-workflow ("Try a sample workflow")
 *   - by scripts/backfill-sample-workflows.ts (all existing accounts)
 */

export const SAMPLE_TITLE = 'Create Purchase Order (Sample)';
const SESSION_ID = 'sample-session-001';

export interface EnsureSampleResult {
  id: string;
  created: boolean;
}

/**
 * Ensure the given user has the built-in sample workflow. Idempotent.
 * Returns the workflow id and whether it was newly created, or null on failure.
 * Never throws — callers (signup, etc.) must not fail if seeding fails.
 */
export async function ensureSampleWorkflow(userId: string): Promise<EnsureSampleResult | null> {
  try {
    const existing = await db.workflow.findFirst({
      where: { userId, title: SAMPLE_TITLE },
      select: { id: true },
    });
    if (existing) {
      return { id: existing.id, created: false };
    }

    const bundle = buildSampleBundle();
    const processOutput = runProcessEngine(bundle);
    const workflowReport = buildWorkflowReportFromOutput(processOutput, bundle);

    const stepDefs = processOutput.processDefinition.stepDefinitions;
    const confidence =
      stepDefs.length > 0
        ? stepDefs.reduce((sum: number, s: { confidence: number }) => sum + s.confidence, 0) / stepDefs.length
        : 0;

    const workflow = await db.workflow.create({
      data: {
        userId,
        title: SAMPLE_TITLE,
        toolsUsed: JSON.stringify(processOutput.processMap.systems),
        durationMs: processOutput.processRun.durationMs ?? 0,
        stepCount: processOutput.processRun.stepCount,
        phaseCount: processOutput.processMap.phases.length,
        confidence,
        status: 'active',
        sessionId: SESSION_ID,
      },
    });

    const artifactEntries = [
      { artifactType: 'process_output', data: processOutput },
      { artifactType: 'workflow_report', data: workflowReport },
      { artifactType: 'sop', data: processOutput.sop },
      { artifactType: 'process_map', data: processOutput.processMap },
    ];

    for (const entry of artifactEntries) {
      await db.workflowArtifact.create({
        data: {
          workflowId: workflow.id,
          artifactType: entry.artifactType,
          contentJson: JSON.stringify(entry.data),
        },
      });
    }

    return { id: workflow.id, created: true };
  } catch (err) {
    // Non-fatal: seeding the sample must never break signup or app load.
    console.error('[ensureSampleWorkflow] failed for user', userId, (err as Error)?.message);
    return null;
  }
}

// ─── Sample workflow data ────────────────────────────────────────────────────
// Fixed timestamps keep the sample deterministic across accounts and re-runs.

const NOW = 1_700_000_000_000;

function buildSampleBundle() {
  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: SAMPLE_TITLE,
      startedAt: new Date(NOW).toISOString(),
      endedAt: new Date(NOW + 45_000).toISOString(),
      schemaVersion: '1.0.0',
      recorderVersion: '0.1.1',
    },
    normalizedEvents: [
      makeEvent('e1', 'interaction.click', NOW, { label: 'New Purchase Order', app: 'SAP', domain: 'sap.example.com', page: 'Dashboard', route: '/dashboard' }),
      makeEvent('e2', 'navigation.open_page', NOW + 800, { label: 'New PO', app: 'SAP', domain: 'sap.example.com', page: 'Create Purchase Order', route: '/po/new', actor: 'system' }),
      makeEvent('e3', 'interaction.input_change', NOW + 5_000, { label: 'Vendor', app: 'SAP', domain: 'sap.example.com', page: 'Create Purchase Order', route: '/po/new' }),
      makeEvent('e4', 'interaction.input_change', NOW + 8_000, { label: 'Material', app: 'SAP', domain: 'sap.example.com', page: 'Create Purchase Order', route: '/po/new' }),
      makeEvent('e5', 'interaction.input_change', NOW + 11_000, { label: 'Quantity', app: 'SAP', domain: 'sap.example.com', page: 'Create Purchase Order', route: '/po/new' }),
      makeEvent('e6', 'interaction.input_change', NOW + 14_000, { label: 'Delivery Date', app: 'SAP', domain: 'sap.example.com', page: 'Create Purchase Order', route: '/po/new' }),
      makeEvent('e7', 'interaction.submit', NOW + 18_000, { label: 'Save', app: 'SAP', domain: 'sap.example.com', page: 'Create Purchase Order', route: '/po/new' }),
      makeEvent('e8', 'system.toast_shown', NOW + 19_000, { label: 'PO Created', app: 'SAP', domain: 'sap.example.com', page: 'PO Confirmation', route: '/po/confirm', actor: 'system' }),
      makeEvent('e9', 'interaction.click', NOW + 25_000, { label: 'Email PO to Vendor', app: 'SAP', domain: 'sap.example.com', page: 'PO Confirmation', route: '/po/confirm' }),
      makeEvent('e10', 'navigation.open_page', NOW + 26_000, { label: 'Compose', app: 'Outlook', domain: 'outlook.office.com', page: 'New Message', route: '/mail/compose', actor: 'system' }),
      makeEvent('e11', 'interaction.input_change', NOW + 30_000, { label: 'To', app: 'Outlook', domain: 'outlook.office.com', page: 'New Message', route: '/mail/compose' }),
      makeEvent('e12', 'interaction.click', NOW + 35_000, { label: 'Attach PO PDF', app: 'Outlook', domain: 'outlook.office.com', page: 'New Message', route: '/mail/compose' }),
      makeEvent('e13', 'interaction.click', NOW + 40_000, { label: 'Send', app: 'Outlook', domain: 'outlook.office.com', page: 'New Message', route: '/mail/compose' }),
      makeEvent('e14', 'system.toast_shown', NOW + 41_000, { label: 'Message Sent', app: 'Outlook', domain: 'outlook.office.com', page: 'Inbox', route: '/mail', actor: 'system' }),
    ],
    derivedSteps: [
      makeStep(1, 'Navigate to Create Purchase Order', 'click_then_navigate', 0.85, ['e1', 'e2'], NOW, NOW + 800, 800, 'sap.example.com', 'SAP', '/po/new', 'navigation_changed'),
      makeStep(2, 'Fill and submit purchase order form', 'fill_and_submit', 0.92, ['e3', 'e4', 'e5', 'e6', 'e7', 'e8'], NOW + 5_000, NOW + 19_000, 14_000, 'sap.example.com', 'SAP', '/po/new', 'form_submitted'),
      makeStep(3, 'Navigate to email composer', 'click_then_navigate', 0.85, ['e9', 'e10'], NOW + 25_000, NOW + 26_000, 1_000, 'outlook.office.com', 'Outlook', '/mail/compose', 'app_context_changed'),
      makeStep(4, 'Send PO to vendor via email', 'send_action', 0.88, ['e11', 'e12', 'e13', 'e14'], NOW + 30_000, NOW + 41_000, 11_000, 'outlook.office.com', 'Outlook', '/mail/compose', 'session_stop'),
    ],
    manifest: {
      sessionId: SESSION_ID,
      schemaVersion: '1.0.0',
      segmentationRuleVersion: '1.0.0',
      normalizationRuleVersion: '1.0.0',
    },
    policyLog: [],
  };
}

function makeEvent(
  id: string,
  type: string,
  tMs: number,
  opts: { label: string; app: string; domain: string; page: string; route: string; actor?: string },
) {
  return {
    event_id: id,
    session_id: SESSION_ID,
    t_ms: tMs,
    t_wall: new Date(tMs).toISOString(),
    event_type: type,
    actor_type: (opts.actor ?? 'human') as 'human' | 'system' | 'recorder',
    page_context: {
      url: `https://${opts.domain}${opts.route}`,
      urlNormalized: `https://${opts.domain}${opts.route}`,
      domain: opts.domain,
      routeTemplate: opts.route,
      pageTitle: opts.page,
      applicationLabel: opts.app,
    },
    target_summary: {
      label: opts.label,
      role: 'button',
      isSensitive: false,
    },
    normalization_meta: {
      sourceEventId: id,
      sourceEventType: type,
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
  };
}

function makeStep(
  ordinal: number,
  title: string,
  groupingReason: string,
  confidence: number,
  eventIds: string[],
  startMs: number,
  endMs: number,
  durationMs: number,
  domain: string,
  app: string,
  route: string,
  boundaryReason: string,
) {
  return {
    step_id: `${SESSION_ID}-step-${ordinal}`,
    session_id: SESSION_ID,
    ordinal,
    title,
    status: 'finalized' as const,
    boundary_reason: boundaryReason,
    grouping_reason: groupingReason,
    confidence,
    source_event_ids: eventIds,
    start_t_ms: startMs,
    end_t_ms: endMs,
    duration_ms: durationMs,
    page_context: {
      domain,
      applicationLabel: app,
      routeTemplate: route,
    },
  };
}
