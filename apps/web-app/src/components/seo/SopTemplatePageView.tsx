import Link from 'next/link';
import { ArrowRight, BarChart3 } from 'lucide-react';
import type { SopTemplatePage, WorkflowStep } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  DataPointCallout,
  SeoHero,
  ProseSection,
  MidCta,
  BulletList,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
  KeyTakeaways,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

/** Token-consistent ordinal-badge palette cycled across steps (execution-SOP style). */
const STEP_BADGE = [
  'bg-brand-900/25 border-brand-700/40 text-brand-400',
  'bg-emerald-900/25 border-emerald-700/40 text-emerald-400',
  'bg-violet-900/25 border-violet-700/40 text-violet-400',
  'bg-amber-900/25 border-amber-700/40 text-amber-400',
] as const;

/** The Analysis-view report sections this product produces (honest anatomy, no numbers). */
const REPORT_SECTIONS = [
  'Verdict', 'Health score', 'Timestudy', 'Distribution',
  'Bottlenecks', 'Automation', 'ROI', 'Variants', 'Drift',
] as const;

/** Illustrative scorecard — labels + what fills them, never invented numbers. */
const SCORECARD = [
  { label: 'Cycle time', fill: 'from your runs' },
  { label: 'Consistency', fill: 'measured' },
  { label: 'Variant count', fill: 'paths observed' },
  { label: 'Top bottleneck', fill: 'your slowest step' },
  { label: 'Automation score', fill: 'scored 0–100' },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-widest mb-2">{children}</p>
  );
}

function ExecutionStep({ step, index }: { step: WorkflowStep; index: number }) {
  return (
    <li className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-5 flex gap-4">
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-lg border text-[12px] font-bold flex items-center justify-center ${STEP_BADGE[index % STEP_BADGE.length]}`}
      >
        {index + 1}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--content-primary)]">{step.title}</p>
          {step.system && (
            <span className="text-[9px] font-medium text-[var(--content-secondary)] bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded px-1.5 py-0.5">
              {step.system}
            </span>
          )}
        </div>
        <p className="text-sm text-[#e2e8f0] leading-relaxed mt-1">{step.detail}</p>
      </div>
    </li>
  );
}

/** Honest preview of the Analysis report's anatomy — anchored to the page's one real data point. */
function SopReportPreview({ originalDataPoint, sectionCount }: { originalDataPoint: string; sectionCount: number }) {
  return (
    <section className="py-14 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Eyebrow>Process analysis</Eyebrow>
        <h2 className="text-xl font-bold text-[var(--content-primary)] mb-2 inline-flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-500" />
          The analysis that comes with it
        </h2>
        <p className="text-sm text-[var(--content-secondary)] leading-relaxed mb-6 max-w-2xl">
          Every recording also produces a process analysis — health score, cycle time, where the process
          stalls, and which steps are candidates for automation. Based on what the recording observed, not estimated.
        </p>

        {/* Faux product chrome */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)]">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-green-400/80" />
            <span className="ml-auto text-[11px] font-medium text-amber-400 rounded-full border border-amber-500/25 bg-amber-500/15 px-2.5 py-0.5">
              Sample output — generated from a recording
            </span>
          </div>

          <div className="p-5 space-y-5">
            {/* Report section index */}
            <div className="flex flex-wrap gap-1.5" aria-label="Report sections">
              {REPORT_SECTIONS.map((s) => (
                <span key={s} className="text-[10px] font-medium text-[var(--content-secondary)] bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-full px-2.5 py-1">
                  {s}
                </span>
              ))}
            </div>

            {/* The page's one real, sourced fact */}
            <div className="seo-datapoint rounded-lg border-l-4 border-brand-600 bg-brand-900/10 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-1">From Ledgerium recordings</p>
              <p className="text-sm text-[var(--content-primary)] leading-relaxed">{originalDataPoint}</p>
            </div>

            {/* Illustrative scorecard — labels, not invented numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SCORECARD.map((m) => (
                <div key={m.label} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wide">{m.label}</p>
                  <p className="text-[12px] text-[var(--content-secondary)] mt-0.5">{m.fill}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--content-tertiary)] italic">
              Your recording fills these in with the actual numbers from your runs across {sectionCount} SOP sections.
            </p>
          </div>
        </div>

        {/* Honest framing band */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-[13px] text-[var(--content-secondary)] flex-1">
            Illustrative structure — record this process once and Ledgerium produces your real report.
          </p>
          <Link href="/product" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-400 hover:text-brand-300 whitespace-nowrap">
            See a live example
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Sequenced cross-sell: report → automation intent */}
        <Link href="/ai-opportunities" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-400">
          See where AI can automate steps like these
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export function SopTemplatePageView({ page }: { page: SopTemplatePage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Generate the SOP from real work" location="sop_hero" author={page.author} updatedAt={page.updatedAt} />
      <DataPointCallout text={page.originalDataPoint} />
      <KeyTakeaways items={page.keyTakeaways} />

      <ProseSection title="Who uses this SOP and when">
        <p>{page.whoUsesIt}</p>
        <p>{page.whenToUseIt}</p>
      </ProseSection>

      {/* SOP anatomy — 2-column structure grid */}
      <section className="py-12 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Eyebrow>SOP template structure</Eyebrow>
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-6">What this SOP covers</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {page.sopSections.map((s) => (
              <div key={s.heading} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-5">
                <dt className="text-sm font-semibold text-[var(--content-primary)] mb-1.5">{s.heading}</dt>
                <dd className="text-sm text-[#e2e8f0] leading-relaxed">{s.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Example procedure — execution-SOP visual style */}
      <section className="py-14 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Eyebrow>Example walkthrough</Eyebrow>
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-2">The SOP Ledgerium generates from a real recording</h2>
          <p className="text-sm text-[var(--content-secondary)] leading-relaxed mb-6 max-w-2xl">
            That is the structure. This is what goes inside it when the process is recorded — step cards with the
            systems used at each point and the exception paths, captured from the actual work.
          </p>
          <ol className="space-y-3">
            {page.exampleProcedure.map((s, i) => (
              <ExecutionStep key={s.title} step={s} index={i} />
            ))}
          </ol>

          {page.relatedWorkflowSlug && (
            <Link
              href={`/workflow-library/${page.relatedWorkflowSlug}`}
              className="mt-6 flex items-center gap-3 rounded-xl border-l-4 border-brand-600 bg-brand-900/10 px-5 py-4 hover:bg-brand-900/20 transition-colors group"
            >
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-wider">Paired workflow</p>
                <p className="text-sm font-semibold text-[var(--content-primary)] group-hover:text-brand-400 transition-colors">
                  See the full workflow this SOP documents
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-brand-500 flex-shrink-0" />
            </Link>
          )}
        </div>
      </section>

      <MidCta location="sop_mid" />

      <SopReportPreview originalDataPoint={page.originalDataPoint} sectionCount={page.sopSections.length} />

      <BulletList title="What a generic template misses" items={page.commonMistakes} />

      <ProseSection title="How one recording produces this SOP">
        <p>{page.howLedgeriumGenerates}</p>
      </ProseSection>

      <HowLedgeriumCaptures introSentence={page.mechanismIntro} />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Generate this SOP from real work"
        body="Record the process once and Ledgerium writes the SOP from the actual steps, so it matches how your team really works."
        ctaLabel="Start free"
        location="sop_footer"
      />
    </>
  );
}
