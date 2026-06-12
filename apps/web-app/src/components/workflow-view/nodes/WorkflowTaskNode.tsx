'use client';

/**
 * WorkflowTaskNode — Flow Intelligence Map step node.
 *
 * P0 legibility fixes applied (MAP_DESIGN_SPEC §1.2 + P0 punch-list):
 *  - Left-rail 4px accent border replaces background-flood fill
 *  - White-on-accent ordinal badge (font-weight 700, min-width adequate for 2 digits)
 *  - Step label font-weight 600 (up from 500/medium)
 *  - Handles: 10×10 white+accent-ring (always visible)
 *  - Minimum font size 9px everywhere (was 8px on category badge)
 *  - Stronger box-shadow visible at 0.5× zoom and in screenshots
 *
 * Visio-grade changes (VISIO_VISUAL_SPEC P0 punch-list):
 *  V-P0-2: borderRadius: 3 — Visio process rectangle (was 10, looked like a card)
 *  V-P0-6: Right and Left handles added for same-lane horizontal flow (swimlane view)
 */

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

  return (
    <div
      role="button"
      aria-label={`Step ${n.ordinal}: ${n.label}`}
      tabIndex={0}
      className="group transition-all duration-150 cursor-pointer"
      style={{
        width: 260,
        minHeight: 72,
        background: selected ? n.bgHoverColor : `${n.accentColor}0f`,
        // Left-rail accent (4px) + subtle border on other sides
        border: `1px solid ${n.accentColor}20`,
        borderLeft: `4px solid ${n.accentColor}`,
        // V-P0-2: 3px = Visio process rectangle. 10px looked like an app card.
        borderRadius: 3,
        padding: '10px 12px 10px 14px',
        boxShadow: selected
          ? `0 0 0 3px ${n.accentColor}25, 0 4px 16px rgba(0,0,0,0.10)`
          : '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Target handle — accent-ring, always visible */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: '#ffffff',
          border: `2px solid ${n.accentColor}`,
          top: -5,
        }}
      />

      {/* Row 1: ordinal badge + category label + duration */}
      <div className="flex items-center gap-1.5 mb-2">
        {/* White-on-accent ordinal badge — large enough for two-digit numbers */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            lineHeight: '18px',
            minWidth: 20,
            height: 20,
            textAlign: 'center',
            color: '#ffffff',
            background: n.accentColor,
            borderRadius: 5,
            padding: '0 4px',
            flexShrink: 0,
          }}
        >
          {n.ordinal}
        </span>

        {/* Category label — 9px minimum per P0-6 */}
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase' as const,
            color: n.accentColor,
          }}
        >
          {n.categoryLabel}
        </span>

        <span style={{ flex: 1 }} />

        {/* Duration — 10px minimum */}
        {n.durationMs > 0 && (
          <span
            className="flex items-center gap-0.5 group-hover:text-[var(--content-secondary)] transition-colors"
            style={{ fontSize: 10, color: '#6b7280' }}
          >
            <Clock style={{ width: 10, height: 10 }} />
            {n.durationLabel}
          </span>
        )}
      </div>

      {/* Row 2: Step label — 12px / 600 weight for clarity */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.35,
          color: selected ? n.textColor : '#111827',
          marginBottom: 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
        }}
      >
        {n.label}
      </p>

      {/* Row 3: System chip + indicator icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {n.system && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: '#4b5563',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 4,
              padding: '1px 6px',
              maxWidth: 110,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {n.system}
          </span>
        )}
        <span style={{ flex: 1 }} />

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

      {/* Source handle — accent-ring, always visible (primary: downward vertical flow) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          width: 10,
          height: 10,
          background: '#ffffff',
          border: `2px solid ${n.accentColor}`,
          bottom: -5,
        }}
      />

      {/* V-P0-6: Right handle — outgoing connector for same-lane horizontal flow (swimlane) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          width: 10,
          height: 10,
          background: '#ffffff',
          border: `2px solid ${n.accentColor}`,
          right: -5,
        }}
      />

      {/* V-P0-6: Left handle — incoming connector for same-lane horizontal flow (swimlane) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          width: 10,
          height: 10,
          background: '#ffffff',
          border: `2px solid ${n.accentColor}`,
          left: -5,
        }}
      />
    </div>
  );
});
