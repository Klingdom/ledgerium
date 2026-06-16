/**
 * Tests for MiniSparkline.buildPolylinePoints — the pure, deterministic SVG
 * geometry behind the Tier-2 facts-row sparkline (SIGNALS #7).
 *
 * Determinism + honesty contract: the same bucket counts ALWAYS map to the same
 * polyline string; a flat/degenerate series draws a centered baseline rather than
 * a misleading slope; an empty series produces no geometry.
 *
 * @batch SIGNALS (2026-06-16)
 */

import { describe, it, expect } from 'vitest';
import { buildPolylinePoints } from './MiniSparkline';

const W = 72;
const H = 20;

describe('buildPolylinePoints', () => {
  it('returns an empty string for no data', () => {
    expect(buildPolylinePoints([], W, H)).toBe('');
  });

  it('draws a centered horizontal baseline for a single point', () => {
    expect(buildPolylinePoints([5], W, H)).toBe(`0,${H / 2} ${W},${H / 2}`);
  });

  it('draws a centered baseline for a flat series (no misleading slope)', () => {
    expect(buildPolylinePoints([3, 3, 3], W, H)).toBe(`0,${H / 2} ${W},${H / 2}`);
  });

  it('maps higher counts to a higher position (smaller y) across the width', () => {
    // n=2 ⇒ stepX=72; min=0,max=10,range=10,inset=1,usableH=18.
    //   i=0: x=0,  norm=0 ⇒ y=1+(1)*18=19
    //   i=1: x=72, norm=1 ⇒ y=1+(0)*18=1
    expect(buildPolylinePoints([0, 10], W, H)).toBe('0,19 72,1');
  });

  it('is deterministic — identical inputs yield identical geometry', () => {
    const counts = [2, 5, 1, 8, 3];
    expect(buildPolylinePoints(counts, W, H)).toBe(buildPolylinePoints(counts, W, H));
  });
});
