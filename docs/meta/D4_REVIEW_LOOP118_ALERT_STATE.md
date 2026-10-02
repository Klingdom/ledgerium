# D-4 contract review — `apps/web-app/src/lib/alert-state.ts` (loop 118, row #296)

**Reviewer:** `system-architect` (read-only, invoked under CLAUDE.md § Specialist-invocation gate, clause 2).
**Recorded:** at MR-052, which found that only a one-line summary of the verdict had been saved (MR-052 §5.1). The text below reproduces the reviewer's returned verdict verbatim in substance. The reviewer's own transcript is not in the repo.
**Verdict:** READY WITH MINOR REVISIONS.

## State machine

Only state changes write a row.

```
none/resolved   --firing-->       send 'new' -> [firing]   (row written only if delivered)
firing/continued --firing-->      24h since notified ? reminder -> [firing] : no write
firing/continued --ok-->          [clear okRuns=1, since=now]
firing/continued --insufficient-->[clear okRuns=0, since=now]
clear --ok-->                     okRuns+1 ; reaching 3 -> [resolved]
clear --insufficient-->           no write (okRuns kept)
clear --firing-->                 quiet >= 6h ? 'new' : 24h since notified ? reminder : [continued]
```

Old `firing` / `resolved` rows, written before loop 118, are still read correctly.

## Findings

1. **Must fix before commit:** the comments said "consecutive ok runs", but an `insufficient_data` run between `ok` runs did not reset the count. The behaviour was kept and the wording corrected (applied in loop 118).
2. **Clock moving backwards:** a negative gap suppressed the alert, which is a missed page. Changed so that a negative gap sends (applied in loop 118). MR-052 adds that it pages every run for the length of the skew.
3. **Shared read window:** `take: 1000` is shared by all alerts. About 6 alerts flapping for 8 days push out old `firing` rows, which causes a late or duplicate reminder, never a miss. The rows also have no retention of their own. Filed as #297.
4. **Purity:** OK. The decide and reduce functions do no I/O and call no `Date.now()`. The unconfirmed-write set is applied outside them, in the route.
5. **Before more alerts build on this module:** split it into the pure state machine, DB I/O, and the in-process set, and make `AlertState` a typed union. Filed as #297.

## Added by MR-052 (executed scenarios, §5.2)

- A second outage 2 h after recovery (firing, ok, ok, firing…) is treated as a continuation. It is not paged until the 24 h reminder, about 21 h later. The size of this cost is set by the reminder interval, which was chosen before hysteresis existed.
- A restart, or a second instance, between a failed `resolved` write and the next fire gives about 20 h of silence. The deploy is a single container today.
