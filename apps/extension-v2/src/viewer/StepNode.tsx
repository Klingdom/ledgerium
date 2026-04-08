import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { StepFlowNode } from './processMapBuilder.js'

export const StepNode = memo(function StepNode({ data, selected }: NodeProps<StepFlowNode>) {
  const { engineNode } = data

  return (
    <div
      style={{
        width: 296,
        background: selected
          ? engineNode.categoryBg.replace('0.07', '0.14')
          : engineNode.categoryBg,
        border: `1px solid ${selected ? engineNode.categoryColor : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 10,
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxShadow: selected
          ? `0 0 0 2px ${engineNode.categoryColor}22, 0 4px 16px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#0a0e14',
          border: `1px solid ${selected ? engineNode.categoryColor : '#283041'}`,
          width: 8,
          height: 8,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#3d4f6a', minWidth: 14 }}>
          {engineNode.ordinal}
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: engineNode.categoryColor,
          background: `${engineNode.categoryColor}18`,
          borderRadius: 4,
          padding: '2px 6px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {engineNode.categoryLabel}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#3d4f6a' }}>{engineNode.metadata.durationLabel}</span>
      </div>

      <p style={{
        margin: 0,
        fontSize: 12,
        fontWeight: 500,
        color: selected ? '#f3f4f6' : '#d1d5db',
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginBottom: engineNode.metadata.systems.length > 0 ? 3 : 0,
      }}>
        {engineNode.title}
      </p>

      {engineNode.metadata.systems.length > 0 && (
        <p style={{
          margin: 0,
          fontSize: 10,
          color: '#4b5563',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {engineNode.metadata.systems.join(' · ')}
        </p>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#0a0e14',
          border: `1px solid ${selected ? engineNode.categoryColor : '#283041'}`,
          width: 8,
          height: 8,
        }}
      />
    </div>
  )
})
