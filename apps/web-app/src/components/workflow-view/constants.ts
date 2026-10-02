/**
 * Workflow Format View — Shared Constants
 *
 * Light-theme color palette, category mappings, and layout constants
 * used by all visualization modes. Adapted from the engine's
 * CATEGORY_CONFIG for white-background rendering.
 */

import type { GroupingReason } from './types';

// ─── Category visual config (light theme) ────────────────────────────────────
// Colors are the same hues as the engine's CATEGORY_CONFIG but with
// light-theme-appropriate background opacities and text colors.

export interface CategoryStyle {
  label: string;
  color: string;       // Primary accent (borders, icons)
  bg: string;          // Node background (light, subtle)
  bgHover: string;     // Node background on hover/select
  text: string;        // Text on white backgrounds
  badge: string;       // Fill behind white ordinal text (>= 4.5:1 with #fff) — row #255
}

export const CATEGORY_STYLES: Record<GroupingReason, CategoryStyle> = {
  click_then_navigate:  { label: 'Navigation',      color: '#0d9488', bg: '#f0fdfa', bgHover: '#ccfbf1', text: '#134e4a', badge: '#0f766e' },
  fill_and_submit:      { label: 'Form Submit',     color: '#2563eb', bg: '#eff6ff', bgHover: '#dbeafe', text: '#1e3a8a', badge: '#2563eb' },
  repeated_click_dedup: { label: 'Repeated Action', color: '#ea580c', bg: '#fff7ed', bgHover: '#ffedd5', text: '#9a3412', badge: '#c2410c' },
  single_action:        { label: 'Action',          color: '#64748b', bg: '#f8fafc', bgHover: '#f1f5f9', text: '#334155', badge: '#64748b' },
  data_entry:           { label: 'Data Entry',      color: '#7c3aed', bg: '#f5f3ff', bgHover: '#ede9fe', text: '#4c1d95', badge: '#7c3aed' },
  send_action:          { label: 'Send / Submit',   color: '#059669', bg: '#ecfdf5', bgHover: '#d1fae5', text: '#064e3b', badge: '#047857' },
  file_action:          { label: 'File Action',     color: '#d97706', bg: '#fffbeb', bgHover: '#fef3c7', text: '#92400e', badge: '#b45309' },
  error_handling:       { label: 'Error Handling',  color: '#dc2626', bg: '#fef2f2', bgHover: '#fee2e2', text: '#991b1b', badge: '#dc2626' },
  annotation:           { label: 'Annotation',      color: '#9333ea', bg: '#faf5ff', bgHover: '#f3e8ff', text: '#581c87', badge: '#9333ea' },
};

/** White ordinal text; every CategoryStyle.badge is >= 4.5:1 against it (theme-contrast.test.ts). */
export const ORDINAL_TEXT_ON_BADGE = '#ffffff';

/** Resolve a (possibly unknown) runtime category string to its style entry. */
export function categoryStyleFor(category: string): CategoryStyle {
  return (CATEGORY_STYLES as Record<string, CategoryStyle>)[category] ?? CATEGORY_STYLES.single_action;
}

/**
 * CSS custom property holding the contrast-safe, per-theme text colour for a
 * category label (row #255). Defined in globals.css for both themes.
 */
export function categoryTextVar(category: string): string {
  const key = category in CATEGORY_STYLES ? category : 'single_action';
  return `var(--wf-cat-${key})`;
}

// ─── Node type visual config ─────────────────────────────────────────────────

export const NODE_TYPE_STYLES = {
  start:     { shape: 'rounded-rect' as const, color: '#059669', bg: '#ecfdf5', border: '#059669', label: 'Start' },
  end:       { shape: 'rounded-rect' as const, color: '#64748b', bg: '#f1f5f9', border: '#94a3b8', label: 'End' },
  task:      { shape: 'rounded-rect' as const, color: '#334155', bg: '#ffffff', border: '#e2e8f0', label: 'Task' },
  exception: { shape: 'rounded-rect' as const, color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: 'Exception' },
  decision:  { shape: 'diamond' as const,      color: '#d97706', bg: '#fffbeb', border: '#fbbf24', label: 'Decision' },
};

// ─── Edge styles ─────────────────────────────────────────────────────────────

export const EDGE_STYLES = {
  sequence:  { stroke: '#64748b', strokeWidth: 2, animated: false },
  exception: { stroke: '#dc2626', strokeWidth: 2, animated: false, strokeDasharray: '6 3' },
  decision:  { stroke: '#d97706', strokeWidth: 2, animated: false },
};

// ─── Friction severity colors ────────────────────────────────────────────────

export const FRICTION_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  high:   { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', dot: '#dc2626' },
  medium: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', dot: '#d97706' },
  low:    { bg: '#f0f9ff', text: '#075985', border: '#7dd3fc', dot: '#0284c7' },
};

// ─── Layout constants ────────────────────────────────────────────────────────

export const LAYOUT = {
  /** Width of the inspector panel in pixels. */
  inspectorWidth: 360,
  /** Minimum canvas width before inspector overlaps. */
  canvasMinWidth: 600,
  /** Height of the metadata band. */
  metadataBandHeight: 48,
  /** Height of the toolbar row. */
  toolbarHeight: 44,
  /** Height of the insights strip. */
  insightsStripHeight: 40,
  /** Default node width for React Flow. */
  nodeWidth: 280,
  /** Vertical gap between nodes. */
  nodeGapY: 80,
  /** Horizontal gap between lanes. */
  laneGapX: 60,
  /** Padding inside the canvas. */
  canvasPadding: 40,
};

// ─── Confidence thresholds ───────────────────────────────────────────────────

export function confidenceColor(value: number): { text: string; bg: string; border: string } {
  if (value >= 0.85) return { text: '#065f46', bg: '#ecfdf5', border: '#6ee7b7' };
  if (value >= 0.70) return { text: '#1e40af', bg: '#eff6ff', border: '#93c5fd' };
  return { text: '#92400e', bg: '#fffbeb', border: '#fcd34d' };
}
