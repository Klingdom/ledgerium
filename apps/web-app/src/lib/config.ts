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
