import type { Metadata } from 'next';
import ForgotPasswordPageClient from './ForgotPasswordPageClient';

export const metadata: Metadata = {
  title: 'Reset Password — Ledgerium AI',
  description:
    'Reset your Ledgerium AI account password. Enter your email address and we will send you a secure reset link.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
