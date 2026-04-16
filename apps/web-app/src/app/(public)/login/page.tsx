'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { LogoMark } from '@/components/shared/LogoMark';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError('Invalid email or password');
      track({ event: 'login_failed', reason: 'invalid_credentials' });
      return;
    }

    track({ event: 'login_completed' });
    // Identify user in PostHog for session attribution
    try {
      const { identifyAnalyticsUser } = await import('@/lib/analytics');
      identifyAnalyticsUser(email, { email });
    } catch { /* non-blocking */ }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center gap-3 mb-6">
            <LogoMark size={40} />
            <h1 className="text-2xl font-bold text-[var(--content-primary)]">Sign in</h1>
          </div>
          <p className="mt-1 text-sm text-[#e2e8f0]">Sign in to your workflow workspace</p>
        </div>

        <p className="text-center text-ds-xs text-[#e2e8f0] mb-4">
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            No screenshots. No keystrokes. Your data stays private.
          </span>
        </p>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-700/40 p-3 text-sm text-red-400">{error}</div>
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
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--content-primary)] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>

          <div className="text-right">
            <Link href="/forgot-password" className="text-xs text-brand-600 hover:text-brand-500">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#e2e8f0]">
          No account?{' '}
          <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-500">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-sm text-[var(--content-tertiary)]">Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
