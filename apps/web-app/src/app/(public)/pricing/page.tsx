import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, HelpCircle } from 'lucide-react';
import { PricingCards } from '@/components/PricingCards';
import { ROICalculator } from './ROICalculator';
import { TrackedLink } from '@/components/TrackedLink';

export const metadata: Metadata = {
  title: 'Record Once. Know Everything. — Process Intelligence Pricing | Ledgerium',
  description:
    'Free plan available. One Chrome extension captures every workflow and turns it into AI-generated SOPs, process maps, variation analysis, and automation candidates. Plans from $49/mo.',
  openGraph: {
    title: 'Record Once. Know Everything. — Process Intelligence Pricing | Ledgerium',
    description:
      'Start free. One recording produces a structured SOP, a visual process map, variation analysis, and automation candidates — all backed by real behavior, not assumptions.',
  },
};

const FAQ = [
  {
    q: 'How does Ledgerium count users?',
    a: 'Every plan includes a set number of user seats. Anyone on your team can capture workflows using the Chrome extension, view the generated SOPs and process maps, and act on the intelligence reports. Free includes 1 user. Starter includes 1 user. Team includes 5 users. Growth includes 15 users. Enterprise is custom.',
  },
  {
    q: 'What is the intelligence layer?',
    a: 'The intelligence layer includes bottleneck detection, friction analysis, rework pattern identification, variant path analysis, automation opportunity scoring, and process health scores. It turns raw workflow recordings into actionable process improvement insights. Available on Team plans and above.',
  },
  {
    q: 'Can I try before I buy?',
    a: 'Two ways. (1) The Free plan gives you 5 recordings per month with SOP and process map output — no credit card required, no time limit. Exports include a Ledgerium watermark. (2) Every paid plan (Starter, Team, Growth) includes a 14-day free trial. You enter a card up front, get full plan access immediately, and aren’t charged until day 15. Cancel any time during the trial from your account page or the Stripe Billing Portal to avoid all charges.',
  },
  {
    q: 'How does annual billing work?',
    a: 'Annual billing saves 17% compared to monthly (roughly 2 months free). You can switch between monthly and annual at any time from your account settings.',
  },
  {
    q: 'What happens to my workflows if I downgrade?',
    a: "Everything stays. You can still access, search, and export all your existing workflows. You just can't create new recordings beyond your plan limit.",
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your workflow data is stored in your workspace and never shared with third parties. All processing is deterministic and auditable. Enterprise plans support custom retention policies and on-premise deployment.',
  },
  {
    q: 'How is Ledgerium different from Scribe or Tango?',
    a: 'Scribe and Tango capture annotated screenshots — visual walkthroughs of what happened on screen. Ledgerium captures structured interaction data: timing, system context, confidence scores, and evidence traces. The result is structured process data you can diff, compare across runs, and feed into automation — not a static screenshot guide.',
  },
  {
    q: 'How does this compare to process mining tools like Celonis?',
    a: 'Process mining tools analyze system event logs and require IT integration, API access to enterprise backends (SAP, Salesforce), and dedicated implementation teams. That architecture means they capture what systems recorded — not what people actually did. Ledgerium captures real human activity directly from the browser. No IT involvement, no API access required, no backend integration. You install a Chrome extension and get your first process map in under 5 minutes.',
  },
];

// Feature comparison table data
// Category dividers render between rows where `category` is set on the row immediately following.
// Vocabulary refocus per CEO directive 2026-05-17: users / workflows / outputs (NOT recorders / viewers / recordings).
const COMPARISON_FEATURES = [
  // What You Capture
  { label: 'Price (monthly)',      free: '$0',        starter: '$49',      team: '$249',      growth: '$799',    enterprise: 'Custom', category: 'What You Capture' },
  { label: 'User seats',           free: '1 user',    starter: '1 user',   team: '5 users',   growth: '15 users', enterprise: 'Custom' },
  { label: 'Workflows / month',    free: '5',         starter: '15',       team: 'Unlimited', growth: 'Unlimited', enterprise: 'Custom' },

  // What You Get
  { label: 'AI-generated SOPs',           free: true,  starter: true,  team: true,  growth: true,  enterprise: true,  category: 'What You Get' },
  { label: 'Visual process maps',         free: true,  starter: true,  team: true,  growth: true,  enterprise: true },
  { label: 'Process health scores',       free: false, starter: true,  team: true,  growth: true,  enterprise: true },
  { label: 'Full intelligence layer',     free: false, starter: false, team: true,  growth: true,  enterprise: true },
  { label: 'Bottleneck & friction analysis', free: false, starter: false, team: true, growth: true, enterprise: true },
  { label: 'Automation opportunity scoring', free: false, starter: false, team: true, growth: true, enterprise: true },
  { label: 'Variation analysis across runs', free: false, starter: false, team: true, growth: true, enterprise: true },

  // Sharing & Collaboration
  { label: 'Public sharing link',     free: true,  starter: true,  team: true,  growth: true,  enterprise: true,  category: 'Sharing & Collaboration' },
  { label: 'Clean exports — PDF, Markdown, JSON', free: false, starter: true,  team: true,  growth: true,  enterprise: true },
  { label: 'Shared team workspace',   free: false, starter: false, team: true,  growth: true,  enterprise: true },
  { label: 'Team library & portfolios', free: false, starter: false, team: true, growth: true, enterprise: true },

  // Advanced & Enterprise
  { label: 'Advanced cross-workflow analytics', free: false, starter: false, team: false, growth: true, enterprise: true, category: 'Advanced & Enterprise' },
  { label: 'AI agent composition',    free: false, starter: false, team: false, growth: true, enterprise: true },
  { label: 'Integration risk assessment', free: false, starter: false, team: false, growth: true, enterprise: true },
  { label: 'SSO & RBAC',              free: false, starter: false, team: false, growth: false, enterprise: 'coming-soon' },
  { label: 'Audit trail',             free: false, starter: false, team: false, growth: false, enterprise: 'coming-soon' },
  { label: 'On-premise deployment',   free: false, starter: false, team: false, growth: false, enterprise: 'coming-soon' },
] as const;

type CellValue = boolean | string;

function ComparisonCell({ value }: { value: CellValue }) {
  if (value === 'coming-soon') {
    return (
      <span className="inline-block text-amber-400 bg-amber-900/20 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap">
        Coming soon
      </span>
    );
  }
  if (value === true) {
    return <span className="text-brand-400 font-semibold text-base leading-none">✓</span>;
  }
  if (value === false) {
    return <span className="text-[var(--content-tertiary)]">—</span>;
  }
  // String value (price, seat count, etc.)
  return <span className="text-[var(--content-primary)] text-sm">{value}</span>;
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: a,
    },
  })),
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Hero — PRICING-P02: Record Once. Know Everything. + 4-bullet output grid */}
      <section className="pt-20 pb-10 bg-gradient-to-b from-brand-900/30 via-brand-900/10 to-transparent">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--content-primary)] tracking-tight leading-[1.1]">
            Record Once. Know Everything.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[#e2e8f0] leading-relaxed">
            One Chrome extension. Every time you work a process, Ledgerium captures it and turns it into:
          </p>
          {/* 4-bullet output grid (UX §A spec) */}
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-left max-w-xl mx-auto">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#e2e8f0] leading-snug">
                An AI-generated SOP — ready to share or train from
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#e2e8f0] leading-snug">
                A visual process map — built from real behavior, not assumptions
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#e2e8f0] leading-snug">
                Variation analysis — see how your team's process differs run to run
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#e2e8f0] leading-snug">
                Automation candidates — ranked by opportunity score, backed by evidence
              </span>
            </li>
          </ul>
          <p className="mt-6 text-sm text-[var(--content-tertiary)]">
            Free forever on 5 workflows. No credit card. No setup.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-12 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <PricingCards />

          <p className="text-center text-sm text-[var(--content-tertiary)] mt-10 leading-relaxed max-w-xl mx-auto">
            All plans include the browser extension, deterministic processing,
            and privacy protections. Your data is never shared or used for training.
          </p>
        </div>
      </section>

      {/* Plan guidance strip */}
      <section className="bg-[var(--surface-secondary)] border-y border-[var(--border-default)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-x-0 divide-x divide-[var(--border-default)]">
            {[
              { plan: 'Free', tagline: 'Map your first workflows' },
              { plan: 'Starter', tagline: 'Document solo, share cleanly' },
              { plan: 'Team', tagline: 'Measure how your team works' },
              { plan: 'Growth', tagline: 'Find what to automate at scale' },
            ].map(({ plan, tagline }) => (
              <div key={plan} className="px-6 py-4 text-sm text-center min-w-[140px]">
                <span className="font-bold text-[var(--content-primary)]">{plan}</span>
                <span className="text-[var(--content-tertiary)]"> · {tagline}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-16 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-8 text-center">
            Compare plans
          </h2>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
                  <th className="text-left px-5 py-4 font-semibold text-[var(--content-secondary)] w-[220px] sticky left-0 bg-[var(--surface-elevated)] z-10">
                    Feature
                  </th>
                  {['Free', 'Starter'].map((col) => (
                    <th key={col} className="px-4 py-4 font-semibold text-[var(--content-secondary)] text-center">
                      {col}
                    </th>
                  ))}
                  {/* Team column — highlighted */}
                  <th className="px-4 py-4 text-center bg-brand-900/10 border-x border-brand-800/30">
                    <span className="inline-flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-white uppercase tracking-wider bg-brand-600 rounded-full px-3 py-0.5">
                        Most Popular
                      </span>
                      <span className="font-semibold text-brand-400">Team</span>
                    </span>
                  </th>
                  {['Growth', 'Enterprise'].map((col) => (
                    <th key={col} className="px-4 py-4 font-semibold text-[var(--content-secondary)] text-center">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((row, i) => {
                  const hasCategory = 'category' in row && row.category;
                  return (
                    <>
                      {hasCategory && (
                        <tr key={`cat-${row.label}`} className="bg-brand-900/20 border-t-2 border-brand-800/40">
                          <td colSpan={6} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-400 sticky left-0 bg-brand-900/20 z-10">
                            {row.category}
                          </td>
                        </tr>
                      )}
                      <tr
                        key={row.label}
                        className={`border-b border-[var(--border-default)] last:border-0 ${
                          i % 2 === 0
                            ? 'bg-[var(--surface-primary)]'
                            : 'bg-[var(--surface-secondary)]'
                        }`}
                      >
                        <td className={`px-5 py-3.5 font-medium text-[var(--content-primary)] sticky left-0 z-10 ${
                          i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'
                        }`}>
                          {row.label}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <ComparisonCell value={row.free} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <ComparisonCell value={row.starter} />
                        </td>
                        {/* Team column — highlighted with subtle brand tint */}
                        <td className="px-4 py-3.5 text-center bg-brand-900/10 border-x border-brand-800/30">
                          <ComparisonCell value={row.team} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <ComparisonCell value={row.growth} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <ComparisonCell value={row.enterprise} />
                        </td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <ROICalculator />

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

      {/* Secondary CTA — demo nudge */}
      <section className="py-10 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <p className="text-base text-[var(--content-secondary)]">
            Still not sure? See it in action first.
          </p>
          <Link
            href="/product"
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            Explore the interactive demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Map your first workflow. See exactly what your SOP looks like before you buy.
          </h2>
          <div className="mt-8">
            <TrackedLink
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'pricing_cta', destination: '/signup' }}
              className="btn-primary gap-2 text-base px-7 py-3.5 shadow-sm shadow-brand-600/20"
            >
              Map Your First Workflow Free
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
          </div>
          <p className="mt-3 text-ds-xs text-[#e2e8f0]">
            No credit card required · Data never used for training ·{' '}
            <a href="/privacy" className="underline hover:text-brand-600">
              Privacy &amp; security details
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
