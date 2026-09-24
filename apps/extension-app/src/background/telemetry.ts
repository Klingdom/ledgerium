/**
 * Ledgerium AI — Extension telemetry (ADMIN-P02, backlog row #148)
 *
 * Answers the CEO question "how many extension installs do we have?" — the
 * Chrome Web Store exposes no public install-count API, so this module is
 * the only source of that number.
 *
 * Three events, POSTed to the public (unauthenticated) ingest route at
 * apps/web-app/src/app/api/analytics/extension/route.ts:
 *   1. extension_installed      — fired once per chrome.runtime.onInstalled
 *   2. extension_session_active — fired at most once per UTC calendar day
 *   3. extension_signin_linked  — fired once per install, the first time the
 *                                  extension is paired with a Ledgerium API key
 *
 * NAMING NOTE: backlog row #148 (ADMIN-P02) is internally inconsistent — its
 * prose names event 2 `extension_active` but its own metric-derivation
 * formula references `extension_session_active`
 * (`COUNT(DISTINCT installId) WHERE event_name = 'extension_session_active' ...`).
 * This file uses `extension_session_active` everywhere, matching the name the
 * row's own formula depends on.
 *
 * RELIABILITY (CLAUDE.md § Extension Reliability Invariant): every exported
 * function here is fire-and-forget and swallows its own errors internally.
 * Telemetry must never throw into a background-script message path, and a
 * dead/unreachable ingest endpoint must never affect recording. Nothing in
 * this file touches RAW_EVENT_CAPTURED, normalizeRawEvent(),
 * liveBuilder.processEvent(), store.appendEvent(), or any capture state.
 */

import {
  STORAGE_KEY_INSTALL_ID,
  STORAGE_KEY_LAST_ACTIVE_PING_DATE,
  STORAGE_KEY_SIGNIN_LINKED_SENT,
  TELEMETRY_ALARM_NAME,
  TELEMETRY_ALARM_PERIOD_MINUTES,
  TELEMETRY_ENDPOINT,
} from '../shared/constants.js'

// ─── Types ──────────────────────────────────────────────────────────────────

type InstallType = 'install' | 'update' | 'chrome_update' | 'shared_module_update'
type BrowserFamily = 'chrome' | 'edge' | 'other'

type TelemetryEvent =
  | { event: 'extension_installed'; installType: InstallType; extensionVersion: string; browser: BrowserFamily }
  | { event: 'extension_session_active'; extensionVersion: string; installId: string }
  | { event: 'extension_signin_linked'; installId: string; apiKey: string }

// ─── installId lifecycle ────────────────────────────────────────────────────

// In-memory fallback so a chrome.storage failure during this service-worker
// lifetime still returns a stable id (rather than a fresh one per caller);
// see getOrCreateVisitorId() in apps/web-app/src/lib/analytics.ts for the
// same documented tradeoff on the web-app side.
let cachedInstallId: string | null = null

function generateInstallId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through to the non-crypto fallback below
  }
  // Should not happen in an MV3 service worker (secure context, Chrome 88+),
  // but telemetry must never throw — degrade to a non-UUID unique-enough id.
  return `ldg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

/**
 * Returns the persistent per-install identifier, generating it via
 * crypto.randomUUID() exactly once on first call and persisting it to
 * chrome.storage.local. Never throws: a storage failure falls back to an
 * in-memory id for the remainder of this service-worker lifetime.
 */
export async function getOrCreateInstallId(): Promise<string> {
  if (cachedInstallId) return cachedInstallId

  try {
    const existing = await chrome.storage.local.get([STORAGE_KEY_INSTALL_ID])
    const stored = existing[STORAGE_KEY_INSTALL_ID]
    if (typeof stored === 'string' && stored.length > 0) {
      cachedInstallId = stored
      return stored
    }
  } catch {
    // storage read failed — fall through and generate
  }

  const generated = generateInstallId()
  cachedInstallId = generated
  try {
    await chrome.storage.local.set({ [STORAGE_KEY_INSTALL_ID]: generated })
  } catch {
    // storage write failed — id lives only in memory for this SW lifetime and
    // will be re-generated on the next service-worker start if storage stays
    // unavailable. An explicit, honest degradation, not a silent one.
  }
  return generated
}

// ─── Browser family (UA parsing — never the raw UA string) ─────────────────

/** Coarse browser family only — privacy requirement forbids the raw UA string. */
export function getBrowserFamily(): BrowserFamily {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    if (/\bEdg\//.test(ua)) return 'edge'
    if (/\bChrome\//.test(ua)) return 'chrome'
  } catch {
    // ignore — fall through to 'other'
  }
  return 'other'
}

function getExtensionVersion(): string {
  try {
    return chrome.runtime.getManifest().version
  } catch {
    return 'unknown'
  }
}

function normalizeInstallReason(reason: string): InstallType {
  if (reason === 'install' || reason === 'update' || reason === 'chrome_update' || reason === 'shared_module_update') {
    return reason
  }
  // Defensive default — chrome.runtime.onInstalled only ever sends the 4
  // known reasons, but telemetry must never throw on an unexpected value.
  return 'install'
}

function todayUtcDateString(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

// ─── Network (fire-and-forget) ──────────────────────────────────────────────

/**
 * POSTs a telemetry event to the public ingest route. Never throws and never
 * rejects — every failure mode (network down, non-2xx, timeout, abort) is
 * swallowed here so an unreachable/misbehaving endpoint cannot affect
 * anything else in the background script.
 */
async function postEvent(payload: TelemetryEvent): Promise<void> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch {
    // Telemetry must never break capture — swallow every failure silently.
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Event 1: extension_installed ──────────────────────────────────────────

/**
 * Call from chrome.runtime.onInstalled. Fire-and-forget — the caller does
 * not need to (and should not) await this.
 */
export function recordInstall(details: { reason: string }): void {
  void (async () => {
    try {
      const installType = normalizeInstallReason(details.reason)
      const extensionVersion = getExtensionVersion()
      const browser = getBrowserFamily()
      await getOrCreateInstallId() // ensure an id exists from the very first run
      await postEvent({ event: 'extension_installed', installType, extensionVersion, browser })
    } catch {
      // Never throw into the onInstalled listener.
    }
  })()
}

// ─── Event 2: extension_session_active (daily ping) ────────────────────────

/**
 * Idempotently (re)creates the daily telemetry alarm. Safe to call on every
 * service-worker start — chrome.alarms.create() with an already-used name
 * replaces the existing schedule (Chrome de-dupes by name), so repeated
 * calls are harmless.
 */
export function initTelemetryAlarm(): void {
  try {
    chrome.alarms.create(TELEMETRY_ALARM_NAME, { periodInMinutes: TELEMETRY_ALARM_PERIOD_MINUTES })
  } catch {
    // alarms API unavailable/failed — the daily ping simply won't fire this run.
  }
}

/**
 * Handles the daily telemetry alarm. Emits extension_session_active at most
 * once per UTC calendar day, tracked via a persisted date string so a
 * service-worker restart (or the alarm firing more than once in a day, which
 * should not happen but is not assumed against) cannot double-emit.
 */
export async function checkAndEmitDailyPing(nowMs: number = Date.now()): Promise<void> {
  try {
    const today = todayUtcDateString(nowMs)

    let lastPingDate: string | undefined
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEY_LAST_ACTIVE_PING_DATE])
      lastPingDate = stored[STORAGE_KEY_LAST_ACTIVE_PING_DATE] as string | undefined
    } catch {
      // Treat as "no ping recorded yet" — worst case is one extra ping today.
    }
    if (lastPingDate === today) return

    const installId = await getOrCreateInstallId()
    const extensionVersion = getExtensionVersion()
    await postEvent({ event: 'extension_session_active', extensionVersion, installId })

    try {
      await chrome.storage.local.set({ [STORAGE_KEY_LAST_ACTIVE_PING_DATE]: today })
    } catch {
      // If this write fails, worst case is a duplicate ping tomorrow — not fatal.
    }
  } catch {
    // Never throw out of the alarm handler.
  }
}

// ─── Event 3: extension_signin_linked ──────────────────────────────────────

/**
 * Call when the extension is paired with a Ledgerium account (an apiKey is
 * set via the SETTINGS_UPDATED message). Fires extension_signin_linked at
 * most once per install, ever.
 *
 * The "sent" flag is set optimistically BEFORE the network call so a rapid
 * repeat call (e.g. the user re-saves the same key) cannot double-send — at
 * the accepted cost that a network failure on this one-time event is not
 * retried. This mirrors the fire-and-forget posture of every other event in
 * this file: informational telemetry, not a billing- or capture-critical path.
 *
 * The event carries the raw apiKey, NOT a userId — the extension has no way
 * to learn its own userId client-side (the apiKey is an opaque bearer
 * credential; see apps/web-app/src/app/api/sync/route.ts for the only place
 * it is currently resolved to a user). The public ingest route performs the
 * same hash-and-lookup /api/sync already does and records the resolved
 * userId — never the raw key — server-side.
 */
export function recordSignInLinked(apiKey: string): void {
  if (!apiKey) return
  void (async () => {
    try {
      let alreadySent = false
      try {
        const stored = await chrome.storage.local.get([STORAGE_KEY_SIGNIN_LINKED_SENT])
        alreadySent = stored[STORAGE_KEY_SIGNIN_LINKED_SENT] === true
      } catch {
        // Treat as "not sent yet" — worst case is one extra send.
      }
      if (alreadySent) return

      try {
        await chrome.storage.local.set({ [STORAGE_KEY_SIGNIN_LINKED_SENT]: true })
      } catch {
        // If this write fails we may re-send once more later — acceptable.
      }

      const installId = await getOrCreateInstallId()
      await postEvent({ event: 'extension_signin_linked', installId, apiKey })
    } catch {
      // Never throw into the SETTINGS_UPDATED handler.
    }
  })()
}

/** True when `alarmName` is the telemetry alarm — lets index.ts route alarms without importing the constant separately. */
export function isTelemetryAlarm(alarmName: string): boolean {
  return alarmName === TELEMETRY_ALARM_NAME
}

/**
 * Clears the in-memory installId cache. Exposed for test isolation only —
 * do NOT call from production code (the whole point of the cache is that it
 * survives for the lifetime of the service worker).
 *
 * @internal
 */
export function resetTelemetryCacheForTests(): void {
  cachedInstallId = null
}
