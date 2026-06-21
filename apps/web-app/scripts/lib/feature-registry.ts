/**
 * Feature documentation registry — drives the Playwright capture + docs pipeline.
 *
 * Each entry maps one user-facing product feature to:
 *  - the route(s) where it lives
 *  - the capture states (empty / sparse / loaded / error / gated / interactive)
 *  - the sidebar anchor used in `apps/web-app/src/app/(public)/docs/page.tsx`
 *  - audience + read-time metadata for the markdown frontmatter
 *
 * Consumed by:
 *  - `apps/web-app/scripts/capture-feature-screenshots.ts` (capture engine)
 *  - `.claude/agents/docs-engineer.md` (Docs Engineer agent — DELIVERY RECIPE Step 2)
 *
 * Determinism contract:
 *  - capture `id` and `state` strings are stable; never include `Date.now()`,
 *    hashes, or random
 *  - `setup` functions must be deterministic — same starting state → same DOM
 *  - same registry → same screenshot set on every CI run
 *
 * Style:
 *  - `id` is kebab-case, matches the markdown filename `docs/help/<id>.md`
 *  - `sidebarAnchor` matches the `id` field in `docs/page.tsx` SIDEBAR_LINKS
 *    AND the `<H2 id="...">` attribute — drift across the three IS a defect
 *  - `label` is sentence case ("Workflow detail view"), not Title Case
 *
 * @see .claude/agents/docs-engineer.md — agent that consumes this registry
 * @see apps/web-app/src/app/(public)/docs/page.tsx — render target style reference
 * @see apps/web-app/scripts/capture-marketing-screenshots.ts — Playwright pattern reference
 */

import type { Page } from '@playwright/test';

// ── Capture state ─────────────────────────────────────────────────────────────

/**
 * One viewState worth screenshotting for a feature. Common states:
 *  - `'loaded'`     — typical productive state (the default for most features)
 *  - `'empty'`      — zero records / first-use state
 *  - `'sparse'`     — 1-2 records / under-threshold state (e.g. healthScore comparison
 *                     needs ≥3 workflows to render)
 *  - `'error'`      — API failure or validation error
 *  - `'gated'`      — plan-tier-locked surface; free user looking at Team feature
 *  - `'interactive-<thing>'` — a drawer / modal / picker is open (e.g.
 *                     `'interactive-column-picker'`)
 *
 * The `setup` function runs AFTER `page.goto(url)` but BEFORE the screenshot.
 * Use it to open drawers, click pickers, dismiss modals, seed data, etc.
 * Setup MUST be deterministic — same input DOM → same output DOM.
 */
export interface CaptureState {
  /** Stable kebab-case identifier; filename slug component. */
  readonly state: string;
  /** Route under `apps/web-app/` to navigate to. Use leading `/`. */
  readonly url: string;
  /** Human-readable description of what this state shows. */
  readonly description: string;
  /** Optional Playwright setup after `goto`, before screenshot. */
  readonly setup?: (page: Page) => Promise<void>;
  /** Whether this capture requires the authenticated user fixture. Default true. */
  readonly requiresAuth?: boolean;
  /**
   * Optional viewport override. Default: 900×560 (matches `<Image>` consumer
   * in docs/page.tsx). Captured at 2× device-scale-factor so on-disk PNG is
   * 1800×1120.
   */
  readonly viewport?: { width: number; height: number };
}

// ── Feature entry ─────────────────────────────────────────────────────────────

export type FeatureCategory =
  | 'getting-started'
  | 'core'
  | 'collaboration'
  | 'admin'
  | 'troubleshooting';

export type FeatureAudience = 'new-user' | 'returning-user' | 'admin' | 'developer';

export interface Feature {
  /** Kebab-case identifier; markdown filename slug; capture filename slug. */
  readonly id: string;
  /** User-facing feature label, sentence case. */
  readonly label: string;
  /** Matches the `id` in `docs/page.tsx` SIDEBAR_LINKS AND the `<H2 id="...">`. */
  readonly sidebarAnchor: string;
  /** Category for sidebar grouping in the rendered docs. */
  readonly category: FeatureCategory;
  /** Primary audience for the doc. */
  readonly audience: FeatureAudience;
  /** Estimated read time in minutes (integer; for frontmatter). */
  readonly estReadTimeMin: number;
  /** All viewStates the user might encounter; minimum one (usually `loaded`). */
  readonly captures: readonly CaptureState[];
  /** Optional related-features list (kebab-case ids). */
  readonly related?: readonly string[];
}

// ── Registry ──────────────────────────────────────────────────────────────────

/**
 * Default viewport for documentation screenshots — matches `<Image>` consumer
 * in `apps/web-app/src/app/(public)/docs/page.tsx` (width=900, height=560).
 *
 * Captured at 2× device-scale-factor (see capture-feature-screenshots.ts), so
 * on-disk PNG is 1800×1120.
 */
export const DEFAULT_VIEWPORT = { width: 900, height: 560 } as const;

/**
 * Device-scale-factor for retina-quality PNG output. Captured PNG resolution
 * is `viewport × DEVICE_SCALE_FACTOR` in each dimension.
 */
export const DEVICE_SCALE_FACTOR = 2 as const;

/**
 * The authoritative feature registry. Order matters: this is the order
 * features appear in the sidebar (group-by-category, preserve order within
 * each category).
 *
 * Add a new feature by appending an entry; the Docs Engineer agent does this
 * as part of DELIVERY RECIPE Step 2.
 */
export const FEATURE_REGISTRY: readonly Feature[] = [
  // ── Getting started ────────────────────────────────────────────────────────
  {
    id: 'install-extension',
    label: 'Install the Chrome extension',
    sidebarAnchor: 'install-extension',
    category: 'getting-started',
    audience: 'new-user',
    estReadTimeMin: 2,
    captures: [
      {
        state: 'loaded',
        url: '/install-extension',
        description: 'Extension install landing page — public route, no auth required.',
        requiresAuth: false,
      },
    ],
    related: ['dashboard'],
  },

  // ── Core ───────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard and workflow library',
    sidebarAnchor: 'dashboard',
    category: 'core',
    audience: 'returning-user',
    estReadTimeMin: 3,
    captures: [
      {
        state: 'loaded',
        url: '/dashboard',
        description: 'Workflow library populated with multiple workflows; default 30-day time range.',
      },
      {
        state: 'empty',
        url: '/dashboard',
        description: 'First-use empty state — no workflows recorded yet.',
        setup: async (_page) => {
          // Empty state requires a fresh test user with no workflows.
          // The capture script auto-detects via a flag in the auth state.
          // Override in the registry if a different seed pattern is needed.
        },
      },
      {
        state: 'interactive-column-picker',
        url: '/dashboard',
        description: 'Column picker drawer open — column customization UI (iter-061 Path D D+4).',
        setup: async (page) => {
          await page.click('[aria-label="Customize columns"]', { timeout: 5000 });
          await page.waitForSelector('[role="dialog"][aria-modal="true"]', { timeout: 3000 });
        },
      },
    ],
    related: ['workflow-detail', 'process-intelligence'],
  },

  {
    id: 'workflow-detail',
    label: 'Workflow detail view',
    sidebarAnchor: 'workflow-detail',
    category: 'core',
    audience: 'returning-user',
    estReadTimeMin: 4,
    captures: [
      {
        // Workflow tab (default): DFG process map + steps panel
        // Demo user "Customer support ticket triage" — 6 runs, sop+process_map artifacts
        state: 'loaded',
        url: '/workflows/a0c336a4-3a8f-4ee0-9b41-5582eb7eba82',
        description: 'Workflow tab — DFG frequency map and steps list for a 6-run workflow.',
        setup: async (page) => {
          // Default tab is 'workflow' — wait for the process map to render
          await page.waitForSelector('[data-testid="workflow-page-shell"], .react-flow, canvas', {
            timeout: 8000,
          }).catch(() => { /* map may not be present if no runs; proceed anyway */ });
          await page.waitForTimeout(1000);
        },
      },
      {
        // SOP tab: rendered SOP document
        state: 'sop',
        url: '/workflows/a0c336a4-3a8f-4ee0-9b41-5582eb7eba82',
        description: 'SOP tab — auto-generated standard operating procedure document.',
        setup: async (page) => {
          // Wait for content to load, then click the SOP tab.
          // Use data-testid to avoid strict-mode ambiguity with a secondary SOP button
          // that may appear in the workflow action bar.
          await page.waitForSelector('[data-testid="workflow-tab-sop"]', { timeout: 10000 });
          await page.waitForTimeout(500);
          await page.locator('[data-testid="workflow-tab-sop"]').click();
          await page.waitForTimeout(1500);
        },
      },
      {
        // Report tab: timestudy metrics, health score, variants, intelligence
        state: 'report',
        url: '/workflows/a0c336a4-3a8f-4ee0-9b41-5582eb7eba82',
        description: 'Report tab — timestudy metrics, health score, and variant analysis.',
        setup: async (page) => {
          // Wait for content to load, then click the Report tab.
          // Use data-testid for precision.
          await page.waitForSelector('[data-testid="workflow-tab-report"]', { timeout: 10000 });
          await page.waitForTimeout(500);
          await page.locator('[data-testid="workflow-tab-report"]').click();
          await page.waitForTimeout(2000);
        },
      },
    ],
    related: ['dashboard', 'process-intelligence', 'recommendations'],
  },

  {
    id: 'upload',
    label: 'Upload a workflow recording',
    sidebarAnchor: 'upload',
    category: 'core',
    audience: 'new-user',
    estReadTimeMin: 2,
    captures: [
      {
        state: 'loaded',
        url: '/upload',
        description: 'Upload page — drop-zone + manual file picker.',
      },
    ],
    related: ['install-extension', 'dashboard'],
  },

  {
    id: 'process-intelligence',
    label: 'Process intelligence',
    sidebarAnchor: 'process-intelligence',
    category: 'core',
    audience: 'returning-user',
    estReadTimeMin: 5,
    captures: [
      {
        state: 'loaded',
        url: '/analytics',
        description: 'Process intelligence dashboard with variants, bottlenecks, and conformance.',
      },
    ],
    related: ['dashboard', 'workflow-detail', 'recommendations'],
  },

  {
    id: 'recommendations',
    label: 'Recommendations center',
    sidebarAnchor: 'recommendations',
    category: 'core',
    audience: 'returning-user',
    estReadTimeMin: 3,
    captures: [
      {
        state: 'loaded',
        url: '/recommendations',
        description: 'Recommendations list — ranked automation + standardization opportunities.',
      },
    ],
    related: ['process-intelligence', 'workflow-detail'],
  },

  // ── Collaboration ──────────────────────────────────────────────────────────
  {
    id: 'teams',
    label: 'Teams and collaboration',
    sidebarAnchor: 'teams',
    category: 'collaboration',
    audience: 'admin',
    estReadTimeMin: 4,
    captures: [
      {
        state: 'loaded',
        url: '/teams',
        description: 'Teams list — owned + joined teams.',
      },
    ],
    related: ['account'],
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  {
    id: 'account',
    label: 'Account and settings',
    sidebarAnchor: 'account',
    category: 'admin',
    audience: 'returning-user',
    estReadTimeMin: 3,
    captures: [
      {
        state: 'loaded',
        url: '/account',
        description: 'Account settings — plan, billing, API keys, sign-out.',
      },
    ],
    related: ['teams'],
  },

  // ── Add new features by appending entries above. ───────────────────────────
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Look up a feature by id. Returns `undefined` if not in the registry.
 */
export function getFeatureById(id: string): Feature | undefined {
  return FEATURE_REGISTRY.find((f) => f.id === id);
}

/**
 * Look up one capture state for one feature. Returns `undefined` if either
 * the feature or the state is not registered.
 */
export function getCapture(featureId: string, state: string): CaptureState | undefined {
  const feature = getFeatureById(featureId);
  return feature?.captures.find((c) => c.state === state);
}

/**
 * Return all features in a given category, preserving registry order.
 */
export function getFeaturesByCategory(category: FeatureCategory): readonly Feature[] {
  return FEATURE_REGISTRY.filter((f) => f.category === category);
}

/**
 * Compute the absolute output path for a screenshot. Used by the capture
 * script + the docs-engineer agent for validation.
 *
 * Path is relative to `apps/web-app/`:
 *   `public/img/help/feature-<id>-<state>.png`
 */
export function captureOutputPath(featureId: string, state: string): string {
  return `public/img/help/feature-${featureId}-${state}.png`;
}

/**
 * Compute the markdown docs path for a feature. Relative to repo root:
 *   `docs/help/<id>.md`
 */
export function featureDocPath(featureId: string): string {
  return `docs/help/${featureId}.md`;
}

/**
 * Compute the integration-plan path for a feature. Relative to repo root:
 *   `docs/help/<id>.integration.md`
 */
export function featureIntegrationPath(featureId: string): string {
  return `docs/help/${featureId}.integration.md`;
}
