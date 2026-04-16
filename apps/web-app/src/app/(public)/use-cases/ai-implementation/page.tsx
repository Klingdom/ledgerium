import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  AlertTriangle,
  BarChart3,
  Eye,
  Zap,
  GitCompare,
  Clock,
  Target,
  Layers,
  Activity,
  Star,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Implementation Teams — Ledgerium AI',
  description:
    "You're deploying AI agents into workflows you've never observed. Ledgerium captures the real process first — so your agents execute accurately, not aspirationally.",
  openGraph: {
    title: 'AI Implementation Teams — Ledgerium AI',
    description:
      "AI agents built on assumed workflows break in production. Ledgerium captures the real process before you automate it — so your agents have ground truth, not workshop notes.",
  },
};

/* ── Problem cards ─────────────────────────────────────────────────────────── */

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: 'Automating the unknown',
    desc: 'Teams deploy RPA and AI agents into processes described in workshops, not observed in reality. The documentation is a best-guess reconstruction — not a record of what actually happens.',
  },
  {
    icon: Bot,
    title: 'Hallucinated workflows',
    desc: 'AI agents built on assumed step sequences break when the real process has 3x more steps and undocumented workarounds. Your agent is executing confidently against fiction.',
  },
  {
    icon: BarChart3,
    title: 'No baseline, no measurement',
    desc: "Without observing the current process, you can't measure if automation actually improved anything. You shipped the agent — but you have no idea if it's faster, more accurate, or just differently broken.",
  },
];

/* ── Feature blocks ────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Eye,
    title: 'Observe before you automate',
    desc: 'Record the actual human workflow. See every step, timing, system context, and decision point before handing it to an AI agent. Ground your automation in evidence, not assumptions.',
  },
  {
    icon: Zap,
    title: 'Generate automation blueprints',
    desc: 'Structured process data with step sequences, system interactions, and timing — ready to feed into n8n, Zapier, or custom agent frameworks. Give your agents a map of reality, not a sketch from memory.',
  },
  {
    icon: GitCompare,
    title: 'Measure the delta',
    desc: 'Re-record after automation. Compare human vs. automated execution step by step. Quantify what improved and what regressed — so you ship with evidence, not hope.',
  },
];

/* ── What You Get grid ─────────────────────────────────────────────────────── */

const DELIVERABLES = [
  {
    icon: Layers,
    title: 'Process capture with full context',
    desc: 'Every step recorded with system state, navigation path, and decision context',
  },
  {
    icon: ArrowRight,
    title: 'Step-by-step execution sequences',
    desc: 'Ordered, structured event chains ready for agent consumption',
  },
  {
    icon: Activity,
    title: 'System interaction mapping',
    desc: 'Which tools, fields, and UI surfaces the process touches — and in what order',
  },
  {
    icon: Clock,
    title: 'Timing and duration baselines',
    desc: 'Per-step and end-to-end timing so you can measure automation against reality',
  },
  {
    icon: Star,
    title: 'Confidence scores per step',
    desc: 'Signal quality indicators that surface ambiguous steps before they become agent failures',
  },
  {
    icon: Target,
    title: 'Automation opportunity scoring',
    desc: 'Identify which steps are high-value automation targets and which require human judgment',
  },
];

/* ── Page component ─────────────────────────────────────────────────────────── */

export default function AiImplementationPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-700/40 bg-brand-900/20 px-3 py-1 text-xs font-semibold text-brand-400 mb-6">
              <Bot className="h-3.5 w-3.5" />
              For AI &amp; Automation Teams
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[var(--content-primary)] leading-[1.1] tracking-tight">
              You&rsquo;re automating processes{' '}
              <br className="hidden sm:block" />
              <span className="text-brand-600">you&rsquo;ve never measured.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-[#e2e8f0] leading-relaxed max-w-2xl mx-auto">
              Ledgerium captures the real process first &mdash; so your agents
              execute accurately, not aspirationally.
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
          </div>
        </div>
        {/* Gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-900/20 via-transparent to-[var(--surface-secondary)]" />
      </section>

      {/* ── The Problem ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              The problem
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              The automation blind spot
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PROBLEMS.map(({ icon: Icon, title, desc }) => (
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
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              Observe. Blueprint. Measure.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-900/15 border border-brand-700/30 flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--content-primary)] mb-3">
                  {title}
                </h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Get ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              What you get
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              Everything your agents need to execute correctly
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DELIVERABLES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 p-5 rounded-xl border border-transparent hover:border-[var(--border-default)] hover:bg-[var(--surface-secondary)] transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-900/15 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-1">
                    {title}
                  </h3>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
            Capture the real process
            <br />
            before you automate it
          </h2>
          <p className="mt-5 text-[#e2e8f0] leading-relaxed max-w-xl mx-auto">
            Give your AI agents ground truth, not workshop notes. Record actual human
            execution, generate structured blueprints, and measure the delta after
            automation ships.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/product" className="btn-secondary text-base px-7 py-3.5">
              See how it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
