#!/usr/bin/env node
/**
 * Fails the build if any /api route was prerendered to a static file.
 *
 * WHY THIS EXISTS
 * ---------------
 * A Next.js 14 App Router route handler with no request input is eligible for
 * static prerendering. If it reads `process.env` at module scope, that read
 * happens at BUILD time and the result is frozen into
 * `.next/server/app/<route>.body`, served forever regardless of runtime config.
 *
 * This is not hypothetical. `/api/billing/sku-availability` shipped this way.
 * Our image is built in CI without Stripe env vars, so it baked
 * `{"starter":{"monthly":false,...}}`. Every purchase surface fail-closed on
 * that response and showed "Not available yet" for a plan whose price IDs were
 * correctly configured the entire time. Checkout was offline site-wide and
 * nothing in typecheck, unit tests, or the build log flagged it — the build
 * *succeeded*. The only visible symptom was a boolean being wrong in prod.
 *
 * An API route exists to compute a response per request. If it can be answered
 * at build time it either shouldn't be an API route, or it needs
 * `export const dynamic = 'force-dynamic'`. There is no third case, which is
 * why this gate is a hard failure rather than a warning.
 *
 * Detection is on build OUTPUT, not source. Asserting that source files contain
 * a `force-dynamic` string would pass while the build still emitted a static
 * file — it would test our intent instead of the artifact we actually ship.
 * A `.body` file next to a compiled route IS the prerendered response.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const API_DIR = join(process.cwd(), '.next', 'server', 'app', 'api');

if (!existsSync(API_DIR)) {
  console.error(
    '[assert-dynamic-api-routes] No .next/server/app/api directory.\n' +
      '  Run `pnpm build` before this check. Passing silently here would make\n' +
      '  the gate vacuous — a green check that verified nothing.',
  );
  process.exit(1);
}

/** Collect every prerendered `.body` file beneath the compiled /api tree. */
function findPrerendered(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findPrerendered(full));
    } else if (entry.endsWith('.body')) {
      found.push(full);
    }
  }
  return found;
}

const prerendered = findPrerendered(API_DIR);

if (prerendered.length > 0) {
  console.error('[assert-dynamic-api-routes] FAIL — API routes prerendered to static files:\n');
  for (const file of prerendered) {
    const route =
      '/' + relative(join(process.cwd(), '.next', 'server', 'app'), file).replace(/\.body$/, '').replace(/\\/g, '/');
    console.error(`  ${route}`);
  }
  console.error(
    '\n  These return a response frozen at build time. Any process.env read in\n' +
      '  them resolved against the BUILD environment, not production, and no\n' +
      '  runtime configuration can change the answer.\n' +
      '\n  Fix: add `export const dynamic = \'force-dynamic\';` to each route above.\n',
  );
  process.exit(1);
}

console.log(`[assert-dynamic-api-routes] OK — no API route is prerendered.`);
