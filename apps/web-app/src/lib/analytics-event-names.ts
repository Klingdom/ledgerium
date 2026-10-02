/**
 * Row #298 (supersedes the row #295 derivation) — the set of event names the
 * public analytics ingest accepts.
 *
 * WHAT THIS LIST IS: the names some BROWSER code in this app emits, and only
 * those. It is NOT derived from the `AnalyticsEvent` union in lib/analytics.ts.
 * That union means "every event this codebase names", which includes names only
 * the server emits (`subscription_created`, `api_error`, ...) and names nothing
 * emits at all. Row #295 allowlisted the whole union, so an anonymous client
 * could still write the server-only names and move the admin tiles, the admin
 * error panel and the #57 retirement metrics (MR-052 §3.1).
 *
 * WHY IT MATTERS: POST /api/analytics/events is unauthenticated by design, and
 * the server keeps its own state and facts in the same table. An anonymous
 * caller may write only facts a browser genuinely produces.
 *
 * WHAT KEEPS IT HONEST: analytics-event-names.test.ts scans the source for
 * client emitters (`track()`, `trackActivation()`, `<TrackedLink event>`, event
 * factories passed to `track()`) and asserts this list equals that set in BOTH
 * directions. Adding a client event without listing it, or removing the last
 * emitter of a listed name, fails that test. The `AnalyticsEvent` union remains
 * the typed client API; it just no longer defines what the server accepts.
 *
 * WRITERS x READERS for every name: analytics-event-names.WRITERS_READERS.md
 * (next to this file). Read it before adding, removing or filtering a name.
 *
 * Not on this list, so not writable here: every name emitted only by
 * trackServer() (lib/analytics-server.ts), and the server's own state rows
 * (e.g. `alert_notified`).
 */

export const ANALYTICS_EVENT_NAMES = [
  'analysis_run',
  'checkout_started',
  'client_error',
  'cta_clicked',
  'dashboard_bounced',
  'dashboard_column_picker_opened',
  'dashboard_empty_state_cta_clicked',
  'dashboard_kpi_tile_clicked',
  'dashboard_lens_changed',
  'dashboard_opportunity_segment_clicked',
  'dashboard_pareto_bar_clicked',
  'dashboard_v2_filter_applied',
  'dashboard_v2_sort_changed',
  'dashboard_v2_viewed',
  'dfg_performance_mode_toggled',
  'extension_install_clicked',
  'first_process_map_viewed',
  'first_sop_viewed',
  'first_workflow_uploaded',
  'insight_chip_clicked',
  'login_completed',
  'login_failed',
  'nav_link_clicked',
  'nav_menu_opened',
  'page_viewed',
  'portfolio_created',
  'portfolio_deleted',
  'portfolio_filter_applied',
  'portfolio_renamed',
  'preset_view_applied',
  'process_analysis_triggered',
  'process_diff_baseline_changed',
  'process_diff_lens_toggled',
  'process_diff_viewed',
  'report_data_export_clicked',
  'report_insight_filter_changed',
  'report_nav_used',
  'report_print_clicked',
  'report_scroll_depth',
  'report_section_viewed',
  'report_step_expanded',
  'report_viewed',
  'sample_workflow_auto_seeded',
  'sample_workflow_loaded',
  'seo_faq_expanded',
  'seo_hub_viewed',
  'seo_install_clicked',
  'seo_page_viewed',
  'seo_related_page_clicked',
  'seo_scroll_depth',
  'seo_template_downloaded',
  'share_link_copied',
  'share_link_created',
  'share_link_disabled',
  'shared_workflow_viewed',
  'signup_completed',
  'signup_from_shared_sop',
  'sop_alignment_viewed',
  'sop_exported',
  'sop_section_viewed',
  'sop_usefulness_response',
  'sop_viewed',
  'tab_switched',
  'tag_assigned',
  'tag_created',
  'tag_deleted',
  'tag_filter_applied',
  'tag_removed',
  'team_waitlist_clicked',
  'ui_error_boundary_triggered',
  'upgrade_blocked',
  'upgrade_clicked',
  'upgrade_prompt_viewed',
  'upload_failed',
  'variant_coverage_slider_changed',
  'variant_map_viewed',
  'variant_view_toggled',
  'view_mode_changed',
  'workflow_added_to_portfolio',
  'workflow_comparison_viewed',
  'workflow_deleted',
  'workflow_exported',
  'workflow_favorited',
  'workflow_removed_from_portfolio',
  'workflow_row_clicked',
  'workflow_unfavorited',
  'workflow_viewed',
] as const;

/**
 * Names emitted on BOTH sides where a reader that counts the fact means the
 * SERVER's row. The client row is the same fact seen from the browser
 * (`signup_completed` after the signup response, `checkout_started` on the
 * button click, `shared_workflow_viewed` on the share page), so counting both
 * double-counts and lets an anonymous client inflate it. Readers of these names
 * in aggregate (events GET) count `source: 'server'` rows only.
 *
 * `upload_failed` is deliberately NOT here: the server emits it for failures
 * AFTER a body parsed and was stored (the alerts read only those), while the
 * client emits a different fact the server cannot see (a network error). See
 * the definition notes in lib/compute-alerts.ts and lib/admin-operations/queries.ts.
 */
export const SERVER_FACT_BOTH_SIDES = [
  'checkout_started',
  'shared_workflow_viewed',
  'signup_completed',
] as const;

const ALLOWED: ReadonlySet<string> = new Set<string>(ANALYTICS_EVENT_NAMES);
const SERVER_FACT: ReadonlySet<string> = new Set<string>(SERVER_FACT_BOTH_SIDES);

export function isAllowedAnalyticsEventName(name: unknown): boolean {
  return typeof name === 'string' && ALLOWED.has(name);
}

/**
 * Should a stored row count in an aggregate that means the server's fact?
 * False for a client-source row of a both-sides server fact; true otherwise.
 */
export function countsAsServerFact(eventName: string, source: string | null | undefined): boolean {
  return !SERVER_FACT.has(eventName) || source === 'server';
}
