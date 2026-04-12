import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Play,
  MousePointer2,
  Layers,
  FileText,
  Library,
  ArrowRight,
  CheckCircle,
  Map,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works — Ledgerium AI',
  description:
    'Record a real browser workflow, get a structured SOP and process map in under 5 minutes. See how ops teams use Ledgerium to document internal tool workflows.',
};

const STEPS = [
  {
    step: 1,
    icon: Play,
    title: 'Start recording',
    what: 'Open the Ledgerium sidebar in Chrome. Name the workflow — "Create purchase order," "Process expense report," "Onboard new vendor." Click Record.',
    result: 'The extension starts capturing silently. A live step feed shows your progress as you work.',
  },
  {
    step: 2,
    icon: MousePointer2,
    title: 'Do the workflow normally',
    what: 'Navigate your ERP, CRM, or internal tools. Fill forms, click buttons, switch between systems. Work exactly as you normally would.',
    result: 'Every click, form entry, and navigation is captured as structured data. Multi-system, multi-tab workflows are fully supported.',
  },
  {
    step: 3,
    icon: Layers,
    title: 'Stop and review',
    what: 'Click Stop. The engine segments your session into logical workflow steps with timing, system context, and confidence scores.',
    result: 'You see your workflow as structured steps — not a video to watch. Each step traces to specific observed actions.',
  },
  {
    step: 4,
    icon: FileText,
    title: 'Get your SOP instantly',
    what: 'Ledgerium generates a complete SOP with step-by-step instructions, system context, expected outcomes, and a visual process map showing phases and transitions.',
    result: 'A ready-to-share SOP with prerequisites, warnings, and completion criteria — generated from evidence, not memory.',
  },
  {
    step: 5,
    icon: Library,
    title: 'Build your workflow library',
    what: 'Every recording syncs to your searchable library. Find any workflow by title, system, or date. Keep your team\'s process documentation always up to date.',
    result: 'When the process changes, record it again. The new SOP replaces the old one. Documentation stays current automatically.',
  },
];

export default function DemoPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Record a workflow. Get an SOP instantly.
          </h1>
          <p className="mt-4 text-lg text-gray-500 leading-relaxed">
            See how ops teams use Ledgerium to turn real browser workflows
            into structured SOPs and process maps — in under 5 minutes.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="space-y-20">
            {STEPS.map(({ step, icon: Icon, title, what, result }) => (
              <div key={step} className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                {/* Text — 3 cols */}
                <div className={`md:col-span-3 ${step % 2 === 0 ? 'md:order-2' : ''}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white text-sm font-bold shadow-sm shadow-brand-600/20">
                      {step}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    {what}
                  </p>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-brand-700 leading-relaxed">
                      {result}
                    </p>
                  </div>
                </div>

                {/* Visual — 2 cols */}
                <div className={`md:col-span-2 ${step % 2 === 0 ? 'md:order-1' : ''}`}>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 aspect-[4/3] flex flex-col items-center justify-center p-6">
                    <Icon className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-[11px] text-gray-400 text-center font-medium">
                      Step {step}: {title}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Output summary */}
      <section className="py-16 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-10">
            Every recording produces
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Layers, label: 'Workflow Steps', sub: 'With timing and evidence' },
              { icon: FileText, label: 'SOP Document', sub: 'Event-level instructions' },
              { icon: Map, label: 'Process Map', sub: 'Phases and transitions' },
              { icon: CheckCircle, label: 'Workflow Report', sub: 'Ready to export' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="card p-5 text-center">
                <Icon className="h-5 w-5 text-brand-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Get your first SOP in 60 seconds
          </h2>
          <p className="mt-3 text-gray-500">
            Sign up free, and explore a sample workflow SOP immediately —
            no extension install required. When you&apos;re ready, record your own.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2 text-base px-7 py-3.5 shadow-sm shadow-brand-600/20">
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
