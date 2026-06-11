'use client';

/**
 * WorkflowDecisionNode — true diamond-shaped branch-point node.
 *
 * P0-4 fix (MAP_DESIGN_SPEC §1.3): replaced rectangle+icon with a
 * CSS-rotated container producing a real diamond shape, per the
 * BPMN gateway convention. Outer div is 280×160 (pre-CSS-transform bounding
 * box used by React Flow); inner 160×160 div rotated 45° becomes ~226px
 * diagonal diamond. Content counter-rotated inside.
 *
 * The diamond conveys: "observed split in the data" — NOT a conditional gate
 * with an inferred business rule. Labels use observed-count language only
 * (honesty requirement from LAYOUT_PLAN §3 + variantFlowModel design).
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { ViewNode } from '../adapters/viewModel';

type DecisionNodeData = { viewNode: ViewNode };
type DecisionFlowNode = Node<DecisionNodeData, 'decisionNode'>;

export const WorkflowDecisionNode = memo(function WorkflowDecisionNode({
  data,
  selected,
}: NodeProps<DecisionFlowNode>) {
  const n = data.viewNode;

  return (
    <div
      style={{ width: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      role="button"
      aria-label={`Decision: ${n.decisionLabel || n.label}`}
      tabIndex={0}
    >
      {/* Target handle — outside the rotated container */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: '#ffffff',
          border: '2px solid #d97706',
          top: -5,
        }}
      />

      {/* Diamond outer shape — 160×160 square rotated 45° → ~226px diamond */}
      <div
        style={{
          width: 160,
          height: 160,
          background: selected ? '#fef3c7' : '#fffbeb',
          border: `2px solid ${selected ? '#d97706' : '#fbbf24'}`,
          borderRadius: 16,           // chamfered corners = standard BPMN gateway
          transform: 'rotate(45deg)',
          boxShadow: selected
            ? '0 0 0 3px rgba(217,119,6,0.18), 0 4px 16px rgba(0,0,0,0.08)'
            : '0 2px 8px rgba(217,119,6,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Inner content — counter-rotated so text reads normally */}
        <div
          style={{
            transform: 'rotate(-45deg)',
            textAlign: 'center',
            padding: '8px 12px',
            maxWidth: 110,
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase' as const,
              color: '#d97706',
              marginBottom: 4,
            }}
          >
            ◆ Decision
          </span>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#92400e',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
              marginBottom: 3,
            }}
          >
            {n.decisionLabel || n.label}
          </p>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              color: '#d97706',
            }}
          >
            {n.ordinal}
          </span>
        </div>
      </div>

      {/* Source handle — outside the rotated container */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: '#ffffff',
          border: '2px solid #d97706',
          bottom: -5,
        }}
      />
    </div>
  );
});
