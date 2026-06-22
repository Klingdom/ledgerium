'use client';

/**
 * DemoVariantsMapInner — renders the REAL `WorkflowVariantsMap` (the full
 * multi-tab process-variants experience: Map / Frequency / DNA / List + path
 * cards) against the sample "Approve Expense Report" recording.
 *
 * This is the genuine product component, not a mock — visitors can switch views
 * and explore the divergence/rework/exception paths exactly as in-app. Loaded
 * client-only (no SSR) via DemoVariantsMap; `workflowId="demo-variants"` keeps
 * its analytics filterable and separate from real-user workflow IDs.
 */

import { useCallback } from 'react';
import Image from 'next/image';
import { WorkflowVariantsMap } from '@/components/workflow-view/WorkflowVariantsMap';
import { DEMO_VARIANT_GRAPH, DEMO_VARIANT_INTELLIGENCE } from './demoVariantsFixture';

function StaticFallback() {
  return (
    <div className="relative h-[560px] w-full">
      <Image
        src="/img/demo/workflow-view.png"
        alt="Ledgerium process variants map (sample)"
        fill
        className="object-cover object-top"
      />
    </div>
  );
}

export default function DemoVariantsMapInner() {
  const handleSelectNode = useCallback((_id: string | null) => {
    // No-op in the demo — node selection drives the in-app inspector, which is
    // out of scope for the public embed.
  }, []);

  // The graph is built deterministically at module load and guarded by
  // demoVariantsFixture.test.ts. If the builder contract ever breaks, degrade
  // gracefully to the static screenshot rather than render a broken canvas.
  if (!DEMO_VARIANT_GRAPH) return <StaticFallback />;

  return (
    <div className="relative h-[560px] w-full">
      <WorkflowVariantsMap
        graph={DEMO_VARIANT_GRAPH}
        intelligence={DEMO_VARIANT_INTELLIGENCE}
        workflowId="demo-variants"
        status="loaded"
        onSelectNode={handleSelectNode}
      />
    </div>
  );
}
