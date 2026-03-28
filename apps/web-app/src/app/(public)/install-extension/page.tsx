import type { Metadata } from 'next';
import Link from 'next/link';
import { EXTENSION_CONFIG } from '@/lib/config';
import {
  Download,
  Chrome,
  UserPlus,
  Play,
  LayoutDashboard,
  Shield,
  Eye,
  EyeOff,
  HelpCircle,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Install Extension — Ledgerium AI',
  description:
    'Add the Ledgerium AI browser extension to Chrome. Record workflows, generate SOPs and process maps automatically.',
};

export default function InstallExtensionPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-6">
            <Chrome className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Add Ledgerium to Chrome
          </h1>
          <p className="mt-4 text-lg text-gray-500 leading-relaxed max-w-xl mx-auto">
            The browser extension captures your workflow. The web app turns it into
            SOPs, process maps, and a searchable library.
          </p>
          <div className="mt-8">
            <a
              href={EXTENSION_CONFIG.chromeStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-base px-8 py-3.5 gap-2.5 inline-flex shadow-sm shadow-brand-600/20"
            >
              <Download className="h-5 w-5" />
              Install Chrome Extension
            </a>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Also works with Edge, Brave, and other Chromium-based browsers
          </p>
        </div>
      </section>

      {/* Setup steps */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-12">
            Up and running in under 2 minutes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: 1,
                icon: UserPlus,
                title: 'Create an account',
                desc: 'Free signup — this is where your workflows live.',
              },
              {
                step: 2,
                icon: Download,
                title: 'Install the extension',
                desc: 'One click from the Chrome Web Store. Opens as a sidebar panel.',
              },
              {
                step: 3,
                icon: Play,
                title: 'Record a workflow',
                desc: 'Name your activity, click Record, do your work. Click Stop when finished.',
              },
              {
                step: 4,
                icon: LayoutDashboard,
                title: 'Review your output',
                desc: 'Workflow steps, SOP, process map, and report — ready immediately.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold mb-4">
                  {step}
                </div>
                <Icon className="h-5 w-5 text-brand-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What it captures / what it doesn't */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-12">
            What the extension records — and what it doesn&apos;t
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What it captures */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-brand-600" />
                <h3 className="text-sm font-bold text-gray-900">Captured</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Clicks, navigation, and form entries — the structure of your workflow',
                  'Page titles and application context — which tools you used',
                  'Timing between actions — how long each step takes',
                  'System feedback — toasts, modals, errors, status changes',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What it does NOT capture */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <EyeOff className="h-5 w-5 text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900">Not captured</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'No screenshots or screen recording',
                  'No video or audio',
                  'No keystrokes or typed content (only field names)',
                  'No background activity — recording only when you choose',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Shield className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Sensitive field values (passwords, financial data) are automatically
            redacted. You can review everything captured before exporting.
          </p>
        </div>
      </section>

      {/* Browser support */}
      <section className="py-14 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
            Browser compatibility
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="card p-4">
              <Chrome className="h-6 w-6 text-brand-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Chrome</p>
              <p className="text-[11px] text-green-600 font-medium">Fully supported</p>
            </div>
            <div className="card p-4">
              <Chrome className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Edge / Brave</p>
              <p className="text-[11px] text-gray-500">Compatible</p>
            </div>
            <div className="card p-4">
              <Chrome className="h-6 w-6 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-400">Firefox / Safari</p>
              <p className="text-[11px] text-gray-400">Planned</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-10">
            <HelpCircle className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">Troubleshooting</h2>
          </div>
          <div className="space-y-8">
            {[
              {
                q: 'I installed the extension but can\'t find it',
                a: 'Click the puzzle piece icon (Extensions) in your Chrome toolbar. Pin Ledgerium AI so it stays visible. Click the icon to open the sidebar panel.',
              },
              {
                q: 'Do I need a Ledgerium account to record?',
                a: 'No. The extension records and exports standalone. To sync recordings to the web app (persistent library, search, reports), create a free account and configure Sync Settings.',
              },
              {
                q: 'Can I record on internal company tools?',
                a: 'Yes. The extension captures interaction events on any web page. Only Chrome system pages (chrome://, about:) are restricted by the browser itself.',
              },
              {
                q: 'How do I sync recordings to the web app?',
                a: 'Go to Account → Extension Sync in the web app. Create an API key, then paste the Sync URL and key into the extension\'s Sync Settings. Recordings sync automatically after that.',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Ready to see your real workflows?
          </h2>
          <p className="mt-3 text-gray-500">
            Install the extension and record your first workflow in under 2 minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={EXTENSION_CONFIG.chromeStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary gap-2 shadow-sm shadow-brand-600/20"
            >
              <Chrome className="h-4 w-4" />
              Install Extension
            </a>
            <Link href="/demo" className="btn-secondary gap-2">
              See how it works
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
