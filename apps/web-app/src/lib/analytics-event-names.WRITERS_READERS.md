# Analytics event names: writers and readers (row #298)

Companion to `analytics-event-names.ts`. Generated from the source tree at the time of row #298.
Sites are cited as file + enclosing symbol, not line numbers (#302: line numbers went stale within
one commit); `xN` means N emit sites in that symbol. Search the file for the event name to find them. The emitter-scan test
(`analytics-event-names.test.ts`) is what keeps the allowlist itself in step with the code; this table
is the human-readable record of who writes and who reads each name.

Scope: `apps/web-app/src`. The Chrome extension posts to `/api/analytics/extension`, a different
endpoint with its own validation, and is out of scope.

Rule: `POST /api/analytics/events` (anonymous) accepts a name only if some browser code in this app
emits it (`track()`, `trackActivation()`, `<TrackedLink event="...">`, or an event factory passed to
`track()`). Everything else is server-only: written by `trackServer()` with `source: 'server'`.

Reader policy (events GET, `analytics/events/route.ts`): names emitted on BOTH sides and whose reader
means the server fact (`signup_completed`, `checkout_started`, `shared_workflow_viewed`) count
`source: 'server'` rows only. #57 retirement metrics (per-user aggregates, min sample, view-paired bounces; #302) and the upgrade-prompt-by-location table count only
rows with `userId` not null. The admin error panel counts `api_error` from server rows, `client_error` from client rows, and `upload_failed` from server rows or client rows with a session user (`upload_failed` is the post-parse definition; see queries.ts and compute-alerts.ts).

## Allowed names (client-emitted): 87

| Name | Client emitters (file + symbol) | Server emitters (`trackServer`) | Readers |
|---|---|---|---|
| `analysis_run` | src/app/(app)/analytics/page.tsx (AnalyticsPage) | - | product page Engagement list analytics/product/page.tsx (ProductAnalyticsPage)<br>engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |
| `checkout_started` | src/components/UpgradeButton.tsx (UpgradeButton) | src/app/api/billing/checkout/route.ts (createOneTimeCheckoutSession)<br>src/app/api/billing/checkout/route.ts (handlePOST) | product page Conversion list analytics/product/page.tsx (ProductAnalyticsPage)<br>conversion funnel events/route.ts GET (userId required) |
| `client_error` | src/app/error.tsx (GlobalError)<br>src/app/global-error.tsx (GlobalError) | - | admin error panel admin-operations/queries.ts getSystemHealth (client rows only) |
| `cta_clicked` | src/app/(app)/analytics/page.tsx (AnalyticsPage)<br>src/app/(app)/analytics/page.tsx (AnalyticsPage)<br>src/app/(app)/compare/page.tsx (ComparePage)<br>src/app/(public)/page.tsx (HomePage) x7<br>src/app/(public)/pricing/page.tsx (PricingPage)<br>src/app/(public)/product/page.tsx (ProductPage) x2<br>src/app/(public)/use-cases/ai-implementation/page.tsx (AiImplementationPage) x2<br>src/app/(public)/use-cases/compliance/page.tsx (CompliancePage) x2<br>src/app/(public)/use-cases/operations/page.tsx (OperationsUseCasePage) x2<br>src/components/analytics/ProcessDiffView.tsx (ProcessDiffView)<br>src/components/analytics/TimeSinkRanking.tsx (TimeSinkRanking) x2<br>src/components/Footer.tsx (Footer)<br>src/components/PricingCards.tsx (PricingCards)<br>src/components/PublicNav.tsx (PublicNav) x2<br>src/components/seo/Blocks.tsx (SeoHero)<br>src/components/seo/Blocks.tsx (DemoProof)<br>src/components/seo/Blocks.tsx (DemoNote)<br>src/components/seo/Blocks.tsx (BeforeYouDecide) x2<br>src/components/seo/Blocks.tsx (MidCta)<br>src/components/seo/Blocks.tsx (FinalCta)<br>src/components/seo/SopExportPanel.tsx (SopExportPanel)<br>src/components/ServiceCheckoutButton.tsx (ServiceCheckoutButton) x2<br>src/components/TrackedLink.tsx | - | - |
| `dashboard_bounced` | src/components/dashboard-v2/DashboardV2Shell.tsx (DashboardV2ShellInner) | - | #57 retirement metrics dashboard-v2-retirement-metrics.ts (userId not null) |
| `dashboard_column_picker_opened` | src/components/dashboard-v2/DashboardV2Shell.tsx (DashboardV2ShellInner) | - | - |
| `dashboard_empty_state_cta_clicked` | src/components/dashboard-v2/FirstRunTutorial.tsx (FirstRunTutorial)<br>src/components/dashboard-v2/FirstRunTutorial.tsx (FirstRunTutorial)<br>src/components/dashboard-v2/WorkflowList.tsx (WorkflowList)<br>src/components/dashboard-v2/WorkflowList.tsx (WorkflowList) | - | - |
| `dashboard_kpi_tile_clicked` | src/components/dashboard-v2/band/KpiTileStrip.tsx (TileShell) | - | - |
| `dashboard_lens_changed` | src/components/dashboard-v2/DashboardV2Shell.tsx (DashboardV2ShellInner) | - | - |
| `dashboard_opportunity_segment_clicked` | src/components/dashboard-v2/band/OpportunityBar.tsx (OpportunityBar) | - | - |
| `dashboard_pareto_bar_clicked` | src/components/dashboard-v2/DashboardV2Shell.tsx (DashboardV2ShellInner) | - | - |
| `dashboard_v2_filter_applied` | src/components/dashboard-v2/WorkflowListFilterBar.tsx (WorkflowListFilterBar)<br>src/components/dashboard-v2/WorkflowListFilterBar.tsx (WorkflowListFilterBar) x2<br>src/components/dashboard-v2/WorkflowListFilterBar.tsx (WorkflowListFilterBar) | - | - |
| `dashboard_v2_sort_changed` | src/components/dashboard-v2/WorkflowList.tsx (WorkflowList) | - | - |
| `dashboard_v2_viewed` | src/components/dashboard-v2/DashboardV2Shell.tsx (DashboardV2ShellInner) | - | #57 retirement metrics dashboard-v2-retirement-metrics.ts (userId not null) |
| `dfg_performance_mode_toggled` | src/components/workflow-view/DfgFrequencyMap.tsx (DfgFrequencyMap) | - | - |
| `extension_install_clicked` | src/lib/install.ts (installClickEvent) (installClickEvent) via src/components/ExtensionInstallButton.tsx (ExtensionInstallButton) | - | - |
| `first_process_map_viewed` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) (trackActivation) | - | product page Activation list analytics/product/page.tsx (ProductAnalyticsPage)<br>activation funnel events/route.ts GET (userId required)<br>engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |
| `first_sop_viewed` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) (trackActivation) | - | product page Activation list analytics/product/page.tsx (ProductAnalyticsPage)<br>activation funnel events/route.ts GET (userId required) |
| `first_workflow_uploaded` | src/app/(app)/upload/page.tsx (UploadPage) (trackActivation) | - | product page Activation list analytics/product/page.tsx (ProductAnalyticsPage) |
| `insight_chip_clicked` | src/components/dashboard-v2/InsightsStrip.tsx (InsightsStrip) | - | #57 retirement metrics dashboard-v2-retirement-metrics.ts (userId not null) |
| `login_completed` | src/app/(public)/login/LoginPageClient.tsx (LoginForm) | - | engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |
| `login_failed` | src/app/(public)/login/LoginPageClient.tsx (LoginForm) | - | - |
| `nav_link_clicked` | src/components/PublicNav.tsx (PublicNav)<br>src/components/PublicNav.tsx (PublicNav) x3<br>src/components/PublicNav.tsx (PublicNav) | - | - |
| `nav_menu_opened` | src/components/PublicNav.tsx (PublicNav)<br>src/components/PublicNav.tsx (PublicNav) | - | - |
| `page_viewed` | src/app/(app)/analytics/page.tsx (AnalyticsPage)<br>src/app/(app)/analytics/process/[id]/page.tsx (ProcessGroupDetailPage)<br>src/app/(app)/dashboard/page.tsx (DashboardPageContent)<br>src/app/(app)/recommendations/page.tsx (RecommendationCenterPage)<br>src/app/(app)/teams/page.tsx (TeamsPage)<br>src/app/(app)/upload/page.tsx (UploadPage)<br>src/components/analytics/ProcessDiffView.tsx (ProcessDiffView)<br>src/components/analytics/TimeSinkRanking.tsx (TimeSinkRanking) | - | top pages events/route.ts GET |
| `portfolio_created` | src/components/CreatePortfolioDialog.tsx (CreatePortfolioDialog) | - | engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |
| `portfolio_deleted` | src/components/PortfolioSidebar.tsx (PortfolioTreeNode) | - | - |
| `portfolio_filter_applied` | src/components/PortfolioSidebar.tsx (PortfolioTreeNode) | - | - |
| `portfolio_renamed` | src/components/PortfolioSidebar.tsx (PortfolioTreeNode) | - | - |
| `preset_view_applied` | src/app/(app)/dashboard/page.tsx (DashboardPageContent)<br>src/components/dashboard-v2/DashboardV2Shell.tsx (DashboardV2ShellInner) | - | - |
| `process_analysis_triggered` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `process_diff_baseline_changed` | src/components/analytics/ProcessDiffView.tsx (ProcessDiffView) | - | - |
| `process_diff_lens_toggled` | src/components/analytics/ProcessDiffView.tsx (ProcessDiffView) | - | - |
| `process_diff_viewed` | src/components/analytics/ProcessDiffView.tsx (ProcessDiffView) | - | - |
| `report_data_export_clicked` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) | - | - |
| `report_insight_filter_changed` | src/components/detail/WorkflowReportPage.tsx (InsightsFeedSection) | - | - |
| `report_nav_used` | src/components/detail/WorkflowReportPage.tsx (RightRailNavigator)<br>src/components/detail/WorkflowReportPage.tsx (MobileSectionTOC) | - | - |
| `report_print_clicked` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) | - | - |
| `report_scroll_depth` | src/components/detail/WorkflowReportPage.tsx (WorkflowReportPage) | - | - |
| `report_section_viewed` | src/components/detail/WorkflowReportPage.tsx (WorkflowReportPage) | - | - |
| `report_step_expanded` | src/components/detail/WorkflowReportPage.tsx (StepBreakdownSection) | - | - |
| `report_viewed` | src/components/detail/WorkflowReportPage.tsx (WorkflowReportPage) | - | - |
| `sample_workflow_auto_seeded` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `sample_workflow_loaded` | src/app/(app)/dashboard/page.tsx (DashboardPageContent)<br>src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `seo_faq_expanded` | src/components/seo/FaqBlock.tsx (FaqBlock) | - | - |
| `seo_hub_viewed` | src/components/seo/HubPageView.tsx (HubPageView) | - | - |
| `seo_install_clicked` | src/components/seo/Blocks.tsx (HowLedgeriumCaptures)<br>src/components/seo/Blocks.tsx (FinalCta) | - | - |
| `seo_page_viewed` | src/components/seo/SeoPageView.tsx (SeoPageView) | - | - |
| `seo_related_page_clicked` | src/components/seo/Blocks.tsx (RelatedPagesGrid) | - | - |
| `seo_scroll_depth` | src/components/seo/SeoPageView.tsx (SeoPageView) | - | - |
| `seo_template_downloaded` | src/components/seo/SopExportPanel.tsx (trackSopDownload)<br>src/components/seo/SopExportPanel.tsx (copySopMarkdown) | - | - |
| `share_link_copied` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) | - | - |
| `share_link_created` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) | - | product page Collaboration list analytics/product/page.tsx (ProductAnalyticsPage)<br>engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |
| `share_link_disabled` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) | - | - |
| `shared_workflow_viewed` | src/app/(public)/share/[token]/page.tsx (SharedWorkflowPage) | src/app/api/share/[token]/route.ts (handleGET) | product page Collaboration list analytics/product/page.tsx (ProductAnalyticsPage) |
| `signup_completed` | src/app/(public)/signup/SignupPageClient.tsx (SignupPageClient) | src/app/api/auth/signup/route.ts (handlePOST) | alerts compute-alerts.ts (computeAlerts) (second query) (source server)<br>product page Activation list analytics/product/page.tsx (ProductAnalyticsPage)<br>activation funnel events/route.ts GET (userId required) |
| `signup_from_shared_sop` | src/app/(public)/signup/SignupPageClient.tsx (SignupPageClient) | - | - |
| `sop_alignment_viewed` | src/components/sop-view/SOPPageShell.tsx (SOPPageShell) | - | - |
| `sop_exported` | src/components/sop-view/SOPPageShell.tsx (SOPPageShell)<br>src/components/sop-view/SOPPageShell.tsx (SOPPageShell) | - | - |
| `sop_section_viewed` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) | - | alerts compute-alerts.ts (computeAlerts) (source client, userId not null)<br>engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |
| `sop_usefulness_response` | src/components/shared/SOPUsefulnessSurvey.tsx (SOPUsefulnessSurvey) | - | alerts compute-alerts.ts (computeAlerts) (source client) |
| `sop_viewed` | src/components/sop-view/SOPPageShell.tsx (SOPPageShell) | - | - |
| `tab_switched` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage)<br>src/components/ProcessGroupsExplorer.tsx (ProcessGroupsExplorer) | - | product page Engagement list analytics/product/page.tsx (ProductAnalyticsPage) |
| `tag_assigned` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |
| `tag_created` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `tag_deleted` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `tag_filter_applied` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `tag_removed` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `team_waitlist_clicked` | src/components/PricingCards.tsx (PricingCards) | - | - |
| `ui_error_boundary_triggered` | src/components/ErrorBoundary.tsx (ErrorBoundary) | - | - |
| `upgrade_blocked` | src/components/UpgradeButton.tsx (UpgradeButton) | - | - |
| `upgrade_clicked` | src/app/(app)/teams/page.tsx (TeamsPage)<br>src/components/dashboard-v2/RecordingQuotaChip.tsx (RecordingQuotaChip)<br>src/components/dashboard-v2/WorkflowRow.tsx (HealthTooltip)<br>src/components/UpgradeButton.tsx (UpgradeButton) | - | product page Conversion list analytics/product/page.tsx (ProductAnalyticsPage)<br>conversion funnel events/route.ts GET (userId required)<br>upgradePromptByLocation upgrade-prompt-by-location.ts (userId not null) |
| `upgrade_prompt_viewed` | src/app/(app)/teams/page.tsx (TeamsPage)<br>src/hooks/useUpgradePromptViewed.ts (useUpgradePromptViewed) | - | product page Conversion list analytics/product/page.tsx (ProductAnalyticsPage)<br>conversion funnel events/route.ts GET (userId required)<br>upgradePromptByLocation upgrade-prompt-by-location.ts (userId not null) |
| `upload_failed` | src/app/(app)/upload/page.tsx (UploadPage) | src/app/api/sync/route.ts (handlePOST)<br>src/app/api/sync/route.ts (handlePOST) x2<br>src/app/api/upload/route.ts (handlePOST) x3<br>src/app/api/upload/route.ts (handlePOST) | alerts compute-alerts.ts (computeAlerts) (second query) (source server)<br>admin error panel admin-operations/queries.ts getSystemHealth (server rows, or client rows with userId not null) |
| `variant_coverage_slider_changed` | src/components/workflow-view/DfgFrequencyMap.tsx (DfgFrequencyMap) | - | - |
| `variant_map_viewed` | src/components/workflow-view/DfgFrequencyMap.tsx (DfgFrequencyMap) | - | - |
| `variant_view_toggled` | src/components/workflow-view/WorkflowVariantsMap.tsx (WorkflowVariantsMap)<br>src/components/workflow-view/WorkflowVariantsMap.tsx (WorkflowVariantsMap) x2<br>src/components/workflow-view/WorkflowVariantsMap.tsx (WorkflowVariantsMap) | - | - |
| `view_mode_changed` | src/app/(app)/dashboard/page.tsx (DashboardPageContent)<br>src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `workflow_added_to_portfolio` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `workflow_comparison_viewed` | src/app/(app)/compare/page.tsx (ComparePage) | - | - |
| `workflow_deleted` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `workflow_exported` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) | - | product page Engagement list analytics/product/page.tsx (ProductAnalyticsPage)<br>engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |
| `workflow_favorited` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | product page Engagement list analytics/product/page.tsx (ProductAnalyticsPage) |
| `workflow_removed_from_portfolio` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `workflow_row_clicked` | src/components/dashboard-v2/WorkflowRow.tsx (WorkflowRow) | - | - |
| `workflow_unfavorited` | src/app/(app)/dashboard/page.tsx (DashboardPageContent) | - | - |
| `workflow_viewed` | src/app/(app)/workflows/[id]/page.tsx (WorkflowDetailPage) | - | product page Engagement list analytics/product/page.tsx (ProductAnalyticsPage)<br>engagement scores analytics/engagement/route.ts (handleGET) (userId in users) |

## Removed from the allowlist (no client emitter): 34

Names that were on the loop-116 allowlist (derived from the `AnalyticsEvent` union) and have no client emitter.

| Name | Client emitters (file + symbol) | Server emitters (`trackServer`) | Readers |
|---|---|---|---|
| `api_error` | - | src/lib/api-error-reporting.ts (reportApiError) | alerts compute-alerts.ts (computeAlerts) (source server)<br>admin error panel admin-operations/queries.ts getSystemHealth (server rows only) |
| `extension_installed` | - | src/app/api/analytics/extension/route.ts (recordExtensionEvent) | - |
| `extension_session_active` | - | src/app/api/analytics/extension/route.ts (recordExtensionEvent) | - |
| `extension_signin_linked` | - | src/app/api/analytics/extension/route.ts (recordExtensionEvent) | - |
| `first_export` | - | - | - |
| `insights_viewed` | - | - | - |
| `logout` | - | - | - |
| `onboarding_completed` | - | - | - |
| `onboarding_dismissed` | - | - | - |
| `onboarding_started` | - | - | - |
| `onboarding_step_completed` | - | - | - |
| `payment_failed` | - | src/app/api/billing/webhook/route.ts (handlePOST)<br>src/app/api/billing/webhook/route.ts (handlePOST) | alerts compute-alerts.ts (computeAlerts) (source server) |
| `plan_limit_hit` | - | src/app/api/sync/route.ts (handlePOST)<br>src/app/api/upload/route.ts (handlePOST) | product page Conversion list analytics/product/page.tsx (ProductAnalyticsPage)<br>conversion funnel events/route.ts GET (userId required) |
| `report_evidence_anchor_viewed` | - | - | - |
| `report_insight_card_expanded` | - | - | - |
| `report_key_action_card_viewed` | - | - | - |
| `sop_mode_switched` | - | - | - |
| `sop_step_checked` | - | - | - |
| `sop_step_expanded` | - | - | - |
| `subscription_canceled` | - | src/app/api/billing/webhook/route.ts (handlePOST)<br>src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `subscription_created` | - | src/app/api/billing/webhook/route.ts (handlePOST) | product tile "Subscriptions" analytics/product/page.tsx (ProductAnalyticsPage); conversion list<br>conversion funnel events/route.ts GET (userId required) |
| `team_created` | - | src/app/api/teams/route.ts (handlePOST) | product page Collaboration list analytics/product/page.tsx (ProductAnalyticsPage) |
| `team_invite_accepted` | - | src/app/api/invites/accept/route.ts<br>src/app/api/invites/accept/route.ts (handlePOST) | - |
| `team_invite_sent` | - | src/app/api/teams/[id]/invite/route.ts<br>src/app/api/teams/[id]/invite/route.ts (handlePOST) | product page Collaboration list analytics/product/page.tsx (ProductAnalyticsPage) |
| `team_member_removed` | - | - | - |
| `variant_edge_clicked` | - | - | - |
| `variant_legend_viewed` | - | - | - |
| `variant_node_clicked` | - | - | - |
| `variant_path_highlighted` | - | - | - |
| `workflow_shared_with_team` | - | src/app/api/workflows/[id]/share/route.ts (handlePOST) | - |
| `workflow_shared_with_user` | - | src/app/api/workflows/[id]/share/route.ts (handlePOST) | - |
| `workflow_uploaded` | - | src/app/api/sync/route.ts (handlePOST)<br>src/app/api/upload/route.ts (handlePOST) | alerts compute-alerts.ts (computeAlerts) (second query) (source server)<br>product tile "Workflows Created" analytics/product/page.tsx (ProductAnalyticsPage); engagement list<br>activation funnel events/route.ts GET (userId required)<br>engagement scores analytics/engagement/route.ts (handleGET) (userId in users)<br>retention analytics/retention/route.ts (handleGET) (userId in users) |
| `workspace_canceled` | - | src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `workspace_downgraded` | - | src/app/api/billing/webhook/route.ts (handlePOST) | - |

## Server-only names that were never on the allowlist

| Name | Client emitters (file + symbol) | Server emitters (`trackServer`) | Readers |
|---|---|---|---|
| `bundle_session_id_mismatch` | - | src/app/api/sync/route.ts (handlePOST)<br>src/app/api/upload/route.ts (handlePOST) | - |
| `dispute_closed` | - | src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `dispute_created` | - | src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `extension_api_key_created` | - | src/app/api/keys/route.ts (handlePOST) | - |
| `one_time_purchase_completed` | - | src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `payment_action_required` | - | src/app/api/billing/webhook/route.ts (handlePOST)<br>src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `payment_succeeded` | - | src/app/api/billing/webhook/route.ts (handlePOST)<br>src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `subscription_update_skipped_stale` | - | src/app/api/billing/webhook/route.ts (handlePOST)<br>src/app/api/billing/webhook/route.ts (handlePOST) x2<br>src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `subscription_updated` | - | src/app/api/billing/webhook/route.ts (handlePOST)<br>src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `trial_will_end` | - | src/app/api/billing/webhook/route.ts (handlePOST) | - |
| `workflow_created` | - | src/app/api/upload/route.ts (handlePOST) | - |
