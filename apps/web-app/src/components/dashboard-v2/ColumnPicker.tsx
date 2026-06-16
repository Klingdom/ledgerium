'use client';

/**
 * ColumnPicker — column visibility customization affordance (Path D D+4, iter-061).
 * Extended with SavedView CRUD (Path D D+5, iter-062).
 *
 * Renders a right-anchored drawer overlay triggered by a "Customize columns"
 * button. Users can toggle which columns are visible in the workflow table.
 *
 * Design rules (per WDC §6 + MR-014 §7.1 ASK-1):
 *  - Columns 0 + 1 (workflow_title, health_score) are LOCKED — always visible.
 *    They appear in the picker with a lock icon and "Always visible" label;
 *    their checkboxes are disabled.
 *  - Pending columns (availability !== 'available') appear DISABLED with a
 *    tooltip indicating when they will be available.
 *  - Available (non-locked) columns can be freely toggled on/off.
 *  - Groups are rendered in canonical order with user-friendly group headers.
 *
 * SavedView CRUD (iter-062 addition):
 *  - "Saved Views" section at the bottom of the drawer lists the user's named views.
 *  - "Save current view" button opens an inline rename input → on Enter, creates
 *    a new SavedView with the current column config.
 *  - Max 10 saved views; UI prevents creating an 11th.
 *  - Each saved view: click to apply; X icon to delete (with confirmation); click
 *    name to inline-rename (iter-031 InlineEdit pattern).
 *
 * Accessibility (iter-041 MDR-P08 / iter-034 MDR-P06 patterns honored):
 *  - Escape key closes the picker (via document keydown + focus trap).
 *  - Focus returns to the trigger button on close.
 *  - Drawer is role="dialog" with aria-modal="true" and aria-label.
 *  - Each checkbox has an associated label.
 *
 * Save semantics:
 *  - Toggle is optimistic — the local `visibleColumns` state updates immediately.
 *  - A debounced PUT is dispatched 400ms after the last toggle.
 *  - "Saving…" indicator visible while in-flight; "Saved" briefly after success.
 *  - Error toast on failure (displayed as an inline error near the footer).
 *
 * @see apps/web-app/src/lib/dashboard-columns/ — D+1 registry (types + catalog)
 * @see apps/web-app/src/lib/dashboard-columns/persistence.ts — SavedView type (D+3)
 * @see apps/web-app/src/app/api/dashboard/preferences/route.ts — D+4 API
 * @see docs/meta/WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001.md §6
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { X, Lock, Info, Bookmark, Plus, Trash2, Check } from 'lucide-react';
import {
  WORKFLOW_DASHBOARD_COLUMNS,
  type ColumnKey,
  type ColumnGroup,
} from '@/lib/dashboard-columns/index.js';
import type { SavedView } from '@/lib/dashboard-columns/persistence.js';
import type { FilterSet } from '@/lib/dashboard-columns/filters.js';

// ── Locked columns (ALWAYS visible, non-togglable) ────────────────────────────

/**
 * workflow_title (col 0) and health_score (col 1) are LOCKED per WDC §6 to
 * preserve the iter-031 inline affordances (InlineEdit rename / InlineArchiveConfirm
 * archive on workflow_title; HealthTooltip breakdown on health_score).
 */
const LOCKED_KEYS = new Set<ColumnKey>(['workflow_title', 'health_score']);

// ── Limits ────────────────────────────────────────────────────────────────────

/** Maximum saved views per user — UI prevents creating an 11th. */
const MAX_SAVED_VIEWS = 10;

/** Maximum characters in a saved view name. */
const MAX_VIEW_NAME_LENGTH = 64;

// ── Group display labels ──────────────────────────────────────────────────────

const GROUP_LABELS: Record<ColumnGroup, string> = {
  display: 'Display',
  flow: 'Workflow flow',
  step: 'Step behavior',
  variation: 'Variation',
  quality: 'Quality',
  behavior: 'Activity',
  bottleneck: 'Bottlenecks',
};

// Canonical group render order
const GROUP_ORDER: ColumnGroup[] = [
  'display',
  'flow',
  'step',
  'variation',
  'quality',
  'behavior',
  'bottleneck',
];

// ── Save state type ───────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ColumnPickerProps {
  /** Whether the picker drawer is open. */
  isOpen: boolean;
  /** Close the picker (Escape key or X button). */
  onClose: () => void;
  /** The current set of visible column keys (controlled). */
  visibleColumns: readonly ColumnKey[];
  /** Called when the user toggles a column — caller handles optimistic update + debounced PUT. */
  onToggleColumn: (key: ColumnKey, nextVisible: boolean) => void;
  /** Current save status — drives "Saving…" / "Saved" / error indicator. */
  saveStatus: SaveStatus;
  /** Error message to display when saveStatus === 'error'. */
  saveError?: string | null;
  /** Ref to the trigger button — focus returned to this on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  // ── D+5 SavedView props ────────────────────────────────────────────────────
  /** The user's current saved views array. */
  savedViews?: readonly SavedView[];
  /** The current active filters (included when saving a view). */
  currentFilters?: FilterSet;
  /**
   * Called when the user creates, renames, or deletes a saved view.
   * The caller receives the complete new array and persists it via PUT.
   */
  onSavedViewsChange?: (views: readonly SavedView[]) => void;
  /**
   * Called when the user clicks a saved view to apply it.
   * The caller updates visibleColumns, columnOrder, and filters accordingly.
   */
  onApplySavedView?: (view: SavedView) => void;
}

// ── Grouped columns ───────────────────────────────────────────────────────────

interface GroupedColumn {
  key: ColumnKey;
  label: string;
  description: string;
  availability: 'available' | 'pending-path-c-r1' | 'pending-path-c-r3';
  isLocked: boolean;
  isVisible: boolean;
}

function buildGroupedColumns(
  visibleSet: Set<ColumnKey>,
): Record<ColumnGroup, GroupedColumn[]> {
  const result: Record<ColumnGroup, GroupedColumn[]> = {
    display: [],
    flow: [],
    step: [],
    variation: [],
    quality: [],
    behavior: [],
    bottleneck: [],
  };

  for (const col of WORKFLOW_DASHBOARD_COLUMNS) {
    result[col.defaultGroup].push({
      key: col.key,
      label: col.label,
      description: col.description,
      availability: col.availability,
      isLocked: LOCKED_KEYS.has(col.key),
      isVisible: visibleSet.has(col.key) || LOCKED_KEYS.has(col.key),
    });
  }

  return result;
}

// ── SavedViewRow sub-component ────────────────────────────────────────────────

/**
 * One row in the Saved Views list.
 *
 * Supports:
 *  - Click name → apply the view
 *  - Click name while in rename mode → confirm rename (iter-031 InlineEdit pattern)
 *  - X button → delete (with inline confirmation, iter-031 InlineArchiveConfirm pattern)
 *  - Pencil affordance → enter rename mode
 */
interface SavedViewRowProps {
  view: SavedView;
  onApply: (view: SavedView) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

function SavedViewRow({ view, onApply, onRename, onDelete }: SavedViewRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(view.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const deleteConfirmRef = useRef<HTMLButtonElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  // Focus the rename input when entering rename mode
  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  // Focus the confirm-delete button when entering delete confirmation mode
  useEffect(() => {
    if (isConfirmingDelete) {
      deleteConfirmRef.current?.focus();
    }
  }, [isConfirmingDelete]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed.length === 0) {
      // Revert — don't allow empty name
      setRenameValue(view.name);
      setIsRenaming(false);
      return;
    }
    onRename(view.id, trimmed.slice(0, MAX_VIEW_NAME_LENGTH));
    setIsRenaming(false);
  }, [renameValue, view.id, view.name, onRename]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setRenameValue(view.name);
        setIsRenaming(false);
        rowRef.current?.focus();
      }
    },
    [commitRename, view.name],
  );

  if (isConfirmingDelete) {
    return (
      <div
        ref={rowRef}
        className="flex items-center gap-ds-2 px-ds-4 py-ds-2 bg-red-50 dark:bg-red-950/20"
        role="listitem"
      >
        <span className="flex-1 text-[12px] text-red-600 truncate min-w-0">
          Delete &ldquo;{view.name}&rdquo;?
        </span>
        <button
          ref={deleteConfirmRef}
          type="button"
          aria-label={`Confirm delete — ${view.name}`}
          className="
            px-ds-2 py-0.5 rounded text-[11px] font-medium
            bg-red-600 text-white
            hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
            transition-colors duration-150
          "
          onClick={() => onDelete(view.id)}
        >
          Delete
        </button>
        <button
          type="button"
          aria-label="Cancel — do not delete"
          className="
            px-ds-2 py-0.5 rounded text-[11px] font-medium
            text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
            transition-colors duration-150
          "
          onClick={() => setIsConfirmingDelete(false)}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (isRenaming) {
    return (
      <div
        ref={rowRef}
        className="flex items-center gap-ds-2 px-ds-4 py-ds-1.5"
        role="listitem"
      >
        <Bookmark size={11} className="flex-shrink-0 text-[var(--content-secondary)]" aria-hidden="true" />
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          maxLength={MAX_VIEW_NAME_LENGTH}
          aria-label="Rename saved view"
          className="
            flex-1 min-w-0 text-[12px] text-[var(--content-primary)]
            bg-[var(--surface-secondary)]
            border border-green-500
            rounded px-ds-1.5 py-0.5
            focus:outline-none focus-visible:ring-1 focus-visible:ring-green-500
          "
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={commitRename}
        />
        <button
          type="button"
          aria-label="Confirm rename"
          className="
            w-6 h-6 flex-shrink-0 flex items-center justify-center rounded
            text-green-600 hover:bg-[var(--surface-secondary)]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
          "
          onClick={commitRename}
        >
          <Check size={11} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className="
        flex items-center gap-ds-2 px-ds-4 py-ds-1.5
        hover:bg-[var(--surface-secondary)] group
        transition-colors duration-100
      "
      role="listitem"
    >
      <Bookmark size={11} className="flex-shrink-0 text-[var(--content-secondary)]" aria-hidden="true" />
      {/* Name — click to apply */}
      <button
        type="button"
        aria-label={`Apply saved view: ${view.name}`}
        className="
          flex-1 min-w-0 text-left text-[12px] text-[var(--content-primary)]
          truncate cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded
        "
        onClick={() => onApply(view)}
      >
        {view.name}
      </button>
      {/* Rename trigger — visible on hover/focus-within */}
      <button
        type="button"
        aria-label={`Rename saved view: ${view.name}`}
        className="
          w-6 h-6 flex-shrink-0 flex items-center justify-center rounded
          text-[var(--content-secondary)] opacity-0 group-hover:opacity-100
          hover:bg-[var(--surface-tertiary,var(--surface-secondary))]
          focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
          transition-opacity duration-100
        "
        onClick={() => {
          setRenameValue(view.name);
          setIsRenaming(true);
        }}
      >
        <Plus size={11} className="rotate-45" aria-hidden="true" />
      </button>
      {/* Delete trigger */}
      <button
        type="button"
        aria-label={`Delete saved view: ${view.name}`}
        className="
          w-6 h-6 flex-shrink-0 flex items-center justify-center rounded
          text-[var(--content-secondary)] opacity-0 group-hover:opacity-100
          hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20
          focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
          transition-opacity duration-100
        "
        onClick={() => setIsConfirmingDelete(true)}
      >
        <Trash2 size={11} aria-hidden="true" />
      </button>
    </div>
  );
}

// ── SavedViews section ────────────────────────────────────────────────────────

/**
 * Saved views section rendered at the bottom of the ColumnPicker drawer.
 * Manages the "save current view" inline form and the list of existing views.
 */
interface SavedViewsSectionProps {
  savedViews: readonly SavedView[];
  visibleColumns: readonly ColumnKey[];
  currentFilters: FilterSet;
  onSavedViewsChange: (views: readonly SavedView[]) => void;
  onApplySavedView: (view: SavedView) => void;
}

function SavedViewsSection({
  savedViews,
  visibleColumns,
  currentFilters,
  onSavedViewsChange,
  onApplySavedView,
}: SavedViewsSectionProps) {
  const [isSaveFormOpen, setIsSaveFormOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const saveInputRef = useRef<HTMLInputElement | null>(null);

  const isAtLimit = savedViews.length >= MAX_SAVED_VIEWS;

  // Focus the save-name input when the form opens
  useEffect(() => {
    if (isSaveFormOpen) {
      saveInputRef.current?.focus();
    }
  }, [isSaveFormOpen]);

  const handleSave = useCallback(() => {
    const trimmed = saveName.trim();
    if (trimmed.length === 0) return;
    const newView: SavedView = {
      id: crypto.randomUUID(),
      name: trimmed.slice(0, MAX_VIEW_NAME_LENGTH),
      visibleColumns,
      columnOrder: visibleColumns,
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };
    onSavedViewsChange([...savedViews, newView]);
    setSaveName('');
    setIsSaveFormOpen(false);
  }, [saveName, visibleColumns, currentFilters, savedViews, onSavedViewsChange]);

  const handleSaveKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSaveName('');
        setIsSaveFormOpen(false);
      }
    },
    [handleSave],
  );

  const handleRename = useCallback(
    (id: string, newName: string) => {
      onSavedViewsChange(
        savedViews.map((v) => (v.id === id ? { ...v, name: newName } : v)),
      );
    },
    [savedViews, onSavedViewsChange],
  );

  const handleDelete = useCallback(
    (id: string) => {
      onSavedViewsChange(savedViews.filter((v) => v.id !== id));
    },
    [savedViews, onSavedViewsChange],
  );

  return (
    <section aria-label="Saved views">
      {/* Section header */}
      <div className="px-ds-4 py-ds-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--content-secondary)]">
          Saved views
        </h3>
        {!isAtLimit && (
          <button
            type="button"
            aria-label="Save current column configuration as a named view"
            onClick={() => setIsSaveFormOpen((prev) => !prev)}
            className="
              inline-flex items-center gap-0.5
              text-[11px] font-medium text-green-600
              hover:text-green-700
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded
              transition-colors duration-150
            "
          >
            <Plus size={11} aria-hidden="true" />
            Save current view
          </button>
        )}
      </div>

      {/* Inline save form */}
      {isSaveFormOpen && (
        <div className="px-ds-4 pb-ds-2 flex items-center gap-ds-2">
          <input
            ref={saveInputRef}
            type="text"
            value={saveName}
            maxLength={MAX_VIEW_NAME_LENGTH}
            placeholder="View name…"
            aria-label="Name for saved view"
            className="
              flex-1 min-w-0 text-[12px] text-[var(--content-primary)]
              bg-[var(--surface-secondary)]
              border border-[var(--border-default)]
              rounded px-ds-2 py-ds-1
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
              placeholder:text-[var(--content-disabled,#9ca3af)]
            "
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={handleSaveKeyDown}
          />
          <button
            type="button"
            aria-label="Confirm save view"
            disabled={saveName.trim().length === 0}
            className="
              px-ds-2 py-ds-1 rounded text-[11px] font-medium
              bg-green-600 text-white
              hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
              transition-colors duration-150
            "
            onClick={handleSave}
          >
            Save
          </button>
          <button
            type="button"
            aria-label="Cancel save"
            className="
              px-ds-2 py-ds-1 rounded text-[11px] font-medium
              text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
              transition-colors duration-150
            "
            onClick={() => { setSaveName(''); setIsSaveFormOpen(false); }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* At-limit message */}
      {isAtLimit && (
        <p className="px-ds-4 pb-ds-2 text-[11px] text-[var(--content-secondary)]">
          Delete a view to save another (max {MAX_SAVED_VIEWS}).
        </p>
      )}

      {/* Saved views list */}
      {savedViews.length === 0 && !isSaveFormOpen && (
        <p className="px-ds-4 pb-ds-2 text-[11px] text-[var(--content-secondary)] italic">
          No saved views yet.
        </p>
      )}
      {savedViews.length > 0 && (
        <div role="list" aria-label="Your saved views">
          {savedViews.map((view) => (
            <SavedViewRow
              key={view.id}
              view={view}
              onApply={onApplySavedView}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ColumnPicker({
  isOpen,
  onClose,
  visibleColumns,
  onToggleColumn,
  saveStatus,
  saveError,
  triggerRef,
  savedViews = [],
  currentFilters = [],
  onSavedViewsChange,
  onApplySavedView,
}: ColumnPickerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  const visibleSet = new Set<ColumnKey>(visibleColumns);
  const grouped = buildGroupedColumns(visibleSet);

  // ── Escape key dismiss (MDR-P08 pattern — single document listener) ──────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); };
  }, [isOpen, onClose]);

  // ── Focus management ─────────────────────────────────────────────────────────
  // Move focus into the drawer when it opens; return to trigger when it closes.
  useEffect(() => {
    if (isOpen) {
      // Focus the drawer itself so screen readers announce the dialog
      drawerRef.current?.focus();
    } else {
      // Return focus to the trigger button
      triggerRef.current?.focus();
    }
  }, [isOpen, triggerRef]);

  // ── Click-outside dismiss ────────────────────────────────────────────────────
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // ── Focus trap (atglance-review #18 / FRONTEND review #7) ────────────────────
  // The drawer is role="dialog" aria-modal="true" but Tab could previously escape
  // to the page behind it. Cycle Tab / Shift+Tab within the drawer's focusable
  // children so keyboard focus stays inside the modal. Escape-close + focus-return
  // are handled by the effects above; this only contains Tab navigation.
  const handleTrapKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) {
      // No focusable child — keep focus on the drawer itself.
      e.preventDefault();
      drawer.focus();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey) {
      // Shift+Tab on the first element (or the drawer) wraps to the last.
      if (active === first || active === drawer) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab on the last element wraps to the first.
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  if (!isOpen) return null;

  const hasSavedViewCrud = onSavedViewsChange !== undefined && onApplySavedView !== undefined;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-40 flex justify-end"
      aria-hidden="false"
      onClick={handleBackdropClick}
    >
      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Customize columns"
        tabIndex={-1}
        className="
          relative z-50 flex flex-col w-80 max-h-screen bg-[var(--surface-primary)]
          border-l border-[var(--border-subtle)] shadow-xl
          focus:outline-none
        "
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleTrapKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-ds-4 py-ds-3 border-b border-[var(--border-subtle)] flex-shrink-0">
          <h2 className="text-[14px] font-semibold text-[var(--content-primary)]">
            Customize columns
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="
              flex items-center justify-center w-7 h-7 rounded
              text-[var(--content-secondary)] hover:text-[var(--content-primary)]
              transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
            "
            aria-label="Close column picker"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Save status bar */}
        <div className="px-ds-4 py-1.5 border-b border-[var(--border-subtle)] flex-shrink-0 min-h-[28px] flex items-center">
          {saveStatus === 'saving' && (
            <p className="text-[11px] text-[var(--content-secondary)]" aria-live="polite" aria-atomic="true">
              Saving…
            </p>
          )}
          {saveStatus === 'saved' && (
            <p className="text-[11px] text-green-600" aria-live="polite" aria-atomic="true">
              Saved
            </p>
          )}
          {saveStatus === 'error' && (
            <p className="text-[11px] text-red-600" aria-live="polite" aria-atomic="true">
              {saveError ?? 'Save failed — your changes were not applied.'}
            </p>
          )}
        </div>

        {/* Scrollable column list */}
        <div className="flex-1 overflow-y-auto py-ds-2" role="list" aria-label="Available columns">
          {GROUP_ORDER.map((group) => {
            const cols = grouped[group];
            if (cols.length === 0) return null;
            return (
              <section key={group} aria-label={`${GROUP_LABELS[group]} columns`}>
                <div className="px-ds-4 py-ds-1 mt-ds-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--content-secondary)]">
                    {GROUP_LABELS[group]}
                  </h3>
                </div>
                {cols.map((col) => {
                  const isPending = col.availability !== 'available';
                  const isDisabled = col.isLocked || isPending;

                  const pendingLabel =
                    col.availability === 'pending-path-c-r1' ||
                    col.availability === 'pending-path-c-r3'
                      ? 'Available in an upcoming release'
                      : null;

                  return (
                    <div
                      key={col.key}
                      role="listitem"
                      className={`
                        flex items-center gap-ds-3 px-ds-4 py-ds-2
                        ${isDisabled ? 'opacity-60' : 'hover:bg-[var(--surface-secondary)] cursor-pointer'}
                        transition-colors duration-100
                      `}
                    >
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        {col.isLocked ? (
                          <div
                            className="w-4 h-4 flex items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
                            title="This column cannot be hidden"
                            aria-label="This column cannot be hidden"
                          >
                            <Lock size={9} className="text-[var(--content-secondary)]" aria-hidden="true" />
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            id={`col-picker-${col.key}`}
                            checked={col.isVisible}
                            disabled={isPending}
                            onChange={(e) => {
                              if (!isDisabled) {
                                onToggleColumn(col.key, e.target.checked);
                              }
                            }}
                            className="
                              w-4 h-4 rounded border-[var(--border-default)]
                              text-green-600 focus:ring-green-500 focus:ring-2
                              disabled:opacity-50 disabled:cursor-not-allowed
                              cursor-pointer
                            "
                            aria-label={col.label}
                          />
                        )}
                      </div>

                      {/* Label + description */}
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => {
                          if (!isDisabled) {
                            onToggleColumn(col.key, !col.isVisible);
                          }
                        }}
                      >
                        <div className="flex items-center gap-ds-1">
                          <label
                            htmlFor={col.isLocked ? undefined : `col-picker-${col.key}`}
                            className={`
                              text-[13px] font-medium text-[var(--content-primary)] select-none
                              ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                            `}
                          >
                            {col.label}
                          </label>
                          {col.isLocked && (
                            <span className="text-[10px] text-[var(--content-secondary)] font-normal">
                              Always visible
                            </span>
                          )}
                          {isPending && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] text-[var(--content-secondary)]"
                              title={pendingLabel ?? undefined}
                            >
                              <Info size={9} aria-hidden="true" />
                              {pendingLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--content-secondary)] truncate mt-0.5">
                          {col.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>

        {/* D+5 Saved views section */}
        {hasSavedViewCrud && (
          <div className="border-t border-[var(--border-subtle)] flex-shrink-0 overflow-y-auto max-h-60">
            <SavedViewsSection
              savedViews={savedViews}
              visibleColumns={visibleColumns}
              currentFilters={currentFilters}
              onSavedViewsChange={onSavedViewsChange}
              onApplySavedView={onApplySavedView}
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-ds-4 py-ds-3 border-t border-[var(--border-subtle)] flex-shrink-0">
          <p className="text-[11px] text-[var(--content-secondary)]">
            Some columns are always visible. Others become available as more data is collected.
          </p>
        </div>
      </div>
    </div>
  );
}
