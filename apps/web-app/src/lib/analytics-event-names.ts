/**
 * Row #295 — the set of event names the public analytics ingest accepts.
 *
 * `AnalyticsEvent` (lib/analytics.ts) is a TYPE, so it cannot be iterated at
 * runtime. This list is the single runtime mirror of its `event` discriminant,
 * and the compile-time checks below make drift in EITHER direction a
 * typecheck error: a name added to the union without being added here fails
 * the first check; a name listed here that is not in the union fails the second.
 *
 * Why an allowlist at all: POST /api/analytics/events is unauthenticated by
 * design, and the server keeps its own state in the same table (alert state,
 * alert inputs). Names that no client emits (e.g. `alert_notified`) must not
 * be writable from the open internet.
 */

import type { AnalyticsEvent } from '@/lib/analytics';

export const ANALYTICS_EVENT_NAMES = [
  'analysis_run',
  'api_error',
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
  'extension_installed',
  'extension_session_active',
  'extension_signin_linked',
  'first_export',
  'first_process_map_viewed',
  'first_sop_viewed',
  'first_workflow_uploaded',
  'insight_chip_clicked',
  'insights_viewed',
  'login_completed',
  'login_failed',
  'logout',
  'nav_link_clicked',
  'nav_menu_opened',
  'onboarding_completed',
  'onboarding_dismissed',
  'onboarding_started',
  'onboarding_step_completed',
  'page_viewed',
  'payment_failed',
  'plan_limit_hit',
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
  'report_evidence_anchor_viewed',
  'report_insight_card_expanded',
  'report_insight_filter_changed',
  'report_key_action_card_viewed',
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
  'sop_mode_switched',
  'sop_section_viewed',
  'sop_step_checked',
  'sop_step_expanded',
  'sop_usefulness_response',
  'sop_viewed',
  'subscription_canceled',
  'subscription_created',
  'tab_switched',
  'tag_assigned',
  'tag_created',
  'tag_deleted',
  'tag_filter_applied',
  'tag_removed',
  'team_created',
  'team_invite_accepted',
  'team_invite_sent',
  'team_member_removed',
  'team_waitlist_clicked',
  'ui_error_boundary_triggered',
  'upgrade_blocked',
  'upgrade_clicked',
  'upgrade_prompt_viewed',
  'upload_failed',
  'variant_coverage_slider_changed',
  'variant_edge_clicked',
  'variant_legend_viewed',
  'variant_map_viewed',
  'variant_node_clicked',
  'variant_path_highlighted',
  'variant_view_toggled',
  'view_mode_changed',
  'workflow_added_to_portfolio',
  'workflow_comparison_viewed',
  'workflow_deleted',
  'workflow_exported',
  'workflow_favorited',
  'workflow_removed_from_portfolio',
  'workflow_row_clicked',
  'workflow_shared_with_team',
  'workflow_shared_with_user',
  'workflow_unfavorited',
  'workflow_uploaded',
  'workflow_viewed',
  'workspace_canceled',
  'workspace_downgraded',
] as const;

type ListedName = (typeof ANALYTICS_EVENT_NAMES)[number];
type UnionName = AnalyticsEvent['event'];

type UnionNamesAllListed = [Exclude<UnionName, ListedName>] extends [never]
  ? true
  : { missingFromList: Exclude<UnionName, ListedName> };
type ListedNamesAllInUnion = [Exclude<ListedName, UnionName>] extends [never]
  ? true
  : { notInUnion: Exclude<ListedName, UnionName> };

// Does not compile when the sets differ (the object types above are not `true`).
export const ANALYTICS_NAME_DRIFT_CHECK: [UnionNamesAllListed, ListedNamesAllInUnion] = [true, true];

const ALLOWED: ReadonlySet<string> = new Set<string>(ANALYTICS_EVENT_NAMES);

export function isAllowedAnalyticsEventName(name: unknown): boolean {
  return typeof name === 'string' && ALLOWED.has(name);
}
