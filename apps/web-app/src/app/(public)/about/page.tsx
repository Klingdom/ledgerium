import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Eye, Shield, Zap, Target, BookOpen, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About — Ledgerium AI',
  description:
    'Evidence-based workflow intelligence. We capture how work actually happens so organizations can document, improve, and automate with confidence.',
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-4">
            Why Ledgerium exists
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Most process documentation is aspirational.
            <br className="hidden sm:block" />
            We think it should be evidence-based.
          </h1>
          <p className="mt-6 text-lg text-gray-500 leading-relaxed">
            SOPs written from memory. Process maps drawn in workshops. Training
            docs that describe the ideal, not the reality. Every organization has
            this problem. Most don&apos;t know how big the gap is.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-gray-900 mb-8">
            The documentation gap
          </h2>
          <div className="space-y-5 text-[15px] text-gray-600 leading-relaxed">
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
            <p className="text-gray-900 font-medium">
              You can&apos;t improve what you can&apos;t see. You can&apos;t
              automate what you don&apos;t understand.
            </p>
          </div>
        </div>
      </section>

      {/* What we believe */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-12">
            Principles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: Eye,
                title: 'Observation over opinion',
                desc: 'Workflows should be captured from what people do, not what they say they do. If it wasn\'t observed, it doesn\'t belong in the SOP.',
              },
              {
                icon: Shield,
                title: 'Evidence over interpretation',
                desc: 'Every step, every instruction, every metric traces back to an observed event. No AI rewrites. No made-up content. No hallucination.',
              },
              {
                icon: Target,
                title: 'Determinism over magic',
                desc: 'The same recording always produces the same output. Reproducibility is the foundation of trust. If you can\'t explain it, you can\'t trust it.',
              },
              {
                icon: Zap,
                title: 'Capture before automation',
                desc: 'Before you automate a process, observe it. Before you optimize, get a baseline. Before you train someone, capture what the expert actually does.',
              },
              {
                icon: BookOpen,
                title: 'Structure over raw data',
                desc: 'A recording is useful only if it produces something actionable — SOPs, process maps, reports, searchable libraries. Data without structure is noise.',
              },
              {
                icon: CheckCircle,
                title: 'Privacy is non-negotiable',
                desc: 'Sensitive values are redacted automatically. No screenshots, no video, no keystroke logging. Users see and control everything that gets captured.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6">
                <Icon className="h-5 w-5 text-brand-600 mb-3" />
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works (brief) */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-gray-900 mb-8">
            How it works
          </h2>
          <div className="space-y-5 text-[15px] text-gray-600 leading-relaxed">
            <p>
              You install a Chrome extension and record a workflow by doing your
              normal work. The extension captures interaction events — clicks,
              form entries, navigation, system feedback — as structured data.
            </p>
            <p>
              A deterministic engine segments the events into meaningful
              workflow steps, each with timing, confidence scores, and evidence
              linkage. From these steps, it generates SOPs with event-level
              instructions, visual process maps with phases and transitions,
              and structured reports.
            </p>
            <p>
              Everything is saved to a persistent workflow library you can
              search, filter, export, and return to. The same recording always
              produces the same output. Evidence in, structured intelligence out.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            See what your real workflows look like
          </h2>
          <p className="mt-3 text-gray-500">
            Record a workflow. Review the structured output. Decide if
            evidence-based process capture is what your team needs.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2 shadow-sm shadow-brand-600/20">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="btn-secondary">
              See how it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
