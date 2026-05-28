import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Lock, UserCheck, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Extension Privacy Policy — Ledgerium AI Recorder',
  description:
    'Privacy policy for the Ledgerium AI Recorder Chrome extension. No screenshots, no keystroke logging, no background recording. See exactly what data is collected and why.',
  openGraph: {
    title: 'Extension Privacy Policy — Ledgerium AI Recorder',
    description:
      'Trust-first privacy for the Ledgerium AI Recorder Chrome extension. Recording is always user-initiated and you control exactly what is captured.',
  },
};

export default function ExtensionPrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-brand-600" />
            <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide">
              Extension Privacy Policy
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)]">
            Ledgerium AI Recorder — Extension Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-[#e2e8f0]">
            Effective Date: May 26, 2026
          </p>
          <p className="mt-2 text-xs text-[var(--content-tertiary)]">
            This policy applies specifically to the Ledgerium AI Recorder Chrome extension.{' '}
            <Link href="/privacy" className="text-brand-600 hover:text-brand-700 underline">
              View the general Ledgerium AI Privacy Policy →
            </Link>
          </p>
        </div>
      </section>

      {/* Trust commitments */}
      <section className="border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-xl bg-brand-900/15 border border-brand-700/30 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-bold text-[var(--content-primary)]">Our Trust Commitments</h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Recording is always explicitly user-initiated',
                'No background monitoring or passive data collection',
                'No screenshots — structured events only',
                'No keystroke logging',
                'You control what is captured and uploaded',
                'Incognito windows are not accessible to this extension',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[var(--content-primary)]">
                  <Shield className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Policy content */}
      <section className="py-12 bg-[var(--surface-elevated)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="prose-policy space-y-12">

            {/* 1. Overview */}
            <PolicySection number="1" title="Overview">
              <p>
                Ledgerium AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Ledgerium AI Recorder Chrome extension
                (&quot;the Extension&quot;). This policy explains what data the Extension collects, how it is used, and the
                controls available to you.
              </p>
              <p>
                The Extension&apos;s single purpose is workflow recording: when you explicitly start a recording
                session, it captures your browser interactions and converts them into structured workflow data
                (clicks, navigations, form field labels). Nothing else.
              </p>
            </PolicySection>

            {/* 2. Permissions Used and Why */}
            <PolicySection number="2" title="Permissions Used and Why">
              <p>
                The Extension requests the following Chrome permissions. Each permission is required for the
                Extension&apos;s core workflow-recording functionality:
              </p>
              <div className="rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] p-4 space-y-4">
                <PermissionRow
                  permission="tabs"
                  reason="Required to detect tab navigation events (URL changes, tab switches) during an active recording session. Without this permission, the Extension cannot track multi-tab workflows — a core feature of workflow recording."
                />
                <PermissionRow
                  permission="storage"
                  reason="Required to persist the active recording session state across browser restarts and service worker sleep cycles. Session data is stored locally until you explicitly upload or discard it."
                />
                <PermissionRow
                  permission="sidePanel"
                  reason="Required to display the recorder control panel in the browser's side panel. This is the user interface for starting, stopping, and reviewing recordings."
                />
                <PermissionRow
                  permission="alarms"
                  reason="Required to schedule periodic service worker heartbeats to prevent Chrome from terminating the background service worker during long recording sessions."
                />
                <PermissionRow
                  permission="scripting"
                  reason="Required to inject the content-capture script into the active tab when you start a recording session. The script listens for your interactions and sends structured events to the service worker."
                />
                <PermissionRow
                  permission="host_permissions: <all_urls>"
                  reason="Required because you may record workflows on any website. The scripting permission only activates the content-capture script after you explicitly start recording on a specific tab — no passive access."
                />
              </div>
              <p className="text-[var(--content-tertiary)] text-xs mt-2">
                Incognito windows: this Extension is not permitted to run in incognito windows.
              </p>
            </PolicySection>

            {/* 3. Data Collected During Recording */}
            <PolicySection number="3" title="Data Collected During Recording">
              <p>
                The Extension only collects data when you have explicitly started a recording session. During an
                active session, it captures:
              </p>
              <h4>A. Interaction Events</h4>
              <ul>
                <li>Click events (element type, visible label text, coordinates)</li>
                <li>Navigation events (URL, page title, referrer)</li>
                <li>Form field interactions (field label, field type — <strong>not</strong> field values)</li>
                <li>Tab activation and tab URL changes</li>
              </ul>
              <h4>B. Session Metadata</h4>
              <ul>
                <li>Session start and stop timestamps</li>
                <li>Step sequence and duration timing</li>
                <li>Browser and extension version identifiers</li>
              </ul>
              <h4>C. What Is Explicitly NOT Captured</h4>
              <div className="rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] p-4">
                <ul className="space-y-2">
                  {[
                    'Screenshots or screen recordings',
                    'Keystroke content or typed text',
                    'Passwords, payment card numbers, or credentials',
                    'Form field values (only field labels/types are captured)',
                    'Data from tabs you have not started recording on',
                    'Any data while no recording session is active',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <EyeOff className="h-4 w-4 text-[var(--content-tertiary)] mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </PolicySection>

            {/* 4. How Data Is Used */}
            <PolicySection number="4" title="How Data Is Used">
              <p>Collected workflow data is used exclusively to:</p>
              <ul>
                <li>Generate structured workflow outputs (SOPs, process maps, step sequences)</li>
                <li>Provide process intelligence and analytics within the Ledgerium AI platform</li>
                <li>Enable you to review, edit, and share your recorded workflows</li>
              </ul>
              <p>We do not use your workflow data for advertising, third-party profiling, or any purpose outside workflow processing.</p>
            </PolicySection>

            {/* 5. Local Storage and Data Transmission */}
            <PolicySection number="5" title="Local Storage and Data Transmission">
              <ul>
                <li>
                  Recording data is buffered in <code>chrome.storage.local</code> during an active session.
                  This storage is scoped to the Extension and is not accessible to websites.
                </li>
                <li>
                  When you choose to upload a recording, data is transmitted over HTTPS to the Ledgerium AI
                  backend ({SITE_CONFIG.url}).
                </li>
                <li>
                  If you discard a recording, local storage is cleared immediately — no data is transmitted.
                </li>
                <li>
                  Session state data is cleared when you stop a recording or restart the Extension.
                </li>
              </ul>
            </PolicySection>

            {/* 6. Your Controls */}
            <PolicySection number="6" title="Your Controls">
              <p>You have full control over the Extension and its data:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {[
                  { icon: UserCheck, text: 'Start and stop recording at any time from the side panel' },
                  { icon: EyeOff, text: 'Discard any recording before it is uploaded' },
                  { icon: Eye, text: 'Review all captured events before saving' },
                  { icon: Lock, text: 'Uninstall the Extension to remove all local data' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-2 rounded-lg bg-[var(--surface-secondary)] p-3">
                    <Icon className="h-4 w-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{text}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4">
                To delete data stored in the Ledgerium AI platform, log into your account and use the workflow
                management tools, or contact us at{' '}
                <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="text-brand-600 hover:text-brand-700 underline">
                  {SITE_CONFIG.supportEmail}
                </a>.
              </p>
            </PolicySection>

            {/* 7. Data Sharing */}
            <PolicySection number="7" title="Data Sharing">
              <p>We do not sell or rent your data to any third party.</p>
              <p>Workflow data may be shared only:</p>
              <ul>
                <li>
                  When you explicitly share a workflow (e.g., generating a shareable link or exporting to a
                  team workspace)
                </li>
                <li>With infrastructure providers strictly necessary to operate the platform (under data
                  processing agreements)</li>
                <li>When required by applicable law or legal process</li>
              </ul>
            </PolicySection>

            {/* 8. Children's Privacy */}
            <PolicySection number="8" title="Children&apos;s Privacy">
              <p>
                The Extension is not directed at children under 13 years of age. We do not knowingly collect
                personal information from children. If you believe a child has provided information through
                the Extension, contact us and we will delete it promptly.
              </p>
            </PolicySection>

            {/* 9. Changes to This Policy */}
            <PolicySection number="9" title="Changes to This Policy">
              <p>
                We may update this policy to reflect changes to the Extension or applicable law. Material
                changes will be communicated via:
              </p>
              <ul>
                <li>An updated effective date on this page</li>
                <li>A notice in the Extension&apos;s Chrome Web Store listing where appropriate</li>
              </ul>
              <p>Continued use of the Extension after an update constitutes acceptance of the revised policy.</p>
            </PolicySection>

            {/* 10. Contact */}
            <PolicySection number="10" title="Contact">
              <p>For questions about this policy or to exercise your data rights:</p>
              <ul>
                <li>
                  Email:{' '}
                  <a
                    href={`mailto:${SITE_CONFIG.supportEmail}`}
                    className="text-brand-600 hover:text-brand-700 underline"
                  >
                    {SITE_CONFIG.supportEmail}
                  </a>
                </li>
                <li>
                  Website:{' '}
                  <Link href="/" className="text-brand-600 hover:text-brand-700 underline">
                    ledgerium.ai
                  </Link>
                </li>
              </ul>
            </PolicySection>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-xl font-bold text-[var(--content-primary)]">
            Ready to capture your workflows?
          </h2>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/install" className="btn-secondary">
              Install extension
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function PolicySection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[var(--content-primary)] mb-3 flex items-baseline gap-2">
        <span className="text-brand-600">{number}.</span> {title}
      </h3>
      <div className="text-sm text-[#e2e8f0] leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-[var(--content-primary)] [&_h4]:mt-4 [&_h4]:mb-2 [&_a]:text-brand-600 [&_a:hover]:text-brand-700 [&_strong]:text-[var(--content-primary)] [&_code]:font-mono [&_code]:text-xs [&_code]:bg-[var(--surface-secondary)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
        {children}
      </div>
    </div>
  );
}

function PermissionRow({ permission, reason }: { permission: string; reason: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
        <code className="text-xs font-mono text-brand-400">{permission}</code>
      </div>
      <p className="text-xs text-[var(--content-secondary)] pl-5">{reason}</p>
    </div>
  );
}
