'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PRICING_CONFIG } from '@/lib/config';
import { UpgradeButton } from '@/components/UpgradeButton';
import { billingIdentityNotice } from '@/lib/billing-identity';
import { track } from '@/lib/analytics';
import { derivePlanAvailability, type PlanAvailabilityResponse } from '@/lib/plan-availability';

export function PricingCards() {
  const [isAnnual, setIsAnnual] = useState(false);

  // SUBSCRIPTION_READINESS_001 §G1: Solo shipped with a live $89 button and
  // no backing Stripe price — checking /api/billing/sku-availability before
  // rendering the buy button makes that class of bug structurally
  // impossible. `null` (not yet resolved) is treated as "no live button
  // yet" by derivePlanAvailability, same fail-closed posture as
  // ServiceOfferCard uses for one-time SKUs.
  const [planAvailability, setPlanAvailability] = useState<PlanAvailabilityResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/sku-availability')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setPlanAvailability(json ?? {});
      })
      .catch(() => {
        // Fail closed — if we can't confirm a plan is purchasable, treat it
        // as not purchasable rather than risking a dead-end 503 click.
        if (!cancelled) setPlanAvailability({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span
          className={`text-sm font-medium ${
            !isAnnual ? 'text-[var(--content-primary)]' : 'text-[var(--content-tertiary)]'
          }`}
        >
          Monthly
        </span>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            isAnnual
              ? 'bg-brand-600'
              : 'bg-[var(--surface-secondary)] border border-[var(--border-default)]'
          }`}
          aria-label="Toggle annual billing"
          role="switch"
          aria-checked={isAnnual}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
              isAnnual ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium ${
            isAnnual ? 'text-[var(--content-primary)]' : 'text-[var(--content-tertiary)]'
          }`}
        >
          Annual
        </span>
        {isAnnual && (
          <span className="text-xs font-medium text-brand-500 bg-brand-900/20 px-2 py-0.5 rounded-full">
            Save ~17%
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 items-start">
        {PRICING_CONFIG.plans.map((plan) => {
          const displayPrice =
            isAnnual && plan.annualPrice != null ? plan.annualPrice : plan.price;

          // Only starter/solo are self-serve Stripe Checkout tiers — team/
          // growth route to a waitlist regardless of Stripe config (see
          // BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD in checkout/route.ts),
          // and free/enterprise never render a Checkout button at all.
          const availability =
            plan.id === 'starter' || plan.id === 'solo'
              ? derivePlanAvailability(planAvailability, plan.id, isAnnual ? 'annual' : 'monthly')
              : null;
          const ctaClassName = `w-full text-center ${
            plan.highlighted ? 'btn-primary shadow-sm shadow-brand-600/20' : 'btn-secondary'
          }`;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlighted
                  ? 'border-brand-300 bg-[var(--surface-elevated)] ring-1 ring-brand-200 shadow-lg shadow-brand-100/50 relative'
                  : 'border-[var(--border-default)] bg-[var(--surface-elevated)]'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                  Most Popular
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-[var(--content-primary)]">{plan.name}</h3>
                <p className="text-xs text-[#e2e8f0] mt-1 leading-relaxed">{plan.description}</p>
              </div>

              {/* Best For row (PRICING-P02 / CEO Rec #8) */}
              {plan.bestFor && (
                <div className="mb-4 pb-4 border-b border-[var(--border-default)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--content-tertiary)] mb-1">
                    Best For
                  </p>
                  <p className="text-xs text-[var(--content-secondary)] italic leading-snug">
                    {plan.bestFor}
                  </p>
                </div>
              )}

              <div className="mb-1">
                {displayPrice !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[var(--content-primary)]">
                      ${displayPrice}
                    </span>
                    {displayPrice > 0 && plan.interval && (
                      <span className="text-sm text-[var(--content-tertiary)]">/{plan.interval}</span>
                    )}
                    {displayPrice === 0 && (
                      <span className="text-sm text-[var(--content-tertiary)]">forever</span>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-[var(--content-primary)]">Custom</p>
                )}
              </div>

              {/* Annual: show crossed-out monthly price */}
              {isAnnual && plan.annualPrice != null && plan.annualPrice > 0 && plan.price != null && (
                <p className="text-xs text-[var(--content-tertiary)] mb-1">
                  <span className="line-through">${plan.price}</span>/mo monthly
                </p>
              )}

              {/* Monthly: show annual savings hint */}
              {!isAnnual && plan.annualPrice != null && plan.annualPrice > 0 && (
                <p className="text-xs text-[var(--content-tertiary)] mb-1">
                  ${plan.annualPrice}/mo billed annually
                </p>
              )}

              {plan.seats && (
                <p className="text-xs font-semibold text-brand-600 mb-3">{plan.seats}</p>
              )}

              {!plan.seats && <div className="mb-3" />}

              {/* Outcome microcopy (PRICING-P02 / CEO Rec #5) */}
              {plan.outcomeMicrocopy && (
                <p className="text-xs text-brand-400 mb-4 leading-snug">
                  {plan.outcomeMicrocopy}
                </p>
              )}

              {/*
                CTA routing (post CEO directive 2026-05-18 "Option B";
                extended for Solo per REVENUE_PLAN_20K §6 Option B):
                  - Free + Enterprise: existing self-serve link (signup or mailto:sales)
                  - Starter + Solo: Stripe Checkout flow via UpgradeButton (both are
                    1-user tiers with zero dependency on the team data layer, so both
                    ship self-serve today — Solo is NOT routed to the waitlist)
                  - Team + Growth: waitlist mailto until multi-user invites land per TEAM-001 workspace build
                    (advertised seats: 5 users / 15 users; data model + invite flow under construction)
              */}
              {(plan.id === 'starter' || plan.id === 'solo') && availability === 'available' ? (
                <UpgradeButton
                  fallbackHref={plan.ctaHref}
                  plan={plan.id}
                  interval={isAnnual ? 'annual' : 'monthly'}
                  className={ctaClassName}
                >
                  {plan.cta}
                </UpgradeButton>
              ) : (plan.id === 'starter' || plan.id === 'solo') && availability === 'loading' ? (
                // Not yet confirmed purchasable — never render a live button
                // before the server has said so (SUBSCRIPTION_READINESS_001 §G1).
                <div className={`${ctaClassName} opacity-50 cursor-default`} aria-hidden="true">
                  &nbsp;
                </div>
              ) : plan.id === 'starter' || plan.id === 'solo' ? (
                // availability === 'unavailable' — the honest state, not an
                // error the customer caused.
                <div>
                  <button
                    disabled
                    className={`${ctaClassName} opacity-60 cursor-not-allowed`}
                    aria-disabled="true"
                  >
                    Not available yet
                  </button>
                </div>
              ) : plan.id === 'team' || plan.id === 'growth' ? (
                <a
                  href={`mailto:hello@ledgerium.ai?subject=${encodeURIComponent(
                    `Team Plan Waitlist — ${plan.name}`,
                  )}&body=${encodeURIComponent(
                    `Please notify me when multi-user invites launch for the ${plan.name} plan.\n\n` +
                      `Tier: ${plan.name} (${plan.seats})\n` +
                      `Email: [your email]\n` +
                      `Company: [optional]\n` +
                      `Estimated team size: [optional]\n`,
                  )}`}
                  className={`w-full text-center ${
                    plan.highlighted
                      ? 'btn-primary shadow-sm shadow-brand-600/20'
                      : 'btn-secondary'
                  }`}
                  onClick={() => {
                    track({
                      event: 'team_waitlist_clicked',
                      plan: plan.id as 'team' | 'growth',
                      location: 'pricing_cards',
                    });
                  }}
                >
                  Join Waitlist
                </a>
              ) : (
                <Link
                  href={plan.ctaHref}
                  className="w-full text-center btn-secondary"
                  onClick={() => {
                    if (plan.ctaHref === '/signup') {
                      track({ event: 'cta_clicked', location: 'pricing_cta', destination: '/signup' });
                    }
                  }}
                >
                  {plan.cta}
                </Link>
              )}

              {plan.id === 'team' || plan.id === 'growth' ? (
                <p className="mt-2 mb-4 text-center text-ds-xs text-amber-400">
                  Multi-user invites launching Q3 2026
                </p>
              ) : availability === 'unavailable' ? (
                <p className="mt-2 mb-4 text-center text-ds-xs text-[var(--content-tertiary)]">
                  We&apos;re still setting up purchasing for this plan. Check back soon.
                </p>
              ) : availability === 'loading' ? (
                <div className="mt-2 mb-4" />
              ) : plan.price !== null ? (
                <p className="mt-2 mb-4 text-center text-ds-xs text-[var(--content-tertiary)]">
                  No credit card required
                </p>
              ) : (
                <div className="mt-2 mb-4" />
              )}

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? 'text-brand-600' : 'text-[var(--content-tertiary)]'
                      }`}
                    />
                    <span className="text-xs text-[var(--content-primary)] leading-relaxed">
                      {feature}
                    </span>
                  </li>
                ))}
                {plan.limits.map((limit) => (
                  <li key={limit} className="flex items-start gap-2">
                    <span className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-center text-[var(--content-tertiary)] text-[10px]">
                      &mdash;
                    </span>
                    <span className="text-xs text-[var(--content-tertiary)] leading-relaxed">
                      {limit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/*
        Billing-identity disclosure. Stripe receipts and card statements carry
        the account owner's business name, not "Ledgerium AI". Stating that
        before purchase removes the "who charged me?" surprise that drives
        chargebacks. Single line under the grid rather than repeated per card.
      */}
      <p className="mx-auto mt-ds-6 max-w-2xl text-center text-ds-xs text-[var(--content-tertiary)]">
        {billingIdentityNotice()}
      </p>
    </>
  );
}
