/**
 * Install-target resolution for the Ledgerium browser extension.
 *
 * Single source of truth for HOW a visitor installs the extension:
 *   - `web_store`      — the extension is live on the Chrome Web Store
 *                        (one-click "Add to Chrome"). Activates automatically
 *                        the moment `EXTENSION_CONFIG.chromeStoreUrl` is set to a
 *                        real listing URL (i.e. no longer contains "placeholder").
 *   - `direct_download` — current state: download the signed zip and sideload
 *                        via Chrome Developer Mode.
 *
 * Kept as a pure module (no React, no window) so the decision + the analytics
 * payload are deterministically unit-testable in the node test environment.
 * P0-2 / P0-3, SITE_STATE_REVIEW_002 (2026-07-07).
 */

import { EXTENSION_CONFIG } from './config';

export type InstallMethod = 'web_store' | 'direct_download';

export interface InstallTarget {
  method: InstallMethod;
  /** anchor href */
  href: string;
  /** value for the anchor `download` attribute, or null for an external store link */
  download: string | null;
  /** whether the link opens externally (new tab) — true only for the store link */
  external: boolean;
  /** label the button renders when the store path is active */
  storeLabel: string;
}

/** Marker embedded in the placeholder store URL until a real listing exists. */
const PLACEHOLDER_MARKER = 'placeholder';

const DIRECT_DOWNLOAD_FILENAME = 'ledgerium-recorder-chrome-extension.zip';

const STORE_LABEL = 'Add to Chrome — Free';

/**
 * True once the extension is published to the Chrome Web Store — i.e. the
 * configured store URL is non-empty and no longer the placeholder.
 */
export function isChromeStorePublished(
  storeUrl: string = EXTENSION_CONFIG.chromeStoreUrl,
): boolean {
  return storeUrl.trim().length > 0 && !storeUrl.includes(PLACEHOLDER_MARKER);
}

/** Convenience constant for render-time gating of sideload-only instructions. */
export const IS_CHROME_STORE_PUBLISHED = isChromeStorePublished();

/**
 * Resolve the active install target from config. Returns the Web Store link
 * once published, otherwise the direct-download sideload target.
 */
export function resolveInstallTarget(
  config: { chromeStoreUrl: string; directDownloadUrl: string } = EXTENSION_CONFIG,
): InstallTarget {
  if (isChromeStorePublished(config.chromeStoreUrl)) {
    return {
      method: 'web_store',
      href: config.chromeStoreUrl,
      download: null,
      external: true,
      storeLabel: STORE_LABEL,
    };
  }
  return {
    method: 'direct_download',
    href: config.directDownloadUrl,
    download: DIRECT_DOWNLOAD_FILENAME,
    external: false,
    storeLabel: STORE_LABEL,
  };
}

/**
 * Deterministic analytics payload for an install-button click. Kept pure so the
 * exact shape is asserted in tests independently of the React wrapper.
 */
export function installClickEvent(
  method: InstallMethod,
  location: string,
): { event: 'extension_install_clicked'; method: InstallMethod; location: string } {
  return { event: 'extension_install_clicked', method, location };
}
