# Evidence Artifact — Content Shape Scope

**Tier 1 item 2 of `SYNTHESIS.md` ("Publish real measured data")**

**Author:** content-editor
**Date:** 2026-09-09
**Mode:** Mode 3-adjacent scoping. Zero product code, zero content pages written.
**Inputs read:** `SYNTHESIS.md`, `content_model.md` (own prior artifact), `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md`, `fixtures/workflows/*`, `docs/invariants.md`, the four regression/convergence test files, `apps/web-app/src/app/(public)/methodology/page.tsx`, `apps/web-app/src/content/pages/*.ts`, `apps/web-app/src/lib/seo/related.ts`, `apps/web-app/src/app/llms.txt/route.ts`.
**Live verification run:** 2026-09-09, this machine. Commands and outputs quoted inline.

---

## 0. The recommendation in one paragraph

Ship **one artifact: a Determinism & Reproducibility Report**, published at **`/methodology/determinism`** as a proof appendix under the existing `/methodology` hub, with a **downloadable, hash-verifiable fixture corpus** as its payload.

It is the only candidate that needs **zero customers**, because its subject is not what Ledgerium's users do — it is what Ledgerium's *code* does, which is already machine-proven in CI and already reproducible by a stranger on their own machine in under a minute. It is also not a new claim: the corpus already asserts determinism **40 times across 4 registries**, and cites nothing. This artifact is the missing citation target for content that is already published and currently unbacked.

**Five prerequisite defects block publication.** They are listed in §8 and all were found during this scoping pass. The most serious: **5 of the 10 workflow fixtures fail their own SHA-256 integrity manifest.** Publishing a reproducibility artifact whose integrity manifest does not verify would be worse than publishing nothing.

---

## 1. Ground truth — what was verified, on this machine, today

Everything in this section is **VERIFIED** unless marked otherwise. Nothing below is estimated.

### 1.1 The determinism evidence exists and passes

```
$ npx vitest run packages/normalization-engine/src/full-pipeline.regression.test.ts \
                 apps/extension-app/src/background/convergence-invariant-i1.test.ts
 ✓ packages/normalization-engine/src/full-pipeline.regression.test.ts  (16 tests) 14ms
 ✓ apps/extension-app/src/background/convergence-invariant-i1.test.ts  (26 tests) 14ms
 Test Files  2 passed (2)
      Tests  42 passed (42)
   Duration  631ms

$ npx vitest run packages/segmentation-engine/src/convergence-batch.regression.test.ts \
                 packages/segmentation-engine/src/convergence-live.regression.test.ts
 ✓ convergence-batch.regression.test.ts (24 tests) 16ms
 ✓ convergence-live.regression.test.ts  (24 tests) 16ms
      Tests  48 passed (48)
```

**90 byte-identity / determinism assertions across 4 files and 16 distinct golden fixtures** (12 in `packages/segmentation-engine/fixtures/golden/`, 4 raw→normalized→segmented pipeline fixtures in `packages/normalization-engine/fixtures/golden/`).

The assertions are literal string comparison, not deep-equal:

```ts
// full-pipeline.regression.test.ts:210
expect(JSON.stringify(observed)).toBe(JSON.stringify(expected));

// convergence-invariant-i1.test.ts:170
expect(JSON.stringify(livePathLiveSteps)).toBe(JSON.stringify(batchPathLiveSteps));

// convergence-invariant-i1.test.ts:186
expect(JSON.stringify(livePathDerivedSteps)).toBe(JSON.stringify(batchPathDerivedSteps));
```

That third one is the strongest single fact available: the **live streaming path** and the **batch reprocessing path** — two independent implementations — produce byte-identical `DerivedStep[]` on all 12 fixtures.

### 1.2 The full suite, and the CI gate

```
$ pnpm test
 Test Files  224 passed (224)
      Tests  4605 passed (4605)
   Duration  23.51s
```

`.github/workflows/deploy.yml:41,44` runs `pnpm typecheck` then `pnpm test` **before deploy**. So the determinism assertions are not decorative — a regression blocks the release.

### 1.3 The single most citable fact in the repository

`apps/web-app/src/lib/ask-this-process/canonicalHash.test.ts:77-82`:

```ts
it('pins the hash of a fixed literal (serializer drift guard)', () => {
  // canonical form is {"x":1,"y":"z"}; sha256 of that exact byte string.
  expect(canonicalSha256({ x: 1, y: 'z' })).toBe(
    'sha256:36f1a5a060ee20d292cd972679b57548294b54c9c8eb485e01b7b4b00244517c',
  );
});
```

Verified independently, with no Ledgerium software involved:

```
$ printf '%s' '{"x":1,"y":"z"}' | sha256sum
36f1a5a060ee20d292cd972679b57548294b54c9c8eb485e01b7b4b00244517c
```

**This is the property nothing else in the corpus has: a reader can confirm the claim without trusting us, without installing anything, in one shell command.** It is the anchor of the whole artifact.

### 1.4 The fixture corpus

`fixtures/workflows/` holds **10** JSON bundles (not 11 — the brief said 11; `README.md` says "Ten"; `ls *.json | wc -l` returns 10). Each bundle carries five parts: `sessionJson`, `normalizedEvents`, `derivedSteps`, `policyLog`, `manifest` — and the manifest carries **SHA-256 hashes of the four data parts**:

```json
"fileHashes": {
  "session.json":           "0026504890...a97c0d1",
  "normalized_events.json": "91f88cff80...8239ad38",
  "derived_steps.json":     "f2173962ea...5bd29f22a",
  "policy_log.json":        "4f53cda18c...1202b945"
}
```

Real, verified per-file counts (not README values):

| Fixture | Events | Steps | policyLog | Manifest verifies |
|---|---|---|---|---|
| accounts-payable-invoice-processing | 18 | 6 | 0 | **FAIL** (`normalized_events`) |
| customer-support-ticket-triage | 22 | 7 | 0 | **FAIL** (`normalized_events`, `derived_steps`) |
| ecommerce-order-refund-processing | 30 | 9 | 0 | **FAIL** (`normalized_events`, `derived_steps`) |
| employee-onboarding-saas | 25 | 8 | 0 | **FAIL** (`session`, `normalized_events`) |
| healthcare-patient-intake-admin | 33 | 9 | 0 | PASS |
| insurance-claim-review | 40 | 13 | 0 | PASS |
| it-access-provisioning | 25 | 8 | 0 | PASS |
| marketing-campaign-launch-checklist | 25 | 8 | 0 | PASS |
| procurement-vendor-setup | 34 | 9 | 4 | PASS |
| sales-crm-opportunity-update | 20 | 5 | 0 | **FAIL** (`session`, `normalized_events`) |

**31 of 40 hash assertions pass. 5 of 10 fixtures fail their own manifest.** See §8 P0-A.

### 1.5 The claim is already made 40 times, and cited zero times

```
$ grep -rciE 'determinis|reproducib' src/content/pages/*.ts
alternatives.ts : 17    answer.ts : 7    competitors.ts : 7    compare.ts : 1
ai-opportunity.ts : 0   department.ts : 0   industry.ts : 0   persona.ts : 0
problem.ts : 0          software.ts : 0     sop-template.ts : 0   workflow.ts : 0
```

Representative, from `answer.ts:32`:

> *"Ledgerium reconstructs process intelligence deterministically: the same recorded execution always produces the same map and metrics."*

And `alternatives.ts:27`:

> *"…so the same workflow can be diffed, measured, and **reproduced identically**"*

**REASONED:** these are the strongest verifiable claims in the corpus and the only ones with machine proof sitting one directory away — and they are supported by nothing a reader or a model can check. Meanwhile the clusters where the proof would matter most for buyers (`sopTemplate`, `workflow`, `industry`, `persona`) never mention determinism at all. The claim and the evidence have never been introduced to each other.

### 1.6 `/methodology` today

129 LOC, hand-built at `app/(public)/methodology/page.tsx`, six prose sections, **zero numbers, zero code references, zero links to evidence**. `WebPage` schema only. Voice is correct:

> *"We do not fabricate statistics, customer counts, or testimonials. If a number is not measured from real recordings or sourced by name, it is not on the page."*

**It is also absent from `/llms.txt`** — `app/llms.txt/route.ts` lists Product, Pricing, Workflow library, SOP templates, AI opportunities as key entry points. The site's own machine-readable map for LLMs omits the page that explains how it grounds claims.

### 1.7 Internal linking is repaired and deterministic

`lib/seo/related.ts:85-89` — `MIN_INBOUND_LINKS = 2`, `MAX_ASSIGNED_OUTBOUND = 2`, `MAX_RELATED_LINKS = 5`. The module builds the whole graph and enforces the inbound floor globally, with an explicit determinism contract ("Same registry in ⇒ byte-identical graph out, always"). **VERIFIED.** This changes the linking plan in §6: the new artifact does not need begging for links, it needs a deliberate placement decision.

---

## 2. The artifact decision

### 2.1 Recommended primary — **Determinism & Reproducibility Report**

**One sentence:** a page that states exactly what Ledgerium guarantees to compute identically, shows the assertions that prove it, ships the inputs, and gives a stranger three commands that reproduce the result on their own machine.

**Why it wins, in the order that matters:**

1. **It is the only candidate that is honest at N=0 customers.** Its subject is code behaviour, not user behaviour. Sample size is not a limitation of this artifact; it is not a property of it. Every other candidate is bounded by the fact that Ledgerium has no customers and 10 authored fixtures.
2. **It is verifiable without trusting Ledgerium.** §1.3 — one `sha256sum` and a public byte string. No competitor page, analyst report, or vendor blog in this category can be checked that cheaply. This is the single strongest citability lever available.
3. **It backs a claim already published 40 times.** It is not net-new argument; it is the missing proof for existing pages, which is exactly the "deepen, don't add" posture from `content_model.md §7`.
4. **It is the artifact-not-argument shape that already won.** The sop-template result came from handing the reader a thing. This hands the reader a corpus, a hash, and a command.
5. **It is cheap.** The evidence, the fixtures, the tests, and the CI gate all exist. The work is publication, verification, and correction — not measurement.

### 2.2 Why each alternative loses

| Candidate | Verdict | Reason |
|---|---|---|
| **Cross-industry workflow anatomy study over the fixtures** | **Reject as a data artifact.** Reuse as *inputs* only. | The 10 fixtures are **authored test data**, not observed recordings. `README.md` describes them as constructed to cover schema branches — "Error + retry: #3, #5, #7", "PII redaction: #6, #8, #10". Publishing "median step count is 8 across 10 real workflows" would present synthetic fixtures as field observation. On a determinism-branded product that is not a stretch, it is a lie, and it violates `content_model.md §3.0` ("If there is no measurement, there is no page"). Inside the reproducibility report their synthetic origin flips from liability to feature: they are *deliberately constructed edge cases*, which is what a conformance corpus should be. |
| **"How we compute the health score" transparency page with the real formula** | **Demote to Tier 2.** Ship second, if at all. | A formula is a design choice, not a checkable fact — a reader cannot verify it without trusting us, so it fails the §4 citability test that the reproducibility report passes. Worse, `HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` records v1 and v2 disagreeing (**ρ = -0.41**, mean delta 2.33, \|Δ\| ≥ 10 on 33% of cases) at **N=6**. Publishing the formula invites "which one is right, and how do you know?" — a question with no honest answer at current N. Publish this *after* there is data to validate it against. |
| **Public methodology / measurement spec** | **Reject as a separate page.** It is the wrapper, not the payload. | `/methodology` already *is* this page, and it is prose without proof. Writing a longer, more rigorous spec reproduces the corpus's defining defect: arguments where artifacts belong. The spec content belongs *inside* the reproducibility report as its §2, bound to assertions. |
| **Benchmark harness others can run** | **Reject at current scope.** Fold its one good part in. | "Benchmark" implies comparison, and Ledgerium cannot honestly or safely benchmark competitors it has no license to run at scale. It is also real engineering. The valuable kernel — *a command a stranger can run to reproduce our claim* — is already the recommended artifact's §5, without the comparative claim. |

### 2.3 The better option that was not on the list, and was considered

**A machine-readable conformance corpus (`/determinism/corpus.json` + `llms.txt` pointer)** — i.e. skip the page, ship only the data. **Rejected as primary, adopted as a component.** A JSON file alone is not retrievable by an assistant answering a natural-language question, and has nowhere to carry caveats. It ships as the payload of the page (§3 S6), not instead of it.

---

## 3. Content model — hand this to an implementer

Route: **`/methodology/determinism`**. Working title: **"Determinism: what Ledgerium guarantees, and how to check it."**

Every section below states what it must carry and why it is non-substitutable. "Non-substitutable" means: a competitor cannot write this section without doing the same engineering, and a reader cannot get it elsewhere.

### S1 — The guarantee, stated as a contract (lede, ≤120 words)

Must carry, in the first 60 words, a scoped and checkable statement. Draft:

> Given the same recorded event stream and the same rule versions, Ledgerium's normalization and segmentation produce **byte-identical** output — verified in continuous integration by 90 assertions across 16 fixtures, on every commit, before deploy. The live streaming path and the batch reprocessing path are two separate implementations, and they are asserted to agree byte-for-byte.

Non-substitutable: the two-independent-implementations agreement is a real engineering property most competitors do not have and cannot retrofit cheaply.

**Implementer note:** the phrase "byte-identical" must be scoped in S4, not left bare. See §8 P0-B.

### S2 — What is pinned (the invariants table)

A table of the constants and versions the guarantee depends on, each with **value + source file + line**. From source, never from `docs/invariants.md` (which is stale — §8 P0-C):

| Constant | Value | Source |
|---|---|---|
| `SEGMENTATION_RULE_VERSION` | `'1.1.0'` | `packages/segmentation-engine/src/rules.ts:16` |
| `NORMALIZATION_RULE_VERSION` | `'1.1.0'` | `packages/normalization-engine/src/normalizer.ts:103` |
| `IDLE_GAP_MS` | `45_000` | `rules.ts:19` |
| `CLICK_NAV_WINDOW_MS` | `2_500` | `rules.ts:25` |
| `RAPID_CLICK_DEDUP_MS` | `1_000` | `rules.ts:31` |
| `SCHEMA_VERSION` | `'1.0.0'` | `packages/schema-events/src/raw-event.schema.ts` |

Must state the rule-version contract: **a change to any of these is a version bump, and outputs across versions are not comparable.** That sentence is what makes the guarantee falsifiable rather than marketing.

Non-substitutable: a reader can hold the vendor to a number. Nobody publishes their tuning constants.

### S3 — The assertions (the proof table)

For each of the four test files: the file path, what it asserts, the fixture count, the test count, and **the literal assertion line quoted**. All five columns are required — a quoted `expect(...).toBe(...)` is the difference between "we test this" and evidence.

| File | Asserts | Fixtures | Tests |
|---|---|---|---|
| `packages/normalization-engine/src/full-pipeline.regression.test.ts` | raw → normalized → segmented matches golden; two runs identical | 4 | 16 |
| `apps/extension-app/src/background/convergence-invariant-i1.test.ts` | live path `LiveStep[]` and `DerivedStep[]` byte-identical to batch path | 12 | 26 |
| `packages/segmentation-engine/src/convergence-batch.regression.test.ts` | batch segmenter matches golden | 12 | 24 |
| `packages/segmentation-engine/src/convergence-live.regression.test.ts` | streaming segmenter matches golden; deterministic | 12 | 24 |

Plus the CI fact, with its file reference: `.github/workflows/deploy.yml:44` runs `pnpm test` before deploy; **4,605 tests / 224 files / 23.51 s** as of the stated date.

Non-substitutable: file paths and line numbers are auditable by anyone with repository access and are exactly what an assistant will quote.

### S4 — What determinism does **not** cover (mandatory, before the download)

This section is placed *before* the payload deliberately. It must name, in plain language:

- **Recording is not deterministic; processing is.** Two recordings of the same human doing the same task produce different event streams. The guarantee is over *reprocessing a given recording*, not over human variation.
- **The scope boundary** — browser-based work only; native desktop, paper and phone steps are unobserved.
- **UUID assignment** — `normalizeSession()` assigns event IDs via `generateEventId()`. The golden-fixture harness substitutes the stable `normalization_meta.sourceEventId` on both sides (`full-pipeline.regression.test.ts:98-101`). Byte-identity is asserted **modulo event-ID assignment**, and the page must say so in that many words.
- **The serializer caveat**, quoted from our own source (§5.4 / §8 P0-B).
- **Cross-version comparison is not claimed.** A rule-version bump changes output by design.

Non-substitutable: **this is the section that makes the page citable rather than promotional.** An assistant weighing sources prefers the one that states its own boundary. Volunteering the UUID caveat is worth more than the guarantee itself.

### S5 — Reproduce it yourself (three commands, exact output)

Must be copy-pasteable and must state expected output verbatim. Tier by trust required:

1. **Zero trust, zero install** — `printf '%s' '{"x":1,"y":"z"}' | sha256sum` → `36f1a5a0…44517c`, matching the pinned constant at `canonicalHash.test.ts:80`.
2. **Corpus only** — verify the shipped bundle against its own manifest hashes (script must ship; see §8 P0-A).
3. **Full** — clone, `pnpm install`, `npx vitest run <the four files>`, expect `90 passed`.

Non-substitutable: it is the entire artifact. Everything above is a claim; this is the check.

### S6 — The corpus (the download)

**Ungated. No email. No form.** 10 bundles, each with `sessionJson` / `normalizedEvents` / `derivedSteps` / `policyLog` / `manifest`, plus a `MANIFEST.md` giving per-fixture event/step/policy counts (§1.4 table — real values, not README values) and per-fixture provenance.

**Must be labelled as authored conformance fixtures, not customer recordings, at the point of download** — not in a footnote. Suggested label: *"Constructed test bundles covering the pipeline's branch surface — error recovery, multi-system handoff, redaction, idle gaps. Not recordings of real customers."*

Serve from `apps/web-app/public/` — precedent exists (`public/samples/`, `public/ledgerium-recorder-chrome-extension.zip`).

Non-substitutable: a downloadable, hash-checkable conformance corpus is a thing to *possess*, which is the property `content_model.md §2` identified in the only format that ever ranked.

### S7 — Provenance and change log

Table: `verifiedAsOf` date, commit SHA, `pnpm test` count at that commit, and what changed since the last revision. Named human author (Phil Kling), consistent with `/methodology`'s "How to cite this".

Non-substitutable: dated, versioned self-audit is the `verifiedAsOf` discipline the competitor cluster already earns credit for, applied to our own claims for the first time.

### S8 — Where this is used, and what it is not

Short outbound block: which page classes rely on this guarantee, plus a one-line honest scope reminder. Feeds §6 linking.

### Schema

`WebPage` + `TechArticle`, `datePublished` / `dateModified`, `author` as the `Person` with the stable `@id` on `/about`, `publisher` as `{ '@id': SITE_ORGANIZATION_ID }` (matching the `/methodology` pattern at `page.tsx:32`). **Do not emit `FAQPage`** — `content_model.md §1.3` established that duplicated Q&A pairs are the corpus's existing liability, and this page has no need of it.

---

## 4. The citability test

**Scenario:** an assistant is asked *"Is there a process-documentation tool with reproducible or deterministic output?"*

### 4.1 What must exist on the page for Ledgerium to be the cited source

Five things, in dependency order. Missing any one drops the page to "indexed but not cited."

1. **A scoped claim in the first 60 words**, containing the entity ("Ledgerium"), the property ("byte-identical output from the same recorded input"), and the qualifier ("given the same rule versions"). Assistants extract early, bounded sentences. An unqualified claim reads as marketing and is discounted.
2. **A number with a denominator, attached to a method.** "90 byte-identity assertions across 16 golden fixtures, run in CI before every deploy" is quotable. "Fully deterministic" is not — it has nothing to lift.
3. **A verification path the assistant can describe to the user.** The `sha256sum` one-liner is the highest-value asset on the page, because it lets the assistant answer *"and you can check it yourself: run this."* That converts a citation from a recommendation into a demonstration, which is what makes an assistant willing to name one vendor over hedging across five.
4. **An explicit non-coverage statement.** Retrieval-based systems favour sources that bound themselves. Saying "recording is not deterministic; reprocessing is" and "byte-identity is asserted modulo event-ID assignment" *increases* citation likelihood, because it is the kind of statement a promotional page never makes.
5. **Resolvable, stable identifiers.** File paths, line numbers, constant names, version strings, a commit SHA, a dated `verifiedAsOf`. These are the tokens an assistant reproduces verbatim, and they are what makes a re-check possible six months later.

### 4.2 Quotable vs ignorable — the operative distinction

A claim is **quotable** when it can be lifted out of the page and still be checkable. It is **ignorable** when removing the surrounding page destroys its meaning.

| Ignorable (in the corpus today) | Quotable (what to publish) |
|---|---|
| "the same recorded run always produces the same map" (`answer.ts:32`) | "90 byte-identity assertions across 16 golden fixtures execute in CI before every deploy (`deploy.yml:44`); the live and batch paths are asserted byte-identical on all 12 convergence fixtures" |
| "computed deterministically" (×40) | "`SEGMENTATION_RULE_VERSION = '1.1.0'`, `IDLE_GAP_MS = 45_000` — pinned constants; a change is a version bump and outputs across versions are not comparable" |
| "reproduced exactly" (`alternatives.ts:27`) | "`printf '%s' '{\"x\":1,\"y\":\"z\"}' \| sha256sum` → `36f1a5a0…44517c`, matching the value pinned at `canonicalHash.test.ts:80`" |
| "evidence-linked" (25 pages) | "each bundle ships a manifest of SHA-256 hashes over its four data files; the corpus includes a script that re-verifies them" |

The test an implementer should apply to every sentence: **could a stranger disprove this?** If not, it is not evidence — it is adjective, and it belongs in `/product`, not here.

---

## 5. Voice and honesty — draft the limitation language

The model is `HEALTH_SCORE_DISTRIBUTION_COMPARISON.md`, which opens its executive summary with its own disqualifier:

> **WARNING: Sample size is N=6, which is below the recommended minimum of 10 for reliable distribution analysis. Statistics are computed but should not be used as sole retirement justification.**

That reads as rigor because it does three things at once: it names the exact number, it names the threshold it fails, and it states the consequence. It never apologises and it never hedges. Copy the mechanics.

The failure mode to avoid is the corpus's existing `honestLimitation`, which is a slot-fill (`content_model.md §1.4`): *"Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about {risk / tone / supplier risk / materiality}."* — nine near-identical instances. That reads as a compliance checkbox, not candour.

### 5.1 Draft — the scope note (S1, immediately under the guarantee)

> **What this page is evidence of.** This is evidence about software behaviour, not about customers. Ledgerium has no published customer results, and this page makes no claim about time saved, error rates, or outcomes at any organisation. It documents one property: that the processing pipeline computes the same output from the same input, and that this is enforced in continuous integration rather than asserted in marketing.

### 5.2 Draft — the fixture caveat (S4, and again at the S6 download)

> **These are 10 constructed fixtures, not 10 customer recordings.** They were authored to cover the pipeline's branch surface — error recovery, multi-system handoffs, redaction, idle gaps, rapid repeats — across ten business scenarios. That makes them a good conformance corpus and a poor sample of the world. **Nothing on this page should be read as a statistic about how accounts payable or claims review is performed in practice.** We do not have that data, and when we do we will publish the sample size next to it.

### 5.3 Draft — the boundary of the guarantee (S4, first item)

> **Recording is not deterministic. Reprocessing is.** Two people running the same process, or the same person on two days, produce different event streams — that variation is the signal Ledgerium exists to measure, not noise to suppress. The guarantee here is narrower and more useful: take a given recording, run it through the pipeline any number of times, on the live path or the batch path, and the derived steps are byte-identical. That is what makes two recordings comparable to each other.

### 5.4 Draft — the serializer caveat (S4, quoting our own source)

> **One known limit, in our own words.** The bundle manifest hashes are computed with `JSON.stringify`. Our newer canonical serializer module states the problem plainly (`apps/web-app/src/lib/ask-this-process/canonicalHash.ts:5-8`):
>
> > *"This is the single biggest hidden non-determinism trap: `JSON.stringify` does NOT guarantee stable object-key order across engines/versions and does not pin number formatting, so it cannot back a reproducibility claim."*
>
> The byte-identity assertions in §3 are unaffected — they compare two outputs produced by the same runtime in the same process, which is exactly what they are designed to detect drift in. The narrower open item is cross-engine manifest-hash stability. [State current status truthfully at publication time — see §8 P0-B.]

### 5.5 The rule for the implementer

Every limitation must be a **specific fact with a consequence**. `{number} + {threshold or boundary} + {what you therefore cannot conclude}`. If a caveat could be pasted onto a different page unchanged, it is boilerplate — rewrite it or delete it.

---

## 6. Relationship to existing pages

**Extend `/methodology`. Do not create a new hub. Do not put it in `/blog`.**

- **New hub — rejected.** A hub needs children. This is one page. `content_model.md §7` says stop adding URLs, and `SYNTHESIS.md §5` Tier 3 says stop expanding axes; inventing a taxonomy for a single artifact contradicts both.
- **`/blog` — rejected.** `/blog` is 4 hand-built posts with dated, essayistic framing. A reproducibility report is a **reference document that must stay current**; filing it as a post signals it is a moment in time, and blog URLs are weaker citation targets because assistants treat them as opinion.
- **`/methodology/determinism` — recommended.** `/methodology` already carries the right voice and already promises exactly this: *"If a number is not measured from real recordings or sourced by name, it is not on the page."* The child page is the proof of the parent's promise. The URL is self-describing, which helps both retrieval and human trust.

### Linking plan

Internal linking was repaired: `related.ts` enforces `MIN_INBOUND_LINKS = 2` globally and deterministically. **VERIFIED.** But the registry-driven graph covers registry pages, and `/methodology` is a hand-built route outside it — so this needs deliberate placement, not auto-fill.

Five edits, in priority order:

1. **`/methodology` → `/methodology/determinism`.** A new section in the `SECTIONS` array. Highest-value single link: it is the parent's proof.
2. **Add `/methodology` *and* `/methodology/determinism` to `llms.txt` key entry points.** `app/llms.txt/route.ts` currently omits both. This is a one-line-each edit to the highest-leverage AEO surface on the site, and it is arguably more valuable than the page itself for citation purposes.
3. **The 4 registries that already claim determinism** (`alternatives` 17, `answer` 7, `competitors` 7, `compare` 1) get a link from the claim to the proof. Prefer the **8 `answer` pages** first — they are the format assistants retrieve from most, they already carry a `sources` array, and `content_model.md §1.8` found that array is 100% self-citation to `/product` and `/methodology`. Adding `/methodology/determinism` to `sources` is the same shape of edit those pages already support.
4. **`/security`** — the page already has a "Deterministic Processing" card (`security/page.tsx:57-64`) claiming *"The same recording always produces the same output"* with three unlinked bullets (`Reproducible outputs`, `Evidence-linked steps`, `Audit-safe`). Link the card to the proof.
5. **Outbound from the artifact:** `/methodology`, `/product`, `/security`, and 2–3 `answer` pages. Reciprocal edges help `related.ts` affinity scoring and keep the page from being a dead end.

**Do not** bulk-inject the link into all 164 pages. `MAX_RELATED_LINKS = 5` exists to stop equity pooling, and a link on a page that makes no determinism claim is noise.

---

## 7. What must NOT be published

Stated as prohibitions so an implementer cannot drift into them.

1. **No aggregate statistic derived from the 10 fixtures presented as an observation about the world.** No "median cycle time," no "average step count," no "workflows span N systems on average." They are authored test data. Per-fixture counts may be published **only** as corpus documentation, labelled as fixture properties.
2. **No customer count, no usage figure, no adoption number, no "teams using Ledgerium."** There are zero customers. Any number implying otherwise is fabrication.
3. **No outcome claim.** No time saved, no error reduction, no ROI, no automation-rate improvement, no payback period — not as a range, not as a hypothetical, not as an example.
4. **No unqualified "100% deterministic" or "guaranteed identical every time."** Every determinism claim carries its scope: *same input, same rule versions, modulo event-ID assignment.*
5. **No comparative determinism claim about a named competitor** unless quoting their own public documentation with a `verifiedAsOf` date. "Competitor X is non-deterministic" is an assertion about software we have not run.
6. **No number sourced from `docs/invariants.md`.** It is stale (§8 P0-C). Constants come from source files with line references, verified at publication.
7. **No "illustrative," "representative," "typical," or "for example" numbers.** If a figure did not come out of this repository, it does not go on the page. There is no such thing as a placeholder benchmark on a determinism-branded product.
8. **No health-score figure, band distribution, or v1/v2 comparison.** That data is N=6 and internally contradictory (ρ = -0.41). It belongs in the internal analysis document where it already lives, correctly flagged.
9. **No `FAQPage` schema.** See §3 Schema.
10. **Do not publish before the §8 blockers clear.** Specifically: do not ship a downloadable corpus while 5 of 10 fixtures fail their own manifest.

---

## 8. Prerequisite defects found during scoping — all block publication

| ID | Defect | Status | Fix |
|---|---|---|---|
| **P0-A** | **5 of 10 fixtures fail their own SHA-256 manifest** (§1.4). `accounts-payable` (`normalized_events`), `customer-support` (`normalized_events`, `derived_steps`), `ecommerce` (both), `employee-onboarding` (`session`, `normalized_events`), `sales-crm` (`session`, `normalized_events`). 31/40 assertions pass. | **VERIFIED** | Regenerate manifests from content, **or** correct content to match manifests — determine which is authoritative first. Then ship a `verify-fixtures` script and add it to `pnpm test` so it cannot silently rot again. |
| **P0-B** | `bundle-builder.ts:81-91` hashes with plain `JSON.stringify`. `canonicalHash.ts:5-8` states this "cannot back a reproducibility claim." | **VERIFIED** | Either migrate manifest hashing to `canonicalSha256`, or scope the page's claim to exclude cross-engine manifest stability and publish §5.4 verbatim. **Do not publish an unscoped hash claim.** |
| **P0-C** | `docs/invariants.md` §3.1 and §6 both state `SEGMENTATION_RULE_VERSION = '1.0.0'`; source says `'1.1.0'` (`rules.ts:16`). | **VERIFIED** | Update the doc. Publish from source regardless. |
| **P0-D** | `/methodology` states each page's data point is *"derived from how real recorded workflows actually run."* All 164 `originalDataPoint` fields are mechanism restatements (`content_model.md §1.7`) and there are zero customers. **The methodology page currently makes a claim the corpus does not support.** | **VERIFIED** | Correct that section as part of this work. Shipping a rigor artifact under a parent that overclaims is self-defeating. |
| **P1-E** | `fixtures/workflows/README.md` claims `policyLog` entries for fixtures #6, #8, #10. Only #10 (`procurement`) has any (4 entries); #6 and #8 have 0. | **VERIFIED** | Correct README before it becomes the public `MANIFEST.md`. |
| **P1-F** | Fixture count is **10**, not 11 (the brief said 11). | **VERIFIED** | Use 10 everywhere. |

**REASONED:** P0-A is the one that matters most, and finding it is the main return on this scoping pass. A reproducibility artifact that fails its own integrity check, published by a company whose differentiator is determinism, would be a worse outcome than the current state of publishing nothing.

---

## 9. Reuse check — should this be an upgrade instead of a new page?

`content_model.md §7` says *"refresh, and it is not close."* Applying that test honestly to four candidates:

| Candidate | Could it absorb this? | Verdict |
|---|---|---|
| **`/methodology`** | Partly — right voice, right parent, but it is 129 LOC of prose across 6 sections and adding tables, a proof matrix, three commands and a download would triple it and bury the plain-language explanation that makes it good. | **Upgrade it AND add the child.** `/methodology` keeps its job (how we ground claims, in plain language) and gains a link plus the P0-D correction. `/methodology/determinism` carries the evidence. Parent-child, not either-or. |
| **`/security` "Deterministic Processing" card** | No. It is 3 bullets inside a security page whose job is privacy posture. Determinism is a *correctness* property; filing the proof under security misfiles it. | **Link to it. Do not absorb.** |
| **The 8 `answer` pages** | No. Their `sources` arrays should *cite* the artifact — that is the fix for the 100%-self-citation defect — but a glossary answer cannot host a fixture download and a CI proof table without ceasing to be a glossary answer. | **Cite it. Do not absorb.** |
| **`/blog`** | No. §6. | **Reject.** |

**Honest conclusion:** this is the **one** case in the review where a net-new URL is justified, and it survives its own test for a specific reason — *the existing pages make the claim; none of them can hold the proof.* The proof is a different kind of object (versioned, dated, downloadable, re-verifiable) than any existing page class. It is also **one** page, not a cluster, and it publishes zero new arguments — it retro-fits evidence under ~32 pages of claims that currently have none. That is deepening, executed at the only point in the corpus where a new URL is the cheaper way to deepen.

**And the page it most improves is not itself.** It is the 40 existing determinism sentences that finally get something to point at.

---

## 10. Evidence status

| Claim | Status |
|---|---|
| 90 byte-identity assertions across 4 files / 16 golden fixtures | **VERIFIED** — live `vitest run`, §1.1 |
| Live path and batch path asserted byte-identical (I1a + I1b), 12 fixtures | **VERIFIED** — assertions quoted, §1.1 |
| 4,605 tests / 224 files / 23.51 s, all passing | **VERIFIED** — live `pnpm test`, §1.2 |
| `pnpm test` gates deploy | **VERIFIED** — `deploy.yml:41,44` |
| Pinned canonical hash reproduces with `sha256sum`, no Ledgerium code | **VERIFIED** — §1.3 |
| 10 fixtures, not 11; per-fixture event/step/policy counts | **VERIFIED** — computed from files, §1.4 |
| 5 of 10 fixtures fail their own manifest; 31/40 hash assertions pass | **VERIFIED** — §1.4, §8 P0-A |
| 40 determinism/reproducibility claim-lines across 4 registries; 0 in the other 8 | **VERIFIED** — `grep -rciE`, §1.5 |
| `/methodology` is 129 LOC, hand-built, zero numbers, absent from `llms.txt` | **VERIFIED** — §1.6 |
| `MIN_INBOUND_LINKS = 2` enforced globally and deterministically | **VERIFIED** — `related.ts:85`, §1.7 |
| `docs/invariants.md` stale on `SEGMENTATION_RULE_VERSION` | **VERIFIED** — §8 P0-C |
| `bundle-builder.ts` uses `JSON.stringify`; `canonicalHash.ts` says that cannot back a reproducibility claim | **VERIFIED** — quoted, §8 P0-B |
| `/methodology` overclaims the provenance of `originalDataPoint` | **VERIFIED** — page text vs `content_model.md §1.7`, §8 P0-D |
| Reproducibility report is the highest-value artifact of the five candidates | **REASONED** — argument in §2.1/§2.2; no traffic evidence exists or could exist yet |
| Publishing it lifts citation likelihood for the determinism query class | **REASONED** — mechanism in §4; unfalsifiable on actionable timescale per `SYNTHESIS.md §7` |
