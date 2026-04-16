/**
 * Ledgerium AI — Server-side PostHog module
 *
 * Wraps the posthog-node SDK with lazy initialization and safe no-op behavior
 * when POSTHOG_API_KEY is not configured.
 *
 * Safe to import in server-only contexts — no window references.
 */

import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  client = new PostHog(apiKey, { host });
  return client;
}

/**
 * Captures a server-side event in PostHog.
 * No-ops silently if POSTHOG_API_KEY is not set.
 * Never throws.
 */
export function captureServerEvent(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): void {
  try {
    const posthog = getClient();
    if (!posthog) return;
    posthog.capture({ distinctId, event, properties });
  } catch (err) {
    console.error('[posthog:server] capture failed:', err);
  }
}

/**
 * Flushes and shuts down the PostHog client.
 * Call during graceful process shutdown to ensure queued events are flushed.
 */
export async function shutdownPostHog(): Promise<void> {
  if (client) {
    await client.shutdown();
  }
}
