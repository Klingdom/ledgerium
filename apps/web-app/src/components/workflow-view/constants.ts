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
}

export const CATEGORY_STYLES: Record<GroupingReason, CategoryStyle> = {
  click_then_navigate:  { label: 'Navigation',      color: '#0d9488', bg: '#f0fdfa', bgHover: '#ccfbf1', text: '#134e4a' },
  fill_and_submit:      { label: 'Form Submit',     color: '#2563eb', bg: '#eff6ff', bgHover: '#dbeafe', text: '#1e3a8a' },
  repeated_click_dedup: { label: 'Repeated Action', color: '#ea580c', bg: '#fff7ed', bgHover: '#ffedd5', text: '#9a3412' },
  single_action:        { label: 'Action',          color: '#64748b', bg: '#f8fafc', bgHover: '#f1f5f9', text: '#334155' },
  data_entry:           { label: 'Data Entry',      color: '#7c3aed', bg: '#f5f3ff', bgHover: '#ede9fe', text: '#4c1d95' },
  send_action:          { label: 'Send / Submit',   color: '#059669', bg: '#ecfdf5', bgHover: '#d1fae5', text: '#064e3b' },
  file_action:          { label: 'File Action',     color: '#d97706', bg: '#fffbeb', bgHover: '#fef3c7', text: '#92400e' },
  error_handling:       { label: 'Error Handling',  color: '#dc2626', bg: '#fef2f2', bgHover: '#fee2e2', text: '#991b1b' },
  annotation:           { label: 'Annotation',      color: '#9333ea', bg: '#faf5ff', bgHover: '#f3e8ff', text: '#581c87' },
};

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
  sequence:  { stroke: '#cbd5e1', strokeWidth: 2, animated: false },
  exception: { stroke: '#fca5a5', strokeWidth: 2, animated: false, strokeDasharray: '6 3' },
  decision:  { stroke: '#fbbf24', strokeWidth: 2, animated: false },
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
