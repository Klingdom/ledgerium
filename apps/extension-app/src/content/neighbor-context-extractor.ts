/**
 * DOM-context neighbor evidence extractor for PATHE-P02 intent inference.
 *
 * Captures surrounding structural context that cannot be inferred from the
 * target element alone:
 *   - Modal/dialog heading (highest-signal structural context)
 *   - Table column header (nearest `<th>` ancestor context)
 *   - Breadcrumb trail (ordered navigation path)
 *   - Active tab label (tab-strip context)
 *   - Nearby associated labels (preceding sibling labels / `[for]` labels)
 *
 * All extracted text passes through the same safety heuristics as `label-extractor`
 * to prevent PII leakage into the evidence pipeline.
 *
 * Returns a `NeighborContextEvidence` object that is serialised into
 * `target_summary.neighborContext` in the canonical event and later passed
 * to `inferIntent()` as `input.neighborContext`.
 *
 * Determinism contract:
 *   `extractNeighborContext` is pure with respect to DOM state —
 *   same DOM structure → same output. No Date.now() / Math.random() / I/O.
 *
 * @see label-extractor.ts — primary label extraction (consumed first by engine)
 * @see packages/intent-inference/src/types.ts — NeighborContextEvidence shape
 */

/** Mirror of NeighborContextEvidence from @ledgerium/intent-inference/types.ts. */
export interface NeighborContextEvidence {
  /** Nearest modal/dialog heading; null when not inside a dialog. */
  readonly modalTitle: string | null;
  /** Column header for clicks inside a table; null when not in a table. */
  readonly tableHeader: string | null;
  /** Breadcrumb trail ordered root→leaf; empty array when no breadcrumbs found. */
  readonly breadcrumbTrail: readonly string[];
  /** Active tab label; null when no tab-strip found. */
  readonly activeTabLabel: string | null;
  /** Nearby associated label texts (preceding sibling labels, [for=id] labels). */
  readonly nearbyLabels: readonly string[];
}

// ── Safety heuristics (mirrors label-extractor.ts to prevent PII leakage) ───

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\//i;
const LONG_DIGITS_RE = /\d{5,}/;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const SSN_RE = /\d{3}-\d{2}-\d{4}/;
const CC_RE = /\b(?:\d{4}[-\s]?){3}\d{4}\b/;
const MAX_LABEL_CHARS = 80;
const MAX_LABEL_WORDS = 12;

function safeText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  if (EMAIL_RE.test(text)) return null;
  if (URL_RE.test(text)) return null;
  if (LONG_DIGITS_RE.test(text.replace(/[\s-]/g, ''))) return null;
  if (PHONE_RE.test(text)) return null;
  if (SSN_RE.test(text)) return null;
  if (CC_RE.test(text)) return null;
  if (text.split(/\s+/).length >= MAX_LABEL_WORDS) return null;
  return text.slice(0, MAX_LABEL_CHARS);
}

// ── Extraction helpers ────────────────────────────────────────────────────────

/**
 * Find the nearest modal/dialog ancestor and return its heading text.
 *
 * Traversal: walk ancestor chain up to document root looking for
 * `[role="dialog"]`, `[role="alertdialog"]`, or a `<dialog>` element.
 * Once found, extract the first heading (h1-h4 or [role="heading"]).
 *
 * Limit ancestor traversal to 20 levels to avoid performance spikes.
 */
function extractModalTitle(el: Element): string | null {
  let current: Element | null = el.parentElement;
  let depth = 0;
  while (current !== null && depth < 20) {
    const role = current.getAttribute('role');
    const isDialog =
      role === 'dialog' ||
      role === 'alertdialog' ||
      current.tagName.toLowerCase() === 'dialog';
    if (isDialog) {
      // Try aria-labelledby first
      const labelledBy = current.getAttribute('aria-labelledby');
      if (labelledBy) {
        const titleEl = current.ownerDocument.getElementById(labelledBy);
        const t = safeText(titleEl?.textContent);
        if (t !== null) return t;
      }
      // Try aria-label on dialog itself
      const dialogLabel = safeText(current.getAttribute('aria-label'));
      if (dialogLabel !== null) return dialogLabel;
      // Try first heading inside dialog
      const heading = current.querySelector('h1, h2, h3, h4, [role="heading"]');
      if (heading !== null) {
        const t = safeText(heading.textContent);
        if (t !== null) return t;
      }
      return null;
    }
    current = current.parentElement;
    depth++;
  }
  return null;
}

/**
 * Find the column header (`<th>`) for a click inside a `<table>`.
 *
 * Strategy: walk ancestor chain to find the nearest `<td>` or `<th>`;
 * then find the corresponding `<th>` in the same column index via the
 * table's header row.
 *
 * Limit traversal to 10 levels.
 */
function extractTableHeader(el: Element): string | null {
  let current: Element | null = el;
  let depth = 0;
  while (current !== null && depth < 10) {
    const tag = current.tagName.toLowerCase();
    if (tag === 'td' || tag === 'th') {
      const row = current.closest('tr');
      if (row === null) return null;
      // Find the cell's column index
      const cells = Array.from(row.children);
      const colIndex = cells.indexOf(current);
      if (colIndex < 0) return null;
      // Find the header row: look for first <tr> that contains <th> elements
      const table = current.closest('table');
      if (table === null) return null;
      const headerRow = table.querySelector('thead tr, tr:first-child');
      if (headerRow === null) return null;
      const headerCells = Array.from(headerRow.children);
      const headerCell = headerCells[colIndex];
      if (headerCell === undefined) return null;
      return safeText(headerCell.textContent);
    }
    current = current.parentElement;
    depth++;
  }
  return null;
}

/**
 * Extract the breadcrumb trail from the page.
 *
 * Looks for:
 *   1. `<nav aria-label="breadcrumb">` or `<nav [aria-label*="breadcrumb"]>`
 *   2. `[role="navigation"][aria-label*="breadcrumb"]`
 *   3. `.breadcrumb` class container
 *   4. `[aria-label="Breadcrumb"]` container
 *
 * Returns items ordered root→leaf, skipping the last item (current page)
 * to avoid redundancy with pageTitle.
 *
 * Limit to 8 breadcrumb items to cap output size.
 */
function extractBreadcrumbTrail(doc: Document): readonly string[] {
  const SELECTORS = [
    'nav[aria-label*="breadcrumb" i]',
    'nav[aria-label*="Breadcrumb" i]',
    '[role="navigation"][aria-label*="breadcrumb" i]',
    '.breadcrumb',
    '[aria-label="Breadcrumb"]',
    'ol.breadcrumb',
    'ul.breadcrumb',
  ];

  let container: Element | null = null;
  for (const sel of SELECTORS) {
    container = doc.querySelector(sel);
    if (container !== null) break;
  }
  if (container === null) return [];

  // Collect all breadcrumb item texts
  const items = Array.from(
    container.querySelectorAll('li, [role="listitem"], a, span[aria-current]'),
  );
  const texts: string[] = [];
  for (const item of items) {
    // Skip separators (aria-hidden elements)
    const ariaHidden = item.getAttribute('aria-hidden');
    if (ariaHidden === 'true') continue;
    const t = safeText(item.textContent);
    if (t !== null && !texts.includes(t)) {
      texts.push(t);
    }
    if (texts.length >= 8) break;
  }

  return texts;
}

/**
 * Extract the active tab label from a tab-strip near the target element.
 *
 * Searches for `[role="tablist"]` in the ancestor chain (up to 15 levels),
 * then finds `[role="tab"][aria-selected="true"]`.
 *
 * Falls back to a document-level search if no ancestor tablist is found.
 */
function extractActiveTabLabel(el: Element): string | null {
  // Try to find a tablist in ancestor chain first
  let current: Element | null = el.parentElement;
  let depth = 0;
  while (current !== null && depth < 15) {
    if (current.getAttribute('role') === 'tablist') {
      const activeTab = current.querySelector('[role="tab"][aria-selected="true"]');
      if (activeTab !== null) {
        return safeText(activeTab.textContent ?? activeTab.getAttribute('aria-label'));
      }
      return null;
    }
    current = current.parentElement;
    depth++;
  }

  // Document-level fallback — find any active tab on the page
  const tablist = el.ownerDocument.querySelector('[role="tablist"]');
  if (tablist !== null) {
    const activeTab = tablist.querySelector('[role="tab"][aria-selected="true"]');
    if (activeTab !== null) {
      return safeText(activeTab.textContent ?? activeTab.getAttribute('aria-label'));
    }
  }

  return null;
}

/**
 * Extract nearby associated labels for the target element.
 *
 * Sources (in order):
 *   1. `<label[for=id]>` linked to the element's id
 *   2. Immediately preceding sibling `<label>` elements
 *   3. `aria-describedby` referenced text
 *
 * Returns up to 3 safe label strings.
 */
function extractNearbyLabels(el: Element): readonly string[] {
  const doc = el.ownerDocument;
  const results: string[] = [];

  // 1. label[for=id] linked labels
  const id = el.getAttribute('id');
  if (id) {
    const linkedLabels = Array.from(doc.querySelectorAll(`label[for="${CSS.escape(id)}"]`));
    for (const label of linkedLabels) {
      const t = safeText(label.textContent);
      if (t !== null && !results.includes(t)) {
        results.push(t);
        if (results.length >= 3) return results;
      }
    }
  }

  // 2. Preceding sibling labels (up to 3 siblings back)
  let sibling: Element | null = el.previousElementSibling;
  let siblingDepth = 0;
  while (sibling !== null && siblingDepth < 3 && results.length < 3) {
    if (sibling.tagName.toLowerCase() === 'label') {
      const t = safeText(sibling.textContent);
      if (t !== null && !results.includes(t)) results.push(t);
    }
    sibling = sibling.previousElementSibling;
    siblingDepth++;
  }

  // 3. aria-describedby referenced text
  if (results.length < 3) {
    const describedBy = el.getAttribute('aria-describedby');
    if (describedBy) {
      const descEl = doc.getElementById(describedBy);
      if (descEl !== null) {
        const t = safeText(descEl.textContent);
        if (t !== null && !results.includes(t)) results.push(t);
      }
    }
  }

  return results;
}

// ── Main extractor ────────────────────────────────────────────────────────────

/**
 * Extract neighbor-context evidence for a target element.
 *
 * Called by the content-script capture pipeline immediately after
 * `extractLabel()` resolves the primary element label.
 *
 * All extracted text passes through safety heuristics before being returned.
 * Absent or empty context fields are represented as `null` or `[]` — the
 * intent-inference engine degrades gracefully when fields are absent.
 *
 * @param target — The DOM element that was interacted with.
 * @returns A `NeighborContextEvidence` object for inclusion in the canonical event.
 */
export function extractNeighborContext(target: Element): NeighborContextEvidence {
  return {
    modalTitle:      extractModalTitle(target),
    tableHeader:     extractTableHeader(target),
    breadcrumbTrail: extractBreadcrumbTrail(target.ownerDocument),
    activeTabLabel:  extractActiveTabLabel(target),
    nearbyLabels:    extractNearbyLabels(target),
  };
}
