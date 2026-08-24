'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { track } from '@/lib/analytics';
import type { ServiceSkuKey } from '@/lib/service-skus';
import { mapCheckoutError, type CheckoutErrorCode } from '@/lib/checkout-error';

interface Props {
  className?: string;
  children: React.ReactNode;
  sku: ServiceSkuKey;
  /** Where signed-out visitors go — mirrors UpgradeButton's fallbackHref pattern. */
  fallbackHref: string;
  /** For click-tracking (`cta_clicked`). Distinguishes /pricing vs /install vs /account. */
  location: string;
  /** External disabled state — e.g. the Process Audit qualification gate. When set, the button renders disabled with `disabledReason` shown instead of doing anything on click. */
  disabled?: boolean;
  disabledReason?: string;
}

/** Shape returned by POST /api/billing/checkout on 4xx/5xx for the one_time path. */
interface CheckoutErrorResponse {
  error: string;
  code?: CheckoutErrorCode;
  minRunsRequired?: number;
}

/**
 * One-time service SKU purchase button (Guided Onboarding / Process Audit —
 * SKU_SPEC_001). Mirrors `UpgradeButton`'s session-aware pattern:
 *   - Authenticated → POST /api/billing/checkout { type: 'one_time', sku } → redirect to Stripe
 *   - Unauthenticated → link to `fallbackHref` (typically /signup)
 *
 * Server-side is the actual source of truth for both "is this SKU
 * configured" (503) and "is this user eligible" (403, Process Audit only) —
 * this component surfaces whatever the server says rather than assuming.
 * Callers that already know the answer via /api/billing/sku-availability or
 * /api/billing/audit-eligibility should pass `disabled` + `disabledReason`
 * to short-circuit before a network round-trip, but this component's own
 * click handler re-checks regardless (defense in depth — never trust a
 * stale client-side eligibility snapshot over what checkout actually does).
 */
export function ServiceCheckoutButton({
  className,
  children,
  sku,
  fallbackHref,
  location,
  disabled,
  disabledReason,
}: Props) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (disabled) {
    return (
      <div>
        <button
          disabled
          className={className}
          aria-disabled="true"
          title={disabledReason}
        >
          {children}
        </button>
        {disabledReason && (
          <p className="mt-2 text-xs text-[var(--content-tertiary)]">{disabledReason}</p>
        )}
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href={fallbackHref}
        className={className}
        onClick={() => track({ event: 'cta_clicked', location, destination: fallbackHref })}
      >
        {children}
      </Link>
    );
  }

  async function handleClick() {
    setIsLoading(true);
    setErrorMessage(null);
    track({ event: 'cta_clicked', location, destination: 'checkout' });
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'one_time', sku }),
      });
      const data = (await res.json()) as CheckoutErrorResponse & { url?: string };

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.error) {
        // SUBSCRIPTION_READINESS_001 §G2: never render `data.error` — some
        // codes (sku_not_configured, checkout_session_failed, ...) carry
        // internal diagnostic text server-side. Map the stable `code` to
        // customer copy instead.
        setErrorMessage(mapCheckoutError(res.status, data).message);
        setIsLoading(false);
        return;
      }
    } catch {
      setErrorMessage('Could not reach the billing service — please try again in a moment.');
    }
    setIsLoading(false);
  }

  return (
    <div>
      <button onClick={handleClick} disabled={isLoading} className={className}>
        {isLoading ? 'Redirecting…' : children}
      </button>
      {errorMessage && (
        <p role="alert" aria-live="polite" className="mt-2 text-xs text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
