/**
 * Shared axe assertion for accessibility specs.
 *
 * Extracted from `e2e/app/dashboard/v2-a11y.spec.ts` at loop 57, unchanged in
 * behaviour, because a second a11y spec was about to copy it. A duplicated
 * ratchet is worse than no ratchet: the two copies drift, and the one nobody
 * updated quietly stops enforcing while still looking like it does. This
 * codebase has already paid for that lesson twice — a duplicated standard
 * deviation and a duplicated trusted-hop parser, both in the last fortnight.
 *
 * Policy (PRD §10, iter 022 QA scope, DV2-R04 ratchet at iter 046):
 *  - FAIL on critical or serious violations — zero tolerance.
 *  - Moderate violations are logged AND ratcheted: the count must not exceed
 *    the baseline passed at the call site, so they cannot silently accumulate.
 *  - Minor violations are ignored (cosmetic, low user impact).
 */

import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Run axe against the current page and assert the policy above.
 *
 * @param page     Playwright page, already navigated and settled.
 * @param label    Appears in every failure message; make it identify the state.
 * @param maxModerate Ratchet baseline. Defaults to 0. Pass it explicitly at the
 *   call site so the baseline is visible where it applies; raising it requires
 *   changing that call site, which is the point.
 * @param scope   CSS selector axe is scoped to. Defaults to 'main' (unchanged
 *   behaviour). Narrow it only to isolate one surface from a known, separately
 *   tracked defect elsewhere on the page — never to hide a violation in it.
 */
export async function assertAxeCompliance(
  page: Page,
  label: string,
  maxModerate: number = 0,
  scope: string = 'main',
): Promise<void> {
  const results = await new AxeBuilder({ page })
    // Scoped to <main> by default so a defect in the shared AppShell header
    // does not fail every surface's spec. The header is not unchecked: it has
    // its own scoped check in e2e/app/header-a11y.spec.ts (both themes, four
    // viewports), which is where a header violation should surface.
    .include(scope)
    .analyze();

  const critical = results.violations.filter((v) => v.impact === 'critical');
  const serious = results.violations.filter((v) => v.impact === 'serious');
  const moderate = results.violations.filter((v) => v.impact === 'moderate');

  if (moderate.length > 0) {
    const moderateReport = moderate
      .map((v) => `  [moderate] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
      .join('\n');
    console.warn(
      `\n[axe][${label}] ${moderate.length} MODERATE violation(s) — tracked, not blocking:\n${moderateReport}\n`,
    );
  }

  expect(
    moderate.length,
    `[axe][${label}] moderate violation count ${moderate.length} exceeds ratchet baseline ${maxModerate}. Either fix the new violation OR (if intentional) raise the baseline at the call site with a code-review note.`,
  ).toBeLessThanOrEqual(maxModerate);

  if (critical.length > 0) {
    const report = critical
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n  Help: ${v.helpUrl}\n  Nodes: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`,
      )
      .join('\n\n');
    expect.soft(critical.length, `[axe][${label}] CRITICAL violations:\n\n${report}`).toBe(0);
  }

  if (serious.length > 0) {
    const report = serious
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n  Help: ${v.helpUrl}\n  Nodes: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`,
      )
      .join('\n\n');
    expect.soft(serious.length, `[axe][${label}] SERIOUS violations:\n\n${report}`).toBe(0);
  }

  expect(
    critical.length + serious.length,
    `[axe][${label}] ${critical.length} critical + ${serious.length} serious violation(s) — see above`,
  ).toBe(0);
}
