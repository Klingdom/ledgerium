'use client';

/**
 * Root error boundary (replaces Next's "Application error" fallback).
 *
 * Shows a plain message, a retry button, a link home and the error digest as a
 * support reference. It NEVER renders the error's name, message or stack: those
 * can carry recorded content and internals, and the earlier diagnostic version
 * (backlog #283, CEO decision 2026-10-02) was retired. The digest is an opaque
 * hash that matches the full error in the server log.
 *
 * Inline styles on purpose: this boundary replaces the root layout, so the
 * app's CSS may not have loaded.
 */
import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import { safeErrorName } from '@/lib/safe-error-name';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Row #246: report once per error, constructor name only.
  useEffect(() => {
    track({ event: 'client_error', errorName: safeErrorName(error), boundary: 'root' });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          background: '#ffffff',
          color: '#111827',
          lineHeight: 1.55,
        }}
      >
        <main style={{ maxWidth: 420, margin: '15vh auto 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', color: '#4b5563' }}>
            An unexpected error occurred. This has been logged for review.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '8px 16px',
                background: '#1d4ed8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Try again
            </button>
            <a href="/" style={{ color: '#1d4ed8', fontSize: 14 }}>
              Go to home
            </a>
          </div>
          {error?.digest && (
            <p style={{ marginTop: 20, fontSize: 12, color: '#6b7280' }}>Error ID: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
