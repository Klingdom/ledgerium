/**
 * Fixed-capacity LRU map (row #299). O(1) get/set/evict, hard entry ceiling.
 *
 * Built on Map's insertion order: `touch` deletes and re-inserts a key so the
 * most recently used key is last; at capacity the FIRST key (least recently
 * used) is evicted with one `keys().next()`. No operation iterates the map, so
 * per-request cost does not grow with the number of keys (the retired pattern
 * scanned every key on every request: quadratic under a distinct-key flood).
 *
 * KEY MEMORY (row #361). The caller's key can be an attacker-supplied header
 * value (X-Forwarded-For entry, up to the header size limit). Truncating with
 * `key.slice(0, 64)` does NOT bound memory: in V8 a substring of 13+ chars is a
 * SlicedString that retains its whole parent, and getClientIp's split/trim hands
 * us exactly such substrings of the raw header. Measured (node, heap after gc,
 * 20,000 distinct keys): 12 KB entries sliced to 64 chars = 231 MB; 40-char
 * entries inside a 12 KB header = 232 MB (short keys leak too); flat copies =
 * 2.0-2.4 MB. Two rules, applied here so every limiter inherits them:
 *   1. A key longer than MAX_KEY_LENGTH (64 covers the longest textual IPv6
 *      address, 45) is not an address: it maps to ONE shared OVERLONG_KEY bucket.
 *      Junk is over-throttled together (as this module already accepted for
 *      truncation) and costs no per-key memory.
 *   2. A key that is stored is first copied into a flat string, so it cannot pin
 *      the header it was cut from (Array.from().join() allocates a new
 *      sequential string).
 * Real addresses are never touched by rule 1.
 *
 * TRADE-OFF (inherent, not fixable here): once more than `capacity` distinct
 * keys are live, the least recently used key is forgotten, so an evicted key
 * starts a fresh window. Under a spoofed-IP flood an honest client can
 * therefore get its counter reset. The flood must itself rotate > capacity
 * distinct keys inside one window to cause that, and spoofing is what row #225
 * (TRUSTED_PROXY_HOPS) closes. Memory safety is bought with this bounded
 * reset, which the unbounded Map did not have (it traded it for OOM).
 */
export const MAX_KEY_LENGTH = 64;

/** Shared bucket for every key longer than MAX_KEY_LENGTH. */
export const OVERLONG_KEY = '__overlong__';

/** Fresh flat copy so a stored key cannot retain a parent string (V8 sliced strings). */
function flatCopy(key: string): string {
  return key === OVERLONG_KEY ? key : Array.from(key).join('');
}

export class BoundedLru<V> {
  private readonly map = new Map<string, V>();

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('capacity must be a positive integer');
  }

  static normalizeKey(key: string): string {
    return key.length > MAX_KEY_LENGTH ? OVERLONG_KEY : key;
  }

  get size(): number {
    return this.map.size;
  }

  /** Read without changing recency. */
  peek(key: string): V | undefined {
    return this.map.get(BoundedLru.normalizeKey(key));
  }

  /** Read and mark most-recently-used. */
  touch(key: string): V | undefined {
    const k = BoundedLru.normalizeKey(key);
    const v = this.map.get(k);
    if (v === undefined) return undefined;
    this.map.delete(k);
    this.map.set(flatCopy(k), v); // re-insert a flat copy: k may be a slice of a header
    return v;
  }

  /** Insert or replace as most-recently-used; evicts the LRU key when full. */
  set(key: string, value: V): void {
    const k = BoundedLru.normalizeKey(key);
    if (this.map.has(k)) {
      this.map.delete(k);
    } else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next();
      if (!oldest.done) this.map.delete(oldest.value);
    }
    this.map.set(flatCopy(k), value);
  }

  clear(): void {
    this.map.clear();
  }

  /** Test-only: keys from least to most recently used. */
  keysOldestFirst(): string[] {
    return [...this.map.keys()];
  }
}
