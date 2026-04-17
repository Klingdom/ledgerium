import type { Metadata } from 'next';
import SignupPageClient from './SignupPageClient';

export const metadata: Metadata = {
  title: 'Sign Up Free — Ledgerium AI Workflow Recorder & SOP Generator',
  description:
    'Create your free Ledgerium AI account. Start recording browser workflows and generating SOPs automatically. Free plan includes 5 recordings per month, no credit card required.',
  openGraph: {
    title: 'Sign Up Free — Ledgerium AI Workflow Recorder & SOP Generator',
    description:
      'Start recording browser workflows and generating SOPs for free. No credit card required. Get structured process documentation from real browser activity in minutes.',
  },
};

export default function SignupPage() {
  return <SignupPageClient />;
}
