// Import from workspace package — single source of truth for segmentation constants
export {
  SEGMENTATION_RULE_VERSION,
  IDLE_GAP_MS,
  CLICK_NAV_WINDOW_MS,
  RAPID_CLICK_DEDUP_MS,
} from '@ledgerium/segmentation-engine'

// Extension-only constants
export const SCHEMA_VERSION = '1.0.0' as const
export const RECORDER_VERSION = '2.0.0' as const
export const RENDERER_VERSION = '0.1.0' as const
export const STORAGE_KEY_SESSION = 'ledgerium_active_session' as const
export const STORAGE_KEY_SETTINGS = 'ledgerium_settings' as const
export const STORAGE_KEY_HISTORY_INDEX = 'ledgerium_history_index' as const
export const STORAGE_KEY_BUNDLE_PREFIX = 'ledgerium_bundle_' as const
export const MAX_HISTORY_ENTRIES = 25 as const
export const INPUT_DEBOUNCE_MS = 300 as const
export const STATE_CHANGE_DEBOUNCE_MS = 150 as const
export const DRAG_STALE_MS = 5_000 as const
