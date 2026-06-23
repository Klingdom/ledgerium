import { db } from '@/db';
import { runProcessEngine, buildWorkflowReportFromOutput } from '@/lib/ingestion';

/**
 * Sample workflow seeding.
 *
 * Every account gets a built-in set of example workflows — so users can
 * immediately explore an SOP, process map, and report without recording first.
 * This set mirrors the public product demo (src/components/demo) so what a
 * prospect sees and what a new user gets are the same processes.
 *
 *   - `ensureSampleWorkflow`         → "Create Purchase Order (Sample)" (SAP + Outlook)
 *   - `ensureSampleVariants`         → "Approve Expense Report (Sample)" (see sample-variants.ts)
 *   - `ensureAdditionalSampleWorkflows` → Process Customer Refund, Onboard New Vendor,
 *                                          Monthly Payroll Close
 *
 * All are idempotent (no-op if the account already has the workflow by title) and
 * never throw — callers (signup, etc.) must not fail if seeding fails. They are called:
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

type SampleBundle = ReturnType<typeof buildSampleBundle>;

/**
 * Persist one sample workflow + its artifacts. Idempotent by (userId, title).
 * Shared by the PO sample and the additional sample set. Throws on DB/engine
 * failure — callers wrap in try/catch so seeding never breaks signup.
 */
async function persistSampleWorkflow(
  userId: string,
  title: string,
  sessionId: string,
  bundle: SampleBundle,
): Promise<EnsureSampleResult> {
  const existing = await db.workflow.findFirst({
    where: { userId, title },
    select: { id: true },
  });
  if (existing) {
    return { id: existing.id, created: false };
  }

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
      title,
      toolsUsed: JSON.stringify(processOutput.processMap.systems),
      durationMs: processOutput.processRun.durationMs ?? 0,
      stepCount: processOutput.processRun.stepCount,
      phaseCount: processOutput.processMap.phases.length,
      confidence,
      status: 'active',
      sessionId,
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
}

/**
 * Ensure the given user has the built-in "Create Purchase Order" sample. Idempotent.
 * Returns the workflow id and whether it was newly created, or null on failure.
 */
export async function ensureSampleWorkflow(userId: string): Promise<EnsureSampleResult | null> {
  try {
    return await persistSampleWorkflow(userId, SAMPLE_TITLE, SESSION_ID, buildSampleBundle());
  } catch (err) {
    // Non-fatal: seeding the sample must never break signup or app load.
    console.error('[ensureSampleWorkflow] failed for user', userId, (err as Error)?.message);
    return null;
  }
}

/**
 * Ensure the given user has the additional example workflows that round out the
 * library to match the product demo (Refund / Onboard Vendor / Payroll Close).
 * Each is idempotent and isolated — one failure never blocks the others or signup.
 */
export async function ensureAdditionalSampleWorkflows(userId: string): Promise<void> {
  for (const spec of ADDITIONAL_SAMPLE_WORKFLOWS) {
    try {
      await persistSampleWorkflow(userId, spec.title, spec.sessionId, buildBundleFromSpec(spec));
    } catch (err) {
      console.error('[ensureAdditionalSampleWorkflows] failed for', spec.title, (err as Error)?.message);
    }
  }
}

// ─── Sample workflow data ────────────────────────────────────────────────────
// Fixed timestamps keep the samples deterministic across accounts and re-runs.

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

// ─── Additional sample workflows (mirror the product demo set) ────────────────
// Each spec is a single observed path. The generic builder synthesizes one
// representative event per step + the derived step, so the engine produces a
// real SOP / process map / report. Deterministic: fixed base timestamps, no
// Date.now()/Math.random().

interface SampleStepSpec {
  title: string;
  groupingReason: string;
  boundaryReason: string;
  system: string;
  domain: string;
  page: string;
  route: string;
  durationMs: number;
  confidence: number;
}

interface SampleWorkflowSpec {
  title: string;
  sessionId: string;
  baseTimeMs: number;
  steps: SampleStepSpec[];
}

const S = 1_000;

export const ADDITIONAL_SAMPLE_WORKFLOWS: SampleWorkflowSpec[] = [
  {
    title: 'Process Customer Refund (Sample)',
    sessionId: 'sample-refund-001',
    baseTimeMs: NOW + 10_000_000,
    steps: [
      { title: 'Open customer order in Salesforce', groupingReason: 'click_then_navigate', boundaryReason: 'navigation_changed', system: 'Salesforce', domain: 'salesforce.example.com', page: 'Order', route: '/orders/view', durationMs: 6 * S, confidence: 0.86 },
      { title: 'Verify refund eligibility against policy', groupingReason: 'data_entry', boundaryReason: 'action_completed', system: 'Salesforce', domain: 'salesforce.example.com', page: 'Order', route: '/orders/view', durationMs: 38 * S, confidence: 0.82 },
      { title: 'Issue refund in Stripe', groupingReason: 'fill_and_submit', boundaryReason: 'form_submitted', system: 'Stripe', domain: 'dashboard.stripe.com', page: 'Refund', route: '/payments/refund', durationMs: 52 * S, confidence: 0.9 },
      { title: 'Update order status to Refunded', groupingReason: 'single_action', boundaryReason: 'app_context_changed', system: 'Salesforce', domain: 'salesforce.example.com', page: 'Order', route: '/orders/view', durationMs: 9 * S, confidence: 0.88 },
      { title: 'Close ticket and notify customer in Zendesk', groupingReason: 'send_action', boundaryReason: 'session_stop', system: 'Zendesk', domain: 'support.example.com', page: 'Ticket', route: '/tickets/close', durationMs: 44 * S, confidence: 0.85 },
    ],
  },
  {
    title: 'Onboard New Vendor (Sample)',
    sessionId: 'sample-vendor-001',
    baseTimeMs: NOW + 20_000_000,
    steps: [
      { title: 'Open Coupa supplier portal', groupingReason: 'click_then_navigate', boundaryReason: 'navigation_changed', system: 'Coupa', domain: 'coupa.example.com', page: 'Suppliers', route: '/suppliers/new', durationMs: 7 * S, confidence: 0.86 },
      { title: 'Enter vendor details and tax information', groupingReason: 'data_entry', boundaryReason: 'action_completed', system: 'Coupa', domain: 'coupa.example.com', page: 'New Supplier', route: '/suppliers/new', durationMs: 140 * S, confidence: 0.83 },
      { title: 'Upload W-9 and banking documentation', groupingReason: 'fill_and_submit', boundaryReason: 'form_submitted', system: 'Coupa', domain: 'coupa.example.com', page: 'New Supplier', route: '/suppliers/new', durationMs: 95 * S, confidence: 0.84 },
      { title: 'Send NDA for vendor signature via DocuSign', groupingReason: 'send_action', boundaryReason: 'app_context_changed', system: 'DocuSign', domain: 'app.docusign.com', page: 'Envelope', route: '/send', durationMs: 38 * S, confidence: 0.87 },
      { title: 'Request internal approval in Coupa', groupingReason: 'single_action', boundaryReason: 'app_context_changed', system: 'Coupa', domain: 'coupa.example.com', page: 'New Supplier', route: '/suppliers/new', durationMs: 12 * S, confidence: 0.85 },
      { title: 'Notify procurement team in Slack', groupingReason: 'send_action', boundaryReason: 'session_stop', system: 'Slack', domain: 'app.slack.com', page: 'Channel', route: '/messages', durationMs: 6 * S, confidence: 0.88 },
    ],
  },
  {
    title: 'Monthly Payroll Close (Sample)',
    sessionId: 'sample-payroll-001',
    baseTimeMs: NOW + 30_000_000,
    steps: [
      { title: 'Export approved timesheets from Workday', groupingReason: 'click_then_navigate', boundaryReason: 'navigation_changed', system: 'Workday', domain: 'workday.example.com', page: 'Timesheets', route: '/time/export', durationMs: 45 * S, confidence: 0.85 },
      { title: 'Reconcile hours and adjustments in Excel', groupingReason: 'data_entry', boundaryReason: 'app_context_changed', system: 'Excel', domain: 'office.example.com', page: 'Workbook', route: '/excel/payroll', durationMs: 310 * S, confidence: 0.78 },
      { title: 'Import corrected timesheet file to ADP', groupingReason: 'fill_and_submit', boundaryReason: 'form_submitted', system: 'ADP', domain: 'workforcenow.adp.com', page: 'Import', route: '/payroll/import', durationMs: 92 * S, confidence: 0.83 },
      { title: 'Run payroll preview and review exceptions', groupingReason: 'single_action', boundaryReason: 'action_completed', system: 'ADP', domain: 'workforcenow.adp.com', page: 'Preview', route: '/payroll/preview', durationMs: 155 * S, confidence: 0.81 },
      { title: 'Approve and submit final payroll', groupingReason: 'fill_and_submit', boundaryReason: 'session_stop', system: 'ADP', domain: 'workforcenow.adp.com', page: 'Submit', route: '/payroll/submit', durationMs: 78 * S, confidence: 0.86 },
    ],
  },
];

function eventTypeForGrouping(grouping: string): string {
  switch (grouping) {
    case 'fill_and_submit':
      return 'interaction.submit';
    case 'data_entry':
      return 'interaction.input_change';
    case 'send_action':
    case 'click_then_navigate':
    case 'single_action':
    default:
      return 'interaction.click';
  }
}

/** Build an engine bundle from a single-path spec (one representative event per step). */
export function buildBundleFromSpec(spec: SampleWorkflowSpec): SampleBundle {
  const events: ReturnType<typeof makeEvent>[] = [];
  const derivedSteps: ReturnType<typeof makeStep>[] = [];
  let t = spec.baseTimeMs;

  spec.steps.forEach((step, i) => {
    const ordinal = i + 1;
    const isLast = i === spec.steps.length - 1;
    const eventId = `${spec.sessionId}-e${ordinal}`;
    events.push(
      makeEvent(
        eventId,
        eventTypeForGrouping(step.groupingReason),
        t,
        { label: step.title, app: step.system, domain: step.domain, page: step.page, route: step.route },
        spec.sessionId,
      ),
    );
    derivedSteps.push(
      makeStep(
        ordinal,
        step.title,
        step.groupingReason,
        step.confidence,
        [eventId],
        t,
        t + step.durationMs,
        step.durationMs,
        step.domain,
        step.system,
        step.route,
        isLast ? 'session_stop' : step.boundaryReason,
        spec.sessionId,
      ),
    );
    t += step.durationMs + 500;
  });

  return {
    sessionJson: {
      sessionId: spec.sessionId,
      activityName: spec.title,
      startedAt: new Date(spec.baseTimeMs).toISOString(),
      endedAt: new Date(t).toISOString(),
      schemaVersion: '1.0.0',
      recorderVersion: '0.1.1',
    },
    normalizedEvents: events,
    derivedSteps,
    manifest: {
      sessionId: spec.sessionId,
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
  sessionId: string = SESSION_ID,
) {
  return {
    event_id: id,
    session_id: sessionId,
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
  sessionId: string = SESSION_ID,
) {
  return {
    step_id: `${sessionId}-step-${ordinal}`,
    session_id: sessionId,
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
