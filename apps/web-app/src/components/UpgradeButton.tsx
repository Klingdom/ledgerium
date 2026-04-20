'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { track } from '@/lib/analytics';

interface Props {
  className?: string;
  children: React.ReactNode;
  fallbackHref: string;
  plan?: 'starter' | 'team' | 'growth';
  interval?: 'monthly' | 'annual';
}

/** Shape returned by POST /api/billing/checkout on 4xx. */
interface CheckoutErrorResponse {
  error: string;
  code?: 'admin_bypass' | 'already_subscribed';
  redirect?: string;
}

/**
 * Smart upgrade button:
 * - Authenticated → POST /api/billing/checkout → redirect to Stripe
 * - Unauthenticated → link to signup
 * - On 4xx with error → shows inline accessible error message; redirects after
 *   a short delay only when the API also provides a redirect path.
 */
export function UpgradeButton({ className, children, fallbackHref, plan, interval }: Props) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!session?.user) {
    return (
      <Link href={fallbackHref} className={className}>
        {children}
      </Link>
    );
  }

  async function handleClick() {
    setIsLoading(true);
    setErrorMessage(null);
    track({ event: 'upgrade_clicked', location: 'upgrade_button' });
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan ?? 'starter',
          interval: interval ?? 'monthly',
        }),
      });
      const data = await res.json() as CheckoutErrorResponse & { url?: string };

      if (data.url) {
        // Happy path — redirect to Stripe Checkout.
        track({ event: 'checkout_started' });
        window.location.href = data.url;
        return;
      }

      if (data.error) {
        const code = data.code ?? ('already_subscribed' as const);
        // Track the blocked upgrade attempt for funnel analysis.
        track({
          event: 'upgrade_blocked',
          code: data.code ?? 'already_subscribed',
          location: plan ?? 'starter',
        });

        setErrorMessage(data.error);
        setIsLoading(false);

        if (data.redirect) {
          // Show the error briefly, then navigate so the user understands why
          // they are being redirected.
          setTimeout(() => {
            window.location.href = data.redirect!;
          }, 1500);
        }
        // No redirect → stay on page. User reads the inline error.
        return;
      }
    } catch {
      // Network failure — fall back to signup/pricing page.
      window.location.href = fallbackHref;
    }
    setIsLoading(false);
  }

  return (
    <div>
      <button onClick={handleClick} disabled={isLoading} className={className}>
        {isLoading ? 'Loading...' : children}
      </button>
      {errorMessage && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-2 text-sm text-red-600"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
