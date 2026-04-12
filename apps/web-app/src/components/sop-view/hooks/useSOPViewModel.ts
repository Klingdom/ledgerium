/**
 * useSOPViewModel — Transforms raw SOP data into a display-ready view model.
 * Components consume the normalized SOPViewModel; never raw engine types.
 */

import { useMemo } from 'react';
import { buildSOPViewModel } from '../adapters/sopViewModel';
import type { SOPViewModel } from '../types';

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

export function useSOPViewModel(
  rawSop: any,
  workflowRecord?: WorkflowRecord,
  templateArtifacts?: TemplateArtifacts,
): SOPViewModel | null {
  return useMemo(
    () => buildSOPViewModel(rawSop, workflowRecord, templateArtifacts),
    [rawSop, workflowRecord, templateArtifacts],
  );
}
