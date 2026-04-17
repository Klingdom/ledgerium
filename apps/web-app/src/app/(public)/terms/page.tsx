import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms of Service — Ledgerium AI Workflow Recorder & SOP Platform',
  description:
    'Terms of Service for the Ledgerium AI platform, workflow recorder Chrome extension, and automated SOP generator. Clear, fair terms for process documentation.',
  openGraph: {
    title: 'Terms of Service — Ledgerium AI Workflow Recorder & SOP Platform',
    description:
      'Terms of Service for the Ledgerium AI platform and browser extension workflow recorder. Clear terms for workflow intelligence and process documentation.',
  },
};

export default function TermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-brand-400" />
            <p className="text-sm font-semibold text-brand-400 uppercase tracking-wide">
              Terms of Service
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)]">
            Ledgerium AI — Terms of Service
          </h1>
          <p className="mt-4 text-sm text-[#e2e8f0]">
            Effective Date: April 14, 2026
          </p>
        </div>
      </section>

      {/* Commitment banner */}
      <section className="border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-xl bg-brand-900/15 border border-brand-700/30 p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-brand-400" />
              <h2 className="text-sm font-bold text-[var(--content-primary)]">Our Commitment to Clear, Fair Terms</h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'You own your workflow data and outputs',
                'We do not sell your data',
                'We do not train AI on your recordings',
                'You can export or delete your data any time',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[var(--content-primary)]">
                  <FileText className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Terms content */}
      <section className="py-12 bg-[var(--surface-elevated)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="prose-policy space-y-12">

            {/* 1. Acceptance of Terms */}
            <PolicySection number="1" title="Acceptance of Terms">
              <p>
                By creating an account, installing the Ledgerium AI Recorder browser extension (&quot;the Extension&quot;), or otherwise using the Ledgerium AI platform (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
              </p>
              <p>
                If you do not agree to these Terms, do not use the Service. These Terms apply to all users of the Service, including visitors, registered users, and paying customers.
              </p>
            </PolicySection>

            {/* 2. Service Description */}
            <PolicySection number="2" title="Service Description">
              <p>
                Ledgerium AI provides browser-based workflow recording, structured documentation generation (SOPs, process maps), and process intelligence analytics.
              </p>
              <ul>
                <li>The Extension captures user-initiated interaction events in the browser.</li>
                <li>The platform processes this data into structured outputs including standard operating procedures, process maps, and workflow analytics.</li>
                <li>Recording is always user-initiated — the Extension does not operate silently or without your explicit action.</li>
              </ul>
              <p>
                We reserve the right to modify, suspend, or discontinue features of the Service with reasonable notice.
              </p>
            </PolicySection>

            {/* 3. Accounts & Registration */}
            <PolicySection number="3" title="Accounts &amp; Registration">
              <p>To access certain features, you must register for an account. You agree to:</p>
              <ul>
                <li>Provide accurate, current, and complete registration information.</li>
                <li>Maintain the confidentiality of your password and account credentials.</li>
                <li>Be at least 18 years of age.</li>
                <li>Maintain one account per person — multiple accounts for the same individual are not permitted.</li>
                <li>Notify us immediately of any unauthorized use of your account.</li>
              </ul>
              <p>
                We may suspend or terminate accounts that violate these Terms, provide false information, or engage in abusive behavior toward the Service or other users.
              </p>
            </PolicySection>

            {/* 4. Acceptable Use */}
            <PolicySection number="4" title="Acceptable Use">
              <p>You may use Ledgerium AI for lawful workflow documentation and process intelligence purposes.</p>
              <p>You may <strong>NOT</strong>:</p>
              <ul>
                <li>Use the Extension or Service to monitor others without their knowledge and consent.</li>
                <li>Attempt to reverse-engineer, decompile, or disassemble any part of the Service.</li>
                <li>Use the Service to capture data you do not have the rights to access or record.</li>
                <li>Share your account credentials with others or resell access to the Service.</li>
                <li>Use the Service in violation of applicable local, national, or international laws or regulations.</li>
                <li>Attempt to gain unauthorized access to other accounts, systems, or networks connected to the Service.</li>
                <li>Introduce malware, viruses, or other harmful code into the Service.</li>
              </ul>
              <p>
                Violation of these rules may result in immediate suspension or termination of your account without refund.
              </p>
            </PolicySection>

            {/* 5. Intellectual Property */}
            <PolicySection number="5" title="Intellectual Property">
              <h4>What We Own</h4>
              <p>
                Ledgerium AI owns all rights to the Service, including the software, user interface, brand, trademarks, and platform documentation. Nothing in these Terms transfers ownership of our intellectual property to you.
              </p>
              <h4>What You Own</h4>
              <p>
                You own your workflow data and all generated outputs — including recordings, SOPs, process maps, and any exports produced from your data. We do not claim ownership of any content you create using the Service.
              </p>
              <h4>License to Operate</h4>
              <p>
                By using the Service, you grant Ledgerium AI a limited, non-exclusive license to process your data solely to provide the Service to you. This license does not extend to training AI models, sharing with third parties, or any use beyond operating the platform on your behalf.
              </p>
            </PolicySection>

            {/* 6. Data & Privacy */}
            <PolicySection number="6" title="Data &amp; Privacy">
              <p>Your data is governed by our <Link href="/privacy" className="text-brand-400 hover:text-brand-300 underline">Privacy Policy</Link>, which is incorporated into these Terms by reference.</p>
              <ul>
                <li>We do not sell your data to third parties.</li>
                <li>We do not use your workflow data to train AI models.</li>
                <li>You can export your data at any time from within the platform.</li>
                <li>You can request deletion of your data at any time by contacting us.</li>
              </ul>
              <p>
                We take reasonable technical and organizational measures to protect your data, but no system is 100% secure. Please review our Privacy Policy for full details.
              </p>
            </PolicySection>

            {/* 7. Plans & Billing */}
            <PolicySection number="7" title="Plans &amp; Billing">
              <h4>Free Tier</h4>
              <p>
                The free tier is available at no cost. No payment information is required to use the free tier.
              </p>
              <h4>Paid Plans</h4>
              <ul>
                <li>Paid plans are billed monthly or annually in advance.</li>
                <li>You can cancel your paid plan at any time through your account settings.</li>
                <li>Cancellation takes effect at the end of your current billing period — you retain access until then.</li>
                <li>Refund requests are reviewed case-by-case. Contact us at <a href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a> to request a review.</li>
                <li>We may change plan pricing with at least 30 days&apos; advance notice. Price changes will not affect your current billing period.</li>
              </ul>
            </PolicySection>

            {/* 8. Availability & Support */}
            <PolicySection number="8" title="Availability &amp; Support">
              <p>
                We aim for high availability of the Service but do not guarantee 100% uptime. We may perform scheduled maintenance or emergency updates that temporarily affect availability.
              </p>
              <ul>
                <li>We will provide reasonable advance notice of planned maintenance where possible.</li>
                <li>Support is provided via email at <a href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a>.</li>
                <li>Response times may vary based on your plan tier and request complexity.</li>
              </ul>
            </PolicySection>

            {/* 9. Limitation of Liability */}
            <PolicySection number="9" title="Limitation of Liability">
              <p>
                The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
              </p>
              <ul>
                <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</li>
                <li>Our maximum liability to you for any claim arising out of or related to these Terms or the Service is limited to the total amount you paid to us in the 12 months preceding the claim.</li>
                <li>Generated outputs — including SOPs, process maps, and workflow documentation — are informational in nature and do not constitute legal, compliance, regulatory, or audit advice. You are responsible for validating outputs before acting on them.</li>
              </ul>
              <p>
                Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so some of the above may not apply to you.
              </p>
            </PolicySection>

            {/* 10. Termination */}
            <PolicySection number="10" title="Termination">
              <p>Either party may terminate the relationship under these Terms at any time.</p>
              <ul>
                <li>You may close your account at any time through your account settings.</li>
                <li>We may terminate or suspend your account for violation of these Terms, fraudulent activity, or prolonged inactivity, with or without prior notice depending on severity.</li>
                <li>Upon termination, you may export your data for up to 30 days from the termination date.</li>
                <li>After the 30-day export window, your data may be permanently deleted from our systems.</li>
              </ul>
              <p>
                Provisions of these Terms that by their nature should survive termination will do so, including intellectual property, limitation of liability, and dispute resolution clauses.
              </p>
            </PolicySection>

            {/* 11. Changes to Terms */}
            <PolicySection number="11" title="Changes to Terms">
              <p>
                We may update these Terms from time to time to reflect changes in the Service, applicable law, or our business practices.
              </p>
              <ul>
                <li>We will notify users of material changes via email or a prominent notice within the Service.</li>
                <li>The updated Terms will include a new effective date.</li>
                <li>Continued use of the Service after notification of changes constitutes acceptance of the updated Terms.</li>
              </ul>
              <p>
                If you do not agree to the updated Terms, you must stop using the Service and may close your account.
              </p>
            </PolicySection>

            {/* 12. Contact */}
            <PolicySection number="12" title="Contact">
              <p>If you have questions about these Terms or need to reach us regarding your account:</p>
              <ul>
                <li>Email: <a href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a></li>
                <li>Website: <Link href="/">ledgerium.ai</Link></li>
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
        <span className="text-brand-400">{number}.</span> {title}
      </h3>
      <div className="text-sm text-[#e2e8f0] leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-[var(--content-primary)] [&_h4]:mt-4 [&_h4]:mb-2 [&_a]:text-brand-400 [&_a:hover]:text-brand-300 [&_strong]:text-[var(--content-primary)]">
        {children}
      </div>
    </div>
  );
}
