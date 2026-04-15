import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { runProcessEngine, buildWorkflowReportFromOutput } from '@/lib/ingestion';

/**
 * POST /api/seed-demo-data
 *
 * Seeds 5 diverse sample workflows for documentation screenshots and demos.
 * Idempotent: skips any workflow whose title already exists for this user.
 *
 * Returns:
 *   { created: string[], skipped: string[] }
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const created: string[] = [];
  const skipped: string[] = [];

  const workflows = buildAllDemoBundles();

  for (const { title, sessionId, bundle } of workflows) {
    const existing = await db.workflow.findFirst({
      where: { userId, title },
    });

    if (existing) {
      skipped.push(title);
      continue;
    }

    try {
      const processOutput = runProcessEngine(bundle);
      const workflowReport = buildWorkflowReportFromOutput(processOutput, bundle);

      const workflow = await db.workflow.create({
        data: {
          userId,
          title,
          toolsUsed: JSON.stringify(processOutput.processMap.systems),
          durationMs: processOutput.processRun.durationMs ?? 0,
          stepCount: processOutput.processRun.stepCount,
          phaseCount: processOutput.processMap.phases.length,
          confidence:
            processOutput.processDefinition.stepDefinitions.length > 0
              ? processOutput.processDefinition.stepDefinitions.reduce(
                  (sum: number, s: any) => sum + s.confidence,
                  0,
                ) / processOutput.processDefinition.stepDefinitions.length
              : 0,
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

      created.push(workflow.id);
    } catch (err: any) {
      return NextResponse.json(
        {
          error: `Failed to create workflow "${title}"`,
          detail: err?.message,
          created,
          skipped,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ created, skipped });
}

// ─── Bundle builders ─────────────────────────────────────────────────────────

function buildAllDemoBundles() {
  return [
    buildRefundBundle(),
    buildRefundVariantBundle(),
    buildOnboardBundle(),
    buildExpenseBundle(),
    buildExpenseVariantBundle(),
    buildSupportTicketBundle(),
    buildSalesPipelineBundle(),
  ];
}

// ─── Workflow 1: Process Customer Refund ─────────────────────────────────────

const REFUND_TITLE = 'Process Customer Refund';
const REFUND_SESSION = 'demo-refund-001';
const REFUND_NOW = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago

function buildRefundBundle() {
  const T = REFUND_NOW;
  const S = REFUND_SESSION;
  return {
    title: REFUND_TITLE,
    sessionId: S,
    bundle: {
      sessionJson: {
        sessionId: S,
        activityName: REFUND_TITLE,
        startedAt: new Date(T).toISOString(),
        endedAt: new Date(T + 120_000).toISOString(),
        schemaVersion: '1.0.0',
        recorderVersion: '0.1.1',
      },
      normalizedEvents: [
        makeEvent('refund-e1', 'navigation.open_page', T, S, { label: 'Cases', app: 'Salesforce', domain: 'salesforce.com', page: 'Cases', route: '/cases', actor: 'human' }),
        makeEvent('refund-e2', 'interaction.click', T + 3_000, S, { label: 'Open Case #10482', app: 'Salesforce', domain: 'salesforce.com', page: 'Cases', route: '/cases' }),
        makeEvent('refund-e3', 'navigation.open_page', T + 3_800, S, { label: 'Case Detail', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10482', route: '/cases/10482', actor: 'system' }),
        makeEvent('refund-e4', 'interaction.click', T + 18_000, S, { label: 'View Order', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10482', route: '/cases/10482' }),
        makeEvent('refund-e5', 'navigation.open_page', T + 19_000, S, { label: 'Stripe Dashboard', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Payments', route: '/payments', actor: 'system' }),
        makeEvent('refund-e6', 'interaction.click', T + 32_000, S, { label: 'Refund Payment', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Payment Detail', route: '/payments/pi_001' }),
        makeEvent('refund-e7', 'interaction.input_change', T + 38_000, S, { label: 'Refund Amount', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Refund Dialog', route: '/payments/pi_001/refund' }),
        makeEvent('refund-e8', 'interaction.submit', T + 45_000, S, { label: 'Confirm Refund', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Refund Dialog', route: '/payments/pi_001/refund' }),
        makeEvent('refund-e9', 'system.toast_shown', T + 46_000, S, { label: 'Refund Issued', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Payment Detail', route: '/payments/pi_001', actor: 'system' }),
        makeEvent('refund-e10', 'navigation.open_page', T + 58_000, S, { label: 'Case #10482', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10482', route: '/cases/10482', actor: 'human' }),
        makeEvent('refund-e11', 'interaction.click', T + 72_000, S, { label: 'Edit Status', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10482', route: '/cases/10482' }),
        makeEvent('refund-e12', 'interaction.input_change', T + 76_000, S, { label: 'Status', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10482', route: '/cases/10482/edit' }),
        makeEvent('refund-e13', 'interaction.submit', T + 82_000, S, { label: 'Save', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10482', route: '/cases/10482/edit' }),
        makeEvent('refund-e14', 'system.toast_shown', T + 83_000, S, { label: 'Case Updated', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10482', route: '/cases/10482', actor: 'system' }),
      ],
      derivedSteps: [
        makeStep(1, 'Open case in Salesforce', 'click_then_navigate', 0.91, ['refund-e1', 'refund-e2', 'refund-e3'], T, T + 3_800, 3_800, 'salesforce.com', 'Salesforce', '/cases/10482', 'navigation_changed', S),
        makeStep(2, 'Review order details', 'read_action', 0.88, ['refund-e4'], T + 18_000, T + 19_000, 1_000, 'salesforce.com', 'Salesforce', '/cases/10482', 'app_context_changed', S),
        makeStep(3, 'Navigate to Stripe and locate payment', 'click_then_navigate', 0.87, ['refund-e5', 'refund-e6'], T + 19_000, T + 38_000, 19_000, 'dashboard.stripe.com', 'Stripe', '/payments/pi_001', 'navigation_changed', S),
        makeStep(4, 'Process refund in Stripe', 'fill_and_submit', 0.94, ['refund-e7', 'refund-e8', 'refund-e9'], T + 38_000, T + 46_000, 8_000, 'dashboard.stripe.com', 'Stripe', '/payments/pi_001/refund', 'form_submitted', S),
        makeStep(5, 'Return to Salesforce', 'navigation', 0.82, ['refund-e10'], T + 58_000, T + 58_000, 0, 'salesforce.com', 'Salesforce', '/cases/10482', 'app_context_changed', S),
        makeStep(6, 'Update case status to Resolved', 'fill_and_submit', 0.93, ['refund-e11', 'refund-e12', 'refund-e13', 'refund-e14'], T + 72_000, T + 83_000, 11_000, 'salesforce.com', 'Salesforce', '/cases/10482/edit', 'session_stop', S),
      ],
      manifest: {
        sessionId: S,
        schemaVersion: '1.0.0',
        segmentationRuleVersion: '1.0.0',
        normalizationRuleVersion: '1.0.0',
      },
      policyLog: [],
    },
  };
}

// ─── Workflow 2: Onboard New Employee ────────────────────────────────────────

const ONBOARD_TITLE = 'Onboard New Employee';
const ONBOARD_SESSION = 'demo-onboard-001';
const ONBOARD_NOW = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago

function buildOnboardBundle() {
  const T = ONBOARD_NOW;
  const S = ONBOARD_SESSION;
  return {
    title: ONBOARD_TITLE,
    sessionId: S,
    bundle: {
      sessionJson: {
        sessionId: S,
        activityName: ONBOARD_TITLE,
        startedAt: new Date(T).toISOString(),
        endedAt: new Date(T + 300_000).toISOString(),
        schemaVersion: '1.0.0',
        recorderVersion: '0.1.1',
      },
      normalizedEvents: [
        makeEvent('onboard-e1', 'navigation.open_page', T, S, { label: 'Workday', app: 'Workday', domain: 'workday.com', page: 'Home', route: '/home', actor: 'human' }),
        makeEvent('onboard-e2', 'interaction.click', T + 5_000, S, { label: 'Add Worker', app: 'Workday', domain: 'workday.com', page: 'Workers', route: '/workers' }),
        makeEvent('onboard-e3', 'interaction.input_change', T + 15_000, S, { label: 'First Name', app: 'Workday', domain: 'workday.com', page: 'New Worker', route: '/workers/new' }),
        makeEvent('onboard-e4', 'interaction.input_change', T + 20_000, S, { label: 'Last Name', app: 'Workday', domain: 'workday.com', page: 'New Worker', route: '/workers/new' }),
        makeEvent('onboard-e5', 'interaction.input_change', T + 26_000, S, { label: 'Email', app: 'Workday', domain: 'workday.com', page: 'New Worker', route: '/workers/new' }),
        makeEvent('onboard-e6', 'interaction.input_change', T + 35_000, S, { label: 'Start Date', app: 'Workday', domain: 'workday.com', page: 'New Worker', route: '/workers/new' }),
        makeEvent('onboard-e7', 'interaction.input_change', T + 50_000, S, { label: 'Department', app: 'Workday', domain: 'workday.com', page: 'New Worker', route: '/workers/new' }),
        makeEvent('onboard-e8', 'interaction.input_change', T + 58_000, S, { label: 'Job Title', app: 'Workday', domain: 'workday.com', page: 'New Worker', route: '/workers/new' }),
        makeEvent('onboard-e9', 'interaction.submit', T + 65_000, S, { label: 'Save Worker', app: 'Workday', domain: 'workday.com', page: 'New Worker', route: '/workers/new' }),
        makeEvent('onboard-e10', 'system.toast_shown', T + 66_000, S, { label: 'Worker Created', app: 'Workday', domain: 'workday.com', page: 'Worker Profile', route: '/workers/w-8821', actor: 'system' }),
        makeEvent('onboard-e11', 'navigation.open_page', T + 85_000, S, { label: 'Google Admin', app: 'Google Admin', domain: 'admin.google.com', page: 'Users', route: '/users', actor: 'human' }),
        makeEvent('onboard-e12', 'interaction.click', T + 90_000, S, { label: 'Add New User', app: 'Google Admin', domain: 'admin.google.com', page: 'Users', route: '/users' }),
        makeEvent('onboard-e13', 'interaction.input_change', T + 100_000, S, { label: 'Email Address', app: 'Google Admin', domain: 'admin.google.com', page: 'New User', route: '/users/new' }),
        makeEvent('onboard-e14', 'interaction.submit', T + 115_000, S, { label: 'Create Account', app: 'Google Admin', domain: 'admin.google.com', page: 'New User', route: '/users/new' }),
        makeEvent('onboard-e15', 'system.toast_shown', T + 116_000, S, { label: 'Account Created', app: 'Google Admin', domain: 'admin.google.com', page: 'Users', route: '/users', actor: 'system' }),
        makeEvent('onboard-e16', 'navigation.open_page', T + 140_000, S, { label: 'Slack Admin', app: 'Slack', domain: 'slack.com', page: 'Members', route: '/admin/members', actor: 'human' }),
        makeEvent('onboard-e17', 'interaction.click', T + 148_000, S, { label: 'Invite People', app: 'Slack', domain: 'slack.com', page: 'Members', route: '/admin/members' }),
        makeEvent('onboard-e18', 'interaction.input_change', T + 155_000, S, { label: 'Email or Name', app: 'Slack', domain: 'slack.com', page: 'Invite Dialog', route: '/admin/members/invite' }),
        makeEvent('onboard-e19', 'interaction.click', T + 170_000, S, { label: 'Add to Channels', app: 'Slack', domain: 'slack.com', page: 'Invite Dialog', route: '/admin/members/invite' }),
        makeEvent('onboard-e20', 'interaction.submit', T + 185_000, S, { label: 'Send Invite', app: 'Slack', domain: 'slack.com', page: 'Invite Dialog', route: '/admin/members/invite' }),
        makeEvent('onboard-e21', 'system.toast_shown', T + 186_000, S, { label: 'Invite Sent', app: 'Slack', domain: 'slack.com', page: 'Members', route: '/admin/members', actor: 'system' }),
        makeEvent('onboard-e22', 'navigation.open_page', T + 210_000, S, { label: 'Worker Profile', app: 'Workday', domain: 'workday.com', page: 'Worker Profile', route: '/workers/w-8821', actor: 'human' }),
        makeEvent('onboard-e23', 'interaction.click', T + 220_000, S, { label: 'Mark Onboarding Complete', app: 'Workday', domain: 'workday.com', page: 'Worker Profile', route: '/workers/w-8821' }),
        makeEvent('onboard-e24', 'system.toast_shown', T + 221_000, S, { label: 'Onboarding Complete', app: 'Workday', domain: 'workday.com', page: 'Worker Profile', route: '/workers/w-8821', actor: 'system' }),
      ],
      derivedSteps: [
        makeStep(1, 'Create employee record in Workday', 'click_then_navigate', 0.92, ['onboard-e1', 'onboard-e2'], T, T + 15_000, 15_000, 'workday.com', 'Workday', '/workers/new', 'navigation_changed', S),
        makeStep(2, 'Fill personal details', 'fill_form', 0.95, ['onboard-e3', 'onboard-e4', 'onboard-e5', 'onboard-e6'], T + 15_000, T + 36_000, 21_000, 'workday.com', 'Workday', '/workers/new', 'form_section_complete', S),
        makeStep(3, 'Set department and role, save record', 'fill_and_submit', 0.90, ['onboard-e7', 'onboard-e8', 'onboard-e9', 'onboard-e10'], T + 50_000, T + 66_000, 16_000, 'workday.com', 'Workday', '/workers/new', 'form_submitted', S),
        makeStep(4, 'Navigate to Google Admin and create email account', 'fill_and_submit', 0.88, ['onboard-e11', 'onboard-e12', 'onboard-e13', 'onboard-e14', 'onboard-e15'], T + 85_000, T + 116_000, 31_000, 'admin.google.com', 'Google Admin', '/users/new', 'app_context_changed', S),
        makeStep(5, 'Navigate to Slack Admin', 'navigation', 0.84, ['onboard-e16'], T + 140_000, T + 140_000, 0, 'slack.com', 'Slack', '/admin/members', 'app_context_changed', S),
        makeStep(6, 'Add employee to Slack and channels', 'fill_and_submit', 0.89, ['onboard-e17', 'onboard-e18', 'onboard-e19', 'onboard-e20', 'onboard-e21'], T + 148_000, T + 186_000, 38_000, 'slack.com', 'Slack', '/admin/members/invite', 'form_submitted', S),
        makeStep(7, 'Return to Workday', 'navigation', 0.83, ['onboard-e22'], T + 210_000, T + 210_000, 0, 'workday.com', 'Workday', '/workers/w-8821', 'app_context_changed', S),
        makeStep(8, 'Confirm onboarding complete in Workday', 'click_action', 0.91, ['onboard-e23', 'onboard-e24'], T + 220_000, T + 221_000, 1_000, 'workday.com', 'Workday', '/workers/w-8821', 'session_stop', S),
      ],
      manifest: {
        sessionId: S,
        schemaVersion: '1.0.0',
        segmentationRuleVersion: '1.0.0',
        normalizationRuleVersion: '1.0.0',
      },
      policyLog: [],
    },
  };
}

// ─── Workflow 3: Submit Monthly Expense Report ────────────────────────────────

const EXPENSE_TITLE = 'Submit Monthly Expense Report';
const EXPENSE_SESSION = 'demo-expense-001';
const EXPENSE_NOW = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago

function buildExpenseBundle() {
  const T = EXPENSE_NOW;
  const S = EXPENSE_SESSION;
  return {
    title: EXPENSE_TITLE,
    sessionId: S,
    bundle: {
      sessionJson: {
        sessionId: S,
        activityName: EXPENSE_TITLE,
        startedAt: new Date(T).toISOString(),
        endedAt: new Date(T + 90_000).toISOString(),
        schemaVersion: '1.0.0',
        recorderVersion: '0.1.1',
      },
      normalizedEvents: [
        makeEvent('expense-e1', 'navigation.open_page', T, S, { label: 'Expenses', app: 'Workday', domain: 'workday.com', page: 'Expenses', route: '/expenses', actor: 'human' }),
        makeEvent('expense-e2', 'interaction.click', T + 8_000, S, { label: 'Create Expense Report', app: 'Workday', domain: 'workday.com', page: 'Expenses', route: '/expenses' }),
        makeEvent('expense-e3', 'navigation.open_page', T + 9_000, S, { label: 'New Expense Report', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new', actor: 'system' }),
        makeEvent('expense-e4', 'interaction.input_change', T + 18_000, S, { label: 'Report Name', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense-e5', 'interaction.input_change', T + 24_000, S, { label: 'Business Purpose', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense-e6', 'interaction.click', T + 34_000, S, { label: 'Add Expense Line', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense-e7', 'interaction.input_change', T + 40_000, S, { label: 'Amount', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense-e8', 'interaction.input_change', T + 46_000, S, { label: 'Expense Category', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense-e9', 'interaction.click', T + 55_000, S, { label: 'Attach Receipt', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense-e10', 'interaction.click', T + 65_000, S, { label: 'Upload File', app: 'Workday', domain: 'workday.com', page: 'Upload Dialog', route: '/expenses/new/upload' }),
        makeEvent('expense-e11', 'system.toast_shown', T + 70_000, S, { label: 'Receipt Attached', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new', actor: 'system' }),
        makeEvent('expense-e12', 'interaction.submit', T + 80_000, S, { label: 'Submit for Approval', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense-e13', 'system.toast_shown', T + 81_000, S, { label: 'Report Submitted', app: 'Workday', domain: 'workday.com', page: 'Expenses', route: '/expenses', actor: 'system' }),
      ],
      derivedSteps: [
        makeStep(1, 'Navigate to Expenses in Workday', 'navigation', 0.90, ['expense-e1', 'expense-e2', 'expense-e3'], T, T + 9_000, 9_000, 'workday.com', 'Workday', '/expenses', 'navigation_changed', S),
        makeStep(2, 'Create new expense report', 'fill_form', 0.87, ['expense-e4', 'expense-e5'], T + 18_000, T + 25_000, 7_000, 'workday.com', 'Workday', '/expenses/new', 'form_section_complete', S),
        makeStep(3, 'Fill expense line details', 'fill_form', 0.85, ['expense-e6', 'expense-e7', 'expense-e8'], T + 34_000, T + 47_000, 13_000, 'workday.com', 'Workday', '/expenses/new', 'form_section_complete', S),
        makeStep(4, 'Attach receipt', 'click_action', 0.82, ['expense-e9', 'expense-e10', 'expense-e11'], T + 55_000, T + 70_000, 15_000, 'workday.com', 'Workday', '/expenses/new/upload', 'upload_complete', S),
        makeStep(5, 'Submit report for approval', 'submit_action', 0.93, ['expense-e12', 'expense-e13'], T + 80_000, T + 81_000, 1_000, 'workday.com', 'Workday', '/expenses/new', 'session_stop', S),
      ],
      manifest: {
        sessionId: S,
        schemaVersion: '1.0.0',
        segmentationRuleVersion: '1.0.0',
        normalizationRuleVersion: '1.0.0',
      },
      policyLog: [],
    },
  };
}

// ─── Workflow 4: Resolve Support Ticket ──────────────────────────────────────

const SUPPORT_TITLE = 'Resolve Support Ticket';
const SUPPORT_SESSION = 'demo-support-001';
const SUPPORT_NOW = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago

function buildSupportTicketBundle() {
  const T = SUPPORT_NOW;
  const S = SUPPORT_SESSION;
  return {
    title: SUPPORT_TITLE,
    sessionId: S,
    bundle: {
      sessionJson: {
        sessionId: S,
        activityName: SUPPORT_TITLE,
        startedAt: new Date(T).toISOString(),
        endedAt: new Date(T + 180_000).toISOString(),
        schemaVersion: '1.0.0',
        recorderVersion: '0.1.1',
      },
      normalizedEvents: [
        makeEvent('support-e1', 'navigation.open_page', T, S, { label: 'Zendesk', app: 'Zendesk', domain: 'zendesk.com', page: 'Tickets', route: '/agent/tickets', actor: 'human' }),
        makeEvent('support-e2', 'interaction.click', T + 6_000, S, { label: 'Ticket #9041', app: 'Zendesk', domain: 'zendesk.com', page: 'Tickets', route: '/agent/tickets' }),
        makeEvent('support-e3', 'navigation.open_page', T + 7_000, S, { label: 'Ticket Detail', app: 'Zendesk', domain: 'zendesk.com', page: 'Ticket #9041', route: '/agent/tickets/9041', actor: 'system' }),
        makeEvent('support-e4', 'interaction.click', T + 22_000, S, { label: 'View Customer Profile', app: 'Zendesk', domain: 'zendesk.com', page: 'Ticket #9041', route: '/agent/tickets/9041' }),
        makeEvent('support-e5', 'navigation.open_page', T + 40_000, S, { label: 'Jira', app: 'Jira', domain: 'jira.atlassian.com', page: 'Create Issue', route: '/jira/create', actor: 'human' }),
        makeEvent('support-e6', 'interaction.input_change', T + 48_000, S, { label: 'Summary', app: 'Jira', domain: 'jira.atlassian.com', page: 'Create Issue', route: '/jira/create' }),
        makeEvent('support-e7', 'interaction.input_change', T + 55_000, S, { label: 'Description', app: 'Jira', domain: 'jira.atlassian.com', page: 'Create Issue', route: '/jira/create' }),
        makeEvent('support-e8', 'interaction.submit', T + 68_000, S, { label: 'Create Issue', app: 'Jira', domain: 'jira.atlassian.com', page: 'Create Issue', route: '/jira/create' }),
        makeEvent('support-e9', 'system.toast_shown', T + 69_000, S, { label: 'Issue BUG-2210 Created', app: 'Jira', domain: 'jira.atlassian.com', page: 'Issue BUG-2210', route: '/jira/BUG-2210', actor: 'system' }),
        makeEvent('support-e10', 'navigation.open_page', T + 85_000, S, { label: 'Confluence', app: 'Confluence', domain: 'confluence.atlassian.com', page: 'Knowledge Base', route: '/wiki/kb', actor: 'human' }),
        makeEvent('support-e11', 'interaction.click', T + 95_000, S, { label: 'Copy Page Link', app: 'Confluence', domain: 'confluence.atlassian.com', page: 'KB Article', route: '/wiki/kb/network-timeout-fix' }),
        makeEvent('support-e12', 'navigation.open_page', T + 110_000, S, { label: 'Ticket #9041', app: 'Zendesk', domain: 'zendesk.com', page: 'Ticket #9041', route: '/agent/tickets/9041', actor: 'human' }),
        makeEvent('support-e13', 'interaction.click', T + 118_000, S, { label: 'Reply', app: 'Zendesk', domain: 'zendesk.com', page: 'Ticket #9041', route: '/agent/tickets/9041' }),
        makeEvent('support-e14', 'interaction.input_change', T + 125_000, S, { label: 'Reply Body', app: 'Zendesk', domain: 'zendesk.com', page: 'Ticket #9041', route: '/agent/tickets/9041' }),
        makeEvent('support-e15', 'interaction.submit', T + 145_000, S, { label: 'Send Reply', app: 'Zendesk', domain: 'zendesk.com', page: 'Ticket #9041', route: '/agent/tickets/9041' }),
        makeEvent('support-e16', 'interaction.click', T + 158_000, S, { label: 'Close Ticket', app: 'Zendesk', domain: 'zendesk.com', page: 'Ticket #9041', route: '/agent/tickets/9041' }),
        makeEvent('support-e17', 'system.toast_shown', T + 159_000, S, { label: 'Ticket Closed', app: 'Zendesk', domain: 'zendesk.com', page: 'Tickets', route: '/agent/tickets', actor: 'system' }),
      ],
      derivedSteps: [
        makeStep(1, 'Open support ticket in Zendesk', 'click_then_navigate', 0.91, ['support-e1', 'support-e2', 'support-e3'], T, T + 7_000, 7_000, 'zendesk.com', 'Zendesk', '/agent/tickets/9041', 'navigation_changed', S),
        makeStep(2, 'Review customer information', 'read_action', 0.85, ['support-e4'], T + 22_000, T + 40_000, 18_000, 'zendesk.com', 'Zendesk', '/agent/tickets/9041', 'app_context_changed', S),
        makeStep(3, 'Create Jira bug and link to KB article', 'fill_and_submit', 0.88, ['support-e5', 'support-e6', 'support-e7', 'support-e8', 'support-e9'], T + 40_000, T + 69_000, 29_000, 'jira.atlassian.com', 'Jira', '/jira/create', 'form_submitted', S),
        makeStep(4, 'Copy KB article link from Confluence', 'click_action', 0.83, ['support-e10', 'support-e11'], T + 85_000, T + 96_000, 11_000, 'confluence.atlassian.com', 'Confluence', '/wiki/kb/network-timeout-fix', 'app_context_changed', S),
        makeStep(5, 'Return to Zendesk ticket', 'navigation', 0.86, ['support-e12'], T + 110_000, T + 110_000, 0, 'zendesk.com', 'Zendesk', '/agent/tickets/9041', 'app_context_changed', S),
        makeStep(6, 'Write and send resolution reply', 'fill_and_submit', 0.92, ['support-e13', 'support-e14', 'support-e15'], T + 118_000, T + 145_000, 27_000, 'zendesk.com', 'Zendesk', '/agent/tickets/9041', 'form_submitted', S),
        makeStep(7, 'Close ticket', 'click_action', 0.94, ['support-e16', 'support-e17'], T + 158_000, T + 159_000, 1_000, 'zendesk.com', 'Zendesk', '/agent/tickets/9041', 'session_stop', S),
      ],
      manifest: {
        sessionId: S,
        schemaVersion: '1.0.0',
        segmentationRuleVersion: '1.0.0',
        normalizationRuleVersion: '1.0.0',
      },
      policyLog: [],
    },
  };
}

// ─── Workflow 5: Weekly Sales Pipeline Review ─────────────────────────────────

const PIPELINE_TITLE = 'Weekly Sales Pipeline Review';
const PIPELINE_SESSION = 'demo-pipeline-001';
const PIPELINE_NOW = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago

function buildSalesPipelineBundle() {
  const T = PIPELINE_NOW;
  const S = PIPELINE_SESSION;
  return {
    title: PIPELINE_TITLE,
    sessionId: S,
    bundle: {
      sessionJson: {
        sessionId: S,
        activityName: PIPELINE_TITLE,
        startedAt: new Date(T).toISOString(),
        endedAt: new Date(T + 240_000).toISOString(),
        schemaVersion: '1.0.0',
        recorderVersion: '0.1.1',
      },
      normalizedEvents: [
        makeEvent('pipeline-e1', 'navigation.open_page', T, S, { label: 'Salesforce Pipeline', app: 'Salesforce', domain: 'salesforce.com', page: 'Pipeline', route: '/pipeline', actor: 'human' }),
        makeEvent('pipeline-e2', 'interaction.click', T + 10_000, S, { label: 'Filter by Q2', app: 'Salesforce', domain: 'salesforce.com', page: 'Pipeline', route: '/pipeline' }),
        makeEvent('pipeline-e3', 'interaction.input_change', T + 16_000, S, { label: 'Close Date Range', app: 'Salesforce', domain: 'salesforce.com', page: 'Pipeline', route: '/pipeline' }),
        makeEvent('pipeline-e4', 'interaction.click', T + 24_000, S, { label: 'Apply Filters', app: 'Salesforce', domain: 'salesforce.com', page: 'Pipeline', route: '/pipeline' }),
        makeEvent('pipeline-e5', 'system.toast_shown', T + 25_000, S, { label: '42 Deals Found', app: 'Salesforce', domain: 'salesforce.com', page: 'Pipeline', route: '/pipeline', actor: 'system' }),
        makeEvent('pipeline-e6', 'interaction.click', T + 38_000, S, { label: 'Export to CSV', app: 'Salesforce', domain: 'salesforce.com', page: 'Pipeline', route: '/pipeline' }),
        makeEvent('pipeline-e7', 'system.toast_shown', T + 42_000, S, { label: 'Export Downloaded', app: 'Salesforce', domain: 'salesforce.com', page: 'Pipeline', route: '/pipeline', actor: 'system' }),
        makeEvent('pipeline-e8', 'navigation.open_page', T + 60_000, S, { label: 'Google Sheets', app: 'Google Sheets', domain: 'docs.google.com', page: 'Pipeline Tracker', route: '/spreadsheets/d/pipeline-tracker', actor: 'human' }),
        makeEvent('pipeline-e9', 'interaction.click', T + 70_000, S, { label: 'Select Sheet Tab', app: 'Google Sheets', domain: 'docs.google.com', page: 'Pipeline Tracker', route: '/spreadsheets/d/pipeline-tracker' }),
        makeEvent('pipeline-e10', 'interaction.click', T + 78_000, S, { label: 'Paste Data', app: 'Google Sheets', domain: 'docs.google.com', page: 'Pipeline Tracker', route: '/spreadsheets/d/pipeline-tracker' }),
        makeEvent('pipeline-e11', 'interaction.click', T + 95_000, S, { label: 'Format as Table', app: 'Google Sheets', domain: 'docs.google.com', page: 'Pipeline Tracker', route: '/spreadsheets/d/pipeline-tracker' }),
        makeEvent('pipeline-e12', 'interaction.click', T + 110_000, S, { label: 'Apply Conditional Formatting', app: 'Google Sheets', domain: 'docs.google.com', page: 'Pipeline Tracker', route: '/spreadsheets/d/pipeline-tracker' }),
        makeEvent('pipeline-e13', 'interaction.click', T + 130_000, S, { label: 'Share', app: 'Google Sheets', domain: 'docs.google.com', page: 'Pipeline Tracker', route: '/spreadsheets/d/pipeline-tracker' }),
        makeEvent('pipeline-e14', 'interaction.input_change', T + 138_000, S, { label: 'Add People', app: 'Google Sheets', domain: 'docs.google.com', page: 'Share Dialog', route: '/spreadsheets/d/pipeline-tracker/share' }),
        makeEvent('pipeline-e15', 'interaction.submit', T + 148_000, S, { label: 'Send', app: 'Google Sheets', domain: 'docs.google.com', page: 'Share Dialog', route: '/spreadsheets/d/pipeline-tracker/share' }),
        makeEvent('pipeline-e16', 'system.toast_shown', T + 149_000, S, { label: 'Shared with Team', app: 'Google Sheets', domain: 'docs.google.com', page: 'Pipeline Tracker', route: '/spreadsheets/d/pipeline-tracker', actor: 'system' }),
      ],
      derivedSteps: [
        makeStep(1, 'Open Salesforce pipeline view', 'navigation', 0.90, ['pipeline-e1'], T, T + 10_000, 10_000, 'salesforce.com', 'Salesforce', '/pipeline', 'navigation_changed', S),
        makeStep(2, 'Filter pipeline for Q2 deals', 'fill_and_submit', 0.87, ['pipeline-e2', 'pipeline-e3', 'pipeline-e4', 'pipeline-e5'], T + 10_000, T + 25_000, 15_000, 'salesforce.com', 'Salesforce', '/pipeline', 'form_submitted', S),
        makeStep(3, 'Export pipeline report to CSV', 'click_action', 0.89, ['pipeline-e6', 'pipeline-e7'], T + 38_000, T + 42_000, 4_000, 'salesforce.com', 'Salesforce', '/pipeline', 'app_context_changed', S),
        makeStep(4, 'Open pipeline tracker in Google Sheets', 'navigation', 0.84, ['pipeline-e8', 'pipeline-e9'], T + 60_000, T + 70_000, 10_000, 'docs.google.com', 'Google Sheets', '/spreadsheets/d/pipeline-tracker', 'navigation_changed', S),
        makeStep(5, 'Paste data and apply formatting', 'click_action', 0.86, ['pipeline-e10', 'pipeline-e11', 'pipeline-e12'], T + 78_000, T + 112_000, 34_000, 'docs.google.com', 'Google Sheets', '/spreadsheets/d/pipeline-tracker', 'formatting_complete', S),
        makeStep(6, 'Share updated tracker with team', 'fill_and_submit', 0.93, ['pipeline-e13', 'pipeline-e14', 'pipeline-e15', 'pipeline-e16'], T + 130_000, T + 149_000, 19_000, 'docs.google.com', 'Google Sheets', '/spreadsheets/d/pipeline-tracker/share', 'session_stop', S),
      ],
      manifest: {
        sessionId: S,
        schemaVersion: '1.0.0',
        segmentationRuleVersion: '1.0.0',
        normalizationRuleVersion: '1.0.0',
      },
      policyLog: [],
    },
  };
}

// ─── Variant: Process Customer Refund (2nd recording) ───────────────────────

const REFUND2_TITLE = 'Process Customer Refund (Case #10507)';
const REFUND2_SESSION = 'demo-refund-002';
const REFUND2_NOW = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago

function buildRefundVariantBundle() {
  const T = REFUND2_NOW;
  const S = REFUND2_SESSION;
  return {
    title: REFUND2_TITLE,
    sessionId: S,
    bundle: {
      sessionJson: {
        sessionId: S,
        activityName: REFUND2_TITLE,
        startedAt: new Date(T).toISOString(),
        endedAt: new Date(T + 105_000).toISOString(),
        schemaVersion: '1.0.0',
        recorderVersion: '0.1.1',
      },
      normalizedEvents: [
        makeEvent('refund2-e1', 'navigation.open_page', T, S, { label: 'Cases', app: 'Salesforce', domain: 'salesforce.com', page: 'Cases', route: '/cases', actor: 'human' }),
        makeEvent('refund2-e2', 'interaction.click', T + 2_500, S, { label: 'Open Case #10507', app: 'Salesforce', domain: 'salesforce.com', page: 'Cases', route: '/cases' }),
        makeEvent('refund2-e3', 'navigation.open_page', T + 3_200, S, { label: 'Case Detail', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10507', route: '/cases/10507', actor: 'system' }),
        makeEvent('refund2-e4', 'interaction.click', T + 15_000, S, { label: 'View Order', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10507', route: '/cases/10507' }),
        makeEvent('refund2-e5', 'navigation.open_page', T + 16_000, S, { label: 'Stripe Dashboard', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Payments', route: '/payments', actor: 'system' }),
        makeEvent('refund2-e6', 'interaction.click', T + 28_000, S, { label: 'Refund Payment', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Payment Detail', route: '/payments/pi_002' }),
        makeEvent('refund2-e7', 'interaction.input_change', T + 33_000, S, { label: 'Refund Amount', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Refund Dialog', route: '/payments/pi_002/refund' }),
        makeEvent('refund2-e8', 'interaction.submit', T + 40_000, S, { label: 'Confirm Refund', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Refund Dialog', route: '/payments/pi_002/refund' }),
        makeEvent('refund2-e9', 'system.toast_shown', T + 41_000, S, { label: 'Refund Issued', app: 'Stripe', domain: 'dashboard.stripe.com', page: 'Payment Detail', route: '/payments/pi_002', actor: 'system' }),
        makeEvent('refund2-e10', 'navigation.open_page', T + 52_000, S, { label: 'Case #10507', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10507', route: '/cases/10507', actor: 'human' }),
        makeEvent('refund2-e11', 'interaction.click', T + 64_000, S, { label: 'Edit Status', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10507', route: '/cases/10507' }),
        makeEvent('refund2-e12', 'interaction.input_change', T + 68_000, S, { label: 'Status', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10507', route: '/cases/10507/edit' }),
        makeEvent('refund2-e13', 'interaction.submit', T + 73_000, S, { label: 'Save', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10507', route: '/cases/10507/edit' }),
        makeEvent('refund2-e14', 'system.toast_shown', T + 74_000, S, { label: 'Case Updated', app: 'Salesforce', domain: 'salesforce.com', page: 'Case #10507', route: '/cases/10507', actor: 'system' }),
      ],
      derivedSteps: [
        makeStep(1, 'Open case in Salesforce', 'click_then_navigate', 0.93, ['refund2-e1', 'refund2-e2', 'refund2-e3'], T, T + 3_200, 3_200, 'salesforce.com', 'Salesforce', '/cases/10507', 'navigation_changed', S),
        makeStep(2, 'Review order details', 'read_action', 0.90, ['refund2-e4'], T + 15_000, T + 16_000, 1_000, 'salesforce.com', 'Salesforce', '/cases/10507', 'app_context_changed', S),
        makeStep(3, 'Navigate to Stripe and locate payment', 'click_then_navigate', 0.89, ['refund2-e5', 'refund2-e6'], T + 16_000, T + 33_000, 17_000, 'dashboard.stripe.com', 'Stripe', '/payments/pi_002', 'navigation_changed', S),
        makeStep(4, 'Process refund in Stripe', 'fill_and_submit', 0.95, ['refund2-e7', 'refund2-e8', 'refund2-e9'], T + 33_000, T + 41_000, 8_000, 'dashboard.stripe.com', 'Stripe', '/payments/pi_002/refund', 'form_submitted', S),
        makeStep(5, 'Return to Salesforce', 'navigation', 0.85, ['refund2-e10'], T + 52_000, T + 52_000, 0, 'salesforce.com', 'Salesforce', '/cases/10507', 'app_context_changed', S),
        makeStep(6, 'Update case status to Resolved', 'fill_and_submit', 0.92, ['refund2-e11', 'refund2-e12', 'refund2-e13', 'refund2-e14'], T + 64_000, T + 74_000, 10_000, 'salesforce.com', 'Salesforce', '/cases/10507/edit', 'session_stop', S),
      ],
      manifest: { sessionId: S, schemaVersion: '1.0.0', segmentationRuleVersion: '1.0.0', normalizationRuleVersion: '1.0.0' },
      policyLog: [],
    },
  };
}

// ─── Variant: Submit Monthly Expense Report (2nd recording) ─────────────────

const EXPENSE2_TITLE = 'Submit Monthly Expense Report (April)';
const EXPENSE2_SESSION = 'demo-expense-002';
const EXPENSE2_NOW = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago

function buildExpenseVariantBundle() {
  const T = EXPENSE2_NOW;
  const S = EXPENSE2_SESSION;
  return {
    title: EXPENSE2_TITLE,
    sessionId: S,
    bundle: {
      sessionJson: {
        sessionId: S,
        activityName: EXPENSE2_TITLE,
        startedAt: new Date(T).toISOString(),
        endedAt: new Date(T + 85_000).toISOString(),
        schemaVersion: '1.0.0',
        recorderVersion: '0.1.1',
      },
      normalizedEvents: [
        makeEvent('expense2-e1', 'navigation.open_page', T, S, { label: 'Expenses', app: 'Workday', domain: 'workday.com', page: 'Expenses', route: '/expenses', actor: 'human' }),
        makeEvent('expense2-e2', 'interaction.click', T + 4_000, S, { label: 'Create New Report', app: 'Workday', domain: 'workday.com', page: 'Expenses', route: '/expenses' }),
        makeEvent('expense2-e3', 'navigation.open_page', T + 5_000, S, { label: 'New Report', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new', actor: 'system' }),
        makeEvent('expense2-e4', 'interaction.input_change', T + 12_000, S, { label: 'Report Title', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense2-e5', 'interaction.input_change', T + 20_000, S, { label: 'Expense Category', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense2-e6', 'interaction.input_change', T + 28_000, S, { label: 'Amount', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense2-e7', 'interaction.input_change', T + 36_000, S, { label: 'Date', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense2-e8', 'interaction.click', T + 50_000, S, { label: 'Upload Receipt', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense2-e9', 'system.toast_shown', T + 56_000, S, { label: 'Receipt Uploaded', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new', actor: 'system' }),
        makeEvent('expense2-e10', 'interaction.submit', T + 68_000, S, { label: 'Submit for Approval', app: 'Workday', domain: 'workday.com', page: 'New Expense Report', route: '/expenses/new' }),
        makeEvent('expense2-e11', 'system.toast_shown', T + 70_000, S, { label: 'Report Submitted', app: 'Workday', domain: 'workday.com', page: 'Expenses', route: '/expenses', actor: 'system' }),
      ],
      derivedSteps: [
        makeStep(1, 'Navigate to expenses', 'navigation', 0.91, ['expense2-e1'], T, T + 4_000, 4_000, 'workday.com', 'Workday', '/expenses', 'navigation_changed', S),
        makeStep(2, 'Create new expense report', 'click_then_navigate', 0.88, ['expense2-e2', 'expense2-e3'], T + 4_000, T + 5_000, 1_000, 'workday.com', 'Workday', '/expenses/new', 'navigation_changed', S),
        makeStep(3, 'Fill expense details', 'fill_and_submit', 0.90, ['expense2-e4', 'expense2-e5', 'expense2-e6', 'expense2-e7'], T + 12_000, T + 36_000, 24_000, 'workday.com', 'Workday', '/expenses/new', 'form_section_complete', S),
        makeStep(4, 'Attach receipt', 'click_action', 0.86, ['expense2-e8', 'expense2-e9'], T + 50_000, T + 56_000, 6_000, 'workday.com', 'Workday', '/expenses/new', 'file_uploaded', S),
        makeStep(5, 'Submit for approval', 'send_action', 0.94, ['expense2-e10', 'expense2-e11'], T + 68_000, T + 70_000, 2_000, 'workday.com', 'Workday', '/expenses/new', 'session_stop', S),
      ],
      manifest: { sessionId: S, schemaVersion: '1.0.0', segmentationRuleVersion: '1.0.0', normalizationRuleVersion: '1.0.0' },
      policyLog: [],
    },
  };
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function makeEvent(
  id: string,
  type: string,
  tMs: number,
  sessionId: string,
  opts: { label: string; app: string; domain: string; page: string; route: string; actor?: string },
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
  sessionId: string,
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
