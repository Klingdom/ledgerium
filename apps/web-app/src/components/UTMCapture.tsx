'use client';

/**
 * UTMCapture — first-touch UTM attribution.
 *
 * On mount, checks the current URL for UTM parameters. If any are present
 * and no first-touch data has been stored yet, persists them along with the
 * landing path and referrer domain to localStorage.
 *
 * First-touch only: once the key is set it is never overwritten.
 * Renders nothing — purely a side-effect component.
 */

import { useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';

const STORAGE_KEY = 'ledgerium_first_touch_utm';

const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

type UtmParam = (typeof UTM_PARAMS)[number];

export interface FirstTouchUTM {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path: string;
  referrer_domain: string;
  captured_at: string;
}

export function UTMCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    // Bail out if storage is unavailable (e.g. private browsing blocks it)
    try {
      if (localStorage.getItem(STORAGE_KEY) !== null) {
        // First-touch already recorded — do not overwrite
        return;
      }
    } catch {
      return;
    }

    // Collect whichever UTM params are present in the current URL
    const utmValues: Partial<Record<UtmParam, string>> = {};
    for (const param of UTM_PARAMS) {
      const value = searchParams.get(param);
      if (value) utmValues[param] = value;
    }

    // Always record first-touch — including the landing path and referrer — even
    // when there are no UTM params. Organic-search and AI-referral visitors arrive
    // without UTMs; bailing here previously left that (primary) cohort unattributed.

    // Derive referrer domain (empty string when there is no referrer)
    let referrerDomain = '';
    try {
      if (document.referrer) {
        referrerDomain = new URL(document.referrer).hostname;
      }
    } catch {
      // Malformed referrer — leave empty
    }

    const payload: FirstTouchUTM = {
      ...utmValues,
      landing_path: pathname,
      referrer_domain: referrerDomain,
      captured_at: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage quota exceeded or blocked — ignore
    }
  }, [searchParams, pathname]);

  return null;
}
