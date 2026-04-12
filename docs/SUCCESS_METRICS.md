# Ledgerium AI — Beta Success Metrics

**Status:** ACTIVE — instrument before beta launch
**Date:** 2026-04-12

---

## Core Metrics (Track from Day 1)

| # | Metric | Definition | Target | Event(s) |
|---|--------|-----------|--------|----------|
| 1 | **Activation rate** | % of signups who view their first SOP | > 30% | `signup_completed` → `first_sop_viewed` |
| 2 | **Time to first value** | Minutes from signup to first SOP view | < 15 min | Timestamp delta: `signup_completed` → `first_sop_viewed` |
| 3 | **Recording completion** | % of started recordings that produce a valid workflow in the web app | > 80% | Extension: recording_started → Web: `workflow_uploaded` |
| 4 | **SOP usefulness** | Post-view survey: "Would you use this SOP as-is or with minor edits?" | > 50% yes | `sop_usefulness_response` (to be added) |
| 5 | **Return rate** | % of activated users who record a 2nd workflow within 7 days | > 25% | Count of `workflow_uploaded` per user in 7-day window |
| 6 | **Upload success** | % of upload/sync attempts that succeed without error | > 95% | `workflow_uploaded` / (`workflow_uploaded` + `upload_failed`) |

## Activation Funnel (Track from Day 1)

```
Signup → Install Extension → First Recording → First SOP View → Second Recording
  100%      ?%                   ?%                ?%                ?%
```

Each step maps to an existing analytics event. The funnel should be visible in the analytics provider dashboard.

## Leading Indicators (Track weekly)

| Indicator | What it tells you |
|-----------|-------------------|
| Sample workflow usage | Are users exploring before committing to the extension? |
| Tab switching patterns | Which output tab (SOP, Workflow, Report) gets the most views? |
| Export usage | Are users taking output outside Ledgerium? |
| Extension sync configuration | What % of users who install the extension also configure sync? |

## Lagging Indicators (Track monthly)

| Indicator | What it tells you |
|-----------|-------------------|
| Workflow count per user | Is the product becoming a habit? |
| Pro conversion rate | Is the free tier driving upgrades? |
| Churn signals | How many users go inactive after initial activation? |

---

## Analytics Implementation Checklist

- [ ] Connect PostHog (or equivalent) to `/api/analytics/events`
- [ ] Verify all 6 core metric events fire correctly
- [ ] Build activation funnel view in analytics dashboard
- [ ] Add SOP usefulness survey prompt after first SOP view
- [ ] Set up weekly email summary of core metrics
