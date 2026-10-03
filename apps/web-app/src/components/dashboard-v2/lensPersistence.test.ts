import { describe, it, expect } from 'vitest';
import { columnsToPersist, shouldPersistColumnEdit } from './lensPersistence.js';
import { LSS_COLUMN_PACK } from '@/lib/dashboard-lenses/lenses.js';
import type { ColumnKey } from '@/lib/dashboard-columns/index.js';

const library = ['workflow_title', 'health_score'] as unknown as readonly ColumnKey[];
const visible = ['workflow_title', 'run_count'] as unknown as readonly ColumnKey[];

describe('lensPersistence (#383)', () => {
  it('library lens persists the visible columns', () => {
    expect(columnsToPersist('library', visible, library)).toBe(visible);
  });
  it('lss lens persists the library pack, never the lens pack or lens edits', () => {
    expect(columnsToPersist('lss', LSS_COLUMN_PACK, library)).toBe(library);
    expect(columnsToPersist('lss', visible, library)).toBe(library);
  });
  it('column-only edits persist only on the library lens', () => {
    expect(shouldPersistColumnEdit('library')).toBe(true);
    expect(shouldPersistColumnEdit('lss')).toBe(false);
  });
});
