'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, CheckCircle, XCircle, FileJson, Loader2, Zap, Lock } from 'lucide-react';
import { track } from '@/lib/analytics';

type UploadState = 'idle' | 'uploading' | 'success' | 'error' | 'upgrade_required';

interface UploadResult {
  workflowId?: string;
  title?: string;
  stepCount?: number;
  toolsUsed?: string[];
  error?: string;
  detail?: string;
  details?: string[];
  code?: string;
  currentUsage?: number;
  limit?: number;
}

interface AccountInfo {
  plan: string;
  uploadCount: number;
}

export default function UploadPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  // Load account info for limit display
  useEffect(() => {
    fetch('/api/account').then(async res => {
      if (res.ok) {
        const data = await res.json();
        setAccount({ plan: data.plan, uploadCount: data.uploadCount });
      }
    });
    track({ event: 'page_viewed', path: '/upload' });
  }, []);

  const FREE_LIMIT = 5;
  const isAtLimit = account?.plan === 'free' && (account?.uploadCount ?? 0) >= FREE_LIMIT;
  const uploadsRemaining = account?.plan === 'free' ? Math.max(0, FREE_LIMIT - (account?.uploadCount ?? 0)) : null;

  const handleUpload = useCallback(async (file: File) => {
    setState('uploading');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setState('success');
        setResult(data);
        // Update local count
        if (account) setAccount({ ...account, uploadCount: account.uploadCount + 1 });
        track({ event: 'workflow_uploaded', stepCount: data.stepCount ?? 0, systemCount: data.toolsUsed?.length ?? 0 });
      } else if (data.code === 'UPGRADE_REQUIRED') {
        setState('upgrade_required');
        setResult(data);
      } else {
        setState('error');
        setResult(data);
        track({ event: 'upload_failed', error: data.error ?? 'Unknown error' });
      }
    } catch {
      setState('error');
      setResult({ error: 'Network error — please try again' });
      track({ event: 'upload_failed', error: 'Network error' });
    }
  }, [account]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  async function handleUpgrade() {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch { /* handled below */ }
    setBillingLoading(false);
  }

  return (
    <div className="mx-auto max-w-ds-content">
      <div className="mb-ds-6">
        <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">Upload Workflow</h1>
        <p className="mt-ds-1 text-ds-sm text-gray-500">
          Upload a Ledgerium recorder JSON file to add it to your workflow library.
        </p>
      </div>

      {/* Usage counter for free users */}
      {account && account.plan === 'free' && (
        <div className={`card px-ds-5 py-ds-3 mb-ds-4 flex items-center justify-between ${isAtLimit ? 'border-amber-200 bg-amber-50/50' : ''}`}>
          <div className="flex items-center gap-ds-3">
            <div className="flex items-center gap-ds-2">
              <span className="text-ds-sm text-gray-600">
                Uploads: <strong className="text-gray-900 tabular-nums">{account.uploadCount}</strong>
                <span className="text-gray-400"> / {FREE_LIMIT}</span>
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-24 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-amber-500' : 'bg-brand-500'}`}
                style={{ width: `${Math.min(100, (account.uploadCount / FREE_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
          {isAtLimit ? (
            <button onClick={handleUpgrade} disabled={billingLoading} className="btn-primary text-xs gap-1">
              <Zap className="h-3.5 w-3.5" />
              {billingLoading ? 'Redirecting...' : 'Upgrade to Pro'}
            </button>
          ) : uploadsRemaining !== null && uploadsRemaining <= 2 ? (
            <span className="text-ds-xs text-amber-600 font-medium">{uploadsRemaining} remaining</span>
          ) : null}
        </div>
      )}

      {account?.plan === 'pro' && (
        <div className="card px-ds-5 py-ds-3 mb-ds-4 flex items-center gap-ds-2 text-ds-sm text-gray-600">
          <Zap className="h-4 w-4 text-brand-600" />
          <span>Pro plan — <strong className="text-gray-900">unlimited uploads</strong></span>
        </div>
      )}

      {/* Drop zone — disabled if at limit */}
      {isAtLimit ? (
        <div className="card flex flex-col items-center justify-center px-ds-8 py-ds-12 text-center border-2 border-dashed border-amber-300 bg-amber-50/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Lock className="h-7 w-7 text-amber-500" />
          </div>
          <h3 className="mt-ds-4 text-ds-lg font-semibold text-gray-900">Free plan limit reached</h3>
          <p className="mt-ds-2 text-ds-sm text-gray-500 max-w-sm">
            You've used all {FREE_LIMIT} uploads on the free plan. Upgrade to Pro for unlimited workflow uploads, advanced templates, and more.
          </p>
          <button onClick={handleUpgrade} disabled={billingLoading} className="btn-primary mt-ds-4 gap-1.5">
            <Zap className="h-4 w-4" />
            {billingLoading ? 'Redirecting to checkout...' : 'Upgrade to Pro — $29/mo'}
          </button>
          <Link href="/pricing" className="mt-ds-2 text-ds-xs text-gray-400 hover:text-gray-600">
            See plan details
          </Link>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`card flex flex-col items-center justify-center px-ds-8 py-ds-12 text-center transition-all ${
            isDragOver
              ? 'border-brand-400 bg-brand-50 border-2 border-dashed shadow-md'
              : 'border-2 border-dashed border-gray-300 hover:border-gray-400'
          } ${state === 'uploading' ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
          onClick={() => {
            if (state !== 'uploading') document.getElementById('file-input')?.click();
          }}
        >
          {state === 'uploading' ? (
            <>
              <Loader2 className="h-10 w-10 text-brand-500 animate-spin" />
              <p className="mt-ds-3 text-ds-base font-medium text-gray-700">Processing workflow...</p>
              <p className="mt-ds-1 text-ds-xs text-gray-400">Validating and running deterministic pipeline</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <Upload className="h-7 w-7 text-gray-400" />
              </div>
              <p className="mt-ds-4 text-ds-base font-medium text-gray-700">Drag and drop your JSON file here</p>
              <p className="mt-ds-1 text-ds-xs text-gray-400">or click to browse — accepts Ledgerium recorder .json files</p>
            </>
          )}

          <input id="file-input" type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
        </div>
      )}

      {/* Success */}
      {state === 'success' && result && (
        <div className="mt-ds-6">
          <div className="ds-callout ds-callout-success">
            <div className="flex items-start gap-ds-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-ds-sm font-semibold text-gray-900">Workflow created</h3>
                <p className="mt-ds-1 text-ds-sm text-gray-600">
                  <strong>{result.title}</strong> — {result.stepCount} steps
                  {result.toolsUsed && result.toolsUsed.length > 0 && <> across {result.toolsUsed.join(', ')}</>}
                </p>
                <div className="mt-ds-3 flex gap-ds-2">
                  <button onClick={() => router.push(`/workflows/${result.workflowId}`)} className="btn-primary text-xs">
                    View Workflow
                  </button>
                  <button onClick={() => { setState('idle'); setResult(null); }} className="btn-secondary text-xs">
                    Upload Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade required (from API 403) */}
      {state === 'upgrade_required' && result && (
        <div className="mt-ds-6">
          <div className="ds-callout ds-callout-warning">
            <div className="flex items-start gap-ds-3">
              <Lock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-ds-sm font-semibold text-gray-900">Upgrade to continue</h3>
                <p className="mt-ds-1 text-ds-sm text-gray-600">{result.detail ?? result.error}</p>
                <div className="mt-ds-3 flex gap-ds-2">
                  <button onClick={handleUpgrade} disabled={billingLoading} className="btn-primary text-xs gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    {billingLoading ? 'Redirecting...' : 'Upgrade to Pro — $29/mo'}
                  </button>
                  <Link href="/pricing" className="btn-secondary text-xs">See plan details</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && result && (
        <div className="mt-ds-6">
          <div className="ds-callout ds-callout-danger">
            <div className="flex items-start gap-ds-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-ds-sm font-semibold text-gray-900">Upload failed</h3>
                <p className="mt-ds-1 text-ds-sm text-red-600">{result.error}</p>
                {result.details && result.details.length > 0 && (
                  <ul className="mt-ds-2 space-y-1">
                    {result.details.slice(0, 5).map((d, i) => (
                      <li key={i} className="text-ds-xs text-gray-500 font-mono">{d}</li>
                    ))}
                  </ul>
                )}
                <button onClick={() => { setState('idle'); setResult(null); }} className="btn-secondary text-xs mt-ds-3">Try Again</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-ds-8 card px-ds-5 py-ds-4">
        <h3 className="ds-section-label">Supported Format</h3>
        <div className="mt-ds-2 flex items-center gap-ds-2 text-ds-sm text-gray-600">
          <FileJson className="h-4 w-4 text-gray-400" />
          Ledgerium recorder session bundle (.json)
        </div>
        <p className="mt-ds-2 text-ds-xs text-gray-400">
          Export a recording from the Ledgerium browser extension, then upload the JSON file here.
        </p>
      </div>
    </div>
  );
}
