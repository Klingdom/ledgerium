/**
 * Test-only helper (row #360 / MR-069): in-process access to V8's gc().
 *
 * The rate-limit heap tests measure retained memory, which needs a forced
 * collection. Rather than depend on the runner being started with --expose-gc,
 * this enables the flag on the running isolate and pulls `gc` out of a fresh
 * context. That is a supported Node API (v8.setFlagsFromString + vm), and it
 * works under vitest's `pool: 'forks'` child processes.
 *
 * Callers MUST NOT silently skip when gc is missing: `requireGc()` throws with
 * an explicit message, and `gc-availability` is asserted in
 * bounded-lru-heap.test.ts, so a Node change that removes the capability turns
 * the heap tests RED, never into quiet skips.
 */
import v8 from 'node:v8';
import vm from 'node:vm';

function acquire(): (() => void) | null {
  try {
    v8.setFlagsFromString('--expose-gc');
    const g = vm.runInNewContext('gc') as unknown;
    return typeof g === 'function' ? (g as () => void) : null;
  } catch {
    return null;
  }
}

const gcFn = acquire();

export function gcIsAvailable(): boolean {
  return gcFn !== null;
}

export function requireGc(): () => void {
  if (gcFn === null) {
    throw new Error(
      'gc() is unavailable (v8.setFlagsFromString("--expose-gc") + vm.runInNewContext("gc") failed on Node ' +
        process.version +
        '). The rate-limit heap tests cannot measure retained memory; fix the runner (node --expose-gc) rather than skipping them.',
    );
  }
  return gcFn;
}

/** Heap in MB after two forced collections. */
export function heapMb(): number {
  const gc = requireGc();
  gc();
  gc();
  return process.memoryUsage().heapUsed / 1048576;
}

/** A request-like object whose x-forwarded-for is `xff` (what getClientIp reads). */
export function fakeXffRequest(xff: string): { headers: { get: (n: string) => string | null } } {
  return { headers: { get: (n: string) => (n === 'x-forwarded-for' ? xff : null) } };
}
