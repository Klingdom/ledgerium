// sync-failure.ts — classifies a non-OK sync/upload response so the UI can
// tell a quota refusal apart from every other failure, and never guesses.
//
// The server answers a monthly-limit refusal with 403 + code
// 'UPGRADE_REQUIRED' (apps/web-app/src/app/api/sync/route.ts). Before this
// module existed, both the manual "Open in Ledgerium AI Website" upload path
// (sidepanel/screens/ProcessScreen.tsx) and the automatic upload path that
// runs at the end of every recording (background/uploader.ts, invoked from
// background/index.ts) treated every non-401 failure identically, which told
// a user at their plan limit to retry something that could not succeed.
//
// A 403 WITHOUT that code is deliberately NOT treated as quota: guessing
// would show limit messaging for an unrelated permission failure.
//
// This lives under src/shared/ (not src/sidepanel/) because
// background/uploader.ts must import it, and the background must not import
// from the sidepanel tree. src/sidepanel/screens/ProcessScreen.tsx re-exports
// these symbols so existing imports keep working unchanged.

export type SyncFailure =
  | { kind: 'auth' }
  | { kind: 'quota'; used: number | null; limit: number | null }
  | { kind: 'error' }

function asCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

export function classifySyncFailure(status: number, body: unknown): SyncFailure {
  if (status === 401) return { kind: 'auth' }
  if (status === 403 && body !== null && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if (b['code'] === 'UPGRADE_REQUIRED') {
      return { kind: 'quota', used: asCount(b['used']), limit: asCount(b['limit']) }
    }
  }
  return { kind: 'error' }
}

export interface QuotaNotice {
  title: string
  body: string
  cta: string
}

/**
 * Copy for a quota refusal. Every clause is checked against behaviour:
 *  - the session is written to history at stop, before any upload is attempted
 *    (background/index.ts handleStop → historyStore.addEntry), so it is kept;
 *  - the server counts uploads per UTC calendar month (feature-gating.ts
 *    getMonthlyUploadCount), so uploads resume on the 1st (UTC);
 *  - Solo is the lowest self-serve tier with no monthly cap (web-app plans.ts;
 *    asserted by apps/web-app/src/lib/quota-meter.test.ts).
 */
export function quotaNotice(used: number | null, limit: number | null): QuotaNotice {
  const counts = used !== null && limit !== null ? ` (${used} of ${limit})` : ''
  return {
    title: `Monthly upload limit reached${counts}`,
    // "Recent Recordings" is the on-screen label of the history list
    // (IdleScreen.tsx) — name what the user can actually find.
    body: 'This recording is kept in Recent Recordings. Uploads resume on the 1st (UTC), or Solo removes the monthly cap.',
    cta: 'See plans',
  }
}
