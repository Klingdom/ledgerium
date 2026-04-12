'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { ViewNode } from '../adapters/viewModel';
import { Play, Square } from 'lucide-react';

type TerminalNodeData = { viewNode: ViewNode };
type TerminalFlowNode = Node<TerminalNodeData, 'terminalNode'>;

export const WorkflowTerminalNode = memo(function WorkflowTerminalNode({
  data,
  selected,
}: NodeProps<TerminalFlowNode>) {
  const n = data.viewNode;
  const isStart = n.nodeType === 'start';

  return (
    <div style={{ width: 280 }} role="button" aria-label={isStart ? 'Workflow start' : 'Workflow end'} tabIndex={0}>
      <div
        className="mx-auto flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
        style={{
          width: 140,
          height: 40,
          background: isStart
            ? (selected ? '#d1fae5' : '#ecfdf5')
            : (selected ? '#e2e8f0' : '#f1f5f9'),
          border: `1.5px solid ${isStart
            ? (selected ? '#059669' : '#6ee7b7')
            : (selected ? '#64748b' : '#94a3b8')}`,
          borderRadius: 20,
          boxShadow: selected
            ? `0 0 0 2px ${isStart ? 'rgba(5,150,105,0.15)' : 'rgba(100,116,139,0.15)'}`
            : 'none',
        }}
      >
        {isStart ? (
          <Play className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" />
        ) : (
          <Square className="w-3 h-3 text-gray-500" fill="currentColor" />
        )}
        <span
          className="text-[11px] font-semibold"
          style={{ color: isStart ? '#065f46' : '#475569' }}
        >
          {n.label}
        </span>
      </div>

      {isStart ? (
        <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !border-emerald-600 !w-2 !h-2" />
      ) : (
        <Handle type="target" position={Position.Top} className="!bg-gray-400 !border-gray-500 !w-2 !h-2" />
      )}
    </div>
  );
});
