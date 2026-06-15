# ATTRACTION Assessment — Ledgerium AI Website & Product
**Date:** 2026-06-14
**Scope:** Public site (landing, product, pricing, use-cases, install, compare, docs) + trial-user value loop (dashboard → workflow map → SOP → report)
**Method:** Read-only review of source code, competitive benchmarks, and product artifacts
**Agent:** growth-strategist

---

## 1. Landing Page / First Impression

### The hero (5-second test)

The headline is the strongest copy on the site:

> "Your SOP says 5 steps. Your team takes 17."

This is excellent. It is concrete, specific, and anchors immediately to a real pain. A prospect who has ever maintained SOPs will feel that line. The subhead ("Record real workflows in the browser. Get structured SOPs, process maps, and documentation — instantly. No interviews. No workshops. No guessing.") extends the promise clearly and lists the "no X, no Y, no Z" eliminator pattern effectively.

**What works:**
- The headline creates instant recognition without requiring category education.
- The embedded live dashboard demo on the homepage is a high-value differentiator. Very few SaaS tools of this size allow anonymous interaction with real product before sign-up.
- Three CTAs on the homepage are correctly prioritized: primary (Get Started Free), secondary (See the Product), and a live demo link inline.
- Social proof strip ("Same input, same output — always" / "Evidence-linked output" / "Privacy-by-architecture" / "1,393 tests passing") communicates technical rigor to the ops/automation buyer profile who cares about reliability.

**What is weak:**

The hero subhead mentions "process maps" — but on the page there is no image of a process map. The hero screenshot is the dashboard (a workflow library list view). This is a positioning disconnect: the marketing claim leads with maps and SOPs but the most prominent visual is a table of recordings. A visitor who arrived from a search for "process map generator" would feel uncertain.

The page title in metadata is: "Ledgerium AI — Record Real Workflows. Get SOPs Instantly." This is fine for SEO but it undersells the intelligence layer. The page's OG description ("Your SOP says 5 steps. Your team takes 17.") is the stronger first-impression hook and should match the title.

The social proof strip says "1,393 tests passing." This means nothing to a business buyer. It communicates engineering culture (which matters to a technical evaluator) but reads as navel-gazing to an ops manager or process owner. Replace it or pair it with an outcome stat: "Used on 40+ enterprise workflow types" or a real user testimonial.

The "Built Different" competitive section appears deep on the homepage and uses the label "Competitive positioning" as a section eyebrow. This is internal language. Buyers do not think in terms of "competitive positioning." The eyebrow should be removed or replaced with something like "Why it's different."

---

## 2. The Value Narrative Across the Site

### The record → map → SOP → report → act story

The product page (/product) is the strongest page on the site. The four-step tour (Record → Process → Analyze → Act) is structurally correct and matches the actual product flow. Each step has a real screenshot. The sequence communicates that a single recording produces multiple types of output.

**The narrative break that loses visitors:**

The story stops at "Analyze." The "Act" step on the product page describes building a library and unlocking health scores, bottleneck detection, and "AI agent compositions." These are compelling, but they are described as what the library "gets" over time — they are not shown as concrete outputs a user receives from their first recording. The visitor who wants to know "what do I get today, from one recording?" does not get a clean answer here.

The homepage "What you get" section lists six outputs: Workflow Steps, SOPs, Process Maps, Workflow Library, History & Metrics, Reports & Export. These are accurate but not ordered by visitor priority. A first-time visitor cares most about "does it make me an SOP right now" and "can I share it." Reordering to SOP → Process Map → Report → Library → Metrics → Export would match their decision sequence.

The use-case pages (/use-cases/operations) are good at problem-agitation but weak on proof. "Get instant documentation" and "Build a living library" are claims without substantiation. There is no customer quote, no screenshot showing a real SOP output for a real tool (Workday, Salesforce, Zendesk), and no timing data. The example workflow grid (Submit expense report in Workday, etc.) is the most grounding element on the page and could anchor the whole argument if paired with a screenshot of what the SOP output actually looks like for one of those cases.

The compare page (/compare/scribe) is the best-argued differentiation asset on the site. The "structural capture vs screenshot capture" framing is clear, honest, and positioned at the right abstraction level. The table is thorough. The FAQ pre-answers the five questions a Scribe user would actually ask. This page should be linked from the homepage hero section for visitors who are evaluating alternatives.

---

## 3. Activation: Landing → Install → First Recording → First Wow

### The extension install path

This is the single biggest friction point in the acquisition funnel.

The product is not in the Chrome Web Store. Installation requires:
1. Download a zip file
2. Unzip to a permanent folder
3. Enable Developer Mode in Chrome
4. Load unpacked
5. Pin to toolbar
6. Create an account
7. Generate an API key in the web app
8. Open the extension, navigate to Sync Settings, paste in the Sync URL and API key

That is eight steps before the user can record anything that persists. The install page (/install) handles this well — the four installation steps are clearly documented, the "Developer mode is safe" reassurance is present, and the amber warning about permanent folder placement is appropriately prominent. But the install page cannot fully compensate for the friction of the sideload model itself.

The FAQ entry "Chrome is showing a warning about Developer mode extensions" anticipates the most common abandonment point, which is good. But it appears late on the page. A prominent "Why isn't this in the Chrome Web Store?" answer should appear before the install steps, not in the troubleshooting FAQ.

The disconnect between "Get Started Free" (which goes to /signup) and the actual first step (install the extension) means a user can sign up, go to their dashboard, and have nothing recorded yet. The empty-state experience in the dashboard is not visible in the public site source, but based on the product docs the user gets "Try a sample workflow" — which is the right fallback. However, there is no in-dashboard prompt that guides the new user back to install the extension and connect it.

The sync architecture (API key + Sync URL) is an additional complexity that Scribe and most competitors eliminate. A user who records a workflow without configuring sync loses the recording. This is documented but not prominently warned at the top of the install page.

**The "aha moment" potential:**

When a user stops their first recording and sees a structured SOP, a visual process map, and a health score appear for a workflow they just did — that is a genuinely impressive first moment. No interview, no writing, no AI hallucination. The challenge is that the path to that moment has too many steps. The primary opportunity is reducing the install-to-first-recording path to three steps: install, sign in, record.

The live demo iframe embedded on the homepage and product page is currently doing the job of delivering the "wow" to visitors who never install the extension. This is the right short-term bridge. But the demo presents the full dashboard, which is not what a first-time user will see — they will see an empty library. The gap between demo impression and real first-use experience is the most dangerous activation gap.

---

## 4. Pricing and Packaging Attraction

### The value ladder

The plan taglines on the pricing page are clear and differentiated:
- Free: "Map your first workflows"
- Starter: "Document solo, share cleanly"
- Team: "Measure how your team works"
- Growth: "Find what to automate at scale"

This is good positioning. The escalation makes sense: capture → document → measure → optimize.

The pricing hero ("Record Once. Know Everything.") is the strongest headline on the pricing page. The four-bullet output grid that follows it (SOP + process map + variation analysis + automation candidates) is accurate and high-value.

**What undermines the pricing page:**

The amber banner ("Heads up: Multi-user invites are launching Q3 2026. Team and Growth tiers route to a waitlist") is honest but damaging. It tells a Team or Growth buyer that they cannot actually buy the product today. This is the right disclosure, but it creates an immediate ceiling at Starter ($49/month) for any buyer who wants multi-user features. The banner de-sells the highest-revenue-potential plans at the moment of intent.

The FAQ entry on this is transparent: "We chose not to charge for advertised seat counts until the underlying workspace infrastructure ships." This is credible and honest. But a visitor who reads the banner and does not read the FAQ will simply leave. The banner needs a stronger conversion recovery: "Join the Team waitlist — early access slots available" with an email capture.

The feature comparison table is comprehensive but the category labels ("What You Capture," "What You Get," "Sharing & Collaboration," "Advanced & Enterprise") are functional rather than value-oriented. "What You Get" should say "Documentation outputs" and "Advanced & Enterprise" should lead with the intelligence-layer name since that is the differentiator Ledgerium is building toward.

The ROI Calculator (imported as a component) is a smart addition — the competitive benchmarks confirm that Celonis and process-mining tools lean into dollar-value framing. Having an ROI Calculator before full cost-model data is available is the right PLG move, as long as the inputs are honest (time-saved per SOP x hourly rate is defensible).

Free plan: 5 recordings per month with a watermark is a reasonable gate. The limit is low enough to motivate upgrade but high enough to complete the value loop (install → record → get SOP → share). The 14-day trial on paid plans is well-documented in the FAQ.

---

## 5. Differentiator Visibility: Is "Evidence-Linked + Deterministic" Made Attractive?

### The core moat: what the site does well

The phrase "evidence-linked" appears on the homepage social proof strip, in the hero screenshot caption, in the product page, in the compare page, and in the pricing page. It is surfaced consistently. The concept — that every step traces to observed browser events, nothing is fabricated or hallucinated — is the most meaningful differentiator against both Scribe (screenshot-based) and AI-from-description tools (hallucination risk).

The Scribe compare page articulates this best: "You can't diff two screenshot SOPs. You can diff two Ledgerium recordings." This is the strongest brand line on the entire site. It is on the /compare/scribe page that very few homepage visitors will see.

"Deterministic" is used correctly in the product description ("Same input, same output — always") but this phrase is engineering vocabulary. The business translation is: "Every SOP you generate is reproducible, auditable, and defensible." That business formulation appears in the compare FAQ ("compliance-grade or automation-ready documentation") but not prominently on the homepage or pricing page.

### Where the moat is buried

The positioning currently resolves as: "Record workflows. Get SOPs." This is accurate but it is a feature description, not a moat articulation. Scribe also says "record workflows, get SOPs" — their entire value proposition overlaps at this surface level.

The moat is not SOP generation. The moat is:
1. Every output is evidenced by source events — no AI rewriting, no fabrication
2. Output is reproducible and diffable — the same recording, the same SOP, auditable
3. Library intelligence compounds — individual recordings become cross-workflow analytics

None of these three are the headline on the homepage. The headline is about the pain ("5 steps vs 17"), which is correct for first-impression, but the hero subhead and the social proof strip do not resolve the "why Ledgerium specifically" question clearly enough.

The competitive benchmark documents (COMPETITIVE_REPORT_BENCHMARK.md) identify the "evidence-linked" badge as the strongest trust/brand move for the Report view. The internal team knows this is the moat. It needs to travel further up the page hierarchy — into the homepage H1 or subhead, not just the social proof strip icons.

The phrase "process intelligence platform" appears in the product page but not on the homepage. If Ledgerium is positioning as a process intelligence platform (vs. a documentation tool), the homepage should say so. Currently, the homepage reads as a SOP generator that also does process maps. The intelligence layer (health scores, variant analysis, automation scoring) is a Team/Growth plan feature that does not appear above the fold on the homepage.

---

## 6. The 8-10 Highest-Impact ATTRACTION Moves

Listed in order of conversion impact, not build complexity.

**Move 1: Surface a real SOP output on the homepage (highest impact)**
The homepage hero visual is a dashboard screenshot (a table of recordings). Replace it with a split view: the extension recording on the left, a generated SOP on the right. This directly answers "what do I get" in the visual — before the visitor reads a word of copy. The product page already has individual screenshots of each output; the homepage needs to show the transformation.

**Move 2: Move the "You can't diff two screenshot SOPs" line to the homepage**
This is currently buried on /compare/scribe. It is the most conversion-ready brand line on the site. It belongs in the "Built Different" section on the homepage, or ideally in the hero subhead as a contrast line: "Other tools capture what the screen looked like. We capture what actually happened." This is the five-second differentiator the homepage currently lacks.

**Move 3: Add one real customer quote or case study**
There is zero social proof from named users anywhere on the site. The "1,393 tests passing" engineering-credibility signal in the social proof strip should be replaced with one named user quote and employer (even a beta user). "We documented 12 ERP workflows in 90 minutes that would have taken a week to write by hand." — [Name], [Company type]. Process improvement buyers are risk-averse; social proof from a peer is the fastest trust accelerator.

**Move 4: Add "Why isn't this in the Chrome Web Store?" as the first FAQ item on the install page**
Right now this question appears in the middle of the Troubleshooting section. It is the first concern of every user who lands on /install. The answer should appear before the installation steps, not after them. Add a one-paragraph note: "We submitted to the Chrome Web Store and are in review. The sideload method is our distribution path while review is pending. It takes 2 extra minutes and we have documented every step." This turns the friction into a trust signal (honesty about constraints) rather than an unexplained obstacle.

**Move 5: Create a "Join the Team waitlist" conversion path on the pricing page**
The amber warning banner currently kills intent for the highest-value plans. Add an email-capture CTA: "Team plan waitlist — get early access when multi-user launches (Q3 2026)." This converts an abandonment event into a pipeline lead. The visitor's intent has been captured; the sale is deferred, not lost.

**Move 6: Bring "evidence-linked" into the pricing page hero**
The pricing hero ("Record Once. Know Everything.") is strong. The four-bullet output list is accurate. But none of the four bullets mention the evidence-linked guarantee — the reason the outputs are trustworthy. Add a fifth bullet or a one-line callout: "Every output backed by recorded browser events — no AI fabrication." This closes the "is this just another AI generator?" objection at the most intent-driven page on the site.

**Move 7: Show the process map in the homepage product screenshot section**
The homepage currently has two interactive embeds: the dashboard iframe and the SOP iframe. There is no process map visual on the homepage. The Visio-grade process maps are one of the strongest visual differentiators from Scribe and documentation tools. A 400px screenshot of the Flow Intelligence or Swimlane view would communicate "this is a different class of tool" at a glance. The competitive benchmark confirms maps are the most distinctive visual asset versus the Scribe/screenshot category.

**Move 8: Add a "What you get from your first recording" one-pager link on the install page**
The install page ends the onboarding journey at "Done. Click the Ledgerium AI icon." There is no preview of what the user is about to experience. A single screengrab or a link to the interactive demo ("Here's what your first recording will look like") placed at the end of the install steps would reduce post-install abandonment by setting a concrete expectation. The live demo iframe already exists; link to it from the install success state.

**Move 9: Add the intelligence-layer positioning to the homepage above the fold**
The homepage positions Ledgerium as a SOP generator with extras. The intelligence layer (health scores, variant analysis, automation scoring) is surfaced under "What you get" only after the comparison section — below the fold. A short line in the hero subhead such as "Your recordings get smarter over time — bottleneck detection, variant analysis, and automation opportunities emerge automatically as your library grows" would prime this expectation before the visitor reaches the pricing page where Team/Growth intelligence features gate.

**Move 10: Add an auto-generated verdict paragraph to the Report tab output (internal — affects conversion when shared)**
The COMPETITIVE_REPORT_BENCHMARK identifies the auto-generated 3-sentence verdict paragraph as the highest-leverage report feature no competitor ships. "Ran 8 times; median cycle time 4m 12s; 2 steps show friction; 1 automation candidate (approve PO step)." When a Ledgerium user shares a public SOP link, the recipient sees the report. If the report opens with a plain-English verdict paragraph, the "wow" lands for the recipient too — not just the recorder. This is an internal product move but has direct attraction consequences because public SOP shares are the primary viral acquisition channel.

---

## 7. Overall ATTRACTION Grade and Single Most Important Move

**Grade: B-**

### Rationale

The hero copy is above average for early-stage SaaS. The embedded live demo is a genuine competitive advantage for low-friction exploration. The compare page is excellent. The product page tells the story correctly. The pricing page has good value articulation with honest disclosure of current limitations.

What holds the grade down:

- Zero social proof from real users. The site asks visitors to trust a product they cannot verify has been used by anyone else.
- The moat ("evidence-linked, deterministic, diffable output") is surfaced in copy but not demonstrated visually on the homepage. A prospect cannot see what makes Ledgerium different from Scribe in the first 5 seconds.
- The install path is a significant activation barrier. Developer mode + sideload is technically simple but perceptually alarming for a non-developer ops manager. The documentation manages it well, but the friction cannot be fully documented away.
- The homepage resolves positioning as "SOP generator" rather than "process intelligence platform." The intelligence layer — which is Ledgerium's competitive distance from Scribe — is visible only to visitors who scroll past the fold or visit /product.

### The single most important move

**Replace the hero screenshot with a before/after visual: the extension capturing a recording on the left, a generated SOP (with the process map thumbnail visible) on the right.**

This is the move because: it answers "what do I actually get" in under one second, it differentiates from Scribe (which shows screenshot guides, not structured step-by-step SOPs with evidence traces), it creates the product's own "wow" in the marketing layer before the user has to install anything, and it gives visitors something concrete to carry into the "Get Started Free" click. Every other improvement on this list compounds on top of this one. Without it, the homepage is describing a product; with it, the homepage is demonstrating one.

---

*End of ATTRACTION assessment. Read-only analysis; no code, no configuration changes.*
