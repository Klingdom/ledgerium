'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Mail } from 'lucide-react';
import { billingIdentityReminder } from '@/lib/billing-identity';
import { formatCurrency } from '@/lib/format';

interface CatalogEntry {
  name: string;
  price: number;
  whatYouGet: string[];
  fulfilment: string;
  nextStep: string;
}

interface PurchaseData {
  pending: boolean;
  sku?: string;
  amountTotal?: number;
  currency?: string;
  paymentStatus?: string;
  catalog?: CatalogEntry | null;
}

const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 1500;

// Default export wraps the inner component in <Suspense> because
// `useSearchParams()` requires a Suspense boundary in Next.js 14 — matches
// the established pattern in dashboard/page.tsx.
export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PurchaseSuccessContent />
    </Suspense>
  );
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [failed, setFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/billing/one-time-purchase?session_id=${encodeURIComponent(sessionId!)}`);
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        setPurchase(json.data);

        if (json.data.pending) {
          setAttempts((prev) => {
            const next = prev + 1;
            if (next < MAX_POLL_ATTEMPTS) {
              timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
            }
            return next;
          });
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // Intentionally only re-runs on sessionId change — the internal poll
    // loop manages its own retry scheduling via setTimeout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-lg text-center py-ds-10">
        <h1 className="text-ds-xl font-bold text-[var(--content-primary)] mb-ds-2">
          No purchase to confirm
        </h1>
        <p className="text-ds-sm text-[var(--content-secondary)] mb-ds-4">
          This page confirms a completed one-time purchase and needs a session reference to look
          one up.
        </p>
        <Link href="/account" className="btn-secondary text-xs">
          Go to Account
        </Link>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-lg py-ds-10">
        <div className="ds-callout ds-callout-warning">
          <p className="text-ds-sm font-medium text-amber-900">Couldn&apos;t confirm your purchase</p>
          <p className="mt-ds-1 text-ds-xs text-amber-700">
            We couldn&apos;t look up this purchase right now. If your card was charged, email{' '}
            <a href="mailto:hello@ledgerium.ai" className="underline">
              hello@ledgerium.ai
            </a>{' '}
            with session reference <code className="font-mono">{sessionId}</code> and we&apos;ll sort
            it out.
          </p>
        </div>
        <Link href="/account" className="mt-ds-4 inline-block btn-secondary text-xs">
          Go to Account
        </Link>
      </div>
    );
  }

  const stillPending = !purchase || purchase.pending;
  const exhaustedRetries = stillPending && attempts >= MAX_POLL_ATTEMPTS;

  if (stillPending && !exhaustedRetries) {
    return (
      <div className="mx-auto max-w-lg text-center py-ds-10">
        <Clock className="mx-auto h-8 w-8 text-brand-500 mb-ds-3 animate-pulse" />
        <h1 className="text-ds-xl font-bold text-[var(--content-primary)] mb-ds-2">
          Confirming your payment…
        </h1>
        <p className="text-ds-sm text-[var(--content-secondary)]">
          This usually takes a few seconds.
        </p>
      </div>
    );
  }

  if (exhaustedRetries) {
    return (
      <div className="mx-auto max-w-lg py-ds-10">
        <div className="ds-callout ds-callout-info">
          <p className="text-ds-sm font-medium text-blue-900">Payment received</p>
          <p className="mt-ds-1 text-ds-xs text-blue-700">
            Stripe is still finishing processing on our side — this can take a little longer than
            usual. If this page doesn&apos;t update after refreshing, email{' '}
            <a href="mailto:hello@ledgerium.ai" className="underline">
              hello@ledgerium.ai
            </a>{' '}
            and mention session reference <code className="font-mono">{sessionId}</code>.
          </p>
        </div>
        <Link href="/account" className="mt-ds-4 inline-block btn-secondary text-xs">
          Go to Account
        </Link>
      </div>
    );
  }

  // purchase is confirmed (pending: false) at this point.
  const catalog = purchase!.catalog ?? null;
  const amount =
    purchase!.amountTotal != null && purchase!.currency
      ? formatCurrency(purchase!.amountTotal, purchase!.currency)
      : null;

  return (
    <div className="mx-auto max-w-lg py-ds-8">
      <div className="text-center mb-ds-6">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-ds-3" />
        <h1 className="text-ds-2xl font-bold text-[var(--content-primary)]">
          {catalog ? `You bought ${catalog.name}` : 'Purchase confirmed'}
        </h1>
        {amount && (
          <p className="text-ds-sm text-[var(--content-secondary)] mt-ds-1">
            {amount} charged
            {purchase!.paymentStatus && purchase!.paymentStatus !== 'paid' && (
              <> — status: {purchase!.paymentStatus}</>
            )}
          </p>
        )}
      </div>

      {catalog ? (
        <div className="card px-ds-5 py-ds-5 space-y-ds-4">
          <div>
            <p className="ds-section-label mb-ds-2">What you bought</p>
            <ul className="space-y-1.5">
              {catalog.whatYouGet.map((item) => (
                <li key={item} className="text-ds-sm text-[var(--content-primary)] flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-ds-3 border-t border-[var(--border-subtle)]">
            <p className="ds-section-label mb-ds-1">What happens now</p>
            <p className="text-ds-sm text-[var(--content-primary)]">{catalog.nextStep}</p>
            <p className="text-ds-xs text-[var(--content-tertiary)] mt-ds-2 flex items-start gap-1.5">
              <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              {catalog.fulfilment}
            </p>
          </div>
          {/*
            Stated at the moment the charge is freshest, so the name on the
            statement is already familiar when it appears days later.
          */}
          <div className="pt-ds-3 border-t border-[var(--border-subtle)]">
            <p className="text-ds-xs text-[var(--content-tertiary)]">
              {billingIdentityReminder()}
            </p>
          </div>
          <div className="pt-ds-3 border-t border-[var(--border-subtle)] flex items-start gap-1.5">
            <Mail className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[var(--content-tertiary)]" />
            <p className="text-ds-xs text-[var(--content-tertiary)]">
              Questions in the meantime? Email{' '}
              <a href="mailto:hello@ledgerium.ai" className="underline hover:text-brand-400">
                hello@ledgerium.ai
              </a>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="ds-callout ds-callout-info">
          <p className="text-ds-sm text-blue-900">
            Your payment is confirmed. We&apos;ll follow up by email with next steps.
          </p>
        </div>
      )}

      <div className="mt-ds-6 text-center">
        <Link href="/account" className="btn-secondary text-xs">
          Back to Account
        </Link>
      </div>
    </div>
  );
}
