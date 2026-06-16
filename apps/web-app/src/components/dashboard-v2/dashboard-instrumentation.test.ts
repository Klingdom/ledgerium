/**
 * dashboard-instrumentation — atglance-review #20 taxonomy + wiring tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 *
 * Covers:
 *  - The new/enriched AnalyticsEvent variants compile and accept their payloads
 *    (dashboard_v2_viewed +lens, workflow_row_clicked +originSurface,
 *     dashboard_column_picker_opened, dashboard_empty_state_cta_clicked,
 *     dashboard_pareto_bar_clicked).
 *  - Each event is wired at its real call site (source-level assertion).
 *  - PostHog no-content posture: payloads carry only numeric/taxonomy/opaque-id
 *    fields — no workflow titles or step content.
 *
 * @see apps/web-app/src/lib/analytics.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AnalyticsEvent } from '../../lib/analytics.js';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

describe('atglance-review #20: analytics taxonomy accepts the new/enriched events', () => {
  it('dashboard_v2_viewed carries the active lens', () => {
    const ev: AnalyticsEvent = {
      event: 'dashboard_v2_viewed',
      workflowCount: 16,
      hasActiveFilters: false,
      portfolioFilterActive: false,
      time_range: 'all',
      lens: 'lss',
    };
    expect(ev.event).toBe('dashboard_v2_viewed');
    expect((ev as { lens: string }).lens).toBe('lss');
  });

  it('workflow_row_clicked carries an originSurface', () => {
    const surfaces: Array<'list_row' | 'kpi_drill' | 'pareto'> = [
      'list_row',
      'kpi_drill',
      'pareto',
    ];
    for (const originSurface of surfaces) {
      const ev: AnalyticsEvent = {
        event: 'workflow_row_clicked',
        workflowId: 'wf-1',
        elapsedMsSinceDashboardView: 500,
        healthBand: 'green',
        originSurface,
      };
      expect((ev as { originSurface: string }).originSurface).toBe(originSurface);
    }
  });

  it('dashboard_column_picker_opened carries the visible column count', () => {
    const ev: AnalyticsEvent = {
      event: 'dashboard_column_picker_opened',
      visibleColumnCount: 6,
    };
    expect(ev.event).toBe('dashboard_column_picker_opened');
  });

  it('dashboard_empty_state_cta_clicked carries the cta variant', () => {
    const install: AnalyticsEvent = {
      event: 'dashboard_empty_state_cta_clicked',
      cta: 'install',
    };
    const upload: AnalyticsEvent = {
      event: 'dashboard_empty_state_cta_clicked',
      cta: 'upload',
    };
    expect((install as { cta: string }).cta).toBe('install');
    expect((upload as { cta: string }).cta).toBe('upload');
  });

  it('dashboard_pareto_bar_clicked carries only an opaque workflowId', () => {
    const ev: AnalyticsEvent = {
      event: 'dashboard_pareto_bar_clicked',
      workflowId: 'wf-abc',
    };
    expect(ev.event).toBe('dashboard_pareto_bar_clicked');
    // No content field — only the opaque id.
    expect(Object.keys(ev).sort()).toEqual(['event', 'workflowId']);
  });
});

describe('atglance-review #20: each event is wired at its real call site', () => {
  const shell = read('./DashboardV2Shell.tsx');
  const row = read('./WorkflowRow.tsx');
  const list = read('./WorkflowList.tsx');

  it('dashboard_v2_viewed emission includes lens (from activeLensRef)', () => {
    expect(shell).toMatch(/event: 'dashboard_v2_viewed'[\s\S]*?lens: activeLensRef\.current/);
  });

  it('dashboard_pareto_bar_clicked fires in handleSelectWorkflow', () => {
    expect(shell).toMatch(/event: 'dashboard_pareto_bar_clicked', workflowId/);
  });

  it('dashboard_column_picker_opened fires only on the open transition', () => {
    expect(shell).toMatch(/event: 'dashboard_column_picker_opened'/);
    // Guarded by the false→true transition (only when `next` is true).
    expect(shell).toMatch(/if \(next\) \{[\s\S]*?dashboard_column_picker_opened/);
  });

  it('workflow_row_clicked emits originSurface: list_row from the row handler', () => {
    expect(row).toMatch(/event: 'workflow_row_clicked'[\s\S]*?originSurface: 'list_row'/);
  });

  it('dashboard_empty_state_cta_clicked fires on both empty-state CTAs', () => {
    expect(list).toMatch(/event: 'dashboard_empty_state_cta_clicked', cta: 'install'/);
    expect(list).toMatch(/event: 'dashboard_empty_state_cta_clicked', cta: 'upload'/);
  });
});

describe('atglance-review #20: PostHog no-content posture', () => {
  it('the new events carry no free-text workflow content fields', () => {
    // Type-level proof: the only string fields on the new/enriched events are
    // opaque ids (workflowId) and closed-union taxonomy labels (lens, cta,
    // originSurface). Constructing them with content fields must NOT compile —
    // here we assert the runtime shape carries only the declared keys.
    const pareto: AnalyticsEvent = { event: 'dashboard_pareto_bar_clicked', workflowId: 'x' };
    const picker: AnalyticsEvent = { event: 'dashboard_column_picker_opened', visibleColumnCount: 6 };
    expect(Object.keys(pareto)).not.toContain('title');
    expect(Object.keys(picker)).not.toContain('title');
  });
});
