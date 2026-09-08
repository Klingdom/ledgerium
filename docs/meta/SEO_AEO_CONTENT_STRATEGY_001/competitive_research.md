# Competitive & AI-Citation Recon — SEO/AEO Content Strategy 001

**Author:** competitive-researcher (persisted by coordinator; agent had no Write tool)
**Date:** 2026-09-08
**Method:** live web search, 9+ independent queries
**Updates:** `docs/meta/GROWTH_REVIEW_001/seo_aeo.md` §8 REPORTED rows

---

## 1. Third-party presence re-check — VERIFIED 2026-09-08

Six roundup-shaped queries run. **Ledgerium appeared in zero results and zero AI summaries across all of them.**

| Query | Roundup domains that appeared |
|---|---|
| best scribe alternatives 2026 | dubble.so, waybook.com, g2.com, scribe.com (self), tango.ai, thedigitalprojectmanager.com, kyp.ai, glitter.io, guideless.ai |
| SOP documentation software tools 2026 | usewhale.io, waybook.com, storytodoc.ai, checkflow.io, claudiasop.com |
| task mining software tools 2026 | kyp.ai (x2), gartner.com, sourceforge.net, noxus.ai, usefluency.com |
| SaaSHub Ledgerium | No product page exists (only unrelated saashub.com/ledger-status) |
| vendor setup SOP template | Etsy, Cornell Finance, Scribd, process.st, MyProSulum, QuickBizDocs, eLeaP — **Ledgerium page absent** |
| system access request SOP template | ClickUp (x2), HubSpot, Josys, Streamline Projects, QuickBizDocs — **Ledgerium page absent** |

**New finding.** "AI SOP generator" / "workflow recorder SOP" surfaces a far larger long-tail vendor field than the original competitor list: Guidde, Kommodo, Vidocu, Credia, Wizardshot, Trupeer, Docsie, ScreenApp, Guidemaker, Happysupport.ai, Rindax, OperatorLab. Every one of these tiny, mostly single-founder tools has self-published roundup content and is indexed.

> This **sharpens** the original finding. It is not that the category is too crowded for a new entrant to earn roundup coverage — dozens of near-zero-authority competitors have it. Ledgerium is simply not pursuing it. **Execution gap, not structural barrier.**

### 1.1 CAUTION — the prior review's one positive signal does not reproduce

`/sop-templates/vendor-setup-sop-template` (GSC: position 5.0, 1 impression, 1 click) and `/sop-templates/system-access-request` (position 12.3, 3 impressions) **do not appear in live non-personalized search today** for the matching phrases.

Consistent with those GSC positions being artifacts of near-zero query volume rather than stable rankings. This does not invalidate the strategic point that long-tail beats head-term at zero authority — but **the n=1/n=3 evidence must not be treated as a demonstrated ranking win. It is noise with the right shape.**

---

## 2. Brand/entity collision — VERIFIED, and WORSE than reported

Branded search for **"Ledgerium AI"** returns: a Medium post on unrelated "LedgerAI Quantum Corporation"; CoinGecko/CoinMarketCap pages for a **different** crypto token "Ledger AI" (ticker LEDGER, live-traded on Uniswap); Ledger.com's AI security roadmap; and the Crunchbase profile for the 2018 "Ledgerium" ICO.

**Ledgerium the SaaS product does not appear on page 1 of its own exact-name branded search.**

New severity vs. prior review: beyond the known 2018 LGUM ICO (still indexed on Etherscan, CoinCarp, Ethplorer, ICOholder, bitcointalk), there is now **a second, actively-traded "LedgerAI"/"LEDGER" entity**, plus `github.com/ledgerium` tied to an unrelated e-invoicing product (LUCA+).

> At least **three** unrelated "Ledger[ium]" entities now compete for the same query space. The collision is worsening, not static. `sameAs` linking alone will not resolve it.

No G2 listing exists (`site:g2.com Ledgerium` returns only unrelated LedgerMax/LedgerSync/LedgerDocs).

---

## 3. Who wins the four axes — VERIFIED

**Use-case ("how to document a process", "SOP template for X")** — won by **template libraries and vendor own-content**, not listicles. Scribe's own guide ranks #1 for the generic how-to. ClickUp, Notion, HubSpot, Smartsheet and Etsy/Scribd-hosted templates dominate specific-process queries. Winning format = free downloadable/embeddable template from a **high-DA generalist SaaS brand**.

**Role / department** — these query classes **do not intersect cleanly with the SOP-tool category at all**. "Financial services process documentation software" surfaces generic compliance-software vendors (NiCE, Salesforce, V-Comply, Skematic) — none of them SOP/workflow-capture tools. "Financial services SOP" (without "software") surfaces content-marketing blogs from adjacent SOP vendors (ProProfs, Whale, ScreenSteps, SowFlow).

> **Evidence against the assumption that a financial-services landing page competes in a well-defined SERP.** The query space is fragmented; a vertical page needs a very specific angle, not "industry + SOP software".

**Industry** — same pattern; no winner-take-all SERP; dominated by adjacent-category incumbents' content marketing.

**Competitor-name axis** — dominated by enterprise aggregators (Gartner Peer Insights, Owler, CB Insights, SourceForge, Peerspot). **But see §3.1.**

### 3.1 NEW POSITIVE FINDING — the only verified organic visibility

**`ledgerium.ai/competitors/soroco` appears on page 1 (approx. 8th) of a live, non-branded "Soroco alternatives" search.**

This is the single piece of verified organic Ledgerium visibility found in the entire pass. Not top-3, and the query is narrow — but real. **It should be protected and expanded, not written off as part of "the failed 82%".**

---

## 4. Long-tail vs head-term — VERIFIED, mixed

- Long-tail **template** pages are won by DA-90+ generalists (ClickUp/Notion/HubSpot) publishing the identical format. A zero-authority domain competing on "SOP template for X" is fighting incumbents, not peers.
- Long-tail **vendor-comparison** pages are won by aggregators — but a vendor's own competitor page **can** achieve secondary visibility (confirmed for Ledgerium). This is the one long-tail shape with a demonstrated foothold today.
- Long-tail **AI-SOP-generator** pages are won by dozens of zero-authority competitors' own blogs — the format works for entrants with minimal effort.

**Conclusion:** the realistic 2026 long-tail win at zero authority is (a) competitor-comparison pages about oneself, and (b) third-party-hosted presence whose internal ranking favours relevance over domain authority — **not** self-hosted generic SOP templates against ClickUp/Notion/HubSpot.

---

## 5. AI-citation baseline — one prior claim now UNVERIFIED

Cannot query assistants directly with this toolset; inferred from retrieval-adjacent search per the source artifact's own method.

**Does not corroborate the prior claim that Reddit/YouTube are disproportionately represented.** Four targeted attempts (site:reddit.com scribe-alternatives; r/sysadmin + r/msp process-documentation; YouTube review query; "what tool records a workflow and produces an SOP") returned **zero Reddit threads and zero YouTube videos** — surfacing instead the blog/SaaS-content layer plus G2 seller pages.

May reflect genuinely thin UGC volume in this sub-niche rather than the claim being wrong. **Marked UNVERIFIED-FOR-THIS-NICHE — do not rely on it for prioritization without direct checking.**

**Confirmed live:** the retrievable corpus for this category is a dense mesh of small-vendor blogs, aggregators (G2, Capterra, Gartner, SourceForge, Owler, CB Insights) and template libraries — not UGC. G2 in particular carries structured category taxonomy (Digital Adoption Platform, Screen and Video Capture, Work Instructions, SOPs, Knowledge Management) that AI Overviews lean on heavily.

---

## 6. Target list — 17 prioritized properties

| # | Property | Type | Why it matters | How obtained |
|---|---|---|---|---|
| 1 | **G2.com** | Review aggregator | In every roundup query today; feeds AI Overviews + assistant retrieval; taxonomy exists to slot into | Self-serve claim + seed 5 reviews |
| 2 | **Capterra.com** | Review aggregator | Same mechanism, different buyer segment | Self-serve profile |
| 3 | **SaaSHub.com** | Alternatives directory | Confirmed zero listing; ranks for `[competitor] alternatives`; near-zero effort | Free submission |
| 4 | **SourceForge** | Directory | Page-1 for alternatives queries in task-mining space | Self-serve listing |
| 5 | **Product Hunt** | Launch community | Proven in this category — Supademo 1,098 upvotes; 2.0 relaunch 394+ | Free launch, coordinated day |
| 6 | **Owler.com** | Company directory | Appears in Soroco-alternatives SERP | Free company claim |
| 7 | **CB Insights** | Market intelligence | In process-intelligence alternatives SERPs | Briefing/PR outreach |
| 8 | **Gartner Peer Insights** | Enterprise reviews | Dominates process-intelligence competitor SERP | Vendor claim + review solicitation |
| 9 | **Zapier Blog** (SOP / process-mapping roundups) | High-DA editorial | 2026 roundups live today; human-researched, so a genuine pitch target | Editorial pitch |
| 10 | **TheDigitalProjectManager.com** | Independent review site | In the Scribe-alternatives roundup today; mid-authority, pitchable | Submission/outreach |
| 11 | **Reddit** (r/sysadmin, r/msp, r/BusinessIntelligence, r/ITManagers) | Community | NOT confirmed dominant in this niche (§5); zero-cost, ICP active on adjacent topics | Genuine participation only |
| 12 | **YouTube** | Video search | Not confirmed dominant here, but natural format for this product; direct-discovery value regardless | Founder-produced demos |
| 13 | **Peerspot.com** | Enterprise reviews | In Soroco/Signavio alternatives SERP | Vendor claim |
| 14 | **Waybook / UseWhale blogs** | Competitor content | Top of nearly every roundup query; realistic path is Ledgerium's own "vs" pages capturing their searchers | Own comparison pages |
| 15 | **IndieHackers** | Founder community | Real venue for adjacent competitors (Supademo cross-posted) | Build-in-public post |
| 16 | **AI-tool directories** (There's An AI For That, Futurepedia-style) | Directory | Actively populated by adjacent AI SOP tools; Ledgerium in none | Free/low-cost submission |
| 17 | **Chrome Web Store** | Independent ranking surface | See §6.1 | Own listing |

### 6.1 NEW — Chrome Web Store keyword-collision risk

Scribe's Chrome Web Store listing title is literally **"Scribe: AI Documentation, SOPs & Process Intelligence."**

A direct competitor has already claimed **"Process Intelligence"** — the exact term Ledgerium uses to describe itself — as a CWS-search keyword. Since CWS ranking is partly keyword-driven, Ledgerium's listing title/description must be deliberately differentiated when it goes live.

---

## 7. Evidence status

| Claim | Status |
|---|---|
| Zero Ledgerium presence across 9 roundup/directory queries | **VERIFIED** today |
| Dozens of zero-authority competitors DO have roundup presence | **VERIFIED** today |
| sop-template position-5/12 signal does not reproduce live | **VERIFIED** today (contradicts prior REPORTED signal) |
| Second crypto entity "LedgerAI"/LEDGER; 3+ colliding entities | **VERIFIED** today |
| Ledgerium absent from page 1 of own branded search | **VERIFIED** today |
| `/competitors/soroco` on page 1 for "Soroco alternatives" | **VERIFIED** today |
| No G2 listing exists | **VERIFIED** today |
| Role/department/industry SERPs fragmented, no clean competitor set | **VERIFIED** today |
| Scribe CWS title claims "Process Intelligence" | **VERIFIED** today |
| Reddit/YouTube over-represented in AI citations | **UNVERIFIED FOR THIS NICHE** — 4 attempts returned zero |
| 90-95% of AI citations from third-party domains | **REPORTED** — not re-verified here |
