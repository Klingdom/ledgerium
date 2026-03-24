# ADR-002: Session Memory Bounds and Storage Strategy

**Status:** Accepted (Phase 1 implementation deferred to Phase 1)
**Date:** 2026-03-24
**Phase:** 0 → 1 transition

---

## Context

The `SessionStore` class holds all session events in memory:

```typescript
private rawEvents: RawEvent[] = []
private canonicalEvents: CanonicalEvent[] = []
private policyLog: PolicyLogEntry[] = []
private liveSteps: LiveStep[] = []
```

For typical recording sessions (5–30 minutes of focused work), this is not a problem. A session with 1,000 canonical events at ~500 bytes each = ~500KB, well within Chrome extension memory limits (~256MB for service worker).

However, three scenarios require bounds:

1. **Long-running sessions** (> 2 hours of continuous recording)
2. **High-frequency capture apps** (e.g., recording work in a data entry tool with hundreds of clicks/minute)
3. **Service worker restarts** — Chrome MV3 service workers restart every 5 minutes of inactivity. All in-memory state is lost on restart.

---

## Decision

### Phase 0 (current): No bounds, no full persistence
- `rawEvents` and `canonicalEvents` are unbounded in memory
- `chrome.storage.local` persists only `SessionMeta` (the session header), not events
- If the service worker restarts during recording, session metadata survives but events are lost
- **Documented as known limitation in CLAUDE.md**

### Phase 1 Completion: Implement bounds and event persistence

**Memory bounds:**
```typescript
const MAX_RAW_EVENTS = 10_000   // ~5MB at 500 bytes/event
const MAX_CANONICAL_EVENTS = 10_000
```

When `MAX_RAW_EVENTS` is reached:
- Emit a `system.capture_bounded` canonical event (new type, tracks when events are dropped)
- Stop accepting new raw events until the session ends
- Surface a warning in the side panel UI ("Recording limit reached — stop and review")

**Full event persistence (service worker restart recovery):**
- Serialize canonical events (not raw events) to `chrome.storage.local` in batches of 100
- On service worker restart: reload meta + canonical events from storage
- Raw events are ephemeral — they are only needed during normalization, which happens synchronously on capture
- Recovery state: if meta.state is 'recording' or 'paused', transition to a new 'recovering' state and offer the user "Resume" or "Stop & Review" options

**Storage size constraint:**
- `chrome.storage.local` quota is 10MB per extension
- 10,000 canonical events × 500 bytes = 5MB, safely within quota
- Include a storage usage check before persisting; if approaching 8MB, warn and stop capturing

---

## Consequences

**Positive:**
- Service worker restart no longer loses session data
- Memory usage is bounded and predictable
- Users get meaningful feedback when approaching limits

**Negative:**
- Storage writes on every event batch add latency (mitigated by 100-event batching)
- Recovery UI adds complexity to the side panel state machine (new 'recovering' state)
- Chrome storage quota must be monitored

**Metrics to track (Phase 1):**
- P99 events per session (to validate the 10,000 bound is sufficient)
- Service worker restart frequency during active sessions
- Storage usage per session

---

## Invariants This ADR Establishes

- `MAX_RAW_EVENTS` must not be changed without a session length analysis
- The `system.capture_bounded` event type must be added to the canonical schema when Phase 1 bounds are implemented
- Recovery must not change event ordering — events loaded from storage maintain their original `t_ms` ordering
