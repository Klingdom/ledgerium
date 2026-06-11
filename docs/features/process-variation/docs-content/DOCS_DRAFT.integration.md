# Integration plan — process-variants docs section
# Date: 2026-06-11
# Hands off to: frontend-engineer
# Source of truth: DOCS_DRAFT.md in this directory

Applies to: `apps/web-app/src/app/(public)/docs/page.tsx`

---

## 1. SIDEBAR_LINKS addition

In the `SIDEBAR_LINKS` array (around line 17), insert after the
`workflow-detail` entry:

```ts
{ id: 'process-variants', label: 'Process Variants' },
```

The array entry after `process-variants` should remain `process-intelligence`.

---

## 2. Section 3.1 — Process Map: four-mode paragraph addition

Locate the existing H3 at approximately line 1024:

```tsx
<H3 id="process-map">3.1 Process Map (Workflow tab)</H3>
<P>
  The Workflow tab renders your recorded process as an interactive visual
  map. It has multiple display modes selectable from the sub-toolbar.
</P>
```

After that `<P>`, and BEFORE the `<H4>Flow Intelligence mode (default)</H4>`,
insert:

```tsx
<Screenshot
  src="/docs/screenshots/workflow-process-map.png"
  alt="Workflow tab sub-toolbar showing four mode buttons: Flow Intelligence (active), Swimlane, Process Variants, and System Interaction."
  caption="The Workflow tab mode switcher. Four views of the same recording data."
/>

<P>The four modes give you different views of the same recording data:</P>
<UL>
  <li>
    <strong className="text-[var(--content-primary)]">Flow Intelligence</strong>{' '}
    (default) — Step-by-step execution path with phases, decisions, and
    friction points.
  </li>
  <li>
    <strong className="text-[var(--content-primary)]">Swimlane</strong> —
    Cross-functional view organised by system or application, one lane per
    tool detected.
  </li>
  <li>
    <strong className="text-[var(--content-primary)]">Process Variants</strong>{' '}
    — Shows how the process differs across multiple recordings of the same
    workflow. Requires at least two recordings of the same process.
  </li>
  <li>
    <strong className="text-[var(--content-primary)]">System Interaction</strong>{' '}
    — Cross-system handoffs and integration patterns, focused on where work
    moves between applications.
  </li>
</UL>
<P>
  Select any mode using the toggle in the sub-toolbar. The selected recording
  does not change — only the view changes.
</P>
```

No existing content in section 3.1 is removed.

---

## 3. New section — after section 3.1, before section 3.2

After the existing `<SectionDivider />` that follows section 3.1 (around
line 1090 in the current file), insert the following block in full. This
becomes section 3.2 "Process variants" and pushes the existing 3.2–3.8
labels to 3.3–3.9 — OR insert at the end of the Workflow Detail `<section>`
block (before section 4) to avoid renumbering. Either placement is acceptable;
the id `process-variants` is the canonical anchor.

```tsx
<SectionDivider />

<H2 id="process-variants">3.x Process variants</H2>
<p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
  When you record the same process more than once, Ledgerium compares the
  recordings to show how execution varied across runs — which steps were
  always taken, where paths diverged, and how often each path was followed.
</p>

<H3>What it is</H3>
<P>
  Variation detection is based entirely on what was observed in the recordings.
  The tool reports the frequency of each execution path and the steps where
  paths diverge or rejoin. It does not infer the conditions that caused a run
  to take one path versus another.
</P>

<H3>How to open it</H3>
<StepList
  steps={[
    <>Open any workflow from your dashboard.</>,
    <>Click the <strong className="text-[var(--content-primary)]">Workflow</strong> tab.</>,
    <>In the sub-toolbar, select{' '}
      <strong className="text-[var(--content-primary)]">Process Variants</strong>.
    </>,
  ]}
/>

<Screenshot
  src="/docs/screenshots/workflow-variants-map.png"
  alt="Process Variants map view showing a green standard-path spine with amber dashed branches peeling off and rejoining. The header reads '62% of 8 runs follow the standard path. 2 branches off and rejoin.'"
  caption="The Process Variants map — green spine is the most-common path; amber branches show where some runs took different steps."
/>

<Note>
  Variant analysis requires at least two recordings of the same process. If
  you have only one recording, the view shows a single-path summary instead.
  See{' '}
  <a href="#process-variants-single" className="text-brand-400 hover:underline">
    Single recording state
  </a>{' '}
  below.
</Note>

<SectionDivider />

<H3 id="process-variants-map">The variant map</H3>
<P>
  The map renders on an interactive canvas (scroll to zoom, drag to pan).
</P>
<UL>
  <li>
    <strong className="text-[var(--content-primary)]">Green spine</strong> —
    the backbone path followed by the largest share of runs. Solid green edges
    connect each backbone step in sequence.
  </li>
  <li>
    <strong className="text-[var(--content-primary)]">Amber branches</strong>{' '}
    — paths that diverge from the spine and later rejoin. A dashed amber edge
    leaves the backbone at the divergence point, one or more steps occur on the
    branch, and a dashed amber rejoin edge returns to the backbone. Each branch
    edge is labelled with the run count and percentage (for example:
    &ldquo;2 runs · 25%&rdquo;).
  </li>
  <li>
    <strong className="text-[var(--content-primary)]">&ldquo;diverges&rdquo; marker</strong>{' '}
    — steps that act as branch points carry a small &ldquo;diverges&rdquo;
    label in the node.
  </li>
  <li>
    <strong className="text-[var(--content-primary)]">Step nodes</strong> —
    each node shows the step category (for example: Navigation, Data Entry,
    Send). Backbone nodes have a green tint; branch nodes have an amber tint.
  </li>
</UL>
<P>
  The header bar summarises the data: how many runs follow the standard path
  as a percentage, the total run count, and the number of distinct branches.
  For example: &ldquo;62% of 8 runs follow the standard path. 2 branches off
  and rejoin.&rdquo;
</P>

<H4>Complexity slider</H4>
<P>
  When there are multiple branches, a slider in the top-right corner of the
  map controls how many branches are visible at once. Drag it left to show
  fewer branches (the most-frequent ones remain); drag it right to show all.
  The slider is labelled &ldquo;showing N/M&rdquo; where N is the current
  count and M is the total.
</P>

<H4>Clicking a branch for evidence</H4>
<P>
  Click any edge on the map to see which recordings took that path. A panel at
  the bottom of the canvas lists the run IDs for the selected edge. Click the
  close button (✕) to dismiss it.
</P>

<Screenshot
  src="/docs/screenshots/workflow-variants-evidence.png"
  alt="Variant map with a branch edge selected. A panel at the bottom reads '2 runs took this path' and lists run IDs. A close button sits at the right edge."
  caption="Click any edge to see which recordings took that path."
/>

<SectionDivider />

<H3 id="process-variants-dna">The DNA strip</H3>
<P>
  Select <strong className="text-[var(--content-primary)]">DNA</strong> in the
  view toggle (top right of the Variants canvas) to switch to the DNA strip
  view. This presents each recorded path as a horizontal row of colour-coded
  step tokens, sorted from most to least frequent.
</P>

<Screenshot
  src="/docs/screenshots/workflow-variants-dna.png"
  alt="Variants DNA view showing four rows of colour-coded step tokens. The first row is labelled 'Standard Path · 50% · 4 runs'. Some tokens in the later rows have amber outlines indicating divergence from the standard path."
  caption="DNA view — each row is one recorded path. Amber-outlined tokens are steps that differ from the standard path."
/>

<P>What to read in each row:</P>
<UL>
  <li>
    <strong className="text-[var(--content-primary)]">Path label</strong> —
    the name for this path and its percentage and run count.
  </li>
  <li>
    <strong className="text-[var(--content-primary)]">Colour-coded tokens</strong>{' '}
    — each token represents one step, coloured by category. Hover over a token
    to see the category name.
  </li>
  <li>
    <strong className="text-[var(--content-primary)]">Amber outline</strong>{' '}
    — a token with an amber outline is a step that differs from the standard
    path at that position.
  </li>
</UL>
<Tip>
  Use the DNA view to scan many paths at once. The map view is better for
  understanding flow structure; the DNA view is better for spotting exactly
  which steps differ.
</Tip>

<SectionDivider />

<H3 id="process-variants-list">The list view</H3>
<P>
  Select <strong className="text-[var(--content-primary)]">List</strong> in
  the view toggle to open the path detail panel. The list view has two areas.
</P>

<H4>Left rail — path cards</H4>
<P>One card per distinct execution path. Each card shows:</P>
<UL>
  <li>
    A role badge:{' '}
    <strong className="text-[var(--content-primary)]">Standard Path</strong>{' '}
    (green),{' '}
    <strong className="text-[var(--content-primary)]">Fastest</strong>{' '}
    (blue),{' '}
    <strong className="text-[var(--content-primary)]">Longest</strong>{' '}
    (amber),{' '}
    <strong className="text-[var(--content-primary)]">Exception Heavy</strong>{' '}
    (red), or{' '}
    <strong className="text-[var(--content-primary)]">Variant</strong>{' '}
    (indigo).
  </li>
  <li>The path label and frequency percentage.</li>
  <li>Step count, average duration, and run count.</li>
  <li>A frequency bar showing the path&rsquo;s share of all runs.</li>
  <li>
    A{' '}
    <strong className="text-[var(--content-primary)]">Compare vs Standard</strong>{' '}
    button on non-standard paths.
  </li>
</UL>

<H4>Right panel — path detail</H4>
<P>When a path is selected, the right panel shows:</P>
<UL>
  <li>
    A summary row with five metrics: frequency (percentage and run count), step
    count with delta versus the standard, average duration with delta, divergence
    point count, and error step count.
  </li>
  <li>
    A <strong className="text-[var(--content-primary)]">step sequence list</strong>{' '}
    showing every step in this path with its category and duration. Steps where
    this path diverges from the standard are highlighted in amber and labelled{' '}
    <strong className="text-[var(--content-primary)]">DIVERGES</strong>.
  </li>
  <li>Click any step to highlight that node in the inspector panel.</li>
</UL>

<Screenshot
  src="/docs/screenshots/workflow-variants-list.png"
  alt="Variants list view. Left rail shows three path cards with role badges: Standard Path (green), Fastest (blue), Exception Heavy (red). Right panel shows five metric tiles and a step sequence list with one step labelled DIVERGES in amber."
  caption="List view — select any path to inspect its steps and compare it to the standard."
/>

<H4>Comparing two paths</H4>
<P>
  On any non-standard path card, click{' '}
  <strong className="text-[var(--content-primary)]">Compare vs Standard</strong>{' '}
  to overlay a side-by-side comparison showing both paths with their step counts,
  durations, and percentage frequency. Use the{' '}
  <strong className="text-[var(--content-primary)]">Quick Compare</strong>{' '}
  shortcuts at the bottom of the left rail to jump to the most common pairings.
</P>

<H4>Path insights</H4>
<P>
  Below the step sequence, the panel may show{' '}
  <strong className="text-[var(--content-primary)]">Path Insights</strong>{' '}
  cards. These surface observations derived from the recorded data:
</P>

<TableWrap>
  <thead>
    <tr>
      <TH>Insight</TH>
      <TH>Meaning</TH>
    </tr>
  </thead>
  <tbody>
    {[
      [
        'Low Adherence',
        'The standard path accounts for less than 50% of runs — most recordings took a different route.',
      ],
      [
        'Faster Alternative',
        'This path is faster than the standard on average.',
      ],
      [
        'Exception-Heavy Path',
        'This path contains two or more error-handling steps.',
      ],
      [
        'Extra Steps Detected',
        'This path has more than two steps beyond the standard path count.',
      ],
      [
        'Friction in Standard Path',
        'Friction points are present in the standard path.',
      ],
    ].map(([insight, meaning]) => (
      <tr key={insight}>
        <TD><strong className="text-[var(--content-primary)]">{insight}</strong></TD>
        <TD>{meaning}</TD>
      </tr>
    ))}
  </tbody>
</TableWrap>

<Note>
  Path insights describe what was observed in the recordings. They do not
  explain why runs took different paths.
</Note>

<SectionDivider />

<H3 id="process-variants-single">Single recording state</H3>
<P>
  If you open the Variants mode on a workflow that has only one recording,
  the view shows a single-path summary. A blue banner reads: &ldquo;Single
  recording — no variants to compare yet. Record this workflow multiple times
  to discover how the process varies across runs.&rdquo; The step sequence for
  that single recording is shown below the banner.
</P>

<H3>Consistent process state</H3>
<P>
  If you have recorded the same workflow more than once and every recording
  followed the exact same sequence of steps, the Variants view shows a green
  banner reading: &ldquo;Consistent process — N runs, all the same path. All
  N recordings followed the identical sequence, so there is no variation to
  compare yet.&rdquo; No DNA strip or branch map appears.
</P>
<Tip>
  A consistent result across multiple runs means the process was executed the
  same way every time — useful evidence for standardisation work.
</Tip>

<SectionDivider />

<H3>Plan availability</H3>
<P>
  Variant analysis is a{' '}
  <strong className="text-[var(--content-primary)]">Team plan</strong>{' '}
  feature. On Free and Starter plans, selecting Process Variants mode shows an
  upgrade prompt. The{' '}
  <a href="/pricing" className="text-brand-400 hover:underline">
    See plans →
  </a>{' '}
  link goes to the pricing page.
</P>
<Warning>
  If you see &ldquo;This recording isn&rsquo;t analyzed yet&rdquo; instead of
  the variant map, the workflow is still being processed. Wait a moment and
  click <strong className="text-[var(--content-primary)]">Retry</strong>, or
  reload the page.
</Warning>

<SectionDivider />

<H3>Common questions</H3>
<dl className="space-y-4">
  <div>
    <dt className="font-semibold text-[var(--content-primary)] mb-1">
      How many recordings do I need before the variant map appears?
    </dt>
    <dd className="text-[var(--content-primary)] leading-relaxed">
      Two. As soon as you have two or more recordings of the same process,
      the variant map can show whether they followed the same or different
      paths.
    </dd>
  </div>
  <div>
    <dt className="font-semibold text-[var(--content-primary)] mb-1">
      Why does the map show &ldquo;62% of 8 runs&rdquo; — where does
      Ledgerium find 8 runs?
    </dt>
    <dd className="text-[var(--content-primary)] leading-relaxed">
      Ledgerium groups recordings by process similarity. All recordings of
      the same process are included in the variant analysis. In this example,
      8 separate recordings exist for this workflow.
    </dd>
  </div>
  <div>
    <dt className="font-semibold text-[var(--content-primary)] mb-1">
      Does Ledgerium tell me why a run took a different path?
    </dt>
    <dd className="text-[var(--content-primary)] leading-relaxed">
      No. The tool shows observed frequencies — how often each path was taken
      and at which steps paths diverged or rejoined. It does not infer the
      conditions or business rules that caused a run to branch. Branch labels
      show run counts and percentages only.
    </dd>
  </div>
  <div>
    <dt className="font-semibold text-[var(--content-primary)] mb-1">
      What does the complexity slider do?
    </dt>
    <dd className="text-[var(--content-primary)] leading-relaxed">
      It controls how many branches are visible on the map at once.
      Low-frequency branches can be hidden to keep the canvas readable. All
      branches are still recorded; the slider is display-only.
    </dd>
  </div>
  <div>
    <dt className="font-semibold text-[var(--content-primary)] mb-1">
      The &ldquo;Fastest&rdquo; badge is on a path with fewer steps — is that
      just because it skips steps?
    </dt>
    <dd className="text-[var(--content-primary)] leading-relaxed">
      Yes, if a path skips steps it will usually run faster. The Fastest badge
      marks the path with the lowest average recorded duration. The step count
      delta on the path card (for example, &ldquo;-2 steps vs std&rdquo;)
      tells you how many fewer steps that path used.
    </dd>
  </div>
</dl>
```

---

## 4. Screenshot file locations

All five screenshots land at:

```
apps/web-app/public/docs/screenshots/workflow-process-map.png
apps/web-app/public/docs/screenshots/workflow-variants-map.png
apps/web-app/public/docs/screenshots/workflow-variants-evidence.png
apps/web-app/public/docs/screenshots/workflow-variants-dna.png
apps/web-app/public/docs/screenshots/workflow-variants-list.png
```

(The existing screenshots in that directory use the path prefix
`/docs/screenshots/` in their `<Image src>` attributes — confirm this is served
from `public/docs/screenshots/` in the Next.js static tree before committing.)

---

## 5. Verification checklist

After applying the patch:

```bash
# Dev server
pnpm --filter @ledgerium/web-app dev

# Navigate to /docs#process-variants and confirm:
# - Section is reachable via the sidebar link
# - All five screenshots load at 900×560 without distortion
# - All internal anchor links resolve (#process-variants-map,
#   #process-variants-dna, #process-variants-list, #process-variants-single)
# - No marketing adjectives present (grep check):
grep -iE '(amazing|powerful|intelligent|magical|delightful|revolutionary|seamless|effortless)' \
  apps/web-app/src/app/\(public\)/docs/page.tsx && echo "FAIL" || echo "PASS"

# TypeScript
pnpm --filter @ledgerium/web-app typecheck

# If the docs E2E spec exists:
pnpm --filter @ledgerium/web-app exec playwright test e2e/public/docs.spec.ts
```
