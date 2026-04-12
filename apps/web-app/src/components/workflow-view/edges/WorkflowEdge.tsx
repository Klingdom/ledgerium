'use client';

import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';
import type { ViewEdge } from '../adapters/viewModel';

type WorkflowEdgeData = { viewEdge: ViewEdge };
type WorkflowFlowEdge = Edge<WorkflowEdgeData, 'workflowEdge'>;

export const WorkflowEdgeComponent = memo(function WorkflowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<WorkflowFlowEdge>) {
  const viewEdge = data?.viewEdge;
  const isException = viewEdge?.isExceptionPath ?? false;
  const label = viewEdge?.label ?? '';

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const strokeColor = viewEdge?.strokeColor ?? '#cbd5e1';
  const strokeWidth = selected ? 3 : (viewEdge?.strokeWidth ?? 2);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#6366f1' : strokeColor,
          strokeWidth,
          strokeDasharray: isException ? '6 3' : undefined,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        }}
      />

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <span
              className="text-[8px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{
                color: isException ? '#991b1b' : '#6b7280',
                background: isException ? '#fef2f2' : '#f9fafb',
                border: `1px solid ${isException ? '#fca5a5' : '#e5e7eb'}`,
              }}
            >
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
