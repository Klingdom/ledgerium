'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, XCircle, FileJson, Loader2 } from 'lucide-react';

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
      } else {
        setState('error');
        setResult(data);
      }
    } catch {
      setState('error');
      setResult({ error: 'Network error — please try again' });
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Upload Workflow</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a Ledgerium recorder JSON file to add it to your workflow library.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`card flex flex-col items-center justify-center p-12 text-center transition-colors ${
          isDragOver
            ? 'border-brand-400 bg-brand-50 border-2 border-dashed'
            : 'border-2 border-dashed border-gray-300'
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
            <p className="mt-3 text-sm font-medium text-gray-700">
              Processing workflow...
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Validating and running deterministic pipeline
            </p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-700">
              Drag and drop your JSON file here
            </p>
            <p className="mt-1 text-xs text-gray-400">
              or click to browse — accepts Ledgerium recorder .json files
            </p>
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

      {/* Result */}
      {state === 'success' && result && (
        <div className="card mt-6 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Workflow created</h3>
              <p className="mt-1 text-sm text-gray-600">
                <strong>{result.title}</strong> — {result.stepCount} steps
                {result.toolsUsed && result.toolsUsed.length > 0 && (
                  <> across {result.toolsUsed.join(', ')}</>
                )}
              </p>
              <div className="mt-3 flex gap-2">
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
      )}

      {state === 'error' && result && (
        <div className="card mt-6 p-5">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Upload failed</h3>
              <p className="mt-1 text-sm text-red-600">{result.error}</p>
              {result.details && result.details.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {result.details.slice(0, 5).map((d, i) => (
                    <li key={i} className="text-xs text-gray-500 font-mono">{d}</li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => { setState('idle'); setResult(null); }}
                className="btn-secondary text-xs mt-3"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 rounded-lg bg-gray-100 p-4">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Supported Format
        </h3>
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <FileJson className="h-4 w-4 text-gray-400" />
          Ledgerium recorder session bundle (.json)
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Export a recording from the Ledgerium browser extension, then upload the JSON file here.
          The file will be validated and processed using the deterministic workflow engine.
        </p>
      </div>
    </div>
  );
}
