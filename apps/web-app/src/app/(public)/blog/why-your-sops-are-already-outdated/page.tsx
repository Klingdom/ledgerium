import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Why Your SOPs Are Already Outdated — Ledgerium AI',
  description:
    "Most process documentation is written from memory, not observation. Here's why that matters — and what to do about it.",
};

export default function SopsOutdatedPost() {
  return (
    <>
      {/* Post header */}
      <section className="pt-16 pb-10 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to blog
          </Link>

          {/* Category badge */}
          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest border rounded-full px-2.5 py-0.5 mb-4 bg-brand-600/10 text-brand-400 border-brand-600/20">
            Process Intelligence
          </span>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            Why Your SOPs Are Already Outdated
          </h1>

          {/* Meta */}
          <div className="mt-4 flex items-center gap-3 text-sm text-[var(--content-tertiary)]">
            <time dateTime="2026-04-10">April 10, 2026</time>
            <span aria-hidden="true">&middot;</span>
            <span>5 min read</span>
          </div>
        </div>
      </section>

      {/* Post body */}
      <article className="py-14 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6 text-[15px] text-[#e2e8f0] leading-relaxed">

          <p>
            Standard operating procedures are supposed to be the organization&apos;s memory.
            The definitive record of how things get done. The document a new hire reads on
            day one and a compliance auditor reviews on day one thousand. But most SOPs share
            a hidden flaw: they were written from recollection, not observation.
          </p>

          <p>
            Someone sat in a room — or opened a document — and described how they believed
            the process worked. That description was reviewed, approved, formatted, and filed.
            And the moment it was finished, it began to drift from reality.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            The gap is larger than you think
          </h2>

          <p>
            Ask any operations manager to show you their CRM onboarding SOP. It will probably
            say something like: &ldquo;Log into Salesforce. Create a new account record. Fill in the
            required fields. Assign to the relevant team.&rdquo; Four steps. Clean. Logical.
          </p>

          <p>
            Now sit beside someone who actually does that job. You will watch them log in, hit
            a permission error, open a separate browser tab to check a shared spreadsheet for
            the correct account type, copy a reference number from a Slack message, navigate
            three nested menus to find the right record template, fill in seventeen fields
            (six of which have undocumented conventions), tag a colleague for approval via
            direct message, and then — finally — save the record.
          </p>

          <p className="text-[var(--content-primary)] font-medium">
            The documented process says 4 steps. The real process is 17, including 3
            workarounds, 2 undocumented approval gates, and a spreadsheet nobody officially
            knows about.
          </p>

          <p>
            This is not an edge case. It is the norm. Research on knowledge work consistently
            shows that the gap between documented and actual processes widens within weeks of
            a document being written — and that most organizations cannot accurately describe
            how their own core workflows operate.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            Why interviews and workshops don&apos;t solve this
          </h2>

          <p>
            The conventional response is to gather stakeholders, run a process mapping
            workshop, and update the documentation. It is well-intentioned and often
            expensive. It is also structurally flawed.
          </p>

          <p>
            People are poor witnesses to their own behavior. When asked to describe a
            process, they describe the ideal version — the way it should work, the way it
            worked the first time, the way they wish it worked. Workarounds are omitted
            because they feel like admissions of failure. Informal approvals are skipped
            because they&apos;re not &ldquo;official.&rdquo; Edge cases are forgotten because they
            don&apos;t come to mind in a conference room.
          </p>

          <p>
            Workshops are also slow, expensive, and immediately outdated. A two-day process
            mapping exercise produces a document that reflects how the process worked last
            month. By the time it is reviewed and published, the process has already
            changed again.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            The alternative: observation-based documentation
          </h2>

          <p>
            The reliable way to document a process is to observe it — not to ask someone
            to describe it. Observation captures what actually happens: the real steps, the
            real sequence, the real workarounds, the real timing. It removes the subjective
            filter of human recollection.
          </p>

          <p>
            This has historically been expensive. Time-and-motion studies, process mining
            tools that require months of IT integration, consultants with clipboards. For
            most teams, the cost of observation exceeded the cost of just living with
            inaccurate documentation.
          </p>

          <p>
            That tradeoff has changed.
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            How Ledgerium approaches this
          </h2>

          <p>
            Ledgerium captures browser-based workflows directly — not as screenshots or
            screen recordings, but as structured interaction data. Every click, navigation,
            form interaction, and system transition is recorded as a structured event with
            timing, context, and sequence information.
          </p>

          <p>
            That structured data is then processed deterministically: the same recording
            always produces the same output. There is no AI rewriting your steps or inferring
            intent. There is no creative interpretation. The generated SOP reflects what was
            actually observed, and every step traces back to a source event.
          </p>

          <p>
            The result is documentation that starts accurate — because it comes from
            observation, not memory — and can be updated by recording again rather than
            by convening another workshop.
          </p>

          <p>
            You can learn more about how the capture and processing pipeline works on the{' '}
            <Link href="/product" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">
              product page
            </Link>
            .
          </p>

          <h2 className="text-xl font-bold text-[var(--content-primary)] pt-4">
            The core principle
          </h2>

          <p>
            The reason most SOPs are outdated is simple: they were created by asking people
            what they do, not by watching what they actually do. The fix is equally simple
            in principle, even if it has historically been difficult in practice: stop asking,
            start observing.
          </p>

          <p className="text-[var(--content-primary)] font-medium">
            You cannot improve what you cannot see. You cannot automate what you do not
            understand. And you cannot trust a process that has never been measured against
            reality.
          </p>

          <p>
            The organizations that will successfully deploy AI and automation into their
            workflows are not the ones with the most sophisticated tools — they are the ones
            that first took the time to understand what their workflows actually look like.
            That starts with observation.
          </p>

        </div>
      </article>

      {/* Post footer CTA */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Ready to see what your real workflows look like?
          </h2>
          <p className="mt-3 text-[#e2e8f0]">
            Record your first workflow. See the structured output in under 5 minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2 shadow-sm shadow-brand-600/20">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/product" className="btn-secondary">
              See the product
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
