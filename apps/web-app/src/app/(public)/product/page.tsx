import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { TrackedLink } from '@/components/TrackedLink';
import DemoVariantsMap from '@/components/demo/DemoVariantsMap';
import DemoDashboard from '@/components/demo/DemoDashboard';
import RealProductDemo from '@/components/demo/RealProductDemo';
import DemoAnnotatedDashboardHeader from '@/components/demo/DemoAnnotatedDashboardHeader';
import DemoAnnotatedWorkflowViews from '@/components/demo/DemoAnnotatedWorkflowViews';
import DemoAnnotatedReport from '@/components/demo/DemoAnnotatedReport';
import {
  Play,
  Layers,
  FileText,
  Library,
  ArrowRight,
  CheckCircle,
  Map,
  LayoutDashboard,
  Zap,
  BarChart3,
  Shield,
  GitCompare,
  Eye,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Browser Workflow Recorder & SOP Generator — Ledgerium AI',
  description:
    'Automatic process documentation from real browser activity. Record workflows once, get structured SOPs, process maps, and AI-ready data instantly. No screenshots, no writing.',
  openGraph: {
    title: 'Browser Workflow Recorder & SOP Generator — Ledgerium AI',
    description:
      'Capture real browser workflows with structured interaction data. Get SOPs, process maps, and process intelligence — deterministically, in minutes.',
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
    image: {
      src: '/docs/screenshots/extension/04-recording-active.png',
      alt: 'Ledgerium Chrome extension side panel capturing workflow steps in real time',
      width: 360,
      height: 640,
      url: 'Ledgerium Recorder',
      type: 'extension' as const,
    },
  },
  {
    step: 2,
    icon: Map,
    title: 'See the process map',
    what: 'Click any workflow. The process map renders from observed transitions. Switch to the frequency overlay to see how often each path was actually taken, or Variants to compare how different runs diverged.',
    result: 'The map was measured, not drawn. The thick paths are the route most runs actually took — every edge is a real transition.',
    image: {
      src: '/img/demo/workflow-view.png',
      alt: 'Workflow process map with directly-follows graph showing observed step transitions and frequencies',
      width: 900,
      height: 560,
      url: 'ledgerium.ai/workflows',
      type: 'webapp' as const,
    },
  },
  {
    step: 3,
    icon: FileText,
    title: 'Get the SOP',
    what: 'Ledgerium generates a complete step-by-step SOP from the recording. Every step cites the events it came from — and you can ask the workflow a question and get an answer grounded in the captured evidence.',
    result: 'Ready-to-share documentation with prerequisites, system context, and expected outcomes — generated from what was observed, not from memory.',
    image: {
      src: '/img/demo/sop-view.png',
      alt: 'Generated standard operating procedure with step-by-step instructions and evidence citations',
      width: 900,
      height: 560,
      url: 'ledgerium.ai/workflows',
      type: 'webapp' as const,
    },
  },
  {
    step: 4,
    icon: BarChart3,
    title: 'See the report',
    what: 'The report leads with a verdict, then a scorecard, a step-duration timestudy, and a before/after ROI estimate. Toggle steps as removed or automated to see the projected cycle time.',
    result: 'The ROI number is arithmetic over your own observed step durations — based on your real run history, not a consultant’s estimate.',
    image: {
      src: '/img/demo/report-view.png',
      alt: 'Workflow report showing process health verdict, scorecard, cycle-time distribution, and bottleneck analysis',
      width: 900,
      height: 560,
      url: 'ledgerium.ai/workflows',
      type: 'webapp' as const,
    },
  },
];

/* ── What every recording produces ──────────────────────────────────────── */

const OUTPUTS = [
  {
    icon: LayoutDashboard,
    label: 'Workflow Library',
    sub: 'Searchable and measured',
    image: { src: '/img/demo/dashboard.png', alt: 'Workflow library dashboard with cycle-time metrics and health scores' },
  },
  {
    icon: Map,
    label: 'Process Map',
    sub: 'Observed transitions',
    image: { src: '/img/demo/workflow-view.png', alt: 'Visual process map built from observed step transitions' },
  },
  {
    icon: FileText,
    label: 'SOP Document',
    sub: 'Step-by-step, evidence-cited',
    image: { src: '/img/demo/sop-view.png', alt: 'Generated SOP document with step-by-step instructions' },
  },
  {
    icon: BarChart3,
    label: 'Workflow Report',
    sub: 'Verdict, scorecard and ROI',
    image: { src: '/img/demo/report-view.png', alt: 'Workflow report with health verdict, scorecard, and cycle-time analysis' },
  },
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
    icon: Zap,
    title: 'Before / After ROI',
    description: 'Compare a baseline recording against an improved one. Time saved and dollar ROI are computed from your own observed step durations — never a benchmark or an estimate.',
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
    dimension: 'Reproducible',
    ledgerium: 'Yes — same recording, same output every time',
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

/* ── Frame components ───────────────────────────────────────────────────── */

function WebAppFrame({ src, alt, width, height, url = 'ledgerium.ai/dashboard' }: { src: string; alt: string; width: number; height: number; url?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-xl shadow-black/40 bg-[var(--surface-elevated)]">
      <div className="bg-[var(--surface-secondary)] border-b border-[var(--border-default)] px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[10px] text-[var(--content-tertiary)] ml-2 font-mono">{url}</span>
      </div>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto block"
        loading="lazy"
      />
    </div>
  );
}

function ExtensionFrame({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  return (
    <div className="mx-auto" style={{ maxWidth: '220px' }}>
      <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-xl shadow-black/40 bg-[var(--surface-elevated)]">
        {/* Extension panel header */}
        <div className="bg-[var(--surface-secondary)] border-b border-[var(--border-default)] px-3 py-2 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-brand-600/20 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          </div>
          <span className="text-[9px] text-[var(--content-tertiary)] font-medium tracking-wide">Ledgerium Recorder</span>
        </div>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>
    </div>
  );
}

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
              <TrackedLink
                href="/signup"
                event="cta_clicked"
                properties={{ location: 'product_hero', destination: '/signup' }}
                className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </TrackedLink>
              <Link href="/demo" className="btn-secondary text-base px-7 py-3.5 gap-2">
                <LayoutDashboard className="h-4 w-4" />
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-xs text-[var(--content-tertiary)]">
              No credit card required. Explore sample workflows instantly.
            </p>
          </div>

          {/* Live workflow library demo — real product components, sample data */}
          <div className="mt-16 mx-auto max-w-5xl">
            <div className="relative">
              <div className="absolute inset-0 -m-6 rounded-3xl bg-brand-600/5 blur-2xl pointer-events-none" />
              <div className="relative">
                <RealProductDemo />
              </div>
            </div>
            <p className="text-center text-xs text-[var(--content-tertiary)] mt-3">
              Your workflow library — filter it, every number comes from a real recording.{' '}
              <Link href="/demo" className="text-brand-600 hover:text-brand-700 font-medium">
                Walk through all four views &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Annotated Dashboard Header — Container 1 ─────────────────── */}
      <section className="py-20 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
            Live demo — no signup
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-3">
            The workflow library dashboard
          </h2>
          <p className="text-center text-[#e2e8f0] leading-relaxed mb-8 max-w-2xl mx-auto">
            The dashboard aggregates every recorded workflow into a portfolio baseline.
            Click any numbered marker to learn what each surface measures.
          </p>
          <DemoAnnotatedDashboardHeader />
        </div>
      </section>

      {/* ── Live interactive demo — the real process map, no signup ──── */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
            Try it live — no signup
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-3">
            Click between the real product views
          </h2>
          <p className="text-center text-[#e2e8f0] leading-relaxed mb-8 max-w-2xl mx-auto">
            This is the actual Ledgerium variants explorer running on a sample
            &ldquo;Approve Expense Report&rdquo; workflow — 6 paths across 16 recorded runs.
            Switch between <span className="text-brand-400 font-medium">Map</span>,{' '}
            <span className="text-brand-400 font-medium">Frequency</span>,{' '}
            <span className="text-brand-400 font-medium">DNA</span>, and{' '}
            <span className="text-brand-400 font-medium">List</span> views to see the dominant path,
            the rework loop, and the exception path. Nothing here is drawn — it is measured.
          </p>
          <DemoVariantsMap />
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <TrackedLink
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'product_live_demo', destination: '/signup' }}
              className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
            >
              Try it on your own workflows
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
            <Link href="/demo" className="btn-secondary text-base px-7 py-3.5">
              See the full walkthrough
            </Link>
          </div>
          <p className="text-center text-xs text-[var(--content-tertiary)] mt-4">
            Sample data shown. Every edge and timing is computed from observed runs — the same engine that runs on your own recordings.
          </p>
        </div>
      </section>

      {/* ── Annotated Workflow Views — Container 2 ───────────────────── */}
      <section className="py-20 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
            Drill into any workflow
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-3">
            Process map, SOP, and variants — in one place
          </h2>
          <p className="text-center text-[#e2e8f0] leading-relaxed mb-8 max-w-2xl mx-auto">
            Click any numbered marker to learn what each view surfaces. Switch between
            the process map and the generated SOP.
          </p>
          <DemoAnnotatedWorkflowViews />
        </div>
      </section>

      {/* ── Container 3: the Workflow Report ───────────────────────────── */}
      <section className="py-20 border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-4">
            The report
          </h2>
          <p className="text-center text-[#e2e8f0] leading-relaxed mb-8 max-w-2xl mx-auto">
            Every recorded workflow produces a full quantitative report — scorecard,
            timestudy, bottlenecks, automation, ROI, and more. Scroll inside it, and
            click any numbered marker to learn what a section surfaces.
          </p>
          <DemoAnnotatedReport />
        </div>
      </section>

      {/* ── Product Tour (4 steps — alternating layout) ──────────────── */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-4">
            How it works
          </h2>
          <p className="text-center text-[#e2e8f0] mb-20 max-w-xl mx-auto">
            Four steps from browser recording to actionable process intelligence.
          </p>

          <div className="space-y-24">
            {TOUR_STEPS.map(({ step, icon: Icon, title, what, result, image }) => {
              /* Odd steps (1, 3): text left, image right. Even steps (2, 4): image left, text right. */
              const imageRight = step % 2 !== 0;

              const textBlock = (
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-bold shadow-sm shadow-brand-600/20 flex-shrink-0">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold text-brand-500 uppercase tracking-wider">Step {step}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--content-primary)] mb-4">{title}</h3>
                  <p className="text-[#e2e8f0] leading-relaxed mb-4">{what}</p>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-brand-500 mt-1 flex-shrink-0" />
                    <p className="text-sm text-brand-400 leading-relaxed">{result}</p>
                  </div>
                </div>
              );

              const imageBlock = (
                <div className="relative">
                  {/* Subtle gradient glow behind the screenshot */}
                  <div className="absolute inset-0 -m-6 rounded-3xl bg-brand-600/5 blur-2xl pointer-events-none" />
                  <div className="relative">
                    {image.type === 'extension' ? (
                      <ExtensionFrame src={image.src} alt={image.alt} width={image.width} height={image.height} />
                    ) : (
                      <WebAppFrame src={image.src} alt={image.alt} width={image.width} height={image.height} url={image.url} />
                    )}
                  </div>
                </div>
              );

              return (
                <div key={step} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                  {imageRight ? (
                    <>
                      <div>{textBlock}</div>
                      <div>{imageBlock}</div>
                    </>
                  ) : (
                    <>
                      {/* On mobile, text comes first regardless of desktop order */}
                      <div className="order-2 lg:order-1">{imageBlock}</div>
                      <div className="order-1 lg:order-2">{textBlock}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── What every recording produces ────────────────────────────── */}
      <section className="py-16 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-[var(--content-primary)] mb-10">
            Every recording produces
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {OUTPUTS.map(({ icon: Icon, label, sub, image }) => (
              <div key={label} className="card overflow-hidden group hover:border-[rgba(255,255,255,0.12)] transition-colors">
                {/* Thumbnail preview */}
                <div className="relative overflow-hidden bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)]" style={{ aspectRatio: '16/9' }}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                  {/* Subtle gradient overlay at bottom of thumbnail */}
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--surface-elevated)] to-transparent" />
                </div>
                {/* Card text */}
                <div className="p-4 text-center">
                  <Icon className="h-5 w-5 text-brand-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[var(--content-primary)]">{label}</p>
                  <p className="text-[11px] text-[var(--content-tertiary)] mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intelligence Layer ────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-2">Intelligence Layer</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-4">
              Your library gets smarter with every recording
            </h2>
            <p className="text-[#e2e8f0] max-w-2xl mx-auto">
              Individual recordings produce documentation. A growing library unlocks
              process intelligence — a portfolio timestudy baseline, health scores,
              bottleneck detection, variant analysis, and automation opportunity scoring.
            </p>
          </div>

          {/* Hero — the real workflow library with the portfolio timestudy baseline */}
          <div className="mb-10 relative">
            <div className="absolute inset-0 -m-4 rounded-3xl bg-brand-600/5 blur-2xl pointer-events-none" />
            <div className="relative">
              <WebAppFrame
                src="/img/demo/dashboard.png"
                alt="Workflow library with the portfolio timestudy baseline, cycle-time columns, run counts, and health scores"
                width={900}
                height={560}
                url="ledgerium.ai/dashboard"
              />
            </div>
          </div>

          {/* Detail — drill into a single process report */}
          <div className="mb-14 mx-auto max-w-3xl relative">
            <div className="absolute inset-0 -m-4 rounded-3xl bg-brand-600/5 blur-2xl pointer-events-none" />
            <div className="relative">
              <WebAppFrame
                src="/img/demo/report-view.png"
                alt="Process report showing health verdict, scorecard, cycle-time distribution, and bottleneck analysis"
                width={900}
                height={560}
                url="ledgerium.ai/workflows"
              />
            </div>
            <p className="text-center text-xs text-[var(--content-tertiary)] mt-3">
              Drill into any process to see step-level health, timing breakdowns, and rework patterns.
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
              { icon: CheckCircle, label: 'Reproducible', sub: 'Same recording, same output' },
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
            <TrackedLink
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'product_bottom_cta', destination: '/signup' }}
              className="btn-primary gap-2 text-base px-7 py-3.5 shadow-sm shadow-brand-600/20"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
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
