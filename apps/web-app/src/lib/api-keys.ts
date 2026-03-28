/**
 * API key utilities for extension sync authentication.
 *
 * Keys follow the format: ldg_{random_40_hex_chars}
 * Only a SHA-256 hash is stored in the database — the raw key
 * is shown once at creation time and never again.
 */

import { createHash, randomBytes } from 'crypto';

const KEY_PREFIX = 'ldg_';

/** Generate a new API key. Returns both the raw key (show once) and its hash (store). */
export function generateApiKey(): { rawKey: string; keyHash: string; prefix: string } {
  const random = randomBytes(20).toString('hex'); // 40 hex chars
  const rawKey = `${KEY_PREFIX}${random}`;
  const keyHash = hashKey(rawKey);
  const prefix = rawKey.slice(0, 12); // "ldg_a1b2c3d4" — safe to display
  return { rawKey, keyHash, prefix };
}

/** Hash a raw API key for storage/lookup. */
export function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}
