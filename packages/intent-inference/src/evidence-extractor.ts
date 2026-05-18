/**
 * 14-signal evidence priority pipeline (PATHE-P02 §A1).
 *
 * Each signal source is evaluated in weight-descending order.
 * Only non-empty / non-null raw text is emitted; zero-weight signals
 * (tableHeader, breadcrumbs, tabLabel, nearbyLabels) are collected
 * but contribute zero weight to the confidence formula.
 *
 * Determinism contract:
 *   Same `IntentInferenceInput` → identical `EvidenceSignal[]` array.
 *   No Date.now() / Math.random() / I/O.
 *
 * @see types.ts — EvidenceSignal, EVIDENCE_WEIGHTS
 * @see verb-classifier.ts — consumes the returned signals
 */

import type { IntentInferenceInput, EvidenceSignal, EvidenceSignalSource } from './types.js';
import { EVIDENCE_WEIGHTS } from './types.js';
import { classifyVerb } from './verb-classifier.js';
import { extractObject } from './object-extractor.js';
import { URL_PATH_VERB_MAP, CANONICAL_EVENT_TYPE_VERB_MAP } from './verbs.js';
import { matchUrlPattern } from './url-patterns.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Normalise whitespace; return null if the result is empty. */
function normalise(text: string | null | undefined): string | null {
  if (text == null) return null;
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 0 ? t : null;
}

/** Extract the last non-empty path segment of a URL route template. */
function lastPathSegment(routeTemplate: string): string | null {
  const segments = routeTemplate.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last == null || last.startsWith(':')) return null;
  return last.toLowerCase();
}

/**
 * Derive a human-readable text from the route template for use as
 * urlSemantic evidence rawText.
 */
function routeTemplateToText(routeTemplate: string): string {
  return routeTemplate
    .split('/')
    .filter(s => s.length > 0 && !s.startsWith(':'))
    .join(' ');
}

// ── Signal builders ─────────────────────────────────────────────────────────

function buildSignal(
  source: EvidenceSignalSource,
  rawText: string,
  verbText: string,
  objectText: string,
): EvidenceSignal {
  return {
    source,
    rawText,
    inferredVerb: classifyVerb(verbText),
    inferredObject: extractObject(objectText),
    weight: EVIDENCE_WEIGHTS[source],
  };
}

// ── Main extractor ──────────────────────────────────────────────────────────

/**
 * Extract all available evidence signals from an `IntentInferenceInput`.
 *
 * Signals are returned in priority order (highest weight first).
 * Zero-weight signals are appended last.
 *
 * §A1 signal inventory:
 *  1  elementText      weight 1.0
 *  2  ariaLabel        weight 1.0
 *  3  placeholder      weight 0.9
 *  4  buttonText       weight 0.9
 *  5  modalTitle       weight 0.85
 *  6  urlSemantic      weight 0.8
 *  7  pageTitle        weight 0.7
 *  8  formFieldName    weight 0.6
 *  9  applicationLabel weight 0.5
 * 10  contextWindow    weight 0.4
 * 11  tableHeader      weight 0.0 (v1 deferred)
 * 12  breadcrumbs      weight 0.0 (v1 deferred)
 * 13  tabLabel         weight 0.0 (v1 deferred)
 * 14  nearbyLabels     weight 0.0 (v1 deferred)
 */
export function extractEvidenceSignals(input: IntentInferenceInput): readonly EvidenceSignal[] {
  const signals: EvidenceSignal[] = [];

  // ── Signal 1: elementText (weight 1.0) ─────────────────────────────────
  const elementText = normalise(input.elementText);
  if (elementText !== null) {
    signals.push(buildSignal('elementText', elementText, elementText, elementText));
  }

  // ── Signal 2: ariaLabel — extracted from elementText when role indicates
  //    an interactive control with an aria-label; in PATHE-P02 v1 we re-use
  //    elementText when elementRole is 'button' | 'menuitem' | 'link', because
  //    label-extractor already resolves aria-label into the label field.
  //    Emit only when elementRole signals an ARIA-labelable interactive element.
  if (elementText !== null) {
    const role = input.elementRole?.toLowerCase() ?? '';
    if (role === 'button' || role === 'menuitem' || role === 'link' || role === 'menuitemcheckbox') {
      signals.push({
        source: 'ariaLabel',
        rawText: elementText,
        inferredVerb: classifyVerb(elementText),
        inferredObject: extractObject(elementText),
        weight: EVIDENCE_WEIGHTS.ariaLabel,
      });
    }
  }

  // ── Signal 3: placeholder — elementType 'input' | 'textarea' ───────────
  if (elementText !== null) {
    const elType = input.elementType?.toLowerCase() ?? '';
    if (elType === 'input' || elType === 'textarea') {
      signals.push({
        source: 'placeholder',
        rawText: elementText,
        inferredVerb: classifyVerb(elementText),
        inferredObject: extractObject(elementText),
        weight: EVIDENCE_WEIGHTS.placeholder,
      });
    }
  }

  // ── Signal 4: buttonText — role 'button' | 'submit' element type ────────
  if (elementText !== null) {
    const role = input.elementRole?.toLowerCase() ?? '';
    const elType = input.elementType?.toLowerCase() ?? '';
    if (role === 'button' || elType === 'button' || elType === 'submit') {
      signals.push({
        source: 'buttonText',
        rawText: elementText,
        inferredVerb: classifyVerb(elementText),
        inferredObject: extractObject(elementText),
        weight: EVIDENCE_WEIGHTS.buttonText,
      });
    }
  }

  // ── Signal 5: modalTitle — from neighborContext ─────────────────────────
  const modalTitle = normalise(input.neighborContext?.modalTitle);
  if (modalTitle !== null) {
    signals.push(buildSignal('modalTitle', modalTitle, modalTitle, modalTitle));
  }

  // ── Signal 6: urlSemantic — route template ──────────────────────────────
  const routeTemplate = normalise(input.routeTemplate);
  if (routeTemplate !== null) {
    // Try static URL pattern table first (most specific)
    const urlHint = matchUrlPattern(routeTemplate);
    // Construct a text form for rawText logging
    const rawText = routeTemplateToText(routeTemplate);

    // Derive verb from URL patterns + terminal segment map
    let urlVerb = urlHint?.verb ?? null;
    if (urlVerb === null) {
      const seg = lastPathSegment(routeTemplate);
      if (seg !== null && seg in URL_PATH_VERB_MAP) {
        urlVerb = URL_PATH_VERB_MAP[seg as keyof typeof URL_PATH_VERB_MAP] ?? null;
      }
    }

    // Derive object from URL patterns or object extractor on the raw text
    const urlObject = urlHint?.object ?? extractObject(routeTemplate.replace(/[/:]/g, ' '));

    signals.push({
      source: 'urlSemantic',
      rawText,
      inferredVerb: urlVerb,
      inferredObject: urlObject,
      weight: EVIDENCE_WEIGHTS.urlSemantic,
    });
  }

  // ── Signal 7: pageTitle ─────────────────────────────────────────────────
  const pageTitle = normalise(input.pageTitle);
  if (pageTitle !== null) {
    signals.push(buildSignal('pageTitle', pageTitle, pageTitle, pageTitle));
  }

  // ── Signal 8: formFieldName — derived from selector [name=...] ──────────
  if (input.selector !== null && input.selector !== undefined) {
    const nameMatch = /\[name=["']?([^"'\]]+)["']?\]/.exec(input.selector);
    if (nameMatch !== null && nameMatch[1] !== undefined) {
      const fieldName = nameMatch[1].replace(/[_-]/g, ' ');
      signals.push(buildSignal('formFieldName', fieldName, fieldName, fieldName));
    }
  }

  // ── Signal 9: applicationLabel ──────────────────────────────────────────
  const appLabel = normalise(input.applicationLabel);
  if (appLabel !== null) {
    signals.push(buildSignal('applicationLabel', appLabel, '', appLabel));
  }

  // ── Signal 10: contextWindow — adjacent step normalizedLabels ───────────
  if (input.contextWindowLabels != null) {
    const [prev, next] = input.contextWindowLabels;
    const ctxText = [prev, next].filter(Boolean).join(' ');
    const normCtx = normalise(ctxText);
    if (normCtx !== null) {
      signals.push({
        source: 'contextWindow',
        rawText: normCtx,
        inferredVerb: classifyVerb(normCtx),
        inferredObject: extractObject(normCtx),
        weight: EVIDENCE_WEIGHTS.contextWindow,
      });
    }
  }

  // ── Signal 11: groupingReason — used by verb-classifier Rule 3, not as
  //    separate evidence signal (weight 0 is not listed in EvidenceSignalSource).
  //    Encoded into verb classification via classifyVerb(groupingReason). ───

  // ── Signals 11–14: zero-weight DOM context (v1 deferred) ────────────────
  const tableHeader = normalise(input.neighborContext?.tableHeader);
  if (tableHeader !== null) {
    signals.push({
      source: 'tableHeader',
      rawText: tableHeader,
      inferredVerb: null,
      inferredObject: extractObject(tableHeader),
      weight: EVIDENCE_WEIGHTS.tableHeader,
    });
  }

  const breadcrumbs = input.neighborContext?.breadcrumbTrail;
  if (breadcrumbs !== undefined && breadcrumbs.length > 0) {
    const trail = breadcrumbs.join(' > ');
    signals.push({
      source: 'breadcrumbs',
      rawText: trail,
      inferredVerb: null,
      inferredObject: extractObject(trail),
      weight: EVIDENCE_WEIGHTS.breadcrumbs,
    });
  }

  const tabLabel = normalise(input.neighborContext?.activeTabLabel);
  if (tabLabel !== null) {
    signals.push({
      source: 'tabLabel',
      rawText: tabLabel,
      inferredVerb: null,
      inferredObject: extractObject(tabLabel),
      weight: EVIDENCE_WEIGHTS.tabLabel,
    });
  }

  const nearbyLabels = input.neighborContext?.nearbyLabels;
  if (nearbyLabels !== undefined && nearbyLabels.length > 0) {
    const nearby = nearbyLabels.join(' ');
    signals.push({
      source: 'nearbyLabels',
      rawText: nearby,
      inferredVerb: null,
      inferredObject: extractObject(nearby),
      weight: EVIDENCE_WEIGHTS.nearbyLabels,
    });
  }

  return signals;
}

/**
 * Derive a canonical verb from the grouping_reason field (§A2 Rule 3).
 * Used as a fallback when no text-based signal fires.
 */
export function verbFromGroupingReason(
  groupingReason: string,
  eventType: string | null,
): import('./verbs.js').CanonicalVerb | null {
  // Map groupingReason to verb
  const reasonMap: Readonly<Record<string, import('./verbs.js').CanonicalVerb>> = {
    fill_and_submit:   'submit',
    send_action:       'send',
    file_action:       'upload',
    data_entry:        'enter',
    click_then_navigate: 'navigate',
    error_handling:    'navigate',
    single_action:     'select',
    repeated_click_dedup: 'select',
    annotation:        'select',
  };

  const fromReason = reasonMap[groupingReason];
  if (fromReason !== undefined) return fromReason;

  // §A2 Rule 4: fall back to canonical event type map
  if (eventType !== null && eventType in CANONICAL_EVENT_TYPE_VERB_MAP) {
    return CANONICAL_EVENT_TYPE_VERB_MAP[eventType as keyof typeof CANONICAL_EVENT_TYPE_VERB_MAP] ?? null;
  }

  return null;
}
