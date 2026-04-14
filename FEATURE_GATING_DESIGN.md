# Ledgerium AI — Feature Gating Architecture Design

**Version:** 1.0
**Date:** 2026-04-13
**Status:** Active
**Owner:** System Architect
**Implements:** TIER_FEATURE_ROADMAP.md Phase F1

---

## 1. Plan Type System

### Type Definition

```typescript
// apps/web-app/src/lib/plans.ts
export type PlanType = 'free' | 'starter' | 'team' | 'growth' | 'enterprise';
```

### Hierarchy

Plans are ordered from lowest to highest. Higher plans include all features of lower plans.

```
free < starter < team < growth < enterprise
```

```typescript
export const PLAN_HIERARCHY: PlanType[] = ['free', 'starter', 'team', 'growth', 'enterprise'];

export function isPlanAtLeast(userPlan: PlanType, requiredPlan: PlanType): boolean {
  return PLAN_HIERARCHY.indexOf(userPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan);
}
```

### Legacy Coercion

The database currently stores "free" and "pro". All code must use `toPlanType()` to safely coerce:

| DB Value | Resolved PlanType | Rationale |
|----------|-------------------|-----------|
| `"free"` | `free` | Direct match |
| `"pro"` | `starter` | Legacy mapping — "pro" was the only paid tier |
| `"starter"` | `starter` | Direct match |
| `"team"` | `team` | Direct match |
| `"growth"` | `growth` | Direct match |
| `"enterprise"` | `enterprise` | Direct match |
| anything else | `free` | Safe default — never grant unearned access |

```typescript
export function toPlanType(raw: string): PlanType {
  if (raw === 'pro') return 'starter';
  if ((PLAN_HIERARCHY as string[]).includes(raw)) return raw as PlanType;
  return 'free';
}
```

---

## 2. PLAN_FEATURES Constant

Single source of truth for what each plan includes.

```typescript
export type FeatureKey =
  | 'cleanExports'      // Starter+: exports without watermark
  | 'healthScores'      // Starter+: basic process health scores
  | 'personalWorkspace' // Starter+: named workspace
  | 'intelligenceLayer' // Team+: full intelligence engine access
  | 'bottleneckAnalysis' // Team+
  | 'automationScoring'  // Team+
  | 'variantDetection'   // Team+
  | 'sharedLibrary'      // Team+: shared workflow library
  | 'teamWorkspace'      // Team+: team collaboration
  | 'advancedAnalytics'  // Growth+
  | 'crossWorkflowComparison' // Growth+
  | 'agentComposition'   // Growth+
  | 'integrationRisk'    // Growth+
  | 'priorityExports'    // Growth+: BPMN XML
  | 'sso'               // Enterprise
  | 'rbac'              // Enterprise
  | 'auditTrail'        // Enterprise
  | 'complianceExports' // Enterprise
  | 'customRetention';  // Enterprise

export interface PlanConfig {
  maxRecordingsPerMonth: number; // Number.MAX_SAFE_INTEGER = unlimited
  maxSeats: number;
  maxRecorders: number;
  features: Record<FeatureKey, boolean>;
}

export const PLAN_FEATURES: Record<PlanType, PlanConfig> = { /* see plans.ts */ };
```

### Feature × Tier Matrix

| Feature | Free | Starter | Team | Growth | Enterprise |
|---------|------|---------|------|--------|------------|
| cleanExports | - | ✓ | ✓ | ✓ | ✓ |
| healthScores | - | ✓ | ✓ | ✓ | ✓ |
| personalWorkspace | - | ✓ | ✓ | ✓ | ✓ |
| intelligenceLayer | - | - | ✓ | ✓ | ✓ |
| bottleneckAnalysis | - | - | ✓ | ✓ | ✓ |
| automationScoring | - | - | ✓ | ✓ | ✓ |
| variantDetection | - | - | ✓ | ✓ | ✓ |
| sharedLibrary | - | - | ✓ | ✓ | ✓ |
| teamWorkspace | - | - | ✓ | ✓ | ✓ |
| advancedAnalytics | - | - | - | ✓ | ✓ |
| crossWorkflowComparison | - | - | - | ✓ | ✓ |
| agentComposition | - | - | - | ✓ | ✓ |
| integrationRisk | - | - | - | ✓ | ✓ |
| priorityExports | - | - | - | ✓ | ✓ |
| sso | - | - | - | - | ✓ |
| rbac | - | - | - | - | ✓ |
| auditTrail | - | - | - | - | ✓ |
| complianceExports | - | - | - | - | ✓ |
| customRetention | - | - | - | - | ✓ |

### Limits Matrix

| Limit | Free | Starter | Team | Growth | Enterprise |
|-------|------|---------|------|--------|------------|
| Recordings/month | 5 | 15 | ∞ | ∞ | ∞ |
| Seats | 1 | 1 | 5 | 15 | Custom |
| Recorders | 1 | 1 | 3 | 10 | Custom |

---

## 3. Server-Side Guards

### File: `apps/web-app/src/lib/feature-gating.ts`

Three guard patterns:

#### 3a. Boolean Check — `hasFeature()`

For conditional logic (e.g., include/exclude data in response):

```typescript
import { toPlanType, hasFeature, type FeatureKey } from './plans';

const plan = toPlanType(user.plan);
if (hasFeature(plan, 'intelligenceLayer')) {
  // include intelligence data
}
```

#### 3b. Hard Gate — `requireFeature()`

For API routes that should 403 entirely:

```typescript
export function requireFeature(user: User, feature: FeatureKey): void {
  const plan = toPlanType(user.plan);
  if (!hasFeature(plan, feature)) {
    const requiredPlan = PLAN_HIERARCHY.find((p) => hasFeature(p, feature));
    throw NextResponse.json(
      { error: 'Feature not available on your plan', feature, requiredPlan },
      { status: 403 },
    );
  }
}
```

Usage in API route:
```typescript
export async function GET(req: NextRequest) {
  const user = await requireUser();
  requireFeature(user, 'advancedAnalytics'); // throws 403 if not Growth+
  // ... serve analytics
}
```

#### 3c. Recording Limit — `checkRecordingLimit()`

Replaces the hardcoded `plan === 'free' && uploadCount >= 5` pattern:

```typescript
export async function checkRecordingLimit(user: User): Promise<RecordingLimitResult> {
  const plan = toPlanType(user.plan);
  const config = getPlanConfig(plan);
  const limit = config.maxRecordingsPerMonth;

  if (limit === Number.MAX_SAFE_INTEGER) {
    return { allowed: true, used: 0, limit };
  }

  const used = await getMonthlyUploadCount(user.id);
  return { allowed: used < limit, used, limit };
}
```

**Monthly count** is derived from `uploads.uploadedAt >= firstOfMonth`, not the cumulative `uploadCount` field.

---

## 4. Client-Side Feature Awareness

### API Endpoint: `GET /api/account`

Returns the user's plan, all feature flags, and current limits:

```json
{
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "plan": "starter" },
    "features": {
      "cleanExports": true,
      "healthScores": true,
      "intelligenceLayer": false,
      ...
    },
    "limits": {
      "recordings": { "used": 7, "max": 15 },
      "seats": { "max": 1 },
      "recorders": { "max": 1 }
    }
  }
}
```

### React Hook (Future — Phase F2)

```typescript
// apps/web-app/src/hooks/useFeatureGate.ts
export function useFeatureGate(feature: string): {
  allowed: boolean;
  loading: boolean;
  requiredPlan?: string;
}
```

### Component Pattern (Future — Phase F2)

```tsx
<FeatureGate feature="intelligenceLayer" fallback={<UpgradeCTA plan="team" />}>
  <BottleneckAnalysisPanel />
</FeatureGate>
```

---

## 5. Stripe Multi-Tier Configuration

### Environment Variables

```env
# Starter
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxx

# Team
STRIPE_TEAM_MONTHLY_PRICE_ID=price_xxx
STRIPE_TEAM_ANNUAL_PRICE_ID=price_xxx

# Growth
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_xxx
STRIPE_GROWTH_ANNUAL_PRICE_ID=price_xxx

# Legacy (deprecated)
STRIPE_PRO_PRICE_ID=price_xxx
```

### Price ID → Plan Mapping

```typescript
export const STRIPE_PRICES = {
  starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? '',
  starter_annual:  process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? '',
  team_monthly:    process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? '',
  team_annual:     process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? '',
  growth_monthly:  process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID ?? '',
  growth_annual:   process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID ?? '',
} as const;

// Dynamically build price_id → plan_type map
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanType> = {};
// Built from STRIPE_PRICES entries, stripping _monthly/_annual suffix

export function planFromPriceId(priceId: string): PlanType {
  return STRIPE_PRICE_TO_PLAN[priceId] ?? 'starter';
}
```

### Webhook Update

`checkout.session.completed`:
1. Retrieve subscription from Stripe
2. Get first item's price ID
3. `planFromPriceId(priceId)` → resolve plan
4. Store resolved plan in user.plan

`customer.subscription.updated`:
1. Get price ID from `subscription.items.data[0].price.id`
2. Resolve plan if subscription is active/trialing/past_due
3. Revert to "free" if canceled/unpaid

---

## 6. Recording Limit Enforcement

### Current State (broken)

```typescript
// upload/route.ts — hardcoded
if (user.plan === 'free' && user.uploadCount >= 5) { ... }
```

Problems:
- Hardcoded plan check
- Uses cumulative `uploadCount` (never resets)
- Only checks free tier
- No Starter limit (15)

### Target State

```typescript
// upload/route.ts — centralized
const limitCheck = await checkRecordingLimit(user);
if (!limitCheck.allowed) {
  return NextResponse.json(
    { error: 'Recording limit reached', used: limitCheck.used, limit: limitCheck.limit },
    { status: 403 },
  );
}
```

Monthly count query:
```typescript
const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
return db.upload.count({
  where: { userId, uploadedAt: { gte: firstOfMonth } },
});
```

---

## 7. Team-Scoped Data (Phase F3 — Design Only)

### Schema Change

```prisma
model Workflow {
  // ... existing fields ...
  teamId String? @map("team_id")
  team   Team?   @relation(fields: [teamId], references: [id])
}
```

### Query Pattern

```typescript
// Get workflows visible to user (personal + team)
const workflows = await db.workflow.findMany({
  where: {
    OR: [
      { userId: user.id },
      { teamId: { in: userTeamIds } },
    ],
  },
});
```

### Seat Enforcement

```typescript
const memberCount = await db.teamMember.count({ where: { teamId } });
const config = getPlanConfig(toPlanType(team.plan));
if (memberCount >= config.maxSeats) {
  throw new Error('Seat limit reached');
}
```

---

## 8. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `apps/web-app/src/lib/plans.ts` | PlanType, PLAN_FEATURES, toPlanType, hasFeature, getPlanConfig |
| `apps/web-app/src/lib/feature-gating.ts` | requireFeature, checkRecordingLimit, buildFeatureFlags |

### Modified Files
| File | Change |
|------|--------|
| `apps/web-app/src/lib/session.ts` | Remove PLAN_LIMITS, make canUpload async, delegate to checkRecordingLimit |
| `apps/web-app/src/lib/stripe.ts` | Add STRIPE_PRICES, STRIPE_PRICE_TO_PLAN, planFromPriceId |
| `apps/web-app/src/app/api/billing/webhook/route.ts` | Use planFromPriceId instead of hardcoding "pro" |
| `apps/web-app/src/app/api/billing/checkout/route.ts` | Accept plan + interval, look up correct price |
| `apps/web-app/src/app/api/upload/route.ts` | Replace hardcoded limit with checkRecordingLimit |
| `apps/web-app/src/app/api/sync/route.ts` | Replace hardcoded limit with checkRecordingLimit |
| `apps/web-app/src/app/api/account/route.ts` | Add feature flags to response |

---

## 9. Implementation Sequence

```
Step 1: plans.ts (types + feature map) — no dependencies
   ↓
Step 2: feature-gating.ts (guards) — depends on plans.ts
   ↓
Step 3: stripe.ts update (multi-tier prices) — depends on plans.ts
   ↓
Step 4: webhook + upload + sync route updates — depends on steps 2-3
   ↓
Step 5: account route update (feature flags API) — depends on step 2
```

---

## 10. Open Risks

| Risk | Mitigation |
|------|------------|
| Legacy "pro" users see behavior change | toPlanType maps "pro" → "starter"; Starter has more features than old Pro had |
| Monthly count query performance | Index on uploads(userId, uploadedAt) already exists via @@index([userId]) |
| Number.MAX_SAFE_INTEGER JSON serialization | Use "unlimited" string in API response, MAX_SAFE_INTEGER internally only |
| Stripe price IDs not yet configured | All STRIPE_PRICES default to empty string; planFromPriceId falls back to "starter" |
| Team.plan vs User.plan confusion | Phase F3 decision: team plan governs shared features; user plan governs personal features |

### Deferred Decisions

| Decision | Deferred To | Rationale |
|----------|-------------|-----------|
| Enterprise custom limits | Phase F4 | Requires admin UI for per-org overrides |
| Downgrade data access | Phase F2 | What happens to intelligence data when Team → Starter? |
| Webhook retry handling | Phase F2 | Current webhook is not idempotent |
| Team billing model | Phase F3 | Team creator pays vs. per-seat billing |
| Annual discount enforcement | Phase F2 | Stripe handles pricing; we just need to show correct plan |

---

## 11. Traceability Matrix

| Pricing Tier | Stripe Env Vars | PLAN_FEATURES Key | DB plan Value |
|-------------|-----------------|-------------------|---------------|
| Free | (none) | `free` | `"free"` |
| Starter | `STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_STARTER_ANNUAL_PRICE_ID` | `starter` | `"starter"` (or legacy `"pro"`) |
| Team | `STRIPE_TEAM_MONTHLY_PRICE_ID`, `STRIPE_TEAM_ANNUAL_PRICE_ID` | `team` | `"team"` |
| Growth | `STRIPE_GROWTH_MONTHLY_PRICE_ID`, `STRIPE_GROWTH_ANNUAL_PRICE_ID` | `growth` | `"growth"` |
| Enterprise | (manual) | `enterprise` | `"enterprise"` |
