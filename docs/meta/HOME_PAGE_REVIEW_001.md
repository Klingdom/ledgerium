# HOME_PAGE_REVIEW_001 — Landing Page Multi-Agent Strategic Review

**Mode:** Mode 3-adjacent multi-agent strategic review (NON-counting)
**Date:** 2026-06-24
**Directive (CEO, verbatim):** "Engage all subagents to review the home page and similarly update it like you did for the product page. Determine whether the large images and containers to demo workflow lists is the best use of this landing page. We want people to quickly understand the value of capturing workflows and turning them into process maps and SOPs as well as the value for identification of AI use cases and skill documentation."
**Subject:** `apps/web-app/src/app/(public)/page.tsx`
**Agents engaged (6, parallel):** product-manager · ux-designer · growth-strategist · competitive-researcher · frontend-engineer · analytics

---

## 1. The Core Question, Answered

**Is the large workflow-library image + interactive demo the best use of the landing page? — No.**

5 of 6 agents converged: the large static hero dashboard screenshot and the above-the-fold interactive workflow-library demo are the **right assets in the wrong place** for a *landing* page (vs. the deep `/product` page where intent is already established).

- The hero static screenshot (`/img/demo/dashboard.png`, 900×560, `priority`) shows a metrics *library* — it answers "what does your dashboard look like," a question a first-time visitor has not yet asked. It does not match the "5 steps vs 17" headline, which promises an SOP outcome.
- Competitive evidence (competitive-researcher): **none** of Scribe, Tango, Guidde, Process Street, or Whatfix leads with a multi-row library/dashboard view. The dominant category pattern is a tight outcome headline + one focused proof element + social proof.
- The interactive `RealProductDemo` is the strongest asset on the page but is mis-positioned above the fold (heavy JS, mobile-unfriendly data table, payoff hidden two clicks deep).

**Verdict:** Replace the single large library screenshot with a **3-outcome glance** (Process Map · SOP · AI Report); **move** the interactive demo below "How it works"; **add** the two missing value props.

---

## 2. The Three Value Props — Current Coverage

| Value prop | Currently on home page? | Ship status (honesty) |
|---|---|---|
| **1. Capture → Process Maps & SOPs** | Yes (hero image + SOP screenshot + "What you get") | **Shipped.** Safe to claim. |
| **2. AI use-case identification** | **Absent — appears nowhere** | **Partially shipped.** `aiOpportunityScore` (0–100) + `opportunityTag` (automate/standardize/optimize/monitor) ship today in the workflow list. Frame as "see which workflows are candidates for AI automation, scored from real data." Do **not** claim AI recommendations/integration/execution (vision-stage, AI-washing risk per AI_INTEGRATION_PLATFORM_VISION_REVIEW_001 §14.1). |
| **3. Skill / expertise documentation** | Oblique only (one Training/Onboarding persona card at the bottom) | **Implicit via SOP generation.** Frame as "turn an expert's recording into onboarding & training docs automatically." Do **not** claim a skill-library/management surface (does not exist). |

The page is currently ~100% SOP-centric. Two of the three CEO-named value props are invisible.

---

## 3. Strong Cross-Agent Convergence (act on these)

1. **CUT/REPLACE the large hero library screenshot** → tight 3-outcome visual. (PM cut · UX replace · Competitive remove · Frontend replace). *Growth dissented — keep for credibility — but minority.*
2. **MOVE `RealProductDemo` below "How it works"** + add a "click a row to see the SOP, process map & AI score" prompt. (PM · UX · Growth · Competitive · Frontend).
3. **ADD a fast-scan 3-value-prop strip** high on the page so all three props register in a <10s squint. (PM · UX).
4. **ADD AI use-case identification + skill documentation as named outputs/sections.** (all 6).
5. **KEEP the headline** "Your SOP says 5 steps. Your team takes 17." — strongest specific contrast in the category. Broaden the **subhead** to name all three outcomes. (all 6).
6. **Launch-safe AI/skill copy** — "identify where AI fits" / "training docs from real work," never over-claim. (PM · Growth · Competitive).

## 4. Recommended Landing-Page Section Order (lighter arc — landing, not deep tour)

1. **Hero** — keep headline; subhead names all 3 outcomes; CTAs; replace big screenshot with a **3-outcome thumbnail row** (Process Map · SOP · AI Report).
2. **Social proof / differentiator strip** — keep (determinism, evidence-linked, privacy, measured).
3. **3 value-prop strip (NEW)** — Capture→SOPs/Maps · Identify AI use cases · Document skills. One icon + one line each.
4. **How it works** — keep; step 3 copy names AI candidates + shareable SOP.
5. **Try it (`RealProductDemo`, MOVED here)** — relabel + "click a row" prompt.
6. **Real output** — keep framed SOP screenshot (proof).
7. **What you get** — 6 cards re-balanced to cover all 3 props (SOPs · Process Maps · AI Opportunity Scoring · Skill & Training Docs · Workflow Library · Reports & Export).
8. **Built different** — keep.
9. **Who it's for** — keep (Training/Onboarding card already carries the skills angle).
10. **Trust strip + Final CTA** — keep; final CTA closes the loop on all 3 props.

**Interpretation of "like the product page":** apply the same *quality bar and real-product-visual* approach, **not** the heavy annotated-container tour. A landing page must communicate value fast (UX + Competitive); the deep annotated containers (`DemoAnnotated*`) stay product-page-only.

---

## 5. Implementation & Effort (frontend-engineer)

- **Overall: S–M**, single file (`page.tsx`) + reuse existing `/img/demo/*.png` assets. No new screenshots required.
- Hero image: add `sizes="(max-width: 768px) 100vw, 900px"`; for the 3-thumbnail row use existing `workflow-view.png` / `sop-view.png` / `report-view.png`.
- `RealProductDemo`: keep its existing internal `next/dynamic` boundaries; moving it down reduces above-the-fold JS.
- A11y/responsive gaps to respect: social-proof strip `whitespace-nowrap` overflow at 320px; mobile fallback for the interactive demo.

## 6. Measurement (analytics) — BEFORE → AFTER

- **Primary KPI:** hero signup CTR + signup-start rate (must not regress).
- **Secondary:** section-reach rate for `value_prop_ai` / `value_prop_skills` (currently 0), time-to-first-CTA-click (should fall), 25% scroll-reach (should rise if the big image was slowing comprehension), demo engagement rate.
- **New events to add later:** `homepage_section_viewed`, `homepage_demo_interaction`, `homepage_scrolled_pct`, and `sections_viewed_before_click` on CTA — to answer "do the big images help or hurt?" and "which value prop resonates?"
- **Evaluation:** clean before/after with a 14-day baseline (A/B once a flag layer exists).

## 7. Competitive Notes (competitive-researcher)

- Category is converging on **"AI-readiness of your processes"** as the hero claim (Scribe Optimize, Tango "Document first, automate second," Celonis "Make Enterprise AI work"). Ledgerium's home page currently makes **no** AI claim.
- **Whitespace:** "skill/competency documentation from real work" is uncontested; the **evidence-linked** version of "where AI fits" ("we can prove which recording it came from") is unclaimed by any competitor — Ledgerium's defensible differentiator.
- **Zero-engineering wins:** remove static hero image, foreground the ungated interactive demo, add an AI-readiness sentence to "How it works" step 3.

## 8. CEO Decisions

1. **Lighter landing arc vs. annotated-tour clone** — recommendation: lighter arc (this review's §4). Confirm or request the heavier annotated-container approach.
2. **AI / skills copy ship-gating** — recommendation: ship the launch-safe framing now (true today). Confirm vs. holding AI messaging until the determinism trust-badge (PIB-R13) ships.
3. **Analytics instrumentation** — recommendation: add the §6 event taxonomy in a follow-up so the redesign is measurable (Ledgerium "measurable outcome" rule).

---

*This is a read-and-recommend diagnostic artifact. The accompanying implementation updates `apps/web-app/src/app/(public)/page.tsx` per §4 with launch-safe copy per §2.*
