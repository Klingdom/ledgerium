'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogoMark } from '@/components/shared/LogoMark';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center gap-3 mb-6">
            <LogoMark size={40} />
            <h1 className="text-2xl font-bold text-[var(--content-primary)]">Reset your password</h1>
          </div>
          <p className="mt-1 text-sm text-[#e2e8f0]">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="flex justify-center mb-2">
              <svg className="h-10 w-10 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--content-primary)]">Check your email</h2>
            <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
              If an account exists for <span className="font-medium text-[var(--content-primary)]">{email}</span>, you'll receive a reset link shortly. The link expires in 1 hour.
            </p>
            <p className="text-xs text-[var(--content-tertiary)]">
              Didn't receive it? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => { setSubmitted(false); setEmail(''); }}
                className="text-brand-600 hover:text-brand-500 underline"
              >
                try again
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-900/20 border border-red-700/40 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--content-primary)] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-[#e2e8f0]">
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
