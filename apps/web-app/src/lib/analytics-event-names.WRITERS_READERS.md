# Analytics event names: writers and readers (row #298)

Companion to `analytics-event-names.ts`. Generated from the source tree at the time of row #298;
line numbers are as of that commit. The emitter-scan test
(`analytics-event-names.test.ts`) is what keeps the allowlist itself in step with the code; this table
is the human-readable record of who writes and who reads each name.

Scope: `apps/web-app/src`. The Chrome extension posts to `/api/analytics/extension`, a different
endpoint with its own validation, and is out of scope.

Rule: `POST /api/analytics/events` (anonymous) accepts a name only if some browser code in this app
emits it (`track()`, `trackActivation()`, `<TrackedLink event="...">`, or an event factory passed to
`track()`). Everything else is server-only: written by `trackServer()` with `source: 'server'`.

Reader policy (events GET, `analytics/events/route.ts`): names emitted on BOTH sides and whose reader
means the server fact (`signup_completed`, `checkout_started`, `shared_workflow_viewed`) count
`source: 'server'` rows only. #57 retirement metrics and the upgrade-prompt-by-location table count only
rows with `userId` not null. The admin error panel counts `api_error` from server rows, `client_error` from client rows, and `upload_failed` from server rows or client rows with a session user (`upload_failed` is the post-parse definition; see queries.ts and compute-alerts.ts).

## Allowed names (client-emitted): 87

| Name | Client emitters (file:line) | Server emitters (`trackServer`) | Readers |
|---|---|---|---|
| `analysis_run` | src/app/(app)/analytics/page.tsx:139 | - | product page Engagement list analytics/product/page.tsx:336<br>engagement scores analytics/engagement/route.ts:65-77 (userId in users) |
| `checkout_started` | src/components/UpgradeButton.tsx:61 | src/app/api/billing/checkout/route.ts:218<br>src/app/api/billing/checkout/route.ts:417 | product page Conversion list analytics/product/page.tsx:337<br>conversion funnel events/route.ts GET (userId required) |
| `client_error` | src/app/error.tsx:25<br>src/app/global-error.tsx:39 | - | admin error panel admin-operations/queries.ts getSystemHealth (client rows only) |
| `cta_clicked` | src/app/(app)/analytics/page.tsx:297<br>src/app/(app)/analytics/page.tsx:319<br>src/app/(app)/compare/page.tsx:287<br>src/app/(public)/page.tsx:95<br>src/app/(public)/page.tsx:104<br>src/app/(public)/page.tsx:143<br>src/app/(public)/page.tsx:270<br>src/app/(public)/page.tsx:297<br>src/app/(public)/page.tsx:511<br>src/app/(public)/page.tsx:520<br>src/app/(public)/pricing/page.tsx:376<br>src/app/(public)/product/page.tsx:283<br>src/app/(public)/product/page.tsx:616<br>src/app/(public)/use-cases/ai-implementation/page.tsx:133<br>src/app/(public)/use-cases/ai-implementation/page.tsx:257<br>src/app/(public)/use-cases/compliance/page.tsx:128<br>src/app/(public)/use-cases/compliance/page.tsx:253<br>src/app/(public)/use-cases/operations/page.tsx:121<br>src/app/(public)/use-cases/operations/page.tsx:281<br>src/components/analytics/ProcessDiffView.tsx:296<br>src/components/analytics/TimeSinkRanking.tsx:127<br>src/components/analytics/TimeSinkRanking.tsx:162<br>src/components/Footer.tsx:68<br>src/components/PricingCards.tsx:246<br>src/components/PublicNav.tsx:253<br>src/components/PublicNav.tsx:319<br>src/components/seo/Blocks.tsx:105<br>src/components/seo/Blocks.tsx:183<br>src/components/seo/Blocks.tsx:210<br>src/components/seo/Blocks.tsx:241<br>src/components/seo/Blocks.tsx:253<br>src/components/seo/Blocks.tsx:370<br>src/components/seo/Blocks.tsx:448<br>src/components/seo/SopExportPanel.tsx:143<br>src/components/ServiceCheckoutButton.tsx:81<br>src/components/ServiceCheckoutButton.tsx:91<br>src/components/TrackedLink.tsx:11 | - | - |
| `dashboard_bounced` | src/components/dashboard-v2/DashboardV2Shell.tsx:747 | - | #57 retirement metrics dashboard-v2-retirement-metrics.ts (userId not null) |
| `dashboard_column_picker_opened` | src/components/dashboard-v2/DashboardV2Shell.tsx:577 | - | - |
| `dashboard_empty_state_cta_clicked` | src/components/dashboard-v2/FirstRunTutorial.tsx:119<br>src/components/dashboard-v2/FirstRunTutorial.tsx:131<br>src/components/dashboard-v2/WorkflowList.tsx:869<br>src/components/dashboard-v2/WorkflowList.tsx:878 | - | - |
| `dashboard_kpi_tile_clicked` | src/components/dashboard-v2/band/KpiTileStrip.tsx:138 | - | - |
| `dashboard_lens_changed` | src/components/dashboard-v2/DashboardV2Shell.tsx:678 | - | - |
| `dashboard_opportunity_segment_clicked` | src/components/dashboard-v2/band/OpportunityBar.tsx:114 | - | - |
| `dashboard_pareto_bar_clicked` | src/components/dashboard-v2/DashboardV2Shell.tsx:1044 | - | - |
| `dashboard_v2_filter_applied` | src/components/dashboard-v2/WorkflowListFilterBar.tsx:83<br>src/components/dashboard-v2/WorkflowListFilterBar.tsx:93<br>src/components/dashboard-v2/WorkflowListFilterBar.tsx:103<br>src/components/dashboard-v2/WorkflowListFilterBar.tsx:114 | - | - |
| `dashboard_v2_sort_changed` | src/components/dashboard-v2/WorkflowList.tsx:544 | - | - |
| `dashboard_v2_viewed` | src/components/dashboard-v2/DashboardV2Shell.tsx:414 | - | #57 retirement metrics dashboard-v2-retirement-metrics.ts (userId not null) |
| `dfg_performance_mode_toggled` | src/components/workflow-view/DfgFrequencyMap.tsx:802 | - | - |
| `extension_install_clicked` | src/lib/install.ts:85 (installClickEvent) via src/components/ExtensionInstallButton.tsx:42 | - | - |
| `first_process_map_viewed` | src/app/(app)/workflows/[id]/page.tsx:108 (trackActivation) | - | product page Activation list analytics/product/page.tsx:335<br>activation funnel events/route.ts GET (userId required)<br>engagement scores analytics/engagement/route.ts:65-77 (userId in users) |
| `first_sop_viewed` | src/app/(app)/workflows/[id]/page.tsx:94 (trackActivation) | - | product page Activation list analytics/product/page.tsx:335<br>activation funnel events/route.ts GET (userId required) |
| `first_workflow_uploaded` | src/app/(app)/upload/page.tsx:95 (trackActivation) | - | product page Activation list analytics/product/page.tsx:335 |
| `insight_chip_clicked` | src/components/dashboard-v2/InsightsStrip.tsx:131 | - | #57 retirement metrics dashboard-v2-retirement-metrics.ts (userId not null) |
| `login_completed` | src/app/(public)/login/LoginPageClient.tsx:39 | - | engagement scores analytics/engagement/route.ts:65-77 (userId in users) |
| `login_failed` | src/app/(public)/login/LoginPageClient.tsx:35 | - | - |
| `nav_link_clicked` | src/components/PublicNav.tsx:123<br>src/components/PublicNav.tsx:150<br>src/components/PublicNav.tsx:246<br>src/components/PublicNav.tsx:285<br>src/components/PublicNav.tsx:326 | - | - |
| `nav_menu_opened` | src/components/PublicNav.tsx:111<br>src/components/PublicNav.tsx:301 | - | - |
| `page_viewed` | src/app/(app)/analytics/page.tsx:133<br>src/app/(app)/analytics/process/[id]/page.tsx:386<br>src/app/(app)/dashboard/page.tsx:483<br>src/app/(app)/recommendations/page.tsx:134<br>src/app/(app)/teams/page.tsx:45<br>src/app/(app)/upload/page.tsx:50<br>src/components/analytics/ProcessDiffView.tsx:78<br>src/components/analytics/TimeSinkRanking.tsx:73 | - | top pages events/route.ts GET |
| `portfolio_created` | src/components/CreatePortfolioDialog.tsx:113 | - | engagement scores analytics/engagement/route.ts:65-77 (userId in users) |
| `portfolio_deleted` | src/components/PortfolioSidebar.tsx:146 | - | - |
| `portfolio_filter_applied` | src/components/PortfolioSidebar.tsx:168 | - | - |
| `portfolio_renamed` | src/components/PortfolioSidebar.tsx:127 | - | - |
| `preset_view_applied` | src/app/(app)/dashboard/page.tsx:779<br>src/components/dashboard-v2/DashboardV2Shell.tsx:635 | - | - |
| `process_analysis_triggered` | src/app/(app)/dashboard/page.tsx:463 | - | - |
| `process_diff_baseline_changed` | src/components/analytics/ProcessDiffView.tsx:203 | - | - |
| `process_diff_lens_toggled` | src/components/analytics/ProcessDiffView.tsx:192 | - | - |
| `process_diff_viewed` | src/components/analytics/ProcessDiffView.tsx:184 | - | - |
| `report_data_export_clicked` | src/app/(app)/workflows/[id]/page.tsx:313 | - | - |
| `report_insight_filter_changed` | src/components/detail/WorkflowReportPage.tsx:1121 | - | - |
| `report_nav_used` | src/components/detail/WorkflowReportPage.tsx:2845<br>src/components/detail/WorkflowReportPage.tsx:2915 | - | - |
| `report_print_clicked` | src/app/(app)/workflows/[id]/page.tsx:304 | - | - |
| `report_scroll_depth` | src/components/detail/WorkflowReportPage.tsx:3169 | - | - |
| `report_section_viewed` | src/components/detail/WorkflowReportPage.tsx:3144 | - | - |
| `report_step_expanded` | src/components/detail/WorkflowReportPage.tsx:1330 | - | - |
| `report_viewed` | src/components/detail/WorkflowReportPage.tsx:3111 | - | - |
| `sample_workflow_auto_seeded` | src/app/(app)/dashboard/page.tsx:504 | - | - |
| `sample_workflow_loaded` | src/app/(app)/dashboard/page.tsx:649<br>src/app/(app)/dashboard/page.tsx:670 | - | - |
| `seo_faq_expanded` | src/components/seo/FaqBlock.tsx:30 | - | - |
| `seo_hub_viewed` | src/components/seo/HubPageView.tsx:22 | - | - |
| `seo_install_clicked` | src/components/seo/Blocks.tsx:299<br>src/components/seo/Blocks.tsx:462 | - | - |
| `seo_page_viewed` | src/components/seo/SeoPageView.tsx:17 | - | - |
| `seo_related_page_clicked` | src/components/seo/Blocks.tsx:398 | - | - |
| `seo_scroll_depth` | src/components/seo/SeoPageView.tsx:36 | - | - |
| `seo_template_downloaded` | src/components/seo/SopExportPanel.tsx:48<br>src/components/seo/SopExportPanel.tsx:73 | - | - |
| `share_link_copied` | src/app/(app)/workflows/[id]/page.tsx:181 | - | - |
| `share_link_created` | src/app/(app)/workflows/[id]/page.tsx:169 | - | product page Collaboration list analytics/product/page.tsx:338<br>engagement scores analytics/engagement/route.ts:65-77 (userId in users) |
| `share_link_disabled` | src/app/(app)/workflows/[id]/page.tsx:172 | - | - |
| `shared_workflow_viewed` | src/app/(public)/share/[token]/page.tsx:36 | src/app/api/share/[token]/route.ts:44 | product page Collaboration list analytics/product/page.tsx:338 |
| `signup_completed` | src/app/(public)/signup/SignupPageClient.tsx:61 | src/app/api/auth/signup/route.ts:124 | alerts compute-alerts.ts:112,:148 (source server)<br>product page Activation list analytics/product/page.tsx:335<br>activation funnel events/route.ts GET (userId required) |
| `signup_from_shared_sop` | src/app/(public)/signup/SignupPageClient.tsx:69 | - | - |
| `sop_alignment_viewed` | src/components/sop-view/SOPPageShell.tsx:102 | - | - |
| `sop_exported` | src/components/sop-view/SOPPageShell.tsx:230<br>src/components/sop-view/SOPPageShell.tsx:253 | - | - |
| `sop_section_viewed` | src/app/(app)/workflows/[id]/page.tsx:92 | - | alerts compute-alerts.ts:116 (source client, userId not null)<br>engagement scores analytics/engagement/route.ts:65-77 (userId in users) |
| `sop_usefulness_response` | src/components/shared/SOPUsefulnessSurvey.tsx:65 | - | alerts compute-alerts.ts:192 (source client) |
| `sop_viewed` | src/components/sop-view/SOPPageShell.tsx:86 | - | - |
| `tab_switched` | src/app/(app)/workflows/[id]/page.tsx:142<br>src/components/ProcessGroupsExplorer.tsx:193 | - | product page Engagement list analytics/product/page.tsx:336 |
| `tag_assigned` | src/app/(app)/dashboard/page.tsx:565 | - | engagement scores analytics/engagement/route.ts:65-77 (userId in users) |
| `tag_created` | src/app/(app)/dashboard/page.tsx:535 | - | - |
| `tag_deleted` | src/app/(app)/dashboard/page.tsx:605 | - | - |
| `tag_filter_applied` | src/app/(app)/dashboard/page.tsx:1198 | - | - |
| `tag_removed` | src/app/(app)/dashboard/page.tsx:565 | - | - |
| `team_waitlist_clicked` | src/components/PricingCards.tsx:231 | - | - |
| `ui_error_boundary_triggered` | src/components/ErrorBoundary.tsx:100 | - | - |
| `upgrade_blocked` | src/components/UpgradeButton.tsx:78 | - | - |
| `upgrade_clicked` | src/app/(app)/teams/page.tsx:147<br>src/components/dashboard-v2/RecordingQuotaChip.tsx:81<br>src/components/dashboard-v2/WorkflowRow.tsx:358<br>src/components/UpgradeButton.tsx:47 | - | product page Conversion list analytics/product/page.tsx:337<br>conversion funnel events/route.ts GET (userId required)<br>upgradePromptByLocation upgrade-prompt-by-location.ts (userId not null) |
| `upgrade_prompt_viewed` | src/app/(app)/teams/page.tsx:77<br>src/hooks/useUpgradePromptViewed.ts:39 | - | product page Conversion list analytics/product/page.tsx:337<br>conversion funnel events/route.ts GET (userId required)<br>upgradePromptByLocation upgrade-prompt-by-location.ts (userId not null) |
| `upload_failed` | src/app/(app)/upload/page.tsx:108 | src/app/api/sync/route.ts:149<br>src/app/api/sync/route.ts:172<br>src/app/api/sync/route.ts:205<br>src/app/api/upload/route.ts:129<br>src/app/api/upload/route.ts:148<br>src/app/api/upload/route.ts:180<br>src/app/api/upload/route.ts:344 | alerts compute-alerts.ts:46,:93 (source server)<br>admin error panel admin-operations/queries.ts getSystemHealth (server rows, or client rows with userId not null) |
| `variant_coverage_slider_changed` | src/components/workflow-view/DfgFrequencyMap.tsx:818 | - | - |
| `variant_map_viewed` | src/components/workflow-view/DfgFrequencyMap.tsx:674 | - | - |
| `variant_view_toggled` | src/components/workflow-view/WorkflowVariantsMap.tsx:285<br>src/components/workflow-view/WorkflowVariantsMap.tsx:298<br>src/components/workflow-view/WorkflowVariantsMap.tsx:311<br>src/components/workflow-view/WorkflowVariantsMap.tsx:324 | - | - |
| `view_mode_changed` | src/app/(app)/dashboard/page.tsx:1014<br>src/app/(app)/dashboard/page.tsx:1028 | - | - |
| `workflow_added_to_portfolio` | src/app/(app)/dashboard/page.tsx:591 | - | - |
| `workflow_comparison_viewed` | src/app/(app)/compare/page.tsx:253 | - | - |
| `workflow_deleted` | src/app/(app)/dashboard/page.tsx:614 | - | - |
| `workflow_exported` | src/app/(app)/workflows/[id]/page.tsx:296 | - | product page Engagement list analytics/product/page.tsx:336<br>engagement scores analytics/engagement/route.ts:65-77 (userId in users) |
| `workflow_favorited` | src/app/(app)/dashboard/page.tsx:640 | - | product page Engagement list analytics/product/page.tsx:336 |
| `workflow_removed_from_portfolio` | src/app/(app)/dashboard/page.tsx:584 | - | - |
| `workflow_row_clicked` | src/components/dashboard-v2/WorkflowRow.tsx:960 | - | - |
| `workflow_unfavorited` | src/app/(app)/dashboard/page.tsx:640 | - | - |
| `workflow_viewed` | src/app/(app)/workflows/[id]/page.tsx:137 | - | product page Engagement list analytics/product/page.tsx:336<br>engagement scores analytics/engagement/route.ts:65-77 (userId in users) |

## Removed from the allowlist (no client emitter): 34

Names that were on the loop-116 allowlist (derived from the `AnalyticsEvent` union) and have no client emitter.

| Name | Client emitters (file:line) | Server emitters (`trackServer`) | Readers |
|---|---|---|---|
| `api_error` | - | src/lib/api-error-reporting.ts:69 | alerts compute-alerts.ts:178 (source server)<br>admin error panel admin-operations/queries.ts getSystemHealth (server rows only) |
| `extension_installed` | - | src/app/api/analytics/extension/route.ts:141 | - |
| `extension_session_active` | - | src/app/api/analytics/extension/route.ts:149 | - |
| `extension_signin_linked` | - | src/app/api/analytics/extension/route.ts:165 | - |
| `first_export` | - | - | - |
| `insights_viewed` | - | - | - |
| `logout` | - | - | - |
| `onboarding_completed` | - | - | - |
| `onboarding_dismissed` | - | - | - |
| `onboarding_started` | - | - | - |
| `onboarding_step_completed` | - | - | - |
| `payment_failed` | - | src/app/api/billing/webhook/route.ts:786<br>src/app/api/billing/webhook/route.ts:808 | alerts compute-alerts.ts:164 (source server) |
| `plan_limit_hit` | - | src/app/api/sync/route.ts:70<br>src/app/api/upload/route.ts:33 | product page Conversion list analytics/product/page.tsx:337<br>conversion funnel events/route.ts GET (userId required) |
| `report_evidence_anchor_viewed` | - | - | - |
| `report_insight_card_expanded` | - | - | - |
| `report_key_action_card_viewed` | - | - | - |
| `sop_mode_switched` | - | - | - |
| `sop_step_checked` | - | - | - |
| `sop_step_expanded` | - | - | - |
| `subscription_canceled` | - | src/app/api/billing/webhook/route.ts:701<br>src/app/api/billing/webhook/route.ts:761 | - |
| `subscription_created` | - | src/app/api/billing/webhook/route.ts:413 | product tile "Subscriptions" analytics/product/page.tsx:370; conversion list :337<br>conversion funnel events/route.ts GET (userId required) |
| `team_created` | - | src/app/api/teams/route.ts:139 | product page Collaboration list analytics/product/page.tsx:338 |
| `team_invite_accepted` | - | src/app/api/invites/accept/route.ts:44<br>src/app/api/invites/accept/route.ts:340 | - |
| `team_invite_sent` | - | src/app/api/teams/[id]/invite/route.ts:28<br>src/app/api/teams/[id]/invite/route.ts:264 | product page Collaboration list analytics/product/page.tsx:338 |
| `team_member_removed` | - | - | - |
| `variant_edge_clicked` | - | - | - |
| `variant_legend_viewed` | - | - | - |
| `variant_node_clicked` | - | - | - |
| `variant_path_highlighted` | - | - | - |
| `workflow_shared_with_team` | - | src/app/api/workflows/[id]/share/route.ts:179 | - |
| `workflow_shared_with_user` | - | src/app/api/workflows/[id]/share/route.ts:146 | - |
| `workflow_uploaded` | - | src/app/api/sync/route.ts:301<br>src/app/api/upload/route.ts:315 | alerts compute-alerts.ts:45,:76 (source server)<br>product tile "Workflows Created" analytics/product/page.tsx:369; engagement list :336<br>activation funnel events/route.ts GET (userId required)<br>engagement scores analytics/engagement/route.ts:65-77 (userId in users)<br>retention analytics/retention/route.ts:56 (userId in users) |
| `workspace_canceled` | - | src/app/api/billing/webhook/route.ts:709 | - |
| `workspace_downgraded` | - | src/app/api/billing/webhook/route.ts:565 | - |

## Server-only names that were never on the allowlist

| Name | Client emitters (file:line) | Server emitters (`trackServer`) | Readers |
|---|---|---|---|
| `bundle_session_id_mismatch` | - | src/app/api/sync/route.ts:164<br>src/app/api/upload/route.ts:140 | - |
| `dispute_closed` | - | src/app/api/billing/webhook/route.ts:1073 | - |
| `dispute_created` | - | src/app/api/billing/webhook/route.ts:1038 | - |
| `extension_api_key_created` | - | src/app/api/keys/route.ts:61 | - |
| `one_time_purchase_completed` | - | src/app/api/billing/webhook/route.ts:230 | - |
| `payment_action_required` | - | src/app/api/billing/webhook/route.ts:930<br>src/app/api/billing/webhook/route.ts:955 | - |
| `payment_succeeded` | - | src/app/api/billing/webhook/route.ts:844<br>src/app/api/billing/webhook/route.ts:881 | - |
| `subscription_update_skipped_stale` | - | src/app/api/billing/webhook/route.ts:500<br>src/app/api/billing/webhook/route.ts:604<br>src/app/api/billing/webhook/route.ts:653<br>src/app/api/billing/webhook/route.ts:740 | - |
| `subscription_updated` | - | src/app/api/billing/webhook/route.ts:555<br>src/app/api/billing/webhook/route.ts:624 | - |
| `trial_will_end` | - | src/app/api/billing/webhook/route.ts:1114 | - |
| `workflow_created` | - | src/app/api/upload/route.ts:305 | - |
