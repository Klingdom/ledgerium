# Prompt to hand to the 6S Success project

Copy everything below the line into the 6S Success Claude session.

**Do not paste the Stripe secret key back to the Ledgerium session or into any
chat.** Price IDs are safe to share — they're public identifiers used in
client-side checkout. The secret key is not, and Ledgerium's production already
has its own copy in GitHub secrets.

---

You own the Stripe account that Ledgerium AI bills through. I need you to
create one missing product and verify a few account-level settings. Ledgerium's
code is already written and deployed for this — the only gap is Stripe-side
configuration.

**Please report back only: the two price IDs, the mode (test/live), and the
answers to the verification questions. Never paste the secret key.**

## 1. First, tell me which mode the account is operating in

Check whether the API key Ledgerium uses is `sk_test_…` or `sk_live_…`.

This is the single most important answer. If Ledgerium's key is a **test** key,
then even a "working" checkout accepts only test cards and takes **no real
money**. I need to know this before anything else, because it changes whether
the site is actually selling.

Also confirm: do the existing **Starter** product and prices exist in that same
mode? Ledgerium has these price IDs configured already:
`STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_STARTER_ANNUAL_PRICE_ID`. Please
confirm they resolve to a real, **active** price in the account, and tell me the
amount each one charges. If they point at an archived or deleted price, say so —
that's a different problem than the one I'm asking you to fix.

## 2. Create the "Solo" product with two prices

In the **same mode** as the key Ledgerium uses:

- **Product name:** `Ledgerium Solo`
- **Description:** `Single-user plan for solo operators and consultants.`

Two recurring prices on that product, both USD:

| Price | Amount | Billing period | Notes |
|---|---|---|---|
| Monthly | **$89.00** (`8900` cents) | every 1 month | |
| Annual | **$888.00** (`88800` cents) | every 1 year | This is the full yearly charge (works out to $74/mo). Do **not** enter 74. |

Please add metadata `ledgerium_plan=solo` to the product, so it's identifiable
later without relying on the name.

Then give me the two price IDs (they look like `price_1AbC…`).

## 3. Verify the Customer Portal allows plan switching

Settings → Billing → Customer portal. Confirm:

- **Subscription update** is **enabled**
- Both the Starter and Solo prices are listed as products customers may switch to
- Proration behaviour is set (upgrades prorate immediately; downgrades at period end is fine)

Without this, an existing subscriber cannot move between Starter and Solo at
all — the button exists in Ledgerium's UI but Stripe refuses the change.

## 4. Set the statement descriptor

Settings → Business → Public business information → **Statement descriptor**.

Set it to something a *Ledgerium* customer will recognise, e.g. `6S LEDGERIUM`
(Stripe allows 5–22 characters).

Context: Ledgerium customers currently see the 6S Success business name on their
card statement, because 6S Success owns the account. Ledgerium's checkout and
account pages now disclose this in writing, but the descriptor is what actually
prints on the card line. An unrecognised name is a leading cause of chargebacks,
and the dispute fee applies whether or not you win.

## 5. Confirm the webhook endpoint is still live

There should be an endpoint pointing at `https://ledgerium.ai/api/billing/webhook`.
Please confirm it exists, is **enabled**, and tell me which events it's
subscribed to. I do **not** need the signing secret — Ledgerium already has it.

---

### What to send back

1. Mode: test or live
2. Starter prices: active? what amounts?
3. `STRIPE_SOLO_MONTHLY_PRICE_ID` = `price_…`
4. `STRIPE_SOLO_ANNUAL_PRICE_ID` = `price_…`
5. Portal plan-switching: enabled y/n
6. Statement descriptor: what you set it to
7. Webhook endpoint: enabled y/n, event list

---

## What I do with the answer (Ledgerium side)

Add the two price IDs as GitHub repository secrets, which is a one-liner each:

```bash
gh secret set STRIPE_SOLO_MONTHLY_PRICE_ID --body "price_..."
gh secret set STRIPE_SOLO_ANNUAL_PRICE_ID  --body "price_..."
```

`deploy.yml` and `compose.hostinger.yaml` already reference both — no code
change needed. Redeploy and Solo goes live.

If the answer to Q1 is "test mode", that becomes the priority over everything
else here, and I'll come back with a separate migration plan for going live.
