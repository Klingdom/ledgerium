import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Eye, Shield, Zap, Target, BookOpen, CheckCircle, Camera, Server, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About — Ledgerium AI',
  description:
    'Evidence-based workflow intelligence. We capture how work actually happens so organizations can document, improve, and automate with confidence.',
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-4">
            Why Ledgerium exists
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            Most process documentation is aspirational.
            <br className="hidden sm:block" />
            We think it should be evidence-based.
          </h1>
          <p className="mt-6 text-lg text-[#e2e8f0] leading-relaxed">
            SOPs written from memory. Process maps drawn in workshops. Training
            docs that describe the ideal, not the reality. Every organization has
            this problem. Most don&apos;t know how big the gap is.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-8">
            The documentation gap
          </h2>
          <div className="space-y-5 text-[15px] text-[#e2e8f0] leading-relaxed">
            <p>
              Every organization runs on workflows — onboarding customers,
              processing claims, configuring systems, closing sales. These
              workflows are repeated thousands of times, but rarely captured
              accurately.
            </p>
            <p>
              The documented version says 5 steps. The reality involves 17,
              including 3 workarounds, 2 undocumented approvals, and a
              spreadsheet nobody talks about. The gap between documentation
              and reality grows every quarter.
            </p>
            <p>
              Now organizations are deploying AI and automation into these
              workflows — without ever observing what actually happens. They
              are automating processes they have never measured, scaling
              inefficiencies they have never seen.
            </p>
            <p className="text-[var(--content-primary)] font-medium">
              You can&apos;t improve what you can&apos;t see. You can&apos;t
              automate what you don&apos;t understand.
            </p>
          </div>
        </div>
      </section>

      {/* What we believe */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-[var(--content-primary)] mb-12">
            Principles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: Eye,
                title: 'Observation over opinion',
                desc: 'Workflows should be captured from what people do, not what they say they do. If it wasn\'t observed, it doesn\'t belong in the SOP.',
                takeaway: 'Your SOPs reflect what people do today — not what a workshop decided.',
              },
              {
                icon: Shield,
                title: 'Evidence over interpretation',
                desc: 'Every step, every instruction, every metric traces back to an observed event. No AI rewrites. No made-up content. No hallucination.',
                takeaway: 'Every instruction in the SOP has a source event you can verify.',
              },
              {
                icon: Target,
                title: 'Reproducibility over magic',
                desc: 'The same recording always produces the same output. You can re-record next quarter, compare the results, and see exactly what changed. If you can\'t explain it, you can\'t trust it.',
                takeaway: 'Re-record next quarter and get a meaningful diff, not a surprise.',
              },
              {
                icon: Zap,
                title: 'Capture before automation',
                desc: 'Before you automate a process, observe it. Before you optimize, get a baseline. Before you train someone, capture what the expert actually does.',
                takeaway: 'See the real steps before you hand a process to an AI agent.',
              },
              {
                icon: BookOpen,
                title: 'Structure over raw data',
                desc: 'A recording is useful only if it produces something actionable — SOPs, process maps, reports, searchable libraries. Data without structure is noise.',
                takeaway: 'You get an SOP and process map in minutes — not a video to watch.',
              },
              {
                icon: CheckCircle,
                title: 'Privacy is non-negotiable',
                desc: 'Sensitive values are redacted automatically. No screenshots, no video, no keystroke logging. Users see and control everything that gets captured.',
                takeaway: 'IT and compliance can approve deployment without escalation.',
              },
            ].map(({ icon: Icon, title, desc, takeaway }) => (
              <div key={title} className="card p-6">
                <Icon className="h-5 w-5 text-brand-600 mb-3" />
                <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
                {takeaway && (
                  <p className="mt-1.5 text-xs text-brand-400 leading-relaxed">{takeaway}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What makes us different */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-8">
            What makes Ledgerium different
          </h2>
          <div className="space-y-5 text-[15px] text-[#e2e8f0] leading-relaxed">
            <p>
              Most process documentation tools ask you to describe your
              workflows manually — flowchart builders, form-based SOP editors,
              screen recording tools that produce videos nobody watches.
            </p>
            <p>
              Ledgerium doesn&apos;t ask you to describe anything. It observes.
              You do your work in the browser. The extension captures structural
              interaction data — not screenshots, not keystrokes, not screen
              recordings — and a deterministic engine turns it into documentation.
            </p>
            <p>
              The same recording always produces the same output. There is no
              AI rewriting your steps. No hallucinated instructions. No creative
              interpretation. Every step in the generated SOP traces back to an
              observed event with timing and evidence.
            </p>
            <p className="text-[var(--content-primary)] font-medium">
              The result: process documentation you can actually trust, created in
              minutes instead of weeks.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/product" className="text-sm text-brand-600 hover:text-brand-500 font-medium inline-flex items-center gap-1.5">
              See the full walkthrough
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How we compare */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-xl font-bold text-[var(--content-primary)]">
              How we compare
            </h2>
            <p className="mt-3 text-[#e2e8f0]">
              We&apos;re not another documentation tool. Here&apos;s specifically how we differ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* vs. Screen Recorders */}
            <div className="card p-7 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <Camera className="h-4 w-4 text-brand-600 flex-shrink-0" />
                <span className="inline-block text-[11px] font-bold text-[var(--content-tertiary)] uppercase tracking-widest border border-[var(--border-subtle)] rounded-full px-3 py-1">
                  vs. Screen Recorders
                </span>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--content-tertiary)]">They capture:</span>{' '}
                  Annotated screenshots and visual walkthroughs
                </p>
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-brand-500">We capture:</span>{' '}
                  Structured interaction data with timing, confidence scores, and evidence traces
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-400 leading-snug border-t border-[var(--border-subtle)] pt-4 mt-auto">
                &ldquo;Scribe shows what the screen looks like. Ledgerium captures what the workflow actually is.&rdquo;
              </p>
            </div>

            {/* vs. Process Mining */}
            <div className="card p-7 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <Server className="h-4 w-4 text-brand-600 flex-shrink-0" />
                <span className="inline-block text-[11px] font-bold text-[var(--content-tertiary)] uppercase tracking-widest border border-[var(--border-subtle)] rounded-full px-3 py-1">
                  vs. Process Mining
                </span>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--content-tertiary)]">They capture:</span>{' '}
                  Event logs from enterprise systems (SAP, Salesforce)
                </p>
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-brand-500">We capture:</span>{' '}
                  Real human activity from the browser &mdash; no IT integration required
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-400 leading-snug border-t border-[var(--border-subtle)] pt-4 mt-auto">
                &ldquo;Process mining tells you what your system recorded. Ledgerium tells you what your people actually did.&rdquo;
              </p>
            </div>

            {/* vs. Documentation Tools */}
            <div className="card p-7 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-brand-600 flex-shrink-0" />
                <span className="inline-block text-[11px] font-bold text-[var(--content-tertiary)] uppercase tracking-widest border border-[var(--border-subtle)] rounded-full px-3 py-1">
                  vs. Documentation Tools
                </span>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--content-tertiary)]">They require:</span>{' '}
                  Humans to write and maintain process documentation
                </p>
                <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                  <span className="font-semibold text-brand-500">We generate:</span>{' '}
                  Documentation from direct observation of real workflows
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-400 leading-snug border-t border-[var(--border-subtle)] pt-4 mt-auto">
                &ldquo;Notion is where your SOPs go to become outdated. Ledgerium is where they stay current.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder / Company */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-5">
            Built by process people
          </h2>
          <p className="text-[15px] text-[#e2e8f0] leading-relaxed">
            Ledgerium AI was founded in 2025 with a simple observation: organizations are deploying
            AI and automation into processes they&apos;ve never actually measured. We build the
            observation layer &mdash; the foundation that makes everything else trustworthy.
          </p>
        </div>

        {/* Stats row */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 mt-10">
          <div className="border-t border-[var(--border-subtle)] pt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: 'Evidence-driven' },
              { value: 'Reproducible pipeline' },
              { value: 'Privacy-first architecture' },
              { value: '1,393 tests passing' },
            ].map(({ value }) => (
              <div key={value}>
                <p className="text-sm font-semibold text-[var(--content-primary)]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            See what your real workflows look like
          </h2>
          <p className="mt-3 text-[#e2e8f0]">
            Record your first workflow. See the structured output in under 5 minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/product" className="btn-primary gap-2 shadow-sm shadow-brand-600/20">
              See the product
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/signup" className="btn-secondary">
              Create free account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
