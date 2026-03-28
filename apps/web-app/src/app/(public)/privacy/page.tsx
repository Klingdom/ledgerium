import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Lock, UserCheck, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy — Ledgerium AI',
  description:
    'How the Ledgerium AI Recorder browser extension collects, uses, and safeguards your information. Trust-first, user-controlled, evidence-based.',
};

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-brand-600" />
            <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide">
              Privacy Policy
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Ledgerium AI Recorder — Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-gray-500">
            Effective Date: March 28, 2026
          </p>
        </div>
      </section>

      {/* Transparency commitment */}
      <section className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-bold text-brand-900">Our Commitment to Transparency</h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Recording is always user-initiated',
                'You can see exactly what is captured',
                'Nothing runs silently in the background',
                'Your workflows remain under your control',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-brand-800">
                  <Shield className="h-3.5 w-3.5 text-brand-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Policy content */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="prose-policy space-y-12">

            {/* 1. Overview */}
            <PolicySection number="1" title="Overview">
              <p>
                Ledgerium AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how the Ledgerium AI Recorder browser extension (&quot;the Extension&quot;) collects, uses, and safeguards information.
              </p>
              <p>
                Ledgerium AI Recorder is designed to help users capture real workflows and transform them into structured processes, SOPs, and process maps.
              </p>
              <ul>
                <li>We do not operate as a surveillance or tracking tool.</li>
                <li>Recording is fully user-controlled and only occurs when explicitly initiated.</li>
              </ul>
            </PolicySection>

            {/* 2. Information We Collect */}
            <PolicySection number="2" title="Information We Collect">
              <h4>A. Workflow Data (User-Initiated)</h4>
              <p>When you start a recording session, the Extension may capture:</p>
              <ul>
                <li>User interactions (clicks, navigation, inputs)</li>
                <li>Page context (URLs, titles, application context)</li>
                <li>Step sequences and timing information</li>
                <li>Workflow structure (steps, transitions, durations)</li>
              </ul>
              <p>This data is used solely to:</p>
              <ul>
                <li>Generate workflow outputs (SOPs, process maps)</li>
                <li>Provide process intelligence and analytics</li>
              </ul>
              <p className="text-brand-700 font-medium">
                Recording only occurs while a session is actively running.
              </p>

              <h4>B. Technical &amp; Usage Data</h4>
              <p>We may collect limited technical data such as:</p>
              <ul>
                <li>Extension state (active/inactive)</li>
                <li>Basic configuration and preferences</li>
                <li>Error logs (for debugging and stability)</li>
              </ul>
              <p>This data is used to improve reliability and performance.</p>

              <h4>C. Authentication Data (If Applicable)</h4>
              <p>If you sign into Ledgerium AI:</p>
              <ul>
                <li>Account-related identifiers (e.g., email)</li>
                <li>Session/authentication tokens</li>
              </ul>
              <p>These are used only to associate your recordings with your account.</p>
            </PolicySection>

            {/* 3. What We Do NOT Collect */}
            <PolicySection number="3" title="What We Do NOT Collect">
              <p>Ledgerium AI Recorder is designed with a trust-first approach. We do <strong>NOT</strong>:</p>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <ul className="space-y-2">
                  {[
                    'Record anything unless you explicitly start recording',
                    'Monitor your browsing activity in the background',
                    'Sell or share your data with advertisers',
                    'Capture data outside the scope of workflow recording',
                    'Store sensitive data intentionally (e.g., passwords, financial info)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <EyeOff className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </PolicySection>

            {/* 4. How We Use Your Information */}
            <PolicySection number="4" title="How We Use Your Information">
              <p>We use collected data to:</p>
              <ul>
                <li>Generate structured workflows, SOPs, and process maps</li>
                <li>Analyze workflow behavior for insights and improvements</li>
                <li>Provide features within the Ledgerium AI platform</li>
                <li>Improve product performance and reliability</li>
              </ul>
              <p>We do not use your data for advertising or third-party profiling.</p>
            </PolicySection>

            {/* 5. Data Storage & Security */}
            <PolicySection number="5" title="Data Storage & Security">
              <ul>
                <li>Workflow data is transmitted securely to the Ledgerium AI backend</li>
                <li>Data is stored in secure environments with access controls</li>
                <li>Local extension storage is used only for temporary/session data</li>
                <li>Sensitive operations are protected using industry-standard practices</li>
              </ul>
              <p>We take reasonable measures to protect your data, but no system is 100% secure.</p>
            </PolicySection>

            {/* 6. User Control */}
            <PolicySection number="6" title="User Control">
              <p>You maintain full control over your data:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {[
                  { icon: UserCheck, text: 'You choose when to start and stop recording' },
                  { icon: EyeOff, text: 'You can discard recordings before saving' },
                  { icon: Eye, text: 'You can review all captured data' },
                  { icon: Lock, text: 'You can manage or delete workflows within the platform' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                    <Icon className="h-4 w-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </PolicySection>

            {/* 7. Data Sharing */}
            <PolicySection number="7" title="Data Sharing">
              <p>We do not sell or rent your data.</p>
              <p>We may share data only:</p>
              <ul>
                <li>With your explicit action (e.g., sharing workflows)</li>
                <li>When required by law or legal obligation</li>
                <li>With service providers strictly necessary to operate the platform (under confidentiality agreements)</li>
              </ul>
            </PolicySection>

            {/* 8. Third-Party Services */}
            <PolicySection number="8" title="Third-Party Services">
              <p>The Extension may communicate with Ledgerium AI backend services to:</p>
              <ul>
                <li>Upload recorded workflows</li>
                <li>Retrieve processed outputs</li>
              </ul>
              <p>These services are operated securely and governed by this policy.</p>
            </PolicySection>

            {/* 9. Changes to This Policy */}
            <PolicySection number="9" title="Changes to This Policy">
              <p>We may update this Privacy Policy from time to time. If changes are significant, we will:</p>
              <ul>
                <li>Update the effective date</li>
                <li>Provide notice where appropriate</li>
              </ul>
              <p>Continued use of the Extension implies acceptance of updates.</p>
            </PolicySection>

            {/* 10. Contact */}
            <PolicySection number="10" title="Contact">
              <p>If you have questions about this Privacy Policy or your data:</p>
              <ul>
                <li>Email: <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="text-brand-600 hover:text-brand-700 underline">{SITE_CONFIG.supportEmail}</a></li>
                <li>Website: <Link href="/" className="text-brand-600 hover:text-brand-700 underline">ledgerium.ai</Link></li>
              </ul>
            </PolicySection>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-xl font-bold text-gray-900">
            Ready to capture your workflows?
          </h2>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/install-extension" className="btn-secondary">
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
      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-baseline gap-2">
        <span className="text-brand-600">{number}.</span> {title}
      </h3>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-900 [&_h4]:mt-4 [&_h4]:mb-2 [&_a]:text-brand-600 [&_a:hover]:text-brand-700 [&_strong]:text-gray-900">
        {children}
      </div>
    </div>
  );
}
