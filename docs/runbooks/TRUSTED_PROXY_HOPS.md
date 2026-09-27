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

## Why guessing is not an option

Guess **too low** and nothing improves — the limits stay bypassable.

Guess **too high** and every request resolves to the proxy's own address. All
users collapse into a single rate-limit bucket, and one person's failed logins
lock out everybody. That is an outage, and it is strictly worse than the bug it
would be trying to fix. This is why the default has been left at today's
behaviour through several iterations rather than "just fixed".

## Read the measurement

Sign in as an admin and open:

```
/api/admin/operations
```

Look at `data.proxyChain`:

```jsonc
{
  "observations": [
    { "entryCount": 0, "requests": 12 },   // no XFF header at all
    { "entryCount": 1, "requests": 3814 }, // ← the minimum with a header
    { "entryCount": 2, "requests": 27 }    // callers sending their own XFF
  ],
  "totalRequests": 3853,
  "minEntryCount": 1,
  "honestSampleLikely": true,
  "suggestedTrustedProxyHops": 1,
  "configuredTrustedProxyHops": 0   // ← what is live right now
}
```

**If `suggestedTrustedProxyHops` is a number, that is your answer.** If it is
`null`, the minimum has not been seen on enough requests yet — leave it and
check again after more traffic.

### Why the minimum is the right number

A caller that sends no `x-forwarded-for` produces a header written entirely by
our own infrastructure, so its length equals the number of proxies that appended
to it. A caller that spoofs the header makes the chain *longer*. Proxies append
and never remove, so **no caller can produce a chain shorter than the true hop
count** — the minimum is safe from below, which is the direction that matters.

The honest limit: if literally every request carried a spoofed header, the
minimum would overstate. `honestSampleLikely` exists so that judgement is
visible rather than assumed.

**No IP address is recorded, logged or returned by any of this** — only how many
entries each header had. A count cannot be reversed into an address.

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
