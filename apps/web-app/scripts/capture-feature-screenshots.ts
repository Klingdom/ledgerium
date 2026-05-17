/**
 * Capture feature-documentation screenshots from the LIVE web-app.
 *
 * Drives Playwright against the running Next.js dev server (`pnpm dev`) using
 * the registry at `scripts/lib/feature-registry.ts`. Each capture state in
 * each feature entry produces one PNG at:
 *
 *   apps/web-app/public/img/help/feature-<id>-<state>.png
 *
 * These PNGs are consumed by:
 *  - `docs/help/<feature-id>.md` (source-of-truth markdown)
 *  - `apps/web-app/src/app/(public)/docs/page.tsx` (rendered docs site)
 *
 * Determinism contract (mirrors capture-marketing-screenshots.ts):
 *  - viewport pinned per-state (default 900×560 matches `<Image>` consumer)
 *  - device-scale-factor 2 (retina-quality output; PNG compression lossless)
 *  - colorScheme: 'dark' for all captures (only mode shipped)
 *  - waits for `document.fonts.ready` + 600ms paint settle before capture
 *  - explicit `clip` to viewport rectangle (prevents full-page scroll capture)
 *  - authenticated routes use Playwright auth state from `e2e/.auth/user.json`
 *  - public routes capture without auth (no cookie injection)
 *
 * Usage:
 *   # All features × all states
 *   pnpm --filter @ledgerium/web-app exec tsx scripts/capture-feature-screenshots.ts
 *
 *   # One feature, all its states
 *   pnpm --filter @ledgerium/web-app exec tsx scripts/capture-feature-screenshots.ts --feature dashboard
 *
 *   # One feature, one state
 *   pnpm --filter @ledgerium/web-app exec tsx scripts/capture-feature-screenshots.ts --feature dashboard --state empty
 *
 *   # Override base URL (default http://localhost:3000)
 *   BASE_URL=http://localhost:3001 pnpm --filter @ledgerium/web-app exec tsx scripts/capture-feature-screenshots.ts
 *
 * Prerequisites:
 *   1. `pnpm --filter @ledgerium/web-app dev` running on BASE_URL (default :3000)
 *   2. For authenticated captures: `apps/web-app/e2e/.auth/user.json` exists
 *      (regenerate via `pnpm --filter @ledgerium/web-app exec playwright test
 *      --project=setup` if missing)
 *
 * Consumers:
 *  - `.claude/agents/docs-engineer.md` invokes this as DELIVERY RECIPE Step 3
 */

import { chromium, type BrowserContext } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, statSync } from 'node:fs';

import {
  FEATURE_REGISTRY,
  DEFAULT_VIEWPORT,
  DEVICE_SCALE_FACTOR,
  captureOutputPath,
  type Feature,
  type CaptureState,
} from './lib/feature-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WEB_APP_ROOT = resolve(__dirname, '..');
const HELP_IMG_DIR = resolve(WEB_APP_ROOT, 'public', 'img', 'help');
const AUTH_STATE_PATH = resolve(WEB_APP_ROOT, 'e2e', '.auth', 'user.json');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const FONT_PAINT_SETTLE_MS = 600;
const NAVIGATION_TIMEOUT_MS = 30_000;
const SETUP_TIMEOUT_MS = 10_000;

// ── CLI argument parsing ──────────────────────────────────────────────────────

interface CliOptions {
  featureId?: string;
  state?: string;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const opts: CliOptions = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--feature') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--feature flag requires a value (e.g. --feature dashboard)');
      }
      opts.featureId = next;
      i++;
    } else if (arg === '--state') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('--state flag requires a value (e.g. --state empty)');
      }
      opts.state = next;
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(readHelp());
      process.exit(0);
    } else {
      throw new Error(`Unknown flag: ${arg}. Run with --help for usage.`);
    }
  }
  return opts;
}

function readHelp(): string {
  return `
capture-feature-screenshots.ts — Playwright capture for Ledgerium help docs

USAGE
  pnpm --filter @ledgerium/web-app exec tsx scripts/capture-feature-screenshots.ts [OPTIONS]

OPTIONS
  --feature <id>      Capture only the named feature (e.g. --feature dashboard)
  --state <state>     Capture only the named state (requires --feature)
  --help, -h          Show this message

ENVIRONMENT
  BASE_URL            Override the dev server URL (default http://localhost:3000)

PREREQUISITES
  1. pnpm --filter @ledgerium/web-app dev   (running on BASE_URL)
  2. apps/web-app/e2e/.auth/user.json        (for authenticated captures)

OUTPUT
  apps/web-app/public/img/help/feature-<id>-<state>.png
`.trim();
}

// ── Plan ──────────────────────────────────────────────────────────────────────

interface PlannedCapture {
  feature: Feature;
  capture: CaptureState;
  outputPath: string;
}

function buildPlan(opts: CliOptions): PlannedCapture[] {
  let features: readonly Feature[] = FEATURE_REGISTRY;

  if (opts.featureId) {
    features = FEATURE_REGISTRY.filter((f) => f.id === opts.featureId);
    if (features.length === 0) {
      const known = FEATURE_REGISTRY.map((f) => f.id).join(', ');
      throw new Error(
        `Unknown feature id: ${opts.featureId}. Known features: ${known}`
      );
    }
  }

  const plan: PlannedCapture[] = [];
  for (const feature of features) {
    let captures: readonly CaptureState[] = feature.captures;
    if (opts.state) {
      captures = feature.captures.filter((c) => c.state === opts.state);
      if (captures.length === 0) {
        const known = feature.captures.map((c) => c.state).join(', ');
        throw new Error(
          `Unknown state "${opts.state}" for feature "${feature.id}". Known states: ${known}`
        );
      }
    }
    for (const capture of captures) {
      plan.push({
        feature,
        capture,
        outputPath: resolve(WEB_APP_ROOT, captureOutputPath(feature.id, capture.state)),
      });
    }
  }

  return plan;
}

// ── Capture engine ────────────────────────────────────────────────────────────

async function captureOne(
  authContext: BrowserContext,
  publicContext: BrowserContext,
  planned: PlannedCapture,
  index: number,
  total: number
): Promise<void> {
  const { feature, capture, outputPath } = planned;
  const label = `[${index + 1}/${total}] ${feature.id} :: ${capture.state}`;

  const viewport = capture.viewport ?? DEFAULT_VIEWPORT;
  const requiresAuth = capture.requiresAuth !== false; // default true
  const context = requiresAuth ? authContext : publicContext;

  const beforeStat = existsSync(outputPath) ? statSync(outputPath) : null;

  console.log(`\n${label}`);
  console.log(`  url:      ${BASE_URL}${capture.url}`);
  console.log(`  viewport: ${viewport.width}×${viewport.height} @ ${DEVICE_SCALE_FACTOR}x`);
  console.log(`  auth:     ${requiresAuth ? 'authenticated' : 'public'}`);
  console.log(`  output:   ${outputPath}`);
  if (beforeStat) {
    console.log(
      `  before:   ${beforeStat.size.toLocaleString()} bytes, mtime ${beforeStat.mtime.toISOString()}`
    );
  } else {
    console.log(`  before:   <file does not exist>`);
  }

  const page = await context.newPage();
  await page.setViewportSize(viewport);

  try {
    const fullUrl = `${BASE_URL}${capture.url}`;
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: NAVIGATION_TIMEOUT_MS });

    // Web fonts (Inter) must finish loading before snapshot.
    await page.evaluate(async () => {
      if (document.fonts && typeof (document.fonts as { ready?: Promise<unknown> }).ready?.then === 'function') {
        await document.fonts.ready;
      }
    });

    // Optional setup (open drawer, click picker, etc.) BEFORE paint-settle so
    // any state changes complete before the final settle window.
    if (capture.setup) {
      await Promise.race([
        capture.setup(page),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`setup timed out after ${SETUP_TIMEOUT_MS}ms`)), SETUP_TIMEOUT_MS)
        ),
      ]);
    }

    // Paint settle — covers post-setup layout reflow + post-font-load reflow.
    await page.waitForTimeout(FONT_PAINT_SETTLE_MS);

    // Ensure output directory exists.
    mkdirSync(HELP_IMG_DIR, { recursive: true });

    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    });
  } finally {
    await page.close();
  }

  const afterStat = statSync(outputPath);
  const delta = beforeStat ? afterStat.size - beforeStat.size : afterStat.size;
  const sign = delta >= 0 ? '+' : '';
  console.log(
    `  after:    ${afterStat.size.toLocaleString()} bytes, mtime ${afterStat.mtime.toISOString()}`
  );
  console.log(`  delta:    ${sign}${delta.toLocaleString()} bytes`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const plan = buildPlan(opts);

  if (plan.length === 0) {
    console.log('[capture] no captures matched the filter; nothing to do.');
    return;
  }

  // Determine whether auth state is needed at all (skip auth setup if all
  // planned captures are public).
  const anyRequiresAuth = plan.some((p) => p.capture.requiresAuth !== false);

  if (anyRequiresAuth && !existsSync(AUTH_STATE_PATH)) {
    throw new Error(
      `Auth state required but not found at ${AUTH_STATE_PATH}. ` +
        `Generate it via: pnpm --filter @ledgerium/web-app exec playwright test --project=setup`
    );
  }

  console.log(
    `[capture] capturing ${plan.length} screenshot${plan.length === 1 ? '' : 's'} ` +
      `against ${BASE_URL}…`
  );
  if (anyRequiresAuth) {
    console.log(`[capture] auth state: ${AUTH_STATE_PATH}`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const baseContextOptions = {
      viewport: DEFAULT_VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      colorScheme: 'dark' as const,
    };

    const authContext = anyRequiresAuth
      ? await browser.newContext({
          ...baseContextOptions,
          storageState: AUTH_STATE_PATH,
        })
      : await browser.newContext(baseContextOptions);

    const publicContext = await browser.newContext(baseContextOptions);

    try {
      for (let i = 0; i < plan.length; i++) {
        await captureOne(authContext, publicContext, plan[i]!, i, plan.length);
      }
    } finally {
      await authContext.close();
      await publicContext.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n[capture] all ${plan.length} capture${plan.length === 1 ? '' : 's'} complete.`);
}

main().catch((err: unknown) => {
  console.error('[capture] FAILED:', err);
  process.exit(1);
});
