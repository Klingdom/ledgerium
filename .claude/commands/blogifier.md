# blogifier

Generate three published blog posts for `ledgerium.ai/blog` on the day this skill is invoked. One post per category:

1. **Process Intelligence** — fundamentals, evidence, observability, deterministic capture
2. **Competitive** — process intelligence competitor use cases + why Ledgerium AI wins
3. **AI & Automation** — insights for browser-based workflows

Each post must be SEO-optimized, on-brand, substantive (~1,200–2,000 words), and shippable without manual edits.

---

## Operating Rules

- Generate EXACTLY 3 posts per invocation. Never more, never fewer.
- Use today's date (in ISO `YYYY-MM-DD` format) for slugs + metadata + display dates.
- Each post lives at `apps/web-app/src/app/(public)/blog/<slug>/page.tsx`.
- Update `apps/web-app/src/app/(public)/blog/page.tsx` `POSTS` array to add all 3 new entries at the TOP (most-recent-first ordering).
- Run validation gate: `pnpm --filter @ledgerium/web-app typecheck` + `pnpm --filter @ledgerium/web-app test` before committing.
- Commit ALL 3 posts + the index update as a single commit with conventional commit message.
- DO NOT delete or modify existing posts. DO NOT touch other surfaces. Strictly additive.
- DO NOT use emojis in blog content unless the topic specifically warrants one.
- If a slug already exists for today's date (skill was run twice same day), append a sequence number: `-2`, `-3`, etc.

---

## Slug Conventions

Slugs MUST be:
- All lowercase
- Hyphenated (no underscores or spaces)
- Descriptive (3–6 words capturing the title's essence)
- Date-suffixed: `<descriptive-slug>-YYYY-MM-DD`

Today's slugs follow these patterns (replace `YYYY-MM-DD` with the actual date):

1. **Process Intelligence post**: `<topic>-process-intelligence-YYYY-MM-DD`
   - Examples: `the-observation-gap-process-intelligence-2026-05-18`, `evidence-linked-workflows-process-intelligence-2026-05-18`
2. **Competitive post**: `<topic>-vs-<competitor-or-category>-YYYY-MM-DD`
   - Examples: `ledgerium-vs-celonis-deterministic-process-mining-2026-05-18`, `why-scribe-falls-short-evidence-2026-05-18`
3. **AI & Automation post**: `<topic>-browser-workflows-YYYY-MM-DD`
   - Examples: `ai-agents-need-process-baselines-browser-workflows-2026-05-18`, `automation-readiness-scoring-browser-workflows-2026-05-18`

The descriptive prefix should NOT repeat across days — vary the angle to keep the blog feeling fresh.

---

## Post Template — required file structure

Every new post file at `apps/web-app/src/app/(public)/blog/<slug>/page.tsx` follows this structure:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: '<EXACT POST TITLE> — Ledgerium AI',
  description: '<1-sentence SEO description, 140–160 chars>',
  openGraph: {
    title: '<EXACT POST TITLE> — Ledgerium AI',
    description: '<same as description>',
  },
};

export default function <PascalCasePostName>() {
  return (
    <>
      {/* Post header */}
      <section className="pt-16 pb-10 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to blog
          </Link>

          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest border rounded-full px-2.5 py-0.5 mb-4 <CATEGORY_STYLE>">
            <CATEGORY_LABEL>
          </span>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            <EXACT POST TITLE>
          </h1>

          <div className="mt-4 flex items-center gap-3 text-sm text-[var(--content-tertiary)]">
            <time dateTime="<ISO_DATE>"><HUMAN_READABLE_DATE></time>
            <span aria-hidden="true">&middot;</span>
            <span><N> min read</span>
          </div>
        </div>
      </section>

      {/* Post body */}
      <article className="py-14 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6 text-[15px] text-[#e2e8f0] leading-relaxed">
          {/* Opening hook — 1–2 paragraphs */}
          <p>...</p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            <SECTION_HEADING>
          </h2>

          {/* Body sections — 4–6 H2 sections with 2–4 paragraphs each */}
          <p>...</p>

          {/* Emphasis paragraph — apply text-[var(--content-primary)] font-medium */}
          <p className="text-[var(--content-primary)] font-medium">
            <KEY_INSIGHT>
          </p>

          {/* Continue body */}
          <p>...</p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            <CLOSING_SECTION>
          </h2>

          <p>...</p>

          {/* Closing CTA — Ledgerium-specific */}
          <p className="text-[var(--content-primary)] font-medium pt-4">
            <CLOSING_INSIGHT_OR_TIE_BACK>
          </p>
        </div>
      </article>

      {/* Bottom CTA section */}
      <section className="py-16 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <p className="text-[var(--content-secondary)] text-sm uppercase tracking-widest font-semibold mb-3">
            See it in action
          </p>
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            <CONTEXT_APPROPRIATE_CTA_HEADING>
          </h2>
          <p className="mt-3 text-[var(--content-secondary)]">
            <CTA_BODY>
          </p>
          <div className="mt-6">
            <Link href="/product" className="btn-primary gap-2 shadow-sm shadow-brand-600/20">
              See the product
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
```

### Category Styles (use exactly these classes per category)

- **Process Intelligence**: `bg-brand-600/10 text-brand-400 border-brand-600/20`
- **Competitive**: `bg-violet-500/10 text-violet-400 border-violet-500/20`
- **AI & Automation**: `bg-amber-500/10 text-amber-400 border-amber-500/20`

---

## Content Guidance Per Topic

### 1. Process Intelligence post

**Purpose**: educate readers on what process intelligence is, why deterministic capture beats reconstruction, and why evidence linkage matters.

**Title formulas** (vary across invocations):
- "The Hidden Cost of Reconstructed Process Documentation"
- "What Real-Behavior Capture Reveals About Your Workflow"
- "Process Intelligence: From Memory to Measurement"
- "Why Most Process Maps Lie — And What to Do About It"
- "The Evidence Chain: Why Process Data Needs Provenance"
- "From Recordings to Decisions: How Process Intelligence Works"

**Required arguments** (post must include at least 4 of these):
- Memory-based documentation drifts from reality within weeks
- Real-behavior capture exposes workarounds, undocumented approvals, edge cases
- Deterministic processing means same input → byte-identical output (Ledgerium core principle)
- Evidence linkage = every conclusion traceable to source events
- Process intelligence is structurally different from screenshot guides (Scribe/Tango) or BPMN diagrams (Lucidchart/Visio)
- Confidence scoring + N-attribution ("based on 47 runs") is category-first
- Process variants matter — not every run follows the dominant path
- Decision points are inferred, not assumed
- Automation candidates emerge from observed friction, not speculation

**Closing CTA heading**: "Want to see what your actual processes look like?"

### 2. Competitive post

**Purpose**: contrast Ledgerium AI with one or more competitor categories, expose a structural gap in the competitor's approach, and show how Ledgerium closes it.

**Competitor categories to rotate across invocations**:
- **Celonis** — enterprise process mining; requires IT integration + SAP/ERP connectors; $150K-$300K/year
- **UiPath Process Mining** — RPA-integrated; enterprise-only; statistical inference without evidence attribution
- **SAP Signavio** — SAP ecosystem; expensive; no browser capture
- **Scribe** — screenshot SOP automation; $29-299/user; no variant analysis or decision detection
- **Tango** — browser-extension capture; in-app overlays; no multi-recording merge
- **Lucidchart / Visio / Miro** — manual diagramming tools; no observation-driven discovery
- **Process Street / Trainual / Whale** — checklist + SOP management; no event-level capture
- **Microsoft Power Automate / Minit** — bundled in M365; complex; IT-administered
- **Apromore** — academic + commercial; no self-serve

**Title formulas**:
- "Ledgerium vs. <Competitor>: <The Differentiating Capability>"
- "Why <Competitor Category> Misses <Specific Gap>"
- "The Empty Quadrant: <Gap> No Process Tool Has Solved Yet"
- "<Competitor> Captured the What. Here's How Ledgerium Captures the Why."
- "Process Theater: When Process Mining Tools Don't Show Their Work"

**Required arguments** (post must include at least 4 of these):
- Cite specific competitor pricing (use realistic public figures; never invent numbers — defer to "starts at $X" framing if uncertain)
- Identify a structural capability the competitor lacks (evidence attribution / multi-run merge / decision inference / browser-side capture / SMB pricing / determinism)
- Explain WHY the competitor's architecture can't easily close the gap (it's not a feature — it's foundational)
- Anchor Ledgerium's claim with one specific differentiator (e.g., N-attribution, immutable evidence chain, deterministic processing, browser-side capture)
- Acknowledge what the competitor DOES well (don't trash-talk; respect the category)
- Frame Ledgerium's position positively ("here's what we add") not just negatively ("here's what they're missing")

**Closing CTA heading**: "See process intelligence done differently"

### 3. AI & Automation post

**Purpose**: explore the intersection of AI agents, browser-based automation, and the role of process intelligence as a substrate.

**Title formulas**:
- "Why AI Agents Need a Process Baseline (And How to Build One)"
- "From Browser Capture to Automation Candidates"
- "The Automation Readiness Score Most Tools Don't Compute"
- "AI Recommendations Without Evidence: A Trust Problem"
- "Browser-Native Process Intelligence: The Missing Layer for AI Agents"
- "Determinism Before Inference: Why Process Data Quality Matters for AI"

**Required arguments** (post must include at least 4 of these):
- Most workflow automation today is built without observing the real workflow first
- AI agents recommend without evidence — leading to over-promising and under-delivery
- Browser-side capture is the missing observation layer for AI-driven automation
- Deterministic process baselines are prerequisite to evidence-linked AI recommendations
- Categorize automation suggestions: deterministic rule / RPA / API integration / AI classification / AI agent execution / approval workflow (multi-tier classifier)
- Branch-level automation candidates differ from workflow-level (Ledgerium can identify which BRANCH to automate, not just which workflow)
- Human-in-the-loop is appropriate for high-stakes irreversible decisions; deterministic automation appropriate for low-stakes reversible
- AI recommendation acceptance depends on evidence quality + confidence scoring + plain-English rationale
- The 17-platform "observe → recommend → execute → measure" loop is closing — 18-24 month competitive window

**Closing CTA heading**: "Build automation on a foundation of evidence"

---

## Index Update Procedure

After creating the 3 post files, update `apps/web-app/src/app/(public)/blog/page.tsx`:

1. Locate the `POSTS = [` array constant
2. Insert the 3 new entries at the TOP (index 0, 1, 2) so most-recent-first ordering is preserved
3. Each entry follows this structure:

```tsx
{
  slug: '<slug-as-created>',
  title: '<EXACT POST TITLE>',
  excerpt: '<1-2 sentence excerpt; 150-200 chars; lift the most compelling sentence from the opening>',
  date: '<ISO_DATE YYYY-MM-DD>',
  category: 'Process Intelligence' | 'Competitive' | 'AI & Automation',
  readTime: '<N> min read',
  hasPage: true,
},
```

DO NOT modify existing entries. DO NOT change the `CATEGORY_STYLES` map. DO NOT touch any other section of the file.

---

## Quality Bar

Each post MUST satisfy ALL of:

1. **Length**: 1,200–2,000 words in `<p>` tags (excluding metadata + headings + CTA section)
2. **Structure**: 4–6 H2 section headings; opening hook (1–2 paragraphs); closing tie-back (1 emphasis paragraph)
3. **Voice**: confident but not aggressive; precise but readable; no marketing fluff ("revolutionary", "game-changing", "world-class")
4. **Specificity**: include at least 2 concrete examples (named scenarios, specific numbers, specific tools)
5. **Brand-voice consistency**: align with existing `why-your-sops-are-already-outdated` post tone — measured, evidence-driven, slightly contrarian
6. **SEO**: title 50–60 chars; meta description 140–160 chars; H1 matches title exactly; at least 1 H2 contains a key phrase relevant to the topic
7. **No emojis** unless contextually necessary (e.g., a checkmark in a list — but prefer Lucide icons)
8. **No bullet-point listicles** — always full paragraphs (the existing blog format is essay-style)
9. **Internal linking** (optional): reference `/product` or `/pricing` in the closing CTA section, never inline in body
10. **No fabricated competitor pricing**: only use public figures or "starts at $X" framing; cite source category if precise figure used (e.g., "per Vendr's published Celonis pricing data")

---

## Forbidden Patterns

- DO NOT generate posts that all 3 sound the same — each must have distinct angle + voice
- DO NOT write listicles or "top 10" formats — Ledgerium blog is essay-driven
- DO NOT use first-person plural ("we believe...", "we think...") more than 2 times per post
- DO NOT use Ledgerium-specific internal jargon without first defining it (e.g., "N-attribution" → explain on first use)
- DO NOT include images or media references (Ledgerium blog is currently text-only)
- DO NOT promote pricing changes or product features that don't exist yet (e.g., Workspace multi-user is on the roadmap; don't claim it's live)
- DO NOT claim certifications Ledgerium doesn't have (e.g., SOC 2 — defer to "we're building toward compliance" framing)

---

## Workflow Sequence

When `/blogifier` is invoked, execute these steps in order:

### Step 1 — Determine today's date

Use the current date in `YYYY-MM-DD` format (ISO 8601). This becomes:
- The `dateTime` attribute on `<time>` elements
- The slug suffix
- The `date` field in the index `POSTS` array
- The basis for the human-readable date in the post header (e.g., "May 18, 2026")

### Step 2 — Check for collision

Glob `apps/web-app/src/app/(public)/blog/*-<TODAY>/` to check if posts already exist for this date. If yes, append a sequence number (`-2`, `-3`) to the new slugs to avoid collision.

### Step 3 — Generate content

For each of the 3 topics, generate:
- A title (60 chars max; SEO-strong)
- A meta description (140–160 chars; matches title intent)
- A slug (descriptive prefix + date)
- 4–6 H2 sections with full paragraphs
- 1–2 emphasis paragraphs (with `text-[var(--content-primary)] font-medium` class)
- A read time estimate (~250 words/minute)
- An excerpt for the index (150–200 chars)

Vary the title formulas across invocations (don't always use the same one). Pick a fresh angle each time the skill is run.

### Step 4 — Create the 3 page.tsx files

Write each file at `apps/web-app/src/app/(public)/blog/<slug>/page.tsx` using the template structure above.

### Step 5 — Update blog index

Modify `apps/web-app/src/app/(public)/blog/page.tsx`:
- Read the file
- Locate `const POSTS = [`
- Insert 3 new entries at index 0, 1, 2 (most-recent first)
- Preserve all existing entries unchanged

### Step 6 — Validate

Run:
```bash
pnpm --filter @ledgerium/web-app typecheck
pnpm --filter @ledgerium/web-app test
```

Both must pass. If typecheck fails on unrelated files (e.g., an in-progress agent's working tree), narrow to the new blog files only or document the unrelated failure.

### Step 7 — Commit

Stage:
- The 3 new `page.tsx` files
- The modified blog index `page.tsx`

Commit with message:
```
content(blog): publish 3 posts for <TODAY> — process intelligence + competitive + AI/automation

- <slug-1>: <Title 1>
- <slug-2>: <Title 2>
- <slug-3>: <Title 3>

All 3 posts shipped via /blogifier skill. Index updated; existing posts preserved.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

DO NOT push. The user will push manually.

### Step 8 — Report

Output a concise summary:
- Today's date
- 3 slugs created
- 3 titles
- Test count delta (expected: no change in existing test count; new blog pages don't add tests unless explicitly tested)
- Typecheck result
- Commit SHA
- Push reminder

---

## Example Output Summary Format

```
/blogifier — 3 posts published for 2026-05-18

Posts created:
1. process-intelligence: the-observation-gap-process-intelligence-2026-05-18
   "The Observation Gap in Process Documentation"
   1,540 words · 6 min read

2. competitive: ledgerium-vs-celonis-deterministic-process-mining-2026-05-18
   "Ledgerium vs. Celonis: Deterministic Process Mining for SMBs"
   1,720 words · 7 min read

3. ai-automation: ai-agents-need-process-baselines-browser-workflows-2026-05-18
   "Why AI Agents Need a Process Baseline (And How to Build One)"
   1,610 words · 7 min read

Index updated: apps/web-app/src/app/(public)/blog/page.tsx
  POSTS array: 3 → 6 entries (most-recent-first order preserved)

Validation:
  pnpm typecheck: clean
  pnpm test: <N> / <N> unchanged (no new tests; content-only change)

Commit: <SHA>
Push: git push origin main
```

---

## Skill Self-Discipline

If you (Claude) are invoked via `/blogifier` and cannot determine today's date, ASK the user for it before proceeding. Do not guess. Do not use a placeholder date.

If any of the 3 posts produces a slug that already exists at any path (including non-`/blog/` paths), append `-2` (or `-3`, `-4`...) until unique.

If you generate content that violates the Forbidden Patterns section, regenerate that specific post before writing the file.

If `pnpm typecheck` fails on the blog files (rare; only if you made syntax errors), fix the syntax — don't bypass.

---

*End of /blogifier skill definition. Run with no arguments.*
