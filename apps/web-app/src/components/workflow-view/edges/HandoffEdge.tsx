'use client';

import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';
import type { ViewEdge } from '../adapters/viewModel';

type HandoffEdgeData = { viewEdge: ViewEdge; isHandoff: boolean };
type HandoffFlowEdge = Edge<HandoffEdgeData, 'handoffEdge'>;

export const HandoffEdgeComponent = memo(function HandoffEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<HandoffFlowEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const strokeColor = selected ? '#6d28d9' : '#8b5cf6';
  const strokeWidth = selected ? 3.5 : 2.5;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        }}
      />

      {/* Handoff badge — always shown for cross-lane edges */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <span
            className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
            style={{
              color: selected ? '#5b21b6' : '#7c3aed',
              background: '#f5f3ff',
              border: `1px solid ${selected ? '#c4b5fd' : '#ddd6fe'}`,
            }}
          >
            {data?.viewEdge?.label ? data.viewEdge.label : 'Handoff'}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
