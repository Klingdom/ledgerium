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
export const STORAGE_KEY_APIKEY = 'ledgerium_apikey' as const
export const STORAGE_KEY_HISTORY_INDEX = 'ledgerium_history_index' as const
export const STORAGE_KEY_BUNDLE_PREFIX = 'ledgerium_bundle_' as const
export const MAX_HISTORY_ENTRIES = 25 as const
export const INPUT_DEBOUNCE_MS = 300 as const
export const STATE_CHANGE_DEBOUNCE_MS = 150 as const
export const DRAG_STALE_MS = 5_000 as const

// ─── Session event persistence ────────────────────────────────────────────────

/**
 * Key prefix for per-session event arrays stored in chrome.storage.local.
 * Full key: STORAGE_KEY_SESSION_EVENTS_PREFIX + sessionId
 * One key per session prevents concurrent/stale sessions from competing for
 * the same storage slot and simplifies garbage collection on session clear.
 */
export const STORAGE_KEY_SESSION_EVENTS_PREFIX = 'ledgerium_active_session_events_' as const

/**
 * Schema version for the persisted event payload.
 * Increment this when the PersistedSessionEvents shape changes so that a
 * future restore can detect an incompatible payload and reset cleanly rather
 * than crashing on an unexpected shape.
 *
 * History:
 *   1 — initial (iter 010): rawEvents, canonicalEvents, policyLog, liveSteps
 */
export const PERSIST_SCHEMA_VERSION = 1 as const

/**
 * Trailing-edge debounce delay for event persistence writes (ms).
 * Coalesces rapid event appends (e.g. burst of RAW_EVENT_CAPTURED) into a
 * single chrome.storage.local.set call.  The debounce is always flushed
 * immediately on state transitions (pause / resume / stop) and on
 * chrome.runtime.onSuspend.
 */
export const PERSIST_DEBOUNCE_MS = 500 as const
