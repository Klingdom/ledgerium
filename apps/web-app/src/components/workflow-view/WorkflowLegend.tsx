'use client';

import { X } from 'lucide-react';
import { CATEGORY_STYLES, NODE_TYPE_STYLES, EDGE_STYLES } from './constants';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function WorkflowLegend({ visible, onClose }: Props) {
  if (!visible) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 w-64 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Legend</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-gray-100 text-gray-400">
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="px-3 py-2 space-y-3">
        {/* Node types */}
        <LegendSection title="Node Types">
          <LegendRow color={NODE_TYPE_STYLES.start.color} label="Start / End" shape="pill" />
          <LegendRow color={NODE_TYPE_STYLES.decision.color} label="Decision Point" shape="diamond" />
          <LegendRow color={NODE_TYPE_STYLES.exception.color} label="Exception / Error" shape="rect" />
        </LegendSection>

        {/* Step categories */}
        <LegendSection title="Step Categories">
          {Object.entries(CATEGORY_STYLES).slice(0, 7).map(([key, style]) => (
            <LegendRow key={key} color={style.color} label={style.label} shape="rect" />
          ))}
        </LegendSection>

        {/* Edge types */}
        <LegendSection title="Connections">
          <LegendEdgeRow color="#cbd5e1" label="Sequence flow" dashed={false} />
          <LegendEdgeRow color="#fca5a5" label="Exception path" dashed={true} />
          <LegendEdgeRow color="#fbbf24" label="Decision branch" dashed={false} />
        </LegendSection>
      </div>
    </div>
  );
}

function LegendSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  shape,
}: {
  color: string;
  label: string;
  shape: 'rect' | 'diamond' | 'pill';
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        className="flex-shrink-0"
        style={{
          width: shape === 'diamond' ? 8 : 10,
          height: 8,
          background: color,
          borderRadius: shape === 'pill' ? 4 : shape === 'diamond' ? 0 : 2,
          transform: shape === 'diamond' ? 'rotate(45deg) scale(0.8)' : 'none',
          opacity: 0.8,
        }}
      />
      <span className="text-[10px] text-gray-600">{label}</span>
    </div>
  );
}

function LegendEdgeRow({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <svg width="16" height="8" className="flex-shrink-0">
        <line
          x1="0" y1="4" x2="16" y2="4"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '4 2' : 'none'}
        />
      </svg>
      <span className="text-[10px] text-gray-600">{label}</span>
    </div>
  );
}
