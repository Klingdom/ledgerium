/**
 * Workflow Insight Analyzer — generates actionable, evidence-linked insights
 * from a single ProcessOutput.
 *
 * Unlike the portfolio-level intelligence engine (which requires multiple runs),
 * this analyzer produces useful insights from a SINGLE recorded workflow.
 * It runs automatically after every upload — no manual trigger needed.
 *
 * Design principles:
 * - Every insight is tied to specific observed evidence (step ordinals, durations, events)
 * - No speculation — only what the data supports
 * - Actionable — each insight includes a concrete suggestion
 * - Prioritized — sorted by impact (high → medium → low)
 * - Deterministic — same input always produces same insights
 *
 * Insight categories:
 * 1. Time Analysis — where is time being spent?
 * 2. Rework Detection — where are loops, retries, backtracking?
 * 3. System Efficiency — excessive switching, fragmentation
 * 4. Automation Opportunities — steps that could be eliminated or automated
 * 5. Process Health — overall quality indicators
 */

import type {
  ProcessOutput,
  ProcessMap,
  ProcessDefinition,
  SOP,
  StepDefinition,
  FrictionIndicator,
} from './types.js';
import { formatDuration } from './stepAnalyzer.js';

// ─── Insight types ───────────────────────────────────────────────────────────

export interface WorkflowInsight {
  /** Unique identifier for this insight type */
  id: string;
  /** Category grouping */
  category: InsightCategory;
  /** Clear, concise title */
  title: string;
  /** What is happening — 1-2 sentences */
  description: string;
  /** What data supports this — specific evidence */
  evidence: string;
  /** Why it matters — business impact */
  impact: string;
  /** What to do about it — concrete suggestion */
  suggestion: string;
  /** Confidence in this insight */
  confidence: 'high' | 'medium' | 'low';
  /** Impact severity */
  severity: 'high' | 'medium' | 'low';
  /** Step ordinals involved */
  stepOrdinals: number[];
}

export type InsightCategory =
  | 'time_analysis'
  | 'rework'
  | 'system_efficiency'
  | 'automation'
  | 'process_health';

export interface WorkflowInsightReport {
  /** All generated insights, sorted by severity (high first) */
  insights: WorkflowInsight[];
  /** Summary metrics */
  summary: {
    totalInsights: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    categories: InsightCategory[];
  };
  /** Time breakdown */
  timeBreakdown: {
    totalDurationMs: number;
    totalDurationLabel: string;
    longestStepOrdinal: number;
    longestStepTitle: string;
    longestStepDurationMs: number;
    longestStepDurationLabel: string;
    longestStepPercentage: number;
  } | null;
  /** Whether any insights were found */
  hasInsights: boolean;
  /** Message when no insights found */
  noInsightsMessage: string;
}

// ─── Main analyzer ───────────────────────────────────────────────────────────

/**
 * Analyzes a single ProcessOutput and generates actionable insights.
 * Runs automatically — no user trigger needed.
 */
export function analyzeWorkflowInsights(output: ProcessOutput): WorkflowInsightReport {
  const insights: WorkflowInsight[] = [];

  // Run all detectors
  insights.push(...detectTimeConcentration(output));
  insights.push(...detectRework(output));
  insights.push(...detectSystemInefficiency(output));
  insights.push(...detectAutomationOpportunities(output));
  insights.push(...detectProcessHealthIssues(output));

  // Sort by severity (high → medium → low)
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

  // Time breakdown
  const timeBreakdown = computeTimeBreakdown(output);

  // Deduplicate by ID
  const seen = new Set<string>();
  const deduplicated = insights.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  const categories = [...new Set(deduplicated.map(i => i.category))];

  return {
    insights: deduplicated,
    summary: {
      totalInsights: deduplicated.length,
      highSeverity: deduplicated.filter(i => i.severity === 'high').length,
      mediumSeverity: deduplicated.filter(i => i.severity === 'medium').length,
      lowSeverity: deduplicated.filter(i => i.severity === 'low').length,
      categories,
    },
    timeBreakdown,
    hasInsights: deduplicated.length > 0,
    noInsightsMessage: deduplicated.length === 0
      ? 'No major inefficiencies detected. This workflow appears well-structured.'
      : '',
  };
}

// ─── 1. Time concentration detection ─────────────────────────────────────────

function detectTimeConcentration(output: ProcessOutput): WorkflowInsight[] {
  const insights: WorkflowInsight[] = [];
  const steps = output.processDefinition.stepDefinitions;
  const totalMs = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);

  if (totalMs === 0 || steps.length < 2) return insights;

  // Find steps that consume disproportionate time
  const avgMs = totalMs / steps.length;
  const longSteps = steps.filter(s => (s.durationMs ?? 0) > avgMs * 2 && (s.durationMs ?? 0) > 5_000);

  for (const step of longSteps) {
    const pct = Math.round(((step.durationMs ?? 0) / totalMs) * 100);
    const durationLabel = formatDuration(step.durationMs);

    if (pct >= 50) {
      insights.push({
        id: `time_dominant_${step.ordinal}`,
        category: 'time_analysis',
        title: 'Time concentration in single step',
        description: `Step ${step.ordinal} ("${step.title}") consumes ${pct}% of total workflow time at ${durationLabel}.`,
        evidence: `This step took ${durationLabel} out of ${formatDuration(totalMs)} total. Average step time is ${formatDuration(avgMs)}.`,
        impact: 'One step dominates the entire workflow duration. Any improvement here has outsized impact.',
        suggestion: 'Investigate whether this step involves manual waiting, system delays, or complex data entry that could be streamlined.',
        confidence: 'high',
        severity: 'high',
        stepOrdinals: [step.ordinal],
      });
    } else if (pct >= 25) {
      insights.push({
        id: `time_heavy_${step.ordinal}`,
        category: 'time_analysis',
        title: 'Significant time at one step',
        description: `Step ${step.ordinal} ("${step.title}") takes ${durationLabel} — ${pct}% of total workflow time.`,
        evidence: `${durationLabel} duration vs ${formatDuration(avgMs)} average. ${pct}% of ${formatDuration(totalMs)} total.`,
        impact: 'This step is significantly slower than others and likely the primary improvement target.',
        suggestion: 'Check if this step involves repeated data entry, complex forms, or waiting for system responses.',
        confidence: 'high',
        severity: 'medium',
        stepOrdinals: [step.ordinal],
      });
    }
  }

  // Detect idle/wait gaps between steps
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i]!;
    const next = steps[i + 1]!;
    if (current.durationMs && current.durationMs > 45_000 && current.category === 'single_action') {
      insights.push({
        id: `idle_gap_${current.ordinal}`,
        category: 'time_analysis',
        title: 'Possible idle time detected',
        description: `A ${formatDuration(current.durationMs)} gap occurred at step ${current.ordinal}, suggesting the user paused or waited.`,
        evidence: `Step ${current.ordinal} ("${current.title}") has a duration of ${formatDuration(current.durationMs)} with a single-action grouping, suggesting inactivity rather than complex work.`,
        impact: 'Idle time adds to overall process duration without adding value.',
        suggestion: 'Determine if this pause is due to waiting for external input, system processing, or user uncertainty.',
        confidence: 'medium',
        severity: 'low',
        stepOrdinals: [current.ordinal],
      });
    }
  }

  return insights;
}

// ─── 2. Rework detection ─────────────────────────────────────────────────────

function detectRework(output: ProcessOutput): WorkflowInsight[] {
  const insights: WorkflowInsight[] = [];
  const steps = output.processDefinition.stepDefinitions;
  const sop = output.sop;

  // Error-handling steps = rework
  const errorSteps = steps.filter(s => s.category === 'error_handling');
  if (errorSteps.length >= 2) {
    insights.push({
      id: 'multiple_errors',
      category: 'rework',
      title: 'Multiple errors during execution',
      description: `${errorSteps.length} error-handling steps detected. The workflow encountered repeated problems requiring correction.`,
      evidence: `Error steps at positions: ${errorSteps.map(s => s.ordinal).join(', ')}. Each represents a validation failure or system error that required manual recovery.`,
      impact: 'Frequent errors increase process time, reduce operator confidence, and indicate fragile process steps.',
      suggestion: 'Review the steps preceding each error for missing validations, unclear instructions, or data quality issues.',
      confidence: 'high',
      severity: errorSteps.length >= 3 ? 'high' : 'medium',
      stepOrdinals: errorSteps.map(s => s.ordinal),
    });
  }

  // Backtracking from friction indicators
  const backtracking = sop.frictionSummary?.filter(f => f.type === 'backtracking') ?? [];
  if (backtracking.length > 0) {
    const totalBacktracks = backtracking.length;
    insights.push({
      id: 'backtracking_detected',
      category: 'rework',
      title: 'Backtracking to previously visited pages',
      description: `The user returned to ${totalBacktracks} previously visited page${totalBacktracks > 1 ? 's' : ''} during the workflow.`,
      evidence: backtracking.map(b => b.label).join('. '),
      impact: 'Backtracking adds unnecessary navigation time and suggests information was missed or the workflow order is suboptimal.',
      suggestion: 'Consider reordering steps so all work on a given page is completed before moving on.',
      confidence: 'high',
      severity: totalBacktracks >= 3 ? 'high' : 'medium',
      stepOrdinals: backtracking.flatMap(b => b.stepOrdinals),
    });
  }

  // Repeated form submissions (submit → error → resubmit pattern)
  const submitSteps = steps.filter(s => s.category === 'fill_and_submit');
  if (submitSteps.length >= 2) {
    // Check if consecutive submits hit the same system
    for (let i = 0; i < submitSteps.length - 1; i++) {
      const a = submitSteps[i]!;
      const b = submitSteps[i + 1]!;
      if (a.systems[0] === b.systems[0] && a.systems[0]) {
        const errorBetween = errorSteps.some(
          e => e.ordinal > a.ordinal && e.ordinal < b.ordinal,
        );
        if (errorBetween) {
          insights.push({
            id: `resubmission_${a.ordinal}_${b.ordinal}`,
            category: 'rework',
            title: 'Form resubmission after error',
            description: `A form in ${a.systems[0]} was submitted at step ${a.ordinal}, encountered an error, and was resubmitted at step ${b.ordinal}.`,
            evidence: `Steps ${a.ordinal} and ${b.ordinal} both submit to ${a.systems[0]} with an error step between them.`,
            impact: 'Resubmission wastes time and indicates either unclear validation rules or missing field-level guidance.',
            suggestion: 'Add client-side validation or clearer field requirements to prevent submission failures.',
            confidence: 'high',
            severity: 'medium',
            stepOrdinals: [a.ordinal, b.ordinal],
          });
        }
      }
    }
  }

  return insights;
}

// ─── 3. System inefficiency detection ────────────────────────────────────────

function detectSystemInefficiency(output: ProcessOutput): WorkflowInsight[] {
  const insights: WorkflowInsight[] = [];
  const steps = output.processDefinition.stepDefinitions;
  const systems = output.processMap.systems;
  const sop = output.sop;

  // System switching
  const switchFriction = sop.frictionSummary?.find(f => f.type === 'context_switching');
  if (switchFriction) {
    insights.push({
      id: 'context_switching',
      category: 'system_efficiency',
      title: `Frequent switching between ${systems.length} systems`,
      description: `This workflow involves ${systems.length} different applications (${systems.join(', ')}). ${switchFriction.label}`,
      evidence: `Systems used: ${systems.join(', ')}. Switches detected at steps: ${switchFriction.stepOrdinals.join(', ')}.`,
      impact: 'Each system switch requires the user to reorient, increasing cognitive load and error risk.',
      suggestion: systems.length > 2
        ? 'Investigate whether some systems could be consolidated or if integration/automation could reduce manual hand-offs.'
        : 'Consider completing all work in one system before moving to the next.',
      confidence: 'high',
      severity: switchFriction.severity,
      stepOrdinals: switchFriction.stepOrdinals,
    });
  }

  // Excessive navigation
  const navFriction = sop.frictionSummary?.find(f => f.type === 'excessive_navigation');
  if (navFriction) {
    insights.push({
      id: 'excessive_navigation',
      category: 'system_efficiency',
      title: 'Too many navigation steps',
      description: navFriction.label,
      evidence: `${navFriction.stepOrdinals.length} consecutive navigation steps detected at positions: ${navFriction.stepOrdinals.join(', ')}.`,
      impact: 'Excessive navigation indicates the user is searching for the right page instead of navigating directly.',
      suggestion: 'Use bookmarks, shortcuts, or deep links to reach the target page directly instead of clicking through menus.',
      confidence: 'high',
      severity: navFriction.severity,
      stepOrdinals: navFriction.stepOrdinals,
    });
  }

  // Workflow fragmentation (too many tiny steps)
  const tinySteps = steps.filter(s => (s.durationMs ?? 0) < 2_000 && s.category === 'single_action');
  if (tinySteps.length >= 4 && tinySteps.length / steps.length >= 0.4) {
    insights.push({
      id: 'workflow_fragmentation',
      category: 'system_efficiency',
      title: 'Workflow appears fragmented',
      description: `${tinySteps.length} of ${steps.length} steps are very brief single actions (under 2 seconds each).`,
      evidence: `Brief action steps at positions: ${tinySteps.map(s => s.ordinal).join(', ')}. Each under 2s duration.`,
      impact: 'Many small clicks may indicate unnecessary intermediate steps or poor UI design in the target application.',
      suggestion: 'Check if any of these quick actions could be eliminated, combined, or automated.',
      confidence: 'medium',
      severity: 'low',
      stepOrdinals: tinySteps.map(s => s.ordinal),
    });
  }

  return insights;
}

// ─── 4. Automation opportunity detection ─────────────────────────────────────

function detectAutomationOpportunities(output: ProcessOutput): WorkflowInsight[] {
  const insights: WorkflowInsight[] = [];
  const steps = output.processDefinition.stepDefinitions;

  // Data entry that could be pre-filled
  const dataEntrySteps = steps.filter(
    s => s.category === 'fill_and_submit' || s.category === 'data_entry',
  );
  if (dataEntrySteps.length >= 3) {
    const totalEntryMs = dataEntrySteps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
    insights.push({
      id: 'heavy_data_entry',
      category: 'automation',
      title: 'Significant manual data entry',
      description: `${dataEntrySteps.length} steps involve manual data entry, taking ${formatDuration(totalEntryMs)} total.`,
      evidence: `Data entry steps at positions: ${dataEntrySteps.map(s => s.ordinal).join(', ')}. Combined duration: ${formatDuration(totalEntryMs)}.`,
      impact: 'Manual data entry is slow, error-prone, and a prime candidate for automation or template-based pre-filling.',
      suggestion: 'Consider auto-populating fields from existing records, using templates, or integrating systems to transfer data automatically.',
      confidence: 'medium',
      severity: dataEntrySteps.length >= 5 ? 'high' : 'medium',
      stepOrdinals: dataEntrySteps.map(s => s.ordinal),
    });
  }

  // File actions that could be automated
  const fileSteps = steps.filter(s => s.category === 'file_action');
  if (fileSteps.length >= 2) {
    insights.push({
      id: 'multiple_file_actions',
      category: 'automation',
      title: 'Multiple file handling steps',
      description: `${fileSteps.length} steps involve file uploads or attachments.`,
      evidence: `File action steps at positions: ${fileSteps.map(s => s.ordinal).join(', ')}.`,
      impact: 'Manual file handling adds time and introduces risk of attaching wrong files.',
      suggestion: 'Consider automatic file attachment from a shared folder, or template-based document generation.',
      confidence: 'medium',
      severity: 'low',
      stepOrdinals: fileSteps.map(s => s.ordinal),
    });
  }

  // Cross-system data movement (submit in one system → enter in another)
  const systems = output.processMap.systems;
  if (systems.length >= 2) {
    const submitSteps = steps.filter(s => s.category === 'fill_and_submit' || s.category === 'send_action');
    const crossSystemSubmits = submitSteps.filter((s, i) => {
      if (i === 0) return false;
      const prev = steps.find(p => p.ordinal === s.ordinal - 1);
      return prev && prev.systems[0] !== s.systems[0] && prev.systems[0] && s.systems[0];
    });
    if (crossSystemSubmits.length > 0) {
      insights.push({
        id: 'cross_system_data_transfer',
        category: 'automation',
        title: 'Manual data transfer between systems',
        description: `Data appears to be manually moved between ${systems.join(' and ')} — this is a common automation opportunity.`,
        evidence: `Cross-system transitions detected near steps: ${crossSystemSubmits.map(s => s.ordinal).join(', ')}.`,
        impact: 'Manual data transfer between systems is the highest-value automation target — it eliminates rekeying errors and saves significant time.',
        suggestion: 'Investigate integration tools (APIs, Zapier, native connectors) to automatically pass data between these systems.',
        confidence: 'medium',
        severity: 'high',
        stepOrdinals: crossSystemSubmits.map(s => s.ordinal),
      });
    }
  }

  return insights;
}

// ─── 5. Process health detection ─────────────────────────────────────────────

function detectProcessHealthIssues(output: ProcessOutput): WorkflowInsight[] {
  const insights: WorkflowInsight[] = [];
  const steps = output.processDefinition.stepDefinitions;
  const qi = output.sop.qualityIndicators;

  // Low confidence steps
  const lowConfSteps = steps.filter(s => s.confidence < 0.7);
  if (lowConfSteps.length >= 2) {
    insights.push({
      id: 'low_confidence_steps',
      category: 'process_health',
      title: 'Steps with unclear boundaries',
      description: `${lowConfSteps.length} steps have low segmentation confidence, meaning the system was less certain about where these steps begin and end.`,
      evidence: `Low-confidence steps at positions: ${lowConfSteps.map(s => `${s.ordinal} (${Math.round(s.confidence * 100)}%)`).join(', ')}.`,
      impact: 'Low confidence may indicate ambiguous user behavior, rapid transitions, or unusual interaction patterns.',
      suggestion: 'These steps may benefit from clearer annotation or more deliberate action sequences during recording.',
      confidence: 'medium',
      severity: 'low',
      stepOrdinals: lowConfSteps.map(s => s.ordinal),
    });
  }

  // Overall process complexity
  if (steps.length >= 10) {
    const errorRatio = steps.filter(s => s.category === 'error_handling').length / steps.length;
    if (errorRatio >= 0.2) {
      insights.push({
        id: 'high_error_ratio',
        category: 'process_health',
        title: 'High error rate in workflow',
        description: `${Math.round(errorRatio * 100)}% of steps involve error handling — this indicates a fragile process.`,
        evidence: `${steps.filter(s => s.category === 'error_handling').length} error steps out of ${steps.length} total steps.`,
        impact: 'A high error rate means operators spend significant time recovering from failures instead of progressing.',
        suggestion: 'Address the root causes of the most frequent errors to reduce rework and improve reliability.',
        confidence: 'high',
        severity: 'high',
        stepOrdinals: steps.filter(s => s.category === 'error_handling').map(s => s.ordinal),
      });
    }
  }

  // Sensitive data handling
  const sensitiveSteps = steps.filter(s => s.hasSensitiveEvents);
  if (sensitiveSteps.length > 0) {
    insights.push({
      id: 'sensitive_data_handling',
      category: 'process_health',
      title: 'Sensitive data fields in workflow',
      description: `${sensitiveSteps.length} step${sensitiveSteps.length > 1 ? 's' : ''} involve${sensitiveSteps.length === 1 ? 's' : ''} sensitive data fields that were redacted during capture.`,
      evidence: `Steps with sensitive data: ${sensitiveSteps.map(s => s.ordinal).join(', ')}.`,
      impact: 'Workflows handling sensitive data should follow data classification and access control policies.',
      suggestion: 'Ensure operators handling these steps have appropriate access permissions and follow data handling procedures.',
      confidence: 'high',
      severity: 'low',
      stepOrdinals: sensitiveSteps.map(s => s.ordinal),
    });
  }

  return insights;
}

// ─── Time breakdown computation ──────────────────────────────────────────────

function computeTimeBreakdown(output: ProcessOutput): WorkflowInsightReport['timeBreakdown'] {
  const steps = output.processDefinition.stepDefinitions;
  if (steps.length === 0) return null;

  const totalMs = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  if (totalMs === 0) return null;

  const longest = steps.reduce((max, s) =>
    (s.durationMs ?? 0) > (max.durationMs ?? 0) ? s : max,
  );

  return {
    totalDurationMs: totalMs,
    totalDurationLabel: formatDuration(totalMs),
    longestStepOrdinal: longest.ordinal,
    longestStepTitle: longest.title,
    longestStepDurationMs: longest.durationMs ?? 0,
    longestStepDurationLabel: formatDuration(longest.durationMs),
    longestStepPercentage: Math.round(((longest.durationMs ?? 0) / totalMs) * 100),
  };
}
