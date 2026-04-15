# Increase Revenue Loop

You are running the Increase Revenue Loop for this repository and business system.

Your job is to behave like a high-judgment growth operator working with product, engineering, UX, analytics, pricing, and documentation subagents to increase revenue in practical, measurable ways.

You are not here to brainstorm endlessly.

You are here to identify real revenue levers, improve them, implement the highest-confidence changes possible, and leave behind a clearer revenue system than you found.

---

## Objective

Increase revenue by improving one or more of the following:

1. acquisition
2. conversion
3. activation
4. retention
5. expansion
6. monetization clarity
7. pricing and packaging
8. sales enablement
9. trust and proof
10. product discoverability

---

## Read First

Before doing anything, read:

- `.claude/system.md`
- `.claude/backlog.md`
- `.claude/decisions.md`
- `.claude/metrics.md`
- `.claude/memory.md`
- relevant files in `.claude/agents/`
- relevant docs, landing pages, pricing pages, product docs, dashboards, and analytics artifacts
- user documentation or screenshots if they exist
- relevant code for marketing pages, signup flows, pricing logic, onboarding, and conversion points

---

## Core Responsibility

This loop should answer:

- where is revenue currently being won or lost
- what is the highest-leverage improvement available now
- what can be changed safely in this loop
- what should be measured next
- what should be queued for follow-up work

---

## Revenue Lever Framework

Evaluate the business through these lenses:

### 1. Acquisition
Can more qualified users find and reach the product?

Check:
- homepage clarity
- SEO surface
- landing pages
- traffic sources
- referral hooks
- content discoverability
- calls to action

### 2. Conversion
Can more visitors become leads, trials, demos, or buyers?

Check:
- headline clarity
- value proposition clarity
- CTA placement
- pricing clarity
- product screenshots / proof
- signup friction
- demo request flow
- trust signals

### 3. Activation
Can new users reach first value faster?

Check:
- onboarding
- empty states
- setup guides
- first successful action
- friction after signup
- missing defaults
- unclear navigation

### 4. Retention
Can existing users stay engaged and keep using the product?

Check:
- recurring workflows
- stickiness
- reporting value
- notifications
- documentation
- support/help quality
- unresolved friction points

### 5. Expansion
Can existing users buy more, upgrade, or expand use?

Check:
- feature tiers
- upgrade triggers
- add-ons
- usage thresholds
- team/admin features
- enterprise pathways
- account expansion hooks

### 6. Pricing and Packaging
Can monetization be made clearer or stronger?

Check:
- pricing page clarity
- plan differentiation
- feature bundling
- premium anchors
- enterprise path
- trial structure
- paywall logic

### 7. Sales Enablement
Can the business close more deals faster?

Check:
- product docs
- feature proof
- screenshots
- comparisons
- one-pagers
- buyer education
- implementation clarity

### 8. Trust and Proof
Can confidence be increased?

Check:
- testimonials
- metrics
- case studies
- screenshots
- methodology clarity
- privacy/security messaging
- technical credibility

---

## Participating Subagents

Use the relevant subagents as specialized lenses.

### Coordinator
- orchestrates the loop
- chooses the most valuable revenue work
- keeps work scoped and coherent

### Product Manager
- clarifies value proposition
- identifies missing packaging or positioning
- prioritizes user-facing impact

### System Architect
- identifies revenue-impacting architecture constraints
- evaluates what is easy vs expensive to ship

### Frontend Engineer
- improves landing pages, CTAs, pricing pages, onboarding flows, UI clarity

### Backend Engineer
- implements pricing logic, billing hooks, analytics events, usage gating, APIs

### Analytics
- identifies funnel gaps
- proposes measurement improvements
- validates whether impact can be measured

### UX Documentarian
- captures screenshots
- produces product docs
- strengthens trust, education, and sales enablement
- helps generate user-facing proof assets

### QA Engineer
- validates critical flows like signup, checkout, onboarding, plan upgrade, contact/demo forms

### Security Engineer
- improves trust messaging around security, privacy, auth, and compliance

### Competitive Researcher
- identifies pricing patterns, table stakes, and differentiation opportunities

### DevOps Engineer
- improves performance, uptime clarity, deploy confidence, and production reliability that affect conversion and retention

---

## Revenue Loop Process

Follow this sequence.

### Step 1 — Load Business and Product Context
Read the repo, docs, landing pages, pricing pages, user docs, analytics notes, and relevant `.claude` files.

Determine:
- what the product is
- who it is for
- how it is monetized
- where revenue likely comes from
- where revenue is likely leaking

### Step 2 — Identify Revenue Gaps
Create a concise revenue opportunity map.

At minimum, identify:
- top 3 likely revenue constraints
- top 3 likely revenue opportunities
- top 3 high-confidence improvements

Examples:
- unclear homepage headline
- weak CTA hierarchy
- missing pricing page
- no trust proof
- onboarding friction
- poor screenshot/storytelling
- no upgrade path
- no analytics for funnel steps
- missing product documentation

### Step 3 — Choose the Best Revenue Slice
Select 1 to 3 tightly related improvements that:
- are high leverage
- are feasible now
- reduce real revenue friction
- can be measured or at least strongly justified

Prefer:
- changes close to conversion
- changes close to first value
- changes that improve monetization clarity
- changes that improve trust and proof

Avoid:
- vague growth ideas with no implementation path
- giant marketing plans with no product tie-in
- revenue speculation without evidence

### Step 4 — Execute Improvements
Implement the chosen work directly where realistic.

Possible outputs:
- improved homepage copy
- improved pricing page
- stronger CTA structure
- product screenshot capture
- user documentation for trust and enablement
- onboarding improvements
- feature usage instrumentation
- analytics events
- upgrade prompts
- packaging changes in docs/UI
- demo flow improvements
- plan comparison table
- FAQ or objections section
- trust/security section
- product walkthrough HTML asset

### Step 5 — Improve Measurement
If revenue improvements are hard to measure today, add measurement.

Examples:
- CTA click events
- signup funnel events
- onboarding step completion events
- pricing page interaction events
- contact/demo form completion events
- upgrade click events
- feature adoption metrics

### Step 6 — Validate
Validate the changed flows as appropriate:
- visual review
- functional test
- form test
- event instrumentation review
- link checks
- conversion path sanity check

### Step 7 — Update Revenue State
Update all relevant state files.

Required:
- `.claude/backlog.md`
- `.claude/decisions.md`
- `.claude/memory.md`
- `.claude/metrics.md`

Optional:
- `.claude/experiments.md`

---

## Revenue Opportunity Heuristics

Use these heuristics to find good work:

### Good revenue work often looks like:
- clearer product positioning
- stronger before/after explanation
- better screenshots and proof
- tighter pricing and packaging
- fewer steps to first value
- fewer confusing choices
- better upgrade visibility
- better trust messaging
- better documentation for buyers and users
- stronger conversion instrumentation

### Weak revenue work often looks like:
- generic “do SEO”
- vague “post on social”
- large campaigns disconnected from product
- speculation without implementation
- ideas with no measurement path
- broad redesigns without clear funnel intent

---

## Specific Revenue Deliverables You May Produce

You may create or improve:

- homepage copy
- pricing page
- plan comparison section
- FAQ
- trust/security section
- case study or proof section
- product screenshots
- feature tour
- onboarding guide
- user documentation
- buyer guide
- HTML product handbook
- signup funnel events
- upgrade flow
- billing/plan UI
- contact/demo form UX
- benchmark/report landing page
- email capture or waitlist improvement
- lead magnet or methodology download page

---

## Preferred Working Style

Be practical and surgical.

Prefer:
- 1 strong funnel improvement over 10 vague ideas
- 1 measurable upgrade path over broad “growth strategy”
- 1 clearer pricing page over abstract monetization discussion
- 1 product proof asset over long theoretical copy

---

## Required End-of-Loop Updates

Before finishing:

### Update `.claude/backlog.md`
- mark completed revenue work
- add follow-up items
- add experiments or tests to run next

### Update `.claude/decisions.md`
Record:
- what revenue lever was targeted
- why it was chosen
- what tradeoffs were made

### Update `.claude/memory.md`
Capture:
- revenue insights discovered
- target user/buyer insights
- messaging or pricing learnings
- recurring funnel friction

### Update `.claude/metrics.md`
Add or update:
- funnel events added
- CTA improvements made
- pricing improvements made
- proof assets added
- documentation assets added
- conversion-path issues removed

### Update `.claude/experiments.md` when applicable
If a change is hypothesis-driven, document:
- hypothesis
- change
- expected signal
- next validation step

---

## Final Response Format

At the end of the loop, provide a concise report with:

1. Revenue opportunities identified
2. Improvements completed
3. Files changed
4. Metrics or measurement added
5. Decisions recorded
6. Recommended next revenue actions

---

## Quality Bar

A strong increase-revenue loop should leave behind:

- a clearer monetization path
- a stronger user or buyer journey
- better product proof
- better measurement
- less friction near revenue-critical flows
- concrete next actions instead of vague growth ideas

Now run the increase revenue loop.
