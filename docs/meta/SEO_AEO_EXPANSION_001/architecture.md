# SEO/AEO Expansion — Content-Engine Capacity & New-Pattern Architecture

**Mode 3-adjacent architecture review · ZERO code changes · analysis artifact only.**
Author: system-architect. Date: 2026-07-14.
Scope: assess the typed content engine's capacity to absorb 100+ new landing pages
at scale, and specify deterministic, validator-passing architecture for new page
patterns (X-vs-Y, document-workflow cluster) plus AEO-at-scale guardrails and a
batch content-generation contract.

Source files reviewed: `content/types.ts`, `content/registry.ts`, `content/pages/*.ts`,
`components/seo/*PageView.tsx`, `app/(public)/<prefix>/[slug]/page.tsx` (11 routes),
`app/sitemap.ts`, `lib/seo/sitemap.ts`, `app/robots.ts`, `app/llms.txt/route.ts`,
`lib/seo/{validate,metadata,jsonLd,related,url}.ts`, `lib/seo/content.test.ts`.

---

## 0. How the engine is wired (ground truth)

The engine is a **discriminated-union content model** with fully derived routing/SEO:

- **`content/types.ts`** — `PageType` (12 values) + one interface per authored type
  (11 in the `SeoPage` union). `BasePage` carries all shared fields; `canonical`
  and `breadcrumbs` are **derived, never authored** (removes self-reference errors).
- **`content/registry.ts`** — `ALL_PAGES` is a pure concat of per-type arrays.
  `ROUTE_PREFIX`, `PARENT_HUB` (both `Record<PageType, …>`), and `RESERVED_SLUGS`
  drive routing. `getPublishedPages()` = `published && !reserved`.
- **`app/(public)/<prefix>/[slug]/page.tsx`** — one route per type. Each declares
  `generateStaticParams()` (published + non-reserved → SSG at build), plus
  `generateMetadata` and a JSON-LD `<script>` block feeding a typed `*PageView`.
- **`lib/seo/`** — `metadata.ts` (`OG_TYPE: Record<PageType,…>`), `jsonLd.ts`
  (Speakable/FAQPage/HowTo/Article/BreadcrumbList/WebPage, all deterministic),
  `related.ts` (curated `related` tokens + tag-overlap fill, self-excluding),
  `sitemap.ts` (hubs + published leaves), `validate.ts` (the blocking gate).
- **`app/sitemap.ts`** — static entries + engine entries, merged (static wins on
  URL collision). One flat `sitemap.xml`.
- **`app/llms.txt/route.ts`** — `TYPE_ORDER` array; force-static; regenerated from
  the published registry.

**Determinism is a hard invariant** (`content.test.ts`): `generateSeoMetadata`,
`generateJsonLd`, and `getRelatedPages` must be byte-identical across calls, and the
validator must return **zero errors**.

---

## 1. Capacity verdict

**Verdict: YES — the current architecture absorbs 100+ new pages across the existing
11 authored types with NO architecture change.** Adding pages = appending typed
objects to the relevant `content/pages/*.ts` array. Everything downstream is already
generic over the registry:

- Routing: `generateStaticParams()` enumerates the registry — new entries auto-emit
  static pages. No per-page route code.
- SEO/JSON-LD/related/sitemap/llms.txt: all iterate `ALL_PAGES` / `getPublishedPages()`.
- Quality: `validate.ts` runs over the full set with per-type prose extraction.

Nothing in the hot path is hardcoded per-page. The design is genuinely built for
volume within existing types.

### Scaling limits (all soft; none block 100+, several matter at 1k+)

| Concern | Mechanism today | Headroom | Action threshold |
|---|---|---|---|
| **Build time** | Full SSG via `generateStaticParams`; pure renders, no data fetch | Linear; comfortable into low thousands | Watch build wall-clock >~2–3k pages |
| **Validator cost** | `validate.ts` near-dup is **O(n²) pairwise cosine within each type** | Fine at 100s; ~seconds at low thousands | Bucket near-dup by type-and-tag, or shard, at ~1.5k+ pages/type |
| **Sitemap size** | Single flat `sitemap.xml` | Google ceiling 50,000 URLs / 50 MB | Introduce a **sitemap index** (split per type) before ~40k URLs |
| **static-params** | Deterministic per-type enumeration | No limit in practice | — |
| **Duplicate-content / canonical** | Canonical **derived** from type+slug; global uniqueness on `metaTitle`, `metaDescription`, `mechanismIntro` | Safe by construction | Extend uniqueness to `shortAnswer` + `originalDataPoint` at scale (see §4) |
| **Thin-content** | 400-word prose floor + within-type near-dup (cosine ≥0.7 error, ≥0.5 warn) | Good baseline | Cross-**type** near-dup is NOT checked — templated persona/department/industry can collide undetected (see §4) |

**Bottom line:** no re-architecture needed for the requested scale. The two real
scale investments are (1) a **sitemap index** near 40k URLs and (2) **cross-type
duplicate/thin guardrails** in the validator — both additive, neither structural.

---

## 2. The "X vs Y" pattern (Ledgerium-is-neither-tool)

**Decision: this needs a NEW page type. It does NOT fit `compare`.**

`ComparePage` is hardwired **Ledgerium-vs-competitor**: it carries a single
`competitor` string; `rows: CompareRow` is two-valued (`competitor` | `ledgerium`);
it has `whenLedgeriumFits` / `whenCompetitorFits` / `competitorStrength`; and
`ComparePageView.tsx` renders a fixed two-column table headed `{competitor}` and a
brand-accented **Ledgerium** column. A neutral "Tool A vs Tool B" (e.g. *Tango vs
Scribe*) where Ledgerium is a **third option** cannot honestly ride this shape —
forcing it would imply Ledgerium is one of the two compared tools, misrepresent the
table semantics, and pollute the `compare` near-dup bucket.

### Minimal, deterministic, validator-passing addition — new `versus` type

1. **`types.ts`**
   - Add `'versus'` to `PageType`.
   - Add:
     ```ts
     export interface VersusRow {
       readonly label: string;
       readonly toolA: string | boolean;
       readonly toolB: string | boolean;
     }
     export interface VersusPage extends BasePage {
       readonly type: 'versus';
       readonly toolA: string;
       readonly toolB: string;
       readonly whyItMatters: string;
       readonly rows: readonly VersusRow[];
       readonly whenToolAFits: readonly string[];
       readonly whenToolBFits: readonly string[];
       /** The honest "neither of these is us" positioning — third-option angle. */
       readonly whereLedgeriumFits: string;
       readonly verifiedAsOf: string;
     }
     ```
   - Add `VersusPage` to the `SeoPage` union.
2. **`registry.ts`**
   - `ROUTE_PREFIX.versus = '/vs'` (a **new segment** — must not reuse `/compare`,
     whose `/compare/scribe` is a reserved hand-built page and whose hub is null).
   - `PARENT_HUB.versus = { label: 'Comparisons', path: '/vs' }`.
   - `import { VERSUS_PAGES }` and spread into `ALL_PAGES`.
3. **`content/pages/versus.ts`** — `export const VERSUS_PAGES: VersusPage[] = [...]`.
   **Slug convention:** `${toolA-slug}-vs-${toolB-slug}` (kebab), e.g.
   `tango-vs-scribe` → `/vs/tango-vs-scribe`.
4. **`components/seo/VersusPageView.tsx`** — a **3-column** table (`{toolA}` |
   `{toolB}` | neutral), reusing the shared `Blocks` primitives, ending with a
   **"Where Ledgerium fits"** section rendered from `whereLedgeriumFits` (keeps the
   `.seo-answer`/`.seo-datapoint` Speakable anchors and the honest third-option frame).
5. **`lib/seo/metadata.ts`** — add `versus: 'article'` to `OG_TYPE` (the map is
   `Record<PageType,…>`, so omission is a **compile error** — good forcing function).
6. **`lib/seo/validate.ts`** — add a `versus` branch to `proseSources()` pushing
   `whyItMatters`, `whereLedgeriumFits`, `whenToolAFits`, `whenToolBFits`, and the
   row labels/string cells. **Without this the depth counter under-counts and every
   versus page fails the 400-word floor.** This is the single most-missed wiring step.
7. **`app/(public)/vs/[slug]/page.tsx`** — copy the `compare` route verbatim,
   swapping type to `'versus'` and the view to `VersusPageView`.
8. **`lib/seo/sitemap.ts`** — add `'versus'` to `HUB_TYPES`.
9. **`app/llms.txt/route.ts`** — add `{ type: 'versus', heading: 'Tool comparisons' }`
   to `TYPE_ORDER` (otherwise versus pages are invisible to the LLM site map).
10. **JSON-LD** — declare `['Article','FAQPage','BreadcrumbList','WebPage','Organization']`.
    No `steps`, so `howTo()` is untouched. No change to `jsonLd.ts` required.

That is the complete, minimal surface: **1 interface + 1 row type + 1 view + 1 route
+ 6 one-line registry/lib/sitemap/llms edits.** Deterministic and validator-clean.

> The identical recipe generalizes to any future neutral pattern (e.g. category
> round-ups). The engine's contract is: *add a type by touching exactly these 9
> seams.* This is the reusable "new-page-type" checklist (see §6).

---

## 3. The "document-workflow" cluster

**Verdict: NO new type. Absorb it into existing types by intent, as a topic cluster.**

"Document a workflow" content splits cleanly across three existing types by the
axis of the query:

| Query shape | Type | Route / canonical | Example slug |
|---|---|---|---|
| Generic *how-to* ("how to document a workflow", "how to create an SOP from scratch", "how to capture tribal knowledge") | **`problem`** | `/use-cases/problems/[slug]` | `how-to-document-a-workflow` |
| Tool-specific ("document a workflow in HubSpot") | **`software`** | `/software/[slug]` | `hubspot` |
| Named business process ("invoice-approval workflow") | **`workflow`** | `/workflow-library/[slug]` | `invoice-approval-workflow` |

The `problem` type is the correct home for the generic document-workflow cluster: it
already models `whyItHappens` / `diagnostic` / `manualApproach` / `ledgeriumApproach`
/ `steps` / `commonMistakes`, and it **emits `HowTo` JSON-LD from `steps`**
(`jsonLd.ts` maps `problem` + `workflow` → HowTo). Existing pages already follow this
(`problem:how-to-prepare-for-a-process-audit`, `how-to-reduce-onboarding-time`,
`how-to-capture-tribal-knowledge`).

**Cluster construction (topical authority, no new code):**
- **Hub:** `/use-cases/problems` (existing `PARENT_HUB.problem`).
- **Spokes:** `problem` pages slugged `how-to-document-*`.
- **Cluster cohesion:** a shared controlled tag (e.g. `documentation`) plus **curated
  `related` tokens** cross-linking each how-to to the relevant `software:*` and
  `workflow:*` pages. `related.ts` already resolves curated tokens first, then fills
  by tag-overlap deterministically — so a well-tagged cluster self-links correctly.

**Canonical/slug structure is safe as-is** (derived type+slug). The only discipline
required is slug-prefix and tag consistency, both enforceable in the §6 contract.

---

## 4. AEO / schema correctness at scale

**What already scales correctly (keep):**
- **JSON-LD is derived per declared `jsonLd[]`** and deterministic — every page emits
  consistent BreadcrumbList/WebPage/Article/FAQPage/Organization. No per-page drift.
- **Speakable** targets fixed selectors `.seo-answer` / `.seo-datapoint` present in
  the shared `Blocks`, so every page gets Speakable "for free" as long as views use
  those primitives (the vs-view must reuse `SeoHero` + `DataPointCallout`).
- **Entity anchoring** via `about` (`primaryKeyword`) + `mentions` (`secondaryKeywords`)
  in `webPage()`. Correct across all types.
- **Canonical**: derived, single per page — **no param/duplicate-canonical risk.**
- **FAQPage** from `faqs`; **HowTo** from `steps`/`exampleProcedure`. (Note the code
  comment: FAQPage/HowTo no longer yield Google rich results — they are emitted for
  **answer-engine parsing only**. Correct expectation; don't market rich-result CTR.)

**hreflang:** currently **absent** — `webPage()` sets `inLanguage: 'en'` and metadata
sets no `alternates.languages`. For a **single-locale (English)** site this is
**correct, not a bug** — hreflang is only required for multi-locale. If i18n is added
later, add `alternates.languages` + `x-default`; today's absence needs no fix.

**Guardrails against duplicate/thin content — present vs. recommended:**

| Guardrail | Status | Recommendation at scale |
|---|---|---|
| Global unique `metaTitle` / `metaDescription` | ✅ enforced | keep |
| Global unique `mechanismIntro` | ✅ enforced | keep — this is the key AEO de-boilerplate lever |
| `keyTakeaways` 3–5, each ≤60 words | ✅ enforced | keep |
| 400-word prose floor (published) | ✅ enforced | keep; per-type prose MUST be in `proseSources` |
| Within-type near-dup (cosine ≥0.7 err / ≥0.5 warn) | ✅ enforced | **extend to cross-type** — templated persona/department/industry pages can collide and are currently unchecked |
| Unique `shortAnswer` | ⚠️ not enforced | add global-uniqueness (it is the Speakable/`.seo-answer` block — collisions are AEO-toxic) |
| Unique/real `originalDataPoint` | ⚠️ not enforced | add a **uniqueness warn** — reusing "the one real fact" across a batch signals thin/templated content |
| Controlled **tag vocabulary** | ⚠️ not enforced | maintain a fixed tag allow-list — uncontrolled tags fragment `related.ts` overlap and orphan pages |
| Internal-link minimum | ⚠️ warn only (0 related) | require **≥2 curated `related`** for batch-generated pages to guarantee cluster cohesion |
| Sitemap index | n/a below 50k | split per type before ~40k URLs |
| `llms.txt` inclusion | manual `TYPE_ORDER` | add any new type to `TYPE_ORDER` |

These are **additive validator/process recommendations** (no change made here). The
engine's honesty posture (`honestLimitation`, dated `verifiedAsOf`, "no screenshots"
privacy line) is already a strong differentiator that answer engines reward — the
batch contract in §5 must preserve it.

---

## 5. Content-generation contract (deterministic batch input)

A new page object MUST satisfy **every** rule below to pass `validateContent()` with
zero errors (the blocking gate in `content.test.ts`). This is the exact spec a batch
generator targets.

### 5.1 Required `BasePage` fields + rule

| Field | Rule (blocking unless noted) |
|---|---|
| `type` | valid `PageType` |
| `slug` | `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`; unique within type; not in `RESERVED_SLUGS` |
| `metaTitle` | **30–65 chars**; globally unique |
| `metaDescription` | **120–160 chars**; globally unique |
| `h1` | non-empty |
| `eyebrow` | non-empty (authored) |
| `shortAnswer` | **≤100 words**; non-empty; stands alone (renders in `.seo-answer`) |
| `primaryKeyword` | non-empty; a real entity (feeds `about`) |
| `secondaryKeywords` | array (feeds `mentions`) |
| `searchIntent` | `informational` \| `commercial` \| `transactional` |
| `tags` | from controlled vocab (recommended); drive related-fill |
| `related` | each `${type}:${slug}` MUST resolve; no self-link; **≥2 curated recommended** (0 = warn) |
| `originalDataPoint` | non-empty; ≥1 real Ledgerium fact (unique recommended) |
| `keyTakeaways` | **3–5** items; each **≤60 words** (published) |
| `mechanismIntro` | non-empty; **globally unique** (published) |
| `honestLimitation` | non-empty |
| `faqs` | **3–10** `{q,a}`; first answer page-specific |
| `jsonLd` | subset of `JsonLdType[]` |
| `author` | `{ name, sameAs? }` |
| `updatedAt` | ISO date, `Date.parse` valid |
| `published` | boolean; `true` activates publish gates (mechanismIntro, keyTakeaways, ≥400-word depth) |
| *(derived depth)* | `proseSources(page)` word count **≥400** (published) — type prose MUST be populated |
| *(near-dup)* | within-type cosine **<0.7** (vary prose; <0.5 to avoid warn) |

### 5.2 Per-type required fields (the two examples' types)

- **`persona`**: `whoThisIsFor`, `painPoints[]`, `whatTheySearchFor[]`,
  `jobsToBeDone[]`, `commonWorkflowsToDocument[]`, `dayInTheLife`, `howLedgeriumHelps`.
- **`software`**: `vendor`, `documentationFrame`, `commonWorkflows[]`,
  `documentationChallenges[]`, `oldWay`, `ledgeriumWay`, `commonMistakes[]`.

### 5.3 Filled example — new **persona** page

```ts
const procurementManagers: PersonaPage = {
  type: 'persona',
  slug: 'procurement-managers',                                   // kebab, unique in persona
  metaTitle: 'Ledgerium AI for Procurement Managers',             // 42 chars ✓ (30–65), unique
  metaDescription:
    'Procurement managers use Ledgerium to document sourcing and purchase-order workflows from real work, turning them into current SOPs and process maps.', // 151 chars ✓ (120–160), unique
  h1: 'Ledgerium AI for procurement managers',
  eyebrow: 'For procurement',
  shortAnswer:
    'Ledgerium helps procurement managers document how sourcing, vendor onboarding, and purchase-order approval actually run across the ERP, email, and e-signature. You record the real process once and get a step-by-step SOP, a process map, and a report showing where a PO waits between approvers. That gives you a current-state baseline you can standardize, measure, and hand to new buyers, without pulling the team off live purchasing to write procedures.', // <100 words ✓
  primaryKeyword: 'procurement process documentation',
  secondaryKeywords: ['document purchase order workflow', 'procurement SOP', 'sourcing process mapping'],
  searchIntent: 'commercial',
  tags: ['persona', 'procurement', 'sourcing', 'documentation', 'standardization'], // controlled vocab
  related: ['workflow:purchase-order-workflow', 'software:netsuite', 'compare:process-mining'], // ≥2, resolve ✓
  originalDataPoint:
    'Ledgerium timestamps each approval handoff on a recorded purchase order, so a procurement manager can see that most PO cycle time is waiting for the next approver rather than the buyer\'s own work.', // unique fact
  mechanismIntro:
    'Ledgerium captures the procurement motion by recording the real sourcing, vendor-setup, and PO-approval steps across the ERP, email, and e-signature, so the process map timestamps how long each purchase order waits at every approver.', // globally unique
  keyTakeaways: [
    'Procurement managers lose the most cycle time to approval handoffs between buyers, finance, and vendors, not inside any single task.',
    'Purchase-order and vendor-onboarding steps span the ERP, email, and e-signature, and a single recording captures the full cross-system flow.',
    'A recording captures the exception paths — off-catalog buys, budget escalations — that a memory-written procurement SOP compresses into one line.',
    'Ledgerium separates work time from wait time on every recorded PO, so the slow approvers show up as evidence rather than anecdote.',
    'New buyers reach productivity faster following an SOP generated from a real purchasing run than from an idealized procurement manual.',
  ],                                                              // 5 items, each <60 words ✓
  honestLimitation:
    'Ledgerium documents browser-based procurement work. Approvals made in native desktop ERP clients or on paper still need a buyer to add the context.',
  whoThisIsFor:
    'Procurement and purchasing managers who own sourcing, vendor onboarding, and purchase-order approval and are responsible for consistency, controls, and onboarding new buyers.',
  painPoints: [
    'Approval routing lives in people\'s heads and varies by buyer',
    'Procurement SOPs are written from memory and drift out of date',
    'No baseline showing where a PO actually waits between approvers',
    'New buyers take too long to learn the real sourcing motion',
  ],
  whatTheySearchFor: [
    'How to document a procurement process',
    'How to document a purchase order workflow',
    'How to standardize sourcing and vendor onboarding',
    'Procurement process mapping tool',
  ],
  jobsToBeDone: [
    'Capture a current-state baseline of the purchase-to-pay process',
    'Standardize sourcing and PO approval across buyers',
    'Onboard new buyers with documentation they can trust',
    'Find where PO cycle time is actually lost',
  ],
  commonWorkflowsToDocument: [
    'Sourcing and supplier selection',
    'Vendor onboarding and setup',
    'Purchase-order creation and approval routing',
    'Invoice matching and exception handling',
  ],
  dayInTheLife:
    'A procurement manager spends the morning chasing a stalled purchase order that has been sitting in an approver\'s queue for three days, then answers the same how-do-I-raise-a-PO question a written SOP should have covered. The procedures exist somewhere, but they describe an ideal flow nobody follows, and the only record of how approvals really route is tribal knowledge that changes whenever budgets do.',
  howLedgeriumHelps:
    'Record each key procurement workflow once while a buyer runs it normally. Ledgerium turns the recording into an SOP the team can follow, a process map across the ERP, email, and e-signature, and a report that shows where each PO waits. You get a current-state baseline to standardize against and measure improvements from, without a documentation project.',
  faqs: [
    { q: 'How does Ledgerium help procurement managers?', a: 'It records the real purchase-to-pay process and generates an SOP, a process map, and a report on where POs wait between approvers, so you get accurate, current documentation and a baseline to improve against.' },
    { q: 'Can it document a process that spans the ERP and other tools?', a: 'Yes. A single recording captures the steps across each browser-based system in the motion — the ERP, email, and e-signature — so the SOP reflects the full cross-system purchase-order flow.' },
    { q: 'Do I have to interview every buyer to document sourcing?', a: 'No. You record the process once as a buyer performs it, so the SOP and map capture the real steps, including off-catalog and escalation exceptions, without a round of interviews.' },
    { q: 'Will this help onboard new buyers?', a: 'Yes. New buyers follow an SOP generated from real purchasing work rather than an idealized manual, so they learn the real approval routing faster and ask fewer repeat questions.' },
    { q: 'How do I find where to speed up approvals?', a: 'The report separates work time from wait time on each recorded PO and highlights the approvers where cycle time concentrates, so you target the real bottleneck rather than guessing.' },
  ],                                                              // 5 faqs ✓ (3–10)
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-14',
  published: true,
};
```
Depth check: persona `proseSources` pulls `shortAnswer + originalDataPoint +
honestLimitation + keyTakeaways + mechanismIntro + faqs + whoThisIsFor + dayInTheLife
+ howLedgeriumHelps + painPoints + whatTheySearchFor + jobsToBeDone +
commonWorkflowsToDocument` → **well above 400 words.** Distinct subject prose keeps
within-type cosine < 0.5 vs. existing personas.

### 5.4 Filled example — new **software** page

```ts
const hubspot: SoftwarePage = {
  type: 'software',
  slug: 'hubspot',                                                // kebab, unique in software
  vendor: 'HubSpot',
  metaTitle: 'How to Document a Workflow in HubSpot',             // 39 chars ✓, unique
  metaDescription:
    'Document a HubSpot workflow by recording it once. Capture the real clicks across the CRM, sequences, and tickets, and generate an SOP and process map.', // 150 chars ✓, unique
  h1: 'How to document a workflow in HubSpot',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in HubSpot, record someone running the real process — lead follow-up, deal handoff, or ticket resolution — then turn that recording into a step-by-step SOP and a process map. HubSpot portals differ by pipeline and property setup, so a guide written from memory rarely matches what reps actually see. Ledgerium records the real interaction in the browser and generates the SOP, process map, and a workflow intelligence report, so the documentation reflects your portal, not a generic example.', // <100 words ✓
  primaryKeyword: 'HubSpot workflow documentation',
  secondaryKeywords: ['document HubSpot process', 'HubSpot SOP', 'HubSpot deal handoff workflow'],
  searchIntent: 'commercial',
  tags: ['software', 'hubspot', 'crm', 'sales-operations', 'workflow'],
  related: ['workflow:customer-onboarding-workflow', 'software:salesforce', 'compare:tango'], // resolve ✓
  originalDataPoint:
    'HubSpot portals are configured per team, so the same standard deal handoff clicks through different pipelines and properties across companies. Ledgerium documents your actual portal by recording real clicks, rather than describing a generic HubSpot screen that may not exist in your instance.', // unique
  mechanismIntro:
    'HubSpot portals are configured per team so heavily that two reps running the same deal handoff move through different pipelines and properties, and Ledgerium records the real path so the SOP shows your portal rather than a generic screen.', // globally unique
  keyTakeaways: [
    'HubSpot lead follow-up, deal handoff, and ticket resolution each follow a path shaped by your pipeline and property configuration, which a generic guide cannot predict.',
    'Portal-level automation and sequences hide steps reps never see, making the real flow hard to describe from memory.',
    'A guide written against a standard HubSpot layout references stages and properties a customized portal may not have, and trust erodes the first time it is wrong.',
    'Recording the process in your own HubSpot portal captures the actual clicks, stage changes, and cross-system steps in one pass.',
    'Ledgerium generates the SOP, process map, and a report flagging where the HubSpot process slows down from a single recorded run.',
  ],                                                              // 5 items, each <60 words ✓
  honestLimitation:
    'Ledgerium captures the browser-based steps inside HubSpot. Automation that runs server-side, such as workflows and sequences, is not observed directly; document its effect from what the rep sees.',
  documentationFrame: 'How to document a workflow in HubSpot',
  commonWorkflows: [
    'Lead follow-up and routing',
    'Deal stage progression and handoff',
    'Ticket creation and resolution',
    'Quote and approval routing',
  ],
  documentationChallenges: [
    'Portal configuration means generic guides do not match real screens',
    'Processes span HubSpot plus email and other systems',
    'Sequences and workflows automate steps reps never see, making the flow hard to describe',
  ],
  oldWay:
    'An admin or ops lead writes the steps from memory against a generic HubSpot layout. Because every portal is configured differently, the guide references stages and properties that differ from what reps actually see, and trust erodes fast.',
  ledgeriumWay:
    'Record the real process in your HubSpot portal. Ledgerium captures the actual clicks, stage changes, and cross-system steps and generates the SOP, the process map, and a report that highlights where the process slows down.',
  commonMistakes: [
    'Documenting against a generic layout instead of your configured portal',
    'Stopping at the HubSpot boundary when the process continues in email or billing',
    'Omitting the branch logic that varies by pipeline and record type',
  ],
  faqs: [
    { q: 'How do I document a HubSpot process?', a: 'Record a real run of the process in your HubSpot portal, then generate the SOP and process map from the recording. Because it captures your actual screens and clicks, the documentation matches your configured portal rather than a generic example.' },
    { q: 'Why do generic HubSpot guides not match my screens?', a: 'HubSpot portals are configured with different pipelines, stages, and properties. A guide written against a standard layout references things your portal may not have. Recording your real process avoids that mismatch.' },
    { q: 'Can Ledgerium document a process that spans HubSpot and other tools?', a: 'Yes. A single recording captures the steps across HubSpot and the other browser-based systems in the process, such as email and billing, so the SOP reflects the full flow.' },
    { q: 'Does Ledgerium capture HubSpot workflows and sequences?', a: 'It captures what the rep does and sees in the browser. Server-side automation such as workflows and sequences is not observed directly, so document its effect from the user-visible result.' },
  ],                                                              // 4 faqs ✓ (3–10)
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-14',
  published: true,
};
```
Depth check: software `proseSources` pulls `documentationFrame + commonWorkflows +
documentationChallenges + oldWay + ledgeriumWay + commonMistakes` on top of base →
**above 400 words.** Portal-specific prose keeps cosine well under the Salesforce
page (both use the "generic guides don't match your instance" frame, so verify the
warn threshold 0.5 during batch review; distinct vendor nouns keep it under 0.7).

> **Char-length note:** the 30–65 / 120–160 windows are byte-exact gates. A batch
> generator MUST count and (if needed) pad/trim `metaTitle`/`metaDescription` before
> emit. The example lengths are annotated inline; treat them as targets to re-verify,
> not guarantees.

---

## 6. Reusable "add a new page type" checklist (9 seams)

For any future type (`versus`, round-ups, calculators, etc.), touch exactly:
1. `types.ts` — `PageType` value + interface + `SeoPage` union member.
2. `registry.ts` — `ROUTE_PREFIX`, `PARENT_HUB`, import + spread into `ALL_PAGES`.
3. `content/pages/<type>.ts` — the authored array.
4. `components/seo/<Type>PageView.tsx` — reuse shared `Blocks` (keeps Speakable).
5. `lib/seo/metadata.ts` — `OG_TYPE` entry (compile-forced).
6. `lib/seo/validate.ts` — `proseSources()` branch (**depth-floor correctness**).
7. `app/(public)/<prefix>/[slug]/page.tsx` — route (copy an existing one).
8. `lib/seo/sitemap.ts` — `HUB_TYPES` entry.
9. `app/llms.txt/route.ts` — `TYPE_ORDER` entry.

Miss #6 → pages fail the 400-word floor. Miss #5 → build won't compile. Miss #8/#9 →
pages exist but are invisible to sitemap/LLM map. These are the load-bearing seams.

---

## 7. Recommended sequencing (if CEO greenlights build)

1. **Scale existing types first** (personas, software, industries, problems) — zero
   architecture cost, immediate coverage; validate in batches of ~20.
2. **Add validator guardrails** (cross-type near-dup; `shortAnswer` uniqueness;
   `originalDataPoint` uniqueness warn; controlled tag allow-list) **before** large
   batches land — cheapest point to add them.
3. **Ship the `versus` type** (§2) as one bounded iteration.
4. **Build the document-workflow `problem` cluster** (§3) with curated cross-links.
5. **Sitemap index** only when approaching ~40k URLs.
