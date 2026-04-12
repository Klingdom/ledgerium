'use client';

/**
 * SOPPageShell — Top-level container for the SOP experience.
 *
 * Manages view mode, step expansion state, active step tracking,
 * and delegates rendering to the active mode's content components.
 *
 * Three modes:
 * 1. Execution SOP — progressive disclosure step cards for operators
 * 2. Visual Process — phase-grouped view with system context
 * 3. Intelligence — friction analysis, optimization, quality insights
 */

import { useState, useCallback, useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { SOPHeader } from './SOPHeader';
import { SOPModeSwitcher } from './SOPModeSwitcher';
import { SOPEmptyState, SOPErrorState, SOPSkeleton } from './SOPEmptyState';
import { SOPExecutionMode } from './SOPExecutionMode';
import { SOPVisualMode } from './SOPVisualMode';
import { SOPIntelligenceMode } from './SOPIntelligenceMode';
import { useSOPViewModel } from './hooks/useSOPViewModel';
import type { SOPViewMode, SOPViewStep } from './types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  sop: any;
  templateArtifacts?: {
    operator_centric?: any;
    enterprise?: any;
    decision_based?: any;
  };
  workflowRecord?: {
    id: string;
    title: string;
    confidence: number | null;
    createdAt: string;
    status: string;
  };
  workflowId?: string;
  isLoading?: boolean;
  error?: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SOPPageShell({
  sop,
  templateArtifacts,
  workflowRecord,
  workflowId,
  isLoading,
  error,
}: Props) {
  const [mode, setMode] = useState<SOPViewMode>('execution');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(() => new Set());
  const [expandAllInit, setExpandAllInit] = useState(false);

  const viewModel = useSOPViewModel(sop, workflowRecord, templateArtifacts);

  // Initialize expanded steps based on mode (only on first render or mode change)
  const initExpandedForMode = useCallback((m: SOPViewMode, steps: SOPViewStep[]) => {
    if (m === 'execution') {
      // Execution: first 5 expanded
      return new Set(steps.slice(0, 5).map(s => s.id));
    }
    if (m === 'intelligence') {
      // Intelligence: all expanded
      return new Set(steps.map(s => s.id));
    }
    // Visual: all collapsed
    return new Set<string>();
  }, []);

  // Initialize on first viewModel
  if (viewModel && !expandAllInit) {
    const initial = initExpandedForMode(mode, viewModel.steps);
    if (initial.size !== expandedSteps.size) {
      setExpandedSteps(initial);
    }
    setExpandAllInit(true);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleModeChange = useCallback((m: SOPViewMode) => {
    setMode(m);
    if (viewModel) {
      setExpandedSteps(initExpandedForMode(m, viewModel.steps));
    }
  }, [viewModel, initExpandedForMode]);

  const toggleStep = useCallback((stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (viewModel) setExpandedSteps(new Set(viewModel.steps.map(s => s.id)));
  }, [viewModel]);

  const collapseAll = useCallback(() => {
    setExpandedSteps(new Set());
  }, []);

  const handleExport = useCallback(() => {
    if (!workflowId) return;
    window.open(`/api/workflows/${workflowId}/export-markdown?artifactType=sop`, '_blank');
  }, [workflowId]);

  // ── Loading / Error / Empty ──────────────────────────────────────────────

  if (isLoading) return <SOPSkeleton />;
  if (error) return <SOPErrorState message={error} />;
  if (!viewModel) return <SOPEmptyState />;

  const allExpanded = expandedSteps.size >= viewModel.steps.length;
  const anyExpanded = expandedSteps.size > 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SOPHeader metadata={viewModel.metadata} />

      {/* ── Mode switcher + controls row ───────────────────────────────── */}
      <div className="flex items-center justify-between px-ds-5 py-ds-1.5 border-b border-gray-100">
        <SOPModeSwitcher activeMode={mode} onModeChange={handleModeChange} />

        <div className="flex items-center gap-1.5">
          {/* Expand/collapse toggle */}
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="text-[10px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>

          {/* Export */}
          {workflowId && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
              title="Export SOP as Markdown"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Step rail (sticky left navigation) */}
        <SOPStepRail
          steps={viewModel.steps}
          expandedSteps={expandedSteps}
          onToggleStep={toggleStep}
        />

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {/* Mode: Execution SOP */}
          {mode === 'execution' && (
            <SOPExecutionMode
              viewModel={viewModel}
              expandedSteps={expandedSteps}
              onToggleStep={toggleStep}
            />
          )}

          {/* Mode: Visual Process */}
          {mode === 'visual' && (
            <SOPVisualMode
              viewModel={viewModel}
              expandedSteps={expandedSteps}
              onToggleStep={toggleStep}
            />
          )}

          {/* Mode: Intelligence (AI-Augmented) */}
          {mode === 'intelligence' && (
            <SOPIntelligenceMode
              viewModel={viewModel}
              expandedSteps={expandedSteps}
              onToggleStep={toggleStep}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Rail (sticky left navigation) ──────────────────────────────────────

function SOPStepRail({
  steps,
  expandedSteps,
  onToggleStep,
}: {
  steps: SOPViewStep[];
  expandedSteps: Set<string>;
  onToggleStep: (id: string) => void;
}) {
  if (steps.length <= 1) return null;

  return (
    <nav
      className="w-12 flex-shrink-0 border-r border-gray-100 bg-gray-50/30 overflow-y-auto py-3 hidden sm:block"
      aria-label="Step navigation"
      role="navigation"
    >
      <div className="flex flex-col items-center gap-1">
        {steps.map(step => {
          const isExpanded = expandedSteps.has(step.id);
          return (
            <button
              key={step.id}
              onClick={() => {
                onToggleStep(step.id);
                document.getElementById(`sop-step-${step.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              title={`Step ${step.ordinal}: ${step.title}`}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} step ${step.ordinal}: ${step.shortTitle}`}
              aria-current={isExpanded ? 'step' : undefined}
              className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all duration-150 ${
                isExpanded
                  ? 'text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              style={isExpanded ? {
                background: step.accentColor,
                boxShadow: `0 1px 3px ${step.accentColor}40`,
              } : undefined}
            >
              {step.ordinal}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ExecutionModeContent moved to SOPExecutionMode.tsx

// VisualModeContent moved to SOPVisualMode.tsx

// IntelligenceModeContent and IntelligenceSidePanel moved to SOPIntelligenceMode.tsx

// ─── Compact Step Card (shared by all modes) ─────────────────────────────────

function SOPStepCardCompact({
  step,
  isExpanded,
  onToggle,
  compact = false,
  showFriction = false,
}: {
  step: SOPViewStep;
  isExpanded: boolean;
  onToggle: () => void;
  compact?: boolean;
  showFriction?: boolean;
}) {
  return (
    <div
      id={`sop-step-${step.id}`}
      className={`transition-all ${compact ? '' : 'rounded-xl border border-gray-200 overflow-hidden'}`}
    >
      {/* Collapsed header — always visible, clickable */}
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 transition-colors ${
          compact ? 'px-4 py-2.5 hover:bg-gray-50/50' : 'px-4 py-3 hover:bg-gray-50/30'
        } ${isExpanded && !compact ? 'border-b border-gray-100' : ''}`}
        aria-expanded={isExpanded}
        aria-controls={`sop-step-body-${step.id}`}
      >
        {/* Ordinal badge */}
        <span
          className="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center flex-shrink-0"
          style={{ color: step.accentColor, background: `${step.accentColor}12` }}
        >
          {step.ordinal}
        </span>

        {/* Title + category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-ds-xs font-medium text-gray-800 truncate">{step.title}</span>
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded flex-shrink-0"
              style={{ color: step.accentColor, background: `${step.accentColor}10` }}
            >
              {step.categoryLabel}
            </span>
            {step.isDecisionPoint && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded text-amber-700 bg-amber-50 flex-shrink-0">
                Decision
              </span>
            )}
          </div>
        </div>

        {/* Right side: system + duration + confidence + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {step.system && (
            <span className="text-[9px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 hidden md:block">
              {step.system}
            </span>
          )}
          {step.durationLabel && (
            <span className="text-[10px] text-gray-400">{step.durationLabel}</span>
          )}
          {/* Confidence dot */}
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: step.confidence >= 0.85 ? '#059669' : step.confidence >= 0.7 ? '#2563eb' : '#d97706' }}
            title={`${Math.round(step.confidence * 100)}% confidence`}
            aria-label={`Confidence: ${Math.round(step.confidence * 100)}%`}
          />
          {/* Expand chevron */}
          <svg
            className={`h-3.5 w-3.5 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div
          id={`sop-step-body-${step.id}`}
          className={`${compact ? 'px-4 pb-3 pl-[52px]' : 'px-4 pb-4 pl-[52px]'} space-y-3`}
        >
          {/* Action summary */}
          {step.action && step.action !== step.title && (
            <p className="text-ds-xs text-gray-600">{step.action}</p>
          )}

          {/* Procedure instructions */}
          {step.detailText && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
              {step.detailText.split('\n').filter(Boolean).map((line, i, arr) => (
                <div
                  key={i}
                  className={`flex gap-2 px-3 py-1.5 text-[11px] ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <span className={`flex-shrink-0 min-w-[14px] ${
                    line.startsWith('✓') ? 'text-emerald-600 font-bold' :
                    line.startsWith('→') ? 'text-gray-400 italic' :
                    'text-gray-400 tabular-nums font-bold'
                  }`}>
                    {line.match(/^\d+\./)?.[0] ?? (line.startsWith('✓') ? '✓' : line.startsWith('→') ? '→' : '')}
                  </span>
                  <span className={
                    line.startsWith('✓') ? 'text-emerald-700' :
                    line.startsWith('→') ? 'text-gray-500 italic' :
                    'text-gray-700'
                  }>
                    {line.replace(/^\d+\.\s*/, '').replace(/^[✓→]\s*/, '')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Decision callout */}
          {step.isDecisionPoint && step.decisionLabel && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-medium text-amber-800">
                <span className="font-bold">Decision:</span> {step.decisionLabel}
              </p>
            </div>
          )}

          {/* Friction indicators (intelligence mode) */}
          {showFriction && step.frictionIndicators.length > 0 && (
            <div className="space-y-1">
              {step.frictionIndicators.map((f, i) => (
                <div
                  key={i}
                  className={`text-[10px] px-3 py-1.5 rounded-lg border ${
                    f.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
                    f.severity === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  {f.label}
                </div>
              ))}
            </div>
          )}

          {/* Expected outcome */}
          {step.expectedOutcome && (
            <p className="text-[10px] text-gray-500">
              <span className="text-emerald-600 font-medium">→</span> {step.expectedOutcome}
            </p>
          )}

          {/* Warnings */}
          {step.warnings.length > 0 && (
            <div className="space-y-1">
              {step.warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
