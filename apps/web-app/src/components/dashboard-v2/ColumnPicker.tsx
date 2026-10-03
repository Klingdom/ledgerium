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

import { useEffect, useRef, useCallback, useState, useId } from 'react';
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

/** #384: state of the initial saved-views load. */
export type SavedViewsStatus = 'loading' | 'ready' | 'error';

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
   * #368: true when an active constraint (search, systems, needs-attention,
   * other chips) cannot be stored in a view; drives the hint under the name input.
   */
  filtersPartiallyCaptured?: boolean;
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
  /**
   * #384: whether the initial preferences GET has answered. 'loading' and
   * 'error' disable create/rename/delete (the list shown is not the user's
   * stored list); 'error' also shows a message + Retry. Default 'ready'.
   */
  savedViewsStatus?: SavedViewsStatus;
  /** #384: re-run the initial preferences GET (Retry button). */
  onRetrySavedViews?: () => void;
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
  const renameTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Set when Escape cancels an editor: blur must not commit, and focus returns
  // to the editor's trigger once the normal row has re-rendered (#370).
  const isCancellingRef = useRef(false);
  const pendingFocusRef = useRef<'rename' | 'delete' | null>(null);

  // Return focus to the trigger after a cancel has re-rendered the row.
  useEffect(() => {
    if (isRenaming || isConfirmingDelete) return;
    const target = pendingFocusRef.current;
    pendingFocusRef.current = null;
    if (target === 'rename') renameTriggerRef.current?.focus();
    else if (target === 'delete') deleteTriggerRef.current?.focus();
  }, [isRenaming, isConfirmingDelete]);

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

  // restoreFocus: true for Enter / the Confirm button, where the focused editor
  // unmounts and focus would fall to BODY (#373). False for blur-commits: the
  // user moved focus deliberately, so it must not be pulled back.
  const commitRename = useCallback((restoreFocus: boolean) => {
    if (isCancellingRef.current) return;
    if (restoreFocus) pendingFocusRef.current = 'rename';
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
      if (e.nativeEvent.isComposing) return; // IME composition: Enter/Escape belong to the IME
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename(true);
      } else if (e.key === 'Escape') {
        // Innermost-first (MDR-P08): cancel the edit only; the drawer's
        // document listener sees defaultPrevented and leaves the drawer open.
        e.preventDefault();
        isCancellingRef.current = true;
        pendingFocusRef.current = 'rename';
        setRenameValue(view.name);
        setIsRenaming(false);
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
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            // Cancel the confirmation only; keep the drawer open (#370).
            e.preventDefault();
            pendingFocusRef.current = 'delete';
            setIsConfirmingDelete(false);
          }
        }}
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
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
            transition-colors duration-150
          "
          onClick={() => {
            pendingFocusRef.current = 'delete';
            setIsConfirmingDelete(false);
          }}
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
            focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)]
          "
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={() => commitRename(false)}
        />
        <button
          type="button"
          aria-label="Confirm rename"
          className="
            w-6 h-6 flex-shrink-0 flex items-center justify-center rounded
            text-green-600 hover:bg-[var(--surface-secondary)]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
          "
          onClick={() => commitRename(true)}
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
        data-saved-view-apply={view.id}
        className="
          flex-1 min-w-0 text-left text-[12px] text-[var(--content-primary)]
          truncate cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:rounded
        "
        onClick={() => onApply(view)}
      >
        {view.name}
      </button>
      {/* Rename trigger — visible on hover/focus-within */}
      <button
        ref={renameTriggerRef}
        type="button"
        aria-label={`Rename saved view: ${view.name}`}
        className="
          w-6 h-6 flex-shrink-0 flex items-center justify-center rounded
          text-[var(--content-secondary)] opacity-0 group-hover:opacity-100
          hover:bg-[var(--surface-elevated)]
          focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
          transition-opacity duration-100
        "
        onClick={() => {
          isCancellingRef.current = false;
          setRenameValue(view.name);
          setIsRenaming(true);
        }}
      >
        <Plus size={11} className="rotate-45" aria-hidden="true" />
      </button>
      {/* Delete trigger */}
      <button
        ref={deleteTriggerRef}
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
  filtersPartiallyCaptured: boolean;
  onSavedViewsChange: (views: readonly SavedView[]) => void;
  onApplySavedView: (view: SavedView) => void;
  status: SavedViewsStatus;
  onRetry?: (() => void) | undefined;
  /** Polite, screen-reader-only announcement (persistent status region). */
  onAnnounce?: ((text: string) => void) | undefined;
  /** Retry outcome: null = reset, true = loaded, false = failed again. */
  onRetryOutcome?: ((ok: boolean | null) => void) | undefined;
}

function SavedViewsSection({
  savedViews,
  visibleColumns,
  currentFilters,
  filtersPartiallyCaptured,
  onSavedViewsChange,
  onApplySavedView,
  status,
  onRetry,
  onAnnounce,
  onRetryOutcome,
}: SavedViewsSectionProps) {
  const [isSaveFormOpen, setIsSaveFormOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const saveHintId = useId();
  const saveInputRef = useRef<HTMLInputElement | null>(null);
  const saveTriggerRef = useRef<HTMLButtonElement | null>(null);
  const shouldRestoreSaveFocusRef = useRef(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  // Commit paths (#373): the focused element unmounts, so focus is placed after
  // the list re-renders. 'apply' targets a view's Apply button by id.
  const pendingListFocusRef = useRef<{ kind: 'apply'; id: string } | { kind: 'save' } | null>(null);

  const isAtLimit = savedViews.length >= MAX_SAVED_VIEWS;
  // #384: until the stored list has loaded, create/rename/delete are off.
  const isReady = status === 'ready';
  const retryRef = useRef<HTMLButtonElement | null>(null);
  // True once Retry was clicked, so Retry keeps focus while the GET is in
  // flight (aria-disabled, not disabled) and focus moves on success.
  const [hasRetried, setHasRetried] = useState(false);
  // The GET must be seen in flight before an 'error' counts as "failed again"
  // (the click itself leaves status at 'error' until the parent flips it).
  const sawRetryLoadingRef = useRef(false);
  useEffect(() => {
    if (hasRetried && status === 'loading') sawRetryLoadingRef.current = true;
    if (!hasRetried || status === 'loading') return;
    if (status === 'ready') {
      sawRetryLoadingRef.current = false;
      setHasRetried(false);
      onRetryOutcome?.(true);
      onAnnounce?.(SAVED_VIEWS_LOADED_TEXT);
      saveTriggerRef.current?.focus(); // F0: Save current view
    } else {
      if (sawRetryLoadingRef.current) {
        sawRetryLoadingRef.current = false;
        onRetryOutcome?.(false);
      }
      retryRef.current?.focus(); // failed again: stay on Retry
    }
  }, [status, hasRetried, onAnnounce, onRetryOutcome]);

  // F0 (SAVED_VIEWS_DESIGN section 4): never leave focus on BODY inside the open
  // drawer. Order: Save current view, else the first row's Apply (list at the
  // limit), else the drawer itself (tabIndex=-1).
  const focusFallback = useCallback(() => {
    const save = saveTriggerRef.current;
    if (save && save.isConnected && !save.disabled) {
      save.focus();
      return;
    }
    const firstApply = sectionRef.current?.querySelector<HTMLElement>('[data-saved-view-apply]');
    if (firstApply) {
      firstApply.focus();
      return;
    }
    sectionRef.current?.closest<HTMLElement>('[role="dialog"]')?.focus();
  }, []);

  // Focus the save-name input when the form opens
  useEffect(() => {
    if (isSaveFormOpen) {
      saveInputRef.current?.focus();
    } else if (shouldRestoreSaveFocusRef.current) {
      shouldRestoreSaveFocusRef.current = false;
      saveTriggerRef.current?.focus();
    }
  }, [isSaveFormOpen]);

  useEffect(() => {
    const pending = pendingListFocusRef.current;
    pendingListFocusRef.current = null;
    if (pending) {
      if (pending.kind === 'apply') {
        const apply = Array.from(
          sectionRef.current?.querySelectorAll<HTMLElement>('[data-saved-view-apply]') ?? [],
        ).find((el) => el.getAttribute('data-saved-view-apply') === pending.id);
        if (apply) {
          apply.focus();
          return;
        }
        // Computed target not rendered (neighbour mid-confirm): F0.
        focusFallback();
        return;
      }
      if (saveTriggerRef.current && !saveTriggerRef.current.disabled) {
        saveTriggerRef.current.focus();
        return;
      }
      focusFallback();
      return;
    }
    // No computed target (rollback / reconcile): act only if focus was lost.
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) focusFallback();
  }, [savedViews, focusFallback]);

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
    pendingListFocusRef.current = { kind: 'apply', id: newView.id };
    onSavedViewsChange([...savedViews, newView]);
    setSaveName('');
    setIsSaveFormOpen(false);
  }, [saveName, visibleColumns, currentFilters, savedViews, onSavedViewsChange]);

  const handleSaveKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return; // IME composition
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        // Innermost-first (MDR-P08): cancel the form only, drawer stays open (#370).
        e.preventDefault();
        shouldRestoreSaveFocusRef.current = true;
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
      // Target computed before removal: next row, else previous, else Save button.
      const i = savedViews.findIndex((v) => v.id === id);
      const neighbour = savedViews[i + 1] ?? savedViews[i - 1];
      pendingListFocusRef.current = neighbour
        ? { kind: 'apply', id: neighbour.id }
        : { kind: 'save' };
      onSavedViewsChange(savedViews.filter((v) => v.id !== id));
    },
    [savedViews, onSavedViewsChange],
  );

  return (
    <section ref={sectionRef} aria-label="Saved views" aria-busy={status === 'loading'}>
      {/* Section header */}
      <div className="px-ds-4 py-ds-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--content-secondary)]">
          Saved views
        </h3>
        {!isAtLimit && (
          <button
            ref={saveTriggerRef}
            type="button"
            aria-label="Save current column configuration as a named view"
            disabled={!isReady}
            onClick={() => setIsSaveFormOpen((prev) => !prev)}
            className="
              inline-flex items-center gap-0.5
              text-[11px] font-medium text-green-600
              hover:underline
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:rounded
              disabled:opacity-50 disabled:cursor-not-allowed
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
        <div className="px-ds-4 pb-ds-2">
        <div className="flex items-center gap-ds-2">
          <input
            ref={saveInputRef}
            type="text"
            value={saveName}
            maxLength={MAX_VIEW_NAME_LENGTH}
            placeholder="View name…"
            aria-label="Name for saved view"
            aria-describedby={filtersPartiallyCaptured ? saveHintId : undefined}
            className="
              flex-1 min-w-0 text-[12px] text-[var(--content-primary)]
              bg-[var(--surface-secondary)]
              border border-[var(--border-default)]
              rounded px-ds-2 py-ds-1
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
              placeholder:text-[#9ca3af]
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
              bg-brand-700 text-white
              hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
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
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
              transition-colors duration-150
            "
            onClick={() => {
              shouldRestoreSaveFocusRef.current = true;
              setSaveName('');
              setIsSaveFormOpen(false);
            }}
          >
            Cancel
          </button>
        </div>
        {/* #368: no silent partial capture. Shown only while an active filter
            cannot be stored in the view. */}
        {filtersPartiallyCaptured && (
          <p id={saveHintId} className="mt-ds-1 text-[11px] text-[var(--content-secondary)]">
            Your search and some filters won&apos;t be saved with this view.
          </p>
        )}
        </div>
      )}

      {/* At-limit message */}
      {isAtLimit && (
        <p className="px-ds-4 pb-ds-2 text-[11px] text-[var(--content-secondary)]">
          Delete a view to save another (max {MAX_SAVED_VIEWS}).
        </p>
      )}

      {/* #384: stored list not loaded — never imply the user has no views */}
      {(status === 'error' || hasRetried) && !isReady && (
        <div className="px-ds-4 pb-ds-2 flex items-center gap-ds-2">
          <p className="text-[11px] text-[var(--content-secondary)]">
            {LOAD_ERROR_TEXT}
          </p>
          <button
            ref={retryRef}
            type="button"
            aria-disabled={status === 'loading'}
            onClick={() => {
              if (status === 'loading') return;
              setHasRetried(true);
              onRetry?.();
            }}
            className="
              text-[11px] font-medium text-green-600 hover:text-green-700 underline
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:rounded
            "
          >
            Retry
          </button>
        </div>
      )}

      {/* Saved views list */}
      {isReady && savedViews.length === 0 && !isSaveFormOpen && (
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

// ── Live regions ──────────────────────────────────────────────────────────────

const APPLIED_VIEW_PREFIX = 'Applied view: ';
const SAVED_VIEWS_LOADED_TEXT = 'Saved views loaded.';
const LOAD_ERROR_TEXT = "Couldn't load your saved views.";

/**
 * One polite role="status" and one role="alert" region, mounted with the drawer
 * even when empty (screen readers skip regions that appear together with their
 * text). Text is withheld for the first tick so a pending error present at open
 * is a text change, not part of the mount.
 */
function LiveRegions({
  statusText,
  isStatusVisual,
  alertText,
}: {
  statusText: string;
  isStatusVisual: boolean;
  alertText: string;
}) {
  const [isArmed, setIsArmed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setIsArmed(true), 0);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true">
        <span className={isStatusVisual ? 'text-[11px] text-green-600' : 'sr-only'}>
          {isArmed ? statusText : ''}
        </span>
      </div>
      <div role="alert" aria-atomic="true">
        <span className="text-[11px] text-red-600">{isArmed ? alertText : ''}</span>
      </div>
    </>
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
  filtersPartiallyCaptured = false,
  onSavedViewsChange,
  onApplySavedView,
  savedViewsStatus = 'ready',
  onRetrySavedViews,
}: ColumnPickerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Persistent live regions: text only changes; "Saving..." stays visual.
  const [live, setLive] = useState<{ text: string; isVisual: boolean }>({ text: '', isVisual: false });
  const [retryOutcome, setRetryOutcome] = useState<boolean | null>(null);
  const announce = useCallback((text: string) => {
    // Identical text is not re-announced by screen readers; alternate a trailing
    // no-break space so a repeated apply of the same view is read again.
    setLive((prev) => ({ text: prev.text === text ? `${text} ` : text, isVisual: false }));
  }, []);
  useEffect(() => {
    if (!isOpen) {
      setLive({ text: '', isVisual: false });
      return;
    }
    if (saveStatus === 'saved') setLive({ text: 'Saved', isVisual: true });
    else setLive((prev) => (prev.isVisual ? { text: '', isVisual: false } : prev));
  }, [saveStatus, isOpen]);
  useEffect(() => {
    if (savedViewsStatus !== 'error') setRetryOutcome(null);
  }, [savedViewsStatus]);
  const handleApplyWithAnnouncement = useCallback(
    (view: SavedView) => {
      onApplySavedView?.(view);
      announce(`${APPLIED_VIEW_PREFIX}${view.name}`);
    },
    [onApplySavedView, announce],
  );
  const alertText =
    saveStatus === 'error'
      ? (saveError ?? 'Save failed — your changes were not applied.')
      : retryOutcome === false && savedViewsStatus === 'error'
        ? LOAD_ERROR_TEXT
        : '';

  const visibleSet = new Set<ColumnKey>(visibleColumns);
  const grouped = buildGroupedColumns(visibleSet);

  // ── Escape key dismiss (MDR-P08 pattern — single document listener) ──────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // An inner editor (saved-view rename / new-name / delete-confirm) that
      // handled this Escape has called preventDefault(); it owns the key (#370).
      if (e.key === 'Escape' && !e.defaultPrevented) {
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
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
            "
            aria-label="Close column picker"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Save status bar */}
        <div className="px-ds-4 py-1.5 border-b border-[var(--border-subtle)] flex-shrink-0 min-h-[28px] flex items-center">
          {saveStatus === 'saving' && (
            <p className="text-[11px] text-[var(--content-secondary)]" aria-hidden="true">
              Saving…
            </p>
          )}
          <LiveRegions
            statusText={live.text}
            isStatusVisual={live.isVisual}
            alertText={alertText}
          />
        </div>

        {/* Scrollable column list */}
        <div className="flex-1 overflow-y-auto py-ds-2" role="group" aria-label="Available columns">
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
                {/* Row #105: listitems need a list parent; the wrapper that used to
                    carry role="list" had <section>s between it and its items
                    (axe aria-required-children / aria-required-parent). */}
                <div role="list">
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
                            role="img"
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
                              text-green-600 focus:ring-[var(--focus-ring)] focus:ring-2
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
                </div>
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
              filtersPartiallyCaptured={filtersPartiallyCaptured}
              onSavedViewsChange={onSavedViewsChange}
              onApplySavedView={handleApplyWithAnnouncement}
              status={savedViewsStatus}
              onRetry={onRetrySavedViews}
              onAnnounce={announce}
              onRetryOutcome={setRetryOutcome}
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
