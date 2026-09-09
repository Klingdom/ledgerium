# SOP Template Download — Brand-Voice Consult

**Consult type:** D-4 clause 1 adjacency (pre-implementation, ≥3 user-visible strings)
**Feature:** ungated Markdown download + copy-to-clipboard on all 17 `/sop-templates/[slug]` pages
**Reviewer:** growth-strategist
**Scope:** copy only — no product code touched
**Source voice corpus:** `apps/web-app/src/content/pages/sop-template.ts` (17 entries), `components/seo/Blocks.tsx`, `/pricing`

---

## Verdict summary

KEEP the entire existing `Blocks.tsx` CTA vocabulary and the `honestLimitation` convention verbatim — they are load-bearing house voice (plain, computed-signal, no adjectives) and this feature must slot into that pattern, not introduce a new one. No REWRITE candidates found among adjacent copy. One POLISH: the page `metaTitle` suffix "(Editable)" is now literally true for the first time (previously aspirational — the page had no download) and should be read alongside the new block below rather than changed; leaving it as-is is correct once the feature ships.

---

## 1. Primary download CTA

**Button label (≤32 chars):**
`Download the template`

**Supporting sentence (under the button):**
`Markdown file. Opens in any editor or wiki — no account needed.`

Rationale: "Markdown file" names the format honestly (matches `originalDataPoint`/`mechanismIntro` habit of naming the mechanism, not selling it). "No account needed" is the linkability signal stated plainly, not as a marketing hook.

---

## 2. Copy-to-clipboard

**Button label:**
`Copy to clipboard`

**Success state (post-click, ≤2s toast/inline swap):**
`Copied.`

**Failure state:**
`Couldn't copy — download it instead.`

Rationale: one-word success matches the corpus's clipped, non-celebratory register (no "Copied! 🎉"). Failure state degrades to the always-working path rather than apologizing.

---

## 3. Section heading

`Get this SOP`

Considered and rejected: "Download this template" (redundant with the button copy sitting directly under it), "Take it with you" (too casual for this corpus). "Get this SOP" is short, matches `h1` pattern ("Invoice approval SOP template"), and reads correctly for all 17 process types.

---

## 4. Post-download offer (the conversion bridge)

This is the highest-leverage string on the page. It must not gate anything and must not overpromise the free tier.

**Heading:**
`Filling this in by hand?`

**Body:**
`This template is blank on purpose — you still have to name your roles, thresholds, and exceptions. Record one real run of this process instead, and Ledgerium fills those in from what actually happened. Free includes 5 recordings a month.`

**CTA label:**
`Try it on a real run`

Rationale: "blank on purpose" is honest, not self-deprecating — it reframes the just-downloaded artifact's limitation as the reason to try the product, which is the same move `honestLimitation` already makes on every page ("A template is a starting structure..."). "Free includes 5 recordings a month" mirrors the exact `BeforeYouDecide` component's plan-scoping habit ("Free includes SOPs and process maps for 5 workflows a month") — do not say "unlimited" or "instant," neither is true.

---

## 5. In-document copy (the .md file itself)

This ships inside a file that will be pasted into other people's wikis and docs — it is the most link-relevant string in the feature and must attribute without reading as an ad.

**Header block (top of file, before the SOP sections):**
```
<!--
Generated from a Ledgerium SOP template.
Fill in the [bracketed] fields for your process, or delete this block before publishing.
-->
```

**Fill-in placeholder convention (used inline wherever a value is unknown, e.g. roles, thresholds):**
`[fill in: approver name or title]`
`[fill in: dollar threshold]`
`[fill in: system name]`

General pattern: `[fill in: <what goes here>]` — plain-English description of the missing value, never a generic `{{variable}}` or `TODO`, so a non-technical reader filling this in by hand knows exactly what's expected.

**Footer / attribution line (bottom of file):**
```
---
Template: https://www.ledgerium.ai/sop-templates/[slug] · Generated automatically from a real recording, or fill in by hand.
```

Rationale for the footer: it's one line, states what it is (a link + a one-clause explanation of the mechanism), and doesn't ask for anything — no "Powered by," no logo, no CTA. It reads as a citation, which is exactly what earns a backlink or an AI-assistant citation. The clause "or fill in by hand" keeps it honest for the reader who never records anything.

---

## 6. Honest limitation (download block)

`This is a blank starting structure — it doesn't know your roles, thresholds, or systems. A recording fills those in from a real run instead of a guess.`

Matches the exact three-sentence shape of the 17 existing `honestLimitation` fields ("A template is a starting structure...captured best by recording..."). Reuses "blank" from item 4's heading so the two moments (download-time limitation, post-download offer) read as one consistent idea rather than two different pitches.

---

## Constraints check

- No adjectives banned by house style ("world-class," "powerful," "seamless") used anywhere above.
- All strings are process-generic — verified against invoice-approval, incident-management, and password-reset use cases; none of the six deliverables name a specific process.
- Button labels: "Download the template" (22 chars), "Copy to clipboard" (18 chars), "Try it on a real run" (21 chars) — all ≤32.
- Zero gating language anywhere; no email field referenced.
