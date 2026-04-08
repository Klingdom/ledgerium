/**
 * Injection Manager v2 — Hybrid content script management.
 *
 * Architecture:
 * - Content scripts are declared in manifest.json, so CRXJS bundles them
 *   and Chrome auto-injects them on new page loads.
 * - For ALREADY-OPEN tabs (the zero-refresh problem), we use
 *   chrome.scripting.executeScript() with the CRXJS-built file path.
 * - The content script has an idempotency guard, so double-injection is safe.
 *
 * The key fix from v2.0.0: We resolve the content script's BUILT path
 * from the manifest instead of hard-coding a source path that doesn't
 * exist after Vite builds.
 */

// Track which tabs have been confirmed as having the content script
const confirmedTabs = new Set<number>();

/**
 * Get the built content script path from the extension's own manifest.
 * CRXJS transforms "src/content/index.ts" into the actual bundle path.
 */
function getContentScriptPath(): string | null {
  try {
    const manifest = chrome.runtime.getManifest();
    const cs = manifest.content_scripts?.[0];
    if (cs?.js?.[0]) return cs.js[0];
  } catch {
    // Manifest read failed
  }
  return null;
}

/**
 * Try to programmatically inject the content script into a tab.
 * Uses the CRXJS-resolved path from the manifest, not a hardcoded source path.
 */
export async function injectIntoTab(tabId: number): Promise<boolean> {
  const scriptPath = getContentScriptPath();
  if (!scriptPath) {
    console.warn('[injection] Could not resolve content script path from manifest');
    return false;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: [scriptPath],
    });
    confirmedTabs.add(tabId);
    console.log(`[injection] Programmatically injected into tab ${tabId} (${scriptPath})`);
    return true;
  } catch (err) {
    const msg = String(err);
    if (msg.includes('Cannot access') || msg.includes('chrome://') || msg.includes('chrome-extension://')) {
      console.debug(`[injection] Skipped restricted tab ${tabId}`);
    } else {
      console.warn(`[injection] Failed to inject into tab ${tabId}:`, msg);
    }
    return false;
  }
}

/**
 * Ensure content scripts are present on all open tabs.
 * For tabs loaded AFTER extension install, manifest injection handles it.
 * For tabs loaded BEFORE, we inject programmatically.
 *
 * We also send a ping to detect which tabs already have the script,
 * and only inject into those that don't respond.
 */
export async function ensureAllTabsInjected(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const eligible = tabs.filter(
    (tab) => tab.id != null && tab.url &&
      !tab.url.startsWith('chrome://') &&
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('about:'),
  );

  let injected = 0;
  let alreadyPresent = 0;
  let skipped = 0;

  for (const tab of eligible) {
    const tabId = tab.id!;

    // First, try sending a message to see if content script is already there
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING', payload: {} });
      // If no error, content script is present
      confirmedTabs.add(tabId);
      alreadyPresent++;
      continue;
    } catch {
      // Content script not present — need to inject
    }

    // Programmatic injection for tabs that don't have the script
    const success = await injectIntoTab(tabId);
    if (success) injected++;
    else skipped++;
  }

  console.log(`[injection] Tabs: ${alreadyPresent} already present, ${injected} newly injected, ${skipped} skipped`);
}

/**
 * Handle tab load during recording — content script may already be
 * there from manifest injection, but send START_SESSION to be sure.
 */
export async function onTabLoadDuringRecording(tabId: number, url: string | undefined): Promise<void> {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;
  // Manifest injection should handle new loads, but mark as confirmed
  confirmedTabs.add(tabId);
}

/**
 * Handle tab activation during recording — inject if needed.
 */
export async function onTabActivatedDuringRecording(tabId: number): Promise<void> {
  if (confirmedTabs.has(tabId)) return;

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  // Try messaging first (maybe manifest already injected)
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING', payload: {} });
    confirmedTabs.add(tabId);
    return;
  } catch {
    // Not present, inject
  }

  await injectIntoTab(tabId);
}

/**
 * Clear tracking state between sessions.
 */
export function clearInjectionState(): void {
  confirmedTabs.clear();
  console.log('[injection] Cleared injection state');
}

export function isTabConfirmed(tabId: number): boolean {
  return confirmedTabs.has(tabId);
}
