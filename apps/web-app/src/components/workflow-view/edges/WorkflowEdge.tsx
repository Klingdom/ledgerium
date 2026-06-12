'use client';

/**
 * WorkflowEdge — flow canvas edge component.
 *
 * Visio-grade changes (VISIO_VISUAL_SPEC P0 punch-list):
 *  V-P0-1: borderRadius: 0 — crisp right-angle elbows (Visio orthogonal look)
 *  V-P0-3: markerEnd per edge kind — closed arrowheads (sequence/exception/decision/selected)
 *  V-P1-12: label chip borderRadius: 3 — matches process box corners
 *  V-P2-12: labelOffsetY: -12 — chip sits on the straight segment, not on the bend corner
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

  // V-P0-1: borderRadius: 0 produces crisp right-angle bends (Visio orthogonal look).
  // getSmoothStepPath with borderRadius: 0 already routes orthogonally.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  });

  const strokeColor = viewEdge?.strokeColor ?? '#9ca3af';
  const strokeWidth = selected ? 3 : (viewEdge?.strokeWidth ?? 2);

  // V-P0-3: select the right SVG marker by edge kind.
  // Markers are defined in WorkflowCanvas.tsx (and WorkflowSwimlaneCanvas.tsx) as
  // a zero-size <svg><defs> block so they live in the same DOM tree as the edges.
  const markerId = selected
    ? 'arrow-sel'
    : isException
      ? 'arrow-exc'
      : (viewEdge?.type === 'decision')
        ? 'arrow-dec'
        : 'arrow-seq';

  // V-P2-12: offset label 12px above the geometric midpoint so the chip sits
  // on the straight vertical segment instead of landing on the bend corner.
  const labelOffsetY = -12;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          stroke: selected ? '#6366f1' : strokeColor,
          strokeWidth,
          strokeDasharray: isDashed ? '6 3' : (isException ? '6 3' : undefined),
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        }}
      />

      {/* Edge label chip */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + labelOffsetY}px)`,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 600,
                lineHeight: 1.4,
                padding: '2px 8px',
                // V-P1-12: sharp corners matching process box borderRadius
                borderRadius: 3,
                whiteSpace: 'nowrap',
                color: isException
                  ? '#991b1b'
                  : (viewEdge?.type === 'decision')
                    ? '#78350f'
                    : '#374151',
                background: isException
                  ? '#fef2f2'
                  : (viewEdge?.type === 'decision')
                    ? '#fef9c3'
                    : '#ffffff',
                border: `1px solid ${isException
                  ? '#fca5a5'
                  : (viewEdge?.type === 'decision')
                    ? '#fcd34d'
                    : '#d1d5db'}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
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
