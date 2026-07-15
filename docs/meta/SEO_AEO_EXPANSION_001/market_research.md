# SEO/AEO Expansion 001 — Market Research: New Page Opportunities

**Date:** 2026-07-14
**Author:** market-research agent
**Method:** Inventory of existing 124-page content registry (read in full) + real GSC signal (7d, impressions/0-clicks) + ICP fit reasoning. No external SEO-tool data was available in this pass — demand estimates are directional (pattern-matched against the existing keyword shapes Ledgerium already targets), not volume-verified. Flagged as an evidence gap below.

**Existing inventory (do not duplicate):**
- Persona (12): operations-managers, consultants, revops-managers, business-analysts, ma-integration-leads, process-excellence-leads, compliance-teams, hr-teams, customer-success-teams, training-managers, ai-transformation-teams, bpo-operations
- Industry (8): manufacturing, healthcare, insurance, banking, saas, professional-services, government, education
- Department (8): finance, hr, operations, customer-support, sales-operations, procurement, it, compliance
- Software (10): salesforce, netsuite, servicenow, jira, zendesk, sap, quickbooks, hubspot, workday, sharepoint
- Workflow (18): invoice-approval, customer-onboarding, month-end-close, zendesk-ticket-resolution, expense-reporting, purchase-order, employee-onboarding, vendor-setup, salesforce-lead-qualification, contract-review, travel-request, password-reset, refund-processing, journal-entry, access-provisioning, sales-order-processing, incident-management, returns-processing
- Problem (22): documentation, SOP, AI-opportunity, onboarding, tribal-knowledge, current-state-maps, baseline, waste, standardize, audit, cross-system, keep-SOPs-current, measure-improvement, bottlenecks, variation, no-interviews, rework, approval-workflows, training, finance-process, cycle-time, compliance
- SOP Template (12), AI Opportunity (8), Alternatives (10: scribe, tango, loom, guidde, whatfix, walkme, process-street, trainual, document360, notion), Competitors (10: scribe, tango, celonis, uipath, soroco, whatfix, walkme, kissflow, getguru, abbyy), Compare (6: tango, manual-sop-documentation, process-mining, task-mining, screen-recording, process-street)

---

## 0. Critical finding on the GSC signal — most of it is NOT a content gap

Before recommending new pages, the GSC list needs a reality check because 6 of the 9 phrases already have a live page:

| Query | Existing page | Verdict |
|---|---|---|
| walkme alternatives | `/alternatives/walkme` | Page exists, 0 clicks despite impressions → **ranking/CTR problem, not a content gap.** Escalate to growth/PM for title-tag + snippet audit, not a new-page brief. |
| guidde alternatives | `/alternatives/guidde` | Same — page exists. |
| scribe alternative | `/alternatives/scribe` | Same — page exists (plural slug covers singular query). |
| kissflow competitors | `/competitors/kissflow` | Same — page exists. |
| tango vs loom | none | **Real gap** — no head-to-head "Tango vs Loom" page exists; `compare.ts` has `tango` (vs Ledgerium) but not a Tango-vs-Loom comparison. |
| netsuite document workflow integration | `/software/netsuite` exists but targets "NetSuite workflow documentation," not "document workflow integration" | **Partial gap** — the page exists but doesn't target this exact intent shape (integration + document-workflow phrasing). |
| insurance document workflow | `/industry/insurance` exists but targets "insurance workflow documentation" | **Partial gap** — same pattern: the phrase "document workflow" is not used anywhere in the registry. |
| whatfix vs productled | none | **Wrong-fit trap** — see §6. |
| ledger app with approval workflow | none | **Wrong-fit trap** — see §6. |

**Implication:** the highest-leverage immediate action is not "build more pages" in isolation — it's (a) fix the 4 pages ranking-but-not-clicking, and (b) close the literal "document workflow" phrase gap, which recurs across 2 of 9 signals and 0 of 124 existing pages use that exact phrase. This is the single biggest structural gap in the current registry.

---

## 1. New PERSONA pages (ranked)

| # | Slug | Primary keyword | Pain | Ledgerium angle |
|---|---|---|---|---|
| 1 | `insurance-claims-managers` | insurance claims process documentation | Claims workflows span policy admin + adjuster judgment + compliance; directly answers the GSC "insurance document workflow" signal at persona level | Record real claims-intake-to-payout workflow → SOP + process map + evidence for regulators |
| 2 | `legal-operations-managers` | legal operations process documentation | Legal ops owns contract/NDA/matter workflows across email + DMS + e-signature; high buying power, document-heavy | Contract-review-workflow + document-workflow cluster tie-in |
| 3 | `quality-managers` | ISO 9001 procedure documentation | QMS auditors demand current, evidence-linked procedures; manual SOP rot is a literal audit finding | Direct fit with compliance-teams persona but QMS-specific angle (ISO clause language) |
| 4 | `shared-services-managers` | shared services process documentation | GBS/shared-services centers standardize the same process across regions/BUs; textbook Ledgerium use case | Baseline + standardize workflow across locations |
| 5 | `chief-of-staff` | process documentation for chief of staff | CoS owns cross-functional process visibility for the CEO/COO without owning any one team | Portfolio-level process health, not single-team SOPs — ties to "process intelligence platform" positioning |
| 6 | `it-service-desk-managers` | IT service desk process documentation | Distinct from IT dept page — ties directly to incident-management + access-provisioning workflows already built | Persona-level wrapper around 2 existing workflow pages |
| 7 | `accounts-payable-managers` | accounts payable process documentation | AP-specific (narrower than finance dept); directly ties invoice-approval-workflow + vendor-setup-workflow | Strong bottom-funnel intent, high existing workflow-page support |
| 8 | `procurement-managers` | procurement process documentation | Narrower than procurement dept page; buyer-title search volume typically exceeds department-noun searches | Ties purchase-order-workflow + vendor-setup-workflow |
| 9 | `warehouse-operations-managers` | warehouse process documentation | Fulfillment/3PL SOP drift is a named pain in logistics; ties sales-order-processing + returns-processing | New industry angle (logistics) at persona level |
| 10 | `nonprofit-operations-managers` | nonprofit process documentation | Small teams, high compliance burden (grant reporting), fits Ledgerium's "record once, no interview" pitch tightly | Untapped vertical, low competitive density |
| 11 | `property-management-operations` | property management process documentation | Lease approval + maintenance workflows are document-and-approval heavy — direct "document workflow" tie-in | New vertical |
| 12 | `clinical-operations-managers` | clinical operations process documentation | Distinct from healthcare-industry generalist page — non-clinical admin ops inside a hospital/clinic system | Narrower persona under existing healthcare industry page |
| 13 | `payroll-managers` | payroll process documentation | High-compliance, high-repetition, cross-system (HRIS+payroll+banking) — strong SOP fit | Ties HR dept + finance dept |
| 14 | `data-entry-supervisors` | data entry process documentation | High-volume, high-variation-between-people process; textbook standardize-workflow use case | Reuses existing "how-to-standardize-workflows" problem page |
| 15 | `franchise-operations-managers` | franchise SOP software | Cross-location consistency is the core sell; "franchise operations manual" has durable commercial search intent | New cross-industry angle, ties SOP templates |

**Do NOT build (low fit):** "digital transformation manager" — overlaps too heavily with existing `ai-transformation-teams`; "VP of Operations" — overlaps `operations-managers` at a title level with no distinct pain to differentiate on.

---

## 2. New INDUSTRY + DEPARTMENT pages

### Industry (document-workflow / compliance intent)

| Slug | Primary keyword | Rationale |
|---|---|---|
| `legal-services` | legal services workflow documentation | Document-approval-heavy vertical; distinct from professional-services generalist; ties directly to the "document workflow" cluster |
| `real-estate` | real estate workflow documentation | Lease/closing document approval chains; high manual-process pain, low current competitive SEO density |
| `logistics-and-supply-chain` | supply chain workflow documentation | Order/shipment document handoffs across TMS/WMS/EDI; ties sales-order-processing + returns-processing workflows |
| `life-sciences` | pharma workflow documentation | GxP-regulated SOP currency is a named, well-documented pain (batch records, deviation logs); high willingness-to-pay vertical |
| `retail-ecommerce` | retail operations workflow documentation | Returns/order-processing/inventory workflows; ties existing returns-processing + sales-order-processing pages |
| `construction` | construction workflow documentation | Change-order/permit document approval chains; explicit document-workflow fit |
| `nonprofit` | nonprofit workflow documentation | Grant compliance + small-team tribal-knowledge risk; underserved vertical, low CAC ceiling fits Ledgerium's self-serve motion |

Skip for now: energy/utilities and telecom — plausible but no ICP evidence yet (no persona or GSC signal supports them); would be speculative.

### Department (document-workflow / compliance intent)

| Slug | Primary keyword | Rationale |
|---|---|---|
| `legal` | legal department workflow documentation | Distinct from persona above; department-hub framing aggregates contract-review + document-approval workflows the way `finance` dept aggregates invoice/close/PO |
| `quality-assurance` | quality management process documentation | ISO/QMS SOP currency; hub for a future `sopTemplate` cluster |
| `accounts-receivable` | accounts receivable workflow documentation | Distinct from AP-heavy finance dept; collections/dunning process documentation has its own search shape |
| `marketing-operations` | marketing operations workflow documentation | Campaign/asset approval workflows; document-approval-adjacent, lower priority than legal/QA but real |

---

## 3. New SOFTWARE integration pages (document-workflow / approval-workflow intent)

Directly answers the "netsuite document workflow integration" signal pattern — the winning frame is **approval/document tools**, not just more ERPs.

| Slug | Vendor | Primary keyword | Why this one |
|---|---|---|---|
| `docusign` | DocuSign | DocuSign workflow documentation | **Highest-priority single addition.** DocuSign IS a document-approval-workflow tool; this page can legitimately use the phrase "document workflow" natively, closing the exact phrase gap from §0 |
| `bill-com` | Bill.com | Bill.com approval workflow documentation | Directly matches "approval workflow" + AP intent from the GSC signal family (safer, on-ICP version of the "ledger app" trap — see §6) |
| `sap-concur` | SAP Concur | Concur workflow documentation | Travel/expense; ties existing expense-reporting + travel-request workflow pages; large install base |
| `coupa` | Coupa | Coupa workflow documentation | Procurement/spend; ties purchase-order-workflow + vendor-setup-workflow |
| `confluence` | Confluence | Confluence SOP documentation | Documentation-adjacent (not just ticketing like Jira); strong organic intent around "SOP" + "process documentation" combined with a tool people already use to store docs |
| `microsoft-dynamics-365` | Dynamics 365 | Dynamics 365 workflow documentation | Second-largest ERP/CRM after NetSuite/Salesforce not yet covered; same role-based-screens pattern as existing NetSuite/SAP pages |
| `box` | Box | Box document workflow | Document-management tool; direct phrase match for "document workflow" |
| `oracle` | Oracle (Oracle Cloud / EBS) | Oracle workflow documentation | Enterprise ERP gap; larger orgs = better ICP fit (multi-seat, compliance-heavy) |

Lower priority, smaller ICP overlap: Freshdesk (Zendesk-adjacent, thinner differentiation), Monday.com/Asana (project-management tools, weaker "approval workflow" framing), Gusto/ADP (payroll — cover via persona page #13 first before a vendor page).

---

## 4. New PROCESS/WORKFLOW pages

| Slug | Primary keyword | Notes |
|---|---|---|
| `document-approval-workflow` | document approval workflow | **Top priority** — directly closes the "document workflow" phrase gap; generic enough to be a hub, specific enough to rank; internal-links to docusign/box/sharepoint software pages |
| `procure-to-pay-workflow` | procure-to-pay process documentation | Umbrella term with real standalone search volume above either purchase-order or invoice-approval alone; can cross-link both existing pages |
| `order-to-cash-workflow` | order-to-cash process documentation | Same umbrella pattern; ties sales-order-processing-workflow |
| `employee-offboarding-workflow` | employee offboarding workflow | Natural pair to existing employee-onboarding-workflow; security/access-removal angle ties access-provisioning-workflow |
| `insurance-claims-processing-workflow` | insurance claims workflow documentation | **Directly answers "insurance document workflow" GSC signal** at workflow-page granularity, complementing the industry + persona pages above |
| `change-management-workflow` | IT change management workflow | Distinct from incident-management-workflow (change requests vs. incidents); strong ITSM search pattern |
| `pto-leave-request-workflow` | PTO request workflow documentation | High-volume HR process, currently uncovered; pairs with employee-onboarding |
| `contract-renewal-workflow` | contract renewal workflow | Distinct commercial intent from contract-review (renewal vs. initial review); RevOps/legal crossover |
| `service-request-workflow` | IT service request workflow | Distinct from incident-management (planned request vs. unplanned incident) |
| `quote-to-cash-workflow` | quote to cash process documentation | RevOps umbrella term; ties salesforce-lead-qualification-workflow |
| `loan-origination-workflow` | loan origination workflow documentation | Banking-specific document-heavy workflow; ties banking industry page |
| `prior-authorization-workflow` | prior authorization workflow documentation | Healthcare-specific, high-friction named process; ties healthcare industry page directly |

---

## 5. "Document workflow" cluster — dedicated recommendation

**Finding:** the exact phrase "document workflow" appears in **zero** of the 124 existing pages, yet it surfaces in 2 of 9 real GSC signals (insurance document workflow, netsuite document workflow integration) and is a natural umbrella for approval/document-management search intent broadly. This is a structural content gap, not a one-off.

**Recommended cluster (pillar + spokes):**
- **Pillar:** new workflow page `document-approval-workflow` (§4) — targets "document workflow," "document approval workflow," "document routing workflow" as primary/secondary keywords.
- **Spokes:**
  - `docusign` and `box` software pages (§3) — both can natively use "document workflow" in title/H1 without keyword-stuffing, unlike ERP pages.
  - `insurance-claims-processing-workflow` (§4) — closes the exact GSC "insurance document workflow" query at workflow-page level.
  - `legal-services` industry page (§2) and `legal-operations-managers` persona (§1) — legal is the vertical where "document workflow" is most native phrasing (contract, NDA, redline routing).
  - A `problem` page: `how-to-document-a-document-approval-process` is awkward phrasing — better framed as extending the existing `how-to-document-approval-workflows` problem page's secondary keywords to explicitly include "document workflow" rather than creating a new near-duplicate problem page (avoid cannibalization).

**Action for existing pages (not new pages, but adjacent and cheap):** add "document workflow" as a secondary keyword to `software:netsuite`, `software:sharepoint`, and `problem:how-to-document-approval-workflows` — these three already substantively cover the intent but don't use the phrase, which is likely suppressing their match for these exact-phrase queries.

---

## 6. Wrong-fit / brand-adjacency traps — do NOT build

1. **"ledger app with approval workflow"** — this is almost certainly bookkeeping/general-ledger software intent (e.g., a QuickBooks/Xero-style ledger with an approval layer), triggered by brand-name collision between "Ledgerium" and "ledger." Building content to chase this term would import high-bounce, wrong-ICP traffic and risks reinforcing the exact confusion the brand name already creates. **Recommended action instead:** the `bill-com` software page (§3) is the safe, on-ICP way to capture the adjacent real intent (AP approval workflow) without chasing the "ledger app" phrase directly.
2. **"whatfix vs productled"** — ProductLed is Wes Bush's product-led-growth methodology/education brand, not a process-documentation or DAP competitor. Searchers here are PLG marketers evaluating a training program, not buyers comparing workflow-documentation tools. Zero ICP overlap. Do not build a compare page; do not let this signal justify a "Whatfix vs X" page series without checking each X for category fit first.
3. **Existing-page "0 click despite impressions"** (walkme/guidde/scribe alternatives, kissflow competitors) — building *more* content here would not fix the underlying problem, which is almost certainly on-page (title tag, meta description, or SERP feature loss) rather than content-gap. Flag to `growth-strategist` / PM for a title-tag and SERP-snippet audit before allocating any new content-engineering time to these terms.

---

## 7. Ranked priority summary (top 12 across all clusters)

1. `document-approval-workflow` (workflow) — closes structural phrase gap, hub for cluster
2. `docusign` (software) — native "document workflow" phrase fit, high commercial intent
3. `insurance-claims-managers` (persona) + `insurance-claims-processing-workflow` (workflow) — directly answers real GSC signal, pairs persona+workflow for compounding internal links
4. `legal-operations-managers` (persona) + `legal` (department) + `legal-services` (industry) — three-page cluster around a document-heavy, high-ACV vertical with zero current coverage
5. `procure-to-pay-workflow` and `order-to-cash-workflow` (workflow) — umbrella terms with likely higher standalone volume than existing narrower pages
6. `bill-com` (software) — safe on-ICP capture adjacent to the "ledger app" trap
7. `employee-offboarding-workflow` (workflow) — natural, currently-missing pair to onboarding
8. `quality-managers` (persona) + `quality-assurance` (department) — ISO/QMS is a named, well-documented pain with no current coverage
9. `sap-concur` and `coupa` (software) — fill approval-workflow-tool gap alongside DocuSign/Bill.com
10. On-page fix (not new pages): add "document workflow" secondary keyword to `netsuite`, `sharepoint`, `how-to-document-approval-workflows`
11. On-page fix (not new pages): title-tag/snippet audit for `walkme`/`guidde`/`scribe` alternatives + `kissflow` competitors (0-click-despite-impressions)
12. `shared-services-managers` (persona) — strong structural fit, lower urgency than verticals above

**Evidence gaps to flag:** no keyword-volume tool was queried in this pass (Ahrefs/SEMrush/GSC full export not available to this agent); all rankings above are intent-and-fit reasoning, not verified search volume. Recommend `growth-strategist` cross-check top-12 against actual GSC/Search Console query data and any available keyword-volume tool before committing engineering time.
