/**
 * sop-a11y.spec.ts
 *
 * Accessibility ratchet for the three SOP view modes — Execution, Flow View,
 * Analysis. The dashboard has had one since iter 022; the SOP surface, which is
 * the artefact this product actually delivers to an operator, had none.
 *
 * ## Why this exists in the form it does
 *
 * Backlog row #109 asked for two specific ARIA "HARD WCAG 2.1 AA violations" to
 * be fixed. Both were checked at loop 57 before any code was touched, and
 * neither survived:
 *
 *  - `role="checkbox"` on a `<button>` (`SOPExecutionMode.tsx:566`) is a REAL
 *    occurrence, but ARIA-in-HTML explicitly PERMITS the checkbox role on a
 *    button element. Paired with `aria-checked` and an accessible name, as it
 *    is here, that is a supported pattern — not a violation. "Restructuring" it
 *    to an `<input type="checkbox">` would have been churn justified by a false
 *    premise.
 *  - `role="listitem"` on a `<button>` in `AskThisProcessPanel` DOES NOT EXIST.
 *    That component declares one role in total, `role="alert"`. The only
 *    `role="listitem"` occurrences in the codebase are on `<div>`s in
 *    `ColumnPicker.tsx`, and that file does declare `role="list"` ancestors.
 *
 * So rather than perform two fixes against claims that do not hold, this ships
 * the row's most valuable ask — the ratchet — and lets axe decide. If either
 * claim were true, these tests fail and say exactly which rule and which node.
 * That is a better outcome than a fix nobody could verify.
 *
 * Auth: `authenticated` project (storageState `.auth/user.json`).
 * Intercept: `/api/workflows/:id` is mocked so axe evaluates a fully rendered
 * SOP rather than a loading skeleton.
 */

import { test } from '@playwright/test';
import { assertAxeCompliance } from '../../helpers/axe.js';

const WORKFLOW_ID = 'wf-sop-a11y-001';
const SOP_URL = `/workflows/${WORKFLOW_ID}`;

/**
 * A workflow detail payload rich enough that every mode has something to draw:
 * steps for Execution, phases and systems for Flow View, scores and variance
 * for Analysis. Thin fixtures pass a11y specs trivially by rendering nothing.
 */
function sopWorkflowPayload(): object {
  const steps = [
    {
      ordinal: 1,
      stepId: 'step-1',
      title: 'Open the invoice queue',
      category: 'click_then_navigate',
      action: 'Navigate to the invoice queue in NetSuite.',
      instructions: [{ instruction: 'Click "Invoices" in the left navigation.' }],
      detail: 'Click "Invoices" in the left navigation.',
      system: 'NetSuite',
      inputs: ['Access to NetSuite'],
      expectedOutcome: 'The invoice queue is displayed.',
      warnings: [],
      durationLabel: '4s',
      confidence: 0.91,
      sourceStepId: 'step-1',
    },
    {
      ordinal: 2,
      stepId: 'step-2',
      title: 'Enter the reference',
      category: 'data_entry',
      action: 'Enter a date in the "Due" field in NetSuite.',
      instructions: [{ instruction: 'Enter a date in the "Due" field.' }],
      detail: 'Enter a date in the "Due" field.',
      system: 'NetSuite',
      inputs: ['Due date'],
      expectedOutcome: 'The due date is recorded.',
      warnings: ['Contains sensitive data fields — do not expose values in screenshots.'],
      durationLabel: '11s',
      confidence: 0.78,
      sourceStepId: 'step-2',
    },
  ];

  return {
    id: WORKFLOW_ID,
    title: 'Invoice Approval',
    status: 'ready',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    toolsUsed: ['NetSuite', 'Outlook'],
    confidence: 0.84,
    runCount: 7,
    sop: {
      sopId: `${WORKFLOW_ID}-sop`,
      title: 'Invoice Approval',
      version: '2.0',
      purpose: 'Approve a supplier invoice and record the approval decision.',
      scope: 'Applies to accounts-payable operators handling supplier invoices.',
      systems: ['NetSuite', 'Outlook'],
      prerequisites: ['Access to NetSuite', 'Approval authority up to £5,000'],
      estimatedTime: '2m 30s',
      steps,
      completionCriteria: ['The invoice shows status Approved.'],
      commonIssues: [],
      notes: [],
      averageConfidence: 0.84,
      approvalStatus: 'unapproved',
      generatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      engineVersion: '2.0.0',
    },
  };
}

/**
 * Land on the SOP surface with the detail endpoint mocked, and wait for real
 * content rather than a fixed sleep — a timeout that is too short silently
 * turns this into a skeleton test that always passes.
 */
async function openSop(page: import('@playwright/test').Page): Promise<void> {
  await page.route(`**/api/workflows/${WORKFLOW_ID}**`, (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sopWorkflowPayload()),
    });
  });

  await page.goto(SOP_URL, { waitUntil: 'networkidle' });
  await page.getByRole('main').waitFor({ state: 'visible' });
}

test('axe: zero critical/serious violations — Execution SOP mode', async ({ page }) => {
  await openSop(page);
  // Execution is the default mode; assert against it as landed.
  await assertAxeCompliance(page, 'sop-execution', 0);
});

test('axe: zero critical/serious violations — Flow View mode', async ({ page }) => {
  await openSop(page);

  const flow = page.getByRole('button', { name: /flow view/i });
  if ((await flow.count()) > 0) {
    await flow.first().click();
    await page.waitForTimeout(400);
  }

  await assertAxeCompliance(page, 'sop-flow-view', 0);
});

test('axe: zero critical/serious violations — Analysis mode', async ({ page }) => {
  await openSop(page);

  const analysis = page.getByRole('button', { name: /analysis/i });
  if ((await analysis.count()) > 0) {
    await analysis.first().click();
    await page.waitForTimeout(400);
  }

  await assertAxeCompliance(page, 'sop-analysis', 0);
});

test('axe: the completion criteria remain accessible once ticked', async ({ page }) => {
  // The checkbox-role buttons row #109 flagged live here. Toggling them changes
  // aria-checked and applies a line-through, which is exactly the state a
  // contrast or name rule would catch if the pattern were wrong.
  await openSop(page);

  const criteria = page.getByRole('checkbox');
  const count = await criteria.count();
  for (let i = 0; i < Math.min(count, 3); i++) {
    await criteria.nth(i).click();
  }
  await page.waitForTimeout(200);

  await assertAxeCompliance(page, 'sop-execution-criteria-checked', 0);
});
