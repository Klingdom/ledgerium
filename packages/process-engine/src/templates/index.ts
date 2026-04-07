/**
 * Template system — public API for generating templated process maps and SOPs.
 *
 * Usage:
 *   const output = processSession(input);
 *   const artifacts = renderTemplates(output);
 *   const markdown = renderArtifactsToMarkdown(artifacts);
 *
 * With manual override:
 *   const artifacts = renderTemplates(output, { processMap: 'bpmn_informed', sop: 'enterprise' });
 */

import type { ProcessOutput } from '../types.js';
import type {
  RenderedArtifacts,
  RenderedProcessMap,
  RenderedSOP,
  ProcessMapTemplateType,
  SOPTemplateType,
  TemplateSelection,
} from '../templateTypes.js';
import { selectTemplates } from '../templateSelector.js';
import type { TemplateOverrides } from '../templateSelector.js';
import { renderProcessMap } from './processMapTemplates.js';
import { renderSOP } from './sopTemplates.js';
import { renderProcessMapMarkdown, renderSOPMarkdown } from './markdownRenderer.js';

// ─── Main orchestrator ───────────────────────────────────────────────────────

/**
 * Renders both process map and SOP using the selected (or overridden) templates.
 *
 * This is the primary public API for the template system.
 */
export function renderTemplates(
  output: ProcessOutput,
  overrides?: TemplateOverrides,
): RenderedArtifacts {
  const selection = selectTemplates(output, overrides);

  return {
    processMap: renderProcessMap(output, selection.processMap.template),
    sop: renderSOP(output, selection.sop.template),
    selection,
  };
}

/**
 * Renders templated artifacts to Markdown strings for export.
 */
export function renderArtifactsToMarkdown(
  artifacts: RenderedArtifacts,
): { processMap: string; sop: string } {
  return {
    processMap: renderProcessMapMarkdown(artifacts.processMap),
    sop: renderSOPMarkdown(artifacts.sop),
  };
}

// ─── Re-exports for direct access ────────────────────────────────────────────

export { selectTemplates } from '../templateSelector.js';
export type { TemplateOverrides } from '../templateSelector.js';
export { renderProcessMap } from './processMapTemplates.js';
export { renderSOP } from './sopTemplates.js';
export { renderProcessMapMarkdown, renderSOPMarkdown } from './markdownRenderer.js';
