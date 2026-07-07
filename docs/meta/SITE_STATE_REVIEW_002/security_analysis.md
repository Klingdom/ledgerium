# SITE_STATE_REVIEW_002 — Security & Privacy Current-State Analysis

**Mode:** Mode 3-adjacent, read-only (ZERO code changes). **Date:** 2026-07-07. **Reviewer role:** security-engineer.
**Scope:** `apps/web-app/src/app/api/**` (auth, billing, keys, invites, share, admin, teams, workflows, upload, account) + public input pages + public security/privacy pages.
**Method:** Read/Grep/Glob static review only. No dynamic testing.

---

## Executive posture

The server surface is, on balance, **well-hardened**. Authn/authz, secrets handling, injection resistance, and the share-token IDOR surface are all in good shape. The material gaps are concentrated in **abuse control (rate limiting) on the core public auth endpoints** and a small set of **claim-vs-reality / data-integrity / info-disclosure** items. No P0 (critical auth-bypass / RCE / injection) was found.

### Strengths confirmed (preserve)
- **Password hashing:** bcrypt cost 12 (`signup/route.ts:37`, `reset-password/route.ts:50`).
- **Tokens hashed at rest:** password-reset and API keys store only SHA-256 (`forgot-password/route.ts:29-31`, `api-keys.ts:23`); reset tokens are single-use + 1h expiry + transactional (`reset-password/route.ts:33-61`).
- **Stripe webhook:** signature verified; missing secret → 500 not silent-accept (`billing/webhook/route.ts:51-62`); subscription lookups are cryptographically-grounded on `stripeSubscriptionId`, NOT mutable `metadata.userId` (`route.ts:293,382,437,493`).
- **Admin routes 404-cloaked** via `isAdminUnlimited`/`canAccessAdmin` allowlist (`admin/operations/route.ts:86`, `admin/users/[id]/route.ts:115`, `admin-allowlist.ts`). Bootstrap is env-guardable + CSRF-header + per-IP RL + SERIALIZABLE (`admin/bootstrap/route.ts:43-109`).
- **Tenant ownership enforced** on tenant-scoped resources (`workflows/[id]/share/route.ts:23-27,84-88`; team-member routes verify active owner/admin role + sole-owner protection, `teams/[id]/members/[memberId]/route.ts:52-93`).
- **Share-token surface safe from IDOR:** 128-bit `crypto.randomBytes(16)` token (`workflows/[id]/route.ts:181`), 404 on miss, returns only sop/report artifacts — not raw evidence (`share/[token]/route.ts:35-57`).
- **No secrets in code** — only env-var reads + test fixtures (`stripe.ts:23-46`). **No raw-SQL injection** — sole `$queryRaw` is static (`admin-operations/queries.ts:375`), everything else Prisma-parameterized.
- **Upload** enforces size (10 MB), `.json`-only, `JSON.parse` guard, and writes under `UPLOAD_DIR/{sessionUserId}/{randomUUID}.json` — no path traversal (`upload/route.ts:53-82`).

---

## Findings (ranked P0–P3)

### P0 — none identified.

---

### P1-1 — No rate limiting on core authentication / abuse-prone public endpoints
Bootstrap and invite-accept have per-IP limiters, but the **highest-value public endpoints do not**:
- **Login / credential brute-force:** NextAuth Credentials `authorize()` has no throttle, lockout, or backoff — unlimited password guessing (`lib/auth.ts:15-33`).
- **Signup spam / resource exhaustion:** no RL; each signup also runs 3 sample-data seeders (`auth/signup/route.ts:15,52-54`).
- **Password-reset email bombing:** no RL — an attacker can force unlimited reset emails to any known address (`auth/forgot-password/route.ts:8`).
- **Upload:** only the plan recording-limit gates it; no per-IP/time RL (`upload/route.ts:13-43`).

**Impact:** credential stuffing, account-creation abuse, email-bomb / cost abuse. **Fix direction:** apply the existing per-IP bucket pattern (`lib/rate-limit/`) — ideally a shared Redis-backed limiter — to login, signup, forgot-password, upload.

### P2-1 — Unauthenticated analytics ingestion with spoofable `userId` + no rate limit
`POST /api/analytics/events` accepts events with **no authentication** and attributes them to a **client-supplied `userId`** when no session exists (`analytics/events/route.ts:10-34`, esp. `userId: userId ?? event.userId ?? null` at :29). Caps 100 events/request but has no request-rate cap.
**Impact:** (a) **data-integrity** — an anonymous caller can forge funnel/activation events attributed to arbitrary user IDs, poisoning the admin Operations dashboard that reads this table; (b) **unbounded write DoS / storage-exhaustion** vector. **Fix direction:** require session for attribution (ignore client `userId`), add per-IP RL, cap total volume.

### P2-2 — In-memory rate limiters are per-instance (ineffective on serverless / multi-replica)
The only endpoints that DO rate-limit use a module-level `Map`, which resets per cold-started instance — explicitly documented and CEO-acked (`invites/accept/route.ts:50-67`; `lib/rate-limit/bootstrap-buckets.ts`). On Railway/Render/Vercel multi-instance, cross-instance bursts bypass the limit.
**Impact:** the abuse protection that exists is weaker than it appears. **Fix direction:** the already-tracked Redis-backed global limiter (TEAM-P04).

### P2-3 — Claim-vs-reality gaps on the public security/privacy page
`(public)/security/page.tsx`:
- GDPR card advertises **"Data export / deletion"** (`:107-112`), but there is **no self-service account-deletion endpoint** — `api/account` and `api/me` are GET-only (`account/route.ts:25`, `me/route.ts`). Deletion is not implemented as claimed.
- **"No PII storage"** (`:73`) is stated while the app stores user email/name and full workflow captures (element labels, domain/path URLs may contain PII). The page frames it around extension capture-minimization, but the flat claim overreaches.
- "SOC 2 **Alignment**" / "GDPR **Considerations**" are appropriately soft (not "certified/compliant") — acceptable, but the deletion + no-PII claims must be reconciled with implementation before external launch.

### P3-1 — Inconsistent email normalization
Signup stores and uniqueness-checks the **raw** email (`auth/signup/route.ts:29,39`), and login matches exact case (`auth.ts:21`), whereas forgot-password lowercases (`forgot-password/route.ts:20`). Enables case-variant duplicate accounts and login/reset confusion.

### P3-2 — Internal error message leaked to client
Upload 500 returns `detail: message` from the caught exception (`upload/route.ts:269-270`), potentially exposing internal detail. Log server-side; return a generic client message.

### P3-3 — Account-existence enumeration on signup
Signup returns a distinct 409 "An account with this email already exists" (`auth/signup/route.ts:30-35`), leaking account existence — while forgot-password correctly avoids enumeration. Consider a neutral response or pairing with P1-1 rate limiting.

### P3-4 — JSON-LD `dangerouslySetInnerHTML` uses `JSON.stringify` without `<`/`</script>` escaping
Many public `[slug]` SSG pages inject structured data via `dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}` (e.g. `industries/[slug]/page.tsx:27`). `JSON.stringify` does not escape `<`. Low risk today (content is from a static registry, SSG-only), but a defense-in-depth hardening candidate if any slug-derived string is ever reflected — escape `<`/`>`/`&` or use a serializer.

---

## Not-issues verified
- No `$queryRaw`/`$executeRaw` with user interpolation. No hardcoded secrets. Share token unguessable. Admin gating consistent. Team authz + sole-owner protection correct. Webhook signature + non-mutable-metadata lookups correct. Upload path traversal not possible.

## Recommended remediation order
1. **P1-1** rate-limit login/signup/forgot-password/upload (shared limiter).
2. **P2-1** authenticate + rate-limit analytics ingestion; drop client `userId`.
3. **P2-3** reconcile GDPR deletion + "No PII storage" claims (ship deletion endpoint or soften copy).
4. **P2-2** Redis-backed global limiter (TEAM-P04).
5. **P3** batch: email normalization, error-detail suppression, signup enumeration, JSON-LD escaping.
