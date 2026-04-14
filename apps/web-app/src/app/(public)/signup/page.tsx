'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { LogoMark } from '@/components/shared/LogoMark';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 1. Create account
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to create account');
      setIsLoading(false);
      return;
    }

    // 2. Auto sign-in
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError('Account created but sign-in failed. Please log in.');
      return;
    }

    track({ event: 'signup_completed' });
    // Identify new user in PostHog
    try {
      const { identifyAnalyticsUser } = await import('@/lib/analytics');
      identifyAnalyticsUser(email, { email, signupDate: new Date().toISOString() });
    } catch { /* non-blocking */ }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center gap-3 mb-6">
            <LogoMark size={40} />
            <h1 className="text-2xl font-bold text-[var(--content-primary)]">Create your account</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--content-secondary)]">Create your workflow workspace</p>
        </div>

        <p className="text-center text-ds-xs text-[var(--content-secondary)] mb-4">
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            No screenshots. No keystrokes. Your data stays private.
          </span>
        </p>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--content-primary)] mb-1">
              Name <span className="text-[var(--content-tertiary)]">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              autoComplete="name"
            />
          </div>

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
              autoComplete="new-password"
              minLength={8}
            />
            <p className="mt-1 text-xs text-[var(--content-tertiary)]">Minimum 8 characters</p>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--content-secondary)]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
