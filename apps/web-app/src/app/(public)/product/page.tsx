import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Play,
  MousePointer2,
  Layers,
  FileText,
  Library,
  ArrowRight,
  CheckCircle,
  Map,
  LayoutDashboard,
  Zap,
  BarChart3,
  Bot,
  Shield,
  GitCompare,
  Eye,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Product — Ledgerium AI',
  description:
    'From recording to process intelligence in minutes. See how Ledgerium captures real browser workflows and produces SOPs, process maps, health scores, and AI agent compositions.',
  openGraph: {
    title: 'Product — Ledgerium AI',
    description:
      'Capture real browser workflows. Get structured SOPs, process maps, and AI-powered process intelligence — deterministically.',
  },
};

/* ── Product tour steps ─────────────────────────────────────────────────── */

const TOUR_STEPS = [
  {
    step: 1,
    icon: Play,
    title: 'Record',
    what: 'Open the Ledgerium side panel in Chrome. Name your workflow and click Record. The extension captures every click, navigation, and form interaction as structured data.',
    result: 'A live step feed shows your progress. No screenshots, no keystrokes, no screen recording — just interaction structure.',
  },
  {
    step: 2,
    icon: MousePointer2,
    title: 'Process',
    what: 'Click Stop. The deterministic engine segments your session into logical steps with timing, system context, and confidence scores.',
    result: 'Same input always produces the same output. Every step traces to specific observed browser events.',
  },
  {
    step: 3,
    icon: FileText,
    title: 'Analyze',
    what: 'Ledgerium generates a complete SOP, visual process map, workflow report, and actionable insights — all from a single recording.',
    result: 'Ready-to-share documentation with prerequisites, system context, and expected outcomes — generated from evidence, not memory.',
  },
  {
    step: 4,
    icon: Zap,
    title: 'Act',
    what: 'Build a searchable library. Get process health scores, bottleneck detection, and AI agent compositions as your library grows.',
    result: 'The more you record, the more intelligence you unlock — variant analysis, automation scoring, and cross-workflow comparison.',
  },
];

/* ── What every recording produces ──────────────────────────────────────── */

const OUTPUTS = [
  { icon: Layers, label: 'Workflow Steps', sub: 'With timing and evidence' },
  { icon: FileText, label: 'SOP Document', sub: 'Step-by-step instructions' },
  { icon: Map, label: 'Process Map', sub: 'Phases and transitions' },
  { icon: CheckCircle, label: 'Workflow Report', sub: 'Health scores and export' },
];

/* ── Intelligence layer features ────────────────────────────────────────── */

const INTELLIGENCE_FEATURES = [
  {
    icon: BarChart3,
    title: 'Process Health Scores',
    description: 'Deterministic 0-100 scores for completeness, confidence, complexity, and duration across every workflow.',
  },
  {
    icon: Eye,
    title: 'Bottleneck & Friction Detection',
    description: 'Identify where time is lost, where errors happen, and where processes diverge from the expected path.',
  },
  {
    icon: GitCompare,
    title: 'Variant & Rework Analysis',
    description: 'Compare how different people do the same process. See where variants emerge and which path is most efficient.',
  },
  {
    icon: Bot,
    title: 'AI Agent Composition',
    description: 'Automatically identify which steps an AI agent could handle and generate implementation-ready agent profiles.',
  },
];

/* ── Comparison table data ──────────────────────────────────────────────── */

const COMPARISON_ROWS = [
  {
    dimension: 'Input method',
    ledgerium: 'Structured browser events',
    screenshot: 'Screen captures / screenshots',
    mining: 'System event logs (SAP, Salesforce)',
    manual: 'Interviews, workshops, memory',
  },
  {
    dimension: 'Output type',
    ledgerium: 'Structured data + SOP + process map',
    screenshot: 'Annotated screenshot walkthrough',
    mining: 'Process flow from system logs',
    manual: 'Text document (Notion, Confluence)',
  },
  {
    dimension: 'Deterministic',
    ledgerium: 'Yes — same input, same output',
    screenshot: 'No — depends on annotation',
    mining: 'Partially — depends on log quality',
    manual: 'No — depends on author',
  },
  {
    dimension: 'Evidence-linked',
    ledgerium: 'Every step traces to source events',
    screenshot: 'No — screenshots are static images',
    mining: 'Partial — linked to system logs only',
    manual: 'No — based on recall',
  },
  {
    dimension: 'Privacy',
    ledgerium: 'No screenshots, no keystrokes',
    screenshot: 'Captures screen content',
    mining: 'Requires system API access',
    manual: 'Depends on what is documented',
  },
  {
    dimension: 'Time to first output',
    ledgerium: 'Under 5 minutes',
    screenshot: 'Under 5 minutes',
    mining: '3-6 months (implementation)',
    manual: 'Days to weeks',
  },
  {
    dimension: 'IT involvement',
    ledgerium: 'None — Chrome extension',
    screenshot: 'None — browser extension',
    mining: 'Required — system integration',
    manual: 'None',
  },
];

/* ── Page component ─────────────────────────────────────────────────────── */

export default function ProductPage() {
  return (
    <>
      {/* ── Hero with embedded demo ──────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--content-primary)] leading-[1.1] tracking-tight">
              From recording to{' '}
              <span className="text-brand-600">process intelligence</span>
              {' '}in minutes
            </h1>
            <p className="mt-6 text-lg text-[#e2e8f0] leading-relaxed max-w-2xl mx-auto">
              Capture real browser workflows. Get structured SOPs, interactive process maps,
              health scores, and AI-powered analysis — deterministically.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="/dashboard.html" className="btn-secondary text-base px-7 py-3.5 gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Interactive Demo
              </a>
            </div>
            <p className="mt-4 text-xs text-[var(--content-tertiary)]">
              No credit card required. Explore sample workflows instantly.
            </p>
          </div>

          {/* Embedded demo preview */}
          <div className="mt-16 mx-auto max-w-5xl">
            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-lg shadow-[var(--border-default)]/50 bg-[var(--surface-elevated)]">
              <div className="bg-[var(--surface-secondary)] border-b border-[var(--border-default)] px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <span className="text-[10px] text-[var(--content-tertiary)] ml-2 font-mono">ledgerium.ai/dashboard</span>
              </div>
              <iframe
                src="/dashboard.html"
                title="Ledgerium AI Interactive Demo"
                className="w-full border-0"
                style={{ height: '560px' }}
                loading="lazy"
              />
            </div>
            <p className="text-center text-xs text-[var(--content-tertiary)] mt-3">
              Interactive demo with real sample workflows.{' '}
              <a href="/dashboard.html" className="text-brand-600 hover:text-brand-700 font-medium">
                Open full screen &rarr;
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Product Tour (4 steps) ───────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-4">
            How it works
          </h2>
          <p className="text-center text-[#e2e8f0] mb-16 max-w-xl mx-auto">
            Four steps from browser recording to actionable process intelligence.
          </p>

          <div className="space-y-16">
            {TOUR_STEPS.map(({ step, icon: Icon, title, what, result }) => (
              <div key={step} className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white font-bold shadow-sm shadow-brand-600/20">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-brand-500 uppercase tracking-wider">Step {step}</span>
                    <h3 className="text-lg font-bold text-[var(--content-primary)]">{title}</h3>
                  </div>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed mb-2">
                    {what}
                  </p>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-brand-400 leading-relaxed">{result}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What every recording produces ────────────────────────────── */}
      <section className="py-16 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-[var(--content-primary)] mb-10">
            Every recording produces
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {OUTPUTS.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="card p-5 text-center">
                <Icon className="h-5 w-5 text-brand-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-[var(--content-primary)]">{label}</p>
                <p className="text-[11px] text-[var(--content-tertiary)] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intelligence Layer ────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-2">Intelligence Layer</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-4">
              Your library gets smarter with every recording
            </h2>
            <p className="text-[#e2e8f0] max-w-2xl mx-auto">
              Individual recordings produce documentation. A growing library unlocks
              process intelligence — health scores, bottleneck detection, variant analysis,
              and AI automation opportunities.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {INTELLIGENCE_FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card p-6 hover:border-[rgba(255,255,255,0.12)] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-900/30">
                    <Icon className="h-4.5 w-4.5 text-brand-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--content-primary)]">{title}</h3>
                </div>
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-[var(--content-tertiary)]">
              Intelligence features available on{' '}
              <Link href="/pricing" className="text-brand-500 hover:text-brand-400 font-medium">
                Team and Growth plans
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ──────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-4">
              Built different
            </h2>
            <p className="text-[#e2e8f0] max-w-2xl mx-auto">
              Ledgerium isn&apos;t another screen recorder or documentation tool.
              It captures the <em>structure</em> of your work — not screenshots, not video, not what you remember.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface-elevated)]">
                  <th className="text-left px-4 py-3 text-[var(--content-tertiary)] font-medium text-xs uppercase tracking-wider border-b border-[var(--border-default)]">
                    Dimension
                  </th>
                  <th className="text-left px-4 py-3 text-brand-400 font-semibold text-xs uppercase tracking-wider border-b border-[var(--border-default)] bg-brand-900/10">
                    Ledgerium AI
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--content-tertiary)] font-medium text-xs uppercase tracking-wider border-b border-[var(--border-default)]">
                    Screenshot Tools
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--content-tertiary)] font-medium text-xs uppercase tracking-wider border-b border-[var(--border-default)]">
                    Process Mining
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--content-tertiary)] font-medium text-xs uppercase tracking-wider border-b border-[var(--border-default)]">
                    Manual Docs
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(({ dimension, ledgerium, screenshot, mining, manual }, i) => (
                  <tr key={dimension} className={i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'}>
                    <td className="px-4 py-3 text-[var(--content-primary)] font-medium border-b border-[var(--border-subtle)] whitespace-nowrap">
                      {dimension}
                    </td>
                    <td className="px-4 py-3 text-brand-400 border-b border-[var(--border-subtle)] bg-brand-900/5">
                      {ledgerium}
                    </td>
                    <td className="px-4 py-3 text-[var(--content-secondary)] border-b border-[var(--border-subtle)]">
                      {screenshot}
                    </td>
                    <td className="px-4 py-3 text-[var(--content-secondary)] border-b border-[var(--border-subtle)]">
                      {mining}
                    </td>
                    <td className="px-4 py-3 text-[var(--content-secondary)] border-b border-[var(--border-subtle)]">
                      {manual}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Privacy & Trust Strip ─────────────────────────────────────── */}
      <section className="py-12 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: Shield, label: 'No screenshots', sub: 'No screen recording ever' },
              { icon: Eye, label: 'No keystrokes', sub: 'Typed content is never captured' },
              { icon: CheckCircle, label: 'Deterministic', sub: 'Same input, same output' },
              { icon: Layers, label: 'Evidence-linked', sub: 'Every step traces to source' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <Icon className="h-5 w-5 text-brand-600" />
                <p className="text-sm font-semibold text-[var(--content-primary)]">{label}</p>
                <p className="text-[11px] text-[var(--content-tertiary)]">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
            Get your first SOP in 60 seconds
          </h2>
          <p className="mt-4 text-[#e2e8f0] max-w-lg mx-auto">
            Sign up free and explore a sample workflow immediately —
            no extension install required. When you&apos;re ready, record your own.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2 text-base px-7 py-3.5 shadow-sm shadow-brand-600/20">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/install" className="btn-secondary text-base px-7 py-3.5">
              Install Extension
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--content-tertiary)]">
            Free plan includes 5 recordings per month. No credit card required.
          </p>
        </div>
      </section>
    </>
  );
}
