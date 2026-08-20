/**
 * Centralized configuration for the Ledgerium AI web app.
 * Update these values when deploying to production or when
 * extension/billing URLs become available.
 */

export const SITE_CONFIG = {
  name: 'Ledgerium AI',
  tagline: 'Evidence-based workflow intelligence',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ledgerium.ai',
  supportEmail: 'hello@ledgerium.ai',
} as const;

export const EXTENSION_CONFIG = {
  /** Chrome Web Store URL — update when published */
  chromeStoreUrl: 'https://chrome.google.com/webstore/detail/ledgerium-ai/placeholder',
  /** Direct download URL for the extension zip (sideload) */
  directDownloadUrl: '/ledgerium-recorder-chrome-extension.zip',
  /** Minimum supported Chrome version */
  minChromeVersion: '120',
  /** Whether Firefox is supported (future) */
  firefoxSupported: false,
} as const;

export const DEMO_CONFIG = {
  /** URL for demo video (YouTube embed or hosted mp4) — update when available */
  videoUrl: null as string | null,
  /** URL for product walkthrough screenshots — update when available */
  screenshotBaseUrl: null as string | null,
} as const;

export const PRICING_CONFIG = {
  /**
   * Per PRICING_PAGE_REVIEW_001 (2026-05-17) + CEO directive same date:
   * "keep current pricing models, update CTAs, subscriptions features and functions,
   *  and the other information suggested to improve the pricing page.
   *  Update models for focus on users, workflows, and outputs rather than recorders and viewers."
   *
   * Vocabulary refocus: users / workflows / outputs (NOT recorders / viewers / recordings).
   * Field additions: `bestFor` + `outcomeMicrocopy` (rendered on PricingCards).
   * Pricing unchanged: Free $0 / Starter $49 / Team $249 / Growth $799 / Enterprise Custom.
   *
   * Solo tier added (REVENUE_PLAN_20K §6 Option B, see docs/meta/REVENUE_PLAN_20K_001.md):
   * $89/mo, additive between Starter and Team — see the `solo` plan entry
   * below for the price-adjustment note.
   */
  plans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      annualPrice: null,
      interval: 'forever',
      seats: '1 user',
      description: 'Map your first workflows',
      bestFor: 'Individuals exploring process documentation',
      outcomeMicrocopy: 'Document 5 workflows. See exactly what your SOP looks like before you buy.',
      cta: 'Map Your First Workflow Free',
      ctaHref: '/signup',
      highlighted: false,
      features: [
        'Document 5 workflows per month',
        'Get SOP + process map for every workflow',
        'Share via public link',
        'Watermarked exports',
      ],
      limits: [
        'No intelligence layer',
        'No team workspace',
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 49,
      annualPrice: 41,
      interval: 'month',
      seats: '1 user',
      description: 'For solo ops professionals',
      bestFor: 'Solo ops professionals who need clean, shareable exports',
      outcomeMicrocopy: 'Document your core workflows and get clean exports your team can use.',
      cta: 'Start 14-Day Trial',
      ctaHref: '/signup?plan=starter',
      highlighted: false,
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? null,
      features: [
        'Document 15 workflows per month',
        'All SOP & process map formats',
        'Basic process health scores',
        'Clean exports — JSON, Markdown, PDF',
        'Personal workspace',
      ],
      limits: [
        'No bottleneck analysis',
        'No automation scoring',
        'No team workspace',
      ],
    },
    {
      // ── Solo tier (REVENUE_PLAN_20K §6 Option B) ──────────────────────────
      // Monetizes the intelligence-layer moat for a single user, with zero
      // dependency on the team data layer (which is not honestly sellable
      // today — see docs/meta/REVENUE_PLAN_20K_001.md §2).
      //
      // PRICE IS DELIBERATELY ADJUSTABLE HERE. $89/mo ($74/mo annual) is the
      // midpoint of the $79-99 band proposed in
      // docs/meta/REVENUE_PLAN_20K/market_analysis.md §6 item 3. If the CEO
      // wants a different number, change `price` and `annualPrice` below —
      // nothing else in the codebase hardcodes this figure. annualPrice
      // follows the same ~17% discount as every other tier (compare 41/207/665
      // against 49/249/799): 89 × 12 × 0.83 / 12 ≈ 74.
      id: 'solo',
      name: 'Solo',
      price: 89,
      annualPrice: 74,
      interval: 'month',
      seats: '1 user',
      description: 'For solo power users',
      bestFor: 'Solo operators who want the intelligence layer without a team',
      outcomeMicrocopy: 'Unlimited workflow documentation plus the full intelligence layer — bottleneck analysis, automation scoring, variant detection — for one person.',
      cta: 'Start Trial — Full intelligence included',
      ctaHref: '/signup?plan=solo',
      highlighted: false,
      stripePriceId: process.env.STRIPE_SOLO_PRICE_ID ?? null,
      features: [
        'Unlimited workflow documentation',
        'Full intelligence layer — bottleneck & friction analysis',
        'Automation opportunity scoring',
        'Variant & rework detection',
        'Clean exports — JSON, Markdown, PDF',
        'Personal workspace',
      ],
      limits: [
        'No shared team library',
        'No team workspace',
      ],
    },
    {
      id: 'team',
      name: 'Team',
      price: 249,
      annualPrice: 207,
      interval: 'month',
      seats: '5 users',
      description: 'For process improvement teams',
      bestFor: 'Process improvement teams ready to measure, not just document',
      outcomeMicrocopy: 'Standardize how your team works — and measure whether the standard is holding.',
      cta: 'Start Team Trial — Full intelligence included',
      ctaHref: '/signup?plan=team',
      highlighted: true,
      stripePriceId: process.env.STRIPE_TEAM_PRICE_ID ?? null,
      features: [
        'Unlimited workflow documentation',
        'Full intelligence layer — bottleneck & friction analysis',
        'Automation opportunity scoring',
        'Variant & rework detection',
        'Variation analysis across runs',
        'Shared team workspace & library',
        'Public sharing with team branding',
      ],
      limits: [
        'No compliance features',
      ],
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 799,
      annualPrice: 665,
      interval: 'month',
      seats: '15 users',
      description: 'For ops leaders automating at scale',
      bestFor: 'Ops and automation leaders who need to find and act on inefficiencies at scale',
      outcomeMicrocopy: 'Find what to automate, what to train on, and where your process breaks down at scale.',
      cta: 'Start Trial — Automation scoring + AI tools',
      ctaHref: '/signup?plan=growth',
      highlighted: false,
      stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID ?? null,
      features: [
        'Everything in Team',
        'Advanced cross-workflow analytics',
        'Cross-workflow comparison & benchmarking',
        'Priority export formats',
        'AI agent composition',
        'Integration risk assessment',
      ],
      limits: [],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      annualPrice: null,
      interval: null,
      seats: 'Custom',
      description: 'For compliance-governed organizations',
      bestFor: 'Compliance-governed orgs requiring audit trails and custom deployment',
      outcomeMicrocopy: 'Enterprise-grade process governance with audit trail and full AI integration.',
      cta: 'Talk to Sales',
      ctaHref: 'mailto:hello@ledgerium.ai?subject=Ledgerium Enterprise',
      highlighted: false,
      features: [
        'Custom user seats & permissions',
        'SSO & RBAC',
        'Audit trail & compliance exports',
        'Dedicated support',
        'On-premise deployment option',
        'Custom retention policies',
      ],
      limits: [],
    },
  ],
} as const;
