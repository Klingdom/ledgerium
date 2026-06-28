import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'What Is Process Intelligence? A Practical Definition — Ledgerium AI',
  description:
    'Process intelligence turns observed work into a measurable, improvable model. A practical definition, how it differs from documentation and process mining, and where to start.',
  openGraph: {
    type: 'article',
    title: 'What Is Process Intelligence? A Practical Definition',
    description:
      'Process intelligence turns real, observed work into a measurable model you can improve. Here is a practical definition and where to start.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'What Is Process Intelligence? A Practical Definition',
  description:
    'Process intelligence turns observed work into a measurable, improvable model. A practical definition, how it differs from documentation and process mining, and where to start.',
  datePublished: '2026-06-28',
  dateModified: '2026-06-28',
  author: { '@type': 'Organization', name: 'Ledgerium Research Team' },
  publisher: { '@type': 'Organization', name: 'Ledgerium AI' },
  mainEntityOfPage: 'https://ledgerium.ai/blog/what-is-process-intelligence',
};

export default function ProcessIntelligencePost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Post header */}
      <section className="pt-16 pb-10 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to blog
          </Link>

          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest border rounded-full px-2.5 py-0.5 mb-4 bg-brand-600/10 text-brand-400 border-brand-600/20">
            Process Intelligence
          </span>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            What Is Process Intelligence? A Practical Definition
          </h1>

          <div className="mt-4 flex items-center gap-3 text-sm text-[var(--content-tertiary)]">
            <time dateTime="2026-06-28">June 28, 2026</time>
            <span aria-hidden="true">&middot;</span>
            <span>7 min read</span>
          </div>
        </div>
      </section>

      {/* Post body */}
      <article className="py-14 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6 text-[15px] text-[#e2e8f0] leading-relaxed">

          <p>
            Process intelligence is the practice of turning how work actually happens into a
            measurable, improvable model. Not a document describing how a process should run,
            and not a dashboard of lagging metrics, but a structured picture of the real steps,
            their sequence, their timing, and where they vary. The term gets used loosely, so
            here is a practical definition: process intelligence is what you get when you
            observe real work, structure it as data, measure it, and use that to improve it.
          </p>

          <p className="text-[var(--content-primary)] font-medium">
            Observed behavior, then structured events, then deterministic processing, then
            process intelligence. Each stage depends on the one before it.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            It is not the same as process documentation
          </h2>

          <p>
            Process documentation is an artifact: an SOP, a flowchart, a checklist. It describes
            a process. Process intelligence is a capability: it measures a process. The two are
            related, and good documentation is often an output of process intelligence, but they
            answer different questions. Documentation answers &ldquo;what are the steps?&rdquo;
            Intelligence answers &ldquo;where is time lost, what varies between people, and what
            is worth changing?&rdquo;
          </p>

          <p>
            The distinction matters because most teams have documentation that nobody trusts and
            no intelligence at all. They can show you a procedure, but they cannot tell you how
            long it really takes, how often it reworks, or which step is the bottleneck.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            It is not only process mining
          </h2>

          <p>
            Process mining is one route to process intelligence. It reconstructs a process from
            event logs that systems already produce. When those logs are clean and the process
            lives inside one well-instrumented system, mining is powerful and analyzes enormous
            volumes of history. But a great deal of real work spans several browser tools, and
            the steps in between, the lookups, the copy-paste, the manual checks, are exactly the
            ones the logs never record. Process intelligence is the broader goal; mining is one
            way to reach it for log-rich processes.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            The four layers
          </h2>

          <p>
            It helps to think of process intelligence as four layers, each building on the last.
          </p>

          <p>
            <span className="text-[var(--content-primary)] font-medium">Capture.</span> Record
            what actually happens, from real work rather than recollection. This is the
            foundation, and the layer most teams skip.
          </p>
          <p>
            <span className="text-[var(--content-primary)] font-medium">Structure.</span> Turn
            the capture into structured events with timing and system context, so the process
            becomes data rather than a video or a memory.
          </p>
          <p>
            <span className="text-[var(--content-primary)] font-medium">Measure.</span> Derive
            the signals that matter: cycle time split into work and wait, rework, variation
            between people, and where the process slows down.
          </p>
          <p>
            <span className="text-[var(--content-primary)] font-medium">Improve.</span> Use the
            measurements to standardize, remove waste, and decide what is worth automating, then
            re-capture to confirm the change worked.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            Why it starts with observation
          </h2>

          <p>
            Every layer above depends on the capture being real. If you start from a workshop
            diagram or an interview, the model inherits the same blind spots that make
            documentation drift: the ideal version, not the real one. People are poor witnesses
            to their own behavior. They describe the process they believe they follow, and omit
            the workarounds and informal approvals that make up the actual work. Process
            intelligence that starts from observation avoids that filter.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            What you can do with it
          </h2>

          <p>
            Once a process is captured, structured, and measured, the practical uses follow
            quickly. You can set a baseline and prove an improvement against it. You can find
            the waste, which is usually wait time and handoffs rather than the busy step. You
            can standardize how a team works and check later whether the standard is holding.
            And you can identify the repetitive, rule-based steps that are the strongest
            candidates for AI or automation, with evidence rather than opinion.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            How Ledgerium approaches it
          </h2>

          <p>
            Ledgerium records browser-based workflows directly as structured interaction events
            with timing and system context, no screenshots and no keystrokes. That capture is
            then processed deterministically: the same recording always produces the same
            output, and every derived signal traces back to a source event. The result is an
            SOP, a process map, and an intelligence report generated from real work, with a
            baseline you can measure against. You can see how the capture and processing
            pipeline works on the{' '}
            <Link href="/product" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">
              product page
            </Link>
            .
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            The core principle
          </h2>

          <p className="text-[var(--content-primary)] font-medium">
            Process intelligence is not a dashboard you buy. It is a discipline that starts by
            observing real work and ends with a process you can measure and improve. You cannot
            improve what you cannot see, and you cannot see a process you have only ever
            described from memory.
          </p>

        </div>
      </article>

      {/* Post footer CTA */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            See process intelligence on one of your workflows
          </h2>
          <p className="mt-3 text-[#e2e8f0]">
            Record a workflow once and get an SOP, a process map, and a measured baseline.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2 shadow-sm shadow-brand-600/20">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/workflow-library" className="btn-secondary">
              Browse the workflow library
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
