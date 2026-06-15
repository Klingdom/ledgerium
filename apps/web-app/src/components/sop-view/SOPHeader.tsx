'use client';

import { Clock, Layers, Monitor, Target, Shield, Users, AlertTriangle, CheckCircle2, GitBranch } from 'lucide-react';
import type { SOPMetadata, AlignmentPill } from './types';
import { confidenceColor } from '../workflow-view/constants';
import { formatDate } from '@/lib/format';

interface Props {
  metadata: SOPMetadata;
  /** Living-SOP freshness/conformance pill (gated N>=2; render-only). */
  alignment?: AlignmentPill;
}

export function SOPHeader({ metadata, alignment }: Props) {
  const confStyle = metadata.confidence !== null ? confidenceColor(metadata.confidence) : null;
  const recordedDate = metadata.createdAt ? formatDate(metadata.createdAt) : '';

  return (
    <div className="px-ds-5 py-ds-3 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
      {/* Row 1: Title + provenance */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
              SOP
            </span>
            {metadata.version && (
              <span className="text-[9px] text-[var(--content-tertiary)]">v{metadata.version}</span>
            )}
            {recordedDate && (
              <span className="text-[9px] text-[var(--content-tertiary)]">· Generated {recordedDate}</span>
            )}
          </div>
          {metadata.objective && (
            <p className="text-[11px] text-[var(--content-secondary)] mt-1 leading-relaxed line-clamp-2">
              {metadata.objective}
            </p>
          )}
        </div>

        {/* Living-SOP freshness/conformance pill (the moat). Falls back to the
            Complete/Partial badge when no alignment pill is provided. */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {alignment ? (
            <AlignmentBadge alignment={alignment} />
          ) : metadata.isComplete ? (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              Complete
            </span>
          ) : (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Partial
            </span>
          )}
        </div>
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
                <span key={sys} className="text-[9px] font-medium text-[var(--content-secondary)] bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded px-1.5 py-0.5">
                  {sys}
                </span>
              ))}
              {metadata.systems.length > 3 && (
                <span className="text-[9px] text-[var(--content-tertiary)]">+{metadata.systems.length - 3}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Living-SOP alignment/drift pill.
 *
 * Honesty: when N < 2 the engine signal is meaningless, so we render a NEUTRAL
 * data-insufficiency disclosure ("Based on 1 recording — review before
 * distributing"), NOT a red/critical verdict. Only at N >= 2 do we show the real
 * Aligned/Drifting conformance signal.
 */
function AlignmentBadge({ alignment: a }: { alignment: AlignmentPill }) {
  // Single-run (or no-cohort) disclosure — amber, neutral, not a condemnation.
  if (a.kind === 'insufficient') {
    const title = a.runCount <= 1
      ? `${a.label} — review before distributing`
      : a.label;
    return (
      <span
        className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex items-center gap-1"
        title={title}
        role="status"
        aria-label={title}
      >
        <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
        {a.label}
        {a.detail && <span className="text-amber-600 font-normal hidden sm:inline">— {a.detail}</span>}
      </span>
    );
  }

  const drifting = a.kind === 'drifting';
  const Icon = drifting ? GitBranch : CheckCircle2;
  const cls = drifting
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  const ariaLabel = `${a.label} · ${a.alignmentPct}% aligned · based on ${a.runCount} runs`;

  return (
    <span
      className={`text-[10px] font-medium border rounded px-1.5 py-0.5 flex items-center gap-1 ${cls}`}
      title={a.detail ?? ariaLabel}
      role="status"
      aria-label={ariaLabel}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      <span className="font-semibold">{a.label}</span>
      {a.alignmentPct !== null && <span>· {a.alignmentPct}%</span>}
      <span className="text-[var(--content-tertiary)] font-normal hidden sm:inline">
        · {a.runCount} runs
      </span>
    </span>
  );
}

function MetricChip({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label?: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--content-secondary)]">
      <Icon className="h-3 w-3 text-[var(--content-tertiary)]" />
      <span className="font-semibold text-[var(--content-primary)]">{value}</span>
      {label && <span className="text-[var(--content-tertiary)]">{label}</span>}
    </span>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-[var(--surface-secondary)]" />;
}
