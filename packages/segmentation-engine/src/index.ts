/**
 * @ledgerium/segmentation-engine
 *
 * Public API: types, segmentation rules, batch segmenter, streaming segmenter.
 */

export type {
  SegmentableEvent,
  StepStatus,
  BoundaryReason,
  GroupingReason,
  DerivedStep,
  SegmentationResult,
} from './types.js';

export {
  SEGMENTATION_RULE_VERSION,
  IDLE_GAP_MS,
  CLICK_NAV_WINDOW_MS,
  RAPID_CLICK_DEDUP_MS,
  generateStepId,
  deriveStepTitle,
  calculateConfidence,
} from './rules.js';

export { segmentEvents } from './batch-segmenter.js';

export { StreamingSegmenter } from './streaming-segmenter.js';
