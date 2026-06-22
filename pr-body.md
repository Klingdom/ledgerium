## Summary
Replaces the stale static-HTML-mockup demo with real current-state product across the home, product, and /demo pages, and adds a live interactive process-map embed.

**Commit 1 — demo refresh (`6a2c735`)**
- Real-app Playwright captures of all four core views (Workflow Dashboard, Workflow View, SOP View, Report View), staged to `public/img/demo/`.
- Home: hero + "Try the demo" + "Example Output" now render real screenshots; all `/dashboard.html` links → `/demo`; badge → "Measured, not estimated".
- Product: hero → real dashboard; 4-step tour recomposed to the 4-view story with per-view URL bars; OUTPUTS + Intelligence section use real views.
- Removed unshipped "AI Agent Composition" claim → shipped "Before / After ROI".
- `/demo`: 5 steps rewritten to the real product; stale callout → `/signup`.
- Pipeline reproducibility (`refresh-auth-state.ts` auth fix + `feature-registry` data-testid locators) + `docs/demo/DEMO_SCREENSHOTS_MANIFEST.md` anti-drift source-of-truth.

**Commit 2 — live process-map embed (`b224cde`)**
- The real `DfgFrequencyMap` (frequency/performance toggle + coverage slider) on `/demo`, no login, against a deterministic sample "Submit expense report" workflow (47 runs, 4 variants incl. a rework loop) built via the real `buildDirectlyFollowsGraph`.
- App-Router-safe: `ssr:false` dynamic isolated in a `'use client'` wrapper; `workflowId="demo"` keeps analytics filterable.
- 4 co-located fixture tests (all pass).

## Validation
- `pnpm --filter @ledgerium/web-app typecheck` — clean
- `demoDfgFixture.test.ts` — 4/4 pass
- No unused imports; zero remaining stale mockup references in `src`

## Reviewer notes
- Stale mockups (`public/dashboard.html`, `public/samples/*.html`, `public/img/screenshot-*.png`) left in place for a 30-day inbound-link audit (deprecated in the manifest), not yet deleted.
- Phase-2 candidates (not in this PR): "click any number → see source events" evidence-drill; passwordless seeded demo account.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
