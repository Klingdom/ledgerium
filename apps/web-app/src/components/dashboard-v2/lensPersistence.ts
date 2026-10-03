/**
 * lensPersistence — pure rules for what the preferences PUT may carry while a
 * non-library lens is active (backlog #383; SAVED_VIEWS_DESIGN.md §6 N-D, §7).
 *
 * A non-library lens (e.g. 'lss') owns the visible column pack as a CLIENT-ONLY
 * view override. The user's saved library pack must never be replaced by it.
 */

import type { Lens } from '@/lib/dashboard-lenses/lenses.js';
import type { ColumnKey } from '@/lib/dashboard-columns/index.js';

/** The columns the top-level `visibleColumns` / `columnOrder` PUT fields carry. */
export function columnsToPersist(
  activeLens: Lens,
  visibleColumns: readonly ColumnKey[],
  libraryColumns: readonly ColumnKey[],
): readonly ColumnKey[] {
  return activeLens === 'library' ? visibleColumns : libraryColumns;
}

/**
 * Whether a column-only edit (toggle, apply preset, apply saved view) should be
 * persisted. Under a non-library lens such edits are lens-local and are not.
 */
export function shouldPersistColumnEdit(activeLens: Lens): boolean {
  return activeLens === 'library';
}
