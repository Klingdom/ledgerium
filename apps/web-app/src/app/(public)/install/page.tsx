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
  FolderOpen,
  ToggleRight,
  BookOpen,
  Info,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Install — Ledgerium AI',
  description:
    'Add the Ledgerium AI browser extension to Chrome. Record workflows, generate SOPs and process maps automatically.',
};

export default function InstallPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-6">
            <Chrome className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)]">
            Add Ledgerium to Chrome
          </h1>
          <p className="mt-4 text-lg text-[#e2e8f0] leading-relaxed max-w-xl mx-auto">
            The browser extension captures your workflow. The web app turns it into
            SOPs, process maps, and a searchable library.
          </p>
          <p className="mt-5 text-sm text-[var(--content-tertiary)]">
            Already installed?{' '}
            <Link
              href="/login"
              className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
            >
              Sign in to your account &rarr;
            </Link>
          </p>
          <div className="mt-6">
            <a
              href={EXTENSION_CONFIG.directDownloadUrl}
              download="ledgerium-recorder-chrome-extension.zip"
              className="btn-primary text-base px-8 py-3.5 gap-2.5 inline-flex shadow-sm shadow-brand-600/20"
            >
              <Download className="h-5 w-5" />
              Download Chrome Extension
            </a>
          </div>
          <p className="mt-3 text-xs text-[var(--content-tertiary)]">
            Also works with Edge, Brave, and other Chromium-based browsers
          </p>
        </div>
      </section>

      {/* Sideload installation steps — prominent */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold text-[var(--content-primary)]">
              Installation — 4 steps, under 2 minutes
            </h2>
            <p className="mt-3 text-[#e2e8f0] text-sm max-w-xl mx-auto">
              Ledgerium AI is installed as a developer extension (sideload). This is a standard Chrome
              feature — all steps happen inside the browser you already have.
            </p>
          </div>

          <ol className="space-y-0">
            {/* Step 1 */}
            <li className="flex gap-6">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-base font-bold z-10">
                  1
                </div>
                <div className="w-0.5 flex-1 bg-brand-600/30 mt-2 mb-2" />
              </div>
              <div className="flex-1 pb-8">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Download className="h-5 w-5 text-brand-500 flex-shrink-0" />
                    <h3 className="text-base font-semibold text-[var(--content-primary)]">
                      Download the extension
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-[#e2e8f0] leading-relaxed list-none">
                    <li>Click the download button above (or use the button at the bottom of this page).</li>
                    <li>
                      A file named{' '}
                      <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">
                        ledgerium-recorder-chrome-extension.zip
                      </code>{' '}
                      will appear in your Downloads folder.
                    </li>
                    <li>Wait for the download to finish before continuing.</li>
                  </ul>
                  <div className="mt-4 flex gap-3 rounded-lg border-l-4 border-brand-500 bg-brand-900/20 px-4 py-3">
                    <Info className="h-4 w-4 text-brand-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#e2e8f0] leading-relaxed">
                      Keep the downloaded file — you may need it again if you switch computers or
                      reinstall Chrome.
                    </p>
                  </div>
                </div>
              </div>
            </li>

            {/* Step 2 */}
            <li className="flex gap-6">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-base font-bold z-10">
                  2
                </div>
                <div className="w-0.5 flex-1 bg-brand-600/30 mt-2 mb-2" />
              </div>
              <div className="flex-1 pb-8">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FolderOpen className="h-5 w-5 text-brand-500 flex-shrink-0" />
                    <h3 className="text-base font-semibold text-[var(--content-primary)]">
                      Unzip the file and open Chrome Extensions
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-[#e2e8f0] leading-relaxed list-none">
                    <li>
                      Right-click the{' '}
                      <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">
                        .zip
                      </code>{' '}
                      file and choose <strong className="text-[var(--content-primary)]">Extract All</strong>{' '}
                      (Windows) or double-click it (Mac). Pick a permanent folder — moving it later will
                      break the extension.
                    </li>
                    <li>
                      In Chrome, type{' '}
                      <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">
                        chrome://extensions
                      </code>{' '}
                      in the address bar and press Enter.
                    </li>
                  </ul>
                  <div className="mt-4 flex gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-900/20 px-4 py-3">
                    <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#e2e8f0] leading-relaxed">
                      <strong className="text-amber-300">Important:</strong> Extract to a permanent location
                      such as{' '}
                      <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded font-mono text-cyan-300">
                        Documents/Ledgerium
                      </code>
                      . If you delete or move the folder, Chrome will disable the extension and you will need
                      to load it again.
                    </p>
                  </div>
                </div>
              </div>
            </li>

            {/* Step 3 */}
            <li className="flex gap-6">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-base font-bold z-10">
                  3
                </div>
                <div className="w-0.5 flex-1 bg-brand-600/30 mt-2 mb-2" />
              </div>
              <div className="flex-1 pb-8">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <ToggleRight className="h-5 w-5 text-brand-500 flex-shrink-0" />
                    <h3 className="text-base font-semibold text-[var(--content-primary)]">
                      Enable Developer Mode
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-[#e2e8f0] leading-relaxed list-none">
                    <li>
                      On the{' '}
                      <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">
                        chrome://extensions
                      </code>{' '}
                      page, find the <strong className="text-[var(--content-primary)]">Developer mode</strong>{' '}
                      toggle in the top-right corner.
                    </li>
                    <li>
                      Click it to turn it <strong className="text-[var(--content-primary)]">ON</strong>. Three
                      new buttons appear: &ldquo;Load unpacked&rdquo;, &ldquo;Pack extension&rdquo;, and
                      &ldquo;Update&rdquo;.
                    </li>
                    <li>
                      Leave this toggle on — the extension will stop working if you turn it off.
                    </li>
                  </ul>
                  <div className="mt-4 flex gap-3 rounded-lg border-l-4 border-emerald-500 bg-emerald-900/20 px-4 py-3">
                    <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#e2e8f0] leading-relaxed">
                      <strong className="text-emerald-300">This is safe.</strong> Developer mode is a standard
                      Chrome setting used by developers and IT teams everywhere. It does not reduce your
                      browser&apos;s security — it simply allows loading extensions from your local computer
                      rather than the Chrome Web Store.
                    </p>
                  </div>
                </div>
              </div>
            </li>

            {/* Step 4 — no connector after last item */}
            <li className="flex gap-6">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-base font-bold z-10">
                  4
                </div>
              </div>
              <div className="flex-1">
                <div className="rounded-xl border border-brand-600/40 bg-[var(--surface-secondary)] p-6 ring-1 ring-brand-600/20">
                  <div className="flex items-center gap-3 mb-3">
                    <Chrome className="h-5 w-5 text-brand-500 flex-shrink-0" />
                    <h3 className="text-base font-semibold text-[var(--content-primary)]">
                      Load the extension and pin it
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-[#e2e8f0] leading-relaxed list-none">
                    <li>
                      Click <strong className="text-[var(--content-primary)]">Load unpacked</strong> (the button
                      that appeared in Step 3).
                    </li>
                    <li>
                      A file picker opens. Navigate to and select the folder you extracted in Step 2 — the
                      folder that contains a{' '}
                      <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">
                        manifest.json
                      </code>{' '}
                      file inside it.
                    </li>
                    <li>
                      The <strong className="text-[var(--content-primary)]">Ledgerium AI</strong> card appears
                      in your extensions list.
                    </li>
                    <li>
                      Click the <strong className="text-[var(--content-primary)]">puzzle icon</strong> in the
                      Chrome toolbar, find Ledgerium AI, and click the{' '}
                      <strong className="text-[var(--content-primary)]">pin icon</strong> to keep it visible.
                    </li>
                  </ul>
                  <div className="mt-4 flex gap-3 rounded-lg border-l-4 border-brand-500 bg-brand-900/20 px-4 py-3">
                    <CheckCircle className="h-4 w-4 text-brand-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#e2e8f0] leading-relaxed">
                      <strong className="text-brand-300">Done.</strong> Click the Ledgerium AI icon in your
                      toolbar to open the sidebar. Sign in or create a free account to start recording.
                    </p>
                  </div>
                </div>
              </div>
            </li>
          </ol>

          {/* User Guide link */}
          <div className="mt-10 flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-5 py-4">
            <BookOpen className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#e2e8f0] leading-relaxed">
              For a complete walkthrough with screenshots, see the Extension section in our{' '}
              <Link
                href="/docs#getting-started"
                className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
              >
                User Guide
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Overview steps — after install */}
      <section className="py-20 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-[var(--content-primary)] mb-12">
            Once installed — your first recording
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: 'A',
                icon: UserPlus,
                title: 'Create an account',
                desc: 'Free signup — this is where your workflows live and sync.',
              },
              {
                step: 'B',
                icon: Play,
                title: 'Record a workflow',
                desc: 'Name your activity, click Record, do your work. Click Stop when finished.',
              },
              {
                step: 'C',
                icon: LayoutDashboard,
                title: 'Review your output',
                desc: 'Workflow steps, SOP, process map, and report — ready immediately.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-brand-600/20 border border-brand-600/40 text-brand-400 flex items-center justify-center text-sm font-bold mb-4">
                  {step}
                </div>
                <Icon className="h-5 w-5 text-brand-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-1.5">{title}</h3>
                <p className="text-xs text-[#e2e8f0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What it captures / what it doesn't */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-[var(--content-primary)] mb-12">
            What the extension records — and what it doesn&apos;t
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What it captures */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-brand-600" />
                <h3 className="text-sm font-bold text-[var(--content-primary)]">Captured</h3>
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
                    <span className="text-sm text-[#e2e8f0] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What it does NOT capture */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <EyeOff className="h-5 w-5 text-[var(--content-tertiary)]" />
                <h3 className="text-sm font-bold text-[var(--content-primary)]">Not captured</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'No screenshots or screen recording',
                  'No video or audio',
                  'No keystrokes or typed content (only field names)',
                  'No background activity — recording only when you choose',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Shield className="h-4 w-4 text-[var(--content-tertiary)] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#e2e8f0] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-center text-xs text-[var(--content-tertiary)] mt-6">
            Sensitive field values (passwords, financial data) are automatically
            redacted. You can review everything captured before exporting.
          </p>
        </div>
      </section>

      {/* Browser support */}
      <section className="py-14 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-sm font-semibold text-[var(--content-tertiary)] uppercase tracking-wider mb-6">
            Browser compatibility
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="card p-4">
              <Chrome className="h-6 w-6 text-brand-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--content-primary)]">Chrome</p>
              <p className="text-[11px] text-green-600 font-medium">Fully supported</p>
            </div>
            <div className="card p-4">
              <Chrome className="h-6 w-6 text-[var(--content-tertiary)] mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--content-primary)]">Edge / Brave</p>
              <p className="text-[11px] text-[#e2e8f0]">Compatible</p>
            </div>
            <div className="card p-4">
              <Chrome className="h-6 w-6 text-[var(--content-tertiary)] mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--content-tertiary)]">Firefox / Safari</p>
              <p className="text-[11px] text-[var(--content-tertiary)]">Planned</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-10">
            <HelpCircle className="h-5 w-5 text-[var(--content-tertiary)]" />
            <h2 className="text-lg font-bold text-[var(--content-primary)]">Troubleshooting</h2>
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
                a: "Go to Account → Extension Sync in the web app. Create an API key, then paste the Sync URL and key into the extension's Sync Settings. Recordings sync automatically after that.",
              },
              {
                q: 'Chrome is showing a warning about Developer mode extensions',
                a: "This is a standard Chrome notification that appears when extensions are loaded outside the Web Store. It is expected behavior. Click 'Dismiss' or 'Keep' — the extension is safe to use.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-1.5">{q}</h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Ready to see your real workflows?
          </h2>
          <p className="mt-3 text-[#e2e8f0]">
            Download the extension and follow the 4 steps above — up and running in under 2 minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={EXTENSION_CONFIG.directDownloadUrl}
              download="ledgerium-recorder-chrome-extension.zip"
              className="btn-primary gap-2 shadow-sm shadow-brand-600/20"
            >
              <Download className="h-4 w-4" />
              Download Extension
            </a>
            <Link href="/product" className="btn-secondary gap-2">
              See the product
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-5 text-xs text-[var(--content-tertiary)]">
            Already installed?{' '}
            <Link
              href="/login"
              className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
            >
              Sign in to your account &rarr;
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
