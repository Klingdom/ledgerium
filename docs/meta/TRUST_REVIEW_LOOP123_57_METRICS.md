# Trust review: #57 retirement metrics after row #302 (loop 123)

Verdict: **HOLDS WITH STATED LIMITS.** Per-account weight is bounded at 1/N. "A handful of accounts cannot move it materially" is true only for N >= ~100; it is false for N < 30.

## Findings
- `createdAt` is server-assigned (`@default(now())`; the ingest record never copies a client timestamp). Pairing cannot be forged by timestamp, but the attacker controls arrival order, so "view then bounce" is trivially satisfiable. Pairing blocks orphan bounces only. It does not block a forged view + bounce pair.
- One account cannot raise its weight. userId is session-derived, each rate is a mean of per-user values in [0,1], chips are clamped to 5, and clicks are capped by min(1, ...). Dilution and chip=1 tricks stay inside [0,1]. An account's only lever is its own value (0 or 1).
- Probe (honest users: bounce 0.33, chip 0.11; forged: 1 view, 1 bounce, chipsRendered=1, 1 click; forged value 1.0):

| N honest | k forged | bounce | chip |
|---|---|---|---|
| 200 | 3 | 0.333 to 0.343 | 0.111 to 0.124 |
| 200 | 10 | 0.333 to 0.365 | 0.111 to 0.153 |
| 20 | 3 | 0.333 to 0.420 | 0.111 to 0.227 |
| 20 | 10 | 0.333 to 0.556 | 0.111 to 0.407 |
| 5 | 10 | null to 0.78 | null to 0.70 |
| 0 | 10 | null to 1.0 | null to 1.0 |

  Max shift is about k(1-r)/(N+k). The chip rate has the weaker margin because the honest rate is low (the 10% threshold). At N=20, 3 accounts double the chip rate. At N=200, 10 accounts add about 4 points.
- The min-user gate of 10 makes small-N forgery easier, not harder. With N<10, 10 forged accounts alone create a rate where the honest data would give "insufficient". The gate only blocks the one-account case.
- Sybil cost: signup has no email verification (nothing found in the route) and a per-IP limit of 10/hour. That key is the X-Forwarded-For first hop, spoofable until #225. Cost is near zero. Required forged accounts for a +10pp shift is about 0.1N/(1-r), so roughly 25 at N=200.
- Emitter scan: it only defines the allowlist. An attacker can post any allowlisted name regardless, so the scan is not a trust boundary. Remaining blind spots: bracket or computed calls (`window['track']`), tracking through a wrapper that is not named track, and `.track(` false positives (it fails loudly, which is acceptable). The 14 tests passed.

## Required wording
Replace "no single account or handful can move it" with: "each account has weight 1/N; N = distinct reporting users. Treat any reading with N < 100 as indicative only; N < 30 can be set by a few free accounts." Surface N on the page. Do not use #57 numbers for retirement while N < 100 without a corroborating source.
