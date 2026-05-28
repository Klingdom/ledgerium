## Summary

<!-- 1-3 bullet points describing what this PR does and why. Link the row in IMPROVEMENT_BACKLOG.md or the ADR/audit artifact that motivates it. -->

-
-

## Test Plan

<!-- How to verify the change works. Include commands the reviewer can run and the expected output. For UI changes, list the manual smoke steps. -->

```bash
pnpm typecheck
pnpm --filter @ledgerium/web-app test
```

Expected: typecheck clean across all 10 packages/apps; test count matches PR description.

Manual smoke (if applicable):

-
-

## Architectural + Security + PII Review Checklist

For PRs touching admin routes (`/api/admin/*` or `/admin/*`), verify ALL items. For non-admin PRs, mark N/A on rows that do not apply but still tick DET-1 / TYPE-1 / TEST-1 / DOC-1 (these are universal). See `CONTRIBUTING.md` for what each item catches.

- [ ] **AUTH-1**: Every new admin endpoint checks `session.user.isAdmin === true` as the FIRST guard before any other logic
- [ ] **AUTH-2**: Non-admin callers receive 404 (not 401/403) from admin routes to hide existence of the surface
- [ ] **AUDIT-1**: Every admin MUTATION writes an `AdminAuditEvent` row with `actor_id`, `action`, `target_type`, `target_id`, `before_json`, `after_json`. Reads do not require audit rows
- [ ] **AUDIT-2**: `AdminAuditEvent` rows are created in the same transaction as the mutation (atomicity) — never best-effort fire-and-forget
- [ ] **PII-1**: Diff does not add new PII to a logged payload, error message, or returned API body. PII = email, IP, user-agent, full userId
- [ ] **PII-2**: Any userId returned to a client is truncated via `truncateUserId()` unless the consumer is an admin route AND the caller is admin
- [ ] **PII-3**: Any new `console.error` or `console.log` that catches a thrown error logs `err.message` only, never the full `err` object
- [ ] **DET-1**: No `Date.now()` or `new Date()` outside a clock-injection boundary (single `const referenceNowMs = Date.now()` at handler entry, threaded as parameter to pure functions)
- [ ] **DB-1**: Prisma queries work on both SQLite and Postgres OR are wrapped in try/catch with explicit `available: false` fallback (see `DbSize` discriminated union pattern)
- [ ] **TYPE-1**: No new `as any` casts. If Prisma client narrowing is needed, widen the re-export at `@/db` instead
- [ ] **ENV-1**: Response uses the `{ data, error, meta }` envelope OR documents explicit waiver in the route's JSDoc with rationale
- [ ] **TEST-1**: ≥1 unit test per new code path including (a) admin-gate negative (non-admin → 404), (b) happy-path, (c) one error path. Audit-row creation is asserted for mutations
- [ ] **DOC-1**: JSDoc on every new exported symbol citing the row/ADR that motivated it. New operational tools carry runbook entries

## Reviewer Notes

<!-- Anything the reviewer should look at carefully: security-sensitive paths, manual smoke targets, migrations, env-var changes, etc. -->

-

---

**Per `CONTRIBUTING.md` / ADM-002 §7**: review-time target ≤ 15 min per PR. Apply the 10-step review process from `CONTRIBUTING.md` (checkout → typecheck → test → smoke → checklist → diff scan → approve/request-changes → squash-merge → deploy).
