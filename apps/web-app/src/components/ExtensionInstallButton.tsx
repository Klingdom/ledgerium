'use client';

/**
 * ExtensionInstallButton — the tracked entry point to the extension install
 * funnel step (signup → install). Every install CTA on the site routes through
 * this component so the click is instrumented (`extension_install_clicked`) and
 * so the Web Store path activates automatically on publish.
 *
 * - Fires `extension_install_clicked { method, location }` before navigating.
 * - Renders the caller-provided children (icon + label) while the extension
 *   ships via direct download, so existing button styling is preserved.
 * - When the Chrome Web Store listing goes live (config flip), it swaps to a
 *   one-click "Add to Chrome" store link with `target=_blank` and no download
 *   attribute — no dead link in the interim.
 *
 * P0-2 / P0-3, SITE_STATE_REVIEW_002 (2026-07-07).
 */

import { Chrome } from 'lucide-react';
import { track } from '@/lib/analytics';
import { resolveInstallTarget, installClickEvent } from '@/lib/install';

interface ExtensionInstallButtonProps {
  /** Funnel-position label recorded on the analytics event (e.g. 'install_page_hero'). */
  location: string;
  className?: string;
  title?: string;
  /** Rendered as the button content while the direct-download path is active. */
  children: React.ReactNode;
}

export function ExtensionInstallButton({
  location,
  className,
  title,
  children,
}: ExtensionInstallButtonProps) {
  const target = resolveInstallTarget();

  function handleClick() {
    try {
      track(installClickEvent(target.method, location));
    } catch {
      // Analytics must never block the install navigation.
    }
  }

  return (
    <a
      href={target.href}
      onClick={handleClick}
      className={className}
      {...(title ? { title } : {})}
      {...(target.download ? { download: target.download } : {})}
      {...(target.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {target.method === 'web_store' ? (
        <>
          <Chrome className="h-5 w-5" aria-hidden="true" />
          {target.storeLabel}
        </>
      ) : (
        children
      )}
    </a>
  );
}
