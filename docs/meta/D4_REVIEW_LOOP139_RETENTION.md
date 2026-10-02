# D-4 clause 2 contract review — `lib/workflow-retention.ts` (loop 139, row #319)

Reviewer: system-architect (read-only, adjacent). Scope: `apps/web-app/src/lib/workflow-retention.ts` (321 LOC, 13 exports), `app/api/admin/retention/purge/route.ts`, `lib/workflow-retention.test.ts`, the writers of `Workflow`.

## Verdict: READY WITH MINOR REVISIONS (2 must-change, both small)

### 1. Contract: sound
- The three layers are cleanly separated. Env parsing (`resolvePurgeAfterDays`, which fails closed with no silent default) is separate from the pure rule (`purgeCutoffMs`, `selectPurgeEligible`, both taking `nowMs`, with a deterministic oldest-then-id order and an inclusive boundary at exactly N days), which is separate from the I/O orchestration (`purgeExpiredWorkflows`, with structural `RetentionDb` and injected `unlinkFile`/`realpath`/`uploadDir`). The only `Date.now()` call is in the route. Good.
- The purge re-checks inside the transaction (`deleteMany` where status + `updatedAt <= cutoff`), which closes the race with a restore. The file is unlinked before the Upload row is deleted, and the transaction rolls back if the unlink fails. Paths are contained by resolving real paths. Correct.
- Minor points (not blocking): `dryRun` returns before the orphan sweep, so a dry run under-reports `uploadsRemoved`/`orphansRemoved`. `filesRemoved` mixes purge-path files with sweep files. The comment "selectPurgeEligible is the authority" overstates it: the DB predicate already applies the same rule, so the function can only narrow it. Holding a DB transaction open across file I/O is acceptable at batch size 100.

### 2. Traceability: gap (MUST-CHANGE A)
Counts are logged, but nothing records **which** workflows were irreversibly destroyed. CLAUDE.md requires "every output traceable", and you cannot answer "was workflow X purged, and when?" today. The minimal record that carries no PII:
- `purgeExpiredWorkflows` also returns `purged: Array<{ ref, deletedAtMs }>` in a separate field, not in `PurgeSummary`. `ref` = `sha256(workflow.id)` and `deletedAtMs` = the `updatedAt` clock value used.
- The route writes one server-side log line per run: run timestamp, `retentionDays`, `cutoffMs`, and the refs. These must **never** go in the HTTP body, because the body lands in GitHub Actions logs and the 500 path spreads `summary` into it.
- Why a hash rather than the raw id: you can still verify a specific id on request by hashing it, but the log is not a directory of a user's workflow ids. Titles, owners and paths stay out.

### 3. `updatedAt` as the deletion clock: acceptable, but the guard is incomplete (MUST-CHANGE B)
- **Failure direction.** Most ways this breaks are fail-late. A write to a deleted row bumps `updatedAt`, which delays the purge: a privacy and public-promise breach, but no data is lost early. The one fail-early path is a writer that sets `updatedAt` explicitly (Prisma allows overriding it), for example a backfill or a data-fix script.
- **What would silently break it.** The source-scan test pins the three *known* sites (GET, PATCH, DELETE in `[id]/route.ts`). It **does not catch a new writer** in another file. The share and intelligence checks are weak: they only assert that the string `status: 'active'` appears somewhere in the file.
- **A live example already exists.** `intelligence.ts:428` runs `workflow.updateMany({ where: { id: { in } } })` without a status filter. It reads active rows at line 95, so a delete that lands between that read and the write re-stamps a deleted row (a TOCTOU race; fail-late).
- **Fix (test-only, about 20 LOC).** Add a census test that scans non-test `src/**/*.{ts,tsx}` for `workflow.(update|updateMany|upsert)(` and for `$executeRaw`/`$queryRaw` touching `"Workflow"`. It asserts the set of matching files equals an allowlist (`[id]/route.ts`, `share/[token]/route.ts`, `intelligence.ts`) and that no workflow write passes `updatedAt:`. A new writer then fails CI and forces someone to consider deleted rows.
- **Long-term.** A `deletedAt` column is the right end state once migrations apply reliably (row #12). Backfill it from `updatedAt` for rows already deleted, then switch the predicate. Until then the census test is the guard.

### 4. Disposition
| Item | Class |
|---|---|
| A. Audit record of purged refs (hashed id + clock value), server log only | **Must-change before commit** |
| B. Writer-census test (allowlist + no explicit `updatedAt`) | **Must-change before commit** |
| Add `status: { not: 'deleted' }` to the `intelligence.ts:428` `updateMany` (and to the view-count update in the share route) | Follow-up (fail-late only) |
| Dry run should also count orphan-sweep candidates; split `filesRemoved` into purge vs sweep | Follow-up |
| `deletedAt` column migration once row #12 is resolved | Follow-up (blocked on #12) |
