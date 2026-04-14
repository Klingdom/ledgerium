import type { Metadata } from 'next';
import Link from 'next/link';
import { PRICING_CONFIG } from '@/lib/config';
import { Check, ArrowRight, HelpCircle } from 'lucide-react';
import { UpgradeButton } from '@/components/UpgradeButton';

export const metadata: Metadata = {
  title: 'Pricing — Ledgerium AI',
  description:
    'Start free. Plans from $49/mo for individuals to custom enterprise pricing for compliance teams.',
};

const FAQ = [
  {
    q: 'What is a "recorder" vs. a "seat"?',
    a: 'A recorder is someone who captures workflows using the Chrome extension. A seat is anyone on your team who can view, share, and act on the generated SOPs, process maps, and intelligence reports. Most teams have 1-3 recorders and many more viewers.',
  },
  {
    q: 'What is the intelligence layer?',
    a: 'The intelligence layer includes bottleneck detection, friction analysis, rework pattern identification, variant path analysis, automation opportunity scoring, and process health scores. It turns raw workflow recordings into actionable process improvement insights. Available on Team plans and above.',
  },
  {
    q: 'Can I try before I buy?',
    a: 'Yes. The Free plan gives you 5 recordings per month with SOP and process map output (exports include a Ledgerium watermark). No credit card required. Upgrade to Starter for clean exports, or to Team for the full intelligence layer.',
  },
  {
    q: 'How does annual billing work?',
    a: 'Annual billing saves 17% compared to monthly (roughly 2 months free). You can switch between monthly and annual at any time from your account settings.',
  },
  {
    q: 'What happens to my workflows if I downgrade?',
    a: 'Everything stays. You can still access, search, and export all your existing workflows. You just can\'t create new recordings beyond your plan limit.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your workflow data is stored in your workspace and never shared with third parties. All processing is deterministic and auditable. Enterprise plans support custom retention policies and on-premise deployment.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-10 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)]">
            Simple pricing that scales with your team
          </h1>
          <p className="mt-4 text-lg text-[#e2e8f0]">
            Start free. Upgrade when you need intelligence, team collaboration, or compliance-grade exports.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-12 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-start">
            {PRICING_CONFIG.plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? 'border-brand-300 bg-[var(--surface-elevated)] ring-1 ring-brand-200 shadow-lg shadow-brand-100/50 relative lg:scale-[1.03]'
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
                  {plan.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-[var(--content-primary)]">
                        ${plan.price}
                      </span>
                      {plan.price > 0 && plan.interval && (
                        <span className="text-sm text-[var(--content-tertiary)]">/{plan.interval}</span>
                      )}
                      {plan.price === 0 && (
                        <span className="text-sm text-[var(--content-tertiary)]">forever</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-[var(--content-primary)]">Custom</p>
                  )}
                </div>

                {plan.annualPrice != null && plan.annualPrice > 0 && (
                  <p className="text-xs text-[var(--content-tertiary)] mb-1">${plan.annualPrice}/mo billed annually</p>
                )}

                {plan.seats && (
                  <p className="text-xs font-semibold text-brand-600 mb-5">{plan.seats}</p>
                )}

                {!plan.seats && <div className="mb-5" />}

                {plan.highlighted ? (
                  <UpgradeButton
                    fallbackHref={plan.ctaHref}
                    className="w-full text-center btn-primary shadow-sm shadow-brand-600/20"
                  >
                    {plan.cta}
                  </UpgradeButton>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className="w-full text-center btn-secondary"
                  >
                    {plan.cta}
                  </Link>
                )}
                {plan.price !== null ? (<p className="mt-2 mb-4 text-center text-ds-xs text-[var(--content-tertiary)]">No credit card required</p>) : (<div className="mt-2 mb-4" />)}

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-brand-600' : 'text-[var(--content-tertiary)]'}`} />
                      <span className="text-xs text-[var(--content-primary)] leading-relaxed">{feature}</span>
                    </li>
                  ))}
                  {plan.limits.map((limit) => (
                    <li key={limit} className="flex items-start gap-2">
                      <span className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-center text-[var(--content-tertiary)] text-[10px]">&mdash;</span>
                      <span className="text-xs text-[var(--content-tertiary)] leading-relaxed">{limit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[var(--content-tertiary)] mt-10 leading-relaxed max-w-xl mx-auto">
            All plans include the browser extension, deterministic processing,
            and privacy protections. Your data is never shared or used for training.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-10">
            <HelpCircle className="h-5 w-5 text-[var(--content-tertiary)]" />
            <h2 className="text-xl font-bold text-[var(--content-primary)]">Common questions</h2>
          </div>
          <div className="space-y-8">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-1.5">{q}</h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Record 5 workflows free. See what you&apos;ve been missing.
          </h2>
          <div className="mt-8">
            <Link href="/signup" className="btn-primary gap-2 text-base px-7 py-3.5 shadow-sm shadow-brand-600/20">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-ds-xs text-[#e2e8f0]">
            No credit card required · Data never used for training · <a href="/privacy" className="underline hover:text-brand-600">Privacy & security details</a>
          </p>
        </div>
      </section>
    </>
  );
}
