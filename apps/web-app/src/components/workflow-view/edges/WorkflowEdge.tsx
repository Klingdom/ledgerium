'use client';

/**
 * WorkflowEdge — flow canvas edge component.
 *
 * P0-3 fix (MAP_DESIGN_SPEC P0-3): edge label chip font raised to 10px (was 8px).
 * Also adds box-shadow to lift label off the path (P2-10).
 */

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
  const isDashed = viewEdge?.isDashed ?? false;
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

  const strokeColor = viewEdge?.strokeColor ?? '#9ca3af';
  const strokeWidth = selected ? 3 : (viewEdge?.strokeWidth ?? 2);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#6366f1' : strokeColor,
          strokeWidth,
          strokeDasharray: isDashed ? '6 3' : (isException ? '6 3' : undefined),
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        }}
      />

      {/* Edge label chip — 10px minimum (P0-3) */}
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
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 10,
                whiteSpace: 'nowrap',
                color: isException ? '#991b1b' : '#374151',
                background: isException ? '#fef2f2' : '#ffffff',
                border: `1px solid ${isException ? '#fca5a5' : '#d1d5db'}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
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
