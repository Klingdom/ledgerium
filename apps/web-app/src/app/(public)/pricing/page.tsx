import type { Metadata } from 'next';
import Link from 'next/link';
import { PRICING_CONFIG } from '@/lib/config';
import { Check, ArrowRight, HelpCircle } from 'lucide-react';
import { UpgradeButton } from '@/components/UpgradeButton';

export const metadata: Metadata = {
  title: 'Pricing — Ledgerium AI',
  description:
    'Free to start. Pro for unlimited workflow capture. Enterprise for teams. Simple pricing, no surprises.',
};

const FAQ = [
  {
    q: 'Can I try it before paying?',
    a: 'Yes. The Free plan includes 5 full workflow recordings with no time limit and no credit card. Every recording produces a complete SOP, process map, and report.',
  },
  {
    q: 'What counts as a recording?',
    a: 'One recording is one session — from clicking Record to clicking Stop. Each produces a full set of outputs: workflow steps, SOP, process map, and report.',
  },
  {
    q: 'Can I cancel Pro anytime?',
    a: 'Yes. Month-to-month, no contracts. Cancel anytime and keep access through the end of your billing period. Your existing workflows are never deleted.',
  },
  {
    q: 'What happens to my workflows if I downgrade?',
    a: 'Everything stays. You can still access, search, and export all your existing workflows. You just can\'t create new recordings beyond the Free limit.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your workflow data is stored in your personal account and never shared with third parties. Sensitive field values are automatically redacted during capture.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-10 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Simple pricing. Real output.
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Start free with 5 recordings. Upgrade when workflow capture becomes essential.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PRICING_CONFIG.plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-7 flex flex-col ${
                  plan.highlighted
                    ? 'border-brand-300 bg-white ring-1 ring-brand-200 shadow-lg shadow-brand-100/50 relative scale-[1.02]'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{plan.description}</p>
                </div>

                <div className="mb-7">
                  {plan.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      {plan.price > 0 && plan.interval && (
                        <span className="text-sm text-gray-400">/{plan.interval}</span>
                      )}
                      {plan.price === 0 && (
                        <span className="text-sm text-gray-400">forever</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">Custom</p>
                  )}
                </div>

                {plan.id === 'pro' ? (
                  <UpgradeButton
                    fallbackHref={plan.ctaHref}
                    className={`w-full text-center mb-7 btn-primary shadow-sm shadow-brand-600/20`}
                  >
                    {plan.cta}
                  </UpgradeButton>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className={`w-full text-center mb-7 ${
                      plan.highlighted ? 'btn-primary shadow-sm shadow-brand-600/20' : 'btn-secondary'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-brand-600' : 'text-gray-400'}`} />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                  {plan.limits.map((limit) => (
                    <li key={limit} className="flex items-start gap-2.5 opacity-40">
                      <span className="h-4 w-4 mt-0.5 flex-shrink-0 text-center text-gray-400 text-xs">—</span>
                      <span className="text-sm text-gray-500">{limit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-10 leading-relaxed max-w-xl mx-auto">
            All plans include the browser extension, deterministic processing,
            and privacy protections. Your data is never shared or used for training.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-10">
            <HelpCircle className="h-5 w-5 text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900">Common questions</h2>
          </div>
          <div className="space-y-8">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Record 5 workflows free. See what you&apos;ve been missing.
          </h2>
          <div className="mt-8">
            <Link href="/signup" className="btn-primary gap-2 text-base px-7 py-3.5 shadow-sm shadow-brand-600/20">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-400">No credit card required</p>
        </div>
      </section>
    </>
  );
}
