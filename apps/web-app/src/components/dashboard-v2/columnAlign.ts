/**
 * Column alignment helpers (atglance-review #15).
 *
 * Right-align numeric columns for fast scanning, driven by the registry
 * `dataType` (the SAME source of truth as WorkflowRow.formatCellValue's
 * dataType-driven formatting — NOT value-shape guessing). Lives in its own
 * module so both the table header (WorkflowList) and the cells (WorkflowRow)
 * consume it without a circular import.
 *
 *   Right-aligned: number / duration / percentage / date
 *   Left-aligned:  string / enum / boolean
 *
 * Pure + deterministic; SSR-safe; no Date/Math.random.
 */

import type { ColumnDataType } from '@/lib/dashboard-columns/index.js';

const RIGHT_ALIGNED_DATATYPES: ReadonlySet<ColumnDataType> = new Set<ColumnDataType>([
  'number',
  'duration',
  'percentage',
  'date',
]);

/** True when the column's values are numeric (and should right-align). */
export function isNumericColumn(dataType: ColumnDataType | undefined): boolean {
  return dataType !== undefined && RIGHT_ALIGNED_DATATYPES.has(dataType);
}

/** Tailwind alignment class for a column's dataType (text-right when numeric). */
export function columnAlignClass(dataType: ColumnDataType | undefined): string {
  return isNumericColumn(dataType) ? 'text-right' : 'text-left';
}
