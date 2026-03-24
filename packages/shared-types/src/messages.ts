import type { RecorderState, SessionMeta } from './session.js';

// ---------------------------------------------------------------------------
// Supporting interfaces
// ---------------------------------------------------------------------------

export interface LiveStep {
  stepId: string;
  title: string;
  status: 'provisional' | 'finalized';
  boundaryReason?: string;
  confidence: number;
  eventCount: number;
  startedAt: number;
  finalizedAt?: number;
}

export interface BundleManifest {
  sessionId: string;
  exportedAt: string;
  schemaVersion: string;
  recorderVersion: string;
  segmentationRuleVersion: string;
  rendererVersion: string;
  fileHashes: Record<string, string>;
}

export interface SessionBundle {
  sessionJson: SessionMeta;
  normalizedEvents: unknown[];
  derivedSteps: unknown[];
  policyLog: unknown[];
  manifest: BundleManifest;
}

// ---------------------------------------------------------------------------
// Canonical event shape used in message bus (lightweight, no Zod dep here)
// ---------------------------------------------------------------------------

export type CanonicalEventShape = {
  event_id: string;
  event_type: string;
  t_ms: number;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Raw event reference (opaque until schema-events is linked)
// ---------------------------------------------------------------------------

export type RawCaptureEventRef = {
  event_id: string;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Message definitions
// ---------------------------------------------------------------------------

export type StartSessionMessage = {
  type: 'START_SESSION';
  payload: { activityName: string; uploadUrl?: string };
};

export type PauseSessionMessage = {
  type: 'PAUSE_SESSION';
  payload: Record<string, never>;
};

export type ResumeSessionMessage = {
  type: 'RESUME_SESSION';
  payload: Record<string, never>;
};

export type StopSessionMessage = {
  type: 'STOP_SESSION';
  payload: Record<string, never>;
};

export type DiscardSessionMessage = {
  type: 'DISCARD_SESSION';
  payload: Record<string, never>;
};

export type SessionStateUpdatedMessage = {
  type: 'SESSION_STATE_UPDATED';
  payload: { state: RecorderState; meta: SessionMeta };
};

export type RawEventCapturedMessage = {
  type: 'RAW_EVENT_CAPTURED';
  payload: { event: RawCaptureEventRef };
};

export type NormalizedEventAddedMessage = {
  type: 'NORMALIZED_EVENT_ADDED';
  payload: { event: CanonicalEventShape };
};

export type LiveStepUpdatedMessage = {
  type: 'LIVE_STEP_UPDATED';
  payload: { step: LiveStep };
};

export type FinalizationCompleteMessage = {
  type: 'FINALIZATION_COMPLETE';
  payload: { bundle: SessionBundle };
};

export type FinalizationFailedMessage = {
  type: 'FINALIZATION_FAILED';
  payload: { error: string };
};

export type UploadProgressMessage = {
  type: 'UPLOAD_PROGRESS';
  payload: {
    percent: number;
    status: 'uploading' | 'complete' | 'failed';
    error?: string;
  };
};

export type SettingsUpdatedMessage = {
  type: 'SETTINGS_UPDATED';
  payload: { uploadUrl?: string };
};

// Query messages: request/response pairs handled via sendResponse
export type GetStateMessage = {
  type: 'GET_STATE';
  payload: Record<string, never>;
};

export type ExportBundleMessage = {
  type: 'EXPORT_BUNDLE';
  payload: Record<string, never>;
};

export type GetSettingsMessage = {
  type: 'GET_SETTINGS';
  payload: Record<string, never>;
};

// ---------------------------------------------------------------------------
// Response payload types (returned via sendResponse, not broadcast messages)
// ---------------------------------------------------------------------------

export type GetStateResponse = {
  state: RecorderState;
  meta: SessionMeta | null;
  steps: LiveStep[];
};

export type GetSettingsResponse = {
  settings: import('./entities.js').ExtensionSettings;
};

// ---------------------------------------------------------------------------
// Union type
// ---------------------------------------------------------------------------

export type ExtensionMessage =
  | StartSessionMessage
  | PauseSessionMessage
  | ResumeSessionMessage
  | StopSessionMessage
  | DiscardSessionMessage
  | SessionStateUpdatedMessage
  | RawEventCapturedMessage
  | NormalizedEventAddedMessage
  | LiveStepUpdatedMessage
  | FinalizationCompleteMessage
  | FinalizationFailedMessage
  | UploadProgressMessage
  | SettingsUpdatedMessage
  | GetStateMessage
  | ExportBundleMessage
  | GetSettingsMessage;

// ---------------------------------------------------------------------------
// Message type string constants
// ---------------------------------------------------------------------------

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
  GET_SETTINGS: 'GET_SETTINGS',
} as const;

export type MsgType = (typeof MSG)[keyof typeof MSG];
