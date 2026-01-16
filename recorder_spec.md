# Recorder v1 Spec (Browser Extension)

## Goals
- Explicit consent (no hidden recording)
- Low overhead capture (does not slow work)
- Deterministic event emission (stable selectors, normalized URLs)
- Privacy-safe defaults (no keystrokes, no password fields, no clipboard)
- Reliable local persistence + resumable upload

## Capture model
Record **workflow events**, not video.

### Default captured signals
- Navigation: URL/route changes, title
- View: tab focus / page activation
- Click: target selectors + minimal metadata
- Form: focus/blur and submit (no raw text by default)
- Errors: page/app error signals and failed submits
- Derived waits: idle gaps ("system_wait")

### Default NOT captured
- Keystrokes / raw typed text
- Clipboard
- Password inputs
- Full DOM snapshots
- Screenshots (off by default)

## Determinism rules
- Use monotonic timestamps (`t_ms`) with a wall-clock anchor (`t_wall`) for auditability.
- Normalize URLs: strip tracking params, stable allowlist for meaningful params.
- Normalize selectors at record time.

### Selector strategy (ranked fallback)
Store `target.selector` using the first available:
1. `data-testid` / `data-qa` / `aria-label`
2. ARIA role + accessible name: `role=button[name='Submit invoice']`
3. Stable CSS path with minimal nth-child
4. XPath as last resort

Also store `target.selector_confidence` (0-1).

## Session lifecycle
`idle → recording → paused → stopped → uploaded`

Rules:
- Start is always user-initiated
- Pause stops event emission
- Stop seals session and writes integrity hashes

## Local persistence & upload
- Append events to `events.ndjson`
- Maintain `session.json` metadata + index
- Upload in chunks with retry and backoff
- If upload fails: UI must say: **"Your local log is intact."**

