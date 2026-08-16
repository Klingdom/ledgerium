# MR-005 D-7 Mode 4 Pre-Check — SOP Specificity Capture-Pipeline Block

**Type:** MR-005 D-7 meta-coordinator Mode 4 pre-check (NON-counting; NO product code)
**Date:** 2026-07-05
**Scope:** the remaining CAPTURE-PIPELINE items of `SOP_DETAIL_SPECIFICITY_REVIEW_001` (§7 / §10) — P0-a, P1-e, P1-d, P1-f. Safe items P0-b + P0-c are shipped/validated.
**Trigger:** N≥6 directed capture-pipeline sequence (P1-e splits ≥3) crossing the Mode-5 N≥6 soft-cap (CLAUDE.md Mode 5 guardrail 10 / MR-005 D-7). **Every item is Extension-Reliability-Invariant-governed.**
**Verdict headline:** **CLEAR-CONDITIONAL** — proceed as a **Mode 3 fix (P0-a) + Mode 1 directed series** (NOT a single Mode 5 batch), gated on 4 explicit CEO acks in §7.

---

## 1. Projected pool trajectory — PROMOTE P0-a ONLY now

Per audit-intake pattern (CLAUDE.md §Audit-Intake, P0-only live promotion): **promote P0-a to live `IMPROVEMENT_BACKLOG.md` now** (`Birth iter: audit-intake` / SOP-SVR anchor). P0-a is the only true P0 in the residual block and it is an independent privacy blocker (Finding F-0), not a vagueness item.

**P1-e / P1-d / P1-f stay COLD** in `SOP_DETAIL_SPECIFICITY_REVIEW_001.md §7` and promote via the trigger paths only:
- P1-e sub-deliverables (e1/e2/e3) promote at intake **as independent rows** per MR-016 umbrella-split (see §4), each with its own `Birth iter: audit-intake` anchor, IFF CEO approves the block for execution.
- P1-d / P1-f promote on P0-burn-down slot creation OR when a directed pick names them.

**Net pool effect:** +1 (P0-a) immediately. If CEO greenlights the full block, +5 total at block open (P0-a + e1 + e2 + e3 + P1-d + P1-f = +6 rows, −0 until shipped). Recommend **staged promotion**: promote P0-a now; promote P1-e sub-rows + P1-d + P1-f only at the CEO go-ahead that opens the block, to keep the live pool diagnostic. This is NOT a pool-ceiling event (block is directed; ceiling bypassed by operating-mode precedence).

---

## 2. Area-saturation arc — TRIPS; requires CEO ack

**All four items are extension/capture-pipeline Area.** Executed contiguously they trip the 3-consecutive-same-Area rule (Selection Policy Step 2) by the 3rd item and stay tripped through the block. Because this is a directed series in one Area, **Mode 5 guardrail 6 same-Area saturation protocol applies: an explicit CEO `mode-5-saturation: user-ack` is MANDATORY** and must be captured in the opening item's Candidate Selection block. Silent proceed is a hard block.

**Recommended ack language (CEO to log verbatim):**
> `mode-5-saturation: user-ack; rationale: SOP specificity capture-pipeline block is a single privacy+specificity remediation family gated behind one real-extension harness cycle; contiguous same-Area execution is intended to amortize harness setup and keep the guarded capture changes reviewable as one arc.`

**Alternative (only if CEO prefers to reset the clock):** interleave one non-capture item between capture items — the natural candidate is **P2-g (per-step purpose/expectedOutcome derive-or-null, process-engine, SAFE)** after P1-d. This breaks the run without a saturation ack but lengthens the sequence and delays P1-f. **Recommendation: take the single ack** — cleaner and the harness-amortization rationale is genuine.

---

## 3. Agent-diversity projection — WOULD trip; rotation plan required

Capture-pipeline + normalizer + sopBuilder logic routes naturally to `backend-engineer`. Naive assignment = backend-engineer on P0-a, P1-e (×3), P1-d, P1-f → **6 consecutive → trips the same-implementer-4+ rule** well before the block ends. Prior thread agents: `qa-engineer` (P0-b), `backend-engineer` (P0-c).

**Recommended rotation (keeps every window ≤3 consecutive same primary):**

| Item | Primary | Adjacency (consult, non-counting) |
|------|---------|-----------------------------------|
| P0-a pageTitle redaction | `backend-engineer` (Mode 3) | `extension-privacy-auditor` MANDATORY (F-0 owner) |
| P1-e·e1 schema + target_summary + capture wiring | `system-architect` | `extension-privacy-auditor` (§6 guards) |
| P1-e·e2 normalizer passthrough | `backend-engineer` | — |
| P1-e·e3 sopBuilder consumption | `backend-engineer` | `ux-designer` (Tier rubric §4) |
| P1-d structural-field surfacing | `system-architect` OR `backend-engineer` | `ux-designer` |
| P1-f RC-3 business-ID allowlist | `extension-privacy-auditor` PRIMARY (or `backend-engineer` + auditor adjacency) | `security` consult |

Assigning **e1 + P1-d to `system-architect`** (both are contract/schema-shape changes — e1 touches `packages/schema-events` `canonical-event.schema.ts`, triggering D-4 clause 2 system-architect adjacency anyway) and **P1-f to `extension-privacy-auditor`** breaks the backend-engineer run at ≤2 consecutive in every window. No 4+ trip. Any web-app display surfacing (P1-d step-text render, if it reaches web-app) routes to `frontend-engineer`.

---

## 4. P1-e umbrella split — CONFIRMED (MR-016 §Audit-Intake clause 8)

P1-e projects across ≥3 independent, independently-shippable sub-deliverables → **MUST split at intake into independent rows**, each own pick + own validation + own harness cycle + own `Birth iter: audit-intake` anchor:

- **P1-e·e1** — `packages/schema-events` `canonical-event.schema.ts` neighbor-context slot activation + `target_summary` field + capture wiring in `apps/extension-app` (`inspectTarget` → `extractLabelWithContext`; modalTitle **aria-only**, tableHeader, activeTab, nearbyLabels; breadcrumb→**routeTemplate NOT textContent**); privacy guards §6 (sensitive-region null-propagation).
- **P1-e·e2** — normalizer passthrough (`background/normalizer.ts` reads the new structural fields; no `el.value`/`textContent`).
- **P1-e·e3** — `sopBuilder` consumption of neighbor context into step text (Tier rubric §4).

Byte-coupling exception does NOT apply — e1/e2/e3 ship across separate iterations. Split preserves numerator-credit accuracy (3 credits, not 1) and clean traceability. **e1 → e2 → e3 is a hard dependency order** (schema before passthrough before consumption).

---

## 5. Real-extension harness dependency — validation-of-record per item

**Unit tests CANNOT certify capture-pipeline health** (CLAUDE.md Extension Reliability Invariant; iter-097/099 regression history). The harness is `apps/extension-app/playwright.real-ext.config.ts` + `sidepanel-real.spec.ts` (launchPersistentContext). **Known Windows flake: real-ext tests 2/3 skipped** (`chrome.tabs.query()` empty-array) → for any item those paths cover, **manual real-Chrome CEO test is the fallback gate of record**, with manual evidence logged in the item entry.

| Item | Gate of record | Fallback if harness path flaky |
|------|----------------|-------------------------------|
| P0-a | Real-ext harness pass + confirm `document.title` with seeded PII (`"Inbox (3) – phil@mediafier.ai"`) is redacted in transmitted `page_context.pageTitle` | Manual real-Chrome capture + inspect uploaded bundle |
| P1-e·e1 | Real-ext harness pass + capture emits neighbor fields; sensitive-target → all-null | Manual real-Chrome on a modal/table page |
| P1-e·e2 | Normalizer passthrough unit tests + **e1 harness evidence still green** (no capture regression) | Re-run e1 manual capture |
| P1-e·e3 | Real-ext end-to-end: recorded session → SOP shows neighbor context | Manual real-Chrome SOP render check |
| P1-d | Real-ext harness pass + step text shows interactionType/keyboard_intent | Manual real-Chrome |
| P1-f | Real-ext harness pass + `"Order #10234"` survives, `account/customer/...` prefixes still redacted; **both `label-extractor.ts::applySafetyHeuristics` AND `neighbor-context-extractor.ts::safeText` updated ATOMICALLY** | Manual real-Chrome on business-ID + PII-prefix inputs |

**No item may be declared shipped on `pnpm test` alone.** Each entry must record either harness-pass evidence or logged manual CEO real-Chrome evidence.

---

## 6. Sequencing recommendation

**P0-a FIRST as a standalone Mode 3 debugging fix** — it is an independent, urgent privacy blocker (F-0), NOT a vagueness item; handling it as Mode 3 keeps it off the improvement-loop cadence and lets it ship ahead of the vagueness burn-down. Then the vagueness capture block as a **Mode 1 directed series** (one item per loop, own commit/validation/artifacts):

1. **P0-a** — Mode 3 (privacy; ship immediately, real-ext gate)
2. **P1-e·e1** — schema + capture wiring (foundation; `system-architect`)
3. **P1-e·e2** — normalizer passthrough (`backend-engineer`)
4. **P1-e·e3** — sopBuilder consumption (`backend-engineer` + ux adjacency)
5. **P1-d** — structural-field surfacing (`system-architect`/`backend-engineer`)
6. **P1-f** — RC-3 business-ID allowlist (`extension-privacy-auditor`; **atomic dual-file**)

**Rationale for order:** P1-e is highest-specificity leverage and e1 unblocks e2/e3/P1-d's richer inputs; P1-f (redaction relaxation) is deliberately LAST so it lands after the neighbor-context guards it must stay atomic with are in place. **Do NOT run as a single Mode 5 batch** — the P0-a/vagueness split, the per-item harness gate, and the hard e1→e2→e3 dependency all favor a Mode 1 series; a Mode 5 batch would couple independently-reversible harness-gated changes.

**Defer nothing further from this block** — P2-g/P3-h/P3-i already correctly deferred in §7. If CEO wants to shorten, **P1-d is the safest single deferral** to a later sequence (it surfaces already-captured fields — lower specificity leverage than P1-e).

---

## 7. Explicit open decisions for CEO (acknowledge before execution)

1. **Saturation ack (BLOCKING):** log the `mode-5-saturation: user-ack` in §2, OR direct interleaving of P2-g to break the run. No execution without one.
2. **P0-a as Mode 3:** authorize P0-a as an immediate standalone Mode 3 privacy fix ahead of the vagueness items? (Recommended: yes.)
3. **Promotion policy:** approve promoting **P0-a now** + staged promotion of P1-e·e1/e2/e3 + P1-d + P1-f **at block-open** (not now)? (Recommended: yes.)
4. **P1-e split:** ratify the e1/e2/e3 sub-deliverable split and the hard e1→e2→e3 order? (Recommended: yes.)
5. **Harness fallback:** pre-authorize **manual real-Chrome CEO validation** as the gate of record for any item whose coverage falls on the Windows-flaky real-ext tests 2/3? (Recommended: yes — otherwise the block stalls on a known-flaky harness.)
6. **Rotation:** accept the §3 agent plan (system-architect on e1/P1-d; extension-privacy-auditor on P1-f) to avoid a same-agent 4+ trip? (Recommended: yes.)

**Meta-coordinator verdict: CLEAR-CONDITIONAL on decisions 1–5.** The block is well-scoped, guarded, and measurable; the only structural risks (Area saturation, agent 4+, umbrella under-credit, harness certification) each have a named mitigation above. No CLAUDE.md governance diffs proposed. This pre-check is Mode 4 non-counting.
