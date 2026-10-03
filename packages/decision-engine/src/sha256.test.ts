import { describe, expect, it } from 'vitest';
import { sha256Hex } from './text-safety.js';

// Known-answer + differential tests for the pure SHA-256 (FIPS 180-4).
// node:crypto is loaded via process.getBuiltinModule (Node >=20.16) so the package needs no @types/node
// (the package source deliberately avoids node types); tests execute under Node.
const NODE_CRYPTO = 'node:crypto';
type Crypto = { createHash(a: string): { update(d: string | Uint8Array): { digest(e: 'hex'): string } } };
const nodeSha = async (data: string | Uint8Array): Promise<string> => {
  const proc = (globalThis as unknown as { process: { getBuiltinModule(id: string): unknown } }).process;
  const c = proc.getBuiltinModule(NODE_CRYPTO) as Crypto;
  return c.createHash('sha256').update(data).digest('hex');
};

describe('sha256Hex known answers (FIPS 180-4)', () => {
  it('empty string', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
  it('"abc"', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('448-bit two-block message', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });
  it('one million "a"', () => {
    expect(sha256Hex('a'.repeat(1_000_000))).toBe('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  });
});

describe('sha256Hex vs node:crypto', () => {
  it.each(['Café', '😀', 'café', '日本語テキスト', 'a😀b€c', '\u0000x'])('utf-8 input %j', async (s) => {
    expect(sha256Hex(s)).toBe(await nodeSha(s));
  });
  it.each([0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129])('length %i bytes', async (n) => {
    const s = 'x'.repeat(n);
    expect(sha256Hex(s)).toBe(await nodeSha(s));
  });
});
