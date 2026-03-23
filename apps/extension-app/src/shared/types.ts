// ─── Recorder state machine ───────────────────────────────────────────────────

export type RecorderState =
  | 'idle'
  | 'arming'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'review_ready'
  | 'error'

export interface SessionMeta {
  sessionId: string
  activityName: string
  startedAt: string
  endedAt?: string
  state: RecorderState
  pauseIntervals: Array<{ pausedAt: string; resumedAt?: string }>
  schemaVersion: string
  recorderVersion: string
  uploadUrl?: string
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface RawEvent {
  raw_event_id: string
  session_id: string
  t_ms: number
  t_wall: string
  event_type: string
  url?: string
  url_normalized?: string
  page_title?: string
  target_selector?: string
  target_label?: string
  target_role?: string
  target_element_type?: string
  is_sensitive_target?: boolean
  value_present?: boolean
  annotation_text?: string
  schema_version: string
}

export interface CanonicalEvent {
  event_id: string
  schema_version: '1.0.0'
  session_id: string
  t_ms: number
  t_wall: string
  event_type: string
  actor_type: 'human' | 'system' | 'recorder'
  page_context?: {
    url: string
    urlNormalized: string
    domain: string
    routeTemplate: string
    pageTitle: string
    applicationLabel: string
    moduleLabel?: string
  }
  target_summary?: {
    selector?: string
    selectorConfidence?: number
    label?: string
    role?: string
    elementType?: string
    isSensitive: boolean
    sensitivityClass?: string
  }
  normalization_meta: {
    sourceEventId: string
    sourceEventType: string
    normalizationRuleVersion: string
    redactionApplied: boolean
    redactionReason?: string
  }
  annotation_text?: string
}

export interface PolicyLogEntry {
  sessionId: string
  eventId: string
  t_ms: number
  outcome: 'allow' | 'block' | 'redact'
  reason: string
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export interface LiveStep {
  stepId: string
  title: string
  status: 'provisional' | 'finalized'
  boundaryReason?: string
  confidence: number
  eventCount: number
  startedAt: number
  finalizedAt?: number
}

export interface DerivedStep {
  step_id: string
  session_id: string
  ordinal: number
  title: string
  status: 'provisional' | 'finalized'
  boundary_reason?: string
  grouping_reason: string
  confidence: number
  source_event_ids: string[]
  start_t_ms: number
  end_t_ms?: number
  duration_ms?: number
  page_context?: {
    domain: string
    applicationLabel: string
    routeTemplate: string
  }
}

// ─── Bundle ───────────────────────────────────────────────────────────────────

export interface BundleManifest {
  sessionId: string
  exportedAt: string
  schemaVersion: string
  recorderVersion: string
  segmentationRuleVersion: string
  rendererVersion: string
  fileHashes: Record<string, string>
}

export interface SessionBundle {
  sessionJson: SessionMeta
  normalizedEvents: CanonicalEvent[]
  derivedSteps: DerivedStep[]
  policyLog: PolicyLogEntry[]
  manifest: BundleManifest
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface ExtensionSettings {
  uploadUrl: string
  allowedDomains: string[]
  blockedDomains: string[]
}

// ─── Message bus ──────────────────────────────────────────────────────────────

export const MSG = {
  START_SESSION: 'START_SESSION',
  PAUSE_SESSION: 'PAUSE_SESSION',
  RESUME_SESSION: 'RESUME_SESSION',
  STOP_SESSION: 'STOP_SESSION',
  DISCARD_SESSION: 'DISCARD_SESSION',
  SESSION_STATE_UPDATED: 'SESSION_STATE_UPDATED',
  RAW_EVENT_CAPTURED: 'RAW_EVENT_CAPTURED',
  NORMALIZED_EVENT_ADDED: 'NORMALIZED_EVENT_ADDED',
  LIVE_STEP_UPDATED: 'LIVE_STEP_UPDATED',
  FINALIZATION_COMPLETE: 'FINALIZATION_COMPLETE',
  FINALIZATION_FAILED: 'FINALIZATION_FAILED',
  UPLOAD_PROGRESS: 'UPLOAD_PROGRESS',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  GET_STATE: 'GET_STATE',
  EXPORT_BUNDLE: 'EXPORT_BUNDLE',
} as const

export type MsgType = typeof MSG[keyof typeof MSG]
