'use client';

import { useEffect, useRef } from 'react';

import { track } from '@/lib/analytics';
import {
  shouldEmitPromptView,
  nextEmittedState,
  type UpgradePromptIdentity,
} from '@/lib/upgrade-prompt';

/**
 * Record that an upgrade prompt was shown — row #238.
 *
 * Thin by design: the counting rule lives in `lib/upgrade-prompt.ts`, where it
 * can be tested without a React renderer. What remains here is the effect that
 * applies it.
 *
 * @param prompt the prompt currently on screen, or null when none is shown.
 *   Pass null rather than skipping the call — the hook needs to see the prompt
 *   disappear so a later reappearance counts again.
 */
export function useUpgradePromptViewed(prompt: UpgradePromptIdentity | null): void {
  const lastEmitted = useRef<UpgradePromptIdentity | null>(null);

  // Depend on the fields, not the object: callers construct the identity inline
  // and a fresh object each render would re-run this effect every time. The
  // rule in shouldEmitPromptView would still suppress the duplicate emit, but
  // relying on that would make correctness depend on two things agreeing rather
  // than one.
  const location = prompt?.location ?? null;
  const plan = prompt?.plan ?? null;

  useEffect(() => {
    const current: UpgradePromptIdentity | null =
      location !== null && plan !== null ? { location, plan } : null;

    if (shouldEmitPromptView(lastEmitted.current, current)) {
      track({ event: 'upgrade_prompt_viewed', location: current!.location, plan: current!.plan });
    }
    lastEmitted.current = nextEmittedState(lastEmitted.current, current);
  }, [location, plan]);
}
