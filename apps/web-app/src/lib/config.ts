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
      interval: 'forever',
      description: 'Get started with workflow capture',
      cta: 'Start Free',
      ctaHref: '/signup',
      highlighted: false,
      features: [
        '5 workflow recordings',
        'Basic SOP generation',
        'Session history (last 10)',
        'JSON export',
        'Single user',
      ],
      limits: [
        'Limited workflow library',
        'Basic report format',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29,
      interval: 'month',
      description: 'Full workflow intelligence for professionals',
      cta: 'Start Pro Trial',
      ctaHref: '/signup?plan=pro',
      highlighted: true,
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
      features: [
        'Unlimited recordings',
        'Full workflow library',
        'Advanced SOP generation',
        'Process map visualization',
        'Search and filtering',
        'Premium report format',
        'All export formats',
        'Extension auto-sync',
        'Priority support',
      ],
      limits: [],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      interval: null,
      description: 'Workflow intelligence for teams and organizations',
      cta: 'Contact Sales',
      ctaHref: `mailto:hello@ledgerium.ai?subject=Ledgerium Enterprise`,
      highlighted: false,
      features: [
        'Everything in Pro',
        'Team workspaces',
        'Shared workflow library',
        'Admin controls and permissions',
        'Process governance',
        'Aggregated analytics',
        'SSO / SAML',
        'Dedicated support',
        'Custom integrations',
      ],
      limits: [],
    },
  ],
} as const;
