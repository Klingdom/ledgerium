import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Process Documentation & SOP Automation Blog — Ledgerium AI',
  description:
    'Insights on automated SOP generation, process documentation, workflow recording, and evidence-based operations from the Ledgerium AI team.',
  openGraph: {
    title: 'Process Documentation & SOP Automation Blog — Ledgerium AI',
    description:
      'Practical guides and research on process documentation, SOP automation, workflow recording, and automation readiness from the Ledgerium team.',
  },
};

const POSTS = [
  {
    slug: 'what-is-process-intelligence',
    title: 'What Is Process Intelligence? A Practical Definition',
    excerpt:
      'Process intelligence turns observed work into a measurable, improvable model. A practical definition, how it differs from documentation and process mining, and where to start.',
    date: '2026-06-28',
    category: 'Process Intelligence',
    readTime: '7 min read',
    hasPage: true,
  },
  {
    slug: 'screenshot-tools-vs-structured-capture',
    title: "Screenshot Tools vs. Structured Capture: What's the Difference?",
    excerpt:
      'Scribe and Tango give you annotated screenshots. Structured capture gives you process data you can measure, diff, and automate. Here is why that matters.',
    date: '2026-06-26',
    category: 'Competitive',
    readTime: '5 min read',
    hasPage: true,
  },
  {
    slug: 'capture-before-you-automate',
    title: 'Capture Before You Automate',
    excerpt:
      'Teams are deploying AI agents into processes they have never measured. The observation layer is the missing foundation before any automation.',
    date: '2026-06-24',
    category: 'AI & Automation',
    readTime: '6 min read',
    hasPage: true,
  },
  {
    slug: 'why-your-sops-are-already-outdated',
    title: 'Why Your SOPs Are Already Outdated',
    excerpt:
      'Most process documentation is written from memory, not observation. Here is why that matters, and what to do about it.',
    date: '2026-04-10',
    category: 'Process Intelligence',
    readTime: '5 min read',
    hasPage: true,
  },
];

const CATEGORY_STYLES: Record<string, string> = {
  'Process Intelligence': 'bg-brand-600/10 text-brand-400 border-brand-600/20',
  'Competitive':          'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'AI & Automation':      'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogIndexPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <span className="inline-block text-xs font-bold text-brand-400 uppercase tracking-widest border border-brand-600/30 rounded-full px-3 py-1 mb-5">
            Blog
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            Insights on workflow intelligence
          </h1>
          <p className="mt-4 text-lg text-[#e2e8f0] leading-relaxed">
            Process documentation, automation readiness, and evidence-based operations.
          </p>
        </div>
      </section>

      {/* Post list */}
      <section className="py-16 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="space-y-4">
            {POSTS.map((post) => {
              const categoryStyle =
                CATEGORY_STYLES[post.category] ??
                'bg-[var(--surface-elevated)] text-[var(--content-secondary)] border-[var(--border-default)]';

              const cardContent = (
                <>
                  {/* Category badge */}
                  <span
                    className={`inline-block text-[11px] font-semibold uppercase tracking-widest border rounded-full px-2.5 py-0.5 mb-3 ${categoryStyle}`}
                  >
                    {post.category}
                  </span>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-[var(--content-primary)] leading-snug mb-2 group-hover:text-brand-400 transition-colors">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-[15px] text-[var(--content-secondary)] leading-relaxed mb-4">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-[var(--content-tertiary)]">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span aria-hidden="true">&middot;</span>
                    <span>{post.readTime}</span>
                    {post.hasPage && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span className="text-brand-400 inline-flex items-center gap-1">
                          Read post
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </>
                    )}
                  </div>
                </>
              );

              return post.hasPage ? (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block card p-6 border border-[var(--border-default)] hover:border-[rgba(255,255,255,0.12)] transition-all hover:shadow-md"
                >
                  {cardContent}
                </Link>
              ) : (
                <div
                  key={post.slug}
                  className="card p-6 border border-[var(--border-default)] opacity-75"
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <p className="text-[var(--content-secondary)] text-sm uppercase tracking-widest font-semibold mb-3">
            See it for yourself
          </p>
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Want to see Ledgerium in action?
          </h2>
          <div className="mt-6">
            <Link href="/product" className="btn-primary gap-2 shadow-sm shadow-brand-600/20">
              See the product
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
