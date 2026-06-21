'use client';

/**
 * DemoProcessMapInner — renders the REAL `DfgFrequencyMap` against a static
 * sample process (demoDfgFixture). This is the live, interactive process map
 * embedded on the public /demo page: visitors can toggle frequency/performance
 * mode and drag the coverage slider exactly as they would in the product.
 *
 * Loaded only on the client (no SSR) via DemoProcessMap — React Flow requires
 * `window`/ResizeObserver at render time.
 *
 * Uses `workflowId="demo"` so the map's analytics (variant_map_viewed, etc.)
 * are filterable in PostHog and never mixed with real-user workflow IDs.
 */

import { useRef } from 'react';
import { DfgFrequencyMap } from '@/components/workflow-view/DfgFrequencyMap';
import { DEMO_DFG, DEMO_VARIANT_COUNT, DEMO_STANDARD_FREQUENCY } from './demoDfgFixture';

export default function DemoProcessMapInner() {
  // The real DfgFrequencyMap expects a ref carrying the ms timestamp of when the
  // variant view opened. The map is the view itself here, so we seed it on mount.
  const variantViewStartRef = useRef<number>(Date.now());

  return (
    <div className="relative h-[520px] w-full">
      <DfgFrequencyMap
        dfg={DEMO_DFG}
        workflowId="demo"
        variantCount={DEMO_VARIANT_COUNT}
        standardFrequency={DEMO_STANDARD_FREQUENCY}
        decisionPointCount={2}
        variantViewStartRef={variantViewStartRef}
      />
    </div>
  );
}
