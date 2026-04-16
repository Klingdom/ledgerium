/**
 * Extension telemetry — opt-in recording lifecycle analytics.
 *
 * Sends lightweight events to the web app's analytics endpoint.
 * Only fires when telemetryEnabled is true in settings.
 * Never sends workflow content — only behavioral signals.
 */

interface TelemetryEvent {
  event: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

let pendingEvents: TelemetryEvent[] = [];

/**
 * Queue a telemetry event. Events are batched and sent on flush.
 */
export function trackExtension(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  pendingEvents.push({
    event,
    timestamp: new Date().toISOString(),
    properties,
  });
}

/**
 * Flush queued events to the web app analytics endpoint.
 * Call this after recording stops (piggyback on the upload flow).
 * No-ops if telemetry is disabled or no upload URL is configured.
 */
export async function flushTelemetry(
  uploadUrl: string,
  apiKey: string,
  telemetryEnabled: boolean,
): Promise<void> {
  if (!telemetryEnabled || !uploadUrl || pendingEvents.length === 0) {
    pendingEvents = [];
    return;
  }

  const events = [...pendingEvents];
  pendingEvents = [];

  // Derive the analytics endpoint from the upload URL
  // e.g. https://ledgerium.ai/api/sync → https://ledgerium.ai/api/analytics/events
  let analyticsUrl: string;
  try {
    const base = new URL(uploadUrl);
    base.pathname = '/api/analytics/events';
    analyticsUrl = base.toString();
  } catch {
    return;
  }

  // Format events for the analytics endpoint (matches the web app's POST /api/analytics/events format)
  const payload = {
    events: events.map(e => ({
      event: e.event,
      timestamp: e.timestamp,
      source: 'extension',
      ...e.properties,
    })),
  };

  try {
    await fetch(analyticsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Telemetry is best-effort — never block the user
  }
}
