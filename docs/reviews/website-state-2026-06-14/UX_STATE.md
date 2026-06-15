# Ledgerium AI — UX State Assessment
Date: 2026-06-14
Reviewer: UX Designer agent
Scope: Full site — public marketing through application surfaces

---

## 1. Surface-by-Surface Assessment

### 1.1 Landing Page (/)

**What is strong**

The hero is unusually honest for a SaaS product. "Your SOP says 5 steps. Your team takes 17." is a sharp problem statement that most buyers will feel immediately. The three-column competitive comparison ("vs. Screen Recorders / Process Mining / Manual Documentation") does real differentiation work without being vague. The embedded live demo iframe removes the signup gate from the curiosity phase, which is the single best activation decision on the page. The "How it works" section is a clean three-step model (Record → Process → Use) that sets accurate expectations before asking for a credit card.

**What is weak**

The social proof strip relies on internal engineering metrics ("1,393 tests passing") that mean nothing to an ops team buyer. This slot should carry user outcomes or named customer evidence — what it currently shows signals developer credibility to a developer audience, not buyer confidence to the actual ICP. The hero screenshot shows the dashboard but it is a static PNG, not a live product; users who scroll past the inline demo and land here are looking at a frozen screenshot right above a live embedded iframe two sections lower, which is structurally confusing.

The "Built Different" section is labeled with the internal eyebrow text "Competitive positioning" — this is a source-note from whoever wrote the content, not user-facing copy. It reads as if the draft label was never cleaned up.

The trust strip near the bottom ("Reproducible / Private / No AI guessing / Free to start") repeats the social proof strip's positioning nearly verbatim and adds no new information. One trust strip is enough; two at separate scroll positions suggest two people wrote the same section independently.

The page has no testimonials, no customer logos, no case study snippets, and no numeric proof of output quality (e.g., "Generated 4,000+ SOPs in the last 30 days"). For a product asking buyers to trust it with their internal process data, this is a trust gap.

**Grade: B-**

The positioning and demo are strong. The page earns good marks on clarity and honesty. It loses on trust-building (no social proof from humans) and has some copy hygiene issues.

---

### 1.2 Product Page (/product)

**What is strong**

The tour structure (Record → Process → Use → Library) follows the user's mental model of the tool. Pairing each step with a screenshot or extension panel image gives buyers visual confirmation at each stage. The intent to use real screenshots from the product (not polished marketing mockups) is brand-consistent with the "evidence, not interpretation" positioning.

**What is weak**

The product page leans heavily on enumeration (feature lists, step sequences) but has no single "wow" moment where the value compound becomes obvious. The best page on any product site should make a first-time visitor say "oh, that's what this is" within ten seconds. The current product page requires reading three to four paragraphs to assemble that understanding.

The screenshot references (e.g., `/docs/screenshots/extension/04-recording-active.png`) suggest the product imagery is sourced from documentation rather than purpose-built marketing assets. This creates a visual quality gap — docs screenshots are accurate but rarely compelling.

**Grade: C+**

Accurate and honest but not persuasive. Does not earn the "see it, get it" moment that the install-and-try funnel depends on.

---

### 1.3 Pricing Page (/pricing)

**What is strong**

The "Heads up" amber banner about multi-user invites being in Q3 2026 is the right call. Charging customers for seat counts that don't ship yet would be a trust-destroying move; putting it prominently on the pricing page is honest and actually differentiates the product as a company that doesn't overpromise. The FAQ is thorough and covers the high-friction questions (team sharing, data privacy, downgrade behavior, competitive comparison) in plain language. The feature comparison table is well-organized with clear category sections and appropriate highlighting of the "Most Popular" Team tier.

The ROI Calculator is a genuine differentiator — most process documentation SaaS products don't attempt to quantify the return. This deserves more prominence.

**What is weak**

The pricing page title metadata says "Record Once. Know Everything." — this is a good slogan but the body copy immediately pivots back to feature enumeration. The hero's four-bullet output grid (SOP, process map, variation analysis, automation candidates) lists Free tier benefits that some bullets don't actually apply to until paid tiers. The Free plan gets "AI-generated SOPs" and "visual process maps" but NOT "variation analysis" or "automation candidates" — both of which are in the four-bullet hero grid without plan gating labeled. This is an accuracy problem that will produce confused or disappointed free users.

The "Plan guidance strip" (Free: Map your first workflows / Starter: Document solo / Team: Measure how your team works / Growth: Find what to automate) is the clearest plan selector on the page, but it is buried below the pricing cards rather than above them where it could help buyers land on the right card before seeing prices.

The page references "Clean exports — PDF, Markdown, JSON" as a Starter+ feature, but the actual SOP export button in the app appears to be Markdown only. The word "PDF" in this cell may be forward-looking or aspirational; if it is, the comparison table should say "coming soon" not a checkmark.

**Grade: B**

Honest, thorough FAQ. ROI calculator is an asset. Loses points for feature gating ambiguity in the hero and plan guidance strip placement.

---

### 1.4 Install Page (/install)

**What is strong**

This is the strongest page on the public site. The four-step sideload instructions are detailed, accurate, and address the "is this safe?" anxiety before the user has time to Google it. The green safety callout on Step 3 ("This is safe. Developer mode is a standard Chrome setting...") directly handles the highest-friction concern in the flow. The "Captured / Not Captured" two-column section does significant privacy anxiety reduction work without burying the user in legal language. The troubleshooting FAQ is practical and covers the actual failure modes.

The instruction to "Extract to a permanent location" with an example (`Documents/Ledgerium`) and the explicit warning "If you delete or move the folder, Chrome will disable the extension" is excellent — this is the most common gotcha for sideloaded extensions and the copy handles it proactively.

**What is weak**

The sideload requirement is itself the biggest UX problem on this page, and no amount of copy polish can fully offset it. A four-step developer-mode installation is a meaningful friction barrier for the ops-team ICP, who are competent but not necessarily technical. The copy acknowledges this ("standard Chrome feature") but cannot remove the friction. The right long-term fix is Chrome Web Store availability, not copy improvement.

The page links to the User Guide for "a complete walkthrough with screenshots" but the Install page itself has no screenshots. Instructions like "find the Developer mode toggle in the top-right corner" are clear in text but would be faster to execute with a single annotated screenshot. This is the one page on the site most likely to be read by someone who is about to give up — it deserves visual support.

The "Already installed? Sign in to your account →" appears three times (hero, midpage, footer). Once is useful; three times reads as unsure copy.

**Grade: B+**

Best-written page on the site. Loses grade for the sideload friction it cannot escape, and for the missing screenshots in a process that would benefit from them.

---

### 1.5 Dashboard / Workflow Library (/dashboard)

**What is strong**

The redesigned dashboard (screenshot: dashboard-list.png) is a meaningful improvement over a basic list. The top band with Portfolio Health score (88), KPI tiles (Total Workflows, Median Cycle Time, Automation Candidates, Avg Health Score), Opportunity Mix bar, and weekly recording cadence chart gives portfolio-level signal that a library view normally lacks. This is genuinely differentiated — Scribe and Tango have no equivalent. The preset chip rail (Automation Candidates, Needs Attention, Standardize, High Volume, Recent Activity, Ready to Share, My Team's Bottlenecks) is a fast-path filter system that most users won't need to configure manually.

The column customization system (Columns button visible in the screenshot) with health scores, cycle time, run counts, and SOP readiness is a significant data-density step up from the MVP list view.

The inline bottleneck insight shown in the sub-header ("Bottleneck: Step 2 is a bottleneck → investigate step owner") is the right pattern — surface the most actionable signal at the top of the library rather than burying it three tabs deep.

**What is weak**

The dashboard is doing a lot simultaneously and the visual hierarchy does not guide the eye clearly. The five KPI tiles + gauge + opportunity mix bar + line chart + filter chips + columnar list form a very busy first impression. A new user with 1-2 workflows will see most of these tiles empty or trivially populated, which makes them feel like noise rather than signal.

The "Runs" column shows "n=2" in the screenshot with a small label. The provenance of this number is opaque — does "2 runs" mean 2 separate recordings of the same process? This is a core concept that is not explained anywhere visible. A user seeing "n=2" on a health score chip does not know if that means "this score is reliable" or "this score is based on very little data."

The "PORTFOLIO HEALTH 88" in the top right corner and the "AVG HEALTH SCORE 88" KPI tile are showing the same number with different labels and different visual treatments at the same time. This duplication is likely intentional (the gauge is the visual, the tile is the number) but reads as two separate metrics to a new user.

**Grade: B**

Genuinely powerful for a loaded library. Loses marks for empty-state experience with few workflows and for un-explained data concepts (run count provenance, what N means for reliability).

---

### 1.6 Workflow Map — Flow Intelligence, Swimlane, Process Variants, System Interaction (/workflows/[id] → Workflow tab)

**What is strong**

The process map (screenshot: workflow-flow-view.png, workflow-process-map.png) is the visual centerpiece of the product and it earns that position. The numbered step cards with category badges (NAVIGATION, DATA ENTRY, FORM SUBMIT, SEND/SUBMIT) in distinct colors, combined with timing labels per step, per-step system labels, and edge transition labels ("Page navigation", "Form submitted") produce a diagram that looks like what a process analyst would draw after a week of interviews — but it generates in seconds. This is the single strongest expression of the product's value proposition.

The four-mode switcher (Flow Intelligence / Swimlane / Process Variants / System Interaction) with dedicated canvases is architecturally correct — each mode answers a different question (what happened / by system phase / how it varies / which tools). The Process Variants map (screenshot: workflow-variants-map.png) renders a genuine multi-path flow diagram with branch probabilities and dominant path highlighting. This is differentiated work.

The unified toolbar (Labels / Metrics / Insights / Minimap toggles + zoom controls + reset) is clean and discoverable. The WorkflowHeader showing step count, duration, phase count, confidence %, and completion status gives context without requiring tab-switching.

**What is weak**

The legend is hidden by default (`showLegend: false` in DEFAULT_TOOLBAR). Every visual coding system on this map — step category colors, node shapes, edge styles — is unexplained unless the user finds the (currently absent from toolbar) legend toggle. First-time users cannot interpret the color scheme without either guessing or clicking around. The map is beautiful but partially illegible on first view.

The confidence dot in step cards (a 1.5px dot colored green/blue/amber by threshold) is meaningful to the team that built it and invisible to a first-time user. It needs a label or tooltip at minimum. "90% confidence" shown as a chip on the header is good; tiny unnamed dots on each step card are not discoverable.

The Variants map (Process Variants mode) lazy-loads on first tab open, which is the right engineering choice, but the loading state shows no context about what is being loaded or why it takes a moment. A user who clicks "Process Variants" and sees a spinner with no label will not know whether they need to have multiple recordings for this to work.

The SOP tab link in the map view (a small `?` help link per tab) is useful but the visual connection between the process map view and the SOP view is non-existent. A user viewing step 4 in the map and wanting to see step 4 in the SOP must tab-switch and then scroll — there is no "open in SOP" affordance on individual steps.

**Grade: B+**

The maps are genuinely impressive and the four-mode switcher is correct. Loses marks for the hidden legend, confidence dot opacity issues, and the disconnection between map steps and SOP steps.

---

### 1.7 SOP View (/workflows/[id] → SOP tab)

**What is strong**

The three-mode SOP shell (Execution SOP / Visual Process / Intelligence) correctly recognizes that the same SOP data serves three different reading contexts: someone following the procedure step by step, someone reviewing the overall process, and someone doing analysis. The Execution mode's QuickStart block (What This Does / When To Use / Before You Begin / Systems Needed / Expected Outcome) is well-structured for operator use.

The left step rail (numbered pill navigation) is a good navigation affordance for long SOPs. The export to Markdown is useful for teams that want to paste into Notion, Confluence, or similar.

**What is weak**

The SOP tab in the older screenshot (workflow-sop-tab.png) shows a tab bar with Workflow / SOP / Report / Insights / Interpretation / Intelligence / AI Agents / Evidence — eight tabs. The current implementation shows three tabs (Workflow / SOP / Report). This is an improvement, but the historical proliferation of tabs is a warning signal that the information architecture is still being settled and that feature additions have defaulted to "add a tab" rather than consolidating into existing views.

The SOP empty state is generic: "This workflow doesn't have an SOP yet. Upload a workflow recording to automatically generate a standard operating procedure." The upload link points to `/upload`, but the most likely reason a user sees this state is that they just finished a recording and are waiting for processing — not that they haven't uploaded anything. The empty state should distinguish between "processing" (show a spinner or estimated wait) and "not yet recorded" (show the upload CTA).

The mode switcher within the SOP tab (Execution SOP / Visual Process / Intelligence) is a second switcher below the primary Workflow/SOP/Report tab switcher. Two layers of view-switchers in the same visual frame creates mode confusion. A new user reading the SOP will not know whether to use the top tab to change views or the inner sub-switcher.

The SOP screenshots that would most benefit users (showing what a step looks like when following the procedure, with system context and expected outcome visible) are not surfaced anywhere on the marketing site or in the app's onboarding path. The SOP content quality lives inside the execution mode but there is no path for a new user to discover it without already being in the SOP tab.

**Grade: C+**

The Execution mode content is solid. Loses marks for the two-level switcher hierarchy, the generic empty state, and the disconnect between SOP steps and their process map equivalents.

---

### 1.8 Workflow Report (/workflows/[id] → Report tab)

**What is strong**

The Report tab (screenshot: workflow-report.png) is the most analytically complete surface in the product. The "OBSERVED VERDICT" block — showing "31% of 16 runs follow the same path, and run timing is highly consistent (CV: 0.24). 6 distinct paths were observed; the dominant path covers 5 of 16 runs" — is evidence-linked machine-written analysis that no competitor produces in this form. The combination of Cycle Time / Consistency (CV) / Variant Count / Bottleneck Step / Automation Score tiles below the verdict gives a five-number summary of the process health in scannable form.

The "Evidence-linked" chip on the verdict block is the right trust signal — it tells the user these statements derive from observed data, not AI hallucination. The right-column section navigation (Summary → Verdict → Scorecard → Health & Spread → Evidence → Actions) is well-organized and the scroll-spy behavior means users always know where they are in a long report.

The "Save as PDF" button as the primary header action is correct prioritization — the most common stakeholder use case for a report is printing or sharing a snapshot, and the button accurately labels what `window.print()` produces.

**What is weak**

The Report page contains both the new intelligence report AND an embedded "Approve Expense Report (Sample)" section that appears to be a legacy overview artifact. This creates a page with two separate document-like sections that do not visually belong to the same surface. The old overview sits below the new verdict/scorecard section and appears to restate some of the same information in a different format.

The "Run-count provenance" problem is acute in the Report tab. The verdict says "16 runs" but a user with only 2 recordings will see different numbers and not know whether their report is trustworthy. There is no minimum-data advisory — no callout saying "This report is based on 2 runs; reliability increases with more recordings." The system treats a 2-run report and a 100-run report with the same confident tone.

The Actions section at the bottom of the report (Automation / Composed Agents / Skill Library / Integrations & Roles / Implementation Roadmap) reaches into product territory (AI agent composition) that does not yet exist in the product. These sections render as populated with placeholder text, which makes the report feel unfinished rather than forward-looking.

**Grade: B-**

The verdict and scorecard are the best data visualization in the product. Loses marks for the legacy overview artifact still present below the new report, run-count provenance opacity, and future-capability sections that render as placeholder content.

---

## 2. Three Biggest Cross-Cutting UX Issues

### Issue 1: The map–SOP disconnect

The workflow map and the SOP are two representations of the same underlying process data, but they are completely siloed. A user viewing step 4 "Complete form with Close Date Range and submit" on the process map has no way to open the corresponding SOP instruction for that step without tab-switching, scrolling, and hoping the step numbering aligns. Conversely, a user reading step 4 in the SOP has no way to see its position in the process map or which phase it belongs to. These two surfaces should cross-reference at the step level. A "See in SOP" affordance on map steps, and "See in map" on SOP steps, would make both surfaces more powerful by connecting them.

This disconnect also affects the Report tab. The bottleneck step named in the report ("Review line items — 37% of cycle time") cannot be navigated to directly in the map or the SOP from within the report. Users must remember the step name, switch tabs, and find it manually.

### Issue 2: Undefined data concepts at first use

Three core concepts — health score, run count (N), and confidence — appear throughout the dashboard and report without definition at the point of use. A user who sees "Health Score: 86, n=2" on a workflow card does not know: What is a health score? Is 86 good? What does n=2 mean? Is that too small to trust? A user who sees "90% confidence" in the workflow header does not know whether that means the recording was complete, the SOP is accurate, or the process is consistent.

These terms are defined in the docs, but no tooltip, inline glossary, or contextual explanation appears at the point where the user first encounters them. The effect is that the most important outputs of the intelligence engine are opaque to new users. A first-time user looking at a freshly-recorded workflow will not know how to evaluate the numbers they are seeing.

### Issue 3: Two-tier navigation inside single pages

Multiple surfaces layer a top-level tab switcher over an inner view-mode switcher:

- Workflow detail page: Workflow / SOP / Report tabs (top) plus Flow Intelligence / Swimlane / Process Variants / System Interaction (inner mode switcher in the map view)
- SOP tab: main SOP page (second level tab) plus Execution SOP / Visual Process / Intelligence (sub-modes within the SOP view)

The result is that users landing on any of these tabs face a secondary navigation decision immediately. This is not inherently wrong — compound surfaces need sub-navigation — but the visual framing does not clearly communicate the hierarchy. The outer tabs and the inner mode switchers use similar visual treatments (both are horizontal pill or tab patterns), which makes them appear to be parallel navigation options rather than a parent-child relationship. A user on the SOP tab may toggle through the three SOP sub-modes thinking they are switching to different information, when in fact they are seeing the same data in three different layouts.

---

## 3. First-Impression / New User Experience

### The path: Landing → Install → Record → First Value

**Stage 1: Landing → Signup**

The landing page gives a new user a clear sense of what the product does (record → get SOP + process map) and a low-friction way to try it (the live dashboard demo inline on the page). The "Get Started Free" CTA is not hidden. The signup flow is standard. This stage works reasonably well.

**Stage 2: Signup → Install**

After signup, the user needs to install the Chrome extension. The sideload requirement is a four-step developer-mode process that would be unfamiliar to a significant portion of the target ICP (ops team managers, compliance leads, training coordinators). The Install page handles this as well as copy can — but the friction is real and unavoidable until Chrome Web Store approval. For a user who abandons during install, there is no re-engagement email or in-app prompt offering help.

**Stage 3: Install → First Recording**

Once installed, the extension requires creating an account and configuring sync before recordings reach the web app. The sync setup (create API key, paste into extension settings) is documented in the FAQ but is not part of the post-signup flow. A user who records a workflow without configuring sync will see nothing appear in their dashboard and will not understand why. This is the single most dangerous abandonment point in the activation funnel.

**Stage 4: First Recording → First Value**

Assuming sync is configured, a user who records a workflow and navigates to it in the dashboard will land on the Workflow tab showing the process map. The process map is impressive and usually requires no instruction — numbered steps, colors, timing, and system labels are self-describing enough that most users will explore without prompting. This is the genuine "first value" moment and it is strong.

However, the Report tab (which contains the most analytically rich output) is positioned third and requires data from multiple runs to be meaningful. A user with one recording will see a report with one data point — most of the variance, consistency, and bottleneck analysis will be empty or trivially populated. The empty state handling for single-run reports does not communicate "record more runs to unlock this analysis" — it just shows thin or empty sections with no guidance.

**Summary**

The path from landing to first SOP or process map is achievable in under 10 minutes for a technically-comfortable user. For the broader ICP (ops professionals who are not developers), the sideload install and sync configuration are significant friction points. First value is clear once the path is complete. Building on it (recording more runs, using the Report) requires re-discovery rather than progressive guidance.

---

## 4. Visual Consistency and Polish

### Design system coherence

The product uses a consistent dark-theme design system (CSS variables: `--surface-elevated`, `--surface-secondary`, `--content-primary`, `--border-default`) throughout the app. The Ledgerium green brand color (`brand-600`) is applied consistently as the primary accent across tabs, buttons, and active states. Typography is clean and the `ds-*` spacing scale produces consistent rhythm in the app surfaces.

The public marketing site uses a different implementation of this system — same color family but with more gradient use (`bg-gradient-to-b from-brand-900/20`) and lighter backgrounds in some sections. The contrast between the dark app and the marketing pages that are semi-dark-but-not-fully-dark is visible but not jarring. A visitor going from the homepage to the signed-in dashboard will notice a shift in visual weight but not a brand break.

**Public site gaps**

The public site uses hardcoded hex values in several places (`text-[#e2e8f0]` for body copy) where the app uses design tokens. This means if the light/dark mode is ever toggled, public site body text will not respond correctly. The social proof strip, hero, and pricing sections all use this pattern. This is a maintainability issue more than a visual one, but it is a signal that the public site was built separately from the design system rather than as part of it.

**App gaps**

The workflow detail page header action buttons show four items: Share, Save as PDF, SOP, Download data (JSON). These four buttons have different visual weights (Save as PDF is `btn-primary`, others are `btn-secondary`) and different action semantics (some navigate, some download, one opens a dialog). The "SOP" download button and the "SOP" tab are two different things with the same label — one downloads a JSON file of the SOP artifact, the other opens the SOP reading interface. This labeling collision will confuse users.

The health status chips in the dashboard (Healthy, Needs Review, High Variation, Stale, New) use `bg-emerald-50`, `bg-amber-50`, `bg-red-50` — light-mode colors on a dark-mode dashboard. The dashboard background is dark (`--surface-primary`) but the status chips render with light backgrounds (emerald-50, amber-50) that were designed for a light-mode context. This creates visually jarring chips that stand out strongly. Visible in the dashboard screenshot.

**Grade on visual consistency: C+**

The app's internal design system is coherent. Two problems undercut it: light-mode status chips on a dark dashboard, and the public site using hardcoded colors outside the token system.

---

## 5. Overall UX Grade and Top 8 Priorities

### Overall Grade: B-

The product has a genuinely differentiated output surface — the process map, the variants analysis, the evidence-linked report verdict — that no direct competitor matches. The best moments (first view of a generated process map, reading the OBSERVED VERDICT on the report, the "Automation Candidates" chip on the dashboard) are genuinely good UX backed by real data. The marketing copy is honest and precise.

What pulls the grade down: the activation funnel has two dangerous abandonment points (sideload install, sync configuration) that most users will encounter without help. The intelligence output (health scores, confidence, run counts) is unexplained at the point of use. The map-SOP-report connection is severed when it should be continuous. And a handful of consistency issues (light chips on dark dashboard, duplicate SOP label, legacy report overview still on the page) signal that the product is growing faster than the design system can absorb.

---

### Top 8 UX Priorities

**Priority 1: Fix the post-signup sync configuration gap**
A user who completes signup and installs the extension but does not complete sync setup will record a workflow that never appears in the app. There is no guidance in the post-signup state to complete sync. This is the highest-probability activation failure in the funnel. Required: a post-signup checklist or guided setup step that walks the user through API key creation and extension sync before inviting them to record.

**Priority 2: Add inline definitions for health score, confidence, and run count (N) at the point of use**
Every occurrence of "Health Score: 86", "90% confidence", and "n=2" in the dashboard and workflow view needs a tooltip or inline definition. These are not self-describing. The tooltip on a health score should explain the 0–100 scale, what "needs review" means, and what minimum N is for reliable scoring. Without this, the intelligence output feels arbitrary to new users.

**Priority 3: Turn the legend on by default in the process map**
`showLegend: false` in DEFAULT_TOOLBAR means the first-time user sees a color-coded process map with no key. Change the default to `showLegend: true` and add a "close" button (which already exists in the legend component) so experienced users can dismiss it. The legend should also be persistent to the toolbar as a toggle button that shows its own label, not a hidden option.

**Priority 4: Add cross-reference between map steps and SOP steps**
Each step in the Flow Intelligence map should have a "View in SOP" link that opens the SOP tab with the corresponding step pre-scrolled into view. Each step in the SOP should have a "Show on map" affordance that either highlights the step in the map or opens the Workflow tab to that step. This makes both surfaces more useful by connecting them.

**Priority 5: Fix the run-count provenance and single-run report empty states**
The Report tab should show a calibration advisory when run count is below a meaningful threshold (e.g., fewer than 3 runs). The advisory should say: "This report is based on N run. Cycle time, consistency, and variant analysis become more reliable with more recordings. Record this process again to strengthen the analysis." This is an honesty requirement — the current report tone implies equal confidence at N=1 and N=100.

**Priority 6: Resolve the header action button label collision ("SOP" download vs. SOP tab)**
The header shows four action buttons: Share, Save as PDF, SOP, Download data (JSON). The "SOP" button downloads a JSON artifact. The "SOP" tab opens the SOP reading experience. These are two different things with the same name. Rename the download button to "Download SOP (JSON)" or "Export SOP" to distinguish it from the tab navigation. Better: expose the Markdown export from within the SOP tab itself (it already exists there) and remove the JSON SOP download from the header — JSON is a developer format that should not be a primary action.

**Priority 7: Replace light-mode status chips with dark-mode equivalents on the dashboard**
`bg-emerald-50 / text-emerald-700`, `bg-amber-50 / text-amber-700`, and `bg-red-50 / text-red-700` are light-mode colors. The dark dashboard needs dark-mode chip variants: `bg-emerald-900/30 / text-emerald-400`, `bg-amber-900/30 / text-amber-400`, `bg-red-900/30 / text-red-400`. This is a one-line change per color variant but it visually unifies a surface that currently has jarring bright chips on a dark background.

**Priority 8: Add meaningful empty-state guidance for the Report tab with fewer than 3 runs**
A new user with a single recording who clicks the Report tab will see a partially populated report with a verdict that says things like "1 of 1 runs follow the dominant path" — which is statistically meaningless and may undermine trust in the intelligence engine. The empty state should either (a) not render the full report structure when N is too small, replacing it with a focused "Record more runs to unlock this analysis" CTA with specific guidance on what changes at N=3, N=5, and N=10, or (b) render the report but visually call out the data limitation prominently before the verdict block. Option (a) is more honest; option (b) is more transparent about what the system can compute. Either is better than the current state.

---

*Assessment based on code review of public pages, app pages, component implementations, and available screenshots captured 2026-06-14.*
