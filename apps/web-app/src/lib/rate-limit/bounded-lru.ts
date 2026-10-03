/**
 * Fixed-capacity LRU map (row #299). O(1) get/set/evict, hard entry ceiling.
 *
 * Built on Map's insertion order: `touch` deletes and re-inserts a key so the
 * most recently used key is last; at capacity the FIRST key (least recently
 * used) is evicted with one `keys().next()`. No operation iterates the map, so
 * per-request cost does not grow with the number of keys (the retired pattern
 * scanned every key on every request: quadratic under a distinct-key flood).
 *
 * Keys longer than MAX_KEY_LENGTH are truncated: the caller's key can be an
 * attacker-supplied header value (X-Forwarded-For entry, up to the header size
 * limit), and an uncapped key makes memory = capacity x header size. 64 covers
 * the longest textual IPv6 address (45). Truncation can only merge junk keys
 * (over-throttle them); real addresses are never touched.
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

export class BoundedLru<V> {
  private readonly map = new Map<string, V>();

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('capacity must be a positive integer');
  }

  static normalizeKey(key: string): string {
    return key.length > MAX_KEY_LENGTH ? key.slice(0, MAX_KEY_LENGTH) : key;
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
    this.map.set(k, v);
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
    this.map.set(k, value);
  }

  clear(): void {
    this.map.clear();
  }

  /** Test-only: keys from least to most recently used. */
  keysOldestFirst(): string[] {
    return [...this.map.keys()];
  }
}
