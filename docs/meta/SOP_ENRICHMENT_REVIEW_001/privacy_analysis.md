# SOP Enrichment Review 001 -- Privacy Analysis

**Type:** Mode 3-adjacent design review (NON-counting; analysis artifact only -- zero product code changed)
**Author:** extension-privacy-auditor
**Date:** 2026-07-12
**Directive (CEO, via coordinator):** define exactly which additional signals can be safely extracted from a live page without capturing PII, and the redaction techniques that let us surface more detail without leaking personal data -- while richening SOP step detail per SOP_DETAIL_SPECIFICITY_REVIEW_001.md.

**Required reading verified against source (file:line cited throughout):**
- docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md Section 2 (F-0 pageTitle PII P0) + Section 6 (privacy guardrails table)
- docs/meta/SOP_SPECIFICITY_REVIEW/architect_analysis.md (data-drop cascade, Change A/B/C/D)
- apps/extension-app/src/content/capture.ts
- apps/extension-app/src/content/label-extractor.ts
- apps/extension-app/src/content/target-inspector.ts
- apps/extension-app/src/content/neighbor-context-extractor.ts
- apps/extension-app/src/content/safe-page-title.ts (in-progress P0-a fix)
- apps/extension-app/src/content/state-observer.ts
- apps/extension-app/src/background/normalizer.ts
- packages/policy-engine/src/sensitivity.ts, packages/policy-engine/src/rules.ts

**Note on "the privacy analysis if present":** docs/meta/SOP_SPECIFICITY_REVIEW/ does not contain a standalone privacy_analysis.md file -- the privacy findings referenced by SOP_DETAIL_SPECIFICITY_REVIEW_001.md (as "privacy audit Section 7/8") are embedded in that consolidated document's Section 2 and Section 6/8. This artifact supersedes and extends that embedded analysis with the CEO's new enrichment-vs-privacy mandate.

---

## 0. New finding surfaced by this review (not previously documented)

**F-1 (NEW): state-observer.ts::nodeLabel() emits UNREDACTED DOM text as state_change_details.**

apps/extension-app/src/content/state-observer.ts:156-162:

```
private nodeLabel(node: Element): string | undefined {
  const ariaLabel = node.getAttribute('aria-label')?.trim()
  if (ariaLabel) return ariaLabel.slice(0, 80)
  const text = node.textContent?.trim()
  if (text) return text.slice(0, 80)
  return undefined
}
```

This is the only text-extraction path in the entire capture layer that does not call applySafetyHeuristics() / safeText(). Every other path (label-extractor.ts:57-186, neighbor-context-extractor.ts:52-64) runs candidate text through the shared PII heuristics before returning it. nodeLabel() returns raw textContent -- including the full text of toast/error/status banners, which routinely read like "Payment declined for card ending 4242", "Welcome back, Jane Smith", or "Ticket assigned to jane@co.com".

Verified propagation: capture.ts:94-99 attaches this raw string as state_change_details on the RawEvent; shared/types.ts:164-165 declares it as a plain string field. Verified NOT yet forwarded into CanonicalEvent -- background/normalizer.ts (full file read) never reads state_change_kind/state_change_details, so it does not currently reach the canonical schema or transmission. However, session-store.ts:26,36,133 persists the full raw RawEvent[] (including this field) to chrome.storage.local for service-worker-restart recovery (iter 010) -- so the unredacted toast/error text is stored locally today, and is one un-reviewed normalizer change away from being transmitted off-device. This is exactly the kind of "redaction only implemented on some paths" gap the auditor charter requires catching before it becomes a shipped leak. Severity: P1 (local-storage exposure, not yet transmitted; becomes P0 the moment RC-C-style plumbing forwards it, per the specificity review's own Change-C sequencing). Full remediation in Section 4.

---

## 1. Tiered signal catalogue

### GREEN -- structural signals, safe to capture as-is (no redaction needed)

These are properties of DOM structure, never of DOM text content. They cannot carry PII because they are drawn from a closed enum, an integer, or a boolean.

| Signal | Source | Notes |
|---|---|---|
| interactionType (button_click / link_click / dropdown_select / checkbox_toggle / radio_select / text_input / form_submit / generic_click) | target-inspector.ts:97-110 (already computed, not yet passed to normalizer per architect Change A) | Closed enum, zero text |
| elementType (tag name / input type attribute) | target-inspector.ts:146 | type attribute is developer-authored, not user data |
| role / aria-role | target-inspector.ts:145 | Closed ARIA vocabulary |
| ancestorPath (tag/role/testid only, depth-capped at 4, never text) | target-inspector.ts:114-130 | Already excludes text; keep it that way (architect Section 5.4 -- do not widen) |
| NEW: ordinal position -- "3rd row in table", "2nd item in list", "1st of 4 tabs" | not yet captured -- proposed | Pure integer index computed from Array.from(parent.children).indexOf(el); zero text touched |
| NEW: landmark region -- header / nav / main / aside / footer / role="region" | not yet captured -- proposed | el.closest() against the landmark tag/role set -> emit the matched landmark keyword only, never the landmark's accessible name |
| keyboardIntent (submit/close/navigate) | shared/types.ts:157, already on RawEvent | Classified from key code (Enter/Escape/Tab), never from typed characters |
| valuePresent (boolean) | shared/types.ts:147 | Boolean only -- "a value was typed", never the value |
| NEW: value-shape class (email / date / currency / number / phone / url / text_short / text_long) | derived from input.type / inputmode / pattern attribute only | Never reads .value; a classification of the field, not the entry |
| breadcrumb-template -- structural path segments from page_context.routeTemplate (e.g. /orders/:id/edit -> "Orders > Order > Edit") | background/normalizer.ts:136-143 (deriveRouteTemplate already computed) | Template tokens (:id, :invoiceId) are parameterized placeholders, never the live entity value -- this is why the prior review correctly rejected raw breadcrumb textContent (Section 6 table) in favor of routeTemplate |
| section-heading-template -- heading level + ordinal, e.g. "under the 2nd h2 section" | document.querySelectorAll('h1,h2,h3,h4') position/depth only | Structural coordinate, not the heading's text. (The heading's text is a separate AMBER signal below -- do not conflate the two.) |
| state_change_kind (modal_opened/closed, toast_shown, loading_started/finished, error_displayed, status_changed, dropdown_opened/closed) | state-observer.ts schedule kinds, shared/types.ts:80 | Closed enum already in production; safe today |
| Mutation-count / DOM-delta signals (e.g. "a row was added to the table", "the form was removed") | derivable from MutationRecord.addedNodes.length | Structural fact about the page, not content |

### AMBER -- safe only WITH redaction (labels / button text / column headers / modal titles / toast text / breadcrumb item text / nearby labels / section-heading text)

Every AMBER signal below already exists in code and is already piped through a redaction function -- except F-1 above. The redaction techniques in Section 2 apply to all of them uniformly.

| Signal | Source | Current redaction |
|---|---|---|
| Element label (aria-label, label[for], placeholder, title, data-testid humanised, innerText) | label-extractor.ts:57-186, priority chain 1-11 | applySafetyHeuristics() -- has the over-redaction bug, fixed in Section 2 |
| modalTitle | neighbor-context-extractor.ts:77-109 | safeText(); must stay aria-only per prior review -- never heading.textContent when it's a data-driven dialog title (e.g. "Edit Customer: Jane Smith") |
| tableHeader (th column text) | neighbor-context-extractor.ts:120-146 | safeText() -- column headers are near-universally developer-authored ("Status", "Amount", "Due Date") and low risk, but still gated |
| activeTabLabel | neighbor-context-extractor.ts:207-233 | safeText() |
| nearbyLabels (label[for], preceding-sibling label, aria-describedby) | neighbor-context-extractor.ts:245-287 | safeText() |
| Breadcrumb item text (as opposed to the structural template above) | neighbor-context-extractor.ts:162-197 | safeText(); prior review correctly prefers routeTemplate for the canonical scope-phrase, but the DOM breadcrumb label text (e.g. "Invoices") is still AMBER-safe as a fallback when no route template exists |
| Legend / fieldset label | label-extractor.ts:174-184 | applySafetyHeuristics() |
| Business-identifier strings ("Order #10234", "INV-88421", "Ticket #4471") | any of the above paths | Currently over-redacted -- see Section 2 Fix 1 |
| Toast / error / status message text (state_change_details) | state-observer.ts:156-162 | Currently NOT redacted -- F-1, see Section 4 |

### RED -- never capture, under any circumstance

| Signal | Why |
|---|---|
| HTMLInputElement.value / .checked / selected option text | The literal thing a human typed or chose -- this is precisely "user event behavior data" content, not structure, and is exactly what the product's single purpose ("record workflow structure") does not require |
| textContent of any [contenteditable] element | Free-form authored prose (emails, docs, chat) -- label-extractor.ts:126,137,146 already exclude this correctly; do not regress |
| Raw document.title unscreened | Fixed by safe-page-title.ts (P0-a, pending real-extension validation) -- must remain the standing rule for every future title-adjacent read |
| URL query string / fragment | Already stripped structurally (capture.ts:230-236); this must be replicated by any new capture path that reads location.href (see red line 4 in Section 3) |
| Raw ARIA-live-region / toast / dialog body full text beyond a redacted, length-capped detail | See F-1 remediation Section 4 -- the full message is a paragraph of live application state, effectively free text |
| Any text sourced from inside a chat/comment/messaging widget (role="log", .comment, .message-thread) even if short | Structurally guaranteed to be human-authored free text; no redaction regex reliably scrubs conversational PII (names embedded in sentences, not in a fixed field format) |
| Avatar / profile-photo alt text, "assigned to" / "created by" / "shared with" field values | Person-identifying by definition, regardless of length or format |
| Partially-masked PII (e.g. masked email or masked card number) | See Section 3 red line 5 -- partial masking is a false-safety trap; this codebase's all-or-nothing null is the correct pattern and must not be weakened to "helpful partial reveal" |

---

## 2. Redaction / classification techniques -- moving AMBER to safe

### Fix 1 -- Correct the over-redaction bug (business-ID allowlist), applied atomically to BOTH duplicated heuristic files

Root cause: label-extractor.ts:47,62 -- LONG_DIGITS_RE = /\d{5,}/ fires unconditionally on any run of 5+ digits, so "Order #10234" (5 digits) is nulled identically to a genuine leaked identifier. neighbor-context-extractor.ts:45,58 duplicates the exact same regex and must be fixed in lock-step (F-3/F-5 from the prior review -- these two files must never drift).

Redesigned check order (replaces label-extractor.ts:57-68, mirrored in neighbor-context-extractor.ts:52-64):

1. Empty/whitespace -> null (unchanged).
2. Hard PII rejects, unconditional, run first, never bypassed by the allowlist: EMAIL_RE, URL_RE, PHONE_RE, SSN_RE, CC_RE (unchanged order/patterns -- these are format-confident and must always win).
3. NEW -- business-ID allowlist gate, evaluated only if step 2 passed:
   - a business-code SHAPE match: 2-5 letters, optional separator, 3-10 digits (e.g. INV-88421, PO 33921, Ticket #4471, A16-style codes) OR
   - a leading business-noun token match against a curated, versioned allowlist: order, invoice, po, ticket, case, ref, reference, batch, lot, sku, job, request, req, claim, shipment, tracking, confirmation, booking, reservation, quote, estimate, incident, work order, change request (case-insensitive, word-boundary).
   - AND, critically, the candidate must not match a person-identifying prefix: account, customer, user, patient, employee, member, client, contact, applicant, guest, student, passenger, policyholder, beneficiary, assignee, owner, name (word-boundary, case-insensitive). If this matches, the allowlist is overridden and the text is still nulled -- "Customer #10234" nulls; "Order #10234" survives. This person-prefix check is the direct fix for the prior review's guard (Section 6 table, RC-3 row) and must be checked against both the candidate text itself and, where the caller has it available (the nearbyLabels / associated label[for] text), the immediate field label -- a field literally labeled "Customer ID" must null its adjacent business-shaped value even if the value string alone looks like an order code.
   - If allowlisted: cap the digit run at 10 or fewer consecutive digits even inside an allowlist match (defense-in-depth against a 13-16 digit card/account number slipping in behind a business-looking prefix like "Account number ...").
4. Fallback (unchanged): LONG_DIGITS_RE blanket reject for anything not allowlisted in step 3.
5. Word-count cap (unchanged, MAX_LABEL_WORDS = 12).
6. Length cap (unchanged, MAX_LABEL_CHARS = 80).

This is a strict narrowing of what's rejected, not a widening of what's read -- every field already flows through this function; only the verdict on a specific shape of already-captured text changes. It requires zero new DOM access.

### Fix 2 -- Extend the hard-PII regex bank

Add to the shared regex set (both files, atomically):
- IBAN pattern -- international bank account numbers (two letters, two digits, 10-30 alphanumerics).
- Passport-like format combined with a nearby-context keyword check (passport/visa) -- format alone is too close to some business codes; require context corroboration, unlike SSN/CC which are format-confident.
- Optional Luhn checksum as a confirmation pass for any 13-19 contiguous-or-grouped digit run that survives the business-ID allowlist -- if it passes Luhn, treat as a confirmed card number and null regardless of allowlist match. This closes the theoretical gap where a business code coincidentally has card-number shape.

### Fix 3 -- Entropy / token-noise filter

Reject candidates matching a 20-plus character run of base64/hex-alphabet characters with no internal whitespace (session tokens, JWT fragments, hashes, UUIDs that leaked into a label). This is not a PII filter per se -- it is a noise filter: high-entropy tokens have zero SOP-readability value and occasionally are secrets that slipped past the keyword-based sensitivity.ts classifier (e.g. a data-testid that happens to embed a session id). Reuse the existing SENSITIVE_SELECTOR_PATTERNS (policy-engine/src/sensitivity.ts:22-34) as a first-pass keyword check before falling back to the entropy heuristic.

### Fix 4 -- aria-role gating (restrict which elements are eligible for textContent extraction)

label-extractor.ts rungs 7-9 (:124-152) already restrict innerText reads to button/a/specific interactive roles/short div/span. Extend the gate with an explicit exclusion list: never extract innerText/textContent from an element that is, or is inside, a log/feed/comment/message/chat region (role="log", role="feed", .comment, .message, .chat, or an aria-label containing comment/chat/message) -- these containers are structurally guaranteed to hold free-form human-authored text, and no keyword/format regex reliably scrubs conversational PII (a casual sentence naming a person matches none of the existing patterns).

### Fix 5 -- Placeholder vs. value distinction (formalize, do not just rely on convention)

The codebase already never reads .value (verified: label-extractor.ts has no .value access; target-inspector.ts reads .type only). Formalize this as a standing invariant with a cheap enforcement mechanism: a CI grep-lint over apps/extension-app/src/content/ allowlisted to zero matches outside explicitly-reviewed exceptions, so a future contributor cannot silently reintroduce a .value read while chasing "richer detail." placeholder (rung 4, label-extractor.ts:102-107) remains categorically safe because it is author-written prompt text, never user input -- this distinction (constant-authored-by-developer vs. entered-by-user) is the same principle that makes type attribute reads safe for value-shape classification (architect analysis, "Change A").

---

## 3. Capture-more-safely principle set + explicit red lines

Principles:
1. Capture structure, not content. Prefer "3rd row, Status column, dropdown_select" over "the text said X." Every GREEN signal in Section 1 embodies this; richer SOP detail should be sought here first, before reaching for more AMBER text.
2. Redact at capture, never at display. Every new field must pass through the shared heuristic inside content/* before crossing the RAW_EVENT_CAPTURED message bus -- matches the auditor charter and the P0-a precedent (safe-page-title.ts). A field that reaches background/* or the schema unredacted is a defect regardless of what happens to it later.
3. One redaction source of truth, checked atomically. label-extractor.ts::applySafetyHeuristics and neighbor-context-extractor.ts::safeText currently duplicate the entire regex bank. Recommend (future, non-blocking): extract both into a single shared packages/policy-engine module so Fix 1/2/3 above are written once, not twice. Until that refactor lands, every regex change must touch both files in the same commit -- treat divergence as a P0-class defect (mirrors prior review's F-3/F-5).
4. Allowlist what leaves the device; do not chase every new PII pattern with a denylist. The schema (TargetSummarySchema, canonical-event.schema.ts) already enumerates permitted fields; any new signal must be added there explicitly (additive, optional) rather than assumed safe because nothing rejected it.
5. Business identifiers are safe only when the context is structural, never when the field's own semantic identity is a person. A code shaped like an order number is safe; the same shape sitting in a field labeled "Customer" or "SSN" is not -- always check the field's declared identity (label/prefix), not just the value's format.
6. Length and word caps are cheap defense-in-depth -- never relax them for richness. The 80-char/12-word/40-char-selector-slice caps exist specifically to keep a stray paragraph or sentence from being captured as a label. Any P1/P2 enrichment proposal that requires raising these caps should be treated as a privacy-review trigger, not a routine change.
7. Redaction is binary (null or safe), never partial. No masked-but-visible fragments -- a failed-to-fully-scrub fragment is still exposure, and partial masking gives false confidence that the field was reviewed.
8. Every enrichment ships with a name, a REQUIRED/OPTIONAL/OVER-COLLECTION classification, and a redaction plan before it is coded -- this artifact's tiering (Section 1) is the template for that classification going forward.

Explicit red lines (never, no exceptions):
1. Never read .value, .checked, or a selected option's text from any form control.
2. Never read textContent/innerText of a [contenteditable] element, or of anything inside a chat/comment/message/feed/log container (Section 2 Fix 4).
3. Never transmit document.title (or any title-adjacent structural title) without running it through the unanchored-embedded-PII screen (safe-page-title.ts pattern) first.
4. Never include URL query string or fragment in any captured field -- every new capture path that touches location.href/window.location must replicate capture.ts:230-236's stripping behavior; this is a standing lint-checkable rule, not a one-time fix.
5. Never emit partially-masked PII as a helpful middle ground between full value and full redaction.
6. Never let the two duplicated heuristic files diverge in a single change.
7. Never widen the aria-role/element-type gate on innerText extraction without an explicit person-free-text exclusion check (Section 2 Fix 4).
8. Never raise the 80-char/12-word/40-char length caps to accommodate a richer-detail request without a privacy-review pass on the specific field.

---

## 4. Outcome / state-change signals -- making them PII-safe

Immediate fix (closes F-1, zero new capture, matches P0-a governance class -- touches content/*, requires real-extension harness per Extension Reliability Invariant):

Route state-observer.ts::nodeLabel()'s return value through the same safeText()/applySafetyHeuristics() pipeline used everywhere else, before it is ever attached as state_change_details. Concretely: import the shared heuristic and wrap both return branches so a message like "Payment declined for card ending 4242 -- contact jane@co.com" nulls (CC/email hit) while "Order #10234 created successfully" survives (business-ID allowlist, Fix 1).

Structural design -- get MORE outcome specificity from structure, not from reading more text, which is the actual bridge between "richer SOP detail" and "PII-safe":

1. state_change_kind (already shipped, GREEN, closed enum: modal_opened/modal_closed/toast_shown/loading_started/loading_finished/error_displayed/status_changed/dropdown_opened/dropdown_closed) is itself a strong "expected result" signal for the SOP renderer's Tier rubric (SOP_DETAIL_SPECIFICITY_REVIEW_001.md Section 4) -- e.g. "a confirmation dialog closed" is specific and 100% structural.
2. NEW GREEN signal -- outcomePolarity (negative / neutral / positive), derived entirely from the same structural signals isErrorNode() already inspects (state-observer.ts:142-154: role="alert", class containing error/danger, aria-atomic) plus a mirrored positive-signal check (class containing success/confirm/complete, role="status" absent an error signal). This is a classification of CSS class / ARIA role, never of message text -- it answers "did this action succeed or fail" (exactly the outcome detail the CEO wants) without reading a single character of the toast body.
3. NEW GREEN signal -- mutation-count deltas ("a row was added", "3 items removed", "the form was replaced") derived from MutationRecord.addedNodes.length/removedNodes.length already available inside analyzeMutation() (state-observer.ts:54-65) -- a genuinely new structural fact, zero text risk.
4. AMBER, strictly optional detail field, capped tighter than the label cap (40 chars, not 80 -- status text is more likely to carry dynamic business/user data than a static button label) -- only populated after Fix 1's redaction passes, and only when outcomePolarity alone is judged insufficient. This is the last rung, not the first.
5. Gate all of the above off entirely when the mutated/added node is inside (or is) a chat/comment/message container per Section 2 Fix 4 -- an error inside a support-chat widget is far more likely to contain a human-authored, PII-bearing sentence than a system toast.

This ordering -- kind (GREEN) then polarity (GREEN) then mutation-count (GREEN) then capped redacted detail (AMBER, last resort) -- lets the SOP step read "Clicked Save -- a success confirmation appeared and the modal closed" without ever transmitting the literal toast text, which is both safer and, per the specificity review's own UX rubric, arguably more useful than a raw string that might read "Order #10234 for Jane Smith saved successfully."

---

## 5. Summary table -- required guard per new signal (for implementers)

| New/changed signal | Tier | Guard required | File(s) to touch |
|---|---|---|---|
| ordinal position, landmark region | GREEN | none -- pure structure | target-inspector.ts (new field) |
| section-heading-template, breadcrumb-template | GREEN | must stay index/route-token only, never heading/breadcrumb text | normalizer.ts, neighbor-context-extractor.ts |
| business-ID labels (order/invoice/ticket numbers) | AMBER | Fix 1 allowlist, atomic in both files | label-extractor.ts, neighbor-context-extractor.ts |
| modalTitle, tableHeader, activeTabLabel, nearbyLabels | AMBER | existing safeText(), extended regex bank (Fix 2/3) | neighbor-context-extractor.ts |
| state_change_details (toast/error text) | AMBER (currently unguarded -- F-1) | route through safeText(), cap at 40 chars, gate off chat containers | state-observer.ts |
| outcomePolarity, mutation-count deltas | GREEN (new) | none -- pure structure/class-name classification | state-observer.ts |
| .value, contenteditable text, chat/comment text | RED | never capture | n/a -- enforce via lint (Fix 5) |

Governance note: every AMBER/GREEN item above that touches apps/extension-app/src/content/* or apps/extension-app/src/background/* is P0-gated under the Extension Reliability Invariant and requires explicit CEO approval plus the real-extension harness before shipping -- this artifact is design-only and authorizes nothing.
