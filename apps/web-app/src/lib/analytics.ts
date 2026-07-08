/**
 * Ledgerium AI — Product Analytics System
 *
 * Comprehensive event tracking for measuring activation, engagement,
 * retention, and conversion across all product flows.
 *
 * Architecture:
 * - Client-side: track() for UI events (page views, clicks, feature usage)
 * - Server-side: trackServer() for backend events (uploads, billing, API)
 * - Both share the same event taxonomy and enrichment
 * - Events are buffered client-side and logged server-side
 * - Ready for PostHog/Segment/Mixpanel integration via sendToBackend()
 *
 * Event naming: snake_case, action-oriented, grouped by category
 * Metadata: consistent structure, no PII, useful for analysis
 *
 * PostHog integration: all track() calls also forward to PostHog
 * when NEXT_PUBLIC_POSTHOG_KEY is configured in the environment.
 */

import { captureEvent as posthogCapture, identifyUser as posthogIdentify, isPostHogEnabled } from './posthog';
import type { NavItemId } from '@/components/nav/navConfig';

// ─── Event taxonomy ──────────────────────────────────────────────────────────

export type AnalyticsEvent =
  // ── Authentication ────────────────────────────────────────────────────────
  | { event: 'signup_completed'; [utm: string]: unknown }
  | { event: 'login_completed' }
  | { event: 'login_failed'; reason: string }
  | { event: 'logout' }

  // ── Onboarding ────────────────────────────────────────────────────────────
  | { event: 'onboarding_started' }
  | { event: 'onboarding_step_completed'; step: string }
  | { event: 'onboarding_completed'; durationMs: number }
  | { event: 'onboarding_dismissed' }

  // ── Activation (first-time milestones) ────────────────────────────────────
  | { event: 'first_workflow_uploaded'; stepCount: number; systemCount: number }
  | { event: 'first_sop_viewed'; workflowId: string }
  | { event: 'first_process_map_viewed'; workflowId: string }
  | { event: 'first_export'; format: string }

  // ── Workflow lifecycle ────────────────────────────────────────────────────
  | { event: 'workflow_uploaded'; stepCount: number; systemCount: number; durationMs?: number }
  | { event: 'workflow_viewed'; workflowId: string; tab: string }
  | { event: 'workflow_exported'; workflowId: string; format: string }
  | { event: 'workflow_deleted'; workflowId: string }
  | { event: 'workflow_favorited'; workflowId: string }
  | { event: 'workflow_unfavorited'; workflowId: string }
  | { event: 'sample_workflow_loaded' }
  | { event: 'sample_workflow_auto_seeded' }

  // ── Feature usage ─────────────────────────────────────────────────────────
  | { event: 'tab_switched'; tab: string; workflowId?: string }
  | { event: 'sop_section_viewed'; workflowId: string; durationMs: number }
  | { event: 'analysis_run'; workflowId?: string }
  | { event: 'insights_viewed'; workflowId: string; insightCount: number }

  // ── SOP world-class instrumentation (ANALYTICS_SOP_WORLDCLASS, 2026-06-15) ──
  // PII-free: positions / counts / taxonomy only. No SOP titles or step content.
  | {
      event: 'sop_viewed';
      workflowId: string;
      stepCount: number;
      runCount: number;
      hasAlignmentData: boolean;
      hasDriftData: boolean;
      averageConfidence: number;
      frictionCount: number;
      sopMode: 'execution' | 'visual' | 'intelligence';
    }
  | {
      event: 'sop_step_expanded';
      workflowId: string;
      stepOrdinal: number;
      stepCategory: string;
      instructionCount: number;
      hasHighFriction: boolean;
      elapsedMsSinceSopView: number;
    }
  | {
      event: 'sop_step_checked';
      workflowId: string;
      stepOrdinal: number;
      allChecked: boolean;
      elapsedMsSinceSopView: number;
    }
  | {
      event: 'sop_mode_switched';
      workflowId: string;
      fromMode: 'execution' | 'visual' | 'intelligence';
      toMode: 'execution' | 'visual' | 'intelligence';
      elapsedMsSinceSopView: number;
    }
  | {
      event: 'sop_exported';
      workflowId: string;
      format: string; // 'markdown' | 'pdf' (taxonomy only)
      stepCount: number;
      runCount: number;
    }
  | {
      event: 'sop_alignment_viewed';
      workflowId: string;
      alignmentScore: number; // 0-1, 2dp
      alignmentLevel: string; // 'high' | 'moderate' | 'low' | 'critical'
      totalRunCount: number;
      driftScore: number; // 0-100
      driftLevel: string;
    }

  // ── Variants tab — Celonis frequency map (ANALYTICS_PLAN.md, 2026-06-17) ──────
  // PII-free: opaque workflowId; numeric/taxonomy props only.
  // No step titles, node labels, or content strings in any payload.
  | {
      event: 'variant_map_viewed';
      workflowId: string;
      /** Total runs feeding the DFG. */
      totalRuns: number;
      /** Number of distinct variant paths (≥ 2 to reach this view). */
      variantCount: number;
      /** Standard-path frequency, 2 dp (0.00–1.00). */
      standardFrequency: number;
      /** Number of decision points (divergence nodes) in the flow model. */
      decisionPointCount: number;
      /** Which sub-view the user landed on: 'frequency_map' | 'dna' | 'list'. */
      initialView: 'frequency_map' | 'dna' | 'list';
    }
  | {
      event: 'variant_view_toggled';
      workflowId: string;
      fromView: 'map' | 'frequency_map' | 'dna' | 'list';
      toView: 'map' | 'frequency_map' | 'dna' | 'list';
      /** Milliseconds since variant_map_viewed fired. */
      elapsedMsSinceVariantView: number;
    }
  | {
      event: 'variant_coverage_slider_changed';
      workflowId: string;
      /** Coverage threshold at slider release (0–100, integer percent).
       *  Fire on debounced final value only — not on every tick. */
      coveragePct: number;
      /** Variant paths visible at the chosen coverage threshold. */
      visibleVariantCount: number;
      /** Total variant paths before filtering. */
      totalVariantCount: number;
      /** Milliseconds since variant_map_viewed fired. */
      elapsedMsSinceVariantView: number;
    }
  | {
      event: 'variant_path_highlighted';
      workflowId: string;
      /** PathRole taxonomy label: 'standard' | 'fastest' | 'longest' | 'exception' | 'variant'. */
      pathRole: 'standard' | 'fastest' | 'longest' | 'exception' | 'variant';
      /** Frequency of the highlighted path, 2 dp. */
      pathFrequency: number;
      /** Run count of the highlighted path. */
      pathRunCount: number;
      /** Milliseconds since variant_map_viewed fired. */
      elapsedMsSinceVariantView: number;
    }
  | {
      event: 'variant_node_clicked';
      workflowId: string;
      /** Category from CATEGORY_STYLES taxonomy — no label content.
       *  e.g. 'single_action' | 'navigation' | 'error_handling' | 'decision' */
      nodeCategory: string;
      /** Whether this node is a decision/divergence point. */
      isDecisionPoint: boolean;
      /** Whether the node is on the standard path spine. */
      isOnStandardPath: boolean;
      /** Milliseconds since variant_map_viewed fired. */
      elapsedMsSinceVariantView: number;
    }
  | {
      event: 'variant_edge_clicked';
      workflowId: string;
      /** Edge frequency weight, 2 dp (fraction of total runs traversing this edge). */
      edgeFrequency: number;
      /** Whether this edge is on the standard path. */
      isStandardEdge: boolean;
      /** Milliseconds since variant_map_viewed fired. */
      elapsedMsSinceVariantView: number;
    }
  | {
      event: 'variant_legend_viewed';
      workflowId: string;
      /** Which legend/help surface was opened: 'map_legend' | 'coverage_help'. */
      surface: 'map_legend' | 'coverage_help';
      /** Milliseconds since variant_map_viewed fired. */
      elapsedMsSinceVariantView: number;
    }
  | {
      event: 'dfg_performance_mode_toggled';
      workflowId: string;
      /** Encoding mode selected: 'frequency' (visit counts) | 'performance' (durations). */
      mode: 'frequency' | 'performance';
      /** Milliseconds since variant_map_viewed fired. */
      elapsedMsSinceVariantView: number;
    }

  // ── Sharing & collaboration ───────────────────────────────────────────────
  | { event: 'share_link_created'; workflowId: string }
  | { event: 'share_link_disabled'; workflowId: string }
  | { event: 'share_link_copied'; workflowId: string }
  | { event: 'shared_workflow_viewed'; token: string }
  | { event: 'signup_from_shared_sop'; token: string }
  | { event: 'workflow_shared_with_user'; workflowId: string }
  | { event: 'workflow_shared_with_team'; workflowId: string; teamId: string }

  // ── Teams ─────────────────────────────────────────────────────────────────
  | { event: 'team_created'; teamId: string }
  | { event: 'team_invite_sent'; teamId: string; role: string }
  | { event: 'team_invite_accepted'; teamId: string }
  | { event: 'team_member_removed'; teamId: string }
  /** Fired when a subscription downgrade causes members to be soft-deactivated
   *  (P0-G / iter 087 / TEAM-P03.10). PII-free: counts only, no names. */
  | { event: 'workspace_downgraded'; teamId: string; deactivatedCount: number; newPlan: string }
  /** Fired when a Team workspace is fully canceled (subscription deleted).
   *  Companion to subscription_canceled for workspace-scoped funnel analysis. */
  | { event: 'workspace_canceled'; teamId: string; deactivatedCount: number }

  // ── Tags & organization ───────────────────────────────────────────────────
  | { event: 'tag_created'; tagName: string }
  | { event: 'tag_deleted'; tagId: string }
  | { event: 'tag_assigned'; workflowId: string; tagId: string }
  | { event: 'tag_removed'; workflowId: string; tagId: string }
  | { event: 'tag_filter_applied'; tagId: string }

  // ── Portfolios ─────────────────────────────────────────────────────────────
  | { event: 'portfolio_created'; type: string; hasParent: boolean }
  | { event: 'portfolio_renamed'; portfolioId: string }
  | { event: 'portfolio_deleted'; portfolioId: string }
  | { event: 'portfolio_filter_applied'; portfolioId: string }
  | { event: 'workflow_added_to_portfolio'; workflowId: string; portfolioId: string }
  | { event: 'workflow_removed_from_portfolio'; workflowId: string; portfolioId: string }

  // ── Process groups & analysis ─────────────────────────────────────────────
  | { event: 'view_mode_changed'; mode: string }
  | { event: 'process_analysis_triggered' }
  | { event: 'preset_view_applied'; preset: string }

  // ── Conversion & billing ──────────────────────────────────────────────────
  | { event: 'upgrade_prompt_viewed'; location: string; plan: string }
  | { event: 'upgrade_clicked'; location: string }
  | { event: 'upgrade_blocked'; code: 'admin_bypass' | 'already_subscribed'; location: string }
  | { event: 'checkout_started' }
  | { event: 'subscription_created'; plan: string }
  | { event: 'subscription_canceled' }
  | { event: 'payment_failed' }
  | { event: 'plan_limit_hit'; limit: string; currentUsage: number }
  // Team/Growth waitlist (post CEO directive 2026-05-18 "Option B"): Team + Growth
  // are blocked from Stripe Checkout until multi-user invites land via TEAM-001
  // workspace build. Pricing CTAs route to mailto waitlist; this event captures
  // demand signal + tier interest for prioritization.
  | { event: 'team_waitlist_clicked'; plan: 'team' | 'growth'; location: 'pricing_cards' | 'comparison_table' | 'bottom_cta' }

  // ── Dashboard V2 instrumentation (iter-030 / PRD §4) ─────────────────────
  | {
      event: 'dashboard_v2_viewed';
      workflowCount: number;
      hasActiveFilters: boolean;
      portfolioFilterActive: boolean;
      /** WDC2-P03 (iter-067): time-range segmentation prereq — the active filter
       *  at the moment the dashboard loaded. Enables per-range retention analysis. */
      time_range: '7d' | '30d' | '90d' | 'all';
      /** atglance-review #20: the active lens at load. Without it every
       *  downstream event is un-segmentable by lens (Library vs LSS). */
      lens: 'library' | 'lss';
    }
  | {
      event: 'workflow_row_clicked';
      workflowId: string;
      elapsedMsSinceDashboardView: number;
      healthBand: 'red' | 'amber' | 'green';
      /** atglance-review #20: which at-a-glance surface produced the row open,
       *  for per-surface navigation attribution. 'list_row' = direct list click
       *  (default); 'kpi_drill' / 'pareto' = navigated via a band/lens affordance. */
      originSurface: 'list_row' | 'kpi_drill' | 'pareto';
    }
  | {
      event: 'dashboard_v2_sort_changed';
      column: string;
      direction: 'asc' | 'desc';
    }
  | {
      event: 'dashboard_v2_filter_applied';
      filterType: 'systems' | 'opportunity' | 'healthStatus' | 'needsAttention';
      filterValue: string;
    }
  | {
      event: 'insight_chip_clicked';
      severity: 'critical' | 'warning' | 'info' | 'positive';
      filterKey: string;
    }
  | {
      // MDR-P09 (a): bounce instrumentation (iter-038 / PRD §4 metric #2)
      // Fired on beforeunload when dashboard_v2_viewed has fired but zero
      // trackable click interactions occurred during the session.
      event: 'dashboard_bounced';
      workflowCount: number;
      elapsedMsSinceDashboardView: number;
    }
  | {
      // Persona LENS switcher (DASHBOARD_PERSONAS_REVIEW_001 P0, v1).
      // Fired when the user switches the active dashboard lens (client-only).
      event: 'dashboard_lens_changed';
      lens: 'library' | 'lss';
      workflowCount: number;
    }
  // ── Batch B (2026-06-12): top-of-page band instrumentation ────────────────
  | {
      // Fired when a user clicks a KPI tile in the top-of-page band.
      // atglance-review item #2: 'avg_health' tile removed (health number now
      // renders once, in the HealthGauge).
      // SIGNALS batch (2026-06-16): 'distinct_systems' demoted out of the strip
      // into the Tier-2 facts row; 'high_variance' added as the scannable
      // standardize signal (#4). Taxonomy label only — numeric/opaque, no content.
      event: 'dashboard_kpi_tile_clicked';
      tileId:
        | 'total_workflows'
        | 'cycle_time'
        | 'automation_candidates'
        | 'distinct_systems'
        | 'high_variance';
      value: number | null;
    }
  | {
      // Fired when a user clicks a segment of the opportunity-distribution bar
      // to filter the workflow list (ANALYTICS_DASHBOARD_REVIEW §5).
      event: 'dashboard_opportunity_segment_clicked';
      segment: 'automate' | 'standardize' | 'optimize' | 'monitor' | 'healthy';
      count: number;
    }
  // ── atglance-review #20: navigation/comprehension instrumentation ─────────
  | {
      // Fired when the column-customization drawer opens. Measures discovery of
      // the "configurable metrics" feature (zero usage signal before this).
      event: 'dashboard_column_picker_opened';
      visibleColumnCount: number;
    }
  | {
      // Fired when the zero-workflow empty-state CTA is clicked — the terminal
      // click of the activation funnel (land → install).
      event: 'dashboard_empty_state_cta_clicked';
      cta: 'install' | 'upload';
    }
  | {
      // Fired when an LSS-lens Pareto bar (legend entry) is clicked to drill to
      // the matching row. Measures whether the "vital few" framing drives
      // navigation to high-leverage workflows.
      event: 'dashboard_pareto_bar_clicked';
      workflowId: string;
    }

  // ── Admin ─────────────────────────────────────────────────────────────────
  /**
   * Fired when the first admin is successfully promoted via POST
   * /api/admin/bootstrap.
   * All fields are PII-safe: no full email, no full IP, no raw UA.
   * @iter 091 / ADM-002 PR-2 Sub-task 4
   */
  | {
      event: 'admin_bootstrap_claimed';
      /** e.g. "mediafier.ai" — domain only, no local-part. */
      emailDomain: string;
      /** e.g. "192.168.x.x" — first two octets only. */
      ipPrefix: string;
      /** Browser family string ("Chrome", "Safari", "curl", "unknown", …). */
      userAgentFamily: string;
    }

  // ── Report engagement (R-D, 2026-06-14) ─────────────────────────────────────
  // PII-free: opaque workflowId + numeric aggregates + taxonomy labels only.
  // Never any step/workflow/section/evidence content in properties.
  | {
      event: 'report_viewed';
      workflowId: string;
      /** intelligence?.metrics?.runCount ?? 1 */
      runCount: number;
      /** Count of visibleSections at mount time. */
      sectionCount: number;
      /** Whether the AI intelligence layer produced any content. */
      hasAgentIntelligence: boolean;
    }
  | {
      event: 'report_print_clicked';
      workflowId: string;
      location: 'report_page_header' | 'report_page_footer';
    }
  | {
      event: 'report_data_export_clicked';
      workflowId: string;
      format: 'json';
    }
  | {
      event: 'report_section_viewed';
      workflowId: string;
      /** One of the SECTION_IDS string constants. */
      sectionId: string;
      /** Human-readable label from SECTION_LABELS. */
      sectionLabel: string;
      runCount: number;
      /** Milliseconds since report_viewed fired. */
      elapsedMsSinceReportView: number;
    }
  | {
      event: 'report_insight_card_expanded';
      workflowId: string;
      severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
      /** Taxonomy category string — no content. */
      category: string;
      /** Zero-based position in the current filtered list. */
      insightIndex: number;
    }
  | {
      event: 'report_key_action_card_viewed';
      workflowId: string;
      /** InsightCard.type — taxonomy label, no content. */
      cardType: string;
      cardIndex: number;
    }
  | {
      event: 'report_evidence_anchor_viewed';
      workflowId: string;
      cardType: string;
      /** Count of evidence run IDs backing the finding. NOT the IDs themselves. */
      evidenceRunCount: number;
    }
  | {
      event: 'report_nav_used';
      workflowId: string;
      /** One of the SECTION_IDS string constants — taxonomy only, no content. */
      targetSectionId: string;
      navSurface: 'right_rail' | 'mobile_toc';
      /** Milliseconds since report_viewed fired. */
      elapsedMsSinceReportView: number;
    }
  | {
      event: 'report_step_expanded';
      workflowId: string;
      /** 1-based ordinal position in the step list. No step name. */
      stepOrdinal: number;
      /** Total number of steps rendered in the Step Breakdown section. */
      totalStepCount: number;
      /** Milliseconds since report_viewed fired. */
      elapsedMsSinceReportView: number;
    }
  | {
      event: 'report_insight_filter_changed';
      workflowId: string;
      fromCategory: 'all' | 'time_analysis' | 'rework' | 'system_efficiency' | 'automation' | 'process_health';
      toCategory: 'all' | 'time_analysis' | 'rework' | 'system_efficiency' | 'automation' | 'process_health';
      /** Count of insights visible after the filter change. */
      insightCountInNewCategory: number;
      /** Milliseconds since report_viewed fired. */
      elapsedMsSinceReportView: number;
    }
  | {
      event: 'report_scroll_depth';
      workflowId: string;
      /** Milestone reached: 25 | 50 | 75 | 100 (integer percent). */
      depthPct: 25 | 50 | 75 | 100;
      /** Milliseconds since report_viewed fired. */
      elapsedMsSinceReportView: number;
      /** Total visible sections at this scroll-depth milestone. */
      visibleSectionCount: number;
    }

  // ── Workflow comparison (baseline vs after → ROI) ──────────────────────────
  | {
      event: 'workflow_comparison_viewed';
      /** Confidence band from the smaller run count. */
      confidence: 'high' | 'medium' | 'low';
      /** Whether a positive time-saving ROI was computed. */
      hasSavings: boolean;
      /** Whether the "after" workflow was slower than the baseline. */
      slower: boolean;
      /** Persona/role key the loaded rate came from; null for a custom rate. */
      personaKey: string | null;
    }

  // ── Navigation ────────────────────────────────────────────────────────────
  | { event: 'page_viewed'; path: string }

  // ── Feedback ───────────────────────────────────────────────────────────────
  | { event: 'sop_usefulness_response'; workflowId: string; response: 'yes_as_is' | 'minor_edits' | 'major_rework' | 'not_useful' }

  // ── Marketing ─────────────────────────────────────────────────────────────
  | { event: 'cta_clicked'; location: string; destination: string }
  // Install funnel entry (signup → install). `method` distinguishes the
  // Web Store one-click path from the current direct-download sideload path;
  // `location` records which CTA on which surface was clicked.
  | { event: 'extension_install_clicked'; method: 'web_store' | 'direct_download'; location: string }
  // Marketing nav (NAVIGATION_IA_001 — Iteration A)
  | { event: 'nav_menu_opened'; menu: 'solutions' | 'resources'; device: 'desktop' | 'mobile' }
  | {
      event: 'nav_link_clicked';
      item: NavItemId;
      href: string;
      group: 'top_level' | 'solutions' | 'resources';
      column:
        | 'popular' | 'by_role' | 'by_department' | 'by_industry'
        | 'templates_guides' | 'software' | 'learn' | 'company'
        | null;
      interactionPath: 'direct' | 'via_menu';
      device: 'desktop' | 'mobile';
    }

  // ── SEO/AEO page engine (Phase 1 / Tranche 0) ─────────────────────────────
  // PII-free: page taxonomy + opaque slug + referrer class only.
  | {
      event: 'seo_page_viewed';
      pageType: string;
      slug: string;
      referrerClass: 'organic' | 'ai' | 'direct' | 'other';
    }
  | {
      event: 'seo_related_page_clicked';
      fromType: string;
      fromSlug: string;
      toType: string;
      toSlug: string;
      linkRank: number;
    }
  | {
      event: 'seo_scroll_depth';
      pageType: string;
      slug: string;
      depthPct: 25 | 50 | 75 | 90;
    }
  | {
      event: 'seo_faq_expanded';
      pageType: string;
      slug: string;
      questionIndex: number;
    }

  // ── Errors ────────────────────────────────────────────────────────────────
  | { event: 'upload_failed'; error: string }
  | { event: 'api_error'; endpoint: string; status: number }
  | { event: 'client_error'; message: string; component?: string };

// ─── Enriched event (what actually gets stored/sent) ─────────────────────────

interface EnrichedEvent {
  event: string;
  timestamp: string;
  url?: string;
  userPlan?: string;
  sessionId?: string;
  [key: string]: unknown;
}

// ─── Client-side tracking ────────────────────────────────────────────────────

const IS_BROWSER = typeof window !== 'undefined';
const IS_DEV = IS_BROWSER && window.location.hostname === 'localhost';

/**
 * MDR-P09 (b): set the current user's plan for automatic enrichment of all
 * subsequent track() calls.  Call this from the dashboard shell after the
 * plan is resolved from the API response.  Stored in a window-level slot so
 * it flows into EnrichedEvent.userPlan without requiring every event variant
 * to carry the field explicitly.
 */
export function setUserPlanForAnalytics(plan: string | undefined): void {
  if (!IS_BROWSER) return;
  (window as any).__ledgerium_userPlan = plan ?? null;
}

export function track(payload: AnalyticsEvent): void {
  const base: Record<string, unknown> = {
    ...payload,
    timestamp: new Date().toISOString(),
  };
  if (IS_BROWSER) {
    base.url = window.location.pathname;
    // MDR-P09 (b): enrich every event with userPlan when available.
    const userPlan: unknown = (window as any).__ledgerium_userPlan;
    if (userPlan != null) base.userPlan = userPlan;
  }
  const enriched = base as EnrichedEvent;

  if (IS_DEV) {
    console.debug('[analytics]', enriched.event, enriched);
  }

  // Forward to PostHog (if configured)
  if (IS_BROWSER && isPostHogEnabled()) {
    const { event: eventName, timestamp: _ts, url: _url, ...properties } = enriched;
    posthogCapture(eventName, properties);

    // Auto-identify on signup/login
    if (eventName === 'signup_completed' || eventName === 'login_completed') {
      // PostHog identify will be called separately via identifyUser()
      // when the session is available
    }
  }

  // Buffer for batch sending to our own analytics API
  if (IS_BROWSER) {
    const buffer: EnrichedEvent[] = (window as any).__ledgerium_events ?? [];
    buffer.push(enriched);
    (window as any).__ledgerium_events = buffer;
    if (buffer.length > 500) buffer.splice(0, buffer.length - 500);

    // Flush to backend if endpoint is configured
    if (buffer.length >= 10) {
      flushEvents();
    }
  }
}

/**
 * Identify the current user in PostHog after login/signup.
 * Call this when the session becomes available.
 */
export function identifyAnalyticsUser(userId: string, properties?: Record<string, unknown>): void {
  if (IS_BROWSER && isPostHogEnabled()) {
    posthogIdentify(userId, properties);
  }
}

/**
 * Sends buffered events to the analytics API endpoint.
 * Non-blocking — failures are silently ignored.
 */
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function flushEvents(): void {
  if (flushTimeout) return; // Already scheduled
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    if (!IS_BROWSER) return;
    const buffer: EnrichedEvent[] = (window as any).__ledgerium_events ?? [];
    if (buffer.length === 0) return;

    const events = buffer.splice(0, buffer.length);
    // Fire-and-forget POST to analytics endpoint
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }).catch(() => {
      // Silently fail — analytics should never break the app
    });
  }, 2000); // 2-second debounce
}

// Flush on page unload
if (IS_BROWSER) {
  window.addEventListener('beforeunload', () => {
    const buffer: EnrichedEvent[] = (window as any).__ledgerium_events ?? [];
    if (buffer.length > 0) {
      // Use sendBeacon for reliable delivery on page exit
      const blob = new Blob([JSON.stringify({ events: buffer })], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/events', blob);
    }
  });
}

// ─── Server-side tracking ────────────────────────────────────────────────────
// trackServer() lives in './analytics-server' to keep Node.js-only dependencies
// (posthog-node, Prisma) out of the client bundle.
// API routes should import { trackServer } from '@/lib/analytics-server'.

// ─── Funnel helpers ──────────────────────────────────────────────────────────

// ─── UTM helpers ─────────────────────────────────────────────────────────────

const FIRST_TOUCH_UTM_KEY = 'ledgerium_first_touch_utm';

/**
 * Returns the first-touch UTM data stored by UTMCapture, or null if none.
 * Safe to call on the server — returns null in that context.
 */
export function getFirstTouchUTM(): Record<string, string> | null {
  if (!IS_BROWSER) return null;
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_UTM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Return only string values to keep the shape clean for event properties
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') result[k] = v;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

// ─── Funnel helpers ──────────────────────────────────────────────────────────

/**
 * Tracks an activation milestone. Call when a user reaches a first-time event.
 * Checks localStorage to avoid duplicate first-time tracking.
 */
export function trackActivation(
  milestone: 'first_workflow' | 'first_sop' | 'first_map' | 'first_export',
  metadata: Record<string, unknown> = {},
): void {
  if (!IS_BROWSER) return;
  const key = `ledgerium_activation_${milestone}`;
  if (localStorage.getItem(key)) return; // Already tracked
  localStorage.setItem(key, new Date().toISOString());

  switch (milestone) {
    case 'first_workflow':
      track({ event: 'first_workflow_uploaded', stepCount: 0, systemCount: 0, ...metadata } as any);
      break;
    case 'first_sop':
      track({ event: 'first_sop_viewed', workflowId: '', ...metadata } as any);
      break;
    case 'first_map':
      track({ event: 'first_process_map_viewed', workflowId: '', ...metadata } as any);
      break;
    case 'first_export':
      track({ event: 'first_export', format: '', ...metadata } as any);
      break;
  }
}
