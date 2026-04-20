'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User,
  CreditCard,
  Shield,
  Zap,
  Key,
  Copy,
  Check,
  Trash2,
  Plus,
  BarChart3,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { PRICING_CONFIG } from '@/lib/config';
import { PLAN_HIERARCHY } from '@/lib/plans';
import type { PlanType } from '@/lib/plans';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountData {
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    subscriptionStatus: string;
    createdAt: string;
    hasStripeCustomer: boolean;
  };
  features: Record<string, boolean>;
  limits: {
    recordings: { used: number; max: number | 'unlimited' };
    seats: { max: number | 'unlimited' };
    recorders: { max: number | 'unlimited' };
  };
}

interface ApiKeyInfo {
  id: string;
  prefix: string;
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const planLabels: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  team: 'Team',
  growth: 'Growth',
  enterprise: 'Enterprise',
};

const statusLabels: Record<string, { label: string; cls: string }> = {
  trialing: { label: 'Trial', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  active: { label: 'Active', cls: 'bg-green-50 text-green-700 border border-green-200' },
  past_due: { label: 'Past Due', cls: 'bg-red-50 text-red-700 border border-red-200' },
  canceled: {
    label: 'Canceled',
    cls: 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]',
  },
  none: {
    label: 'Free',
    cls: 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]',
  },
};

function formatRecordingsUsage(
  used: number,
  max: number | 'unlimited',
): string {
  if (max === 'unlimited') return `${used} recordings this month`;
  return `${used} / ${max}`;
}

// ---------------------------------------------------------------------------
// Plan selector sub-components
// ---------------------------------------------------------------------------

type BillingInterval = 'monthly' | 'annual';

interface PlanCardProps {
  planId: string;
  currentPlan: PlanType;
  billingInterval: BillingInterval;
  hasStripeCustomer: boolean;
  billingLoading: boolean;
  onUpgrade: (plan: 'starter' | 'team' | 'growth', interval: BillingInterval) => void;
  onManage: () => void;
}

function PlanCard({
  planId,
  currentPlan,
  billingInterval,
  hasStripeCustomer,
  billingLoading,
  onUpgrade,
  onManage,
}: PlanCardProps) {
  const config = PRICING_CONFIG.plans.find((p) => p.id === planId);
  if (!config) return null;

  const isCurrentPlan = planId === currentPlan;
  const isEnterpriseCurrent = currentPlan === 'enterprise';

  const currentIdx = PLAN_HIERARCHY.indexOf(currentPlan as PlanType);
  const cardIdx = PLAN_HIERARCHY.indexOf(planId as PlanType);
  const isHigherTier = cardIdx > currentIdx;
  const isLowerTier = cardIdx < currentIdx;

  const displayPrice =
    billingInterval === 'annual' && config.annualPrice != null
      ? config.annualPrice
      : config.price;

  // Determine action button
  let actionButton: React.ReactNode;

  if (isCurrentPlan) {
    actionButton = (
      <button
        disabled
        className="w-full btn-secondary text-xs opacity-60 cursor-not-allowed"
        aria-disabled="true"
      >
        Current Plan
      </button>
    );
  } else if (isEnterpriseCurrent) {
    // Enterprise users see all other plans disabled
    actionButton = (
      <span className="block w-full text-center rounded-full bg-brand-900/20 text-brand-500 text-xs font-medium px-3 py-1.5">
        Included in Enterprise
      </span>
    );
  } else if (planId === 'enterprise') {
    // Contact sales
    actionButton = (
      <a
        href="mailto:sales@ledgerium.ai?subject=Enterprise Plan Inquiry"
        className="w-full text-center btn-secondary text-xs"
      >
        Contact Sales
      </a>
    );
  } else if (isHigherTier && (planId === 'starter' || planId === 'team' || planId === 'growth')) {
    // Upgrade path
    actionButton = (
      <button
        onClick={() => onUpgrade(planId as 'starter' | 'team' | 'growth', billingInterval)}
        disabled={billingLoading}
        className={`w-full text-xs ${config.highlighted ? 'btn-primary' : 'btn-secondary'}`}
      >
        {billingLoading ? 'Redirecting...' : `Upgrade to ${config.name}`}
      </button>
    );
  } else if (isLowerTier && planId === 'free') {
    // Cancel subscription → portal
    actionButton = (
      <button
        onClick={onManage}
        disabled={billingLoading || !hasStripeCustomer}
        title={!hasStripeCustomer ? 'No active subscription to modify' : undefined}
        className="w-full btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel Subscription
      </button>
    );
  } else if (isLowerTier) {
    // Downgrade → portal
    actionButton = (
      <button
        onClick={onManage}
        disabled={billingLoading || !hasStripeCustomer}
        title={!hasStripeCustomer ? 'No active subscription to modify' : undefined}
        className="w-full btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Downgrade
      </button>
    );
  } else {
    // Fallback — should not happen given hierarchy is exhaustive
    actionButton = null;
  }

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 ${
        isCurrentPlan
          ? 'border-brand-300 ring-1 ring-brand-200 bg-[var(--surface-elevated)]'
          : 'border-[var(--border-default)] bg-[var(--surface-elevated)]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-ds-sm font-bold text-[var(--content-primary)]">{config.name}</h3>
          {isCurrentPlan && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-900/15 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <p className="text-ds-xs text-[var(--content-secondary)] leading-relaxed">
          {config.description}
        </p>
      </div>

      {/* Price */}
      <div>
        {displayPrice !== null ? (
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-[var(--content-primary)]">${displayPrice}</span>
            {displayPrice > 0 && config.interval && (
              <span className="text-ds-xs text-[var(--content-tertiary)]">/{config.interval}</span>
            )}
            {displayPrice === 0 && (
              <span className="text-ds-xs text-[var(--content-tertiary)]">forever</span>
            )}
          </div>
        ) : (
          <p className="text-lg font-bold text-[var(--content-primary)]">Custom</p>
        )}
        {billingInterval === 'annual' &&
          config.annualPrice != null &&
          config.annualPrice > 0 &&
          config.price != null && (
            <p className="text-ds-xs text-[var(--content-tertiary)]">
              <span className="line-through">${config.price}</span>/mo monthly
            </p>
          )}
        {billingInterval === 'monthly' &&
          config.annualPrice != null &&
          config.annualPrice > 0 && (
            <p className="text-ds-xs text-[var(--content-tertiary)]">
              ${config.annualPrice}/mo billed annually
            </p>
          )}
      </div>

      {/* Action */}
      {actionButton}

      {/* Feature list */}
      <ul className="space-y-1.5 mt-1">
        {config.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <Check className="h-3 w-3 mt-0.5 flex-shrink-0 text-[var(--content-tertiary)]" />
            <span className="text-ds-xs text-[var(--content-primary)] leading-relaxed">{f}</span>
          </li>
        ))}
        {config.limits.map((l) => (
          <li key={l} className="flex items-start gap-1.5">
            <span className="h-3 w-3 mt-0.5 flex-shrink-0 text-center text-[var(--content-tertiary)] text-[10px]">
              &mdash;
            </span>
            <span className="text-ds-xs text-[var(--content-tertiary)] leading-relaxed">{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AccountPage() {
  const { data: session } = useSession();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  useEffect(() => {
    async function load() {
      const [accountRes, keysRes] = await Promise.all([
        fetch('/api/account'),
        fetch('/api/keys'),
      ]);
      if (accountRes.ok) {
        const json = await accountRes.json();
        setAccount(json.data);
      }
      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.keys);
      }
    }
    load();
  }, []);

  async function handleCreateKey() {
    setIsCreating(true);
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Extension' }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key);
      const keysRes = await fetch('/api/keys');
      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setApiKeys(keysData.keys);
      }
    }
    setIsCreating(false);
  }

  async function handleDeleteKey(id: string) {
    if (!confirm('Revoke this API key? The extension will no longer be able to sync.')) return;
    await fetch('/api/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function handleCopyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleUpgrade(
    plan: 'starter' | 'team' | 'growth',
    interval: BillingInterval,
  ) {
    setBillingLoading(true);
    setBillingError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingError(data.error ?? 'Could not start checkout');
    } catch {
      setBillingError('Failed to connect to billing service');
    }
    setBillingLoading(false);
  }

  async function handleManageBilling() {
    setBillingLoading(true);
    setBillingError('');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingError(data.error ?? 'Could not open billing portal');
    } catch {
      setBillingError('Failed to connect to billing service');
    }
    setBillingLoading(false);
  }

  const currentPlan = (account?.user?.plan ?? 'free') as PlanType;
  const isEnterprise = currentPlan === 'enterprise';

  return (
    <div className="mx-auto max-w-ds-content space-y-ds-6">
      <h1 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">Account</h1>

      {/* Profile */}
      <div className="card px-ds-5 py-ds-5">
        <div className="flex items-center gap-ds-3 mb-ds-4">
          <User className="h-5 w-5 text-[var(--content-tertiary)]" />
          <h2 className="text-ds-base font-semibold text-[var(--content-primary)]">Profile</h2>
        </div>
        <dl className="space-y-ds-3 text-ds-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--content-secondary)]">Email</dt>
            <dd className="font-medium text-[var(--content-primary)]">
              {session?.user?.email ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--content-secondary)]">Name</dt>
            <dd className="font-medium text-[var(--content-primary)]">
              {account?.user?.name ?? session?.user?.name ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--content-secondary)]">Member since</dt>
            <dd className="text-[var(--content-primary)]">
              {account?.user?.createdAt
                ? new Date(account.user.createdAt).toLocaleDateString()
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Plan & Billing */}
      <div className="card px-ds-5 py-ds-5">
        <div className="flex items-center gap-ds-3 mb-ds-4">
          <CreditCard className="h-5 w-5 text-[var(--content-tertiary)]" />
          <h2 className="text-ds-base font-semibold text-[var(--content-primary)]">
            Plan & Billing
          </h2>
          <a
            href="/docs#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[var(--content-tertiary)] hover:text-brand-400 transition-colors"
            title="Compare plans"
          >
            <HelpCircle className="h-4 w-4" />
          </a>
        </div>

        {/* Current usage summary */}
        <dl className="space-y-ds-3 text-ds-sm mb-ds-5">
          <div className="flex justify-between items-center">
            <dt className="text-[var(--content-secondary)]">Current Plan</dt>
            <dd className="font-semibold text-[var(--content-primary)]">
              {planLabels[currentPlan] ?? 'Free'}
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-[var(--content-secondary)]">Status</dt>
            <dd>
              {account && (
                <span
                  className={`rounded-ds-sm px-2.5 py-0.5 text-ds-xs font-medium ${
                    statusLabels[account.user.subscriptionStatus]?.cls ??
                    'bg-[var(--surface-secondary)] text-[var(--content-secondary)]'
                  }`}
                >
                  {statusLabels[account.user.subscriptionStatus]?.label ??
                    account.user.subscriptionStatus}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--content-secondary)]">Recordings</dt>
            <dd className="text-[var(--content-primary)] tabular-nums">
              {account
                ? formatRecordingsUsage(
                    account.limits.recordings.used,
                    account.limits.recordings.max,
                  )
                : '—'}
            </dd>
          </div>
        </dl>

        {/* Billing interval toggle — hidden for enterprise */}
        {!isEnterprise && (
          <div className="flex items-center gap-3 mb-ds-5">
            <span
              className={`text-ds-xs font-medium ${
                billingInterval === 'monthly'
                  ? 'text-[var(--content-primary)]'
                  : 'text-[var(--content-tertiary)]'
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingInterval((prev) => (prev === 'monthly' ? 'annual' : 'monthly'))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingInterval === 'annual'
                  ? 'bg-brand-600'
                  : 'bg-[var(--surface-secondary)] border border-[var(--border-default)]'
              }`}
              aria-label="Toggle annual billing"
              role="switch"
              aria-checked={billingInterval === 'annual'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  billingInterval === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-ds-xs font-medium ${
                billingInterval === 'annual'
                  ? 'text-[var(--content-primary)]'
                  : 'text-[var(--content-tertiary)]'
              }`}
            >
              Annual
            </span>
            {billingInterval === 'annual' && (
              <span className="text-[10px] font-medium text-brand-500 bg-brand-900/20 px-2 py-0.5 rounded-full">
                Save ~17%
              </span>
            )}
          </div>
        )}

        {/* Plan selector grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PRICING_CONFIG.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              planId={plan.id}
              currentPlan={currentPlan}
              billingInterval={billingInterval}
              hasStripeCustomer={account?.user?.hasStripeCustomer ?? false}
              billingLoading={billingLoading}
              onUpgrade={handleUpgrade}
              onManage={handleManageBilling}
            />
          ))}
        </div>

        {/* Error state */}
        {billingError && (
          <p className="mt-ds-3 text-ds-xs text-red-600">{billingError}</p>
        )}

        {/* Manage subscription — shown for any user with a Stripe customer */}
        {account?.user?.hasStripeCustomer && (
          <div className="mt-ds-4">
            <button
              onClick={handleManageBilling}
              disabled={billingLoading}
              className="btn-secondary text-xs"
            >
              {billingLoading ? 'Redirecting...' : 'Manage Subscription'}
            </button>
          </div>
        )}

        {/* Free-plan upsell callout */}
        {currentPlan === 'free' && (
          <div className="mt-ds-4 ds-callout ds-callout-info">
            <div className="flex items-start gap-ds-2">
              <Zap className="h-4 w-4 text-brand-600 mt-0.5" />
              <div>
                <p className="text-ds-sm font-medium text-brand-900">Ready to upgrade?</p>
                <p className="mt-0.5 text-ds-xs text-brand-700">
                  Starter includes 15 recordings per month, clean exports, and basic process health
                  scores.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extension Sync */}
      <div className="card px-ds-5 py-ds-5">
        <div className="flex items-center justify-between mb-ds-4">
          <div className="flex items-center gap-ds-3">
            <Key className="h-5 w-5 text-[var(--content-tertiary)]" />
            <h2 className="text-ds-base font-semibold text-[var(--content-primary)]">
              Extension Sync
            </h2>
          </div>
          {apiKeys.length < 3 && (
            <button
              onClick={handleCreateKey}
              disabled={isCreating}
              className="btn-secondary gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {isCreating ? 'Creating...' : 'New API Key'}
            </button>
          )}
        </div>

        <p className="text-ds-xs text-[var(--content-secondary)] mb-ds-4">
          Connect your Ledgerium browser extension to automatically sync recordings to your workflow
          library.
        </p>

        {newKey && (
          <div className="ds-callout ds-callout-success mb-ds-4">
            <p className="text-ds-xs font-semibold text-green-800 mb-ds-1">
              API key created — copy it now. It will not be shown again.
            </p>
            <div className="flex items-center gap-ds-2">
              <code className="flex-1 rounded-ds-md bg-[var(--surface-elevated)] px-ds-3 py-ds-2 text-ds-xs font-mono text-[var(--content-primary)] border border-green-200 select-all">
                {newKey}
              </code>
              <button
                onClick={handleCopyKey}
                className="btn-secondary text-xs gap-1 flex-shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-ds-3 rounded-ds-md bg-[var(--surface-elevated)] border border-green-200 px-ds-3 py-ds-3">
              <p className="ds-section-label mb-ds-1">Extension Settings</p>
              <p className="text-ds-xs text-[var(--content-primary)]">
                <strong>Sync URL:</strong>{' '}
                <code className="text-brand-600">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/api/sync`
                    : '/api/sync'}
                </code>
              </p>
              <p className="text-ds-xs text-[var(--content-primary)] mt-0.5">
                <strong>API Key:</strong> <code className="text-brand-600">{newKey}</code>
              </p>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="mt-ds-2 text-ds-xs text-green-700 hover:text-green-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {apiKeys.length === 0 && !newKey ? (
          <div className="text-center py-ds-6">
            <Key className="mx-auto h-8 w-8 text-[var(--content-tertiary)]" />
            <p className="mt-ds-2 text-ds-xs text-[var(--content-tertiary)]">
              No API keys yet. Create one to start syncing.
            </p>
          </div>
        ) : (
          <div className="space-y-ds-2">
            {apiKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-ds-md border border-[var(--border-subtle)] px-ds-3 py-ds-2"
              >
                <div>
                  <p className="text-ds-xs font-mono text-[var(--content-primary)]">{k.prefix}...</p>
                  <p className="text-ds-xs text-[var(--content-tertiary)]">
                    {k.label}
                    {k.lastUsedAt && <> · Last used {new Date(k.lastUsedAt).toLocaleDateString()}</>}
                    {!k.lastUsedAt && <> · Never used</>}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(k.id)}
                  className="rounded-ds-sm p-1.5 text-[var(--content-tertiary)] hover:bg-red-50 hover:text-red-500"
                  title="Revoke"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin — only visible to admins */}
      {session?.user?.isAdmin && (
        <div className="card px-ds-5 py-ds-5 border-brand-200 bg-brand-50/30">
          <div className="flex items-center gap-ds-3 mb-ds-4">
            <Settings className="h-5 w-5 text-brand-600" />
            <h2 className="text-ds-base font-semibold text-[var(--content-primary)]">Admin</h2>
          </div>
          <div className="space-y-ds-2">
            <Link
              href="/analytics/product"
              className="flex items-center gap-ds-3 rounded-ds-md border border-[var(--border-default)] bg-[var(--surface-elevated)] px-ds-4 py-ds-3 hover:border-brand-200 transition-colors"
            >
              <BarChart3 className="h-4 w-4 text-brand-600" />
              <div>
                <p className="text-ds-sm font-medium text-[var(--content-primary)]">
                  Product Analytics
                </p>
                <p className="text-ds-xs text-[var(--content-secondary)]">
                  User behavior, funnels, activation metrics
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Trust */}
      <div className="card px-ds-5 py-ds-5">
        <div className="flex items-center gap-ds-3 mb-ds-4">
          <Shield className="h-5 w-5 text-[var(--content-tertiary)]" />
          <h2 className="text-ds-base font-semibold text-[var(--content-primary)]">
            Trust & Privacy
          </h2>
        </div>
        <ul className="space-y-ds-2 text-ds-sm text-[var(--content-secondary)]">
          <li className="flex items-start gap-ds-2">
            <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
            All workflow processing is deterministic — same input, same output
          </li>
          <li className="flex items-start gap-ds-2">
            <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
            Sensitive values are never stored — only field labels are preserved
          </li>
          <li className="flex items-start gap-ds-2">
            <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
            Your workflow data is private to your account
          </li>
          <li className="flex items-start gap-ds-2">
            <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
            No AI inference is applied to generate workflow content
          </li>
        </ul>
      </div>
    </div>
  );
}
