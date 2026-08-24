/**
 * Phase 0 of docs/features/subscriptions/SUBSCRIPTION_READINESS_001.md, as one
 * command.
 *
 * Does everything that stands between the shipped subscription machinery and a
 * sellable product:
 *
 *   1. Creates the Solo product + monthly/annual prices  (audit §2)
 *   2. Configures the Billing Portal to ALLOW PLAN SWITCHING  (audit §3 G3)
 *   3. Writes the resulting price IDs to GitHub Actions secrets
 *   4. Verifies the whole chain and reports what is and is not configured
 *
 * WHY THIS EXISTS
 * ---------------
 * The audit recorded G3 as "Dashboard setting, no code". That was wrong —
 * `billingPortal.configurations` is a full API surface. Left manual, G3 is the
 * single most consequential unticked box in the funnel: Stripe's Portal does
 * NOT offer plan switching by default, and `checkout/route.ts` deliberately
 * redirects existing subscribers there for plan management. Until it is on,
 * every Starter customer is capped at $49 with no path to Solo.
 *
 * WHAT THIS CANNOT DO
 * -------------------
 * It cannot read your Stripe key. GitHub secrets are write-only, so the key
 * has to come from the shell. That is the one irreducible manual step.
 *
 * SAFETY
 * ------
 * - Dry run by default. `--apply` is required to write anything.
 * - Refuses a live key unless `--live` is also passed, so a live key sitting
 *   in the shell cannot silently mutate real billing configuration.
 * - Idempotent throughout: products and prices are matched on a metadata
 *   marker, and the Portal's DEFAULT configuration is updated in place rather
 *   than accumulating duplicates.
 * - Never prints the secret key; reports only test vs live mode.
 * - `--verify` inspects and reports without writing, even with `--apply`.
 *
 * USAGE
 *   # See exactly what would happen (safe)
 *   STRIPE_SECRET_KEY=sk_test_... pnpm --filter @ledgerium/web-app stripe:setup
 *
 *   # Apply in test mode
 *   STRIPE_SECRET_KEY=sk_test_... pnpm --filter @ledgerium/web-app stripe:setup -- --apply
 *
 *   # Apply for real (both flags required, deliberately)
 *   STRIPE_SECRET_KEY=sk_live_... pnpm --filter @ledgerium/web-app stripe:setup -- --apply --live
 *
 *   # Also push the price IDs into GitHub Actions secrets (needs gh, authenticated)
 *   ... -- --apply --live --set-secrets
 */

import Stripe from 'stripe';
import { execFileSync } from 'node:child_process';

// ── Expected catalogue — must stay in step with PRICING_CONFIG ───────────────
//
// Amounts are in cents. The annual figure is the FULL YEARLY CHARGE, not the
// monthly-equivalent shown on the pricing page: Solo displays "$74/mo billed
// annually" but Stripe charges $888 once. Entering 74 here would undercharge
// by 12x, which is exactly the transposition this script exists to remove from
// a manual process.
const CATALOG = {
  starter: { label: 'Starter', monthly: 4_900, annual: 49_200 },
  solo: { label: 'Solo', monthly: 8_900, annual: 88_800 },
} as const;

type PlanKey = keyof typeof CATALOG;

const SOLO_PRODUCT_NAME = 'Ledgerium AI — Solo';
const SOLO_PRODUCT_DESCRIPTION =
  'Single-user plan with the full intelligence layer: bottleneck analysis, automation scoring and variant detection on unlimited recordings.';
const CURRENCY = 'usd';

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALLOW_LIVE = args.includes('--live');
const SET_SECRETS = args.includes('--set-secrets');
const VERIFY_ONLY = args.includes('--verify');

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function heading(text: string): void {
  console.log(`\n${text}\n${'─'.repeat(Math.max(text.length, 40))}`);
}

// ── Preflight ────────────────────────────────────────────────────────────────

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  fail(
    'STRIPE_SECRET_KEY is not set.\n' +
      '  This script cannot read your GitHub secret — supply it in the shell:\n' +
      '    STRIPE_SECRET_KEY=sk_test_... pnpm --filter @ledgerium/web-app stripe:setup',
  );
}

const isLive = key.startsWith('sk_live_');
if (isLive && !ALLOW_LIVE) {
  fail(
    'Refusing to run: STRIPE_SECRET_KEY is a LIVE key but --live was not passed.\n' +
      '  Live products and portal settings are real. Re-run with --apply --live if intended.',
  );
}

const willWrite = APPLY && !VERIFY_ONLY;
const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });

// ── Helpers ──────────────────────────────────────────────────────────────────

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Find a product by our own metadata marker, falling back to a bounded scan. */
async function findProductByPlan(plan: PlanKey): Promise<Stripe.Product | null> {
  try {
    const found = await stripe.products.search({
      query: `metadata['ledgerium_plan']:'${plan}'`,
      limit: 10,
    });
    if (found.data.length > 0) return found.data[0]!;
  } catch {
    // search() is not enabled on every account type.
  }
  const page = await stripe.products.list({ limit: 100, active: true });
  return page.data.find((p) => p.metadata?.ledgerium_plan === plan) ?? null;
}

/**
 * Locate a product by the amounts it charges, for plans created by hand before
 * this script existed (Starter was created in the Dashboard on 2026-05-17 and
 * carries no metadata marker).
 */
async function findProductByAmounts(plan: PlanKey): Promise<Stripe.Product | null> {
  const want = CATALOG[plan];
  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
  const match = prices.data.find(
    (p) =>
      p.currency === CURRENCY &&
      p.recurring?.interval === 'month' &&
      p.unit_amount === want.monthly,
  );
  if (!match) return null;
  return typeof match.product === 'string'
    ? await stripe.products.retrieve(match.product)
    : (match.product as Stripe.Product);
}

async function findPrice(
  productId: string,
  interval: 'month' | 'year',
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  return (
    prices.data.find((p) => p.active && p.currency === CURRENCY && p.recurring?.interval === interval) ??
    null
  );
}

function ghSecretSet(name: string, value: string): boolean {
  try {
    execFileSync('gh', ['secret', 'set', name, '--body', value], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ── Step 1 — Solo product + prices ───────────────────────────────────────────

interface PlanPrices {
  product: Stripe.Product | null;
  monthly: Stripe.Price | null;
  annual: Stripe.Price | null;
}

async function ensureSolo(): Promise<PlanPrices> {
  heading('1. Solo product and prices');

  let product = await findProductByPlan('solo');

  if (product) {
    console.log(`  product exists        ${product.id}`);
  } else if (!willWrite) {
    console.log('  product              WOULD CREATE');
    return { product: null, monthly: null, annual: null };
  } else {
    product = await stripe.products.create({
      name: SOLO_PRODUCT_NAME,
      description: SOLO_PRODUCT_DESCRIPTION,
      metadata: { ledgerium_plan: 'solo' },
    });
    console.log(`  product CREATED       ${product.id}`);
  }

  const out: PlanPrices = { product, monthly: null, annual: null };

  for (const [interval, amount, label] of [
    ['month', CATALOG.solo.monthly, 'monthly'],
    ['year', CATALOG.solo.annual, 'annual'],
  ] as const) {
    let price = await findPrice(product.id, interval);
    if (price) {
      console.log(`  ${label.padEnd(8)} exists      ${price.id}  ${money(price.unit_amount ?? 0)}/${interval}`);
      if (price.unit_amount !== amount) {
        console.log(
          `    ⚠ amount is ${money(price.unit_amount ?? 0)} but config expects ${money(amount)}.` +
            ' Stripe prices are immutable — reconcile config.ts or archive this price by hand.',
        );
      }
    } else if (!willWrite) {
      console.log(`  ${label.padEnd(8)} WOULD CREATE ${money(amount)}/${interval}`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        currency: CURRENCY,
        unit_amount: amount,
        recurring: { interval },
        metadata: { ledgerium_plan: 'solo', ledgerium_interval: label },
      });
      console.log(`  ${label.padEnd(8)} CREATED     ${price.id}  ${money(amount)}/${interval}`);
    }
    if (interval === 'month') out.monthly = price;
    else out.annual = price;
  }

  return out;
}

// ── Step 2 — Billing Portal plan switching (audit G3) ────────────────────────

async function ensurePortal(solo: PlanPrices): Promise<void> {
  heading('2. Billing Portal — plan switching (audit G3)');

  const starterProduct =
    (await findProductByPlan('starter')) ?? (await findProductByAmounts('starter'));

  if (!starterProduct) {
    console.log('  ⚠ Starter product not found — cannot offer Starter↔Solo switching.');
    console.log('    Skipping portal configuration rather than writing a half-configured one.');
    return;
  }

  const starterMonthly = await findPrice(starterProduct.id, 'month');
  const starterAnnual = await findPrice(starterProduct.id, 'year');

  const products: Stripe.BillingPortal.ConfigurationUpdateParams.Features.SubscriptionUpdate.Product[] =
    [];

  const starterPrices = [starterMonthly?.id, starterAnnual?.id].filter(Boolean) as string[];
  if (starterPrices.length > 0) {
    products.push({ product: starterProduct.id, prices: starterPrices });
  }

  const soloPrices = [solo.monthly?.id, solo.annual?.id].filter(Boolean) as string[];
  if (solo.product && soloPrices.length > 0) {
    products.push({ product: solo.product.id, prices: soloPrices });
  }

  console.log(`  starter product       ${starterProduct.id} (${starterPrices.length} price(s))`);
  console.log(
    `  solo product          ${solo.product?.id ?? '(not yet created)'} (${soloPrices.length} price(s))`,
  );

  if (products.length < 2) {
    console.log('  ⚠ Fewer than two switchable products — plan switching would be pointless.');
    console.log('    Create the Solo prices first (step 1), then re-run.');
    return;
  }

  const existing = await stripe.billingPortal.configurations.list({ limit: 10 });
  const target = existing.data.find((c) => c.is_default) ?? existing.data[0] ?? null;

  const features = {
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price' as const],
      proration_behavior: 'create_prorations' as const,
      products,
    },
    // End-of-period cancellation: the customer keeps what they paid for.
    // Immediate revocation on click would be taking money for nothing.
    subscription_cancel: { enabled: true, mode: 'at_period_end' as const },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
  };

  if (!willWrite) {
    console.log(
      `  WOULD ${target ? `UPDATE default configuration ${target.id}` : 'CREATE a configuration'}`,
    );
    console.log('    subscription_update.enabled = true   ← this is the G3 fix');
    console.log('    proration_behavior          = create_prorations');
    console.log('    subscription_cancel.mode    = at_period_end');
    return;
  }

  if (target) {
    await stripe.billingPortal.configurations.update(target.id, { features });
    console.log(`  UPDATED default configuration ${target.id} — plan switching ENABLED`);
  } else {
    const created = await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'Manage your Ledgerium AI subscription' },
      features,
    });
    console.log(`  CREATED configuration ${created.id} — plan switching ENABLED`);
  }
}

// ── Step 3 — GitHub secrets ──────────────────────────────────────────────────

function pushSecrets(solo: PlanPrices): void {
  heading('3. GitHub Actions secrets');

  if (!solo.monthly || !solo.annual) {
    console.log('  skipped — Solo prices do not exist yet');
    return;
  }

  const pairs: Array<[string, string]> = [
    ['STRIPE_SOLO_MONTHLY_PRICE_ID', solo.monthly.id],
    ['STRIPE_SOLO_ANNUAL_PRICE_ID', solo.annual.id],
  ];

  if (!SET_SECRETS) {
    console.log('  --set-secrets not passed. Run these yourself:\n');
    for (const [name, value] of pairs) {
      console.log(`    gh secret set ${name} --body "${value}"`);
    }
    return;
  }

  for (const [name, value] of pairs) {
    console.log(`  ${ghSecretSet(name, value) ? 'SET    ' : 'FAILED '} ${name}`);
  }
}

// ── Step 4 — Verify ──────────────────────────────────────────────────────────

async function verify(solo: PlanPrices): Promise<void> {
  heading('4. Readiness');

  const rows: Array<[string, boolean, string]> = [];

  rows.push(['Solo product', solo.product !== null, solo.product?.id ?? 'missing']);
  rows.push(['Solo monthly price', solo.monthly !== null, solo.monthly?.id ?? 'missing']);
  rows.push(['Solo annual price', solo.annual !== null, solo.annual?.id ?? 'missing']);

  const configs = await stripe.billingPortal.configurations.list({ limit: 10 });
  const def = configs.data.find((c) => c.is_default) ?? configs.data[0];
  const switching = def?.features?.subscription_update?.enabled === true;
  rows.push(['Portal plan switching', switching, switching ? 'enabled' : 'DISABLED — Starter cannot upgrade']);

  for (const [label, ok, detail] of rows) {
    console.log(`  ${ok ? '✅' : '❌'} ${label.padEnd(24)} ${detail}`);
  }

  const allOk = rows.every(([, ok]) => ok);
  console.log(
    allOk
      ? '\n  Both tiers are configured. Remaining: set the two GitHub secrets (if not done) and redeploy.'
      : '\n  Not ready. Re-run with --apply (and --live for production) to fix the ❌ rows.',
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\nLedgerium — Stripe subscription setup (Phase 0)');
  console.log('════════════════════════════════════════════════');
  console.log(`  mode   : ${isLive ? 'LIVE' : 'test'}`);
  console.log(`  action : ${willWrite ? 'APPLY (will write)' : 'DRY RUN (no writes)'}`);

  const solo = await ensureSolo();
  await ensurePortal(solo);
  pushSecrets(solo);
  await verify(solo);

  if (!willWrite) {
    console.log('\nDry run complete. Re-run with --apply to make these changes.\n');
  } else if (!isLive) {
    console.log('\n⚠ TEST mode. Production uses your live key — re-run with --apply --live.\n');
  } else {
    console.log('\nDone. Redeploy so the new secrets reach the container.\n');
  }
}

main().catch((err: unknown) => {
  fail(`Stripe setup failed: ${err instanceof Error ? err.message : String(err)}`);
});
