/**
 * workflow-comparison — pure, deterministic before/after comparison + ROI for two
 * workflows (a "baseline" and an "after"). Powers the /compare view.
 *
 * The job-to-be-done: a process owner records a process, makes an improvement,
 * records it again, and needs THE number — "cycle time dropped 40%, saving ~X
 * hours/month" — defensible because BOTH sides are observed, not estimated.
 *
 * HONESTY CONTRACT (observed-only, evidence-linked):
 *  - Cycle time (`avgTimeMs`) is a per-workflow representative duration PROXY (no
 *    per-run duration array exists yet — Path C R+1). Labeled as such in the UI.
 *  - ROI is an explicit estimate: time-saved-per-run (observed) × runs/month
 *    (user-supplied assumption) × hourly rate (user-supplied). The assumptions are
 *    surfaced, never hidden. If the "after" process is SLOWER, no savings number is
 *    fabricated — the honest `slower` state is returned instead.
 *  - Every delta carries its run-count basis; confidence is gated on min run count
 *    (a single-run delta is not defensible).
 *  - Health score is plan-gated: when either side is gated, the health row is not
 *    compared (the caller renders "—").
 *  - Determinism: pure; no Date.now()/Math.random(); same inputs → same output.
 */

import { getPersonaByKey } from './persona-costs';

const MS_PER_HOUR = 3_600_000;

export interface ComparisonWorkflowInput {
  id: string;
  title: string;
  /** metricsV2.runs — confirmed observed run count, nullable. */
  runs: number | null;
  /** metricsV2.avgTimeMs — per-workflow representative duration (ms), nullable. */
  avgTimeMs: number | null;
  /** metricsV2.stepCount, nullable. */
  stepCount: number | null;
  /** toolsUsed.length — distinct systems observed. */
  systemCount: number;
  /** metricsV2.healthScore.overall (0–100). */
  healthOverall: number;
  /** metricsV2.healthScore.isGated. */
  healthGated: boolean;
}

export type DeltaDirection = 'improved' | 'degraded' | 'flat' | 'na';

export type MetricKey = 'cycleTime' | 'runs' | 'steps' | 'systems' | 'health';

export interface MetricDelta {
  key: MetricKey;
  label: string;
  baselineValue: number | null;
  afterValue: number | null;
  /** after − baseline (raw units; ms for cycle time). null if either side missing. */
  absoluteDelta: number | null;
  /** percent change vs baseline, 1 dp. null when baseline is 0/null. */
  percentDelta: number | null;
  /** Direction relative to THIS metric's "better" sense. 'na' for runs / gated. */
  direction: DeltaDirection;
}

export interface RoiInput {
  /** Projected runs per month (user-supplied assumption). */
  monthlyRuns: number;
  /** Effective fully-loaded hourly rate used in the math (resolved from persona or custom). */
  hourlyRate: number;
  /**
   * Optional provenance: which persona/role the rate came from (from the
   * persona-costs catalog). Echoed into the result for the report-out. null/omitted
   * ⇒ a custom rate the user typed directly.
   */
  personaKey?: string | null;
}

export interface RoiResult {
  /** baseline.avgTimeMs − after.avgTimeMs (ms saved per run); null if not both timed. */
  timeSavedPerRunMs: number | null;
  /** True when the "after" process is SLOWER (time saved would be negative). */
  slower: boolean;
  monthlyHoursSaved: number | null;
  monthlyDollarsSaved: number | null;
  annualHoursSaved: number | null;
  annualDollarsSaved: number | null;

  // ── Labor cost = volume × effort × persona-cost (the "what it costs to run" view) ──
  /** The effective loaded $/hr applied (echoes the input rate when valid). */
  effectiveHourlyRate: number | null;
  /** Persona/role key the rate came from; null when a custom rate was used. */
  personaKey: string | null;
  /** Persona/role display label resolved from the catalog; null for custom. */
  personaLabel: string | null;
  /** baseline labor cost / month = (baseline.avgTimeMs/hr) × monthlyRuns × rate. */
  baselineMonthlyCost: number | null;
  /** after labor cost / month. */
  afterMonthlyCost: number | null;
  baselineAnnualCost: number | null;
  afterAnnualCost: number | null;
}

export type ComparisonConfidence = 'high' | 'medium' | 'low';

export interface WorkflowComparison {
  baselineTitle: string;
  afterTitle: string;
  deltas: MetricDelta[];
  roi: RoiResult;
  /** min(baseline.runs, after.runs)-based; <2 ⇒ not a defensible delta. */
  confidence: ComparisonConfidence;
  baselineRuns: number;
  afterRuns: number;
  /** True when either side's health is plan-gated (health row not compared). */
  healthGated: boolean;
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function pct(after: number | null, baseline: number | null): number | null {
  if (after === null || baseline === null || baseline === 0) return null;
  return Math.round(((after - baseline) / baseline) * 1000) / 10;
}

/**
 * Direction for a metric, relative to whether lower or higher is "better".
 * Returns 'na' when either value is missing.
 */
function direction(
  after: number | null,
  baseline: number | null,
  lowerIsBetter: boolean,
): DeltaDirection {
  if (after === null || baseline === null) return 'na';
  if (after === baseline) return 'flat';
  const lower = after < baseline;
  return lower === lowerIsBetter ? 'improved' : 'degraded';
}

function buildDelta(
  key: MetricKey,
  label: string,
  baselineValue: number | null,
  afterValue: number | null,
  opts: { lowerIsBetter: boolean; neutral?: boolean; gated?: boolean },
): MetricDelta {
  const absoluteDelta =
    afterValue !== null && baselineValue !== null ? afterValue - baselineValue : null;
  return {
    key,
    label,
    baselineValue,
    afterValue,
    absoluteDelta,
    percentDelta: pct(afterValue, baselineValue),
    direction: opts.neutral || opts.gated ? 'na' : direction(afterValue, baselineValue, opts.lowerIsBetter),
  };
}

/**
 * Compute the deterministic before/after comparison + ROI for two workflows.
 * Pure; honest denominators; never fabricates savings for a slower process.
 */
export function computeWorkflowComparison(
  baseline: ComparisonWorkflowInput,
  after: ComparisonWorkflowInput,
  roiInput: RoiInput,
): WorkflowComparison {
  const bRuns = num(baseline.runs) ?? 0;
  const aRuns = num(after.runs) ?? 0;
  const healthGated = baseline.healthGated || after.healthGated;

  const deltas: MetricDelta[] = [
    buildDelta('cycleTime', 'Cycle Time', num(baseline.avgTimeMs), num(after.avgTimeMs), {
      lowerIsBetter: true,
    }),
    // Runs is evidence volume, not "better/worse" — neutral direction.
    buildDelta('runs', 'Runs (cases)', num(baseline.runs), num(after.runs), {
      lowerIsBetter: false,
      neutral: true,
    }),
    buildDelta('steps', 'Steps', num(baseline.stepCount), num(after.stepCount), {
      lowerIsBetter: true,
    }),
    buildDelta('systems', 'Systems', num(baseline.systemCount), num(after.systemCount), {
      lowerIsBetter: true,
    }),
    buildDelta('health', 'Health Score', num(baseline.healthOverall), num(after.healthOverall), {
      lowerIsBetter: false,
      gated: healthGated,
    }),
  ];

  // ── ROI ──────────────────────────────────────────────────────────────────────
  const bTime = num(baseline.avgTimeMs);
  const aTime = num(after.avgTimeMs);
  const timeSavedPerRunMs = bTime !== null && aTime !== null ? bTime - aTime : null;
  const slower = timeSavedPerRunMs !== null && timeSavedPerRunMs < 0;

  const monthlyRuns = num(roiInput.monthlyRuns);
  const hourlyRate = num(roiInput.hourlyRate);
  const inputsValid = monthlyRuns !== null && monthlyRuns > 0 && hourlyRate !== null && hourlyRate >= 0;

  let monthlyHoursSaved: number | null = null;
  let monthlyDollarsSaved: number | null = null;
  let annualHoursSaved: number | null = null;
  let annualDollarsSaved: number | null = null;

  // Only surface a savings number when there is a real positive saving AND valid
  // assumptions. A slower "after" returns no fabricated savings (slower=true).
  if (timeSavedPerRunMs !== null && timeSavedPerRunMs > 0 && inputsValid) {
    monthlyHoursSaved = Math.round(((timeSavedPerRunMs * monthlyRuns!) / MS_PER_HOUR) * 10) / 10;
    monthlyDollarsSaved = Math.round(monthlyHoursSaved * hourlyRate!);
    annualHoursSaved = Math.round(monthlyHoursSaved * 12 * 10) / 10;
    annualDollarsSaved = Math.round(monthlyDollarsSaved * 12);
  }

  // ── Labor-cost view: volume × effort × persona-cost ──────────────────────────
  // Cost to run each side per period = (effort hrs/run) × runs/month × loaded rate.
  // Computed whenever a side is timed and assumptions are valid — independent of
  // whether there is a saving. Persona is provenance only (which role's rate).
  const persona = getPersonaByKey(roiInput.personaKey);
  const effectiveHourlyRate = hourlyRate !== null && hourlyRate >= 0 ? hourlyRate : null;
  const baselineMonthlyCost =
    bTime !== null && inputsValid ? Math.round((bTime / MS_PER_HOUR) * monthlyRuns! * hourlyRate!) : null;
  const afterMonthlyCost =
    aTime !== null && inputsValid ? Math.round((aTime / MS_PER_HOUR) * monthlyRuns! * hourlyRate!) : null;
  const baselineAnnualCost = baselineMonthlyCost !== null ? baselineMonthlyCost * 12 : null;
  const afterAnnualCost = afterMonthlyCost !== null ? afterMonthlyCost * 12 : null;

  const minRuns = Math.min(bRuns, aRuns);
  const confidence: ComparisonConfidence = minRuns >= 10 ? 'high' : minRuns >= 2 ? 'medium' : 'low';

  return {
    baselineTitle: baseline.title,
    afterTitle: after.title,
    deltas,
    roi: {
      timeSavedPerRunMs,
      slower,
      monthlyHoursSaved,
      monthlyDollarsSaved,
      annualHoursSaved,
      annualDollarsSaved,
      effectiveHourlyRate,
      personaKey: roiInput.personaKey ?? null,
      personaLabel: persona?.label ?? null,
      baselineMonthlyCost,
      afterMonthlyCost,
      baselineAnnualCost,
      afterAnnualCost,
    },
    confidence,
    baselineRuns: bRuns,
    afterRuns: aRuns,
    healthGated,
  };
}
