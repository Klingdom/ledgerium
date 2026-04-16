'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

const STORAGE_KEY = 'ledgerium_extension_toast_shown';
const AUTO_DISMISS_MS = 5000;

interface ExtensionStatusResponse {
  hasExtension: boolean;
  lastSyncAt: string | null;
  keyPrefix: string | null;
}

/**
 * Fetches GET /api/me/extension-status on mount.
 * Shows a one-time success toast when the extension has been connected
 * (i.e. at least one API key has a lastUsedAt value).
 *
 * The toast is suppressed on subsequent visits via localStorage.
 */
export function ExtensionStatusToast() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Guard: only show once per browser profile
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true') {
      return;
    }

    let cancelled = false;

    async function checkExtensionStatus() {
      try {
        const res = await fetch('/api/me/extension-status');
        if (!res.ok) return;

        const data: ExtensionStatusResponse = await res.json();
        if (!data.hasExtension) return;
        if (cancelled) return;

        localStorage.setItem(STORAGE_KEY, 'true');
        setVisible(true);

        // Auto-dismiss
        setTimeout(() => {
          if (!cancelled) setVisible(false);
        }, AUTO_DISMISS_MS);
      } catch {
        // Non-critical — swallow silently
      }
    }

    void checkExtensionStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // Avoid SSR/hydration mismatch — render nothing until client-side
  if (!mounted || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-700/50 bg-emerald-900/90 px-5 py-3.5 text-emerald-100 shadow-lg"
      style={{
        animation: 'ledgerium-toast-in 0.25s ease-out both',
      }}
    >
      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
      <span className="text-sm font-medium">Extension connected. Ready to record.</span>
      <button
        onClick={() => setVisible(false)}
        className="ml-1 rounded p-0.5 hover:bg-emerald-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Scoped keyframe — injected inline so no global CSS change is needed */}
      <style>{`
        @keyframes ledgerium-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
