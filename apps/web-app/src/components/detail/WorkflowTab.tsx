'use client';

import { formatDuration } from '@/lib/format';

/** Canonical step border colors — single source of truth, shared with SOPTab */
const STEP_BORDER: Record<string, string> = {
  click_then_navigate:  'border-l-teal-500',
  fill_and_submit:      'border-l-blue-500',
  repeated_click_dedup: 'border-l-orange-500',
  single_action:        'border-l-gray-400',
  data_entry:           'border-l-violet-500',
  send_action:          'border-l-emerald-500',
  file_action:          'border-l-amber-500',
  error_handling:       'border-l-red-500',
  annotation:           'border-l-purple-500',
};

const CATEGORY_LABEL: Record<string, string> = {
  click_then_navigate: 'Navigation',
  fill_and_submit: 'Form Submit',
  repeated_click_dedup: 'Repeated Action',
  single_action: 'Action',
  data_entry: 'Data Entry',
  send_action: 'Submit',
  file_action: 'File',
  error_handling: 'Error',
  annotation: 'Note',
};

interface Props {
  processOutput: any;
  processMap: any;
}

export function WorkflowTab({ processOutput, processMap }: Props) {
  if (!processOutput) {
    return <div className="text-ds-sm text-gray-400 py-ds-10">No workflow data available.</div>;
  }

  const { processDefinition, processRun } = processOutput;
  const steps = processDefinition?.stepDefinitions ?? [];
  const phases = processMap?.phases ?? [];

  return (
    <div className="ds-document">
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-4">
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Steps</p>
          <p className="ds-metric-value">{processRun?.stepCount ?? steps.length}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Duration</p>
          <p className="ds-metric-value">{processRun?.durationLabel ?? '—'}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Events</p>
          <p className="ds-metric-value">{processRun?.eventCount ?? 0}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Systems</p>
          <p className="ds-metric-value">{processRun?.systemsUsed?.length ?? 0}</p>
        </div>
      </div>

      {/* Phases */}
      {phases.length > 0 && (
        <section className="ds-section">
          <h3 className="ds-section-label">Phases</h3>
          <div className="flex flex-wrap gap-ds-2">
            {phases.map((phase: any) => (
              <span key={phase.id} className="ds-tag ds-tag-brand">
                {phase.name} ({phase.stepNodeIds?.length ?? 0})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Step list */}
      <section className="ds-section">
        <h3 className="ds-section-label">Workflow Steps</h3>
        <div className="space-y-ds-2">
          {steps.map((step: any) => {
            const border = STEP_BORDER[step.category] ?? 'border-l-gray-300';
            const label = CATEGORY_LABEL[step.category] ?? 'Action';
            return (
              <div key={step.stepId} className={`ds-step border-l-[3px] ${border}`}>
                <div className="ds-step-header">
                  <span className="ds-step-ordinal">{step.ordinal}</span>
                  <div className="flex-1 min-w-0">
                    <p className="ds-step-title">{step.title}</p>
                    <div className="mt-ds-1 flex flex-wrap items-center gap-ds-2">
                      <span className="ds-tag ds-tag-neutral text-[11px]">{label}</span>
                      {step.durationLabel && step.durationLabel !== '< 1s' && (
                        <span className="text-ds-xs text-gray-400">{step.durationLabel}</span>
                      )}
                      <span className="text-ds-xs text-gray-400">
                        {step.eventCount} event{step.eventCount !== 1 ? 's' : ''}
                      </span>
                      {step.confidence < 0.7 && (
                        <span className="text-ds-xs text-amber-600 font-medium">
                          Low confidence ({Math.round(step.confidence * 100)}%)
                        </span>
                      )}
                    </div>
                    {step.systems?.length > 0 && (
                      <div className="mt-ds-1 flex gap-ds-1">
                        {step.systems.map((s: string) => (
                          <span key={s} className="text-ds-xs text-gray-400">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
