# Ledgerium AI Dashboard Redesign Specification

## Executive Summary

The current dashboard is a solid 4-layer intelligence system with rich per-workflow scoring. However, it lacks trending, benchmarking, pagination, AI opportunity detection, and workflow comparison capabilities needed for enterprise-grade process intelligence.

## Recommended KPI Framework

### A. Volume Metrics
- Total workflows captured (card)
- Active workflows this week (card subtitle)
- Recording cadence (streak momentum bar)
- Process group count (Process Groups toggle)

### B. Efficiency Metrics  
- Average completion time (card)
- Median completion time (not shown — add)
- Average time per step (derivable)
- Bottleneck step frequency (in insights)

### C. Quality Metrics
- Average confidence score (card, color-coded)
- SOP readiness count (card)
- Documentation completeness (API field, not shown — add)
- Low-confidence workflow count (derivable)

### D. Consistency / Variation Metrics
- Standardization score per process group (shown)
- Variant count per process (shown in groups view)
- Stability score (shown in groups view)
- Sequence consistency across runs (in intelligence)

### E. Engagement Metrics
- View count (sortable, not shown by default)
- Last viewed date (shown as "Last Active")
- Favorite count (in stats)
- Stale workflow count (card)

### F. Opportunity Metrics
- Optimization opportunity count (card)
- High-complexity workflow count (intelligence panel)
- Automation candidate count (TO ADD)
- AI opportunity score (TO ADD)

### G. Automation / AI-readiness Metrics
- Repetitive step ratio (derivable from step categories)
- Data entry density (ratio of data_entry steps)
- System handoff count (already tracked)
- Manual intensity score (from interpretation)
- Agentic AI candidate score (TO ADD)
- Generative AI candidate score (TO ADD)

### H. Data Confidence Metrics
- Average confidence (shown)
- Low-confidence step count (in quality indicators)
- Evidence completeness (event count per step)

## Process Performance Model

### Workflow Health Score (0-100)
Already computed as healthStatus enum. Extend to numeric:
- healthy = 80+
- needs_review = 50-79
- high_variation = 30-49
- stale = 10-29
- new = N/A (unscored)

### Standardization Score (0-100)
Already computed in Phase 3. Factors:
- Dominant path adherence (35%)
- Sequence stability (30%)
- Variant consolidation (20%)
- Timing consistency (15%)

### Optimization Potential Score (0-100)
Extend from current enum to numeric. Inputs:
- Step count (40% weight)
- Duration (30%)
- Rework/loop detection (20%)
- Friction score (10%)

### AI Opportunity Score (0-100)
NEW — derive from:
- Repetitive step ratio (data_entry + repeated_click = automation candidate)
- System handoff count (coordination = orchestration candidate)
- Manual intensity (from interpretation scores)
- Step count × frequency (high-volume = high ROI)

### Documentation Quality Score (0-100)
Extend documentationCompleteness (currently 0-100 from 4 factors):
- Add: SOP alignment score contribution
- Add: Template coverage (how many template formats generated)

## Prioritized Implementation Roadmap

### Phase 1 — Quick Wins (ship now)
1. Add AI Opportunity scoring to workflows API
2. Add documentation completeness to workflow rows
3. Show top insights directly on dashboard
4. Fix pagination for large libraries
5. Add bulk tag/archive operations

### Phase 2 — Intelligence Layer (next sprint)
1. Trend tracking (7-day/30-day performance deltas)
2. AI opportunity breakdown by type (automation, agentic, generative)
3. Workflow comparison tool (side-by-side variant diff)
4. Benchmark metrics (vs user's own median)
5. Advanced saved views/presets

### Phase 3 — Enterprise Control Center (future)
1. Team/org-level dashboards
2. Scheduled reports and alerts
3. Process mining visualization (Sankey/flow diagrams)
4. Goal tracking and SLA monitoring
5. Integration with external tools (Slack, Teams, Jira)

## Anti-Patterns to Avoid
- No vanity metrics (total clicks, total events — meaningless)
- No charts without operational questions
- No decorative visualizations
- No over-complicated BI jargon
- No enterprise theater (fake compliance scores)
- No information overload — progressive disclosure
- No mobile-hostile designs
