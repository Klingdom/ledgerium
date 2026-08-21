'use client';

import { useEffect, useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { SERVICE_SKUS } from '@/lib/service-skus';
import type { ServiceSkuKey } from '@/lib/service-skus';
import { ServiceCheckoutButton } from '@/components/ServiceCheckoutButton';

interface Props {
  sku: ServiceSkuKey;
  /** Page-specific framing — do not reuse identical copy across placements. */
  eyebrow: string;
  heading: string;
  description: string;
  /** Analytics location tag distinguishing where this card is rendered. */
  location: string;
  fallbackHref: string;
  ctaLabel: string;
  className?: string;
}

type Availability = 'loading' | 'available' | 'unavailable';

/**
 * Self-contained public-facing offer card for a one-time service SKU
 * (Guided Onboarding / Process Audit — SKU_SPEC_001). Checks
 * /api/billing/sku-availability on mount so an unconfigured SKU renders an
 * honest "not yet available" state instead of a button that dead-ends at a
 * 503 after the customer clicks — see docs/runbooks/STRIPE_SETUP.md
 * § Service SKUs.
 *
 * Deliberately generic on copy (eyebrow/heading/description/ctaLabel are all
 * caller-supplied) — callers on different pages should frame the SAME SKU
 * differently rather than pasting an identical block; see the call sites in
 * pricing/page.tsx and install/page.tsx.
 */
export function ServiceOfferCard({
  sku,
  eyebrow,
  heading,
  description,
  location,
  fallbackHref,
  ctaLabel,
  className,
}: Props) {
  const catalog = SERVICE_SKUS[sku];
  const [availability, setAvailability] = useState<Availability>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/sku-availability')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setAvailability(json?.data?.[sku] ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setAvailability('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [sku]);

  return (
    <div className={`card px-6 py-6 ${className ?? ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-2">
        {eyebrow}
      </p>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-lg font-bold text-[var(--content-primary)]">{heading}</h3>
        <span className="text-xl font-bold text-[var(--content-primary)] whitespace-nowrap">
          ${catalog.price}
        </span>
      </div>
      <p className="text-sm text-[#e2e8f0] leading-relaxed mb-4">{description}</p>

      <ul className="space-y-2 mb-4">
        {catalog.whatYouGet.slice(0, 4).map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-brand-400" />
            <span className="text-xs text-[var(--content-primary)] leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-1.5 text-xs text-[var(--content-tertiary)] mb-4">
        <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        {catalog.fulfilment}
      </p>

      {availability === 'loading' && (
        <div className="btn-secondary w-full text-center opacity-50 cursor-default" aria-hidden="true">
          &nbsp;
        </div>
      )}

      {availability === 'unavailable' && (
        <div>
          <button disabled className="btn-secondary w-full text-center opacity-60 cursor-not-allowed">
            Not yet available
          </button>
          <p className="mt-2 text-xs text-[var(--content-tertiary)]">
            We&apos;re still setting up purchasing for this. Email{' '}
            <a href="mailto:hello@ledgerium.ai" className="underline hover:text-brand-400">
              hello@ledgerium.ai
            </a>{' '}
            if you want it sooner.
          </p>
        </div>
      )}

      {availability === 'available' && (
        <ServiceCheckoutButton
          sku={sku}
          fallbackHref={fallbackHref}
          location={location}
          className="btn-primary w-full text-center"
        >
          {ctaLabel}
        </ServiceCheckoutButton>
      )}
    </div>
  );
}
