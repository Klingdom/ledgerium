/**
 * Type definitions for the Ledgerium segmentation engine.
 *
 * External package imports are avoided deliberately — types are inlined until
 * all packages are linked in the monorepo.
 */

// ---------------------------------------------------------------------------
// Input event type (CanonicalEvent subset needed by the segmenter)
// ---------------------------------------------------------------------------

export interface SegmentableEvent {
  event_id: string;
  session_id: string;
  t_ms: number;
  event_type: string;
  page_context?: {
    domain: string;
    routeTemplate: string;
    applicationLabel: string;
    pageTitle: string;
  };
  target_summary?: {
    label?: string;
    role?: string;
    elementType?: string;
    selector?: string;
  };
  normalization_meta: {
    sourceEventType: string;
  };
}

// ---------------------------------------------------------------------------
// Step metadata types
// ---------------------------------------------------------------------------

export type StepStatus = 'provisional' | 'finalized';

export type BoundaryReason =
  | 'form_submitted'
  | 'navigation_changed'
  | 'route_changed'
  | 'target_changed'
  | 'action_completed'
  | 'app_context_changed'
  | 'idle_gap'
  | 'user_annotation'
  | 'session_stop'
  | 'explicit_boundary';

export type GroupingReason =
  | 'click_then_navigate'
  | 'fill_and_submit'
  | 'repeated_click_dedup'
  | 'single_action'
  | 'data_entry'
  | 'send_action'
  | 'file_action'
  | 'error_handling'
  | 'annotation';

// ---------------------------------------------------------------------------
// DerivedStep
// ---------------------------------------------------------------------------

export interface DerivedStep {
  step_id: string;
  session_id: string;
  ordinal: number;
  title: string;
  status: StepStatus;
  boundary_reason?: BoundaryReason;
  grouping_reason: GroupingReason;
  /** Confidence score in the range [0, 1]. */
  confidence: number;
  source_event_ids: string[];
  start_t_ms: number;
  end_t_ms?: number;
  duration_ms?: number;
  page_context?: {
    domain: string;
    applicationLabel: string;
    routeTemplate: string;
  };
}

// ---------------------------------------------------------------------------
// SegmentationResult
// ---------------------------------------------------------------------------

export interface SegmentationResult {
  steps: DerivedStep[];
  rule_version: string;
  event_count: number;
  warnings: string[];
}
