'use client';

import { Clock, Layers, Monitor, Target, Shield, Users, AlertTriangle } from 'lucide-react';
import type { SOPMetadata } from './types';
import { confidenceColor } from '../workflow-view/constants';

interface Props {
  metadata: SOPMetadata;
}

export function SOPHeader({ metadata }: Props) {
  const confStyle = metadata.confidence !== null ? confidenceColor(metadata.confidence) : null;

  return (
    <div className="px-ds-5 py-ds-3 border-b border-gray-100 bg-white">
      {/* Row 1: Title + provenance */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
              SOP
            </span>
            {metadata.version && (
              <span className="text-[9px] text-gray-400">v{metadata.version}</span>
            )}
          </div>
          {metadata.objective && (
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {metadata.objective}
            </p>
          )}
        </div>
        {metadata.isComplete ? (
          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 flex-shrink-0">
            Complete
          </span>
        ) : (
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0">
            Partial
          </span>
        )}
      </div>

      {/* Row 2: Metric chips */}
      <div className="flex items-center gap-ds-3 flex-wrap">
        <MetricChip icon={Layers} value={`${metadata.stepCount}`} label="steps" />
        {metadata.estimatedTime && <MetricChip icon={Clock} value={metadata.estimatedTime} />}
        {metadata.systems.length > 0 && (
          <MetricChip icon={Monitor} value={`${metadata.systems.length}`} label={metadata.systems.length === 1 ? 'system' : 'systems'} />
        )}
        {metadata.roles.length > 0 && (
          <MetricChip icon={Users} value={`${metadata.roles.length}`} label={metadata.roles.length === 1 ? 'role' : 'roles'} />
        )}

        {metadata.confidence !== null && confStyle && (
          <>
            <Divider />
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{ color: confStyle.text, background: confStyle.bg, border: `1px solid ${confStyle.border}` }}
              aria-label={`Confidence: ${Math.round(metadata.confidence * 100)}%`}
              role="status"
            >
              <Target className="h-3 w-3" aria-hidden="true" />
              {Math.round(metadata.confidence * 100)}%
            </span>
          </>
        )}

        {metadata.frictionCount > 0 && (
          <>
            <Divider />
            <span
              className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex items-center gap-1"
              aria-label={`${metadata.frictionCount} friction point${metadata.frictionCount !== 1 ? 's' : ''} detected`}
            >
              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
              {metadata.frictionCount} friction
            </span>
          </>
        )}

        {metadata.systems.length > 0 && (
          <>
            <Divider />
            <div className="flex items-center gap-1">
              {metadata.systems.slice(0, 3).map(sys => (
                <span key={sys} className="text-[9px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                  {sys}
                </span>
              ))}
              {metadata.systems.length > 3 && (
                <span className="text-[9px] text-gray-400">+{metadata.systems.length - 3}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricChip({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label?: string }) {
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
