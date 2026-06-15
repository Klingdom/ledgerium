/**
 * useSOPViewModel — Transforms raw SOP data into a display-ready view model.
 * Components consume the normalized SOPViewModel; never raw engine types.
 */

import { useMemo } from 'react';
import { buildSOPViewModel } from '../adapters/sopViewModel';
import type { SOPViewModel, SopIntelligenceInput, StepPageContextMap } from '../types';

interface WorkflowRecord {
  id: string;
  title: string;
  confidence: number | null;
  createdAt: string;
  status: string;
}

interface TemplateArtifacts {
  operator_centric?: any;
  enterprise?: any;
  decision_based?: any;
}

interface Extras {
  sopIntelligence?: SopIntelligenceInput | null;
  stepPageContext?: StepPageContextMap | null;
}

export function useSOPViewModel(
  rawSop: any,
  workflowRecord?: WorkflowRecord,
  templateArtifacts?: TemplateArtifacts,
  extras?: Extras,
): SOPViewModel | null {
  return useMemo(
    () => buildSOPViewModel(rawSop, workflowRecord, templateArtifacts, extras),
    [rawSop, workflowRecord, templateArtifacts, extras],
  );
}
