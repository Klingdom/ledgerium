'use client';

/**
 * Diagnostic global error boundary.
 *
 * Next.js's built-in root fallback only says "Application error: a client-side
 * exception has occurred (see the browser console for more information)" — which
 * hides the real cause. This boundary replaces it and renders the ACTUAL error
 * (name / message / digest / stack) directly on the page, using INLINE styles so
 * it is readable even when the app's CSS or JS bundle failed to apply.
 *
 * Production is built with `productionBrowserSourceMaps: true`, so the stack
 * below resolves to real component/file/line — copy this screen to support and
 * the exact cause can be fixed in one shot. Remove this file once the recurring
 * hydration error is closed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Also log to the console for completeness (where React's hydration "Server vs
  // Client" diff appears).
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.error('[ledgerium][global-error]', error);
  }

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '24px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          background: '#0b0b0c',
          color: '#e6e6e6',
          lineHeight: 1.55,
        }}
      >
        <h1 style={{ color: '#ff6b6b', fontSize: 18, margin: '0 0 4px' }}>
          Ledgerium — captured error (diagnostic build)
        </h1>
        <p style={{ color: '#9aa0a6', margin: '0 0 16px' }}>
          Copy/screenshot this whole box and send it to support — it pinpoints the exact fix.
        </p>
        <div
          style={{
            background: '#161617',
            border: '1px solid #2a2a2e',
            borderRadius: 8,
            padding: 16,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 13,
          }}
        >
          <div>
            <strong style={{ color: '#79c0ff' }}>name:</strong> {error?.name || '(none)'}
          </div>
          <div>
            <strong style={{ color: '#79c0ff' }}>message:</strong> {error?.message || '(none)'}
          </div>
          <div>
            <strong style={{ color: '#79c0ff' }}>digest:</strong> {error?.digest || '(none)'}
          </div>
          <div style={{ marginTop: 12 }}>
            <strong style={{ color: '#79c0ff' }}>stack:</strong>
          </div>
          <div style={{ color: '#cdd9e5' }}>{error?.stack || '(no stack available)'}</div>
        </div>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
