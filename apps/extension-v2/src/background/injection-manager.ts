/**
 * Injection Manager — Programmatic content script injection for zero-refresh recording.
 *
 * v1 relied on manifest-declared content_scripts, which meant the content script
 * was only injected when a tab loaded AFTER the extension installed. Tabs that were
 * already open required a manual refresh.
 *
 * v2 uses chrome.scripting.executeScript() to programmatically inject the capture
 * engine into any tab on demand — no refresh needed. This also enables:
 * - Injection only when recording starts (not on every page load)
 * - Re-injection on tab navigation during recording
 * - Idempotent injection (safe to inject multiple times)
 * - Frame-aware injection (all_frames support)
 */

// Track which tabs have been injected in the current recording session
const injectedTabs = new Set<number>();

/**
 * Inject the content script into a specific tab.
 * Safe to call multiple times — the content script has an idempotency guard.
 */
export async function injectIntoTab(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['src/content/index.ts'],
    });
    injectedTabs.add(tabId);
    console.log(`[injection] Injected into tab ${tabId}`);
    return true;
  } catch (err) {
    // Common: chrome:// pages, devtools, web store — can't inject there
    const msg = String(err);
    if (msg.includes('Cannot access') || msg.includes('chrome://') || msg.includes('chrome-extension://')) {
      console.debug(`[injection] Skipped restricted tab ${tabId}: ${msg}`);
    } else {
      console.warn(`[injection] Failed to inject into tab ${tabId}:`, err);
    }
    return false;
  }
}

/**
 * Inject the content script into ALL open tabs.
 * Called when recording starts to ensure every existing tab captures events.
 */
export async function injectIntoAllTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const results = await Promise.allSettled(
    tabs
      .filter((tab) => tab.id != null && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
      .map((tab) => injectIntoTab(tab.id!)),
  );

  const injected = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  const skipped = results.length - injected;
  console.log(`[injection] Injected into ${injected} tabs, skipped ${skipped}`);
}

/**
 * Inject into a tab that just finished loading (onUpdated listener).
 * Only injects during an active recording session.
 */
export async function injectOnTabLoad(tabId: number, url: string | undefined): Promise<void> {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;
  await injectIntoTab(tabId);
}

/**
 * Inject into a tab the user just switched to (onActivated listener).
 * Ensures tabs that existed before recording started get injected when first visited.
 */
export async function injectOnTabActivated(tabId: number): Promise<void> {
  if (injectedTabs.has(tabId)) return; // Already injected
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
  await injectIntoTab(tabId);
}

/**
 * Clear the injection tracking state.
 * Called when recording stops or is discarded.
 */
export function clearInjectionState(): void {
  injectedTabs.clear();
  console.log('[injection] Cleared injection state');
}

/**
 * Check if a tab has been injected in the current session.
 */
export function isTabInjected(tabId: number): boolean {
  return injectedTabs.has(tabId);
}
