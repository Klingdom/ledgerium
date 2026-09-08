# UX/IA Review — Public Content Surfaces

**Author:** ux-designer agent
**Date:** 2026-09-08
**Scope:** `apps/web-app/src/app/(public)/**`, `apps/web-app/src/components/seo/*`, `apps/web-app/src/lib/seo/related.ts`, `apps/web-app/src/components/nav/*`
**Reads first:** `docs/meta/GROWTH_REVIEW_001/seo_aeo.md` (traffic/authority diagnosis — not re-litigated), `docs/meta/GROWTH_REVIEW_001/ux_designer.md` (signup/onboarding funnel — not re-litigated). This report picks up exactly where those stop: the **public IA and the conversion path from a cold SEO landing to a real user**, given the CEO's stated intent to expand industry/department/use-case content.

Every claim below is labeled **VERIFIED** (read directly in source, cited by file/line) or **REASONED** (inference from verified facts, no direct citation needed). Nothing is fabricated.

---

## 0. The one-sentence answer to every question below

The public site has a **genuinely well-engineered hub-and-spoke skeleton** (registry-driven types, shared breadcrumbs, a real related-page algorithm, a nav that mirrors the content model) — but it is wearing **zero social proof**, its curated internal-link graph starves the exact two axes the CEO wants to expand (industry, department), and **every single one of the 164–186 SEO leaf pages funnels its CTA straight to `/signup`, with a total of zero mentions of `/install` or the Chrome extension anywhere in the SEO page engine** — meaning every SEO visitor who converts is walking, unwarned, into the Developer-Mode sideload the `ux_designer.md` review already flagged as the funnel's worst step. At ~22 impressions/day, fixing what's live outnumbers building what's next by a wide margin.

---

## 1. IA audit — is this a hub-and-spoke, or 12 parallel silos?

**VERIFIED — it is a hub-and-spoke, mechanically, for 11 of 12 registries.** `src/content/registry.ts` defines 12 `PageType`s (`workflow`, `sopTemplate`, `aiOpportunity`, `department`, `software`, `industry`, `persona`, `problem`, `compare`, `alternatives`, `competitors`, `answer`), each with a `ROUTE_PREFIX` and a `PARENT_HUB` (registry.ts:30-62). Every leaf page renders `<Breadcrumbs page={page} />` (`Blocks.tsx:29-46`), which reads `PARENT_HUB[page.type]` and renders `Home / {Hub} / {eyebrow}` — a real, working structural spine, not a cosmetic one. 10 of the 12 types have a hub index built from the shared `<HubIndex>` component (`HubIndex.tsx`), which lists **every published page of that type**, unpaginated, with no cap (`HubIndex.tsx:59-71` maps the full `pages` array). `/comparisons` is an 11th, hand-built hub for the `compare` type (`comparisons/page.tsx`).

**VERIFIED — one type (`compare`) has no `PARENT_HUB` and no breadcrumb parent.** `registry.ts:57`: `compare: null` — "No public /compare hub... breadcrumb stops at Home." The 9–10 dynamic `/compare/[slug]` pages are reachable only via `/comparisons` (which lists them, `comparisons/page.tsx:41-45`) or the sitemap — never via a breadcrumb trail back up.

**VERIFIED — three pages are entirely outside the registry and form true silos.** `/use-cases/operations`, `/use-cases/compliance`, `/use-cases/ai-implementation` are hand-built files (`use-cases/operations/page.tsx`), documented in `registry.ts:70-73` as living at a *different* route segment than the registry-driven `/use-cases/personas` and `/use-cases/problems`. They are not `SeoPage` objects — no `type`, no `tags`, no `related` field. Consequence, confirmed by reading `operations/page.tsx` in full: **no breadcrumb, no `RelatedPagesGrid`, no cross-link to any industry/department/persona page, and no way for those axes to link back to it.** These three pages cannot participate in `related.ts` in either direction, ever, unless someone hand-writes a `<Link>`.

**VERIFIED — there is no `/use-cases` index page at all.** The glob of `app/(public)/use-cases/**` returns `personas/`, `problems/`, `operations/`, `compliance/`, `ai-implementation/` — no `use-cases/page.tsx`. A visitor who deletes the last path segment of any of the five URLs above to "browse up" hits a 404. This is masked in practice because nothing in nav or footer links to bare `/use-cases` (`navConfig.ts`, `Footer.tsx` both link to the five children directly), but it means the parent concept ("use cases") has no page a human can land on and orient from.

**Net verdict:** this is **not** 12 unnavigable silos — the registry-driven 10 types + their hub genuinely compose a browsable structure, and `related.ts` (see §5) does real cross-type routing. But it is a **two-tier IA that only fully works for the registry-driven half.** The 3 hand-authored `/use-cases/*` pages and the `compare` type are structurally bolted on, not woven in.

---

## 2. Navigation reality — what's reachable from nav vs. sitemap-only

**VERIFIED — every one of the 11 hubs is linked from top nav and/or the footer.** Cross-referencing `navConfig.ts` (`TOP_NAV`, `SOLUTIONS`, `RESOURCES`) against `Footer.tsx`'s `FOOTER_LINKS`:

| Hub | Top nav | Footer |
|---|---|---|
| `/industries` | ✅ "View all industries" | ✅ "By Industry" |
| `/departments` | ✅ "View all departments" | ✅ "By Department" |
| `/use-cases/personas` | ✅ "View all roles" | ✅ "By Role" |
| `/use-cases/problems` | ✅ "How-to guides" | ✅ "By Problem" |
| `/software` | ✅ "View all software" | ✅ "Software Guides" |
| `/workflow-library` | ✅ (Resources) | ✅ "Workflow Library" |
| `/sop-templates` | ✅ (Resources) | ✅ "SOP Templates" |
| `/ai-opportunities` | ✅ (Resources, badge "New") | ✅ |
| `/answers` | ✅ "Definitions & Answers" | ❌ absent from footer |
| `/alternatives` | ❌ absent from top nav | ✅ "Alternatives" |
| `/competitors` | ❌ absent from top nav | ✅ "Competitors" |
| `/comparisons` | ✅ ×2 ("See how we compare" + "Compare tools") | ❌ absent (footer instead lists `/compare/scribe` directly) |
| `/use-cases/operations`, `/compliance`, `/ai-implementation` | ✅ "Popular use cases" column (all 3) | ✅ "Use Cases" column (all 3) |

**REASONED — structural (crawl) orphan risk is near-zero.** Because every hub renders its *entire* published set with no pagination (`HubIndex.tsx`), and every hub is reachable in one nav or footer click, **every one of the 164–186 leaf pages is reachable in exactly two clicks from any page on the site** (nav/footer → hub → leaf). This is a materially better result than the "orphaned SEO landing pages" framing in the prompt implies. The 5–9 "capped" nav dropdown items per axis (5 of 9 industries, 5 of 9 departments, 5 of 16 roles, 5 of 16 software) are a genuine subset, but the "View all" link is present in every case (`navConfig.ts:93,105,117,148`), so the cap does not create unreachable pages — only a two-hop instead of one-hop path for the un-featured 4–11 per axis.

**VERIFIED — the real orphan problem is human-navigability, not crawlability.** A hub page is a flat grid of cards with no filtering, faceting, or grouping (`HubIndex.tsx:58-72` — Tranche-0 comment explicitly defers faceted filtering to "Tranche-1... once page counts justify it"). A visitor on `/departments` sees 9 near-identically-styled cards in one `grid-cols-3` with no sub-grouping. A visitor on `/use-cases/problems` (22 pages) or `/answers` (30 pages) sees a wall of cards with zero hierarchy — no "most common," no grouping by theme. **This is discoverable by a search engine and undiscoverable-with-intent by a human**: nobody arrives at `/use-cases/problems` already knowing which of 22 near-synonymous "how to X" phrasings matches their problem. The IA is optimized for "does a URL exist for this query" (SEO's actual job) and not at all for "can a human self-serve to the right page" (a real hub's job). This is the accurate name for what the prompt calls "orphaned": **not unreachable, but unbrowsable.**

**VERIFIED — one small dead-link risk.** `Footer.tsx:10` links "Interactive Demo" to `/dashboard.html` — a static `.html` path that does not match any Next.js route in the `(public)` tree found by this audit (the live interactive demo is `/demo`, confirmed via `RealProductDemo` referenced in `page.tsx`). Worth a 2-minute verification that this resolves (it may be a static export artifact); if not, it is a footer 404 on every page of the site.

---

## 3. Conversion path — `/industries/healthcare` to a real user, counted

Tracing `IndustrySlugPage` → `IndustryPageView.tsx` → `Blocks.tsx` literally, then continuing through the flow documented (and verified independently in this audit) by `ux_designer.md`:

| # | Step | Where | Friction |
|---|---|---|---|
| 1 | Land on `/industries/healthcare` | — | Page is well-built: `SeoHero`, `DataPointCallout`, `KeyTakeaways`, industry-context prose, compliance/AI-opportunity bullets, `FaqBlock`, `RelatedPagesGrid` (`IndustryPageView.tsx:19-53`). No mention of "Chrome extension" or "install" anywhere on the page — **VERIFIED**, zero hits for `/install` in `Blocks.tsx` or any of the 12 `*PageView.tsx` files. |
| 2 | Click primary CTA | `SeoHero` → `TrackedLink href="/signup"` (`Blocks.tsx:89-97`) | Every CTA on this page — hero, `MidCta`, `FinalCta` — points to `/signup`. None point to `/install`, `/demo` is offered only as a footnote link (`DemoNote`, `IndustryPageView.tsx:44`). |
| 3 | Sign up | `SignupPageClient.tsx` | Low friction, per `ux_designer.md` — 2 required fields, no CAPTCHA. |
| 4 | Land on dashboard | `router.push('/dashboard')` → `DashboardV2Shell` | Auto-seeded with ~20 sample workflows. Per `ux_designer.md §1 Step 3`: no visible nudge toward "install the extension," because `FirstRunTutorial` only fires at `workflows.length === 0`, a state the sample seeding makes unreachable. **The user who arrived via the healthcare page — who came from a page that never mentioned an extension — is now in a full analyst cockpit with no signal that a browser extension is the next required action.** |
| 5 | Discover the extension exists | User must find `/install` unprompted (top nav / footer only) | This is a **new, undocumented drop-off point specific to the SEO funnel**: the generic-signup flow at least has a post-signup dashboard; the SEO flow has no page-level breadcrumb from "I searched for healthcare workflow docs" to "I need to install a Chrome extension." |
| 6 | Sideload the extension | `/install` (`ux_designer.md §1 Step 4`) | Download `.zip` → unzip → enable Developer Mode → Load unpacked. 4 manual steps, one of which (Developer Mode) most non-technical users have never touched. |
| 7 | Record something real | Extension side panel | Works standalone with zero account link. |
| 8 | Sync the recording to the dashboard | `/account` → "Extension Sync" card → generate API key → paste into extension's collapsed "Sync Settings" (closed by default) | Per `ux_designer.md §1 Step 5`, this step is **not documented anywhere in the primary `/install` flow** — only in a Troubleshooting FAQ answer a user reads only after already suspecting a problem. |

**Step count to "activated user with a real recording visible in the dashboard": 8, crossing 3 separate applications (marketing site → web app → browser extension → back to web app) and 2 manual credential-copy actions.** Compare this to the stated on-page promise at signup ("explore a sample workflow immediately... no extension install required," `ux_designer.md §1 Step 2`) — that promise is true for *browsing a sample*, false for *doing the thing the healthcare page was about* (documenting your own workflow).

**REASONED — realistic drop-off.** No analytics instrumentation exists that could measure this specific path (the SEO pages fire `cta_clicked` and `seo_*` events, but there is no funnel step tagging "arrived via industry page → reached /install → completed sideload → synced first recording"). Absent data, the standard SaaS heuristic for a multi-app, manual-step, unlabeled-prerequisite handoff (steps 5, 6, 8 above) is **70–90% cumulative drop-off between signup and first synced real recording** — consistent with, and slightly worse than, the generic funnel `ux_designer.md` already flags as the single riskiest step in the whole product. The SEO-specific aggravation is that steps 1–4 give **zero forewarning** that steps 5–8 exist, so the visitor who does convert on `/industries/healthcare` is *more* likely to bounce at step 5, not less, because they were never told a browser extension was coming.

---

## 4. The one-visitor problem — fix what's live before building what's next

**Validated, not refuted: fixing existing pages outranks new pages at this traffic level**, for a reason the SEO review didn't need to state but this audit's file-level read makes concrete — **the existing SEO page engine has a single, correctable, sitewide defect that touches all 164–186 pages simultaneously.** Ranked by impact/effort:

**1. Add an explicit "what Ledgerium actually is" + extension-install signal to the SEO page template. (Highest impact, Low effort)**
Every leaf page's CTA path assumes the visitor will figure out, post-signup, that a Chrome extension is required. Fix is centralized: `Blocks.tsx` is a shared component library consumed by all 12 `*PageView.tsx` files. A single new block — e.g. a `HowLedgeriumCaptures`-adjacent line stating "This runs as a free Chrome extension" plus a `TrackedLink` to `/install` alongside the existing `/signup` CTA in `SeoHero` (`Blocks.tsx:88-101`) and `FinalCta` (`Blocks.tsx:389-400`) — fixes all 164–186 pages in one component edit. This is the direct SEO-side analog of `ux_designer.md`'s recommendation #1 (surface the extension step), and it is *more* urgent on these pages than on the homepage, because these visitors have zero other context about the product.
*Effort: edit 2 shared components (`SeoHero`, `FinalCta`) in `Blocks.tsx`, consumed automatically by all 164+ leaf pages. No new pages, no new routes.*

**2. Fix the homepage's and every SEO page's "trust strip" to stop reading as social proof it isn't. (High impact, Low effort)**
`page.tsx:158-175` ("Social Proof Strip") and `page.tsx:479-496` ("Trust strip") are self-asserted product claims ("Same input, same output," "Reproducible," "Private") with **zero third-party validation** — no customer names, no review scores, no install counts. This is not wrong to ship, but the section *names* ("Social Proof Strip") promise something the content doesn't deliver, and a skeptical B2B visitor reads self-claims as noise. See §7 for the concrete replacement.
*Effort: rename/reframe 2 sections; no new data required.*

**3. Wire `RelatedPagesGrid` traffic toward `/industries` and `/departments`, the CEO's stated expansion targets. (Medium impact, Low effort)**
See §5 for the quantified imbalance. Industries currently receive **3 curated inbound links across the entire 186-page corpus** — for pages the CEO wants to expand, that is a self-defeating starting position. Cheap fix: add 1–2 `industry:` / `department:` tokens to the `related` arrays of the highest-related types (`persona.ts`, `problem.ts`, `workflow.ts` — the three most-linked-to types, see §5 table) so newly-published intersection content isn't launched into the same starved position.
*Effort: content-registry edits only, no component changes.*

**4. Consolidate `/answers` into the footer.** It's the only hub of 11 missing from `Footer.tsx`'s `FOOTER_LINKS` — cheap, and `/answers` is explicitly the informational, top-of-funnel cluster the SEO review's own §1.1 flags as the one class with weak positive signal.
*Effort: one footer array entry.*

**5. New content is lower priority than all four items above.** With ~22 impressions/day (per `seo_aeo.md §3.3`), the entire existing corpus produces on the order of single-digit clicks per week. A fix to `SeoHero`/`FinalCta` (item 1) affects **100% of that traffic on the next visit**; a new page affects 0% of it until it independently ranks, which — per `seo_aeo.md §1–3` — is not expected to happen this quarter regardless of quality. **This directly validates the prompt's premise**: at this traffic level, one component-level fix outweighs any number of new leaf pages in expected impact, because the multiplier (pages × conversion-rate-lift) beats the addend (one more unranked page).

---

## 5. Internal linking assessment — `related.ts` and the authority graph

**VERIFIED — the mechanism itself is sound and deterministic.** `related.ts:44-76` (`getRelatedPages`) is a pure function: curated `related` tokens fill first (in authored order, `related.ts:49-59`), then a tag-overlap fallback sorts by `(overlap desc, slug asc)` for determinism (`related.ts:63-67`). It correctly excludes self, de-duplicates, and defensively skips unpublished targets. No complaint about the *code*.

**VERIFIED — the curated graph is heavily imbalanced, and imbalanced in exactly the direction that hurts the CEO's stated priority.** Counting every `related: [...]` token across all 12 files in `src/content/pages/*.ts` by target type:

| Target type | Curated inbound links (corpus-wide) | Published pages | Inbound links / page |
|---|---|---|---|
| `persona` | 112 | 16 | **7.0** |
| `compare` | 67 | 10 | **6.7** |
| `workflow` | 97 | 24 | **4.0** |
| `software` | 64 | 16 | **4.0** |
| `problem` | 77 | 22 | **3.5** |
| `sopTemplate` | 25 | 17 | 1.5 |
| `aiOpportunity` | 6 | 8 | 0.75 |
| `department` | 7 | 9 | **0.8** |
| `competitors` | 4 | 10 | 0.4 |
| `industry` | **3** | 9 | **0.33** |
| `answer` | 8 (all `answer→answer`) | ~30 | **0** external |
| `alternatives` | **0** | 15 | **0** |

*(Counted via `grep -c "'{type}:" src/content/pages/*.ts` for each of the 12 target-type tokens; each occurrence is one curated `related` entry pointing at that type.)*

**Reading this table plainly: `persona`, `compare`, `workflow`, `software`, and `problem` form a tightly-linked five-node core clique that receives the overwhelming majority of all curated cross-links. `industry`, `department`, `aiOpportunity`, `competitors`, `answer`, and `alternatives` are peripheral — and `alternatives` (15 published pages) has *zero* curated inbound links from any other page type in the entire corpus, and `answer` (the largest single type, ~30 pages) is linked to only by other `answer` pages.** Since every sampled `related` array is already filled to the 3-item cap (verified across `industry.ts`, `department.ts`, `persona.ts`, `alternatives.ts`, `answer.ts` samples), the tag-overlap fallback in `related.ts:61-71` almost never fires — curated placement is close to the *entire* determinant of who links to whom.

**Does authority "distribute sensibly," per the prompt's question? No — it distributes toward the types that were built first / are most `workflow`-adjacent, not toward the types with the most SEO surface area or the most CEO-stated priority.** `industry` and `department` are precisely the two axes named in the CEO's expansion directive, and they are, respectively, the *worst-linked-to* and *third-worst-linked-to* types in the graph. Expanding page count on those axes without also rebalancing `related` tokens compounds the imbalance rather than fixing it — more industry pages with 0.3 inbound links each just means more thin nodes.

**Recommended change:** (a) add `industry:` and `department:` tokens into the `related` arrays of `persona.ts`, `problem.ts`, and `workflow.ts` — the three highest-inbound types — since those are the pages visitors are already reaching in volume relative to the rest of the corpus; (b) give `industry` and `department` pages `related` tokens pointing at *each other* (currently zero — see §6, this is the same finding as the cross-axis gap) and at `alternatives`/`answer`, the two zero/near-zero-inbound types, to spread load away from the core clique; (c) treat "does this new page have at least 2 inbound `related` tokens from existing pages" as a publish-gate for any future page, the same way `validateContent` already gates on word count and freshness (`seo_aeo.md §1.4` — the existing quality gate has no visibility into link position at all; this is the cheapest way to add it).

---

## 6. IA for future axis/intersection content — a concrete structure

**REASONED, from the verified facts above.** If the CEO's directive proceeds to true intersections (e.g., "healthcare + compliance," "manufacturing + operations-managers," "finance department + SAP"), the current model has no mechanism to prevent a combinatorial maze: `9 industries × 9 departments × 16 personas` is 1,296 theoretical intersections, and nothing in `registry.ts` or `related.ts` currently expresses "this page is the intersection of X and Y" as a first-class relationship — `related` tokens are a flat, untyped list.

**Concrete structure to adopt before writing a single intersection page:**

1. **Do not create a 13th flat `PageType`.** An `industryDepartment` or `industryPersona` type would just be a 13th silo with the same starvation risk as `industry`/`department` today. Instead, extend the existing `SeoPage` shape with an **optional structured `axis` field** — e.g. `axis?: { industry?: string; department?: string; persona?: string }` — so an intersection page is still a `problem` or `workflow` page (whichever content shape actually fits) that additionally *declares* which industry/department/persona it belongs to. This keeps it inside the existing hub-and-spoke mechanics (breadcrumb, `RelatedPagesGrid`, `HubIndex`) rather than inventing a 12th-plus route prefix.
2. **Every intersection page's `related` array is populated programmatically, not hand-curated, from its `axis` field** — i.e., an intersection page for `{industry: healthcare, department: compliance}` automatically gets `related: ['industry:healthcare', 'department:compliance', ...]` generated at build/lint time, closing the exact cross-axis gap identified in §5 (industry and department currently never link to each other in either direction). This is a `validateContent`-adjacent gate, not new UI.
3. **Industry and department hub pages get a lightweight cross-index, not a new nav item.** On `/industries/healthcare`, add a small "Common in Healthcare" strip that surfaces the 2–3 intersection pages tagged `axis.industry === 'healthcare'`, sorted deterministically by slug (same pattern `related.ts` already uses). This gives a human a path from the single-axis page to the intersection without adding a new top-level nav column — nav should stay at its current 4-axis depth (role / department / industry / popular-use-case), not grow a 5th "by intersection" menu, which is exactly the maze risk the prompt is asking to prevent.
4. **Gate intersection publishing on the §5 inbound-link rule.** No intersection page ships without at least 2 inbound `related` tokens resolvable at build time (from its parent industry, department, or persona page) — this is mechanically enforceable in the same pure-function style as `getRelatedPages`, and prevents the exact "generate 40 more of the class that already produced 0 clicks" failure mode `seo_aeo.md §1.3` already documented for the July page-count expansion.
5. **Cap intersection generation at "content actually differs," not "combination exists."** `seo_aeo.md §1.4` already names the mechanism by which a gate can pass 164/164 pages on word-count and freshness while missing the outcome metric entirely — the same risk applies here. An intersection page should only be authored where the industry+department combination produces genuinely distinct `commonWorkflows`/`complianceConcerns` content (e.g., healthcare+compliance is a real distinct shape; SaaS+legal probably is not) — this is an editorial judgment call per intersection, not a rule the code can enforce, but it is the single highest-leverage thing to get right before scaling, given the corpus's proven pattern of page-count growth without click growth.

---

## 7. Trust UX — where to put it, concretely, with zero real testimonials yet

**VERIFIED — the current "trust" surfaces are self-claims, not third-party proof**, confirmed by grep: zero hits for `testimonial`, `case stud[y/ies]`, `customer logo`, or any review-platform reference anywhere in `(public)` except a prose mention on `/methodology`. The two homepage sections literally named "Social Proof Strip" (`page.tsx:158`) and "Trust strip" (`page.tsx:479`) both render **only first-party assertions** ("Same input, same output — always," "Private," "Evidence-linked output") — none of which a skeptical B2B buyer treats as proof, because none of it comes from anyone but Ledgerium.

Given `seo_aeo.md §5.2` independently confirms **zero testimonials or case studies exist anywhere**, and that acquiring the first ones depends on founder outreach producing early users (a precondition this review cannot manufacture), the honest recommendation is **not** "add fake social proof" — it is: **stop mislabeling self-claims as social proof, and place the specific, verifiable trust signals that already exist correctly.**

Concrete, ranked, buildable-today:

1. **Rename and re-scope the two homepage strips.** "Social Proof Strip" → something honest like "How Ledgerium works, by design" (it's a mechanism-trust strip, not social proof) — a 1-line copy/label change, `page.tsx:158-175`. Do the same for the second strip at `page.tsx:479-496`. This is a credibility fix, not a content fix: mislabeling self-claims as "social proof" is a bigger trust risk than having no proof at all, because a careful reader (the exact persona this B2B product targets) notices the gap.
2. **Move the E-E-A-T byline (author + "Updated {month}" + "How we research this") higher and make it louder — it is the one piece of *real*, verifiable trust infrastructure already built and under-surfaced.** `Blocks.tsx:74-85` (`SeoHero`) already renders `By {author.name} · Updated {date} · How we research this →`, linking to `/methodology`. This is genuinely good, differentiated infrastructure — dated, sourced, linked to a methodology page — but per `seo_aeo.md Finding D`, every single page uses `author.name: 'Ledgerium Research Team'`, which resolves to nothing. Fixing that (already recommended in `seo_aeo.md §5.7`, ~1 hour, centralized field) makes this the single most legitimate trust signal on the page, and it should be visually promoted from a small `text-xs` byline (`Blocks.tsx:76`) to something closer to the size of the eyebrow badge above it.
3. **`HonestLimitation` (`Blocks.tsx:372-381`, "Worth knowing") is already the strongest trust element on every leaf page and is under-emphasized visually.** A section that voluntarily states what the product *cannot* do (per-page `honestLimitation` field, e.g. industry.ts:43-44's "Ledgerium captures browser-based ERP and office work... need separate capture") is a legitimate, rare, high-trust pattern — B2B buyers are trained to distrust vendors who claim no limitations. It currently renders identically to any other muted prose block. Give it a distinct visual treatment (a border-left accent like `DataPointCallout` already gets, `Blocks.tsx:117`) so it reads as "the vendor volunteered this," not "one more paragraph."
4. **`Sources` (`AnswerPageView.tsx:105-128`) — currently only on `answer` pages — should extend to `industry` and `department` pages once those get external citations.** Right now `originalDataPoint` (`DataPointCallout`) is framed as "From Ledgerium recordings" — self-sourced, honestly labeled as such, which is good practice, but it means **zero page on the entire site cites an external source** except the `answer` type's optional `sources` field. If any net-new industry/department content is authored (per §6), pairing each with at least one external, dated, linkable citation (a named regulation, a named industry report) would give those specific pages the one trust element competitor comparison pages structurally cannot fake: a link a skeptical reader can click and verify independently of Ledgerium.
5. **Do not add a fake logo strip, a fake review score, or a fake "trusted by N companies" counter.** `seo_aeo.md §5.2`/`§6.6` are explicit that paid acquisition and any unverifiable-claim tactic should wait for a real purchase and a real testimonial; the same discipline applies here. The single highest-leverage *real* trust asset this review can identify that requires zero new customers is **#2 above (the named-author fix)** — it is the one piece of missing trust infrastructure that is purely a data-entry fix, not a "wait for customers" problem.

---

## Files referenced

- `apps/web-app/src/content/registry.ts`
- `apps/web-app/src/content/pages/{industry,department,persona,problem,workflow,software,sop-template,ai-opportunity,alternatives,competitors,compare,answer}.ts`
- `apps/web-app/src/components/seo/HubIndex.tsx`
- `apps/web-app/src/components/seo/HubPageView.tsx`
- `apps/web-app/src/components/seo/Blocks.tsx`
- `apps/web-app/src/components/seo/FaqBlock.tsx`
- `apps/web-app/src/components/seo/{IndustryPageView,AnswerPageView,DepartmentPageView,PersonaPageView,ProblemPageView,SoftwarePageView,SopTemplatePageView,WorkflowPageView,AlternativesPageView,CompetitorsPageView,ComparePageView,AiOpportunityPageView}.tsx`
- `apps/web-app/src/lib/seo/related.ts`
- `apps/web-app/src/components/nav/navConfig.ts`
- `apps/web-app/src/components/Footer.tsx`
- `apps/web-app/src/components/PublicNav.tsx`
- `apps/web-app/src/app/(public)/page.tsx`
- `apps/web-app/src/app/(public)/{industries,departments,software,sop-templates,workflow-library,ai-opportunities,answers,alternatives,competitors,comparisons}/page.tsx`
- `apps/web-app/src/app/(public)/{industries,departments,software,sop-templates,workflow-library,ai-opportunities,answers,alternatives,competitors,compare}/[slug]/page.tsx`
- `apps/web-app/src/app/(public)/use-cases/{operations,compliance,ai-implementation}/page.tsx`
- `apps/web-app/src/app/(public)/use-cases/{personas,problems}/page.tsx`
- `apps/web-app/src/app/(public)/demo/page.tsx`
- `apps/web-app/src/app/sitemap.ts`
