export const SCHEMA_VERSION = '1.0.0' as const
export const RECORDER_VERSION = '0.1.0' as const
export const SEGMENTATION_RULE_VERSION = '1.1.0' as const
export const RENDERER_VERSION = '0.1.0' as const
export const STORAGE_KEY_SESSION = 'ledgerium_active_session' as const
export const STORAGE_KEY_SETTINGS = 'ledgerium_settings' as const
export const STORAGE_KEY_HISTORY_INDEX = 'ledgerium_history_index' as const
export const STORAGE_KEY_BUNDLE_PREFIX = 'ledgerium_bundle_' as const
export const STORAGE_KEY_EVENTS = 'ledgerium_active_events' as const
/** Persist events to chrome.storage.local every N canonical events */
export const EVENT_PERSIST_INTERVAL = 10 as const
export const MAX_HISTORY_ENTRIES = 25 as const
export const IDLE_GAP_MS = 45_000 as const
export const CLICK_NAV_WINDOW_MS = 2_500 as const
export const RAPID_CLICK_DEDUP_MS = 1_000 as const
export const INPUT_DEBOUNCE_MS = 300 as const
export const STATE_CHANGE_DEBOUNCE_MS = 150 as const
export const DRAG_STALE_MS = 5_000 as const
