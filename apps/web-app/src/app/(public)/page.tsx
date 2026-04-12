import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  PlayCircle,
  Eye,
  FileText,
  Map,
  Library,
  Clock,
  Users,
  TrendingUp,
  BookOpen,
  Shield,
  Zap,
  CheckCircle,
  MousePointer2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ledgerium AI — Record Real Workflows. Get SOPs Instantly.',
  description:
    'Record how work actually happens in the browser. Generate SOPs, process maps, and workflow documentation in minutes — not weeks. Built for ops teams who maintain SOPs for internal tools.',
  openGraph: {
    title: 'Ledgerium AI — Record Real Workflows. Get SOPs Instantly.',
    description: 'Your SOP says 5 steps. Your team takes 17. Record what actually happens and get documentation automatically.',
  },
};

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-gray-900 leading-[1.1] tracking-tight">
              Your SOP says 5 steps.{' '}
              <br className="hidden sm:block" />
              <span className="text-brand-600">Your team takes 17.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
              Record real workflows in the browser. Get structured SOPs,
              process maps, and documentation — instantly. No interviews.
              No workshops. No guessing.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20">
                Record your first workflow
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/demo" className="btn-secondary text-base px-7 py-3.5 gap-2">
                <PlayCircle className="h-4 w-4" />
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Free to start. No credit card required.
            </p>
          </div>
        </div>
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/40 via-white to-gray-50" />
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="border-y border-gray-200 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900 mb-14">
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
                desc: 'Get a structured SOP, visual process map, and exportable workflow report. Save it to your library, search it later, share it with your team.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-brand-600" />
                </div>
                <p className="text-[11px] font-bold text-brand-600 uppercase tracking-widest mb-2">
                  Step {step}
                </p>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it matters ────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Your SOPs are already out of date
            </h2>
            <p className="mt-4 text-gray-500 leading-relaxed">
              Most process documentation is written from memory, not observation.
              Workarounds, extra steps, and tribal knowledge never make it into the doc.
              The gap between what&apos;s documented and what&apos;s real grows every week.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: 'Writing SOPs takes hours. They go stale in weeks.',
                desc: 'Interviews, workshops, and manual documentation are slow and expensive. By the time the SOP is published, the process has already changed.',
              },
              {
                icon: Eye,
                title: 'New hires follow the SOP and get stuck.',
                desc: 'The documented process skips steps, misses workarounds, and doesn\'t match what experts actually do. Onboarding takes longer than it should.',
              },
              {
                icon: Zap,
                title: 'Ledgerium records what actually happens.',
                desc: 'Record a real workflow in the browser. Get a structured SOP with every step, timing, and system context — automatically. No interviews. No guessing.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-7">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Every recording produces real output
            </h2>
            <p className="mt-4 text-gray-500">
              Not another video file to watch. Structured, searchable, reusable
              workflow intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Eye, title: 'Workflow Steps', desc: 'Structured steps with timing, confidence, tools, and evidence — derived from real browser activity.' },
              { icon: FileText, title: 'Standard Operating Procedures', desc: 'Step-by-step instructions with event-level detail. Prerequisites, inputs, outputs, and completion criteria included.' },
              { icon: Map, title: 'Process Maps', desc: 'Visual workflow diagrams with phases, system boundaries, and transition labels. Ready to review or export.' },
              { icon: Library, title: 'Workflow Library', desc: 'Every workflow saved to a persistent, searchable collection. Find any workflow by title, tool, or date.' },
              { icon: Clock, title: 'History & Metrics', desc: 'Duration, step count, phase count, and confidence for every recording. Track how workflows vary over time.' },
              { icon: CheckCircle, title: 'Reports & Export', desc: 'Download workflow reports, SOP documents, and raw data. Share structured output with stakeholders.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50/50 transition-all">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Built for teams that maintain SOPs
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            If your team documents workflows in browser-based tools — ERP, CRM, ticketing, HR systems — Ledgerium records what actually happens and generates the documentation for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: TrendingUp, title: 'Operations Teams', desc: 'Record your ERP, CRM, and internal tool workflows. Get SOPs that match how work actually happens — not how someone remembers it.' },
              { icon: BookOpen, title: 'Training & Onboarding', desc: 'Capture expert workflows and turn them into onboarding docs instantly. New hires follow real steps, not outdated guides.' },
              { icon: Shield, title: 'Compliance & Audit', desc: 'Every step traces to observed evidence. Generate audit-ready process documentation with full traceability.' },
              { icon: Users, title: 'Process Improvement', desc: 'See where the real process diverges from the documented one. Find the steps that take the longest and the workarounds nobody wrote down.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 hover:shadow-md transition-shadow">
                <Icon className="h-5 w-5 text-brand-600 mb-3" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: 'Deterministic', label: 'Same input, same output' },
              { value: 'Private', label: 'Your data stays yours' },
              { value: 'No AI guessing', label: 'Evidence, not interpretation' },
              { value: 'Free to start', label: 'No credit card needed' },
            ].map(({ value, label }) => (
              <div key={value}>
                <p className="text-sm font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Stop documenting from memory.
            <br />
            Start recording what actually happens.
          </h2>
          <p className="mt-5 text-gray-500 leading-relaxed">
            Install the extension, record a workflow, and get structured output
            in under 5 minutes. Free to start.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary text-base px-7 py-3.5 gap-2 shadow-sm shadow-brand-600/20">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/install-extension" className="btn-secondary text-base px-7 py-3.5">
              Install extension
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
