/**
 * Dashboard V2 components — barrel export.
 *
 * Named exports only. No default re-exports.
 *
 * Usage:
 *   import { DashboardV2Shell } from '@/components/dashboard-v2';
 */

export { default as DashboardV2Shell } from './DashboardV2Shell.js';
export { default as CommandHeader } from './CommandHeader.js';
export { default as InsightsStrip } from './InsightsStrip.js';
export { default as WorkflowList } from './WorkflowList.js';
export { default as WorkflowListFilterBar } from './WorkflowListFilterBar.js';
export { default as WorkflowRow } from './WorkflowRow.js';

export type { TimeRange } from './CommandHeader.js';
export type { FilterState, HealthStatusFilter } from './WorkflowListFilterBar.js';
export type { WorkflowListState } from './WorkflowList.js';
export type { WorkflowRowData } from './WorkflowRow.js';
