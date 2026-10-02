# D-4 contract review: `lib/alerts/*` split + re-arm (loop 121, row #297)

**Reviewer:** `system-architect` (read-only; CLAUDE.md specialist-invocation gate, clause 2). Extends `D4_REVIEW_LOOP118_ALERT_STATE.md`.
**Verdict:** READY WITH MINOR REVISIONS. Two small fixes before commit (M1, M2). Everything else can be a follow-up.

## 1. State machine (loop-118 sketch extended)

```
none/resolved      --f--> 'new' -> [firing]                  (row written only if delivered)
firing             --f--> 24h since page ? reminder : no write
clear(k,since)     --f--> quiet>=6h ? 'new' : 24h ? reminder : [continued runs=1]
continued(r)       --f--> 24h ? reminder : (r+1>=2 && gap>=4h) ? 'new' : no write (r+1>=2) / [continued r+1]
continued(legacy)  --f--> as loop 118 (never re-arms)
firing/continued   --o--> [clear 1, since=now]   --i--> [clear 0, since=now]
clear              --o--> k+1, 3 -> [resolved]  --i--> no write
```

- **Lost pages:** none found. A failed re-arm or quiet-new send writes nothing, so the previous state stays and the next run retries. A failed `continued` write makes the next run forget the alert, so it pages again (duplicate, not loss).
- **Flapping:** f/o never re-arms; it is paged once per 24 h. f/f/o pages about every 6 h. f/f/o/o, and o-blips inside an outage, page after at least 4 h (`ALERT_REARM_MIN_GAP_MS`), as designed. f/i/f/i never re-arms.
- **f/i/f/f:** one `insufficient_data` run in the middle of a sustained outage re-pages it after 4 h or more. That run is not evidence of recovery. This is design question F1, not a defect.
- **Legacy rows:** pre-118 `firing`/`resolved` rows and pre-121 `continued` rows with no `firingRuns` are read correctly (`state-machine.ts:62,124,185`). A pre-121 `continued` row can never re-arm, and it is replaced at the next `clear`.

## 2. `store.ts` read (`contains` -> SQLite `LIKE '%needle%'`)

- **Prefix/substring:** safe. The needle `"alertId":"<id>"` ends with the closing quote (`store.ts:45`), so `abc` cannot match `abcd`. No other field contains `"alertId":`.
- **Spacing:** safe. The writer (`store.ts:67`) and the test fixtures both use compact `JSON.stringify`.
- **M1 (must fix): the firing query depends on key order.** `store.ts:49` needs `alertId` immediately followed by `state`. Only the object-literal order at `store.ts:67` guarantees that. If the order changes, `lastFiring` is silently `null` and `notifiedAtMs` falls back to the newest row's time (`state-machine.ts:115`). A flapping alert writes a row every run, so its 24 h reminder would never fire. That is a loss. Fix: `AND: [{properties:{contains:idNeedle}}, {properties:{contains:'"state":"firing"'}}]`, or add a test that locks the writer to the needle.
- **M2 (must fix, cheap): the LIKE wildcards are not escaped.** In SQLite, `_` matches any single character and ASCII matching is case-insensitive. Prisma `contains` does not escape `_`/`%`. The ids in `compute-alerts.ts` today (`zero_uploads_24h`, …) do not collide: no two have the same length while differing only at `_` positions or in case. A future id could collide. Then `findFirst` returns the other alert's row, this alert reads as "no state", and it pages every run. Add a unit test asserting that ids match `/^[a-z0-9_]+$/` and are pairwise LIKE-distinct. Alternative: a raw `LIKE ? ESCAPE '\'`.
- **Test gap:** both mocks use `String.includes` (`route.transitions.test.ts:21`, `route.integrity.test.ts:40`). LIKE semantics are therefore never exercised.

## 3. Purity, barrel, layering

- `state-machine.ts` is pure: no I/O, and the clock is injected. The I/O is confined to `store.ts`.
- `unconfirmed.ts` keeps its module state outside the pure core.
- `alert-state.ts` contains only re-exports, so it complies with "no logic in index files". It re-exports selectively (`markWrite*` stays internal).
- The route imports the barrel (`route.ts:7`). That is acceptable, and the dependency direction is acyclic (store -> state-machine, unconfirmed).

## 4. Follow-ups (not blocking)

- **F1:** decide whether a `clear` with `okRuns=0` (insufficient-only) should count toward re-arm.
- **F2:** add an in-memory SQLite or LIKE-faithful mock test for `loadAlertStates`.
- **F3:** carried forward from loop 118: restart residual and clock-skew paging.
