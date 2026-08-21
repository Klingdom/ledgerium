'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ClipboardList, Check, Clock } from 'lucide-react';
import { SERVICE_SKUS, MIN_RECORDED_RUNS_FOR_AUDIT, GUIDED_ONBOARDING_SKU, PROCESS_AUDIT_SKU } from '@/lib/service-skus';
import type { AuditEligibility } from '@/lib/audit-eligibility';
import { ServiceCheckoutButton } from '@/components/ServiceCheckoutButton';

interface SkuAvailability {
  guided_onboarding: boolean;
  process_audit: boolean;
}

/**
 * In-app "Services" card (account page) — Guided Onboarding + Process
 * Audit, both one-time SKUs (SKU_SPEC_001).
 *
 * Process Audit is the reason this lives in-app rather than only on the
 * public pricing/install pages: the qualification gate (≥5 recorded runs of
 * the same process) is data-aware, and the customer's data is only knowable
 * once they are signed in. This card fetches the SAME eligibility the
 * checkout route enforces (/api/billing/audit-eligibility, backed by
 * getAuditEligibility) so what the customer sees here can never promise
 * something checkout would then reject.
 */
export function ServicesCard() {
  const [availability, setAvailability] = useState<SkuAvailability | null>(null);
  const [eligibility, setEligibility] = useState<AuditEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/billing/sku-availability').then((r) => r.json()),
      fetch('/api/billing/audit-eligibility').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([availRes, eligRes]) => {
        if (cancelled) return;
        setAvailability(availRes?.data ?? null);
        setEligibility(eligRes?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability(null);
          setEligibility(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onboarding = SERVICE_SKUS[GUIDED_ONBOARDING_SKU];
  const audit = SERVICE_SKUS[PROCESS_AUDIT_SKU];

  const qualifyingCount = eligibility?.processes.filter((p) => p.qualifies).length ?? 0;
  const closestProcess = eligibility?.processes
    .filter((p) => !p.qualifies)
    .sort((a, b) => b.runCount - a.runCount)[0];

  return (
    <div className="card px-ds-5 py-ds-5">
      <div className="flex items-center gap-ds-3 mb-ds-4">
        <ClipboardList className="h-5 w-5 text-[var(--content-tertiary)]" />
        <h2 className="text-ds-base font-semibold text-[var(--content-primary)]">Services</h2>
      </div>
      <p className="text-ds-xs text-[var(--content-secondary)] mb-ds-4">
        One-time, human-delivered services — not part of your subscription.
      </p>

      {isLoading ? (
        <p className="text-ds-xs text-[var(--content-tertiary)]">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
          {/* Guided Onboarding — no data gate, just availability */}
          <div className="rounded-ds-md border border-[var(--border-default)] px-ds-4 py-ds-4">
            <div className="flex items-start gap-ds-2 mb-ds-2">
              <Sparkles className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-ds-sm font-semibold text-[var(--content-primary)]">
                  {onboarding.name} — ${onboarding.price}
                </p>
                <p className="text-ds-xs text-[var(--content-secondary)] mt-0.5">{onboarding.tagline}</p>
              </div>
            </div>
            {availability?.guided_onboarding ? (
              <ServiceCheckoutButton
                sku={GUIDED_ONBOARDING_SKU}
                fallbackHref="/login"
                location="account_services_onboarding"
                className="btn-secondary w-full text-center text-xs mt-ds-2"
              >
                Get Guided Onboarding
              </ServiceCheckoutButton>
            ) : (
              <p className="text-ds-xs text-[var(--content-tertiary)] mt-ds-2">Not yet available for purchase.</p>
            )}
          </div>

          {/* Process Audit — hard-gated on real recording counts */}
          <div className="rounded-ds-md border border-[var(--border-default)] px-ds-4 py-ds-4">
            <div className="flex items-start gap-ds-2 mb-ds-2">
              <Check className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-ds-sm font-semibold text-[var(--content-primary)]">
                  {audit.name} — ${audit.price}
                </p>
                <p className="text-ds-xs text-[var(--content-secondary)] mt-0.5">{audit.tagline}</p>
              </div>
            </div>

            {!availability?.process_audit ? (
              <p className="text-ds-xs text-[var(--content-tertiary)] mt-ds-2">Not yet available for purchase.</p>
            ) : eligibility?.eligible ? (
              <>
                <p className="text-ds-xs text-[var(--content-tertiary)] mb-ds-2 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {qualifyingCount} of your process{qualifyingCount !== 1 ? 'es' : ''} qualif
                  {qualifyingCount !== 1 ? 'y' : 'ies'} ({MIN_RECORDED_RUNS_FOR_AUDIT}+ recorded runs).
                </p>
                <ServiceCheckoutButton
                  sku={PROCESS_AUDIT_SKU}
                  fallbackHref="/login"
                  location="account_services_audit"
                  className="btn-secondary w-full text-center text-xs"
                >
                  Get Process Audit
                </ServiceCheckoutButton>
              </>
            ) : (
              <div>
                <p className="text-ds-xs text-amber-700 mb-ds-2">
                  Not yet eligible — a Process Audit requires at least one process with{' '}
                  {MIN_RECORDED_RUNS_FOR_AUDIT}+ recorded runs. Below that, variance and variant
                  analysis are not statistically meaningful, so we don&apos;t sell it yet.
                </p>
                {closestProcess ? (
                  <p className="text-ds-xs text-[var(--content-tertiary)] mb-ds-2">
                    Closest: <strong>{closestProcess.canonicalName}</strong> at {closestProcess.runCount} of{' '}
                    {MIN_RECORDED_RUNS_FOR_AUDIT} runs.
                  </p>
                ) : (
                  <p className="text-ds-xs text-[var(--content-tertiary)] mb-ds-2">
                    Record the same process a few more times to unlock this.
                  </p>
                )}
                <button
                  disabled
                  aria-disabled="true"
                  title={`Requires at least one process with ${MIN_RECORDED_RUNS_FOR_AUDIT}+ recorded runs`}
                  className="btn-secondary w-full text-center text-xs opacity-50 cursor-not-allowed"
                >
                  Get Process Audit
                </button>
                <Link
                  href="/dashboard"
                  className="mt-ds-2 inline-block text-ds-xs text-brand-600 hover:text-brand-700"
                >
                  Go record more workflows →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
