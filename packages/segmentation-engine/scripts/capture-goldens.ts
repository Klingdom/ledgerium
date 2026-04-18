/**
 * Golden fixture capture script.
 *
 * Run ONCE before any convergence changes to capture the current output
 * of LiveStepBuilder and buildDerivedSteps as JSON fixtures.
 *
 * This script is NOT a test — it's a one-time capture tool.
 * Output goes to packages/segmentation-engine/fixtures/
 *
 * Usage: pnpm tsx scripts/capture-goldens.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Fixture event definitions — these are CanonicalEvent-compatible objects
// ---------------------------------------------------------------------------

const SESSION = 'test-session-golden'

type PageCtx = {
  url: string; urlNormalized: string; domain: string;
  routeTemplate: string; pageTitle: string; applicationLabel: string;
}

type TargetSummary = {
  label?: string; role?: string; elementType?: string;
  selector?: string; isSensitive: boolean;
}

type CanonicalEvent = {
  event_id: string; schema_version: '1.0.0'; session_id: string;
  t_ms: number; t_wall: string; event_type: string;
  actor_type: 'human' | 'system' | 'recorder';
  page_context?: PageCtx;
  target_summary?: TargetSummary;
  annotation_text?: string;
  normalization_meta: {
    sourceEventId: string; sourceEventType: string;
    normalizationRuleVersion: string; redactionApplied: boolean;
  };
}

function e(
  id: string, t: number, type: string,
  opts: {
    actor?: 'human' | 'system'; domain?: string; pageTitle?: string;
    label?: string; selector?: string; elementType?: string;
    route?: string; appLabel?: string; annotation?: string;
  } = {}
): CanonicalEvent {
  const domain = opts.domain ?? 'app.example.com'
  const appLabel = opts.appLabel ?? 'App'
  const route = opts.route ?? '/page'
  return {
    event_id: id,
    schema_version: '1.0.0',
    session_id: SESSION,
    t_ms: t,
    t_wall: '2026-01-01T00:00:00Z',
    event_type: type,
    actor_type: opts.actor ?? 'human',
    page_context: {
      url: `https://${domain}/page`,
      urlNormalized: `https://${domain}/page`,
      domain,
      routeTemplate: route,
      pageTitle: opts.pageTitle ?? 'Page',
      applicationLabel: appLabel,
    },
    target_summary: opts.label !== undefined || opts.selector !== undefined || opts.elementType !== undefined
      ? {
          label: opts.label,
          selector: opts.selector,
          elementType: opts.elementType,
          isSensitive: false,
        }
      : undefined,
    ...(opts.annotation ? { annotation_text: opts.annotation } : {}),
    normalization_meta: {
      sourceEventId: id,
      sourceEventType: type,
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
  }
}

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

const fixtures: Record<string, CanonicalEvent[]> = {

  'demo': [
    e('d1', 1000, 'interaction.click', { label: 'Inbox', selector: '#inbox' }),
    e('d2', 2000, 'navigation.open_page', { actor: 'system', pageTitle: 'Inbox' }),
    e('d3', 5000, 'interaction.input_change', { label: 'To', selector: '#to' }),
    e('d4', 6000, 'interaction.input_change', { label: 'Subject', selector: '#subject' }),
    e('d5', 7000, 'interaction.input_change', { label: 'Body', selector: '#body' }),
    e('d6', 8000, 'interaction.click', { label: 'Send', selector: '#send-btn' }),
    e('d7', 10000, 'interaction.click', { label: 'Other' }),
  ],

  'spreadsheet-cells': [
    e('s1', 1000, 'interaction.input_change', { label: 'A16', selector: '#waffle-editor' }),
    e('s2', 4500, 'interaction.input_change', { label: 'B16', selector: '#waffle-editor' }),
    e('s3', 8000, 'interaction.input_change', { label: 'C16', selector: '#waffle-editor' }),
  ],

  'action-button-then-other': [
    e('ab1', 1000, 'interaction.input_change', { label: 'Body', selector: '#body' }),
    e('ab2', 2000, 'interaction.click', { label: 'Save', selector: '#save-btn' }),
    e('ab3', 5000, 'interaction.click', { label: 'Other', selector: '#other-btn' }),
  ],

  'action-button-rapid-repeat': [
    e('ar1', 1000, 'interaction.input_change', { label: 'Body', selector: '#body' }),
    e('ar2', 2000, 'interaction.click', { label: 'Save', selector: '#save-btn' }),
    e('ar3', 2500, 'interaction.click', { label: 'Save', selector: '#save-btn' }),
  ],

  'annotation-mid-stream': [
    e('am1', 1000, 'interaction.click', { label: 'Link', selector: '#link' }),
    e('am2', 2000, 'session.annotation_added', { annotation: 'Note the process here' }),
    e('am3', 3000, 'interaction.click', { label: 'Continue', selector: '#continue' }),
  ],

  'idle-gap': [
    e('ig1', 1000, 'interaction.click', { label: 'First', selector: '#first' }),
    e('ig2', 50000, 'interaction.click', { label: 'Second', selector: '#second' }),
  ],

  'multi-domain-tabs': [
    e('md1', 1000, 'interaction.click', { label: 'Email', domain: 'mail.google.com', appLabel: 'Gmail' }),
    e('md2', 2000, 'interaction.click', { label: 'Doc', domain: 'docs.google.com', appLabel: 'Docs' }),
  ],

  'spa-route-change': [
    e('rc1', 1000, 'interaction.click', { label: 'Orders', selector: '#orders' }),
    e('rc2', 2000, 'navigation.route_change', { actor: 'system', route: '/orders', pageTitle: 'Orders' }),
    e('rc3', 3000, 'interaction.click', { label: 'New Order', selector: '#new-order' }),
  ],

  'error-recovery': [
    e('er1', 1000, 'system.error_displayed', { actor: 'system' }),
    e('er2', 1500, 'interaction.click', { label: 'OK', selector: '#ok-btn' }),
  ],

  'fill-and-submit': [
    e('fs1', 1000, 'interaction.input_change', { label: 'Name', selector: '#name' }),
    e('fs2', 2000, 'interaction.input_change', { label: 'Email', selector: '#email' }),
    e('fs3', 3000, 'interaction.submit', { label: 'Submit Form', selector: '#form' }),
  ],

  'single-action-no-label': [
    e('sa1', 1000, 'interaction.click', {}),
  ],

  'empty-session': [],
}

// ---------------------------------------------------------------------------
// Main capture logic — MUST be run against UNMODIFIED source files
// ---------------------------------------------------------------------------

async function main() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const root = join(__dirname, '..')

  const goldenDir = join(root, 'fixtures', 'golden')
  const liveDir = join(root, 'fixtures', 'expected', 'live')
  const derivedDir = join(root, 'fixtures', 'expected', 'derived')

  mkdirSync(goldenDir, { recursive: true })
  mkdirSync(liveDir, { recursive: true })
  mkdirSync(derivedDir, { recursive: true })

  // Dynamic imports to capture the CURRENT (pre-convergence) implementations
  // We can't import from the extension directly from a package script, so
  // we capture derived steps using the canonical approach implemented inline
  // here — this is just for scripted golden capture.

  // NOTE: This script captures from the PACKAGE batch segmenter for derived
  // goldens, because after convergence the package batch segmenter IS the
  // authority. The regression is: convergence must not change what the package
  // batch segmenter outputs.
  //
  // For live goldens, we need to capture from the current LiveStepBuilder.
  // However, since LiveStepBuilder is in the extension app, we manually
  // encode what it would produce for each fixture — OR we simply write the
  // regression tests to compare PACKAGE streaming vs PACKAGE batch, not
  // vs the old LiveStepBuilder (which is the design doc's real intent for
  // convergence-live.regression.test.ts).

  console.log('Note: Use the test files directly to capture goldens via the test runner.')
  console.log('This script is a reference — see convergence tests for actual fixture capture.')
}

main().catch(console.error)
