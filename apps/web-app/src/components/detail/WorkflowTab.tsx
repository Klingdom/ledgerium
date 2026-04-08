'use client';

import { useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
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

const TEMPLATE_LABELS: Record<string, string> = {
  swimlane: 'Swimlane',
  bpmn_informed: 'BPMN',
  sipoc_high_level: 'SIPOC',
};

interface Props {
  processOutput: any;
  processMap: any;
  templateArtifacts?: {
    swimlane?: any;
    bpmn_informed?: any;
    sipoc_high_level?: any;
  };
  defaultTemplate?: string;
  workflowId?: string;
}

export function WorkflowTab({ processOutput, processMap, templateArtifacts, defaultTemplate, workflowId }: Props) {
  const hasTemplates = templateArtifacts && Object.values(templateArtifacts).some(Boolean);
  const [selectedFormat, setSelectedFormat] = useState<string>(defaultTemplate ?? 'swimlane');
  const [showRaw, setShowRaw] = useState(!hasTemplates);

  if (!processOutput) {
    return <div className="text-ds-sm text-gray-400 py-ds-10">No workflow data available.</div>;
  }

  const { processDefinition, processRun } = processOutput;
  const steps = processDefinition?.stepDefinitions ?? [];
  const phases = processMap?.phases ?? [];

  function handleExportMarkdown() {
    if (!workflowId) return;
    window.open(`/api/workflows/${workflowId}/export-markdown?artifactType=template_process_map_${selectedFormat}`, '_blank');
  }

  return (
    <div className="ds-document">
      {/* Format Switcher */}
      {hasTemplates && (
        <div className="flex items-center justify-between mb-ds-4 no-print">
          <div className="flex items-center gap-ds-2">
            <span className="text-ds-xs text-gray-400 font-medium uppercase tracking-wide">Format</span>
            <div className="flex rounded-ds-md border border-gray-200 overflow-hidden">
              {Object.entries(TEMPLATE_LABELS).map(([key, label]) => {
                const isAvailable = templateArtifacts?.[key as keyof typeof templateArtifacts];
                const isSelected = !showRaw && selectedFormat === key;
                const isDefault = key === defaultTemplate;
                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedFormat(key); setShowRaw(false); }}
                    disabled={!isAvailable}
                    className={`px-ds-3 py-ds-1 text-ds-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand-50 text-brand-700 border-r border-gray-200'
                        : 'text-gray-500 hover:bg-gray-50 border-r border-gray-200'
                    } ${!isAvailable ? 'opacity-30 cursor-not-allowed' : ''} last:border-r-0`}
                  >
                    {label}
                    {isDefault && <Sparkles className="inline h-3 w-3 ml-1 text-amber-500" />}
                  </button>
                );
              })}
              <button
                onClick={() => setShowRaw(true)}
                className={`px-ds-3 py-ds-1 text-ds-xs font-medium transition-colors ${
                  showRaw ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Raw
              </button>
            </div>
          </div>
          {!showRaw && workflowId && (
            <button onClick={handleExportMarkdown} className="btn-secondary gap-1 text-xs">
              <Download className="h-3.5 w-3.5" /> Markdown
            </button>
          )}
        </div>
      )}

      {/* Template View */}
      {hasTemplates && !showRaw && templateArtifacts?.[selectedFormat as keyof typeof templateArtifacts] ? (
        <TemplateProcessMapView
          data={templateArtifacts[selectedFormat as keyof typeof templateArtifacts]}
          templateType={selectedFormat}
        />
      ) : (
        /* Raw View (original) */
        <>
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
        </>
      )}
    </div>
  );
}

// ─── Template renderers ─────────────────────────────────────────────────────

function TemplateProcessMapView({ data, templateType }: { data: any; templateType: string }) {
  switch (templateType) {
    case 'swimlane': return <SwimlaneView data={data} />;
    case 'bpmn_informed': return <BPMNView data={data} />;
    case 'sipoc_high_level': return <SIPOCView data={data} />;
    default: return <div className="text-ds-sm text-gray-400">Unknown template type.</div>;
  }
}

function SwimlaneView({ data }: { data: any }) {
  return (
    <>
      <header className="ds-header">
        <span className="ds-tag ds-tag-brand mb-ds-2">Swimlane Process Map</span>
        <h1 className="ds-header-title">{data.title}</h1>
        <p className="ds-header-subtitle">{data.objective}</p>
        <div className="mt-ds-4 flex flex-wrap gap-ds-6">
          <div className="ds-metric"><p className="ds-metric-label">Steps</p><p className="ds-metric-value">{data.metadata?.stepCount ?? 0}</p></div>
          <div className="ds-metric"><p className="ds-metric-label">Phases</p><p className="ds-metric-value">{data.metadata?.phaseCount ?? 0}</p></div>
          <div className="ds-metric"><p className="ds-metric-label">Duration</p><p className="ds-metric-value">{data.durationLabel}</p></div>
        </div>
      </header>

      {data.trigger && (
        <div className="ds-callout ds-callout-info">
          <p className="text-ds-xs font-semibold text-brand-700 uppercase tracking-wide mb-ds-1">Trigger</p>
          <p className="text-ds-sm text-gray-700">{data.trigger}</p>
        </div>
      )}

      {/* Lanes */}
      {data.lanes?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Lanes (Systems / Roles)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-ds-2">
            {data.lanes.map((lane: any) => (
              <div key={lane.id} className="card px-ds-4 py-ds-3">
                <p className="text-ds-sm font-medium text-gray-900">{lane.label}</p>
                <p className="text-ds-xs text-gray-400">{lane.system} &middot; {lane.stepCount} steps</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Steps by lane */}
      <section className="ds-section">
        <h2 className="ds-section-label">Process Flow</h2>
        <div className="space-y-ds-2">
          {(data.steps ?? []).map((step: any) => (
            <div key={step.ordinal} className={`ds-step border-l-[3px] ${step.isExceptionPath ? 'border-l-red-400' : 'border-l-brand-400'}`}>
              <div className="ds-step-header">
                <span className="ds-step-ordinal">{step.ordinal}</span>
                <div className="flex-1 min-w-0">
                  <p className="ds-step-title">{step.title}</p>
                  <div className="mt-ds-1 flex flex-wrap items-center gap-ds-2">
                    <span className="ds-tag ds-tag-neutral text-[11px]">{step.categoryLabel}</span>
                    <span className="text-ds-xs text-gray-400">{step.dominantAction}</span>
                    {step.durationLabel && <span className="text-ds-xs text-gray-400">{step.durationLabel}</span>}
                  </div>
                  <p className="text-ds-xs text-gray-400 mt-ds-1">{step.pageContext}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Handoffs */}
      {data.handoffs?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">System Handoffs</h2>
          <div className="space-y-ds-2">
            {data.handoffs.map((h: any, i: number) => (
              <div key={i} className="card px-ds-4 py-ds-3 flex items-center gap-ds-3">
                <span className="text-ds-xs font-mono text-gray-500">Step {h.fromStepOrdinal}</span>
                <span className="text-ds-xs text-gray-300">&rarr;</span>
                <span className="text-ds-xs font-mono text-gray-500">Step {h.toStepOrdinal}</span>
                <span className="text-ds-xs text-gray-400">{h.fromLane} &rarr; {h.toLane}</span>
                <span className="text-ds-xs text-gray-600 ml-auto">{h.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Decisions */}
      {data.decisions?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Decision Points</h2>
          <div className="space-y-ds-2">
            {data.decisions.map((d: any, i: number) => (
              <div key={i} className="ds-callout ds-callout-warning">
                <p className="text-ds-sm font-medium text-gray-900">{d.label}</p>
                <p className="text-ds-xs text-gray-500 mt-ds-1">After step {d.afterStepOrdinal} &middot; Yes: {d.yesPath} &middot; No: {d.noPath}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="ds-attribution">Swimlane process map &middot; Generated from observed workflow behavior</footer>
    </>
  );
}

function BPMNView({ data }: { data: any }) {
  return (
    <>
      <header className="ds-header">
        <span className="ds-tag ds-tag-brand mb-ds-2">BPMN Process Map</span>
        <h1 className="ds-header-title">{data.processName}</h1>
        <div className="mt-ds-4 flex flex-wrap gap-ds-6">
          <div className="ds-metric"><p className="ds-metric-label">Tasks</p><p className="ds-metric-value">{data.tasks?.length ?? 0}</p></div>
          <div className="ds-metric"><p className="ds-metric-label">Gateways</p><p className="ds-metric-value">{data.gateways?.length ?? 0}</p></div>
          <div className="ds-metric"><p className="ds-metric-label">Systems</p><p className="ds-metric-value">{data.metadata?.systems?.length ?? 0}</p></div>
        </div>
      </header>

      {/* Pools */}
      {data.pools?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Pools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-ds-2">
            {data.pools.map((pool: any) => (
              <div key={pool.id} className="card px-ds-4 py-ds-3">
                <p className="text-ds-sm font-medium text-gray-900">{pool.label}</p>
                <p className="text-ds-xs text-gray-400">{pool.system} &middot; {pool.taskIds?.length ?? 0} tasks</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      <section className="ds-section">
        <h2 className="ds-section-label">Tasks</h2>
        <div className="space-y-ds-2">
          {(data.tasks ?? []).map((task: any) => (
            <div key={task.id} className="ds-step border-l-[3px] border-l-brand-400">
              <div className="ds-step-header">
                <span className="ds-step-ordinal">{task.ordinal}</span>
                <div className="flex-1 min-w-0">
                  <p className="ds-step-title">{task.label}</p>
                  <div className="mt-ds-1 flex flex-wrap items-center gap-ds-2">
                    <span className="ds-tag ds-tag-neutral text-[11px]">{task.type}</span>
                    {task.durationLabel && <span className="text-ds-xs text-gray-400">{task.durationLabel}</span>}
                  </div>
                  {task.inputs?.length > 0 && (
                    <p className="text-ds-xs text-gray-400 mt-ds-1">In: {task.inputs.join(', ')}</p>
                  )}
                  {task.outputs?.length > 0 && (
                    <p className="text-ds-xs text-gray-400">Out: {task.outputs.join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gateways */}
      {data.gateways?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Gateways (Decisions)</h2>
          <div className="space-y-ds-2">
            {data.gateways.map((gw: any) => (
              <div key={gw.id} className="ds-callout ds-callout-warning">
                <p className="text-ds-sm font-medium text-gray-900">{gw.label}</p>
                <p className="text-ds-xs text-gray-500">Type: {gw.type}</p>
                {gw.conditions?.map((c: any, i: number) => (
                  <p key={i} className="text-ds-xs text-gray-600 mt-ds-1">&rarr; {c.label}</p>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Exception Flows */}
      {data.exceptionFlows?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Exception Flows</h2>
          <div className="space-y-ds-2">
            {data.exceptionFlows.map((ef: any, i: number) => (
              <div key={i} className="ds-callout ds-callout-danger">
                <p className="text-ds-sm font-medium text-red-800">{ef.errorLabel}</p>
                <p className="text-ds-xs text-gray-600 mt-ds-1">Resolution: {ef.resolution}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="ds-attribution">BPMN-informed process map &middot; Generated from observed workflow behavior</footer>
    </>
  );
}

function SIPOCView({ data }: { data: any }) {
  return (
    <>
      <header className="ds-header">
        <span className="ds-tag ds-tag-brand mb-ds-2">SIPOC High-Level Map</span>
        <h1 className="ds-header-title">{data.processName}</h1>
        <p className="ds-header-subtitle">{data.businessObjective}</p>
        <div className="mt-ds-4 flex flex-wrap gap-ds-6">
          <div className="ds-metric"><p className="ds-metric-label">Steps</p><p className="ds-metric-value">{data.metrics?.stepCount ?? 0}</p></div>
          <div className="ds-metric"><p className="ds-metric-label">Systems</p><p className="ds-metric-value">{data.metrics?.systemCount ?? 0}</p></div>
          <div className="ds-metric"><p className="ds-metric-label">Duration</p><p className="ds-metric-value">{data.metrics?.estimatedDuration ?? '—'}</p></div>
        </div>
      </header>

      {/* SIPOC Table */}
      <div className="grid grid-cols-5 gap-ds-2">
        {[
          { label: 'Suppliers', items: data.suppliers },
          { label: 'Inputs', items: data.inputs },
          { label: 'Process', items: (data.processStages ?? []).map((s: any) => s.title) },
          { label: 'Outputs', items: data.outputs },
          { label: 'Customers', items: data.customers },
        ].map(({ label, items }) => (
          <div key={label} className="card px-ds-3 py-ds-3">
            <p className="text-ds-xs font-semibold text-brand-700 uppercase tracking-wide mb-ds-2">{label}</p>
            <ul className="space-y-ds-1">
              {(items ?? []).map((item: string, i: number) => (
                <li key={i} className="text-ds-xs text-gray-600">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Process Stages */}
      {data.processStages?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Process Stages</h2>
          <div className="space-y-ds-2">
            {data.processStages.map((stage: any) => (
              <div key={stage.ordinal} className="ds-step border-l-[3px] border-l-brand-400">
                <div className="ds-step-header">
                  <span className="ds-step-ordinal">{stage.ordinal}</span>
                  <div className="flex-1 min-w-0">
                    <p className="ds-step-title">{stage.title}</p>
                    <p className="text-ds-xs text-gray-500 mt-ds-1">{stage.description}</p>
                    <p className="text-ds-xs text-gray-400 mt-ds-1">{stage.system} &middot; {stage.stepCount} steps</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Risks */}
      {data.riskHighlights?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Risk Highlights</h2>
          <div className="space-y-ds-1">
            {data.riskHighlights.map((r: string, i: number) => (
              <div key={i} className="ds-callout ds-callout-warning">
                <p className="text-ds-sm text-gray-700">{r}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="ds-attribution">SIPOC high-level map &middot; Generated from observed workflow behavior</footer>
    </>
  );
}
