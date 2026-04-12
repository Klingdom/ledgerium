'use client';

import {
  Clock,
  Layers,
  Monitor,
  BarChart3,
  Target,
  GitBranch,
  Activity,
} from 'lucide-react';
import type { WorkflowMetadata } from './types';
import { confidenceColor } from './constants';

interface Props {
  metadata: WorkflowMetadata;
}

export function WorkflowHeader({ metadata }: Props) {
  const confStyle = metadata.confidence !== null
    ? confidenceColor(metadata.confidence)
    : null;

  return (
    <div className="flex items-center gap-ds-3 px-ds-5 py-ds-2 border-b border-gray-100 bg-white">
      {/* Compact metrics */}
      <MetricChip icon={Layers} value={`${metadata.stepCount}`} label="steps" />
      <MetricChip icon={Clock} value={metadata.durationLabel} />
      <MetricChip icon={Monitor} value={`${metadata.phaseCount}`} label="phases" />
      <MetricChip icon={Activity} value={`${metadata.eventCount}`} label="events" />

      {metadata.systems.length > 0 && (
        <>
          <Divider />
          <div className="flex items-center gap-1">
            {metadata.systems.slice(0, 4).map(sys => (
              <span key={sys} className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                {sys}
              </span>
            ))}
            {metadata.systems.length > 4 && (
              <span className="text-[10px] text-gray-400">+{metadata.systems.length - 4}</span>
            )}
          </div>
        </>
      )}

      {metadata.confidence !== null && confStyle && (
        <>
          <Divider />
          <div className="flex items-center gap-1.5">
            <Target className="h-3 w-3" style={{ color: confStyle.text }} />
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ color: confStyle.text, background: confStyle.bg, border: `1px solid ${confStyle.border}` }}
            >
              {Math.round(metadata.confidence * 100)}% confidence
            </span>
          </div>
        </>
      )}

      {metadata.frictionCount > 0 && (
        <>
          <Divider />
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            {metadata.frictionCount} friction point{metadata.frictionCount !== 1 ? 's' : ''}
          </span>
        </>
      )}

      {metadata.errorStepCount > 0 && (
        <span className="text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
          {metadata.errorStepCount} error{metadata.errorStepCount !== 1 ? 's' : ''}
        </span>
      )}

      <div className="flex-1" />

      {metadata.completionStatus && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          metadata.completionStatus === 'complete'
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : 'text-amber-700 bg-amber-50 border border-amber-200'
        }`}>
          {metadata.completionStatus === 'complete' ? 'Complete' : 'Partial'}
        </span>
      )}
    </div>
  );
}

function MetricChip({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label?: string;
}) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-600">
      <Icon className="h-3 w-3 text-gray-400" />
      <span className="font-semibold text-gray-800">{value}</span>
      {label && <span className="text-gray-400">{label}</span>}
    </span>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-gray-200" />;
}
