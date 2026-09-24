import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { hashKey } from '@/lib/api-keys';
import { trackServer } from '@/lib/analytics-server';
import { checkExtensionTelemetryRateLimit } from '@/lib/rate-limit/extension-telemetry-buckets';
import { getClientIp } from '@/lib/client-ip';

/**
 * POST /api/analytics/extension — ADMIN-P02 (backlog row #148)
 *
 * PUBLIC ingest route for the three Chrome-extension telemetry events. This
 * endpoint is deliberately unauthenticated: `extension_installed` must fire
 * on first run, before the user has ever signed in to the web app, and the
 * daily `extension_session_active` ping does not require a signed-in user
 * either. Answers the CEO question "how many extension installs do we
 * have?" — the Chrome Web Store exposes no public install-count API.
 *
 * Emitted by apps/extension-app/src/background/telemetry.ts.
 *
 * Metric derivations this route enables (see IMPROVEMENT_BACKLOG.md #148):
 *   - Extension downloads (30d):       COUNT WHERE event_name = 'extension_installed' AND installType = 'install'
 *   - Extension active users (DAU):    COUNT(DISTINCT installId) WHERE event_name = 'extension_session_active' AND created_at >= now() - 1d
 *   - Install -> sign-in conversion:   COUNT(extension_signin_linked) / COUNT(extension_installed) over 30d
 *
 * NAMING NOTE: the source backlog row is internally inconsistent — its prose
 * calls the daily-ping event `extension_active`, but its own metric formula
 * (quoted above) references `extension_session_active`. This route (and the
 * emitting extension code) use `extension_session_active` everywhere,
 * matching the row's own formula.
 *
 * Security posture:
 *   - Zod discriminated union, every variant `.strict()` — unknown event
 *     names and any extra/unexpected field are both rejected with 400.
 *   - `extensionVersion` validated against Chrome's own version-string shape
 *     (1-4 dot-separated non-negative integers).
 *   - Per-IP rate limiting (defense-in-depth; see extension-telemetry-buckets.ts).
 *   - `extension_signin_linked` carries a raw apiKey over the wire (HTTPS),
 *     never a userId — the extension has no way to learn its own userId.
 *     This route resolves apiKey -> userId via the same SHA-256
 *     hash-and-lookup apps/web-app/src/app/api/sync/route.ts already
 *     performs for the exact same credential, and persists only the
 *     resolved userId (never the raw key) via trackServer(). An unknown/
 *     invalid key is treated as a silent no-op — the response is
 *     indistinguishable from success either way, so this endpoint cannot be
 *     used as an apiKey-validity oracle.
 *
 * Response shape: { data, error } (no `meta` — this route has none to report).
 */

const EXTENSION_VERSION_RE = /^\d+(\.\d+){0,3}$/;

const extensionVersionSchema = z
  .string()
  .max(32)
  .regex(EXTENSION_VERSION_RE, 'extensionVersion must look like a Chrome extension version (e.g. "2.0.0")');

const installIdSchema = z.string().uuid('installId must be a UUID');

const installedEventSchema = z
  .object({
    event: z.literal('extension_installed'),
    installType: z.enum(['install', 'update', 'chrome_update', 'shared_module_update']),
    extensionVersion: extensionVersionSchema,
    browser: z.enum(['chrome', 'edge', 'other']),
  })
  .strict();

const sessionActiveEventSchema = z
  .object({
    event: z.literal('extension_session_active'),
    extensionVersion: extensionVersionSchema,
    installId: installIdSchema,
  })
  .strict();

const signinLinkedEventSchema = z
  .object({
    event: z.literal('extension_signin_linked'),
    installId: installIdSchema,
    // Ledgerium API keys are `ldg_` + 40 hex chars (see lib/api-keys.ts) — cap
    // generously above that to tolerate future format changes without being
    // a meaningful DoS/memory vector.
    apiKey: z.string().min(1).max(256),
  })
  .strict();

const extensionEventSchema = z.discriminatedUnion('event', [
  installedEventSchema,
  sessionActiveEventSchema,
  signinLinkedEventSchema,
]);

export type ExtensionTelemetryEvent = z.infer<typeof extensionEventSchema>;

export async function POST(req: NextRequest) {
  // ── Rate limit (defense-in-depth; see doc comment above) ──────────────────
  const ip = getClientIp(req);
  const nowMs = Date.now();
  const rl = checkExtensionTelemetryRateLimit(ip, nowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: 'Too many requests', retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  // ── Parse + validate body ──────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ data: null, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = extensionEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(', ')}` },
      { status: 400 },
    );
  }

  const event = parsed.data;

  // ── Record (never throw — a telemetry write failure must not surface as a
  //    500 the extension would treat as "endpoint down") ─────────────────────
  try {
    await recordExtensionEvent(event);
  } catch (err) {
    console.error('[analytics/extension/POST]', err);
  }

  return NextResponse.json({ data: { received: true }, error: null });
}

async function recordExtensionEvent(event: ExtensionTelemetryEvent): Promise<void> {
  switch (event.event) {
    case 'extension_installed':
      trackServer('extension_installed', {
        installType: event.installType,
        extensionVersion: event.extensionVersion,
        browser: event.browser,
      });
      return;

    case 'extension_session_active':
      trackServer('extension_session_active', {
        extensionVersion: event.extensionVersion,
        installId: event.installId,
      });
      return;

    case 'extension_signin_linked': {
      const keyHash = hashKey(event.apiKey);
      const apiKeyRecord = await db.apiKey.findUnique({
        where: { keyHash },
        select: { userId: true },
      });
      // Unknown/invalid key: silent no-op, not an error — see security note
      // in the route doc comment (must not act as a key-validity oracle).
      if (!apiKeyRecord) return;

      trackServer('extension_signin_linked', {
        userId: apiKeyRecord.userId,
        installId: event.installId,
      });
      return;
    }
  }
}
