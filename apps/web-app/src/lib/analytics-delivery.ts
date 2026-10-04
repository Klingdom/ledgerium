/**
 * When and how buffered analytics events leave the browser — row #241.
 *
 * ## The defect
 *
 * Events buffer client-side and are POSTed once ten have accumulated. Anything
 * below that threshold relied on a `beforeunload` handler firing a
 * `sendBeacon`.
 *
 * `beforeunload` is unreliable by design on mobile. iOS Safari and Chrome on
 * Android routinely discard a page without firing it; the platform guidance is
 * that `visibilitychange` → `hidden` is the last event a page is guaranteed to
 * see. A typical dashboard visit produces two or three events, so an unknown
 * share of short sessions was being dropped entirely.
 *
 * **And short sessions are not a random sample.** They correlate with bouncing,
 * which is precisely the behaviour the funnel exists to measure. The loss was
 * therefore biased, and biased in the flattering direction — the second such
 * gap found in a fortnight, after row #238.
 *
 * ## The part that is easy to get wrong
 *
 * The old `beforeunload` handler read the buffer **without clearing it**. That
 * was survivable only because the page was usually being destroyed a moment
 * later. It is not survivable once `visibilitychange` is added: that fires on
 * every tab switch, every app switch, every screen lock — so without draining,
 * a user who alt-tabs five times would send the same events six times, and the
 * numbers would be inflated rather than lost.
 *
 * Swapping an undercount for an overcount is not a fix. Hence `drain`, and
 * hence this module existing at all: the delivery *rule* is the thing that can
 * be wrong, and it can be tested here without a browser.
 */

/** Events are POSTed once this many have accumulated. */
export const FLUSH_THRESHOLD = 10;

/**
 * Most events one POST may carry. Row #251 (4): the ingest route used to cap at
 * a private 100 while the client buffered up to 500 and sent everything in one
 * request, so up to 400 events were truncated server-side after the client had
 * already drained them: destroyed, not deferred. Both sides now import this
 * constant, and the client splits any larger buffer into requests of at most
 * this size. Size budget: an enriched event is roughly 0.3-0.8 KB of JSON, so
 * 100 events is about 30-80 KB, well under the 256 KiB body cap
 * (ANALYTICS_MAX_BODY_BYTES) on the server.
 */
export const ANALYTICS_MAX_EVENTS_PER_REQUEST = 100;

/** Split events into consecutive chunks of at most `size`, preserving order. */
export function chunkEvents<T>(events: readonly T[], size: number = ANALYTICS_MAX_EVENTS_PER_REQUEST): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < events.length; i += size) chunks.push(events.slice(i, i + size));
  return chunks;
}

/**
 * Most bytes one delivery request may carry. Row #251 (5): `sendBeacon` and
 * keepalive `fetch` share an in-flight quota of about 64 KB per page, and a
 * 100-event chunk can reach about 80 KB. A request over the quota is refused
 * outright, so chunks are also bounded by size. 48 KB leaves headroom for the
 * envelope and for the small preferences flush that precedes the bounce.
 */
export const ANALYTICS_MAX_REQUEST_BYTES = 48 * 1024;

/** Client buffer cap; the oldest events beyond it are dropped (row #251 (4)). */
export const ANALYTICS_BUFFER_CAP = 500;

const ENVELOPE_BYTES = '{"events":[]}'.length;

function jsonBytes(value: unknown): number {
  const json = JSON.stringify(value);
  return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json).length : json.length;
}

/**
 * Split events into ordered chunks bounded by BOTH count and serialized size.
 * A single event larger than `maxBytes` still goes out, alone (it cannot be
 * split, and dropping it would be worse than a refusal).
 */
export function chunkEventsBySize<T>(
  events: readonly T[],
  maxEvents: number = ANALYTICS_MAX_EVENTS_PER_REQUEST,
  maxBytes: number = ANALYTICS_MAX_REQUEST_BYTES,
): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let bytes = ENVELOPE_BYTES;
  for (const e of events) {
    const size = jsonBytes(e) + 1; // +1 for the separating comma
    if (current.length > 0 && (current.length >= maxEvents || bytes + size > maxBytes)) {
      chunks.push(current);
      current = [];
      bytes = ENVELOPE_BYTES;
    }
    current.push(e);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/**
 * Plan a delivery. Row #251 (5): when the last event is terminal (the page is
 * going away) it is sent FIRST and ALONE, so it cannot be the casualty of the
 * shared in-flight quota or sit in a chunk that is refused; the rest follow in
 * order, size-bounded.
 */
export function planDelivery<T>(events: readonly T[], terminalLast: boolean): T[][] {
  if (events.length === 0) return [];
  if (!terminalLast) return chunkEventsBySize(events);
  const terminal = events[events.length - 1] as T;
  return [[terminal], ...chunkEventsBySize(events.slice(0, -1))];
}

/**
 * Put events from a failed non-terminal request back at the FRONT of the buffer
 * (they are older than anything buffered since), at most once per event: an
 * event already in `retried` is dropped, so a persistently failing endpoint
 * cannot loop forever. The buffer stays within `cap` (oldest dropped).
 * Returns how many events were requeued.
 */
export function requeueFailed<T extends object>(
  buffer: T[],
  failed: readonly T[],
  retried: WeakSet<object>,
  cap: number = ANALYTICS_BUFFER_CAP,
): number {
  const again = failed.filter((e) => !retried.has(e));
  again.forEach((e) => retried.add(e));
  buffer.unshift(...again);
  if (buffer.length > cap) buffer.splice(0, buffer.length - cap);
  return again.length;
}

/** Debounce on the batch flush, so a burst of events costs one request. */
export const FLUSH_DEBOUNCE_MS = 2000;

/** Why a delivery is happening. Recorded for diagnosis, not branched on. */
export type DeliveryTrigger = 'batch-full' | 'page-hidden' | 'page-unload';

/**
 * Remove every event from the buffer and return it.
 *
 * Mutates in place, because the buffer is a shared array hanging off `window`
 * that other code holds a reference to — replacing it would leave stale
 * references writing into an orphan.
 *
 * Returning the events and emptying the buffer in one step is the whole point:
 * a caller cannot read-then-forget-to-clear, which is exactly what the old
 * unload path did.
 */
export function drain<T>(buffer: T[]): T[] {
  return buffer.splice(0, buffer.length);
}

/** Should a debounced flush be scheduled at this buffer size? */
export function shouldScheduleFlush(bufferLength: number): boolean {
  return bufferLength >= FLUSH_THRESHOLD;
}

/**
 * Should a page-lifecycle event deliver right now?
 *
 * `visibilitychange` fires on becoming visible as well as hidden, and
 * delivering on the way back in would send an empty payload at best and
 * duplicate at worst.
 */
export function shouldDeliverOnVisibility(visibilityState: string): boolean {
  return visibilityState === 'hidden';
}
