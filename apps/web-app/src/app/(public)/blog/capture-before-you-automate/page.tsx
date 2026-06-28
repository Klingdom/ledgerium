import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Capture Before You Automate — Ledgerium AI',
  description:
    'Teams are deploying AI agents into processes they have never measured. The observation layer is the missing foundation. Why you should capture before you automate.',
  openGraph: {
    type: 'article',
    title: 'Capture Before You Automate',
    description:
      'You cannot automate what you have not measured. Why capturing the real process is the missing first step before deploying AI and automation.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'Capture Before You Automate',
  description:
    'Teams are deploying AI agents into processes they have never measured. The observation layer is the missing foundation. Why you should capture before you automate.',
  datePublished: '2026-06-24',
  dateModified: '2026-06-24',
  author: { '@type': 'Organization', name: 'Ledgerium Research Team' },
  publisher: { '@type': 'Organization', name: 'Ledgerium AI' },
  mainEntityOfPage: 'https://ledgerium.ai/blog/capture-before-you-automate',
};

export default function CaptureBeforeAutomatePost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Post header */}
      <section className="pt-16 pb-10 bg-gradient-to-b from-amber-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to blog
          </Link>

          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest border rounded-full px-2.5 py-0.5 mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
            AI &amp; Automation
          </span>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            Capture Before You Automate
          </h1>

          <div className="mt-4 flex items-center gap-3 text-sm text-[var(--content-tertiary)]">
            <time dateTime="2026-06-24">June 24, 2026</time>
            <span aria-hidden="true">&middot;</span>
            <span>6 min read</span>
          </div>
        </div>
      </section>

      {/* Post body */}
      <article className="py-14 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6 text-[15px] text-[#e2e8f0] leading-relaxed">

          <p>
            A pattern is repeating across operations teams. Leadership decides this is the year
            for AI and automation. A budget appears, a pilot is chosen, and an agent or a script
            is pointed at a process. A few months later the pilot has quietly stalled. The
            automation worked in the demo and broke on the real cases, or it automated a step
            that was never the problem, or nobody can say whether it actually saved any time.
          </p>

          <p>
            The common thread is not the technology. It is that the process was automated before
            it was ever measured.
          </p>

          <p className="text-[var(--content-primary)] font-medium">
            You cannot automate what you have not measured, because you do not yet know which
            step is worth automating or what the real process even is.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            Automation built on the ideal process fails on the real one
          </h2>

          <p>
            Most automation is designed against the documented process: the clean, four-step
            version that lives in an SOP. But the real process has exceptions, workarounds, an
            informal approval over chat, and a lookup in a spreadsheet nobody officially knows
            about. Automation built against the ideal version meets the real version on day one
            and falls over at the first exception. The messy reality is exactly the part that
            was never written down, and exactly the part that determines whether the automation
            survives contact with production.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            Teams automate the loud step, not the costly one
          </h2>

          <p>
            Without measurement, automation targets come from opinion: whoever complains loudest,
            whatever feels repetitive. That instinct points at the visible, annoying task, which
            is rarely where the time actually goes. In most processes the cost is in wait time
            and handoffs, not the busy step. Automating the loud step produces a demo that looks
            impressive and a process that is just as slow as before, because the real bottleneck
            was somewhere else.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            The observation layer is the missing foundation
          </h2>

          <p>
            The fix is an order-of-operations change. Before you automate, capture the real
            process and measure it. Observation gives you three things automation cannot succeed
            without: the actual steps including the exceptions, a measurement of where time is
            really spent, and a baseline to prove whether the change worked. With those in hand,
            the automation target stops being a guess and becomes a decision backed by evidence.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            What capture-first looks like in practice
          </h2>

          <p>
            <span className="text-[var(--content-primary)] font-medium">Record the real
            process.</span> Capture the workflow as someone actually performs it, including the
            steps between systems.
          </p>
          <p>
            <span className="text-[var(--content-primary)] font-medium">Measure it.</span> Look
            at where time is spent, which steps repeat, and where the process reworks or waits.
          </p>
          <p>
            <span className="text-[var(--content-primary)] font-medium">Pick the candidate with
            evidence.</span> Target the repetitive, rule-based, high-volume steps. Leave
            judgment, exceptions, and anything high-risk to a person.
          </p>
          <p>
            <span className="text-[var(--content-primary)] font-medium">Automate, then
            re-measure.</span> After the change, re-capture the process and compare it to the
            baseline. The time saved is then a number, not a claim.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            Where humans stay involved
          </h2>

          <p>
            Capture-first does not mean automate everything. The steps that should keep a human
            involved are usually clear once a process is measured: the approvals, the judgment
            calls, the exceptions that do not fit the rules. Automation handles the repetitive,
            rule-based work; people handle the cases that need a decision. Measuring the process
            first is what makes that line visible.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            How Ledgerium fits
          </h2>

          <p>
            Ledgerium records the real workflow as structured data and produces a report that
            scores where time is spent and which steps are the strongest automation candidates,
            so the decision is grounded in observed work rather than opinion. Re-recording after
            a change measures the result against the baseline. You can read more about finding
            candidates on the{' '}
            <Link href="/ai-opportunities/accounts-payable" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">
              AI opportunities pages
            </Link>{' '}
            or the guide on{' '}
            <Link href="/use-cases/problems/how-to-identify-ai-automation-opportunities" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">
              how to identify AI automation opportunities
            </Link>
            .
          </p>

          <p className="text-[var(--content-primary)] font-medium">
            The organizations that succeed with AI in their workflows are not the ones with the
            most sophisticated tools. They are the ones that measured the process first.
          </p>

        </div>
      </article>

      {/* Post footer CTA */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Find where AI can actually help
          </h2>
          <p className="mt-3 text-[#e2e8f0]">
            Record a workflow free and see which steps are worth automating, with evidence.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2 shadow-sm shadow-brand-600/20">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/ai-opportunities" className="btn-secondary">
              See AI opportunities
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
