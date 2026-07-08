/**
 * install.ts — install-target resolution + click-event unit tests.
 *
 * Environment: Vitest (node) — pure logic, no rendering (matches web-app
 * test convention). P0-2 / P0-3, SITE_STATE_REVIEW_002 (2026-07-07).
 */

import { describe, it, expect } from 'vitest';
import {
  isChromeStorePublished,
  resolveInstallTarget,
  installClickEvent,
} from './install';

const PLACEHOLDER_URL =
  'https://chrome.google.com/webstore/detail/ledgerium-ai/placeholder';
const REAL_STORE_URL =
  'https://chromewebstore.google.com/detail/ledgerium-ai/abcdefghijklmnopqrstuvwxyz123456';
const DIRECT_URL = '/ledgerium-recorder-chrome-extension.zip';

describe('isChromeStorePublished', () => {
  it('returns false for the placeholder store URL', () => {
    expect(isChromeStorePublished(PLACEHOLDER_URL)).toBe(false);
  });

  it('returns false for an empty / whitespace URL', () => {
    expect(isChromeStorePublished('')).toBe(false);
    expect(isChromeStorePublished('   ')).toBe(false);
  });

  it('returns true for a real store listing URL', () => {
    expect(isChromeStorePublished(REAL_STORE_URL)).toBe(true);
  });
});

describe('resolveInstallTarget', () => {
  it('resolves to direct_download while unpublished (placeholder)', () => {
    const t = resolveInstallTarget({
      chromeStoreUrl: PLACEHOLDER_URL,
      directDownloadUrl: DIRECT_URL,
    });
    expect(t.method).toBe('direct_download');
    expect(t.href).toBe(DIRECT_URL);
    expect(t.download).toBe('ledgerium-recorder-chrome-extension.zip');
    expect(t.external).toBe(false);
  });

  it('resolves to web_store once published, with external link and no download attr', () => {
    const t = resolveInstallTarget({
      chromeStoreUrl: REAL_STORE_URL,
      directDownloadUrl: DIRECT_URL,
    });
    expect(t.method).toBe('web_store');
    expect(t.href).toBe(REAL_STORE_URL);
    expect(t.download).toBeNull();
    expect(t.external).toBe(true);
    expect(t.storeLabel).toBe('Add to Chrome — Free');
  });

  it('is deterministic — same config yields identical targets', () => {
    const cfg = { chromeStoreUrl: REAL_STORE_URL, directDownloadUrl: DIRECT_URL };
    expect(resolveInstallTarget(cfg)).toEqual(resolveInstallTarget(cfg));
  });
});

describe('installClickEvent', () => {
  it('builds the exact extension_install_clicked payload (direct_download)', () => {
    expect(installClickEvent('direct_download', 'install_page_hero')).toEqual({
      event: 'extension_install_clicked',
      method: 'direct_download',
      location: 'install_page_hero',
    });
  });

  it('builds the exact extension_install_clicked payload (web_store)', () => {
    expect(installClickEvent('web_store', 'app_nav')).toEqual({
      event: 'extension_install_clicked',
      method: 'web_store',
      location: 'app_nav',
    });
  });
});
