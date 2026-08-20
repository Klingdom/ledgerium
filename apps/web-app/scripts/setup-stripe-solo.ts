/**
 * Creates the Solo tier's Stripe product and prices, then prints the exact
 * commands to wire them into GitHub Actions.
 *
 * WHY THIS EXISTS
 * ---------------
 * Solo shipped in code (REVENUE_PLAN_20K_001.md §6 Option B) but cannot be sold
 * until STRIPE_SOLO_MONTHLY_PRICE_ID / STRIPE_SOLO_ANNUAL_PRICE_ID exist. The
 * other tiers were created by hand in the Stripe Dashboard on 2026-05-17; doing
 * it by hand again invites transposition errors on amounts, and an amount error
 * here is a real billing defect, not a typo.
 *
 * Amounts come from docs/runbooks/STRIPE_SETUP.md Step 2b and must match
 * PRICING_CONFIG in src/lib/config.ts:
 *   monthly  $89.00/month
 *   annual  $888.00/year  (= $74/mo equivalent, the same ~17% discount the
 *                          other tiers use — NOT $74 charged yearly)
 *
 * SAFETY
 * ------
 * - Idempotent. Re-running finds the existing product/prices by metadata and
 *   reports them rather than creating duplicates. Stripe has no unique
 *   constraint on product names, so duplicates are otherwise trivially easy to
 *   create and confusing to unpick.
 * - Read-only by default. Pass --apply to actually write to Stripe.
 * - Never prints the secret key. Reports only the key's mode (test vs live).
 * - Refuses to run against a live key without --live, so a live-mode key in the
 *   shell cannot silently create real billable products.
 *
 * USAGE
 *   # Dry run (default) — shows exactly what would be created
 *   STRIPE_SECRET_KEY=sk_test_... pnpm --filter @ledgerium/web-app stripe:setup-solo
 *
 *   # Create in test mode
 *   STRIPE_SECRET_KEY=sk_test_... pnpm --filter @ledgerium/web-app stripe:setup-solo -- --apply
 *
 *   # Create in live mode (requires BOTH flags, deliberately)
 *   STRIPE_SECRET_KEY=sk_live_... pnpm --filter @ledgerium/web-app stripe:setup-solo -- --apply --live
 */

import Stripe from 'stripe';

// ── Constants — single source of truth for this script ───────────────────────

const PRODUCT_NAME = 'Ledgerium AI — Solo';
const PRODUCT_DESCRIPTION =
  'Single-user plan with the full intelligence layer: bottleneck analysis, automation scoring and variant detection on unlimited recordings.';

/** Marks rows this script owns, so re-runs can find them without name matching. */
const IDENTITY = { ledgerium_plan: 'solo' } as const;

const MONTHLY_AMOUNT_CENTS = 8_900; // $89.00 / month
const ANNUAL_AMOUNT_CENTS = 88_800; // $888.00 / year  ($74/mo equivalent)
const CURRENCY = 'usd';

// ── Arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALLOW_LIVE = args.includes('--live');

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

// ── Preflight ────────────────────────────────────────────────────────────────

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  fail(
    'STRIPE_SECRET_KEY is not set.\n' +
      '  This script cannot read your GitHub secret — supply the key in the shell:\n' +
      '    STRIPE_SECRET_KEY=sk_test_... pnpm --filter @ledgerium/web-app stripe:setup-solo',
  );
}

const isLive = key.startsWith('sk_live_');
const mode = isLive ? 'LIVE' : 'test';

if (isLive && !ALLOW_LIVE) {
  fail(
    'Refusing to run: STRIPE_SECRET_KEY is a LIVE key but --live was not passed.\n' +
      '  Live-mode products are real and billable. Re-run with --apply --live if that is intended.',
  );
}

const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function findExistingProduct(): Promise<Stripe.Product | null> {
  // search() is the only way to query by metadata; it is not available on all
  // account types, so fall back to a bounded list scan.
  try {
    const found = await stripe.products.search({
      query: `metadata['ledgerium_plan']:'solo'`,
      limit: 10,
    });
    if (found.data.length > 0) return found.data[0]!;
  } catch {
    const page = await stripe.products.list({ limit: 100, active: true });
    const match = page.data.find((p) => p.metadata?.ledgerium_plan === 'solo');
    if (match) return match;
  }
  return null;
}

function describePrice(p: Stripe.Price): string {
  const amount = ((p.unit_amount ?? 0) / 100).toFixed(2);
  return `${p.id}  $${amount}/${p.recurring?.interval ?? '?'}`;
}

async function findPrice(
  productId: string,
  interval: 'month' | 'year',
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  return (
    prices.data.find(
      (p) => p.recurring?.interval === interval && p.currency === CURRENCY && p.active,
    ) ?? null
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\nLedgerium — Solo tier Stripe setup');
  console.log('───────────────────────────────────────────────');
  console.log(`  Stripe mode : ${mode}`);
  console.log(`  Action      : ${APPLY ? 'APPLY (will write)' : 'DRY RUN (no writes)'}`);
  console.log(`  Product     : ${PRODUCT_NAME}`);
  console.log(`  Monthly     : $${(MONTHLY_AMOUNT_CENTS / 100).toFixed(2)} / month`);
  console.log(
    `  Annual      : $${(ANNUAL_AMOUNT_CENTS / 100).toFixed(2)} / year  ($${(
      ANNUAL_AMOUNT_CENTS /
      100 /
      12
    ).toFixed(2)}/mo equivalent)`,
  );
  console.log('───────────────────────────────────────────────\n');

  let product = await findExistingProduct();

  if (product) {
    console.log(`• Product already exists — reusing: ${product.id}`);
  } else if (!APPLY) {
    console.log('• Would CREATE product (none found with metadata ledgerium_plan=solo)');
  } else {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: PRODUCT_DESCRIPTION,
      metadata: { ...IDENTITY },
    });
    console.log(`• Created product: ${product.id}`);
  }

  if (!product) {
    console.log('\nDry run complete. Re-run with --apply to create.\n');
    return;
  }

  let monthly = await findPrice(product.id, 'month');
  let annual = await findPrice(product.id, 'year');

  if (monthly) {
    console.log(`• Monthly price exists — reusing: ${describePrice(monthly)}`);
    if (monthly.unit_amount !== MONTHLY_AMOUNT_CENTS) {
      console.log(
        `  ⚠ WARNING: existing monthly amount ($${((monthly.unit_amount ?? 0) / 100).toFixed(2)}) ` +
          `does not match the configured $${(MONTHLY_AMOUNT_CENTS / 100).toFixed(2)}.\n` +
          `    Stripe prices are immutable — reconcile config.ts or archive the old price manually.`,
      );
    }
  } else if (!APPLY) {
    console.log('• Would CREATE monthly price');
  } else {
    monthly = await stripe.prices.create({
      product: product.id,
      currency: CURRENCY,
      unit_amount: MONTHLY_AMOUNT_CENTS,
      recurring: { interval: 'month' },
      metadata: { ...IDENTITY, ledgerium_interval: 'monthly' },
    });
    console.log(`• Created monthly price: ${describePrice(monthly)}`);
  }

  if (annual) {
    console.log(`• Annual price exists — reusing: ${describePrice(annual)}`);
    if (annual.unit_amount !== ANNUAL_AMOUNT_CENTS) {
      console.log(
        `  ⚠ WARNING: existing annual amount ($${((annual.unit_amount ?? 0) / 100).toFixed(2)}) ` +
          `does not match the configured $${(ANNUAL_AMOUNT_CENTS / 100).toFixed(2)}.`,
      );
    }
  } else if (!APPLY) {
    console.log('• Would CREATE annual price');
  } else {
    annual = await stripe.prices.create({
      product: product.id,
      currency: CURRENCY,
      unit_amount: ANNUAL_AMOUNT_CENTS,
      recurring: { interval: 'year' },
      metadata: { ...IDENTITY, ledgerium_interval: 'annual' },
    });
    console.log(`• Created annual price: ${describePrice(annual)}`);
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to create.\n');
    return;
  }

  if (!monthly || !annual) {
    fail('Expected both prices to exist after apply — aborting before printing secrets.');
  }

  console.log('\n───────────────────────────────────────────────');
  console.log('Next: wire these into GitHub Actions.\n');
  console.log(`  gh secret set STRIPE_SOLO_MONTHLY_PRICE_ID --body "${monthly.id}"`);
  console.log(`  gh secret set STRIPE_SOLO_ANNUAL_PRICE_ID  --body "${annual.id}"`);
  console.log('\nThen redeploy (push to main, or: gh workflow run deploy.yml --ref main).');

  if (!isLive) {
    console.log(
      '\n⚠ These are TEST-mode price IDs. Production uses your live key —\n' +
        '  re-run with a live key plus --apply --live before real customers can buy Solo.',
    );
  }
  console.log('');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  fail(`Stripe setup failed: ${message}`);
});
