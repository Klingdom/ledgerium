/**
 * The shared-request cache behind `useAccount` — row #189.
 *
 * ## Why this is a module rather than closure state inside the hook
 *
 * It was closure state, and it was untested, because `apps/web-app` runs vitest
 * with `environment: 'node'` and has no React renderer: 181 test files, zero of
 * them rendering a component. Testing the hook directly would have meant adding
 * `@testing-library/react` and a jsdom environment — a real dependency decision
 * that should be taken on its own merits, not smuggled in as a side effect of a
 * performance fix.
 *
 * The alternative — restating this logic in a test helper and asserting against
 * the restatement — is the pattern this codebase already has cause to distrust:
 * a mirror drifts from the thing it mirrors, and the copy nobody updated keeps
 * reporting success.
 *
 * So the logic that can actually be wrong lives here, in plain functions the
 * hook imports and the tests exercise directly. What remains in the hook is
 * `useState`/`useEffect` glue that TypeScript can check.
 *
 * ## What the caching is for
 *
 * Two distinct jobs, deliberately kept apart:
 *
 * - **In-flight dedup** is the actual subject of row #189. `TrialStatusChip`
 *   (in `AppShell`) and `RecordingQuotaChip` (in `CommandHeader`) mount in the
 *   same tick on the dashboard, and each used to issue its own request for the
 *   same URL. Sharing one promise fixes that and changes staleness not at all.
 *
 * - **The value cache** needs a bound, which is why there is a TTL. Unbounded,
 *   the first response would be served for the whole SPA session and
 *   `limits.recordings.used` would freeze at its page-load value — a genuine
 *   regression for the quota chip, which today refetches whenever
 *   `CommandHeader` remounts.
 *
 * A TTL bounds staleness; it cannot remove it. Recordings finish
 * asynchronously in the extension, so the figure can go stale immediately after
 * any fetch, and only an explicit invalidation on recording-complete would fix
 * that. What the TTL does do is replace the *unbounded* staleness
 * `TrialStatusChip` already had: `AppShell` does not remount across client
 * navigation, so that chip has been showing its first response until a hard
 * reload.
 */

/**
 * 30 seconds: comfortably covers a page load and immediate back-and-forth
 * navigation, while staying well under the interval in which a user could
 * plausibly finish a recording and then look at the quota chip.
 */
export const CACHE_TTL_MS = 30_000;

interface CacheState<T> {
  value: T | null;
  storedAtMs: number;
  inFlight: Promise<T> | null;
}

/**
 * A single-slot cache with in-flight deduplication.
 *
 * Generic over the payload so the tests do not need the real account shape to
 * exercise the behaviour, and so nothing here can quietly grow a dependency on
 * the account schema.
 */
export class SharedRequestCache<T> {
  private state: CacheState<T> = { value: null, storedAtMs: 0, inFlight: null };

  constructor(
    private readonly ttlMs: number = CACHE_TTL_MS,
    private readonly now: () => number = Date.now,
  ) {}

  /** A cached value exists and has not aged out. */
  isFresh(): boolean {
    return this.state.value !== null && this.now() - this.state.storedAtMs < this.ttlMs;
  }

  /** The cached value if fresh, else null. Never returns a stale value. */
  peek(): T | null {
    return this.isFresh() ? this.state.value : null;
  }

  /**
   * Get the value, fetching if necessary.
   *
   * Concurrent callers share one `fetcher()` invocation. A rejected fetch
   * clears the in-flight slot so the next caller retries rather than inheriting
   * the failure — one network blip should not leave every account-dependent
   * component blank until a hard reload.
   */
  get(fetcher: () => Promise<T>): Promise<T> {
    const fresh = this.peek();
    if (fresh !== null) return Promise.resolve(fresh);

    // Drop an aged-out value rather than merely declining to serve it. Keeping
    // a value we have committed not to use is a second source of truth waiting
    // to be consulted by mistake.
    this.state.value = null;

    if (this.state.inFlight === null) {
      this.state.inFlight = fetcher()
        .then((value) => {
          this.state.value = value;
          this.state.storedAtMs = this.now();
          this.state.inFlight = null;
          return value;
        })
        .catch((err: unknown) => {
          this.state.inFlight = null;
          throw err;
        });
    }
    return this.state.inFlight;
  }

  /** Drop everything. Used by `refetch()` and by tests between cases. */
  clear(): void {
    this.state = { value: null, storedAtMs: 0, inFlight: null };
  }
}
