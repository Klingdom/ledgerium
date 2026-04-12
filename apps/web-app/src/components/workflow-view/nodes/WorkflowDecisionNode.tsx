'use client';

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
    <div className="relative" style={{ width: 280 }} role="button" aria-label={`Decision: ${n.decisionLabel || n.label}`} tabIndex={0}>
      <Handle type="target" position={Position.Top} className="!bg-amber-300 !border-amber-400 !w-2 !h-2" />

      {/* Diamond background */}
      <div
        className="mx-auto transition-all duration-150 cursor-pointer"
        style={{
          width: 200,
          background: selected ? '#fef3c7' : '#fffbeb',
          border: `1.5px solid ${selected ? '#d97706' : '#fcd34d'}`,
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: selected
            ? '0 0 0 2px rgba(217,119,6,0.15), 0 4px 12px rgba(0,0,0,0.06)'
            : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Decision icon */}
        <div className="flex items-center gap-1.5 mb-1">
          <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
            <path d="M6 0L12 6L6 12L0 6Z" fill="#d97706" opacity="0.2" />
            <path d="M6 1L11 6L6 11L1 6Z" fill="none" stroke="#d97706" strokeWidth="1" />
          </svg>
          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-700">Decision</span>
          <span className="flex-1" />
          <span className="text-[10px] font-bold text-amber-600">{n.ordinal}</span>
        </div>

        {/* Decision label */}
        <p className="text-[11px] font-medium text-amber-900 leading-tight"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {n.decisionLabel || n.label}
        </p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-300 !border-amber-400 !w-2 !h-2" />
    </div>
  );
});
