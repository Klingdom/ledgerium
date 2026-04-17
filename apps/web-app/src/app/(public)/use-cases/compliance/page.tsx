import type { Metadata } from 'next';
import Link from 'next/link';
import { TrackedLink } from '@/components/TrackedLink';
import {
  ArrowRight,
  Shield,
  CheckCircle,
  Eye,
  FileText,
  Lock,
  GitCompare,
  Download,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Compliance Process Documentation — SOC 2 & ISO 27001 Evidence | Ledgerium',
  description:
    'Compliance process documentation with traceable evidence. Generate SOC 2 audit evidence and ISO 27001 documentation automatically from real browser workflow recordings.',
  openGraph: {
    title: 'Compliance Process Documentation — SOC 2 & ISO 27001 Evidence | Ledgerium',
    description:
      'Deterministic, evidence-linked compliance process documentation. Every step traceable to source browser events — built for audit, risk, and compliance teams.',
  },
};

/* ── Problem cards ─────────────────────────────────────────────────────────── */

const PROBLEMS = [
  {
    title: 'Documentation vs. reality',
    desc: 'Audit-ready SOPs describe what should happen. Nobody has verified that\u2019s what actually happens.',
  },
  {
    title: 'Manual evidence collection',
    desc: 'Collecting process evidence means interviews, screenshots, and months of observation. It\u2019s expensive and subjective.',
  },
  {
    title: 'Stale compliance artifacts',
    desc: 'Controls documented during the last audit are already outdated. Processes drift between audit cycles.',
  },
];

/* ── Feature blocks ────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Eye,
    title: 'Observe, don\u2019t interview',
    desc: 'Record real process execution in the browser. Every step is captured with timing, system context, and confidence scores \u2014 no relying on what people say they do.',
  },
  {
    icon: CheckCircle,
    title: 'Deterministic outputs',
    desc: 'The same recording always produces the same SOP, process map, and report. No AI interpretation, no hallucination, no creative rewriting. Outputs are reproducible and audit-safe.',
  },
  {
    icon: FileText,
    title: 'Full evidence trail',
    desc: 'Every instruction in the generated SOP traces back to a specific observed browser event. Auditors can verify each step against source evidence.',
  },
];

/* ── Compliance features grid ──────────────────────────────────────────────── */

const COMPLIANCE_FEATURES = [
  {
    icon: CheckCircle,
    title: 'Deterministic Processing',
    desc: 'Same input, same output \u2014 always',
  },
  {
    icon: FileText,
    title: 'Evidence Linking',
    desc: 'Every step traces to source events',
  },
  {
    icon: Lock,
    title: 'Data Minimization',
    desc: 'No screenshots, no keystrokes, no screen recording',
  },
  {
    icon: GitCompare,
    title: 'Reproducible Audits',
    desc: 'Re-record and compare \u2014 detect process drift',
  },
  {
    icon: Download,
    title: 'Export & Archive',
    desc: 'Download complete evidence bundles as JSON',
  },
  {
    icon: Users,
    title: 'Access Controls',
    desc: 'Role-based team permissions (Team plan+)',
  },
];

export default function CompliancePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-700/40 bg-brand-900/20 px-3 py-1 text-xs font-semibold text-brand-400 mb-6">
              <Shield className="h-3.5 w-3.5" />
              For Compliance &amp; Audit Teams
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[var(--content-primary)] leading-[1.1] tracking-tight">
              Your audit documentation says{' '}
              <br className="hidden sm:block" />
              <span className="text-brand-600">the process works.</span>
              <br className="hidden sm:block" />
              But has anyone actually verified it?
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-[#e2e8f0] leading-relaxed max-w-2xl mx-auto">
              Ledgerium captures real process execution and generates
              evidence-linked documentation &mdash; every step traceable to
              source events. Built for SOC 2, ISO 27001, and audit-driven compliance programs.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <TrackedLink
                href="/signup"
                event="cta_clicked"
                properties={{ location: 'use_case_compliance_hero', destination: '/signup' }}
                className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </TrackedLink>
              <Link href="/product" className="btn-secondary text-base px-7 py-3.5">
                See how it works
              </Link>
            </div>
          </div>
        </div>
        {/* Gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-900/20 via-transparent to-[var(--surface-secondary)]" />
      </section>

      {/* ── The Problem ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              The problem
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              The compliance documentation gap
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PROBLEMS.map(({ title, desc }) => (
              <div
                key={title}
                className="card p-7 flex flex-col gap-3"
              >
                <h3 className="text-base font-semibold text-[var(--content-primary)]">
                  {title}
                </h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Ledgerium Helps ───────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              Evidence-based process documentation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-900/15 border border-brand-700/30 flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--content-primary)] mb-3">
                  {title}
                </h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance Features Grid ──────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              Compliance-ready
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
              Built for regulated environments
            </h2>
            <p className="mt-4 text-[#e2e8f0] leading-relaxed">
              Designed to support SOC 2 control evidence, ISO 27001 process documentation,
              and FDA 21 CFR Part 11 traceability requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMPLIANCE_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 p-5 rounded-xl border border-transparent hover:border-[var(--border-default)] hover:bg-[var(--surface-secondary)] transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-900/15 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-1">
                    {title}
                  </h3>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
            Start building evidence-based
            <br />
            process documentation
          </h2>
          <p className="mt-5 text-[#e2e8f0] leading-relaxed">
            Record real workflow execution. Get audit-ready SOPs with full
            evidence traceability &mdash; in minutes, not months. Free to start.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <TrackedLink
              href="/signup"
              event="cta_clicked"
              properties={{ location: 'use_case_compliance_bottom_cta', destination: '/signup' }}
              className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
            <Link href="/security" className="btn-secondary text-base px-7 py-3.5">
              See our security practices
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
