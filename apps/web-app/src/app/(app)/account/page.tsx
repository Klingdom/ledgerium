'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { User, CreditCard, Shield, Zap, Key, Copy, Check, Trash2, Plus } from 'lucide-react';

interface AccountData {
  plan: string;
  subscriptionStatus: string;
  uploadCount: number;
  email: string;
  name: string | null;
  createdAt: string;
}

interface ApiKeyInfo {
  id: string;
  prefix: string;
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function AccountPage() {
  const { data: session } = useSession();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const [accountRes, keysRes] = await Promise.all([
        fetch('/api/account'),
        fetch('/api/keys'),
      ]);
      if (accountRes.ok) setAccount(await accountRes.json());
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
      // Refresh key list
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

  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');

  async function handleUpgrade() {
    setBillingLoading(true);
    setBillingError('');
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
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

  const planLabels: Record<string, string> = {
    free: 'Free Trial',
    pro: 'Pro',
    team: 'Team',
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    trialing: { label: 'Trial', color: 'bg-blue-100 text-blue-700' },
    active: { label: 'Active', color: 'bg-green-100 text-green-700' },
    past_due: { label: 'Past Due', color: 'bg-red-100 text-red-700' },
    canceled: { label: 'Canceled', color: 'bg-gray-100 text-gray-700' },
    none: { label: 'No Plan', color: 'bg-gray-100 text-gray-500' },
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Account</h1>

      {/* Profile */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{session?.user?.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium text-gray-900">{account?.name ?? session?.user?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Member since</dt>
            <dd className="text-gray-900">
              {account?.createdAt
                ? new Date(account.createdAt).toLocaleDateString()
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Plan */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Plan & Billing</h2>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Current Plan</dt>
            <dd className="font-semibold text-gray-900">
              {planLabels[account?.plan ?? 'free'] ?? 'Free Trial'}
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Status</dt>
            <dd>
              {account && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  statusLabels[account.subscriptionStatus]?.color ?? 'bg-gray-100 text-gray-500'
                }`}>
                  {statusLabels[account.subscriptionStatus]?.label ?? account.subscriptionStatus}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Uploads Used</dt>
            <dd className="text-gray-900">
              {account?.uploadCount ?? 0}
              {account?.plan === 'free' && <span className="text-gray-400"> / 5</span>}
            </dd>
          </div>
        </dl>

        {account?.plan === 'free' && (
          <div className="mt-4 rounded-lg bg-brand-50 p-4">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-brand-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-900">Upgrade to Pro</p>
                <p className="mt-0.5 text-xs text-brand-700">
                  Unlimited uploads, full workflow library, advanced search,
                  premium reports, and better exports.
                </p>
                <button onClick={handleUpgrade} disabled={billingLoading} className="btn-primary mt-3 text-xs">
                  {billingLoading ? 'Redirecting to Stripe...' : 'Upgrade Now'}
                </button>
                {billingError && (
                  <p className="mt-2 text-xs text-red-600">{billingError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {account?.plan === 'pro' && (
          <div className="mt-4 flex gap-2">
            <button onClick={handleManageBilling} className="btn-secondary text-xs">
              Manage Subscription
            </button>
          </div>
        )}
      </div>

      {/* Extension Sync */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Extension Sync</h2>
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

        <p className="text-xs text-gray-500 mb-4">
          Connect your Ledgerium browser extension to automatically sync recordings
          to your workflow library. Create an API key, then paste it into the extension settings.
        </p>

        {/* New key banner */}
        {newKey && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4">
            <p className="text-xs font-semibold text-green-800 mb-1">
              API key created — copy it now. It will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 text-xs font-mono text-gray-900 border border-green-200 select-all">
                {newKey}
              </code>
              <button onClick={handleCopyKey} className="btn-secondary text-xs gap-1 flex-shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-3 rounded bg-white border border-green-200 p-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Extension Settings
              </p>
              <p className="text-xs text-gray-700">
                <strong>Sync URL:</strong>{' '}
                <code className="text-brand-600">{typeof window !== 'undefined' ? `${window.location.origin}/api/sync` : '/api/sync'}</code>
              </p>
              <p className="text-xs text-gray-700 mt-0.5">
                <strong>API Key:</strong> <code className="text-brand-600">{newKey}</code>
              </p>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="mt-2 text-xs text-green-700 hover:text-green-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Key list */}
        {apiKeys.length === 0 && !newKey ? (
          <div className="text-center py-4">
            <Key className="mx-auto h-8 w-8 text-gray-200" />
            <p className="mt-2 text-xs text-gray-400">
              No API keys yet. Create one to start syncing from the extension.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-xs font-mono text-gray-700">{k.prefix}...</p>
                  <p className="text-[10px] text-gray-400">
                    {k.label}
                    {k.lastUsedAt && <> &middot; Last used {new Date(k.lastUsedAt).toLocaleDateString()}</>}
                    {!k.lastUsedAt && <> &middot; Never used</>}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(k.id)}
                  className="rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                  title="Revoke key"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Trust & Privacy</h2>
        </div>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
            All workflow processing is deterministic — same input, same output
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
            Sensitive values are never stored — only field labels are preserved
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
            Your workflow data is private to your account
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
            No AI inference is applied to generate workflow content
          </li>
        </ul>
      </div>
    </div>
  );
}
