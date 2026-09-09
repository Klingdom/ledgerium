# Chrome Web Store Listing Copy — Ledgerium AI Recorder

**Author:** growth-strategist
**Date:** 2026-09-09
**Status:** DRAFT — ready to paste into the Chrome Web Store Developer Dashboard listing form. Not yet submitted; `config.ts:16` still needs its `placeholder` URL replaced post-submission.

**Why this exists (per coordinator brief):** three consecutive reviews (`SEO_AEO_EFFECTIVENESS_REVIEW_001`, `GROWTH_REVIEW_001/seo_aeo.md` §5.1, `SEO_AEO_CONTENT_STRATEGY_001/SYNTHESIS.md` §5 Tier 2) independently rank the Chrome Web Store listing as the highest-value unshipped growth item, because it is a ranking surface that owes nothing to the site's domain authority (average organic position 44, ~0 referring domains). This document is the listing copy itself, plus the reasoning a specialist would want on record before it ships.

**Everything below is written to be true of the product as it exists today.** No invented metrics. No fabricated social proof. No claim about a tier that cannot currently be purchased (Team and Growth are waitlist-only per `checkout/route.ts` `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD`).

---

## 1. Extension name

### Recommendation: **"Ledgerium Recorder: Workflow to SOP"**

**Character count: 35 / 45 max.**

Alternates considered and rejected, with reasoning:

| Candidate | Chars | Verdict | Why |
|---|---|---|---|
| Ledgerium AI Recorder (current) | 22 | REJECT as final — see §8 | Under-uses 45-char budget on pure search terms; "AI Recorder" is generic and contested (every screen-recording extension in the store uses some form of "AI Recorder") |
| Ledgerium Recorder: Workflow to SOP | 34 | **RECOMMEND** | Front-loads the brand once, then spends the remaining budget on the two search terms that actually differentiate: "Workflow" and "SOP" — see keyword reasoning below |
| Ledgerium: Process Intelligence Recorder | 42 | REJECT | Collides head-on with Scribe's Store title, which literally contains "Process Intelligence" — see §5. Scribe has far more installs and reviews; a new listing that echoes an incumbent's exact phrase competes for search relevance signal it cannot win, and risks Chrome's own store readers treating the listing as derivative |
| SOP Recorder by Ledgerium | 26 | REJECT | Reads as an SEO string, not a name; "by Ledgerium" as a suffix under-weights brand in the title's most-weighted position |
| Workflow Recorder — Ledgerium | 30 | Runner-up | Leads with the job-to-be-done term first, which is defensible (search relevance may weight the first token more heavily), but breaks brand-building convention (brand name buried after a colon reads less like a company and more like a utility, which cuts against the account-linked "your Ledgerium workspace" upload feature) |

**Reasoning for the recommendation:**

- **Keeps the brand.** Even with the name-collision problem (see §8, three unrelated "Ledger[ium]" entities exist), abandoning the brand name entirely in a Store listing throws away the one place a company controls its own entity signal completely — the listing page itself, plus `Organization` schema on the linked website. Dropping "Ledgerium" from the extension name would also desynchronize the extension identity from every other surface (manifest, website, docs) for no discoverability gain — Chrome Web Store search does not appear to rank on "does the brand name have prior recognition," it ranks on keyword relevance + installs + ratings (per `GROWTH_REVIEW_001` §5.1). A completely genericized name buys nothing there and costs brand-building everywhere else.
- **Drops "AI" from the title.** "AI Recorder" is the single most contested phrase in this category — every scraping/recording extension in the Store uses some permutation of "AI [X] Recorder." It is also the least differentiated claim Ledgerium can make: the product's actual differentiator per the CEO brief is **determinism** (same recording reprocesses to the same output) and **traceability** (every step traces to a captured event), not "has AI in it." Spending title characters on "AI" wins nothing and concedes the crowded lane.
- **Uses "Workflow to SOP" instead of "Process Intelligence."** This is the direct answer to the Scribe collision (§5). "Process Intelligence" is Scribe's claimed keyword territory in their own Store title, and Scribe has materially more installs and reviews — a new listing chasing the identical phrase competes for relevance signal against an incumbent with years of accumulated ranking weight, in the exact pattern the SEO reviews already diagnosed as a losing move for "commercial"/competitive-alternative query classes on the open web (`GROWTH_REVIEW_001/seo_aeo.md` §1.1). "Workflow to SOP" states the same job-to-be-done in different, uncontested words: input (workflow) → output (SOP document). It is concrete, it is literally what the extension does, and it does not walk into Scribe's claimed phrase.
- **45-char budget is not fully used (34/45) on purpose.** Chrome Web Store search relevance is reported to weight exact-phrase matches; padding the title with more keywords to hit the ceiling risks reading as keyword-stuffed to a human reviewer scanning search results, which is a conversion cost even if it were a ranking gain. 11 characters of headroom remain if a later A/B test on the listing (once installs exist) suggests adding one more term.

---

## 2. Short description

**132 char max — the single highest-leverage string in the listing (appears directly in Store search results).**

### Recommendation:

> **Record any browser workflow once. Get a deterministic, evidence-linked SOP — no screenshots, no manual write-up.**

**Character count: 112 / 132 max.**

Why this string, clause by clause:

- **"Record any browser workflow once."** — leads with the action and the honest scope boundary (browser workflow, not "any process") in the very first words. This also pre-answers the capability-boundary concession the detailed description makes explicit in §3 — search-result scanners who care about scope get the truth immediately, not a bait-and-switch.
- **"Get a deterministic, evidence-linked SOP"** — uses the two words that are the actual, verified differentiator (per CEO brief: "determinism and traceability — the same recording reprocesses to the same output; every step traces to a captured event"). "Deterministic" and "evidence-linked" are not generic SaaS adjectives; they are specific, defensible, and true. Nowhere near the banned-word list (world-class/powerful/seamless/revolutionary).
- **"no screenshots, no manual write-up"** — does double duty: it is a privacy-adjacent claim stated narrowly enough to remain true even if the privacy audit narrows the "no screen content, no keystrokes" claim (it only asserts "no screenshots," which is verified true today per the CEO brief, and does not make privacy the single load-bearing hook as instructed), and it names the competitor pain point (LLM-generated write-ups that require manual cleanup) without naming a competitor.
- Left off deliberately: "Process Intelligence," "AI," "team," "workspace," any tier name, any customer count. All either collide with Scribe's claimed term, are generically contested, do not apply to zero-social-proof positioning, or reference features (Team tier) that cannot be purchased today.

20 characters of headroom remain (112/132) — intentionally not filled with adjectives; reserved in case Chrome's own character-count tooling counts differently than a manual count (e.g. the em dash), and to avoid the packed, comma-spliced look of a string visibly straining against its limit in search results.

---

## 3. Detailed description

**Full listing body, ready to paste. Formatted with the line breaks and simple markers (▸, —) the Chrome Web Store listing editor supports; no HTML.**

---

**Turn a browser workflow into a written procedure — automatically, and the same way every time.**

Most process documentation starts the same way: someone does the work, then someone else — often the same person, later, resentfully — writes down what they did. It goes stale the moment the process changes, because nobody re-writes a document for a five-minute process tweak.

Ledgerium Recorder skips the write-up. Click record, do the task once in your browser the way you normally would, click stop. The extension captures your clicks, page navigation, and the field labels you filled in — not what you typed into them, not your screen, not keystrokes — and turns that captured sequence into a step-by-step SOP document.

**Why this is different from an AI note-taker**

Most "AI documentation" tools point a language model at your screen recording and ask it to describe what happened. Re-run the same recording twice and you can get two different write-ups, because the model is guessing at intent from pixels.

Ledgerium works the other way. It records the actual events — the click, the field, the navigation — and processes them the same way every time. Record the same workflow twice, get the same SOP twice. Every step in the output traces back to something the extension actually captured, not something a model inferred. If a process changes, re-record it and regenerate the SOP — you don't hand-edit a stale document, you replace it with a fresh one.

**What it captures**

▸ Clicks and the elements you clicked
▸ Page navigation as you move between screens
▸ Form field labels (what you filled in, not what you typed)
▸ Timing between steps

**What it does not do**

▸ No screenshots or screen recording
▸ No capture of typed content or keystrokes
▸ No native desktop, paper, or phone steps — Ledgerium only sees what happens inside the browser tab it's running in. If your process leaves the browser (a step in a desktop app, a phone approval, a paper form), that step won't appear in the recording — you'll need to note it manually.

We're telling you that boundary up front because ops and compliance teams evaluating a recording tool deserve to know exactly what it does and doesn't see before they install it, not after.

**Where the recording goes**

Export your recording as JSON directly from the extension — no account required. If you want the deterministic SOP document, health-score analysis, and a searchable workflow library, connect the extension to a free Ledgerium workspace account and upload from the side panel.

**Pricing**

▸ **Free** — 5 recorded workflows per month, JSON export
▸ **Starter ($49/mo)** — clean exports, workflow health scores, personal workspace
▸ **Solo ($89/mo)** — unlimited recordings plus the full intelligence layer: bottleneck detection, automation scoring, variant detection across your workflow library

(Higher tiers for teams are in active development and not yet available for purchase.)

**Who this is for**

Ops managers documenting handoffs. Compliance teams that need an audit trail for how a process is actually performed, not how a policy document says it should be performed. Anyone who has ever been asked "can you write up how you do this" and thought: I'd rather just show you.

---

*Word/character note: the description above is intentionally written in short, scannable blocks — Chrome Web Store detailed descriptions render as plain text with line breaks preserved, and long unbroken paragraphs read poorly in the Store's narrow listing column.*

---

## 4. Category recommendation

**Recommend: "Productivity"**

Reasoning:

- Chrome Web Store's category list does not include a "Process Intelligence" or "Documentation" category — the closest available buckets are **Productivity**, **Workflow & Planning**, and **Developer Tools**.
- Scribe, Loom, and the majority of the "record and document" competitor set (per `competitive_research.md` §1: Guidde, Tango, Waybook, etc.) list under **Productivity** or **Workflow & Planning** depending on Store taxonomy revisions. Matching the category incumbents use is the correct move here — Store category pages are a browse surface real users scan, and appearing where the comparison set already lives is a discoverability asset, not a collision risk (unlike the title-keyword collision with Scribe, which is a direct-relevance-competition problem; category placement is a co-location benefit).
- **Do not select "Developer Tools."** The product is explicitly ops/compliance-facing per the CEO brief's target persona, and developer-tool category browsers are the wrong audience — the recorder captures UI interactions and form labels, not code or API calls.
- If the Store's current taxonomy (verify at submission time — categories are periodically revised by Google) offers **"Workflow & Planning"** as a distinct option from "Productivity," it is the marginally better fit and should be preferred; "Productivity" is the safe fallback if it doesn't exist.

---

## 5. Keyword strategy

### 5.1 The Scribe collision, stated plainly

Scribe's Chrome Web Store listing title is **"Scribe: AI Documentation, SOPs & Process Intelligence."** Scribe has materially more installs and reviews than Ledgerium (zero). Chrome Web Store search ranking is reported to weight keyword relevance alongside install velocity and ratings (`GROWTH_REVIEW_001/seo_aeo.md` §5.1). That means for any query where Scribe's listing is a strong keyword match **and** has years of install/rating history, a new listing chasing the identical phrase is not competing on a level field — it is competing against an incumbent's compounded relevance signal with zero signal of its own.

**Decision: concede "Process Intelligence" and "AI Documentation" as search terms to Scribe.** Do not put either phrase in the extension name or short description. This is not a retreat from the company's own self-description (Ledgerium can and does call itself "process intelligence" on its website, where the audience and ranking mechanics are different) — it is a Store-search-specific decision that a zero-install listing should not open a keyword fight it starts at a structural disadvantage, exactly as the SEO reviews found for the open-web "alternatives" query class (82% of the web corpus targeted the most authority-gated query class and produced the worst results; the 10% long-tail class produced the only organic win).

### 5.2 Terms to target (uncontested or under-contested space)

| Term | Where it appears | Why it's winnable |
|---|---|---|
| "workflow" | Name, short description, detailed description | Broad enough to be searched, specific enough to describe the actual capture mechanism (not "process" which is vaguer and more contested) |
| "SOP" | Name, short description | Contested by template libraries (ClickUp, Notion, HubSpot per `competitive_research.md` §3) on the open web, but far less saturated inside Chrome Web Store search specifically — no evidence any major recorder extension leads its Store title with "SOP" the way it leads with "AI" or "documentation" |
| "deterministic" / "evidence-linked" | Short description, detailed description body | Genuinely uncontested — this is Ledgerium's real technical differentiator and no competitor extension (per the competitive research pass) makes a reproducibility claim. Low search volume almost certainly, but it is differentiation copy for the human reader landing on the listing, not a volume play |
| "record" / "recorder" | Name, throughout | Table stakes for the category; must be present for basic relevance-matching regardless of competitive pressure |

### 5.3 Terms to concede

| Term | Owned by | Why concede |
|---|---|---|
| "Process Intelligence" | Scribe (verified, their exact Store title) | Direct incumbent collision; see §5.1 |
| "AI Documentation" | Scribe (verified, their exact Store title) | Same |
| "screen recorder" | Loom, and every screenshot/video tool in the category | Also factually wrong for this product — it explicitly does not do screen recording; conceding this term costs nothing because claiming it would be false |
| Any specific competitor name (Scribe, Loom, Tango, Guidde) as a keyword | — | Chrome Web Store policy and general Store norms disfavor competitor-name-stuffing in listing metadata; the equivalent play (a comparison landing page) belongs on the website, not the Store listing |

### 5.4 The genuinely uncontested space

The combination of **"workflow" + "SOP" + "deterministic/reproducible"** in a single listing does not appear to be claimed by any competitor identified in the competitive research pass (Scribe, Loom, Tango, Guidde, Dubble, Supademo, Guidejar, Kommodo, Vidocu, Credia, Wizardshot, Trupeer — none of these lead with a reproducibility/determinism claim; they compete on "AI-generated," "instant," or "screen capture" framing). This is a small, defensible niche inside a much larger contested category — consistent with the SEO reviews' finding that the only verified organic win anywhere in the corpus came from a narrow, specific, low-competition query rather than a head-term fight (`competitive_research.md` §3.1, `/competitors/soroco`).

---

## 6. Screenshot captions

**The capture script (`apps/extension-app/scripts/capture-chrome-store-screenshots.ts`) currently produces exactly 4 real, composited screenshots — no mockups, no invented UI.** Below are captions for all 4, plus a note on why a 5th is not recommended at this time rather than inventing one to hit the "up to 5" ceiling.

| # | File | Caption |
|---|---|---|
| 1 | `01-idle.png` | **Name the activity, then start recording.** No setup, no screen-selection dialog — just a name and a click. |
| 2 | `02-active-recording.png` | **Every click and field becomes a step, live.** Work normally in your browser tab; the side panel builds the step list as you go. |
| 3 | `03-step-review.png` | **Review the captured sequence before you export.** Every step traces back to something the extension actually recorded — nothing inferred, nothing guessed. |
| 4 | `04-upload-flow.png` | **Export to JSON, or send it to your Ledgerium workspace.** Turn the recording into a deterministic SOP document without leaving the browser. |

**On a 5th screenshot:** the constraint is real, not a placeholder gap — a completed "upload complete" state was deliberately not captured (per the script's own header comment) because driving a real HTTPS upload endpoint inside the capture script was judged not worth the added moving parts for one additional screenshot. Recommend either (a) shipping with 4 real screenshots rather than inventing a 5th from a mockup, which would violate the same "nothing invented" standard the script itself was built to uphold, or (b) if a 5th slot is wanted, extending the capture script to drive a self-signed local HTTPS endpoint and capture the completed-upload state — an engineering follow-up, not a copy task. This document does not fabricate a caption for a screenshot that does not exist.

---

## 7. Single-purpose statement

Required by the Chrome Web Store developer dashboard's single-purpose disclosure field.

> **This extension records a user's browser interactions (clicks, page navigation, and form field labels) during a manually started and stopped session, and converts that recording into a structured workflow document that the user can export as JSON or upload to their own Ledgerium account.**

This is one sentence, states the mechanism (what it records), the trigger (manually started/stopped, not always-on background capture), and the output (export or upload) — the three things Chrome's review process is reported to check a single-purpose statement against.

---

## 8. KEEP / POLISH / REWRITE verdict

### Current extension name: "Ledgerium AI Recorder" — **REWRITE**

Reasoning already covered in full in §1. Summary: "AI Recorder" is generic and contested; the 45-char budget is under-used; the name does nothing to differentiate from Scribe's claimed "Process Intelligence" territory or from the dozen other "AI [X] Recorder" extensions in the category. Recommend **"Ledgerium Recorder: Workflow to SOP."**

### Current manifest description: "Record browser workflows (clicks, navigation, form labels) and export them as JSON. Optional upload to your Ledgerium workspace." — **POLISH**

This is not wrong. It is honest, scoped correctly, and already lists exactly the capture surface (clicks, navigation, form labels) without overclaiming. Its weaknesses are omission, not inaccuracy:

- It never states the differentiator (determinism, reproducibility, evidence-linking) — a reader has no reason to pick this over any other recorder.
- It never names the output artifact by category ("SOP") — "export them as JSON" undersells what the product actually produces for a paying user (a structured SOP document, not just a data file).
- It is fine as the **manifest.json `description` field** (128-char limit there, separate from the Store listing's short description) — this field is what shows in `chrome://extensions` and does not need to carry the same search-optimization weight as the Store short description in §2.

**Recommendation:** keep the manifest.json description close to its current form for the `chrome://extensions` surface (that field has its own, shorter 132-char limit and different audience — an already-installed user, not a searcher), but do not reuse it verbatim as the Store listing's short description. Use the §2 recommendation for the Store listing specifically, since that string is the one doing search-ranking and click-through work.

*(Note: this document does not modify `manifest.json` per the task's explicit instruction. The POLISH verdict on the manifest description is advisory only, for a future engineering-owned change if the team decides to sync it with the Store short description language.)*

---

## Summary of exact character counts (for the person pasting this into the Store form)

| Field | Limit | This draft | Under by |
|---|---|---|---|
| Extension name | 45 | "Ledgerium Recorder: Workflow to SOP" — 35 | 10 |
| Short description | 132 | "Record any browser workflow once. Get a deterministic, evidence-linked SOP — no screenshots, no manual write-up." — 112 | 20 |
| Detailed description | 16,000 (Store max) | ~2,450 chars including headers | well under |

---

## Open items for the coordinator / CEO

1. **Confirm the name change.** "Ledgerium AI Recorder" → "Ledgerium Recorder: Workflow to SOP" is a naming decision, not a copy-only decision — it should be explicitly approved before submission, since it changes what appears in `manifest.json`'s `name` field (out of scope for this document to edit) and on every download surface.
2. **This document does not resolve the brand-collision problem** (three unrelated "Ledger[ium]" entities per `competitive_research.md` §2) — that is a `sameAs`/entity-disambiguation problem for the website, separate from this Store listing, and out of scope here.
3. **Await the `extension-privacy-auditor` finding** referenced in the task brief before finalizing the "no screenshots, no manual write-up" language in the short description and the "What it does not do" block in §3 — if the audit narrows the privacy claim, those two spots are the only places in this document that assert it, and both are written narrowly enough (no screen content claim, no keystroke claim beyond "not what you typed") to survive a narrowing without a rewrite, but should be re-checked against the audit's actual finding before submission.
4. **Category confirmation at submission time** — Chrome Web Store category taxonomy is periodically revised by Google; verify "Productivity" (or "Workflow & Planning" if it exists as a distinct option) is still current when the listing form is actually filled out.
