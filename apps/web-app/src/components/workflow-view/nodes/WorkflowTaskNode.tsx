'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { ViewNode } from '../adapters/viewModel';
import { Clock, AlertTriangle, Zap, Shield } from 'lucide-react';

type TaskNodeData = { viewNode: ViewNode };
type TaskFlowNode = Node<TaskNodeData, 'taskNode'>;

export const WorkflowTaskNode = memo(function WorkflowTaskNode({
  data,
  selected,
}: NodeProps<TaskFlowNode>) {
  const n = data.viewNode;
  const accentAlpha = (hex: string, a: string) => `${hex}${a}`;

  return (
    <div
      role="button"
      aria-label={`Step ${n.ordinal}: ${n.label}`}
      tabIndex={0}
      className="group transition-all duration-150 cursor-pointer"
      style={{
        width: 280,
        background: selected ? n.bgHoverColor : n.bgColor,
        border: `1.5px solid ${selected ? n.accentColor : accentAlpha(n.accentColor, '25')}`,
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: selected
          ? `0 0 0 2px ${accentAlpha(n.accentColor, '20')}, 0 4px 12px rgba(0,0,0,0.08)`
          : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: selected ? n.accentColor : '#cbd5e1',
          border: `1px solid ${selected ? n.accentColor : '#e2e8f0'}`,
          width: 8,
          height: 8,
        }}
      />

      {/* Row 1: ordinal + category + duration */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="text-[10px] font-bold min-w-[16px] text-center rounded px-1 py-0.5"
          style={{ color: n.accentColor, background: accentAlpha(n.accentColor, '12') }}
        >
          {n.ordinal}
        </span>
        <span
          className="text-[8px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded"
          style={{ color: n.accentColor, background: accentAlpha(n.accentColor, '10') }}
        >
          {n.categoryLabel}
        </span>
        <span className="flex-1" />
        {n.durationMs > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors">
            <Clock className="w-2.5 h-2.5" />
            {n.durationLabel}
          </span>
        )}
      </div>

      {/* Row 2: Title */}
      <p
        className="text-[12px] font-medium leading-[1.4] mb-1 group-hover:text-gray-900 transition-colors"
        style={{
          color: selected ? n.textColor : '#374151',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {n.label}
      </p>

      {/* Row 3: System + indicators */}
      <div className="flex items-center gap-1.5">
        {n.system && (
          <span className="text-[9px] font-medium text-gray-500 bg-gray-100 group-hover:bg-gray-200/60 rounded px-1.5 py-0.5 truncate max-w-[120px] transition-colors">
            {n.system}
          </span>
        )}
        <span className="flex-1" />

        {/* Indicator icons — each has aria-label for screen readers */}
        {n.hasHighFriction && (
          <span aria-label="Bottleneck detected" title="Bottleneck detected" className="flex items-center">
            <AlertTriangle className="w-3 h-3 text-red-500" />
          </span>
        )}
        {n.isDecisionPoint && (
          <span aria-label={n.decisionLabel || 'Decision point'} title={n.decisionLabel || 'Decision point'} className="flex items-center">
            <Zap className="w-3 h-3 text-amber-500" />
          </span>
        )}
        {n.hasSensitiveData && (
          <span aria-label="Contains sensitive data" title="Contains sensitive data" className="flex items-center">
            <Shield className="w-3 h-3 text-blue-500" />
          </span>
        )}
        {n.isLowConfidence && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
            aria-label="Low confidence step"
            title="Low confidence"
          />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: selected ? n.accentColor : '#cbd5e1',
          border: `1px solid ${selected ? n.accentColor : '#e2e8f0'}`,
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
});
