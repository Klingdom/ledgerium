import type { Metadata } from 'next';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Sign In — Ledgerium AI Workflow Recorder',
  description:
    'Sign in to your Ledgerium AI account. Access your recorded workflows, generated SOPs, process maps, and process documentation library.',
  openGraph: {
    title: 'Sign In — Ledgerium AI Workflow Recorder',
    description:
      'Sign in to your Ledgerium AI workspace to access your recorded workflows and generated process documentation.',
  },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
