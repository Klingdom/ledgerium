import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  AlertTriangle,
  Clock,
  BarChart2,
  MousePointer2,
  FileText,
  Library,
  Receipt,
  Ticket,
  UserPlus,
  ShoppingCart,
  Package,
  UserCog,
  Zap,
  Server,
  CheckCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Operations Teams — Ledgerium AI',
  description:
    'Ledgerium records what your team actually does in ERP, CRM, and internal tools — and generates SOPs automatically. No interviews, no workshops, no outdated documentation.',
  openGraph: {
    title: 'Operations Teams — Ledgerium AI',
    description:
      'Your ERP workflows are undocumented. Your SOPs are outdated. Your new hires are stuck. Ledgerium fixes that.',
  },
};

/* ── Pain point cards ───────────────────────────────────────────────────── */

const PAIN_POINTS = [
  {
    icon: AlertTriangle,
    title: 'SOPs written from memory',
    desc: 'Your last SOP update was 6 months ago. The process has changed 3 times since then.',
  },
  {
    icon: Clock,
    title: 'Training takes too long',
    desc: 'New hires follow the documented steps and get stuck. The real process has workarounds nobody wrote down.',
  },
  {
    icon: BarChart2,
    title: 'Process improvement is guesswork',
    desc: "You know some processes are inefficient, but you can't measure what you can't see.",
  },
];

/* ── How it solves it (alternating) ────────────────────────────────────── */

const HOW_IT_SOLVES = [
  {
    icon: MousePointer2,
    title: 'Record real workflows',
    desc: 'Open the extension, click Record, do your work. Every click, navigation, and form interaction is captured as structured data.',
  },
  {
    icon: FileText,
    title: 'Get instant documentation',
    desc: 'Stop recording. Get a complete SOP, process map, and workflow report — generated from evidence, not memory.',
  },
  {
    icon: Library,
    title: 'Build a living library',
    desc: 'Every workflow is searchable, shareable, and always up to date. Re-record when processes change and see exactly what\u2019s different.',
  },
];

/* ── Example workflow grid ──────────────────────────────────────────────── */

const EXAMPLE_WORKFLOWS = [
  { icon: Receipt, label: 'Submit expense report in Workday' },
  { icon: Ticket, label: 'Process a new support ticket in Zendesk' },
  { icon: UserPlus, label: 'Onboard a new customer in Salesforce' },
  { icon: ShoppingCart, label: 'Approve a purchase order in SAP' },
  { icon: Package, label: 'Update inventory in NetSuite' },
  { icon: UserCog, label: 'Configure a new user in Okta' },
];

/* ── Metrics strip ──────────────────────────────────────────────────────── */

const METRICS = [
  { icon: Zap, label: 'Under 5 min to first SOP' },
  { icon: CheckCircle, label: 'Reproducible output' },
  { icon: Server, label: 'No IT integration' },
  { icon: ArrowRight, label: 'Free to start' },
];

/* ── Page component ─────────────────────────────────────────────────────── */

export default function OperationsUseCasePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <span className="inline-block text-xs font-semibold text-brand-600 uppercase tracking-widest border border-brand-700/40 rounded-full px-4 py-1.5 mb-6 bg-brand-900/20">
              For Operations Teams
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-[var(--content-primary)] leading-[1.1] tracking-tight">
              Your ERP workflows are undocumented.{' '}
              <span className="text-brand-600">Your SOPs are outdated.</span>{' '}
              Your new hires are stuck.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-[#e2e8f0] leading-relaxed max-w-2xl mx-auto">
              Ledgerium records what your team actually does in the browser — and generates the
              documentation automatically.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/product" className="btn-secondary text-base px-7 py-3.5">
                See how it works
              </Link>
            </div>

            <p className="mt-5 text-xs text-[var(--content-tertiary)]">
              Free to start. No credit card required.
            </p>
          </div>
        </div>
        {/* Gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-900/20 via-transparent to-[var(--surface-secondary)]" />
      </section>

      {/* ── The Problem Section ───────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              The operations documentation gap
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PAIN_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-7 flex flex-col gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-900/20 border border-brand-700/25 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Ledgerium Solves It ───────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              From recording to documentation in minutes
            </h2>
          </div>

          <div className="space-y-16">
            {HOW_IT_SOLVES.map(({ icon: Icon, title, desc }, index) => {
              /* Odd indices (0, 2): icon left, text right. Even index (1): text left, icon right. */
              const iconRight = index % 2 !== 0;

              const iconBlock = (
                <div className="flex items-center justify-center">
                  <div className="w-24 h-24 rounded-3xl bg-brand-900/20 border border-brand-700/30 flex items-center justify-center shadow-lg shadow-brand-900/20">
                    <Icon className="h-10 w-10 text-brand-600" />
                  </div>
                </div>
              );

              const textBlock = (
                <div className="flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-[var(--content-primary)] mb-3">{title}</h3>
                  <p className="text-[#e2e8f0] leading-relaxed">{desc}</p>
                </div>
              );

              return (
                <div
                  key={title}
                  className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-8 sm:gap-12 items-center"
                >
                  {iconRight ? (
                    <>
                      <div className="order-2 sm:order-1">{iconBlock}</div>
                      <div className="order-1 sm:order-2">{textBlock}</div>
                    </>
                  ) : (
                    <>
                      <div>{iconBlock}</div>
                      <div>{textBlock}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Use Case Examples ─────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              Common operations workflows
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXAMPLE_WORKFLOWS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-4 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--surface-elevated)] transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-900/20 border border-brand-700/25 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-brand-600" />
                </div>
                <p className="text-sm font-medium text-[var(--content-primary)] leading-snug">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof / Metrics Strip ─────────────────────────────────── */}
      <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {METRICS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-2.5 text-[var(--content-secondary)]"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-brand-600" />
                <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
            Start documenting what actually happens
          </h2>
          <p className="mt-5 text-[#e2e8f0] leading-relaxed max-w-xl mx-auto">
            Install the extension, record a workflow, and get structured output in under 5 minutes.
            Free to start — no IT involvement required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/install" className="btn-secondary text-base px-7 py-3.5">
              Install extension
            </Link>
          </div>
          <p className="mt-5 text-xs text-[var(--content-tertiary)]">
            Free plan includes 5 recordings per month. No credit card required.
          </p>
        </div>
      </section>
    </>
  );
}
