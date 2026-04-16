'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PRICING_CONFIG } from '@/lib/config';
import { UpgradeButton } from '@/components/UpgradeButton';

export function PricingCards() {
  const [isAnnual, setIsAnnual] = useState(false);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-start">
        {PRICING_CONFIG.plans.map((plan) => {
          const displayPrice =
            isAnnual && plan.annualPrice != null ? plan.annualPrice : plan.price;

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

              <div className="mb-5">
                <h3 className="text-lg font-bold text-[var(--content-primary)]">{plan.name}</h3>
                <p className="text-xs text-[#e2e8f0] mt-1 leading-relaxed">{plan.description}</p>
              </div>

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
                <p className="text-xs font-semibold text-brand-600 mb-5">{plan.seats}</p>
              )}

              {!plan.seats && <div className="mb-5" />}

              {plan.id !== 'free' && plan.id !== 'enterprise' ? (
                <UpgradeButton
                  fallbackHref={plan.ctaHref}
                  plan={plan.id as 'starter' | 'team' | 'growth'}
                  interval={isAnnual ? 'annual' : 'monthly'}
                  className={`w-full text-center ${
                    plan.highlighted
                      ? 'btn-primary shadow-sm shadow-brand-600/20'
                      : 'btn-secondary'
                  }`}
                >
                  {plan.cta}
                </UpgradeButton>
              ) : (
                <Link href={plan.ctaHref} className="w-full text-center btn-secondary">
                  {plan.cta}
                </Link>
              )}

              {plan.price !== null ? (
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
    </>
  );
}
