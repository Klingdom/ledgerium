'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, XCircle, FileJson, Loader2 } from 'lucide-react';
import { track } from '@/lib/analytics';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResult {
  workflowId?: string;
  title?: string;
  stepCount?: number;
  toolsUsed?: string[];
  error?: string;
  details?: string[];
}

export default function UploadPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
        track({ event: 'workflow_uploaded', stepCount: data.stepCount ?? 0, systemCount: data.toolsUsed?.length ?? 0 });
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
  }, []);

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

  return (
    <div className="mx-auto max-w-ds-content">
      <div className="mb-ds-6">
        <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">Upload Workflow</h1>
        <p className="mt-ds-1 text-ds-sm text-gray-500">
          Upload a Ledgerium recorder JSON file to add it to your workflow library.
        </p>
      </div>

      {/* Drop zone */}
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
          if (state !== 'uploading') {
            document.getElementById('file-input')?.click();
          }
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

        <input
          id="file-input"
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

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
                  {result.toolsUsed && result.toolsUsed.length > 0 && (
                    <> across {result.toolsUsed.join(', ')}</>
                  )}
                </p>
                <div className="mt-ds-3 flex gap-ds-2">
                  <button
                    onClick={() => router.push(`/workflows/${result.workflowId}`)}
                    className="btn-primary text-xs"
                  >
                    View Workflow
                  </button>
                  <button
                    onClick={() => { setState('idle'); setResult(null); }}
                    className="btn-secondary text-xs"
                  >
                    Upload Another
                  </button>
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
                <button
                  onClick={() => { setState('idle'); setResult(null); }}
                  className="btn-secondary text-xs mt-ds-3"
                >
                  Try Again
                </button>
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
          The file will be validated and processed using the deterministic workflow engine.
        </p>
      </div>
    </div>
  );
}
