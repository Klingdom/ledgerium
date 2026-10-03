'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

import { clearAccountCache } from './useAccount';
import { useAnalyticsConsent } from '@/lib/analytics-consent';
import { identifyAnalyticsUser, resetAnalyticsUser, setUserPlanForAnalytics } from '@/lib/analytics';

/**
 * Row #355. Keep analytics identity in step with the session, app-wide.
 *
 * Mounted from `AuthProvider`, i.e. above every route group, so it also covers
 * the public pages (/login, /signup, /pricing) that `AppShell` never mounts on.
 *
 * - Session unauthenticated (expiry, sign-out in another tab noticed on focus):
 *   clear the plan slot and the shared account cache; reset PostHog if this
 *   browser was identified.
 * - Session user id differs from the one last published: same clears, then
 *   identify the new user.
 * - Same user re-rendering: nothing (effect keys on status + id only).
 *
 * PostHog identity is the user id, never the email, and no person properties
 * are sent. The identified id is remembered in localStorage so a full reload
 * after expiry still resets a persisted identity. An anonymous visitor who never
 * signed in is never reset (that would mint a new anonymous id per page load).
 *
 * Consent (row #394 / #391): PostHog only starts on 'full' consent, so an identify
 * attempted before consent returns false and is not stored. This hook re-runs when
 * the consent choice changes: becoming 'full' identifies the signed-in user (by id
 * only); leaving 'full' forgets the stored identity (PostHogProvider resets PostHog)
 * so a later grant identifies again.
 *
 * Second tab: not synchronised by BroadcastChannel. next-auth's SessionProvider
 * refetches on window focus and broadcasts session changes between tabs, which
 * re-renders `useSession` here, so a tab converges the next time it is focused
 * or receives next-auth's own storage event. Nothing extra is needed.
 */
export const IDENTIFIED_USER_KEY = 'ledgerium_ph_identified_user';

function readStored(): string | null {
  try { return window.localStorage.getItem(IDENTIFIED_USER_KEY); } catch { return null; }
}
function writeStored(id: string | null): void {
  try {
    if (id === null) window.localStorage.removeItem(IDENTIFIED_USER_KEY);
    else window.localStorage.setItem(IDENTIFIED_USER_KEY, id);
  } catch { /* storage unavailable */ }
}

function clearUserScopedState(): void {
  setUserPlanForAnalytics(undefined);
  clearAccountCache();
}

export function useAnalyticsIdentity(): void {
  const { data: session, status } = useSession();
  const userId = status === 'authenticated' ? session?.user?.id ?? null : null;
  const consent = useAnalyticsConsent();
  const lastId = useRef<string | null>(null);
  // True once PostHog actually identified this user (or a stored identity says so).
  const identified = useRef(false);
  const prevConsent = useRef(consent);

  useEffect(() => {
    const withdrawn = prevConsent.current === 'full' && consent !== 'full';
    prevConsent.current = consent;
    if (withdrawn) {
      writeStored(null);
      identified.current = false;
    }

    if (status === 'loading') return;
    if (status === 'authenticated' && !userId) return; // malformed session: change nothing

    if (userId === null) {
      clearUserScopedState();
      if (lastId.current !== null || readStored() !== null) {
        resetAnalyticsUser();
        writeStored(null);
      }
      lastId.current = null;
      identified.current = false;
      return;
    }

    const previous = lastId.current ?? readStored();
    if (previous === userId) {
      lastId.current = userId;
      if (consent === 'full' && !identified.current && readStored() !== userId) {
        // Same user, not identified yet (PostHog was dormant): retry, e.g. after consent -> full.
        if (identifyAnalyticsUser(userId)) {
          writeStored(userId);
          identified.current = true;
        }
      } else if (readStored() === userId) {
        identified.current = true;
      }
      return;
    }
    if (previous !== null) {
      clearUserScopedState();
      resetAnalyticsUser();
      writeStored(null);
    }
    lastId.current = userId;
    identified.current = false;
    if (identifyAnalyticsUser(userId)) {
      writeStored(userId);
      identified.current = true;
    }
  }, [status, userId, consent]);
}
