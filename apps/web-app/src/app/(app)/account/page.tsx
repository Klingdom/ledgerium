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

  const planLabels: Record<string, string> = { free: 'Free', pro: 'Pro', team: 'Team' };
  const statusLabels: Record<string, { label: string; cls: string }> = {
    trialing: { label: 'Trial', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    active: { label: 'Active', cls: 'bg-green-50 text-green-700 border border-green-200' },
    past_due: { label: 'Past Due', cls: 'bg-red-50 text-red-700 border border-red-200' },
    canceled: { label: 'Canceled', cls: 'bg-gray-100 text-gray-600' },
    none: { label: 'Free', cls: 'bg-gray-100 text-gray-500' },
  };

  return (
    <div className="mx-auto max-w-ds-content space-y-ds-6">
      <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">Account</h1>

      {/* Profile */}
      <div className="card px-ds-5 py-ds-5">
        <div className="flex items-center gap-ds-3 mb-ds-4">
          <User className="h-5 w-5 text-gray-400" />
          <h2 className="text-ds-base font-semibold text-gray-900">Profile</h2>
        </div>
        <dl className="space-y-ds-3 text-ds-sm">
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
            <dd className="text-gray-900">{account?.createdAt ? new Date(account.createdAt).toLocaleDateString() : '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Plan */}
      <div className="card px-ds-5 py-ds-5">
        <div className="flex items-center gap-ds-3 mb-ds-4">
          <CreditCard className="h-5 w-5 text-gray-400" />
          <h2 className="text-ds-base font-semibold text-gray-900">Plan & Billing</h2>
        </div>
        <dl className="space-y-ds-3 text-ds-sm">
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Current Plan</dt>
            <dd className="font-semibold text-gray-900">{planLabels[account?.plan ?? 'free'] ?? 'Free'}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Status</dt>
            <dd>
              {account && (
                <span className={`rounded-ds-sm px-2.5 py-0.5 text-ds-xs font-medium ${statusLabels[account.subscriptionStatus]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                  {statusLabels[account.subscriptionStatus]?.label ?? account.subscriptionStatus}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Uploads</dt>
            <dd className="text-gray-900 tabular-nums">
              {account?.uploadCount ?? 0}
              {account?.plan === 'free' && <span className="text-gray-400"> / 5</span>}
            </dd>
          </div>
        </dl>

        {account?.plan === 'free' && (
          <div className="mt-ds-4 ds-callout ds-callout-info">
            <div className="flex items-start gap-ds-2">
              <Zap className="h-4 w-4 text-brand-600 mt-0.5" />
              <div>
                <p className="text-ds-sm font-medium text-brand-900">Upgrade to Pro</p>
                <p className="mt-0.5 text-ds-xs text-brand-700">
                  Unlimited uploads, full workflow library, advanced search, premium reports.
                </p>
                <button onClick={handleUpgrade} disabled={billingLoading} className="btn-primary mt-ds-3 text-xs">
                  {billingLoading ? 'Redirecting...' : 'Upgrade Now'}
                </button>
                {billingError && <p className="mt-ds-2 text-ds-xs text-red-600">{billingError}</p>}
              </div>
            </div>
          </div>
        )}

        {account?.plan === 'pro' && (
          <div className="mt-ds-4">
            <button onClick={handleManageBilling} className="btn-secondary text-xs">
              Manage Subscription
            </button>
          </div>
        )}
      </div>

      {/* Extension Sync */}
      <div className="card px-ds-5 py-ds-5">
        <div className="flex items-center justify-between mb-ds-4">
          <div className="flex items-center gap-ds-3">
            <Key className="h-5 w-5 text-gray-400" />
            <h2 className="text-ds-base font-semibold text-gray-900">Extension Sync</h2>
          </div>
          {apiKeys.length < 3 && (
            <button onClick={handleCreateKey} disabled={isCreating} className="btn-secondary gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              {isCreating ? 'Creating...' : 'New API Key'}
            </button>
          )}
        </div>

        <p className="text-ds-xs text-gray-500 mb-ds-4">
          Connect your Ledgerium browser extension to automatically sync recordings
          to your workflow library.
        </p>

        {newKey && (
          <div className="ds-callout ds-callout-success mb-ds-4">
            <p className="text-ds-xs font-semibold text-green-800 mb-ds-1">
              API key created — copy it now. It will not be shown again.
            </p>
            <div className="flex items-center gap-ds-2">
              <code className="flex-1 rounded-ds-md bg-white px-ds-3 py-ds-2 text-ds-xs font-mono text-gray-900 border border-green-200 select-all">
                {newKey}
              </code>
              <button onClick={handleCopyKey} className="btn-secondary text-xs gap-1 flex-shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-ds-3 rounded-ds-md bg-white border border-green-200 px-ds-3 py-ds-3">
              <p className="ds-section-label mb-ds-1">Extension Settings</p>
              <p className="text-ds-xs text-gray-700">
                <strong>Sync URL:</strong>{' '}
                <code className="text-brand-600">{typeof window !== 'undefined' ? `${window.location.origin}/api/sync` : '/api/sync'}</code>
              </p>
              <p className="text-ds-xs text-gray-700 mt-0.5">
                <strong>API Key:</strong> <code className="text-brand-600">{newKey}</code>
              </p>
            </div>
            <button onClick={() => setNewKey(null)} className="mt-ds-2 text-ds-xs text-green-700 hover:text-green-800">
              Dismiss
            </button>
          </div>
        )}

        {apiKeys.length === 0 && !newKey ? (
          <div className="text-center py-ds-6">
            <Key className="mx-auto h-8 w-8 text-gray-200" />
            <p className="mt-ds-2 text-ds-xs text-gray-400">No API keys yet. Create one to start syncing.</p>
          </div>
        ) : (
          <div className="space-y-ds-2">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-ds-md border border-gray-100 px-ds-3 py-ds-2">
                <div>
                  <p className="text-ds-xs font-mono text-gray-700">{k.prefix}...</p>
                  <p className="text-ds-xs text-gray-400">
                    {k.label}
                    {k.lastUsedAt && <> · Last used {new Date(k.lastUsedAt).toLocaleDateString()}</>}
                    {!k.lastUsedAt && <> · Never used</>}
                  </p>
                </div>
                <button onClick={() => handleDeleteKey(k.id)} className="rounded-ds-sm p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500" title="Revoke">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust */}
      <div className="card px-ds-5 py-ds-5">
        <div className="flex items-center gap-ds-3 mb-ds-4">
          <Shield className="h-5 w-5 text-gray-400" />
          <h2 className="text-ds-base font-semibold text-gray-900">Trust & Privacy</h2>
        </div>
        <ul className="space-y-ds-2 text-ds-sm text-gray-600">
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
