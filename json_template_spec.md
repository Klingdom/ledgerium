# JSON Data Template v1 (Canonical)

This is the contract between:
- recorder → storage
- storage → process engine
- process engine → process diagram + SOP

## Bundle format
- `session.json`: metadata + integrity + index
- `events.ndjson`: one event per line (append-only)

## Required invariants
- Every event MUST include: `schema_version`, `event_id`, `session_id`, `t_ms`, `t_wall`, `actor.type`, `type`
- `t_ms` MUST be monotonic non-decreasing within a session
- URL normalization MUST be applied at record time
- Selector normalization MUST be applied at record time

## Privacy defaults
- `privacy.text_capture = none`
- `privacy.screenshots = off`
- `privacy.dom_snapshots = off`

