/**
 * demoSopFixture — static SOP data for the "Approve Expense Report" HERO workflow.
 *
 * This is plain JSON-compatible data only.
 * No server imports, no engine calls, no Math.random(), no Date.now().
 *
 * Shape matches the raw SOP output consumed by buildSOPViewModel / SOPPageShell.
 * All required fields per sopViewModel.ts are present; optional fields degrade
 * gracefully when absent.
 */

export const DEMO_SOP = {
  sopId: 'demo-01-approve-expense-report',
  title: 'Approve Expense Report',
  businessObjective:
    'Ensure all submitted expense reports are reviewed, approved, and archived within the finance system.',
  purpose:
    'Standardise the expense approval flow across Concur and Slack to reduce approval lag and submission errors.',
  scope: 'All expense submissions requiring manager approval above $50.',
  trigger: 'Expense report submitted in Concur and Slack approval request received.',
  estimatedTime: '2–4 minutes',
  version: '1.0',
  generatedAt: '2023-10-15T10:00:00Z',
  systems: ['Concur', 'Slack'],
  roles: ['Finance Manager', 'Employee'],
  prerequisites: ['Concur account with approver permissions', 'Slack workspace access'],
  completionCriteria: ['Expense report status updated to Approved in Concur', 'Employee notified via Slack'],
  frictionSummary: [
    {
      type: 'delay',
      description: 'Review of line items takes longer when receipts are missing',
      stepOrdinal: 3,
    },
  ],
  commonIssues: [
    {
      issue: 'Missing receipt attachments cause approval delays',
      resolution: 'Request re-submission from employee before approving',
      frequency: 'occasional',
    },
  ],
  qualityIndicators: {
    averageConfidence: 0.87,
    isComplete: true,
    errorStepCount: 0,
    lowConfidenceStepCount: 1,
    qualityAdvisory: null,
  },
  steps: [
    {
      ordinal: 1,
      title: 'Open expense report notification in Slack',
      category: 'single_action',
      system: 'Slack',
      action: 'Click the approval request link in the Slack message',
      confidence: 0.92,
      frictionIndicators: [],
      instructions: [
        {
          sequence: 1,
          instruction: 'Open the Slack message containing the expense approval request',
          instructionType: 'action',
          system: 'Slack',
          targetLabel: 'Expense approval notification',
          isSensitive: false,
        },
        {
          sequence: 2,
          instruction: 'Click the View Expense Report link',
          instructionType: 'action',
          system: 'Slack',
          targetLabel: 'View Expense Report',
          isSensitive: false,
        },
      ],
    },
    {
      ordinal: 2,
      title: 'Log in to Concur',
      category: 'navigation',
      system: 'Concur',
      action: 'Authenticate and navigate to the expense report',
      confidence: 0.95,
      frictionIndicators: [],
      instructions: [
        {
          sequence: 1,
          instruction: 'Enter your SSO credentials if not already logged in',
          instructionType: 'action',
          system: 'Concur',
          targetLabel: 'SSO login',
          isSensitive: true,
        },
        {
          sequence: 2,
          instruction: 'Navigate to Expense → Approval Required',
          instructionType: 'action',
          system: 'Concur',
          targetLabel: 'Approval Required queue',
          isSensitive: false,
        },
      ],
    },
    {
      ordinal: 3,
      title: 'Review line items and receipts',
      category: 'verification',
      system: 'Concur',
      action: 'Check each line item against policy and confirm receipts are attached',
      confidence: 0.81,
      frictionIndicators: [
        {
          type: 'delay',
          description: 'Missing receipts require back-and-forth with the employee',
        },
      ],
      instructions: [
        {
          sequence: 1,
          instruction: 'Open each expense line and verify the amount, date, and category',
          instructionType: 'verify',
          system: 'Concur',
          targetLabel: 'Expense line items',
          isSensitive: false,
        },
        {
          sequence: 2,
          instruction: 'Check that a receipt image is attached for amounts over $25',
          instructionType: 'verify',
          system: 'Concur',
          targetLabel: 'Receipt attachments',
          isSensitive: false,
        },
        {
          sequence: 3,
          instruction: 'Flag any out-of-policy items with a comment before proceeding',
          instructionType: 'note',
          system: 'Concur',
          targetLabel: 'Policy flag',
          isSensitive: false,
        },
      ],
    },
    {
      ordinal: 4,
      title: 'Approve or return the expense report',
      category: 'decision',
      system: 'Concur',
      action: 'Click Approve or Send Back to Employee',
      confidence: 0.94,
      frictionIndicators: [],
      instructions: [
        {
          sequence: 1,
          instruction: 'If all items are in policy: click Approve',
          instructionType: 'action',
          system: 'Concur',
          targetLabel: 'Approve button',
          isSensitive: false,
        },
        {
          sequence: 2,
          instruction: 'If items require correction: click Send Back and add a comment explaining what is needed',
          instructionType: 'action',
          system: 'Concur',
          targetLabel: 'Send Back button',
          isSensitive: false,
        },
      ],
    },
    {
      ordinal: 5,
      title: 'Confirm Slack notification sent to employee',
      category: 'verification',
      system: 'Slack',
      action: 'Verify the employee received an approval or rejection notification in Slack',
      confidence: 0.89,
      frictionIndicators: [],
      instructions: [
        {
          sequence: 1,
          instruction: 'Return to Slack and verify the Concur bot posted the approval status in the thread',
          instructionType: 'verify',
          system: 'Slack',
          targetLabel: 'Concur bot notification',
          isSensitive: false,
        },
      ],
    },
  ],
};
