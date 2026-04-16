import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Camera,
  Database,
  Check,
  X,
  Clock,
  Shield,
  GitCompare,
  BarChart2,
  Layers,
  Zap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ledgerium vs Scribe — Comparison | Ledgerium AI',
  description:
    'Scribe captures annotated screenshots. Ledgerium captures structured interaction data. Understand the structural difference before you choose a tool.',
  openGraph: {
    title: 'Ledgerium vs Scribe — Comparison | Ledgerium AI',
    description:
      'Scribe captures annotated screenshots. Ledgerium captures structured interaction data. Understand the structural difference before you choose a tool.',
  },
};

/* ── Comparison table data ──────────────────────────────────────────────── */

type ComparisonValue = boolean | string;

interface ComparisonRow {
  label: string;
  scribe: ComparisonValue;
  ledgerium: ComparisonValue;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Capture method',
    scribe: 'Screenshots + annotations',
    ledgerium: 'Structural interaction data',
  },
  {
    label: 'Output format',
    scribe: 'Visual walkthrough (images)',
    ledgerium: 'Structured data (JSON, Markdown)',
  },
  {
    label: 'Can you diff two recordings?',
    scribe: false,
    ledgerium: true,
  },
  {
    label: 'Timing data per step',
    scribe: false,
    ledgerium: 'Yes, millisecond precision',
  },
  {
    label: 'Confidence scores',
    scribe: false,
    ledgerium: true,
  },
  {
    label: 'System context tracking',
    scribe: false,
    ledgerium: 'Yes, app / domain / URL',
  },
  {
    label: 'Privacy model',
    scribe: 'Screenshots (contains visible data)',
    ledgerium: 'No screenshots, no keystrokes',
  },
  {
    label: 'Deterministic output',
    scribe: false,
    ledgerium: true,
  },
  {
    label: 'Process intelligence',
    scribe: false,
    ledgerium: 'Bottleneck, friction, automation scoring',
  },
  {
    label: 'Price (individual)',
    scribe: '~$23/user/mo',
    ledgerium: '$49/mo (Starter)',
  },
  {
    label: 'Free tier',
    scribe: 'Limited',
    ledgerium: '5 recordings/mo',
  },
];

/* ── Cell renderer ──────────────────────────────────────────────────────── */

function ComparisonCell({
  value,
  variant,
}: {
  value: ComparisonValue;
  variant: 'scribe' | 'ledgerium';
}) {
  if (value === true) {
    return (
      <span
        className={
          variant === 'ledgerium'
            ? 'text-brand-400 font-semibold text-base leading-none'
            : 'text-[var(--content-secondary)] font-semibold text-base leading-none'
        }
      >
        <Check className="h-4 w-4 inline" />
      </span>
    );
  }
  if (value === false) {
    return <span className="text-[var(--content-tertiary)]"><X className="h-4 w-4 inline opacity-40" /></span>;
  }
  return (
    <span
      className={`text-sm ${
        variant === 'ledgerium'
          ? 'text-[var(--content-primary)]'
          : 'text-[var(--content-secondary)]'
      }`}
    >
      {value}
    </span>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function CompareScribePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
          {/* Badge */}
          <span className="inline-block text-xs font-semibold text-brand-600 uppercase tracking-widest border border-brand-700/40 rounded-full px-4 py-1.5 mb-6 bg-brand-900/20">
            Comparison
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[var(--content-primary)] leading-[1.1] tracking-tight">
            Ledgerium vs. Scribe:{' '}
            <span className="text-brand-600">What&apos;s actually different?</span>
          </h1>

          <p className="mt-6 text-lg text-[#e2e8f0] leading-relaxed max-w-2xl mx-auto">
            This is not a feature checklist. It&apos;s a structural comparison. Scribe and
            Ledgerium solve different problems at a different level — and understanding
            that difference will tell you which one belongs in your workflow.
          </p>
        </div>
        {/* Gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-900/20 via-transparent to-[var(--surface-secondary)]" />
      </section>

      {/* ── The Core Difference ───────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[var(--content-primary)]">
              The core difference
            </h2>
            <p className="mt-3 text-[#e2e8f0] max-w-xl mx-auto">
              Both tools watch you work. What they record — and what they produce — is
              fundamentally different.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scribe — left, neutral */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-default)] flex items-center justify-center flex-shrink-0">
                  <Camera className="h-5 w-5 text-[var(--content-tertiary)]" />
                </div>
                <h3 className="text-base font-bold text-[var(--content-secondary)]">
                  Scribe captures
                </h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Annotated screenshots at each step',
                  'Visual walkthroughs showing what the screen looks like',
                  'Step-by-step images with overlaid callouts',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--content-secondary)] leading-relaxed">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--content-tertiary)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-widest mb-1">
                  Output
                </p>
                <p className="text-sm text-[var(--content-secondary)] font-medium">
                  A screenshot guide — a visual record of what the screen looked like.
                </p>
              </div>
            </div>

            {/* Ledgerium — right, brand accent */}
            <div className="rounded-xl border border-brand-700/40 bg-brand-900/10 p-8 flex flex-col gap-5 shadow-lg shadow-brand-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-900/20 border border-brand-700/30 flex items-center justify-center flex-shrink-0">
                  <Database className="h-5 w-5 text-brand-500" />
                </div>
                <h3 className="text-base font-bold text-brand-400">
                  Ledgerium captures
                </h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Structured interaction events: clicks, inputs, navigation',
                  'Timing data with millisecond precision per step',
                  'System context: app, domain, URL at every point',
                  'Confidence scores per observed interaction',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[#e2e8f0] leading-relaxed">
                    <Check className="mt-0.5 flex-shrink-0 h-4 w-4 text-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="pt-4 border-t border-brand-800/40">
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-1">
                  Output
                </p>
                <p className="text-sm text-[var(--content-primary)] font-medium">
                  Structured process data you can diff, version, and feed into
                  automation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Comparison Table ──────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-[var(--content-primary)] mb-8 text-center">
            Side-by-side comparison
          </h2>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
                  <th className="text-left px-5 py-4 font-semibold text-[var(--content-secondary)] sticky left-0 bg-[var(--surface-elevated)] z-10">
                    Feature
                  </th>
                  <th className="px-5 py-4 font-semibold text-[var(--content-tertiary)] text-center w-[200px]">
                    Scribe
                  </th>
                  {/* Ledgerium column — highlighted */}
                  <th className="px-5 py-4 text-center w-[200px] bg-brand-900/10 border-x border-brand-800/30">
                    <span className="inline-flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-white uppercase tracking-wider bg-brand-600 rounded-full px-3 py-0.5">
                        This product
                      </span>
                      <span className="font-semibold text-brand-400">Ledgerium</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-[var(--border-default)] last:border-0 ${
                      i % 2 === 0
                        ? 'bg-[var(--surface-primary)]'
                        : 'bg-[var(--surface-secondary)]'
                    }`}
                  >
                    <td
                      className={`px-5 py-3.5 font-medium text-[var(--content-primary)] sticky left-0 z-10 ${
                        i % 2 === 0
                          ? 'bg-[var(--surface-primary)]'
                          : 'bg-[var(--surface-secondary)]'
                      }`}
                    >
                      {row.label}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <ComparisonCell value={row.scribe} variant="scribe" />
                    </td>
                    <td className="px-5 py-3.5 text-center bg-brand-900/10 border-x border-brand-800/30">
                      <ComparisonCell value={row.ledgerium} variant="ledgerium" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── When to use Scribe ────────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            {/* Scribe */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] flex items-center justify-center flex-shrink-0">
                  <Camera className="h-4 w-4 text-[var(--content-tertiary)]" />
                </div>
                <h2 className="text-lg font-bold text-[var(--content-primary)]">
                  When to use Scribe
                </h2>
              </div>
              <p className="text-[15px] text-[#e2e8f0] leading-relaxed">
                Scribe is a good fit if you need quick visual walkthroughs for showing
                someone where to click. It&apos;s fast, familiar, and well-established.
                If your goal is to produce a screenshot-based guide that helps a new
                colleague navigate an interface, Scribe handles that well.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  'One-time guides for showing UI steps visually',
                  'Teams comfortable with screenshot-based documentation',
                  'Ad hoc how-to content for internal wikis',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--content-secondary)] leading-relaxed">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--content-tertiary)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Ledgerium */}
            <div className="rounded-xl border border-brand-700/30 bg-brand-900/10 p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-brand-900/20 border border-brand-700/30 flex items-center justify-center flex-shrink-0">
                  <Layers className="h-4 w-4 text-brand-500" />
                </div>
                <h2 className="text-lg font-bold text-[var(--content-primary)]">
                  When to use Ledgerium
                </h2>
              </div>
              <p className="text-[15px] text-[#e2e8f0] leading-relaxed">
                Ledgerium is the right choice when you need structured process
                data — when you want to compare how a workflow changes over time,
                detect bottlenecks, measure performance, prepare for automation, or
                generate audit-safe documentation.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  'Compare recordings over time to detect process drift',
                  'Measure step timing and identify bottlenecks',
                  'Prepare structured evidence for automation or compliance',
                  'Generate documentation without writing anything',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[#e2e8f0] leading-relaxed">
                    <Check className="mt-0.5 flex-shrink-0 h-4 w-4 text-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why structural capture matters ───────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-xl font-bold text-[var(--content-primary)]">
              Why the structure difference matters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: GitCompare,
                title: 'Diff recordings',
                desc: 'Re-record a workflow next quarter and see exactly what changed. Screenshots cannot be diffed.',
              },
              {
                icon: Clock,
                title: 'Measure time',
                desc: 'Millisecond timing per step reveals where time is actually lost. An image cannot tell you how long something took.',
              },
              {
                icon: BarChart2,
                title: 'Detect bottlenecks',
                desc: 'Structured data enables bottleneck and friction analysis across runs, teams, and time.',
              },
              {
                icon: Shield,
                title: 'Privacy by design',
                desc: 'No screenshots means no visible data leakage. Sensitive values are never captured in the first place.',
              },
              {
                icon: Zap,
                title: 'Feed automation',
                desc: 'Structured interaction data can seed RPA, AI agents, and workflow automation — screenshot guides cannot.',
              },
              {
                icon: Database,
                title: 'Deterministic output',
                desc: 'The same recording always produces the same result. You can verify and trust it.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 flex flex-col gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-900/20 border border-brand-700/25 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-brand-600" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--content-primary)]">{title}</h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
            Try Ledgerium free — 5 recordings, no credit card
          </h2>
          <p className="mt-5 text-[#e2e8f0] leading-relaxed max-w-xl mx-auto">
            Record your first workflow in under 5 minutes. Get structured process
            data, an auto-generated SOP, and a process map — from direct observation,
            not memory.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/product" className="btn-secondary text-base px-7 py-3.5">
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-xs text-[var(--content-tertiary)]">
            Free plan includes 5 recordings per month · No screenshots ever captured ·{' '}
            <Link href="/privacy" className="underline hover:text-brand-500">
              Privacy details
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
