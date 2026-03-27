/**
 * Workflow Report Builder
 *
 * Generates a canonical `workflow_report.json` from deterministic engine
 * outputs.  This is the primary report artifact for Ledgerium — it is
 * generated automatically when a recording completes and serves as the
 * source of truth for any downstream rendering (HTML, PDF, etc.).
 *
 * The report is deterministic: same SessionBundle input always produces
 * the same report (except for `generatedAt` timestamp).
 */

import type { SessionBundle, CanonicalEvent, DerivedStep } from '../shared/types.js'

// ─── Report Types ────────────────────────────────────────────────────────────

export interface WorkflowReport {
  /** A. Report Header / Session Metadata */
  header: {
    reportId: string
    sessionId: string
    activityName: string
    generatedAt: string
    startedAt: string
    endedAt: string | null
    durationMs: number
    durationLabel: string
    schemaVersion: string
    recorderVersion: string
    segmentationRuleVersion: string
  }

  /** B. Executive Summary */
  executiveSummary: {
    title: string
    objective: string
    applicationsUsed: string[]
    totalSteps: number
    totalPhases: number
    workflowConfidence: number
    keyObservations: string[]
  }

  /** C. Workflow Overview */
  workflowOverview: {
    title: string
    phases: WorkflowReportPhase[]
    steps: WorkflowReportStep[]
  }

  /** D. Metrics Summary */
  metrics: WorkflowReportMetrics

  /** E. SOP */
  sop: {
    title: string
    overview: string
    phases: WorkflowReportSOPPhase[]
    completionCriteria: string[]
    notes: string[]
  }

  /** F. Appendix */
  appendix: {
    evidenceByStep: Record<string, string[]>
    manifestMetadata: Record<string, unknown>
    totalNormalizedEvents: number
    totalPolicyEntries: number
  }
}

export interface WorkflowReportPhase {
  phaseId: string
  title: string
  stepCount: number
  startStepOrdinal: number
  endStepOrdinal: number
}

export interface WorkflowReportStep {
  ordinal: number
  stepId: string
  title: string
  groupingReason: string
  confidence: number
  durationMs: number
  durationLabel: string
  application: string
  domain: string
  eventCount: number
}

export interface WorkflowReportMetrics {
  totalDurationMs: number
  totalDurationLabel: string
  activeDurationMs: number
  idleDurationMs: number
  stepCount: number
  phaseCount: number
  toolCount: number
  toolsUsed: string[]
  navigationCount: number
  clickCount: number
  inputCount: number
  fileActionCount: number
  sendActionCount: number
  lowConfidenceStepCount: number
}

export interface WorkflowReportSOPPhase {
  phaseTitle: string
  instructions: WorkflowReportInstruction[]
}

export interface WorkflowReportInstruction {
  ordinal: number
  stepId: string
  text: string
  expectedOutcome: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

function computePhases(steps: DerivedStep[]): WorkflowReportPhase[] {
  const phases: WorkflowReportPhase[] = []
  let currentApp = ''
  let phaseCounter = 0

  for (const step of steps) {
    const app = step.page_context?.applicationLabel ?? step.page_context?.domain ?? 'Unknown'
    if (app !== currentApp) {
      phaseCounter++
      phases.push({
        phaseId: `phase-${phaseCounter}`,
        title: `${app} Workflow`,
        stepCount: 1,
        startStepOrdinal: step.ordinal,
        endStepOrdinal: step.ordinal,
      })
      currentApp = app
    } else {
      const current = phases[phases.length - 1]!
      current.stepCount++
      current.endStepOrdinal = step.ordinal
    }
  }

  return phases
}

function computeMetrics(
  bundle: SessionBundle,
  steps: DerivedStep[],
  phases: WorkflowReportPhase[],
): WorkflowReportMetrics {
  const events = bundle.normalizedEvents as CanonicalEvent[]

  // Duration
  const startMs = 0
  const endMs = steps.length > 0
    ? Math.max(...steps.map(s => s.end_t_ms ?? s.start_t_ms))
    : 0
  const totalDurationMs = endMs - startMs

  // Active vs idle: sum step durations for active, rest is idle
  const activeDurationMs = steps.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0)
  const idleDurationMs = Math.max(0, totalDurationMs - activeDurationMs)

  // Tools: unique applicationLabels from steps
  const toolSet = new Set<string>()
  for (const step of steps) {
    const app = step.page_context?.applicationLabel
    if (app) toolSet.add(app)
  }
  const toolsUsed = [...toolSet].sort()

  // Event type counts
  let navigationCount = 0
  let clickCount = 0
  let inputCount = 0
  let fileActionCount = 0

  for (const e of events) {
    if (e.event_type.startsWith('navigation.')) navigationCount++
    if (e.event_type === 'interaction.click') clickCount++
    if (e.event_type === 'interaction.input_change') inputCount++
    if (e.target_summary?.elementType === 'file') fileActionCount++
  }

  // Step-level counts
  const sendActionCount = steps.filter(s => s.grouping_reason === 'send_action').length
  const lowConfidenceStepCount = steps.filter(s => s.confidence < 0.7).length

  return {
    totalDurationMs,
    totalDurationLabel: formatDuration(totalDurationMs),
    activeDurationMs,
    idleDurationMs,
    stepCount: steps.length,
    phaseCount: phases.length,
    toolCount: toolsUsed.length,
    toolsUsed,
    navigationCount,
    clickCount,
    inputCount,
    fileActionCount,
    sendActionCount,
    lowConfidenceStepCount,
  }
}

function buildSOPFromSteps(
  steps: DerivedStep[],
  phases: WorkflowReportPhase[],
  activityName: string,
): WorkflowReport['sop'] {
  const sopPhases: WorkflowReportSOPPhase[] = phases.map(phase => {
    const phaseSteps = steps.filter(
      s => s.ordinal >= phase.startStepOrdinal && s.ordinal <= phase.endStepOrdinal,
    )
    return {
      phaseTitle: phase.title,
      instructions: phaseSteps.map(s => ({
        ordinal: s.ordinal,
        stepId: s.step_id,
        text: deriveInstructionText(s),
        expectedOutcome: deriveExpectedOutcome(s),
      })),
    }
  })

  const completionCriteria: string[] = []
  const lastStep = steps[steps.length - 1]
  if (lastStep) {
    completionCriteria.push(`All ${steps.length} steps completed successfully.`)
  }
  const sendSteps = steps.filter(s => s.grouping_reason === 'send_action')
  if (sendSteps.length > 0) {
    completionCriteria.push(`${sendSteps.length} send/submit action(s) completed.`)
  }

  return {
    title: `SOP: ${activityName}`,
    overview: `This procedure describes the workflow for "${activityName}".`,
    phases: sopPhases,
    completionCriteria,
    notes: [
      'This SOP was generated deterministically from recorded browser activity.',
      'All steps are evidence-backed — each links to source event IDs.',
    ],
  }
}

function deriveInstructionText(step: DerivedStep): string {
  const title = step.title
  // Convert step title to imperative instruction
  if (title.startsWith('Navigate to')) return `Open ${title.replace('Navigate to ', '')}.`
  if (title.startsWith('Enter ')) return `${title}.`
  if (title.startsWith('Click ')) return `${title}.`
  if (title.startsWith('Fill and submit')) return `${title}.`
  if (title.startsWith('Attach')) return `${title}.`
  if (step.grouping_reason === 'send_action') return `${title}.`
  return `${title}.`
}

function deriveExpectedOutcome(step: DerivedStep): string {
  switch (step.grouping_reason) {
    case 'click_then_navigate': return 'Page loads successfully.'
    case 'fill_and_submit': return 'Form submitted successfully.'
    case 'send_action': return 'Action completed successfully.'
    case 'data_entry': return 'Value entered correctly.'
    case 'file_action': return 'File attached/uploaded.'
    case 'error_handling': return 'Error resolved.'
    case 'annotation': return 'Note recorded.'
    default: return 'Action completed.'
  }
}

function deriveKeyObservations(
  steps: DerivedStep[],
  metrics: WorkflowReportMetrics,
): string[] {
  const observations: string[] = []

  if (metrics.phaseCount > 1) {
    observations.push(`Workflow spans ${metrics.phaseCount} applications (${metrics.toolsUsed.join(', ')}).`)
  }

  if (metrics.sendActionCount > 0) {
    observations.push(`${metrics.sendActionCount} completion action(s) (send/submit) detected.`)
  }

  if (metrics.fileActionCount > 0) {
    observations.push(`${metrics.fileActionCount} file interaction(s) detected.`)
  }

  if (metrics.lowConfidenceStepCount > 0) {
    observations.push(`${metrics.lowConfidenceStepCount} step(s) have low confidence — may benefit from review.`)
  }

  if (metrics.idleDurationMs > 10000) {
    observations.push(`${formatDuration(metrics.idleDurationMs)} of idle time observed between active steps.`)
  }

  return observations
}

// ─── Main Builder ────────────────────────────────────────────────────────────

export function buildWorkflowReport(bundle: SessionBundle): WorkflowReport {
  const { sessionJson, derivedSteps, manifest } = bundle
  const meta = sessionJson
  const steps = (derivedSteps as DerivedStep[]).filter(s => s.status === 'finalized')

  const phases = computePhases(steps)
  const metrics = computeMetrics(bundle, steps, phases)

  // Session duration from metadata
  const startedAt = meta.startedAt
  const endedAt = meta.endedAt ?? null
  const durationMs = endedAt
    ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
    : metrics.totalDurationMs

  // Workflow confidence: weighted average of step confidences
  const workflowConfidence = steps.length > 0
    ? Math.round((steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length) * 100) / 100
    : 0

  const keyObservations = deriveKeyObservations(steps, metrics)

  return {
    header: {
      reportId: `report-${meta.sessionId}`,
      sessionId: meta.sessionId,
      activityName: meta.activityName,
      generatedAt: new Date().toISOString(),
      startedAt,
      endedAt,
      durationMs,
      durationLabel: formatDuration(durationMs),
      schemaVersion: meta.schemaVersion,
      recorderVersion: meta.recorderVersion,
      segmentationRuleVersion: manifest.segmentationRuleVersion,
    },

    executiveSummary: {
      title: meta.activityName,
      objective: `Recorded workflow for "${meta.activityName}".`,
      applicationsUsed: metrics.toolsUsed,
      totalSteps: metrics.stepCount,
      totalPhases: metrics.phaseCount,
      workflowConfidence,
      keyObservations,
    },

    workflowOverview: {
      title: meta.activityName,
      phases,
      steps: steps.map(s => ({
        ordinal: s.ordinal,
        stepId: s.step_id,
        title: s.title,
        groupingReason: s.grouping_reason,
        confidence: s.confidence,
        durationMs: s.duration_ms ?? 0,
        durationLabel: formatDuration(s.duration_ms ?? 0),
        application: s.page_context?.applicationLabel ?? 'Unknown',
        domain: s.page_context?.domain ?? '',
        eventCount: s.source_event_ids.length,
      })),
    },

    metrics,

    sop: buildSOPFromSteps(steps, phases, meta.activityName),

    appendix: {
      evidenceByStep: Object.fromEntries(
        steps.map(s => [s.step_id, s.source_event_ids]),
      ),
      manifestMetadata: manifest as unknown as Record<string, unknown>,
      totalNormalizedEvents: (bundle.normalizedEvents as CanonicalEvent[]).length,
      totalPolicyEntries: bundle.policyLog.length,
    },
  }
}
