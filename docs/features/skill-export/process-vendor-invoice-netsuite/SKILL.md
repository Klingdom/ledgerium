---
name: process-vendor-invoice-netsuite
description: >-
  Processes an inbound vendor invoice end-to-end: validates the PO match, enters
  the invoice in NetSuite, routes it for approval, and files the document. Use
  when handling accounts-payable invoice intake, replicating a NetSuite invoice
  data-entry procedure, or assisting an AP clerk with vendor-bill processing.
  Captured by Ledgerium from real recorded behavior — 1 session, 14 steps, 3
  systems, 92% extraction confidence. Every step traces to a source event.
when_to_use: >-
  An inbound vendor invoice needs to be entered and approved; AP intake; an agent
  is asked to "process this invoice" or "enter this bill in NetSuite".
allowed-tools: []          # advisory skill — no autonomous execution in v1
license: proprietary
ledgerium:
  workflow_id: wf_01HXVENDORINV8842
  evidence_hash: sha256:9f2c4b7e1d8a3056c2e9f0a1b4d7c8e5f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8
  process_engine_version: "2.4.0"
  source_sessions: 1
  step_count: 14
  phase_count: 4
  systems: [netsuite, gmail, sharepoint]
  confidence: 0.92
  health_score: 97
  opportunity_tag: automate
  automation_classification: human_in_loop
  reusability_score: 0.71
  generated_at: "2026-04-08T00:00:00Z"   # read from the recorded session, never wall-clock
  determinism: deterministic
---

# Process Vendor Invoice (NetSuite)

_An AP invoice-intake skill generated from a real recorded session. Validate PO → enter bill in NetSuite → route for approval → file the document._

> Provenance: this skill was **observed, not authored.** Each instruction below links to the source event(s) in `assets/event-log.ocel.json`. Regenerating from the same recording with engine `2.4.0` yields a byte-identical package (`evidence_hash` above).

## What this skill does  ·  _source: Workflow + Interpretation_
- **Process type:** Transaction (AP data entry) · **Trigger:** a vendor invoice/bill arrives by email.
- **Outcome:** the invoice is recorded in NetSuite, matched to its PO, routed to an approver, and the source PDF is filed in SharePoint.
- **Footprint:** 14 steps across 4 phases (Receive → Validate → Enter → Approve & File), touching Gmail, NetSuite, and SharePoint.

## When to use it  ·  _source: Interpretation + Insights_
Use when an inbound vendor bill needs entry and approval. Good fit when the PO already exists and the invoice is a standard 3-way-match case. **Do not** use for non-PO/expense invoices or for credit memos — those follow a different recorded path (not in this skill).

## Inputs required  ·  _source: AI Agents (SkillLibrary I/O schema)_
- `invoice_pdf` (required) — the vendor invoice document.
- `po_number` (required) — purchase order to match against.
- `vendor_id` (optional) — resolved from the PO if omitted.

## Outputs produced  ·  _source: AI Agents (SkillLibrary I/O schema)_
- `netsuite_bill_id` — the created vendor bill record ID.
- `approval_status` — `routed` after submission.
- `filed_document_url` — SharePoint location of the archived PDF.

## Procedure (summary)  ·  _source: SOP (compressed; full detail in `references/sop.md`)_
Each step lists the **system** and a **source-event reference** (`ev:` ids resolve in the OCEL event log). Confidence < 0.7 is flagged `⚠ verify`.

1. **Open the invoice email** — Gmail · `ev:e1` · open the vendor-bill message and download the PDF attachment.
2. **Validate PO match** — NetSuite · `ev:e2,e3` · search the PO number; confirm vendor, amount, and line items match the invoice.
3. **Create vendor bill** — NetSuite · `ev:e4–e7` · New → Vendor Bill; set vendor, reference the PO, enter invoice #, date, and amount.
4. **Attach the source PDF** — NetSuite · `ev:e8` · attach the downloaded invoice to the bill record.
5. **Submit for approval** — NetSuite · `ev:e9,e10` · Save & Submit; the bill routes to the configured approver.
6. **File the document** — SharePoint · `ev:e11–e14` · upload the PDF to `/AP/Invoices/{vendor}/{year}` and confirm.

→ **Full step-by-step instructions, expected results, and cautions:** `references/sop.md`

## Decision points  ·  _source: Interpretation (decisions)_
- **PO mismatch** (step 2): if amount/lines don't match → stop and escalate to AP lead (do not create the bill).
- **Missing approver** (step 5): if no approver is configured for the amount band → route to the AP manager queue.

## Systems & automation potential  ·  _source: AI Agents (SkillLibrary) + Report (scores)_
| Sub-skill (extracted) | Type | Systems | Automation | Reusability |
|---|---|---|---|---|
| `validate-po-match` | decision | NetSuite | human-in-loop | 0.78 |
| `create-vendor-bill` | data-entry | NetSuite | full-automation candidate | 0.81 |
| `file-document` | data-entry | SharePoint | full-automation candidate | 0.74 |

- **Opportunity tag:** `automate` · **AI-opportunity score:** high (multi-system, repeatable, ~13 min/run).
- **Health score:** 97/100 (speed 30 · consistency 30 · data-quality 18 · standardization 19).

## Performance & variance  ·  _source: Report + Intelligence_
- **Mean cycle time:** 13 min 20 s (single run; record more runs to unlock variance/variant analysis).
- **Phases:** Receive (1m) · Validate (3m) · Enter (6m) · Approve & File (3m).
- _Multi-run note:_ once ≥2 runs exist, `references/intelligence.md` will carry sequence-stability, variant paths, and per-step bottlenecks. **Single-run today → treat timings as indicative, verify before automating.**

## Known friction & cautions  ·  _source: Insights (severity ≥ medium) + Interpretation (friction)_
- ⚠ **Manual PO lookup** (medium): step 2 is a manual search — a frequent error point if the PO number is mistyped.
- ⚠ **Attachment step easily skipped** (medium): step 4 (attach PDF) was the most error-prone in similar processes; confirm the attachment saved.

## Evidence & provenance  ·  _source: Workflow (process_output) — Ledgerium core invariant_
- Workflow ID: `wf_01HXVENDORINV8842` · Session: `sample-session-8842` · Recorded: 2026-04-08 · 14 steps.
- Every instruction references `ev:` event ids that resolve in `assets/event-log.ocel.json` → original captured events. **No step is authored; all are observed.**
- `evidence_hash` in the frontmatter fingerprints the exact artifact inputs + engine version. A changed hash means the source evidence or engine changed — regenerate.

## Bundled resources
| Path | What it is | Format | Source views |
|---|---|---|---|
| `references/sop.md` | Full operator SOP (all step detail, expected results, cautions) | Markdown | SOP |
| `references/process-map.md` | Swimlane / BPMN-informed process map | Markdown | Workflow + Process map |
| `references/metrics-report.md` | Exec summary, phase metrics, scores, full insights + interpretation | Markdown | Report + Insights + Interpretation |
| `references/intelligence.md` | Variance / variants / bottlenecks (present only when ≥2 runs) | Markdown | Intelligence |
| `assets/process-map.mmd` | Lightweight flow for preview/LLM | Mermaid | Workflow |
| `assets/process-map.bpmn.json` | Interoperable process model (pre-XML) | JSON | Workflow |
| `assets/event-log.ocel.json` | Immutable event backbone (evidence) | OCEL 2.0 JSON | Workflow (process_output) |
| `assets/skill-manifest.json` | Agent/MCP-shaped tool definitions | JSON | AI Agents (SkillLibrary) |

---
_Generated by Ledgerium AI · skill v1 · engine 2.4.0 · evidence-linked · deterministic · source workflow wf_01HXVENDORINV8842_
