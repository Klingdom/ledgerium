import { db } from '@/db';
import { runProcessEngine, buildWorkflowReportFromOutput } from '@/lib/ingestion';
import { clusterWorkflows } from '@/lib/intelligence';

/**
 * Sample VARIANT set seeding — a demo of the Process Variants tab.
 *
 * Creates ONE process ("Approve Expense Report") recorded 16 different ways,
 * so the Variants tab shows its full feature set: a standard-path spine,
 * branches that peel off and rejoin (an extra clarification step, a manager-
 * review gate, a reject/resubmit rework loop, a shortcut, an exception-heavy
 * path), the Variant DNA strip, the complexity slider, and the click-a-branch
 * evidence drill.
 *
 * 6 distinct variants:
 *  1. STANDARD        — the dominant happy path (5 steps, ×5 runs)
 *  2. INSERTION_A     — "Request clarification" inserted before Approve (6 steps, ×3 runs)
 *  3. INSERTION_B     — "Manager review" gate inserted after Approve (6 steps, ×2 runs)
 *  4. SHORTCUT        — auto-notification skips the Notify step (4 steps, ×2 runs)
 *  5. REWORK          — report rejected and resubmitted once (7 steps, ×2 runs)
 *  6. EXCEPTION       — notification failure triggers error-handling + escalation (7 steps, ×2 runs)
 *
 * Total: 16 recordings, 6 variants, ≥3 story-map branches.
 *
 * Deterministic (fixed timestamps) and idempotent: no-ops if the set already
 * exists. Triggered via POST /api/sample-variants (and a dashboard button).
 */

export const SAMPLE_VARIANTS_TITLE = 'Approve Expense Report (Sample)';

const APP = 'Concur';
const DOMAIN = 'concur.example.com';
const ROUTE = '/expense/report';
const BASE_NOW = 1_700_100_000_000; // fixed; distinct from the PO sample's NOW

interface Step {
  title: string;
  category: string; // GroupingReason
  durationMs: number;
}

// ── Variant 1: Standard path (most runs follow this) ─────────────────────────
// click_then_navigate → data_entry → fill_and_submit → send_action → single_action
const STANDARD: Step[] = [
  { title: 'Open expense report', category: 'click_then_navigate', durationMs: 1500 },
  { title: 'Review line items', category: 'data_entry', durationMs: 8000 },
  { title: 'Approve report', category: 'fill_and_submit', durationMs: 4000 },
  { title: 'Notify employee', category: 'send_action', durationMs: 2000 },
  { title: 'Archive to records', category: 'single_action', durationMs: 1000 },
];

// ── Variant 2: Insertion A — Request clarification before approval ─────────────
// click_then_navigate → data_entry → single_action → fill_and_submit → send_action → single_action
// Branch diverges after data_entry, inserts a single_action clarification step,
// then rejoins at fill_and_submit. 6-step path.
const INSERTION_A: Step[] = [
  { title: 'Open expense report', category: 'click_then_navigate', durationMs: 1500 },
  { title: 'Review line items', category: 'data_entry', durationMs: 8000 },
  { title: 'Request clarification', category: 'single_action', durationMs: 5000 },
  { title: 'Approve report', category: 'fill_and_submit', durationMs: 4000 },
  { title: 'Notify employee', category: 'send_action', durationMs: 2000 },
  { title: 'Archive to records', category: 'single_action', durationMs: 1000 },
];

// ── Variant 3: Insertion B — Manager review gate after approval ────────────────
// click_then_navigate → data_entry → fill_and_submit → single_action → send_action → single_action
// Branch diverges after fill_and_submit, inserts a single_action manager-review
// step, then rejoins at send_action. 6-step path.
const INSERTION_B: Step[] = [
  { title: 'Open expense report', category: 'click_then_navigate', durationMs: 1500 },
  { title: 'Review line items', category: 'data_entry', durationMs: 9000 },
  { title: 'Approve report', category: 'fill_and_submit', durationMs: 4000 },
  { title: 'Escalate to manager for sign-off', category: 'single_action', durationMs: 7000 },
  { title: 'Notify employee', category: 'send_action', durationMs: 2000 },
  { title: 'Archive to records', category: 'single_action', durationMs: 1000 },
];

// ── Variant 4: Shortcut — auto-notification skips the Notify step ─────────────
// click_then_navigate → data_entry → fill_and_submit → single_action
// 4-step path; fastest overall duration.
const SHORTCUT: Step[] = [
  { title: 'Open expense report', category: 'click_then_navigate', durationMs: 1400 },
  { title: 'Review line items', category: 'data_entry', durationMs: 7000 },
  { title: 'Approve report', category: 'fill_and_submit', durationMs: 3500 },
  { title: 'Archive to records', category: 'single_action', durationMs: 900 },
];

// ── Variant 5: Rework loop — report rejected and resubmitted ──────────────────
// click_then_navigate → data_entry → fill_and_submit → data_entry → fill_and_submit → send_action → single_action
// Reviewer rejects the report; employee updates and resubmits before approval.
// 7-step path (longer than standard by 2 steps); longer duration.
const REWORK: Step[] = [
  { title: 'Open expense report', category: 'click_then_navigate', durationMs: 1500 },
  { title: 'Review line items', category: 'data_entry', durationMs: 8500 },
  { title: 'Flag for rework', category: 'fill_and_submit', durationMs: 2000 },
  { title: 'Employee updates report', category: 'data_entry', durationMs: 10000 },
  { title: 'Approve revised report', category: 'fill_and_submit', durationMs: 4000 },
  { title: 'Notify employee', category: 'send_action', durationMs: 2000 },
  { title: 'Archive to records', category: 'single_action', durationMs: 1000 },
];

// ── Variant 6: Exception — notification failure, retry, and escalation ─────────
// click_then_navigate → data_entry → fill_and_submit → error_handling → error_handling → send_action → single_action
// Two error_handling steps make this the "Exception Heavy", longest-duration path.
const EXCEPTION: Step[] = [
  { title: 'Open expense report', category: 'click_then_navigate', durationMs: 1500 },
  { title: 'Review line items', category: 'data_entry', durationMs: 8500 },
  { title: 'Approve report', category: 'fill_and_submit', durationMs: 4000 },
  { title: 'Notification failed — retry', category: 'error_handling', durationMs: 4500 },
  { title: 'Escalate to manager', category: 'error_handling', durationMs: 4500 },
  { title: 'Notify employee', category: 'send_action', durationMs: 2000 },
  { title: 'Archive to records', category: 'single_action', durationMs: 1000 },
];

// 16 recordings:
//   standard ×5 (dominant: ~31% frequency)
//   insertion_a ×3 (clarification before approve)
//   insertion_b ×2 (manager review after approve)
//   shortcut ×2    (fastest path — skips notify)
//   rework ×2      (reject + resubmit loop)
//   exception ×2   (error_handling ×2 — exception heavy, longest path)
//
// `jitter` varies the Review step (index 1) for realistic per-run duration spread.
const RECORDINGS: { variant: Step[]; jitter: number }[] = [
  // Standard path × 5
  { variant: STANDARD, jitter: 0 },
  { variant: STANDARD, jitter: 600 },
  { variant: STANDARD, jitter: -400 },
  { variant: STANDARD, jitter: 1200 },
  { variant: STANDARD, jitter: -200 },
  // Insertion A (clarification) × 3
  { variant: INSERTION_A, jitter: 0 },
  { variant: INSERTION_A, jitter: 500 },
  { variant: INSERTION_A, jitter: 800 },
  // Insertion B (manager review) × 2
  { variant: INSERTION_B, jitter: 0 },
  { variant: INSERTION_B, jitter: 600 },
  // Shortcut × 2
  { variant: SHORTCUT, jitter: 0 },
  { variant: SHORTCUT, jitter: 300 },
  // Rework loop × 2
  { variant: REWORK, jitter: 0 },
  { variant: REWORK, jitter: 1000 },
  // Exception × 2
  { variant: EXCEPTION, jitter: 0 },
  { variant: EXCEPTION, jitter: -300 },
];

export interface EnsureSampleVariantsResult {
  id: string;
  created: boolean;
  count: number;
}

/**
 * Ensure the user has the built-in sample VARIANT set. Idempotent; never throws.
 * Returns the primary (first) workflow id, whether newly created, and the count.
 */
export async function ensureSampleVariants(userId: string): Promise<EnsureSampleVariantsResult | null> {
  try {
    const existing = await db.workflow.findFirst({
      where: { userId, title: SAMPLE_VARIANTS_TITLE },
      select: { id: true },
    });
    if (existing) {
      const count = await db.workflow.count({ where: { userId, title: SAMPLE_VARIANTS_TITLE } });
      return { id: existing.id, created: false, count };
    }

    let primaryId: string | null = null;
    const bundles = buildSampleVariantBundles();

    for (const bundle of bundles) {
      const sessionId = bundle.sessionJson.sessionId;
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
          title: SAMPLE_VARIANTS_TITLE,
          toolsUsed: JSON.stringify(processOutput.processMap.systems),
          durationMs: processOutput.processRun.durationMs ?? 0,
          stepCount: processOutput.processRun.stepCount,
          phaseCount: processOutput.processMap.phases.length,
          confidence,
          status: 'active',
          sessionId,
        },
      });
      if (!primaryId) primaryId = workflow.id;

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

    }

    // Group + compute intelligence (BEST-EFFORT) so the dashboard shows the runs
    // grouped. The Variants tab also gathers the 16 via read-time similarity, so a
    // slow/failed clusterWorkflows on a large portfolio must NOT block the seed —
    // the 16 workflows are already persisted above.
    try {
      await clusterWorkflows(userId);
    } catch (err) {
      console.warn('[ensureSampleVariants] clusterWorkflows failed (non-fatal)', (err as Error)?.message);
    }

    return primaryId ? { id: primaryId, created: true, count: RECORDINGS.length } : null;
  } catch (err) {
    console.error('[ensureSampleVariants] failed for user', userId, (err as Error)?.message);
    return null;
  }
}

// ─── Bundle builders ─────────────────────────────────────────────────────────

/**
 * Build the 16 deterministic recording bundles (exported for tests). Each
 * carries its sessionId in sessionJson; recordings are spaced one day apart.
 */
export function buildSampleVariantBundles() {
  let startMs = BASE_NOW;
  return RECORDINGS.map((rec, i) => {
    const sessionId = `sample-variants-${String(i + 1).padStart(3, '0')}`;
    // Apply jitter to the Review step (index 1) for realistic per-run spread.
    const steps = rec.variant.map((s, idx) =>
      idx === 1 ? { ...s, durationMs: Math.max(1000, s.durationMs + rec.jitter) } : s,
    );
    const bundle = buildBundle(sessionId, steps, startMs);
    startMs += 24 * 60 * 60 * 1000;
    return bundle;
  });
}

function buildBundle(sessionId: string, steps: Step[], startMs: number) {
  let t = startMs;
  const events: ReturnType<typeof makeEvent>[] = [];
  const derived: ReturnType<typeof makeStep>[] = [];

  steps.forEach((s, i) => {
    const eid = `${sessionId}-e${i + 1}`;
    events.push(makeEvent(eid, sessionId, t, s.title));
    derived.push(makeStep(sessionId, i + 1, s.title, s.category, [eid], t, t + s.durationMs, s.durationMs));
    t += s.durationMs + 500;
  });

  return {
    sessionJson: {
      sessionId,
      activityName: SAMPLE_VARIANTS_TITLE,
      startedAt: new Date(startMs).toISOString(),
      endedAt: new Date(t).toISOString(),
      schemaVersion: '1.0.0',
      recorderVersion: '0.1.1',
    },
    normalizedEvents: events,
    derivedSteps: derived,
    manifest: {
      sessionId,
      schemaVersion: '1.0.0',
      segmentationRuleVersion: '1.0.0',
      normalizationRuleVersion: '1.0.0',
    },
    policyLog: [],
  };
}

function makeEvent(id: string, sessionId: string, tMs: number, label: string) {
  return {
    event_id: id,
    session_id: sessionId,
    t_ms: tMs,
    t_wall: new Date(tMs).toISOString(),
    event_type: 'interaction.click',
    actor_type: 'human' as const,
    page_context: {
      url: `https://${DOMAIN}${ROUTE}`,
      urlNormalized: `https://${DOMAIN}${ROUTE}`,
      domain: DOMAIN,
      routeTemplate: ROUTE,
      pageTitle: 'Expense Report',
      applicationLabel: APP,
    },
    target_summary: {
      label,
      role: 'button',
      isSensitive: false,
    },
    normalization_meta: {
      sourceEventId: id,
      sourceEventType: 'interaction.click',
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
  };
}

function makeStep(
  sessionId: string,
  ordinal: number,
  title: string,
  groupingReason: string,
  eventIds: string[],
  startMs: number,
  endMs: number,
  durationMs: number,
) {
  return {
    step_id: `${sessionId}-step-${ordinal}`,
    session_id: sessionId,
    ordinal,
    title,
    status: 'finalized' as const,
    boundary_reason: 'navigation_changed',
    grouping_reason: groupingReason,
    confidence: 0.9,
    source_event_ids: eventIds,
    start_t_ms: startMs,
    end_t_ms: endMs,
    duration_ms: durationMs,
    page_context: {
      domain: DOMAIN,
      applicationLabel: APP,
      routeTemplate: ROUTE,
    },
  };
}
