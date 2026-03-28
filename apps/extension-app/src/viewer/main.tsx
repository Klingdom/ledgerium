import React, { useEffect, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import { ProcessMapViewer } from './ProcessMapViewer.js'
import { MSG } from '../shared/types.js'
import type { SessionBundle } from '../shared/types.js'

// ─── Bundle validation ────────────────────────────────────────────────────────

function isValidBundle(data: unknown): data is SessionBundle {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    typeof d['sessionJson'] === 'object' &&
    Array.isArray(d['normalizedEvents']) &&
    Array.isArray(d['derivedSteps']) &&
    Array.isArray(d['policyLog']) &&
    typeof d['manifest'] === 'object'
  )
}

// ─── File Ingest Screen ───────────────────────────────────────────────────────

function FileIngestScreen({ onBundle }: { onBundle: (b: SessionBundle) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Only .json files are supported.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (!isValidBundle(parsed)) {
          setError('This file is not a valid Ledgerium session bundle. Make sure it contains sessionJson, normalizedEvents, derivedSteps, policyLog, and manifest fields.')
          return
        }
        setError(null)
        onBundle(parsed)
      } catch {
        setError('Failed to parse JSON. Make sure the file is valid.')
      }
    }
    reader.readAsText(file)
  }, [onBundle])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 24,
      padding: 40,
      background: '#0a0e14',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(45,212,191,0.12)',
          border: '1px solid rgba(45,212,191,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#2dd4bf' }}>L</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>
            Ledgerium Process Map
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#4b5563' }}>
            Import a workflow session to visualize
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          width: '100%',
          maxWidth: 400,
          padding: '36px 24px',
          border: `2px dashed ${dragging ? '#2dd4bf' : '#1f2937'}`,
          borderRadius: 14,
          background: dragging ? 'rgba(45,212,191,0.04)' : '#0d1117',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <input
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: '#111827',
          border: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}>
          📂
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#d1d5db' }}>
            Drop a workflow JSON file
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#4b5563' }}>
            or click to browse · ledgerium-{'{'}session-id{'}'}.json
          </p>
        </div>
      </label>

      {error && (
        <div style={{
          maxWidth: 400,
          width: '100%',
          padding: '10px 14px',
          background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8,
          fontSize: 12,
          color: '#f87171',
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Loading / error screens ──────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0a0e14',
    }}>
      <p style={{ fontSize: 13, color: '#374151' }}>Loading session…</p>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: '100vh',
      background: '#0a0e14',
    }}>
      <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{message}</p>
      <button
        onClick={() => window.close()}
        style={{
          background: 'none',
          border: '1px solid #1f2937',
          borderRadius: 6,
          color: '#4b5563',
          fontSize: 12,
          padding: '5px 12px',
          cursor: 'pointer',
        }}
      >
        Close tab
      </button>
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

function App() {
  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('sessionId')
    if (!sessionId) return  // will show file ingest screen

    setLoading(true)

    // MV3 service worker may be asleep when the viewer tab opens.
    // Wake it with a lightweight GET_STATE ping, then fetch the bundle.
    function fetchBundle(retriesLeft: number): void {
      // Wake the service worker first
      chrome.runtime.sendMessage({ type: MSG.GET_STATE }, () => {
        // Ignore errors from the wake-up ping — the SW is now alive
        if (chrome.runtime.lastError) { /* ignore */ }

        chrome.runtime.sendMessage(
          { type: MSG.GET_BUNDLE, payload: { sessionId } },
          (response: SessionBundle | null) => {
            if (chrome.runtime.lastError) {
              if (retriesLeft > 0) {
                setTimeout(() => fetchBundle(retriesLeft - 1), 500)
                return
              }
              setError(`Failed to load session: ${chrome.runtime.lastError.message ?? 'Unknown error'}`)
              setLoading(false)
              return
            }
            if (!response || !isValidBundle(response)) {
              if (retriesLeft > 0) {
                setTimeout(() => fetchBundle(retriesLeft - 1), 500)
                return
              }
              setError('Session not found or data is invalid. It may have been deleted.')
              setLoading(false)
              return
            }
            setBundle(response)
            document.title = `${response.sessionJson.activityName} — Ledgerium Process Map`
            setLoading(false)
          }
        )
      })
    }

    fetchBundle(3)
  }, [])

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />
  if (!bundle) return <FileIngestScreen onBundle={(b) => {
    setBundle(b)
    document.title = `${b.sessionJson.activityName} — Ledgerium Process Map`
  }} />

  return <ProcessMapViewer bundle={bundle} />
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
