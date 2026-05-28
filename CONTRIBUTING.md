# Contributing to Ledgerium AI

Ledgerium AI uses PR-based delivery for admin work. Every PR touching `/api/admin/*` or `/admin/*` routes MUST pass the **Admin Architectural + Security + PII Review Checklist** below before merge.

This document codifies the review checklist surfaced by `docs/meta/ADMIN_DASHBOARD_REVIEW_002.md` §5 and the CEO-facing PR review workflow from §7. The checklist applies to admin-surface PRs; non-admin PRs may mark items N/A but the same standards apply where the surface overlaps (auth, audit, PII, determinism).

For full context — including the 18 sequenced PRs in the admin foundation, drill-down, expansion, test/a11y/ops, and growth sprints — see `docs/meta/ADMIN_DASHBOARD_REVIEW_002.md`.

---

## Architectural + Security + PII Review Checklist (Admin & Cross-Cutting)

13 binary-evaluable checks. Review-time target ≤ 10 min per PR (≤ 15 min including local checkout + smoke).

```
ARCHITECTURAL + SECURITY + PII REVIEW CHECKLIST — Admin & Cross-Cutting

[ ] AUTH-1   Every new admin endpoint checks `session.user.isAdmin === true`
             as the FIRST guard before any other logic.

[ ] AUTH-2   Non-admin callers receive 404 (not 401/403) from admin routes
             to hide existence of the surface.

[ ] AUDIT-1  Every admin MUTATION writes an AdminAuditEvent row with
             actor_id, action, target_type, target_id, before_json, after_json.
             Reads do not require audit rows.

[ ] AUDIT-2  AdminAuditEvent rows are created in the same transaction as the
             mutation (atomicity) — never best-effort fire-and-forget.

[ ] PII-1    Diff does not add new PII to a logged payload, error message,
             or returned API body. PII = email, IP, user-agent, full userId.

[ ] PII-2    Any userId returned to a client is truncated via truncateUserId()
             unless the consumer is an admin route AND the caller is admin.

[ ] PII-3    Any new `console.error` or `console.log` that catches a thrown
             error logs `err.message` only, never the full `err` object.

[ ] DET-1    No `Date.now()` or `new Date()` outside a clock-injection
             boundary (single `const referenceNowMs = Date.now()` at handler
             entry, threaded as parameter to pure functions).

[ ] DB-1     Prisma queries work on both SQLite and Postgres OR are wrapped
             in try/catch with explicit `available: false` fallback (see DbSize
             discriminated union pattern).

[ ] TYPE-1   No new `as any` casts. If Prisma client narrowing is needed,
             widen the re-export at `@/db` instead.

[ ] ENV-1    Response uses the `{ data, error, meta }` envelope OR documents
             explicit waiver in the route's JSDoc with rationale.

[ ] TEST-1   ≥1 unit test per new code path. MUST include: (a) admin-gate
             negative test (non-admin → 404), (b) happy-path, (c) one error
             path. Audit-row creation is asserted for mutations.

[ ] DOC-1    JSDoc on every new exported symbol citing the row/ADR that
             motivated it. New operational tools carry runbook entries.
```

### What each item catches

- **AUTH-1 / AUTH-2** — privilege escalation defects; existence-disclosure leaks. The 404-not-403 pattern prevents attackers from confirming which routes are admin-only.
- **AUDIT-1 / AUDIT-2** — non-repudiation of admin actions. Atomic audit writes prevent the "mutation succeeded but audit failed" gap that breaks forensic reconstruction.
- **PII-1 / PII-2 / PII-3** — accidental PII disclosure. PII = email, IP, user-agent, full userId. `truncateUserId()` returns the first 8 chars; full userId only flows to admin-on-admin contexts. `err.message` logging avoids leaking stack frames containing PII-laden parameters.
- **DET-1** — Ledgerium determinism invariant. A single `referenceNowMs` at handler entry threaded as parameter to pure functions makes the request fully replayable and testable with a frozen clock.
- **DB-1** — dev/prod parity. SQLite is the local dev DB; Postgres is production. Queries that fail on one but work on the other are silent landmines.
- **TYPE-1** — type-system erosion. `as any` casts hide future regressions; widening the `@/db` re-export forces the cast to be reviewed once at the boundary.
- **ENV-1** — API contract uniformity. The `{ data, error, meta }` envelope is the standard; waivers are explicit and documented.
- **TEST-1** — coverage of the three branches every admin endpoint has: gate-fail, happy-path, error-path. Audit-row assertions prevent the "I forgot the audit write" regression.
- **DOC-1** — traceability from code to the row/ADR that motivated it. Future readers (including future-you) need the link back.

---

## PR Review Workflow (CEO-facing)

Per `docs/meta/ADMIN_DASHBOARD_REVIEW_002.md` §7 — the reviewer should process each PR as follows:

```
PR REVIEW STEPS (≤15 min per PR)

1. Check out the branch locally:
   git fetch origin && git checkout <branch-name>
   pnpm install  (if package.json changed)

2. Run typecheck:
   pnpm typecheck
   Expected: 0 errors across all 10 packages/apps

3. Run web-app filter tests:
   pnpm --filter @ledgerium/web-app test
   Expected: all pass; counts match PR description

4. Start dev server + manual smoke:
   pnpm --filter @ledgerium/web-app dev
   Navigate to the route described in the PR
   For admin routes: also verify non-admin gets 404

5. Apply the §5 Architectural Checklist (13 items)
   Each item should be binary YES — if any NO, request changes

6. Check the diff for:
   - Unintended files modified outside PR scope
   - New `as any` casts without justification
   - PII leaks (grep for `email`, `userId:` in new code)
   - Schema migrations are additive-only

7. Approval criteria:
   - All tests pass + typecheck clean
   - Manual smoke confirms described AC
   - §5 Architectural Checklist all PASS
   - Diff is reviewable in ≤10 min

8. Request changes if:
   - Any skipped test without documented rationale
   - PII appears where PR spec said it would not
   - Migration is destructive
   - §5 Checklist has any FAIL

9. Merge strategy: SQUASH MERGE (clean main history; each PR = 1 revertable commit)

10. Post-merge deploy: GitHub Actions auto-deploys; for migrations confirm
    `prisma migrate deploy` runs as part of deploy step
```

**Merge cadence**: 1-2 PRs per day during foundation sprints (PRs 1-5), 2-3 PRs per day during expansion sprints (PRs 6-18). This balances review depth with shipping velocity.

---

## Foundational ADRs (PENDING — to write before more admin work)

Per `docs/meta/ADMIN_DASHBOARD_REVIEW_002.md` §4, five Architecture Decision Records are queued. **None of these ADRs are written yet.** Future PRs introducing patterns in any of these areas SHOULD reference the relevant ADR (creating it if needed in the same PR or an immediately-preceding Define-phase iteration).

| ADR | Scope | Blocks |
|---|---|---|
| **ADR-ADMIN-AUTHZ** | Unify `isAdminUnlimited` + `isAdmin` + bootstrap DB read into single predicate; capability layer foundation (`User.adminScope: string[]`); allowlist sunset path | ALL future admin PRs |
| **ADR-ADMIN-AUDIT** | Dedicated `AdminAuditEvent` table (NOT overload `AnalyticsEvent`); hash-chain + DB-role append-only enforcement; 7-year retention matching ADR-AI-002 | All admin mutation endpoints; SOC 2 Type I prep |
| **ADR-ADMIN-PII** | "Admin routes are ONLY surface that deserializes PII from DB"; `selectPublicUser` helper at `@/db`; ESLint rule banning `select: { email: true }` outside `/api/admin/*` | #151 top-uploaders surface; `/api/analytics/ingest` design |
| **ADR-ADMIN-DEPLOY** | Admin routes are gated; can ship more aggressively; `NEXT_PUBLIC_ADMIN_ROUTES_ENABLED` flag for emergency disable; rollback procedure | Speeds up every subsequent admin PR |
| **ADR-ADMIN-INGEST** | HMAC-signed envelope contract for client + extension `track()` callers; Zod schema; PostHog fan-out + DB write both in handler | #147 ADMIN-P01 + #148 ADMIN-P02 |

When an ADR lands, link to its `docs/adr/ADR-ADMIN-*.md` path from this section.

---

## When the Checklist Applies

| Surface | Checklist applies? | Notes |
|---|---|---|
| `/api/admin/*` routes | YES — all 13 items | Highest-stakes surface |
| `/admin/*` pages | YES — items minus AUDIT-1/2 (UI-only) | Apply AUTH-1/2 + PII-1/2/3 + DET-1 + TYPE-1 + TEST-1 + DOC-1 |
| `/api/analytics/ingest` and other cross-cutting endpoints handling PII | YES — items PII-1/2/3, DET-1, TYPE-1, TEST-1 | Cross-cutting PII guards |
| Non-admin web-app PRs | Apply selectively — at minimum DET-1, TYPE-1, TEST-1, DOC-1 | Determinism + types + tests + docs are universal |
| Documentation-only PRs | N/A for production-code items; DOC-1 applies to new artifacts | E.g., this PR |

---

## Standards Beyond the Checklist

The full Ledgerium coding + architecture standards live in `CLAUDE.md` (sections **Coding Standards** and **Architecture Principles**). The checklist above is the **admin/cross-cutting layer**; the CLAUDE.md sections are the **universal layer**. Both apply.

Key universal expectations:

- **TypeScript strict mode** — no `any` without justification
- **Parameterized queries only** — no string-concat SQL
- **Additive migrations by default** — destructive migrations require explicit approval
- **Soft deletes preferred** — over hard deletes
- **Required DB fields** — `id`, `created_at`, `updated_at` on every table
- **Async jobs > 200ms** — return `job_id` not blocking response
- **No secrets in code** — env vars only, validated at boot
- **One primary export per file** — no logic in `index` files
- **camelCase / PascalCase / snake_case / SCREAMING_SNAKE_CASE** — per the naming rules in CLAUDE.md

---

## Quick Reference — Filing a PR

1. Branch from `main`: `git checkout -b <prefix>/PR-N-short-slug` (e.g., `admin/PR-6-user-detail-api`)
2. Implement the smallest reversible change matching one logical outcome
3. Add tests covering all three branches (gate-fail / happy / error)
4. Run `pnpm typecheck` + `pnpm --filter @ledgerium/web-app test` locally; both must be clean
5. Open the PR using the `.github/PULL_REQUEST_TEMPLATE.md` template
6. Fill in **Summary** + **Test Plan** + tick the **Architectural Checklist** items
7. Wait for review; address requested changes; squash-merge on approval

For multi-iteration features, see CLAUDE.md `Audit-Intake Pattern` clause 8 (multi-iteration umbrella row split) — prefer splitting into independent rows over bundling.
