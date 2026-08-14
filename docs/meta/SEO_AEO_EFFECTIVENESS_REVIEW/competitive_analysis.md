# SEO/AEO Effectiveness Review — Competitive & AI-Visibility Analysis

**Date:** 2026-08-13
**Type:** Mode 3-adjacent read-only review (NON-counting; zero code changed)
**Track owner:** `competitive-researcher`

**Epistemic note:** External findings come from search-mediated industry/agency sources, not peer-reviewed data. Individual precision figures are industry-reported estimates. Confidence is higher where independent sources converge (they do, repeatedly). The agent could not query live ChatGPT/Claude/Perplexity/Google AI Mode interfaces — §4 is an indirect proxy (site-search, third-party listicle presence, entity-collision check, direct fetch), not a literal "ask five chatbots" test. That check should be re-run by someone with access to those interfaces.

---

## Executive verdict

"Many narrow doors" is not wrong, but it is currently the **only** lever being pulled, and 2026 evidence says it is the **minority** lever for AI-era discovery. Content-quality execution is genuinely good — better differentiated and more honest than most entrenched competitors. Three converging facts materially weaken the strategy as scoped:

1. **90–95% of AI citations come from third-party/external domains, not the brand's own site.** The entire plan is first-party, on-domain, with **zero backlink/PR/earned-mention motion** anywhere in the SEO/AEO document series.
2. **Brand collision (previously unflagged).** "Ledgerium" is an established 2018-era Ethereum ICO / blockchain-accounting brand (token LGUM) with an existing entity footprint on Etherscan, CoinCarp, Crunchbase, ICOholder, BitcoinTalk. This undermines the entity-authority `Organization`/`sameAs` E-E-A-T plan, which assumes a clean slate.
3. **Zero-click/AI-Overview dominance shrinks the addressable surface** regardless of ranking: ~82% of B2B tech queries trigger AI Overviews; blue-link CTR drops to ~8% when one is present.

Ledgerium AI is **currently invisible** in the third-party comparison layer that both traditional SEO and answer engines lean on most. This is consistent with — and explains — the internal GSC finding already surfaced in `SEO_AEO_EXPANSION_001.md` (2026-07-14): impressions exist, clicks ~0. Pages are crawled but parked on page 2. **That is a domain-authority/trust problem, not a content-quality problem.**

**Recommendation:** keep the deterministic/evidence-linked positioning (real, defensible, unclaimed by competitors). Do **not** scale toward 5,625 pages on the current single-channel trajectory. Add an earned-media/backlink motion as a first-class budgeted workstream. Treat brand collision as an active risk requiring disambiguation, not routine schema hygiene.

---

## 1. AEO / LLM-visibility state of play (2026)

- **Citation behavior is platform-fragmented.** One study of 34,234 AI responses: ChatGPT cited brands in 0.59% of responses vs Perplexity 13.05% (~46× gap). Of 680M citations, only **11% of domains are cited by both** — largely non-overlapping citation logic.
- **ChatGPT favors high-authority generalist sources** (Wikipedia ~7.8% of citations, LinkedIn, editorial press, review platforms) over niche vendor domains, and often answers without citing. **Perplexity** crawls near-real-time, weights freshness, averages 8.79 citations/response, and 86% of brand mentions land in list position ≤5 — structurally a "best-of-listicle" engine.
- **Google AI Overviews** cite from position 4–20 based on passage quality/trust, not just rank (theoretically good for page-2 content); 88% cite ≥3 sources. Semantic completeness reported as top single factor.
- **FAQPage/HowTo rich results are dead in Google SERP** (HowTo removed Sept 2023; FAQPage May 7 2026; GSC reporting removed June 2026) but remain valid Schema.org vocabulary that Bingbot, PerplexityBot and RAG/voice crawlers still parse. **The repo's own finding on this is accurate and current** — `SEO_AEO_SUPERPROMPT_V2.md` Hard Constraint #6 is not out of date.
- **Original/proprietary data is the strongest single citation lever.** Independently corroborated (adding statistics boosted visibility ~41%; structured data earns ~42% more citations). Directionally consistent with the repo's cited 38–65% vs 6–15% figures, though those exact numbers could not be verified against a primary source.
- **The most important and least addressed finding:** 90–95% of AI citations come from external/third-party sources; brands are ~6.5× more likely to be cited via third-party mentions than their own site. Top drivers are domain authority, DA60+ backlinks, and presence in "best of" listicles — **not first-party page count**.
- A new domain with no backlinks is explicitly described as "an unknown quantity to AI systems" — a cold-start problem with no shortcut other than earned mentions.
- **Adoption context:** 51% of B2B software buyers now begin vendor research in an AI chatbot (up from 29% in April 2025). The AEO premise is correct and arguably underweighted by the plan's Google-SERP-centric measurement.

**Verdict on the JSON-LD bet:** still directionally load-bearing (free, low-risk, correctly scoped as "signal not rich-result"), but **necessary, not sufficient**. The `llms.txt` implementation (`apps/web-app/src/app/llms.txt/route.ts`) is a good current-convention move — but a machine-readable sitemap only helps once a crawler has a reason to visit, which returns to the authority gap.

---

## 2. Programmatic SEO viability in 2026

**Google materially tightened enforcement.** The March 2026 core update explicitly named **scaled content abuse**; sites generating thousands of near-identical templated/AI pages without added value saw **60–90% ranking losses**. Named patterns: mass AI generation without editorial review; pure template-with-variable-substitution at scale; aggregator pages adding no context.

**What separates survivors:** pages built on unique, structured, real data continue to rank; pure variable-substitution pages die regardless of production method. 2026 B2B SaaS playbooks sequence explicitly: **build topical authority first, then deploy programmatic pages once the domain is trusted** — programmatic expansion is a *harvest* motion on a trusted domain, not a *bootstrap* motion for a new one.

**Assessment of Ledgerium's position:**

- Direct read of `compare.ts` (10 pages) and `alternatives.ts` shows genuinely differentiated content — not name-swap templating. Each carries a distinct `originalDataPoint` tied to a real mechanism, a conceded `competitorStrength` (e.g. honestly stating Celonis is "far stronger for enterprise-scale analysis"), dated `verifiedAsOf`, and materially different argumentative structure per competitor. **Above the bar separating survivors from casualties.**
- The build-time gate (near-duplicate cosine, required `originalDataPoint`/`honestLimitation`, word-count floors, `noindex` for data-gap pages, health-gated tranches) matches the specific guardrails 2026 sources recommend. Well-designed defensive layer.
- **However** the gate is a *quality* filter, not an *authority* filter. Passing it makes a page not-spam; it does not make a page found.
- **The 164 → 5,625 jump is the highest-risk element**, not because individual pages fail the gate, but because (a) abuse detection weights *pattern and velocity* at the site level — going from 164 to thousands in a compressed window resembles the abuse pattern even if no single page is thin; (b) the repo already self-corrected the worst version (cutting 2,000+ standalone FAQ URLs to ~300–500 + clustered hubs — a genuinely good catch); (c) but there is **no brake tied to earned-authority growth** — the ramp gates on `% indexed` and `zero-impression count`, not on referring domains or third-party mentions, so the plan can pass its own gates while remaining externally invisible. Which is exactly the state found in §4.

---

## 3. Competitor posture

**Scribe** — $75M Series C, Nov 10 2025, $1.3B valuation; 6M+ users; 94% of Fortune 500 use it, 45% paying (~80,000 enterprise customers). "Scribe Optimize" (late 2025, expanded 2026) does AI workflow mapping and automation-opportunity scoring — **direct positioning collision** with Ledgerium's AI-opportunity pitch, backed by a dataset advantage Ledgerium cannot match at current scale. Scribe publishes competitor-comparison content on its own domain (`scribe.com/library/...`) — fighting the same battle with 1,000×+ brand equity.

**Tango** — actively winning the exact query space. Publishes its own "Scribe Alternatives" / "Guidde Alternatives" content, and appears prominently in independent third-party roundups (Waybook, Glitter AI, TheDigitalProjectManager, trycapture.ai, Guidejar).

**Guidde, Whale, Trainual, Process Street, Loom, Notion, Waybook, SweetProcess, Document360** — all appear repeatedly across independent third-party "best-of" roundups for the target queries. **This is the layer driving 90%+ of AI citations, and it has already settled around the incumbent set.**

**Celonis / UiPath / SAP Signavio** — enterprise-tier. Celonis named Leader for the 7th consecutive year in the 2026 Everest Group PEAK Matrix; process mining ~$0.85B in 2026, growing >18%/yr. The risk with `compare/celonis`, `compare/uipath`, `compare/sap-signavio` (all well-written and intellectually honest) is not quality but **query volume** — almost nobody searches "Ledgerium vs Celonis." These are better treated as **AEO answer assets, not SEO traffic assets**, and measured differently.

**Genuine whitespace confirmed:** across every competitor and adjacent browser-capture tool surfaced (Capture Flow, iGenFlow, IT Glue Smart SOP Generator, Flowster Capture, GembaDocs, Scribe's extension), **none lead with "no screenshots, structured interaction data, deterministic/reproducible output"** — nearly all capture screenshots as the core mechanism. Ledgerium's differentiator is real whitespace on the product-mechanism dimension. **The problem is that it is not yet a dimension anyone searches on** — it must be taught via comparison framing, which requires the searcher (or the LLM retrieval pipeline) to already be on the page.

---

## 4. AI-citation check — is Ledgerium actually surfaced?

Proxy checks (live chat interfaces not accessible to the agent):

- **`site:ledgerium.ai` returned zero indexed results** in web search (2026-08-13). Strong negative signal, but the tool is not a guaranteed 1:1 proxy for Google's `site:` operator — **a GSC pull is the authoritative check.** *(Coordinator note: this appears to conflict with the 2026-07-14 GSC reading showing real impressions; treat the GSC data as authoritative and this proxy as unreliable.)*
- **Direct fetch of `https://ledgerium.ai` succeeded**, returning correct positioning. Site is live and healthy; the gap is third-party surfacing, not site health.
- **Zero third-party citations found.** Across 8 independent searches ("best Scribe alternatives 2026," "Tango alternatives," "Whale/Trainual/Process Street SOP software 2026," and direct phrase-matching of Ledgerium's own comparison language), Ledgerium AI does not appear once. Every other named competitor — including smaller players (Glitter AI, Dubble, Supademo, Guidejar) — appears repeatedly.
- **No press, no Product Hunt result, no analyst coverage** found for "Ledgerium AI."
- **Brand collision.** "Ledgerium" is an established 2018 Ethereum ICO — blockchain accounting/ledger platform, ticker LGUM (8B supply, ~14,459 holders reported), indexed on Etherscan, Ethplorer, CoinCarp, ICOholder, ICOmarks, Crypto-Rating, with history on BitcoinTalk and Crunchbase. Every bare "Ledgerium" query surfaced this entity first. This is materially worse than the generic "ledger app" collision already flagged in `SEO_AEO_EXPANSION_001.md` §6, because:
  - It threatens the entity-authority/`sameAs` plan in `SEO_AEO_SUPERPROMPT_V2.md` §8, which assumes a clean Knowledge Graph slate. It cannot — it must actively disambiguate against a pre-existing, differently-themed entity of the same name.
  - Buyers asking an AI assistant "what is Ledgerium" risk receiving crypto-ICO information — a reputationally awkward mismatch for enterprise SaaS diligence.

**Bottom line: Ledgerium AI is invisible in the AI-citation-relevant layer of the web** — absent from third-party roundups, no press, no earned mentions, plus an unaddressed name-collision headwind. This is the most concrete, falsifiable finding in this review and should outweigh the general industry statistics in §1–3.

---

## 5. Strategy verdict

**Keep:**
- The deterministic, evidence-linked capture mechanism — a real, verified-distinctive moat relative to every competitor surfaced.
- The build-time quality gate — genuinely above the 2026 bar. Do not weaken it as page count grows.
- The self-correction discipline already visible in the repo's history (v1→v2 catching the rich-results claim; the FAQ-tranche walk-back).

**Change:**
1. **Do not continue scaling toward 5,625 pages on the current on-domain-only trajectory.** With 90–95% of AI citations originating third-party and zero earned-mention motion, additional first-party volume has shrinking marginal return on citation probability.
2. **Add an earned-media/backlink workstream as a first-class budgeted item** — outreach to the third-party roundup sites Ledgerium is absent from (Waybook, Glitter AI, TheDigitalProjectManager and similar), analyst/press coverage, genuine non-manipulative presence on G2/Capterra/Reddit. **Single highest-leverage gap in this review.**
3. **Treat brand collision as active risk** — consistent "Ledgerium AI" qualifier, explicit non-affiliation disambiguation where relevant, aggressive `Organization`/`sameAs` work, and monitoring what LLMs say when asked "what is Ledgerium."
4. **Add an authority/earned-mention metric to the measurement plan.** §5 of `SUPERPROMPT_V2` measures GSC impressions/clicks/CVR and internal events but has **no referring-domains or third-party-citation KPI** — so the program can pass its own gates while remaining externally invisible.
5. **Reframe enterprise-incumbent compare pages as AEO answer assets, not SEO traffic assets**, and measure accordingly.

**Out of date in the repo's strategy docs:** nothing found is factually wrong — the HowTo/FAQPage removal dates are accurate and current. The material gap is an **omission**: no document in the series addresses backlinks, earned media, third-party listicle presence, or the name collision, despite these being the dominant factors determining AI-citation outcomes and the most plausible explanation for the "impressions but zero clicks" finding.

`EXPANSION_001.md`'s own diagnosis ("most of the GSC signal is a ranking/CTR problem, not a content gap") was directionally correct and should be **extended, not superseded**: the root cause of that ranking/CTR problem is very likely off-page domain authority, which no amount of additional on-page content can fix alone.

---

## Sources

AI citation / AEO: AuthorityTech (11% platform overlap audit, 2026) · Leapd (how ChatGPT/AI Overviews/Perplexity source information, 2026) · QuantumAgency (Q1 2026 citation analysis) · Wellows (AI Overviews ranking factors 2026) · SEOcrawl AI · roiandshine.com (schema for LLM citation) · Bigeye Agency (AEO complete guide 2026) · Omnibound (GEO + AEO statistics 2026) · blog.arfadia.com (AI citation statistics 2026) · mentiohunt.com (backlinks and AI citations, 2026 data) · Intleacht AI (backlinks/domain authority for AI visibility) · Astra Results (AEO 2026)

Programmatic SEO / scaled content: DigitalApplied (scaled content abuse crackdown; programmatic SEO after March 2026) · Gracker AI (is pSEO still effective 2026) · Apricot Studio (why traditional SEO is failing B2B SaaS 2026)

Competitors: TechCrunch + Fortune (Scribe $1.3B, Nov 10 2025) · Sacra (Scribe revenue/funding) · tango.ai/blog · Waybook · Glitter AI · TheDigitalProjectManager · Teachfloor · KYP.ai (Celonis alternatives) · mybusinessfuture.com (mid-market process mining 2026)

Brand collision: Etherscan LGUM token · CoinCarp · ICOholder · Crypto-Rating · Crunchbase

Direct fetch: `https://ledgerium.ai` (2026-08-13)
