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
  plans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      annualPrice: null,
      interval: 'forever',
      seats: '1 user',
      description: 'Try the full workflow',
      cta: 'Get Started Free',
      ctaHref: '/signup',
      highlighted: false,
      features: [
        '5 recordings per month',
        'SOP + process map output',
        'Share via public link',
        'Watermarked exports',
      ],
      limits: [
        'No intelligence layer',
        'No team features',
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 49,
      annualPrice: 41,
      interval: 'month',
      seats: '1 recorder',
      description: 'For operations team leads',
      cta: 'Start Trial',
      ctaHref: '/signup?plan=starter',
      highlighted: false,
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? null,
      features: [
        '15 recordings per month',
        'All SOP & map formats',
        'Basic process health scores',
        'Clean exports (JSON, Markdown)',
        'Personal workspace',
      ],
      limits: [
        'No bottleneck analysis',
        'No automation scoring',
        'No team features',
      ],
    },
    {
      id: 'team',
      name: 'Team',
      price: 249,
      annualPrice: 207,
      interval: 'month',
      seats: '3 recorders + 5 viewer seats',
      description: 'For process improvement teams',
      cta: 'Start Team Trial',
      ctaHref: '/signup?plan=team',
      highlighted: true,
      stripePriceId: process.env.STRIPE_TEAM_PRICE_ID ?? null,
      features: [
        'Unlimited recordings',
        'Full intelligence layer',
        'Bottleneck & friction analysis',
        'Automation opportunity scoring',
        'Variant & rework detection',
        'Shared library & portfolios',
        'Team workspace',
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
      seats: 'Up to 15 seats · 10 recorders',
      description: 'For AI implementation leads',
      cta: 'Start Trial',
      ctaHref: '/signup?plan=growth',
      highlighted: false,
      stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID ?? null,
      features: [
        'Everything in Team',
        'Advanced analytics',
        'Cross-workflow comparison',
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
      description: 'For compliance & scale',
      cta: 'Contact Sales',
      ctaHref: 'mailto:hello@ledgerium.ai?subject=Ledgerium Enterprise',
      highlighted: false,
      features: [
        'Custom seats & recorders',
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
