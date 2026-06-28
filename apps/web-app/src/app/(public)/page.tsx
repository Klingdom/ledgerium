import type { Metadata } from 'next';
import Image from 'next/image';
import { TrackedLink } from '@/components/TrackedLink';
import RealProductDemo from '@/components/demo/RealProductDemo';
import {
  ArrowRight,
  PlayCircle,
  Eye,
  FileText,
  Map,
  Library,
  TrendingUp,
  BookOpen,
  Shield,
  Zap,
  CheckCircle,
  MousePointer2,
  Sparkles,
  GraduationCap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ledgerium AI — Record Real Workflows. Get SOPs, Process Maps & AI Insights.',
  description:
    'Record how work actually happens in the browser. Get structured SOPs and process maps, see which workflows are ready for AI, and turn expert work into training docs — in minutes, not weeks.',
  openGraph: {
    title: 'Ledgerium AI — Record Real Workflows. Get SOPs, Process Maps & AI Insights.',
    description:
      'Your SOP says 5 steps. Your team takes 17. Record what actually happens and get SOPs, process maps, AI-readiness scores, and training docs automatically.',
  },
};

/* ── The three things every recording produces ──────────────────────────── */

const HERO_OUTCOMES = [
  {
    label: 'Process Map',
    src: '/img/demo/workflow-view.png',
    alt: 'Process map built from observed step transitions',
  },
  {
    label: 'SOP',
    src: '/img/demo/sop-view.png',
    alt: 'Generated standard operating procedure with evidence citations',
  },
  {
    label: 'AI Opportunity Report',
    src: '/img/demo/report-view.png',
    alt: 'Workflow report with AI-readiness scoring and cycle-time analysis',
  },
];

/* ── Three core value props ─────────────────────────────────────────────── */

const VALUE_PROPS = [
  {
    icon: Map,
    eyebrow: 'Capture once',
    title: 'Process maps & SOPs',
    desc: 'Record any browser workflow once. Get a step-by-step SOP and a visual process map built from what actually happened — not from memory.',
  },
  {
    icon: Sparkles,
    eyebrow: 'Find the leverage',
    title: 'AI use-case identification',
    desc: 'Every workflow is scored for AI readiness — based on step volume, run time, and how many systems it touches. See which workflows are candidates for automation, from your real process data, not a guess.',
  },
  {
    icon: GraduationCap,
    eyebrow: 'Keep the knowledge',
    title: 'Skill & expertise documentation',
    desc: 'Turn an expert’s recording into onboarding and training material automatically. Capture how your best people actually work before that knowledge walks out the door.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-20 sm:pt-28 sm:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[var(--content-primary)] leading-[1.1] tracking-tight">
              Your SOP says 5 steps.{' '}
              <br className="hidden sm:block" />
              <span className="text-brand-600">Your team takes 17.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-[#e2e8f0] leading-relaxed max-w-2xl mx-auto">
              Record real workflows in the browser. Get structured SOPs and
              process maps, see which workflows are ready for AI, and turn expert
              work into training docs — automatically.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <TrackedLink
                href="/signup"
                event="cta_clicked"
                properties={{ location: 'homepage_hero', destination: '/signup' }}
                className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </TrackedLink>
              <TrackedLink
                href="/product"
                event="cta_clicked"
                properties={{ location: 'homepage_hero', destination: '/product' }}
                className="btn-secondary text-base px-7 py-3.5 gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                See the Product
              </TrackedLink>
            </div>
            <p className="mt-5 text-xs text-[var(--content-tertiary)]">
              Free to start. No credit card required. Share any SOP with a public link.
            </p>
          </div>

          {/* Hero outcome row — the three things one recording produces */}
          <div className="mt-14 mx-auto max-w-5xl px-2 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {HERO_OUTCOMES.map(({ label, src, alt }, index) => (
                <figure key={label} className="group">
                  <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-md shadow-black/20 bg-[var(--surface-elevated)] transition-transform group-hover:-translate-y-0.5">
                    <Image
                      src={src}
                      alt={alt}
                      width={480}
                      height={300}
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="w-full h-40 object-cover object-top sm:h-auto sm:object-contain block"
                      priority={index === 0}
                    />
                  </div>
                  <figcaption className="mt-2.5 text-center text-xs font-semibold text-[var(--content-secondary)]">
                    {label}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="text-center text-xs text-[var(--content-tertiary)] mt-5">
              One recording. Three outputs — every detail traces back to a real, observed event.{' '}
              <TrackedLink
                href="/demo"
                event="cta_clicked"
                properties={{ location: 'homepage_hero_caption', destination: '/demo' }}
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                Walk through the product &rarr;
              </TrackedLink>
            </p>
          </div>
        </div>
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-900/20 via-transparent to-[var(--surface-secondary)]" />
      </section>

      {/* ── Social Proof Strip ────────────────────────────────────────────── */}
      <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Zap, label: 'Same input, same output — always' },
              { icon: Eye, label: 'Evidence-linked output' },
              { icon: Shield, label: 'Privacy-by-architecture' },
              { icon: CheckCircle, label: 'Measured, not estimated' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2.5 text-[var(--content-secondary)]">
                <Icon className="h-4 w-4 flex-shrink-0 text-brand-600" />
                <span className="text-sm font-medium text-center sm:whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three core value props (fast-scan) ────────────────────────────── */}
      <section className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              Why record your workflows
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              One recording. Three kinds of value.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUE_PROPS.map(({ icon: Icon, eyebrow, title, desc }) => (
              <div key={title} className="card p-7 flex flex-col gap-3 h-full">
                <div className="w-11 h-11 rounded-xl bg-brand-900/15 border border-brand-700/30 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <p className="text-[11px] font-bold text-brand-600 uppercase tracking-widest">
                  {eyebrow}
                </p>
                <h3 className="text-lg font-semibold text-[var(--content-primary)] -mt-1">{title}</h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)] py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-14">
            From recording to documentation in minutes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
            {[
              {
                step: '1',
                icon: MousePointer2,
                title: 'Record',
                desc: 'Open the browser extension and click Record. Do your work normally — the extension captures every click, form entry, and page navigation.',
              },
              {
                step: '2',
                icon: Zap,
                title: 'Process',
                desc: 'Stop recording. The engine segments your session into workflow steps with timing, phases, and confidence scores. Same input, same output — always.',
              },
              {
                step: '3',
                icon: FileText,
                title: 'Use',
                desc: 'Get a structured SOP, a visual process map, and a report that scores each workflow for AI readiness. Save it to your library, search it later, share it with your team.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-900/15 border border-brand-700/30 flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-brand-600" />
                </div>
                <p className="text-[11px] font-bold text-brand-600 uppercase tracking-widest mb-2">
                  Step {step}
                </p>
                <h3 className="text-lg font-semibold text-[var(--content-primary)] mb-3">{title}</h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Try the demo (live dashboard, moved below context) ─────────────── */}
      <section className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)] py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
            Try it without signing up
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-3">
            The workflow library you get after your first recording
          </h2>
          <p className="text-center text-[#e2e8f0] leading-relaxed mb-6 max-w-2xl mx-auto">
            Real sample workflows with evidence-linked metrics. Every cycle time, run count, and AI-readiness score is measured from an actual recording.
          </p>
          <div className="text-xs font-medium text-brand-600 mb-8 flex items-center justify-center gap-1.5">
            <MousePointer2 className="h-3.5 w-3.5" />
            Click any workflow row to open its SOP, process map, and report.
          </div>
          {/* Live, interactive workflow library demo (real components + sample data) */}
          <RealProductDemo />
          <p className="text-center text-xs text-[var(--content-tertiary)] mt-3">
            Every number shown comes from a real recording. Same input, same output — always.{' '}
            <TrackedLink
              href="/demo"
              event="cta_clicked"
              properties={{ location: 'homepage_demo_footer', destination: '/demo' }}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              See all four views &rarr;
            </TrackedLink>
          </p>
        </div>
      </section>

      {/* ── Example Output ────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-elevated)] border-b border-[var(--border-default)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: text */}
            <div>
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
                Real output
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-5">
                See what a generated SOP looks like
              </h2>
              <p className="text-[#e2e8f0] leading-relaxed mb-6">
                This SOP was generated automatically from a real browser recording — every instruction traces back to an observed event. Nothing was written by hand, nothing was rewritten by AI.
              </p>
              <TrackedLink
                href="/demo"
                event="cta_clicked"
                properties={{ location: 'homepage_sop_example', destination: '/demo' }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
              >
                Walk through all four views
                <ArrowRight className="h-3.5 w-3.5" />
              </TrackedLink>
            </div>

            {/* Right: framed real SOP screenshot */}
            <div>
              {/* Browser chrome */}
              <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-lg shadow-black/30 bg-[var(--surface-elevated)]">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[var(--surface-secondary)] border-b border-[var(--border-default)]">
                  {/* Traffic light dots */}
                  <span className="w-3 h-3 rounded-full bg-red-500/80 flex-shrink-0" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 flex-shrink-0" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80 flex-shrink-0" />
                  {/* URL bar */}
                  <div className="ml-2 flex-1 rounded-md bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-3 py-1">
                    <span className="text-[11px] text-[var(--content-tertiary)] font-mono">
                      ledgerium.ai/workflows
                    </span>
                  </div>
                </div>
                {/* Real SOP view screenshot */}
                <Image
                  src="/img/demo/sop-view.png"
                  alt="Example generated SOP with step-by-step instructions, system context, and evidence citations"
                  width={900}
                  height={560}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
              <p className="mt-3 text-xs text-[var(--content-tertiary)] text-center">
                Real output from a real workflow recording. No editing, no AI rewriting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What you get ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-secondary)] border-b border-[var(--border-default)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              Every recording produces real output
            </h2>
            <p className="mt-4 text-[#e2e8f0]">
              Not another video file to watch. Structured, searchable, reusable
              workflow intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: FileText, title: 'Standard Operating Procedures', desc: 'Step-by-step instructions with event-level detail. Prerequisites, inputs, outputs, and completion criteria — generated from what was observed.' },
              { icon: Map, title: 'Process Maps', desc: 'Visual workflow diagrams with phases, system boundaries, and transition labels. Built from observed transitions, ready to review or export.' },
              { icon: Sparkles, title: 'AI Opportunity Scoring', desc: 'Every workflow scored for AI readiness on step volume, run time, and system breadth — the signals that show where AI could take over.' },
              { icon: GraduationCap, title: 'Skill & Training Docs', desc: 'Generated SOPs double as onboarding material. New hires follow the real steps an expert took — not an outdated guide written from memory.' },
              { icon: Library, title: 'Workflow Library', desc: 'Every workflow saved to a persistent, searchable collection with cycle-time and run history. Find any workflow by title, tool, or date.' },
              { icon: CheckCircle, title: 'Reports & Export', desc: 'Download workflow reports, SOP documents, and raw data. Share any SOP via a public link — recipients see the output and can sign up free.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-xl border border-transparent hover:border-[var(--border-default)] hover:bg-[var(--surface-elevated)] transition-all">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-900/15 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-1">{title}</h3>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built Different ───────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              Competitive positioning
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              Built different
            </h2>
            <p className="mt-4 text-[#e2e8f0] leading-relaxed">
              Ledgerium isn&apos;t another documentation tool. Here&apos;s how we compare.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* vs. Screen Recorders */}
            <div className="card p-7 flex flex-col gap-4">
              <span className="inline-block text-[11px] font-bold text-[var(--content-tertiary)] uppercase tracking-widest border border-[var(--border-subtle)] rounded-full px-3 py-1 w-fit">
                vs. Screen Recorders
              </span>
              <div className="space-y-3">
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--content-tertiary)]">They</span> capture annotated screenshots.
                </p>
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-brand-500">We</span> capture structured process data with timing, confidence scores, and evidence traces.
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-500 leading-snug border-t border-[var(--border-subtle)] pt-4 mt-auto">
                &ldquo;You can&apos;t diff two screenshot SOPs. You can diff two Ledgerium recordings.&rdquo;
              </p>
            </div>

            {/* vs. Process Mining */}
            <div className="card p-7 flex flex-col gap-4">
              <span className="inline-block text-[11px] font-bold text-[var(--content-tertiary)] uppercase tracking-widest border border-[var(--border-subtle)] rounded-full px-3 py-1 w-fit">
                vs. Process Mining
              </span>
              <div className="space-y-3">
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--content-tertiary)]">They</span> analyze system event logs from enterprise software.
                </p>
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-brand-500">We</span> capture from the browser — no IT integration, no API access, no 6-month implementation.
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-500 leading-snug border-t border-[var(--border-subtle)] pt-4 mt-auto">
                &ldquo;Process mining costs $200K and takes 6 months. Ledgerium gives you a process map in 5 minutes.&rdquo;
              </p>
            </div>

            {/* vs. Manual Documentation */}
            <div className="card p-7 flex flex-col gap-4">
              <span className="inline-block text-[11px] font-bold text-[var(--content-tertiary)] uppercase tracking-widest border border-[var(--border-subtle)] rounded-full px-3 py-1 w-fit">
                vs. Manual Documentation
              </span>
              <div className="space-y-3">
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--content-tertiary)]">They</span> require humans to write and maintain SOPs.
                </p>
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-brand-500">We</span> generate documentation from observation — recorded from what people actually do.
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-500 leading-snug border-t border-[var(--border-subtle)] pt-4 mt-auto">
                &ldquo;Notion is where SOPs go to become outdated. Ledgerium is where they stay current.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[var(--content-primary)] mb-4">
            Built for teams that run on browser-based work
          </h2>
          <p className="text-center text-[#e2e8f0] mb-12 max-w-2xl mx-auto">
            If your team works in browser-based tools — ERP, CRM, ticketing, HR systems — Ledgerium records what actually happens and turns it into documentation, AI-readiness insight, and training material.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: TrendingUp, title: 'Operations Teams', desc: 'Record your ERP, CRM, and internal tool workflows. Get SOPs that match how work actually happens — not how someone remembers it.' },
              { icon: BookOpen, title: 'Training & Onboarding', desc: 'Capture expert workflows and turn them into onboarding docs instantly. New hires follow real steps, not outdated guides.' },
              { icon: Sparkles, title: 'AI & Automation Leads', desc: 'See which workflows are candidates for AI — scored from real process data — so you target automation where it actually pays off.' },
              { icon: Shield, title: 'Compliance & Audit', desc: 'Every step traces to observed evidence. Generate audit-ready process documentation with full traceability.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 hover:shadow-md transition-shadow">
                <Icon className="h-5 w-5 text-brand-600 mb-3" />
                <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-1.5">{title}</h3>
                <p className="text-xs text-[#e2e8f0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────────── */}
      <section className="py-12 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: 'Reproducible', label: 'Same recording, same output — every time' },
              { value: 'Private', label: 'Your data stays yours' },
              { value: 'No AI guessing', label: 'Evidence, not interpretation' },
              { value: 'Free to start', label: 'No credit card needed' },
            ].map(({ value, label }) => (
              <div key={value}>
                <p className="text-sm font-bold text-[var(--content-primary)]">{value}</p>
                <p className="text-xs text-[var(--content-tertiary)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
            Stop documenting from memory.
            <br />
            Start recording what actually happens.
          </h2>
          <p className="mt-5 text-[#e2e8f0] leading-relaxed">
            Install the extension, record a workflow, and get a SOP, process map,
            and AI-readiness report in under 5 minutes. Free to start.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <TrackedLink
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'homepage_bottom_cta', destination: '/signup' }}
              className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
            <TrackedLink
              href="/install"
              event="cta_clicked"
              properties={{ location: 'homepage_bottom_cta', destination: '/install' }}
              className="btn-secondary text-base px-7 py-3.5"
            >
              Install extension
            </TrackedLink>
          </div>
        </div>
      </section>
    </>
  );
}
