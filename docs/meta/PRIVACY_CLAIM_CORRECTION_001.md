# PRIVACY_CLAIM_CORRECTION_001

**Author:** growth-strategist (D-4 clause 1 mandatory copy consult)
**Date:** 2026-09-09
**Trigger:** verified source defect — `apps/extension-app/src/content/label-extractor.ts:145-152` reads and
transmits the visible `innerText` of any clicked/focused `<div>`/`<span>` (≤40 chars / 5 words), filtered only
by pattern-match (email/URL/phone/SSN/card-shape). Names, addresses, dollar amounts, reference numbers, and
masked card last-4s pass the filter and are transmitted as "labels." Multiple public pages assert this cannot
happen. It can. This artifact corrects every instance found.

**Ground truth (do not re-litigate — see `docs/meta/EXTENSION_PRIVACY_DISCLOSURE_001.md`):**
- No screenshots. No screen recording. No video. — TRUE, unconditionally (no such capability exists in the codebase).
- No keystrokes, no field values, ever — even for sensitive fields, only a boolean `value_present` is sent. — TRUE.
- Captured instead: the short visible label of the interacted element (button/link text, ARIA labels, and up
  to 5 words / 40 chars of div/span text), `document.title` (PII-screened), and route-templated URLs (IDs
  parameterized).

**Canonical reusable sentence** (use this anywhere the claim recurs — do not re-derive it):

> Ledgerium never takes screenshots, never records video of your screen, and never transmits keystrokes or the
> value typed into any field — it captures interaction structure instead: the short visible label of the
> element you clicked or filled in (like a button's text or a field's name), the page title, timing, and the
> URL.

---

## Locations — verdict + exact replacement string

### 1. `apps/web-app/src/app/(public)/security/page.tsx:26` — openGraph description
**Verdict: REWRITE**

```
Ledgerium never takes screenshots or video. It captures visible element labels, page titles, and timing — never keystrokes or field values. Secure process documentation by design.
```

### 2. `apps/web-app/src/app/(public)/security/page.tsx:35` — Data Minimization principle body
**Verdict: REWRITE**

```
We capture only what is needed to reconstruct the workflow: clicks, page titles, timing, and the short visible label of what you interacted with — never a screenshot, video, keystroke, or field value.
```

*Adjacent observation (not in the requested location list, optional):* the `details` bullet list directly
below (`'No screenshots'`, `'No video'`, `'No keystrokes'`, `'No clipboard'`, `'No audio'`) is all true and
doesn't need to change, but a sixth bullet — `'Short visible labels only, not full page text'` — would close
the same gap at the bullet-list level for a skimming reader who doesn't read the paragraph above it. Flagged
for the primary agent to accept or decline; not required to close this consult.

### 3. `apps/web-app/src/app/(public)/methodology/page.tsx:39` — body paragraph
**Verdict: REWRITE**

```
Ledgerium captures structured browser interaction events: clicks, navigation, form interactions, and the timing of each step, plus the short visible label of each element (such as a button's text or a field's name) and the page title. It never captures screenshots, video, keystrokes, or the value typed into any field.
```

### 4. `apps/web-app/src/app/(public)/compare/scribe/page.tsx:119` — FAQ answer
**Verdict: REWRITE**

```
No. Ledgerium never captures screenshots, video, or any image of your screen, and it never records keystrokes or the value typed into a field — even for sensitive fields, only whether a value was entered. What it does capture is the short visible label of the element you interact with (a button's text, a field's name), plus the page title and timing. That's a real privacy difference from screenshot-based tools, but it isn't screen-content-free: if a name or number appears as visible label text on the page, that text can be captured.
```

### 5. `apps/web-app/src/content/pages/alternatives.ts:76` — FAQ answer
**Verdict: REWRITE**

```
No. Ledgerium never captures screenshots, video, or your screen — and never records keystrokes or field values. It does capture the short visible label of what you click or fill in, plus page titles and timing, which is a real but narrower privacy footprint than an image of your screen.
```

### 6. `apps/web-app/src/content/pages/compare.ts:35` — Tango page, `keyTakeaways` bullet
**Verdict: REWRITE** *(found via grep sweep — same false-claim family as the listed locations; not in the
original 8 but asserts the identical "no risk of on-screen data" overclaim under different wording)*

```
Ledgerium takes no screenshots and records no video or keystrokes; it reads only short visible labels (like a button's or field's text) to identify what was clicked, not full page content.
```

### 7. `apps/web-app/src/content/pages/compare.ts:76` — Tango page, FAQ answer
**Verdict: REWRITE**

```
No. Ledgerium never captures screenshots, video, or an image of your screen, and it never records keystrokes or field values — even for sensitive fields, only whether a value was entered. It does capture the short visible label of what you click or fill in, plus the page title and timing. That's a real privacy difference from screenshot tools, but visible label text — a name or number shown on the page — can be captured, so it isn't a zero-screen-content tool.
```

### 8. `apps/web-app/src/content/pages/compare.ts:359` — screen-recording page, `keyTakeaways` bullet
**Verdict: REWRITE**

```
Ledgerium captures no screenshots and no video — but it does read short visible text labels (like a button's or field's name) on the page, not full page content.
```

### 9. `apps/web-app/src/content/pages/compare.ts:363` — screen-recording page, `honestLimitation`
**Verdict: REWRITE** *(this field exists specifically to concede limitations — the right place to state the
boundary plainly)*

```
Ledgerium captures browser-based workflows through a Chrome extension. It records short visible text labels of what you interact with, not a screenshot or video, so it is not literally screen-content-free — a name or number shown as label text on the page can be captured. Work in native desktop applications outside the browser is not captured, and a video can show visual detail a structured step list does not.
```

### 10. `apps/web-app/src/content/pages/compare.ts:372` — comparison table row
**Verdict: REWRITE**

Current: `{ label: 'Captures screen content', competitor: 'Yes, full video', ledgerium: 'No screenshots, no screen content' }`

```
{ label: 'Records screen video', competitor: 'Yes — full video', ledgerium: 'No — no screenshots or video; captures short visible text labels only' }
```

Rationale: narrows the dimension to what is literally comparable and true (competitor records video; Ledgerium
never does), and the `ledgerium` cell volunteers the boundary in the same breath — a reader who checks this
row against the source code finds it accurate, which is the whole point.

### 11. `apps/web-app/src/content/pages/compare.ts:386` — screen-recording page, `whenLedgeriumFits` bullet
**Verdict: POLISH**

```
You want a privacy model with no screenshots or video — only short visible labels
```

### 12. `apps/web-app/src/content/pages/compare.ts:396` — screen-recording page, FAQ answer
**Verdict: POLISH**

```
It records the work as structured interaction steps, clicks, inputs, navigation, with per-step timing and system context, then generates an SOP and process map. It captures no screenshots and no video — only the short visible label of what you interact with, plus page titles and timing.
```

### 13. `apps/web-app/src/content/pages/compare.ts:404` — screen-recording page, FAQ answer
**Verdict: REWRITE**

```
No. Ledgerium never captures screenshots, video, or an image of your screen — and never records keystrokes or field values. It does capture the short visible label of what you click or fill in, along with page titles and timing, so it is not literally screen-content-free.
```

---

## Checked and found accurate — no change required

Found via the same grep sweep; these do not assert "no screen content" or "no risk of capturing sensitive
data" and survive an adversarial read as written:

- `apps/web-app/src/app/(public)/install-extension/page.tsx:140` — `'No screenshots or screen recording'` — **KEEP** (literally true; the adjacent `'No keystrokes or typed content (only field names)'` on line 142 is also accurate per the audit — field names/labels are captured, values never are).
- `apps/web-app/src/app/(public)/install/page.tsx:386` — same string, same page pattern — **KEEP**.
- `apps/web-app/src/app/(public)/product/page.tsx:189` — comparison-table cell `'No screenshots, no keystrokes'` — **KEEP** (accurate; does not claim zero screen-content).

**Adjacent observation, not required by this consult:** none of the three "Captured" lists reviewed (e.g.
install-extension page's "Captured" card, lines 118-122) mention that short visible div/span text is read.
They are not false — they just don't volunteer the boundary the way this consult requires elsewhere. A future
iteration could add one line — `'Short visible text near what you clicked or filled in'` — to each "Captured"
list for consistency with the corrected pages above. Logged for awareness; not in scope to close this D-4
consult, which targets `EXTENSION_PRIVACY_DISCLOSURE_001.md`-cited false claims only.
