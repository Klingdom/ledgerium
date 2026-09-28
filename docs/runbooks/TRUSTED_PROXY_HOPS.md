# Setting `TRUSTED_PROXY_HOPS`

**Status:** waiting on one number, which the app now measures for you.
**Owner:** CEO (one env var) · **Prepared:** loop 53

---

## The problem, in one paragraph

The rate limits protecting **login, signup and password reset** identify a
caller by the first entry of the `x-forwarded-for` header. Proxies *append* to
that header, so the first entry is whatever the caller sent — anyone can put
`x-forwarded-for: 1.2.3.4` on a request and rotate it to bypass the limit
entirely. The fix is to count from the right-hand end instead, which needs one
number: **how many reverse proxies sit in front of this app.**

That number cannot be read from this repository. `compose.hostinger.yaml` joins
an *external* `proxy-net` and its own comments say the proxy depends "on which
proxy Hostinger provisions". So rather than guess, the app measures it.

## Why guessing is not an option — and which way is dangerous

**Corrected at loop 54.** The first version of this runbook said guessing *too
high* causes an outage. That is backwards, and the arithmetic settles it. With
`D` proxies in front, an honest request arrives carrying `D` entries with the
real client first, and the code selects `entries[length - hops]`:

| Setting | Result |
|---|---|
| `hops = D` | Selects the client. **Correct.** |
| `hops < D` | Selects a **proxy's** address. Every user behind that proxy becomes the same caller, so one person's failed logins lock out everybody. **This is the outage.** |
| `hops > D` | Clamps to the first entry — the client for honest traffic, the forged value for a spoofed header. Still bypassable; **no outage.** |

So the dangerous mistake is setting it **too low**, and if you are ever unsure
between two values, the higher one fails safe.

## Read the measurement

Sign in as an admin and open:

```
/api/admin/operations
```

Look at `data.proxyChain`:

```jsonc
{
  "observations": [
    { "entryCount": 0, "requests": 12 },   // no header — health checks, internal calls
    { "entryCount": 2, "requests": 3814 }, // ← the shape the bulk of traffic carries
    { "entryCount": 3, "requests": 27 }    // callers sending their own header
  ],
  "totalRequests": 3853,
  "dominantEntryCount": 2,
  "dominantShare": 0.993,
  "shapesAgree": true,
  "honestSampleLikely": true,
  "suggestedTrustedProxyHops": 2,
  "configuredTrustedProxyHops": 0   // ← what is live right now
}
```

**If `suggestedTrustedProxyHops` is a number, that is your answer.**

If it is `null`, one of two things is true and the other fields say which:

- `honestSampleLikely: false` — not enough traffic yet. Check again later.
- `shapesAgree: false` — requests are arriving by **more than one route**, and
  no single hop count describes them all. Do not pick one. The container port is
  published in `compose.hostinger.yaml`, so this usually means something is
  reaching the app without going through the proxy; find that path first.

### Why the dominant shape and not the smallest

The estimate deliberately uses the shape most traffic carries, not the smallest
one seen. A single request that skipped part of the chain — reaching the
published container port directly, say — carries a shorter header, and letting
that set the value would push the setting **below** `D`, which is the lockout
case above. The mode is unmoved by a handful of such requests; the minimum is
not.

**No IP address is recorded, logged or returned by any of this** — only how many
entries each header carried. A count cannot be reversed into an address.

### Two limits worth knowing before you act on the number

**The counts are per-process and reset on deploy.** If the app ever runs more
than one worker, the page shows one worker's share of traffic. That does not
change the *shape* of the distribution, so the suggested value stays right, but
`totalRequests` will read lower than your real traffic.

**Some proxies replace the header instead of appending to it** — nginx with
`$remote_addr`, Traefik without `trustedIPs`, Envoy with `skip_xff_append`,
Caddy with `header_up`. If the outermost one does this, everything above still
holds. If an *inner* one does, the client address is discarded before it reaches
us and **no setting recovers it**; the tell is a dominant shape stuck at 1 when
the deployment clearly has more hops than that. In that case the fix is proxy
configuration, not this variable.

## Apply it

1. Set the repository variable `TRUSTED_PROXY_HOPS` to the suggested value.
2. Redeploy. It is already plumbed through `.github/workflows/deploy.yml` and
   `compose.hostinger.yaml`, so no code change is needed.
3. Re-open `/api/admin/operations` and confirm `configuredTrustedProxyHops` now
   matches `suggestedTrustedProxyHops`.
4. Sanity-check that you can still log in. If the value were wrong in the unsafe
   direction the symptom is immediate and unmistakable: legitimate logins start
   returning `429`.

**Rollback is instant** — unset the variable and redeploy; behaviour returns to
exactly what it is today.

## What this closes

Backlog row **#225**. The six call sites were consolidated into one tested
helper at loop 44 (`apps/web-app/src/lib/client-ip.ts`), and loop 53 added the
measurement (`apps/web-app/src/lib/proxy-observation.ts`). Setting the variable
is the last step, and it is the only one that required a fact the code could not
discover on its own.
