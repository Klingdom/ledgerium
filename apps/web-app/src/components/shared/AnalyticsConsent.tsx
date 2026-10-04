'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  subscribeAnalyticsConsentPrompt,
  type AnalyticsConsentValue,
} from '@/lib/analytics-consent';

type ConsentValue = AnalyticsConsentValue;

/**
 * AnalyticsConsent — a non-intrusive bottom banner that collects the user's
 * analytics consent preference (persisted by the consent store).
 *
 * Shown on first visit, and again whenever the user asks to change their choice
 * (footer / account "Analytics preferences"). Slides up from the bottom via a
 * CSS transition.
 */
export function AnalyticsConsent(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  // True when reopened by the user: there is a current choice to keep.
  const [reopened, setReopened] = useState(false);
  // Bumped on each user request to reopen; drives focusing the banner's first control.
  const [requestId, setRequestId] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // The element that asked for the banner; focus goes back to it on close.
  const requesterRef = useRef<HTMLElement | null>(null);
  const reopenedRef = useRef(false);
  reopenedRef.current = reopened;

  function restoreFocus(): void {
    const el = requesterRef.current;
    requesterRef.current = null;
    const target = el && el.isConnected
      ? el
      : document.querySelector<HTMLElement>('[data-analytics-preferences]');
    target?.focus();
  }

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    // Slight delay so the slide-up animation is noticeable
    const show = () => { t = setTimeout(() => setVisible(true), 200); };
    if (getAnalyticsConsent() === null) {
      setOpen(true);
      show();
    }
    const unsubscribe = subscribeAnalyticsConsentPrompt(() => {
      const active = document.activeElement;
      // Keep the original requester if the banner is already open (focus is inside it).
      if (!dialogRef.current?.contains(active)) {
        requesterRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      }
      setRequestId((n) => n + 1);
      setReopened(getAnalyticsConsent() !== null);
      setOpen(true);
      show();
    });
    // First-visit banner: another tab settled the choice, nothing left to ask.
    const unsubscribeChange = subscribeAnalyticsConsent(() => {
      if (getAnalyticsConsent() !== null) {
        if (reopenedRef.current) restoreFocus();
        setVisible(false); setOpen(false); setReopened(false); }
    });
    return () => { if (t) clearTimeout(t); unsubscribe(); unsubscribeChange(); };
  }, []);

  // Banner opened on request: move focus to its first control. The first-visit
  // banner (requestId 0) never takes focus.
  useEffect(() => {
    if (requestId === 0) return;
    dialogRef.current
      ?.querySelector<HTMLElement>('a[href], button:not([disabled])')
      ?.focus({ preventScroll: true });
  }, [requestId]);

  // Escape dismisses the reopened banner (keeps the current choice).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && reopened) close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  function close(): void {
    if (reopened) restoreFocus();
    requesterRef.current = null;
    setVisible(false);
    setOpen(false);
    setReopened(false);
  }

  function accept(value: ConsentValue): void {
    setAnalyticsConsent(value);
    close();
  }

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-live="polite"
      aria-label="Analytics consent"
      data-consent-banner
      className={[
        'fixed bottom-0 left-0 right-0 z-50 no-print',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto max-w-4xl mb-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-ds-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-5 py-4 shadow-lg">
          <p className="text-ds-sm text-[var(--content-secondary)]">
            We use analytics to improve Ledgerium.{' '}
            <span className="text-[var(--content-primary)] font-medium">
              Accept turns on PostHog product analytics. Our own basic usage analytics run either way.
            </span>{' '}
            <Link href="/privacy#analytics" className="underline underline-offset-2">What is sent</Link>
          </p>

          <div className="flex items-center gap-ds-2 flex-shrink-0">
            {reopened && (
              <button
                onClick={close}
                className="rounded-ds-md px-ds-3 py-1.5 text-ds-sm font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Keep current choice
              </button>
            )}
            <button
              onClick={() => accept('essential')}
              className="rounded-ds-md border border-[var(--border-default)] bg-[var(--surface-secondary)] px-ds-3 py-1.5 text-ds-sm font-medium text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Decline PostHog
            </button>

            <button
              onClick={() => accept('full')}
              className="rounded-ds-md bg-brand-700 px-ds-3 py-1.5 text-ds-sm font-semibold text-white hover:bg-brand-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
