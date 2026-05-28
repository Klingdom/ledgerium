# Demo Mode Environment Variables

Operational env vars for the demo period (2026-05-25 onward). Set in your deployment environment or `.env.local`.

---

## DISABLE_ADMIN_BOOTSTRAP

**Purpose:** Disable the `/api/admin/bootstrap` self-promotion endpoint.
**Values:** `true` = endpoint returns 404; unset or any other value = endpoint active.
**Default:** unset (endpoint active).
**When to set:** Set to `true` in the demo environment to prevent demo users from promoting themselves to admin.

```
DISABLE_ADMIN_BOOTSTRAP=true
```

---

## NEXTAUTH_SESSION_MAXAGE

**Purpose:** Control how long a user's JWT session remains valid.
**Values:** Integer seconds. E.g. `3600` = 1 hour, `86400` = 1 day.
**Default:** `604800` (7 days).
**When to set:** Shorten during demo period to reduce exposure from shared demo accounts.

```
NEXTAUTH_SESSION_MAXAGE=3600
```

---

## DEMO_MODE_DISABLE_TEAMS

**Purpose:** Disable team creation (`POST /api/teams`) and invite sending (`POST /api/teams/:id/invite`).
**Values:** `true` = both endpoints return 404; unset or any other value = endpoints active.
**Default:** unset (endpoints active).
**When to set:** Set to `true` in the demo environment to present a read-only team experience.

```
DEMO_MODE_DISABLE_TEAMS=true
```
