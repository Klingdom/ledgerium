# D-4 clause 2 review: `packages/decision-engine` (row #121, PATHE-P05 signals 1-3)

Reviewer: `system-architect` (read-only, adjacent) · Surface: uncommitted, about 585 LOC production / about 250 LOC exported
**Verdict: READY WITH MINOR REVISIONS.** The trie, the outcome enumeration and the determinism scaffolding are sound. Four items must change before commit. None of them changes the architecture.

## Must change before commit
1. **Trie key escaping is broken. The test does not catch it.** `trie.ts:30` `s.replace(/[\|]/g, (c) => `\${c}`)`: in a template literal, `\$` is an escaped `$`. So every `|` becomes the literal text `${c}`, and `\` is never escaped. Two steps can therefore collide: (`"a${c}"`, `"b"`) and (`"a|"`, `"b"`) both produce the key `a${c}|b`. The fix is `/[\\|]/g` → `` `\\${c}` ``. Add a test that asserts this exact pair produces different keys. Today's "injective" test passes only by accident.
2. **The P01 audit-honesty IFF wins over the row formula.** `DecisionPoint` declares `isInferred ⇔ confidenceScore < 0.55` (`closed-unions.ts:144`, `entities.ts`, the `INFERRED_CONFIDENCE_THRESHOLD` constant). The schema contract outranks a backlog formula. Under the row formula, the runs term alone saturates: with 5 runs and zero signal, the score is 0.80, which is the High band. Enforce the IFF after `computeConfidence`:
   - if every condition is inferred, cap the score just below 0.55 (for example at 0.549999);
   - otherwise, set `isInferred = score < 0.55`.
   - `unknown_inferred` must always carry `isInferred: true`.
   Keep the raw formula value in `confidenceTerms` (or add `rawConfidence`) so the original computation stays visible. Add an IFF property test.
3. **No evidence ref may have an empty id.** At a root branch point, `refOf(rootVisit)` returns `stepId: ''` and `eventIds: []`. Those refs feed the `inferred_unknown` evidence, so the condition cannot be traced to anything. At the root, use the outcome's first-step refs instead. Add a test that no ref has `stepId === ''`.
4. **Layering (ruling 1): accept the app import temporarily, and track it.** `closed-unions.ts` has zero imports and the import is type-only, so it erases at runtime. Typecheck works today because tsc follows the relative path. However, it type-checks app source under this package's compiler options, and it breaks the moment that file gains an import or path alias.
   - Moving the unions is **not** the same logical outcome. It edits the P01 web-app module and its consumers, a different surface (guardrail 7(b) and 7(e)).
   - Before commit: open a follow-up row: "extract the 5 closed unions + `INFERRED_CONFIDENCE_THRESHOLD` to `packages/process-graph/` (PRD AC-1.1's named home; *not* `shared-types`, which is the extension message-contract package), with web-app re-exporting them."
   - Replace the dangling "SERVICE NOTE in index/report" comment in `types.ts` with the row number.

## Rulings
- **(2) Confidence terms.** All are deterministic and pure; the `round6` step is good. Accepted for v1 with notes:
  - `consistency` is outcome-level: a run counts as explained if any run of its outcome had a unique value.
  - `evidenceQuality` is close to 1 for any real ingest, so it barely discriminates.
  - The `GENERIC_LABELS` list is thin. Align it with the intent-inference "Needs label" regex.
- **(3)** See item 2: P01 wins.
- **(4) Question inference.** The precedence is sound: label pairs come first, then observed conditions. Ambiguities, to fix as a follow-up with fixtures:
  - `return` in REJECT ("Return to list").
  - `correct`, `fix` and `open` are polysemous.
  - The VALIDATION rule fires when *any single* outcome contains a token ("Open error log" vs "Close"). It should require a pair, with failure tokens in one outcome but not the other.
- **(5) `StepInput` extensions.** The optional `uiState`, `offeredOptions` and `actorRole` fields are acceptable and additive. Document three things:
  - Inputs must be PII-sanitized upstream. They are quoted verbatim into `description`.
  - `uiState` comes from the P02 `neighborContext.modalTitle`.
  - `offeredOptions` **has no producer yet**, so signal 3 is dormant in production.
  - `actorRole` partially pulls P07's signal 11 forward. That is acceptable because pattern 4 needs it.

## Confirmed sound
- Runs are sorted by `runId`, and duplicate runIds throw.
- Children, values and outcomes are sorted by code unit with tie-breaks. The shuffle and repeat tests exist.
- `index.ts` contains re-exports only.
- Outcome evidence carries runId, stepId and eventIds, and so do the observed conditions.

## Follow-ups (not blocking)
- Hash `decisionId` (versioned sha256) before persistence or analytics. P14 forbids raw UI text in IDs.
- Cap `description` at 200 chars (the `Condition` entity budget). Joined `offeredOptions` is unbounded.
- Signal 3 matches an intent-led `normalizedLabel` against raw option text by exact equality. It will rarely match; use token containment.
- Copy: about 10 templates, including the question strings, `(end of workflow)` and `start of workflow`. These trip **D-4 clause 1**. A `growth-strategist` review is required before they are wired to UI (P12 or P15), not now.
