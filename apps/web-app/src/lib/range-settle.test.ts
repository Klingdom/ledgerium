import { describe, it, expect } from 'vitest';
import { rangeWaitMs, RANGE_SETTLE_MAX_MS } from './range-settle';

describe('rangeWaitMs (row #416)', () => {
  it('is 0 when the range settled before the workflows response', () => {
    expect(rangeWaitMs(500, 300)).toBe(0);
    expect(rangeWaitMs(500, 500)).toBe(0);
  });
  it('is 0 when the workflows response never arrived', () => {
    expect(rangeWaitMs(null, 900)).toBe(0);
  });
  it('is the rounded gap otherwise', () => {
    expect(rangeWaitMs(100, 1100)).toBe(1000);
    expect(rangeWaitMs(100.2, 160.9)).toBe(61);
    expect(Number.isInteger(rangeWaitMs(10.4, 20.7))).toBe(true);
  });
  it('the cap is 1 s from the workflows response', () => {
    expect(RANGE_SETTLE_MAX_MS).toBe(1000);
  });
});
