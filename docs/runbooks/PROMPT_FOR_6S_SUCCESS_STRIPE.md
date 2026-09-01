# Prompt to hand to the 6S Success project

Copy everything below the line into the 6S Success Claude session.

**Secret handling:** price IDs are public identifiers used in client-side
checkout and safe to paste back. The **secret key** and **webhook signing
secret** are not — see § Handing back secrets safely at the bottom for how to
move those without putting them in a chat transcript or shell history.

---

You own the Stripe account that Ledgerium AI bills through. Ledgerium's billing
code is complete and deployed; the remaining gap is entirely Stripe-side
configuration.

## Context you need before starting

Ledgerium's production Stripe env vars were set on 2026-05-17 and have not
changed since. A Ledgerium status doc dated 2026-05-28 records "Stripe Live mode
not configured." So the working assumption is that **Ledgerium is currently
wired to Test Mode** — meaning its checkout accepts only test cards and collects
no real money.

**Your first job is to confirm or refute that**, because it decides whether the
rest of this is a small addition or a full Live Mode setup.

## Step 1 — Confirm the mode (do this first)

Look at the API key Ledgerium uses. Does it start with `sk_test_` or `sk_live_`?

- **`sk_live_`** → the assumption was wrong. Skip to Step 2 (Solo only) and tell
  me the doc was stale.
- **`sk_test_`** → expected. Do Step 2 **and** Step 3.

Also confirm whether the existing Starter prices are **active** (not archived) and
what they charge. Ledgerium has `STRIPE_STARTER_MONTHLY_PRICE_ID` and
`STRIPE_STARTER_ANNUAL_PRICE_ID` configured, and its site currently reports
Starter as purchasable — but a configured price ID is not proof the price still
exists.

## Step 2 — Create the "Solo" product

Ledgerium has a Solo tier shipped in its UI with no backing Stripe price, so it
correctly shows "Not available yet". Create it in **whichever mode you'll
actually be selling from** (see Step 3 — if you're going Live, create it in Live
Mode and don't bother with Test).

- **Product name:** `Ledgerium Solo`
- **Description:** `Single-user plan for solo operators and consultants.`
- **Metadata:** `ledgerium_plan=solo` (so it's identifiable without relying on the name)

Two recurring USD prices on that product:

| Price | Amount | Period | Note |
|---|---|---|---|
| Monthly | **$89.00** (`8900` cents) | every 1 month | |
| Annual | **$888.00** (`88800` cents) | every 1 year | Full yearly charge. Works out to $74/mo — **do not enter 74**. |

Report the two price IDs (`price_1AbC…`).

## Step 3 — Only if Step 1 said `sk_test_`: set up Live Mode

Test Mode config does not carry over. Live Mode has **entirely different price
IDs, a different API key, and a different webhook signing secret**. Everything
below must be created with the dashboard's **Live mode** toggle on.

**3a. Create all products and prices in Live Mode:**

| Product | Monthly | Annual |
|---|---|---|
| `Ledgerium Starter` | $49.00 (`4900`) | $492.00 (`49200`) |
| `Ledgerium Solo` | $89.00 (`8900`) | $888.00 (`88800`) |

Add metadata `ledgerium_plan=starter` / `ledgerium_plan=solo` respectively.

(Team and Growth are deliberately not sellable yet — Ledgerium blocks them in
code pending a multi-user data layer, so they need no Live prices.)

**3b. Create the Live webhook endpoint:**

- URL: `https://ledgerium.ai/api/billing/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`,
  `invoice.payment_succeeded`, `customer.subscription.trial_will_end`
- Capture the **signing secret** (`whsec_…`) — this is a secret, see § below.

**3c. Get the Live secret key** (`sk_live_…`) — also a secret.

## Step 4 — Customer Portal (both modes)

Settings → Billing → Customer portal. Confirm:

- **Subscription update** is enabled
- Starter and Solo prices are both listed as switchable products
- Proration set (upgrades immediate; downgrades at period end is fine)

Without this, an existing subscriber cannot move between Starter and Solo —
Ledgerium shows the button, Stripe refuses the change.

## Step 5 — Statement descriptor

Settings → Business → Public business information → **Statement descriptor**.

Set to something a *Ledgerium* customer recognises, e.g. `6S LEDGERIUM`
(5–22 chars).

Ledgerium customers see the 6S Success name on their statement because 6S
Success owns the account. Ledgerium's checkout and account pages now disclose
this in writing, but the descriptor is what actually prints on the card line.
An unrecognised charge is a leading cause of chargebacks, and the dispute fee
applies whether or not you win.

---

## What to send back

1. **Mode:** `sk_test_` or `sk_live_`
2. **Starter prices:** active? amounts?
3. `STRIPE_SOLO_MONTHLY_PRICE_ID` = `price_…`
4. `STRIPE_SOLO_ANNUAL_PRICE_ID` = `price_…`
5. *(If Live setup was done)* the Live `STRIPE_STARTER_MONTHLY_PRICE_ID` and
   `STRIPE_STARTER_ANNUAL_PRICE_ID`
6. Portal plan-switching: enabled y/n
7. Statement descriptor: value set
8. Webhook endpoint: enabled y/n, events subscribed

## Handing back secrets safely

Do **not** paste `sk_live_…` or `whsec_…` into a chat window or a command with
`--body`, which lands them in shell history.

Phil should set them interactively from the Ledgerium repo — this reads from
stdin and leaves no trace in history:

```bash
gh secret set STRIPE_SECRET_KEY        # paste when prompted, then Enter, Ctrl+D
gh secret set STRIPE_WEBHOOK_SECRET    # same
```

Price IDs are not secret and can be set inline:

```bash
gh secret set STRIPE_SOLO_MONTHLY_PRICE_ID --body "price_..."
gh secret set STRIPE_SOLO_ANNUAL_PRICE_ID  --body "price_..."
# only if Live Mode was set up in Step 3:
gh secret set STRIPE_STARTER_MONTHLY_PRICE_ID --body "price_..."
gh secret set STRIPE_STARTER_ANNUAL_PRICE_ID  --body "price_..."
```

`deploy.yml` and `compose.hostinger.yaml` already reference every one of these —
no Ledgerium code change is needed. Push any commit (or re-run the latest
workflow) to redeploy, and the plans go live.

**Verify after deploy** — this endpoint is public and needs no auth:

```
https://ledgerium.ai/api/billing/sku-availability
```

Both `starter` and `solo` should read `{"monthly":true,"annual":true}`.
