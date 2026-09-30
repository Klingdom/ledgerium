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
