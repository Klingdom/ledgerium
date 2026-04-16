'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogoMark } from '@/components/shared/LogoMark';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isMissingParams = !token || !email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSuccess(true);
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
            <h1 className="text-2xl font-bold text-[var(--content-primary)]">Set new password</h1>
          </div>
          <p className="mt-1 text-sm text-[#e2e8f0]">
            Choose a strong password for your account.
          </p>
        </div>

        {isMissingParams ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="rounded-lg bg-red-900/20 border border-red-700/40 p-3 text-sm text-red-400">
              This reset link is invalid or incomplete.
            </div>
            <Link href="/forgot-password" className="btn-primary w-full block text-center">
              Request a new link
            </Link>
          </div>
        ) : success ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="flex justify-center mb-2">
              <svg className="h-10 w-10 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--content-primary)]">Password updated</h2>
            <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <Link href="/login" className="btn-primary w-full block text-center">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-900/20 border border-red-700/40 p-3 text-sm text-red-400">
                {error}
                {error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid') ? (
                  <span>
                    {' '}
                    <Link href="/forgot-password" className="underline hover:text-red-300">
                      Request a new link
                    </Link>
                  </span>
                ) : null}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--content-primary)] mb-1">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <p className="mt-1 text-xs text-[var(--content-tertiary)]">Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--content-primary)] mb-1">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Updating...' : 'Update password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--content-tertiary)]">Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
