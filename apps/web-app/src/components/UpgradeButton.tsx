'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

interface Props {
  className?: string;
  children: React.ReactNode;
  fallbackHref: string;
}

/**
 * Smart upgrade button:
 * - Authenticated → POST /api/billing/checkout → redirect to Stripe
 * - Unauthenticated → link to signup
 */
export function UpgradeButton({ className, children, fallbackHref }: Props) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  if (!session?.user) {
    return (
      <Link href={fallbackHref} className={className}>
        {children}
      </Link>
    );
  }

  async function handleClick() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirect) {
        window.location.href = data.redirect;
      }
    } catch {
      // Fallback to signup
      window.location.href = fallbackHref;
    }
    setIsLoading(false);
  }

  return (
    <button onClick={handleClick} disabled={isLoading} className={className}>
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
