'use client';

import { formatDuration } from '@/lib/format';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  click_then_navigate:  { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-400' },
  fill_and_submit:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  repeated_click_dedup: { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  single_action:        { bg: 'bg-gray-50',    text: 'text-gray-700',    dot: 'bg-gray-400' },
  data_entry:           { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-400' },
  send_action:          { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  file_action:          { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  error_handling:       { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400' },
  annotation:           { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-400' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.single_action!;
}

interface Props {
  processOutput: any;
  processMap: any;
}

export function WorkflowTab({ processOutput, processMap }: Props) {
  if (!processOutput) {
    return <div className="text-sm text-gray-400">No workflow data available.</div>;
  }

  const { processDefinition, processRun } = processOutput;
  const steps = processDefinition?.stepDefinitions ?? [];
  const phases = processMap?.phases ?? [];

  return (
    <div className="space-y-6">
      {/* Metrics bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Steps" value={processRun?.stepCount ?? steps.length} />
        <MetricCard label="Duration" value={processRun?.durationLabel ?? '—'} />
        <MetricCard label="Events" value={processRun?.eventCount ?? 0} />
        <MetricCard label="Systems" value={processRun?.systemsUsed?.length ?? 0} />
      </div>

      {/* Phases */}
      {phases.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Phases
          </h3>
          <div className="flex flex-wrap gap-2">
            {phases.map((phase: any) => (
              <span
                key={phase.id}
                className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
              >
                {phase.name} ({phase.stepNodeIds?.length ?? 0} steps)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Step list */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Workflow Steps
        </h3>
        <div className="space-y-2">
          {steps.map((step: any) => {
            const style = getCategoryStyle(step.category);
            return (
              <div key={step.stepId} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {step.ordinal}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${style.bg} ${style.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {step.categoryLabel}
                        </span>
                        {step.durationLabel && step.durationLabel !== '< 1s' && (
                          <span>{step.durationLabel}</span>
                        )}
                        <span>{step.eventCount} event{step.eventCount !== 1 ? 's' : ''}</span>
                        {step.confidence < 0.7 && (
                          <span className="text-amber-600">
                            Low confidence ({Math.round(step.confidence * 100)}%)
                          </span>
                        )}
                      </div>
                      {step.systems?.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {step.systems.map((s: string) => (
                            <span key={s} className="text-[10px] text-gray-400">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
