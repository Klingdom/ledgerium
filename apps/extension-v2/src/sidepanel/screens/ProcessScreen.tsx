import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { processSession, eventTypeLabel } from '@ledgerium/process-engine'
import type { ProcessOutput, StepDefinition, SOPStep } from '@ledgerium/process-engine'
import type { SessionMeta, LiveStep, SessionBundle, CanonicalEvent } from '../../shared/types.js'
import { MSG } from '../../shared/types.js'
import { SidebarProcessMap } from '../components/SidebarProcessMap.js'
import { SidebarStepDrawer } from '../components/SidebarStepDrawer.js'
import { ControlBar } from '../components/ControlBar.js'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProcessScreenProps {
  meta: SessionMeta | null
  steps: LiveStep[]
  uploadProgress: number | null
  uploadStatus: 'uploading' | 'complete' | 'failed' | null
  onDiscard: () => void
}

// ─── Upload status bar ────────────────────────────────────────────────────────

function UploadBar({ progress, status }: { progress: number | null; status: ProcessScreenProps['uploadStatus'] }) {
  if (!status) return null
  const pct = progress ?? 0
  const barColor = status === 'complete' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : 'bg-teal-500'
  const label = status === 'complete' ? 'Upload complete' : status === 'failed' ? 'Upload failed' : `Uploading… ${pct}%`
  return (
    <div className="px-3 py-2 border-b border-gray-800 flex-none">
      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
        <span>{label}</span>
        {status === 'uploading' && <span>{pct}%</span>}
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${status === 'complete' ? 100 : pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'map' | 'sop' | 'export'

// ─── SOP view ────────────────────────────────────────────────────────────────

function SOPStepEvents({ events }: { events: CanonicalEvent[] }) {
  const [open, setOpen] = useState(false)
  if (events.length === 0) return null
  return (
    <div className="border-t border-gray-800/60 px-2.5 pb-2 pt-1.5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[9px] font-semibold text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-wider"
      >
        <span style={{ transform: open ? 'rotate(90deg)' : undefined, display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
        {events.length} evidence event{events.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <div className="mt-1.5 space-y-0.5">
          {events.map(e => {
            const isSensitive = e.target_summary?.isSensitive === true
            const desc = e.target_summary?.label ?? e.target_summary?.role ?? e.page_context?.routeTemplate ?? null
            return (
              <div key={e.event_id} className="flex items-baseline gap-2">
                <span
                  className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: e.actor_type === 'human' ? '#2dd4bf' : e.actor_type === 'system' ? '#fb923c' : '#c084fc',
                    display: 'inline-block',
                    marginTop: 3,
                  }}
                />
                <span className="text-[9px] text-gray-500 leading-snug flex-1 min-w-0">
                  {eventTypeLabel(e.event_type)}
                  {isSensitive && <span className="ml-1 text-red-400/70">[redacted]</span>}
                  {desc && <span className="ml-1 text-gray-700 truncate">— {desc}</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SOPView({ output, eventsByStepId }: { output: ProcessOutput; eventsByStepId: Map<string, CanonicalEvent[]> }) {
  const { sop, processDefinition } = output
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      {/* SOP header */}
      <div className="mb-4 pb-3 border-b border-gray-800">
        <p className="text-xs font-semibold text-gray-100 mb-1">{sop.title}</p>
        <p className="text-[10px] text-gray-500 leading-relaxed">{sop.purpose}</p>
      </div>

      {/* Systems */}
      {sop.systems.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Systems</p>
          <div className="flex flex-wrap gap-1.5">
            {sop.systems.map(s => (
              <span key={s} className="text-[10px] text-gray-400 bg-gray-800 border border-gray-700 rounded px-2 py-0.5">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Estimated time */}
      <div className="flex justify-between mb-4">
        <span className="text-[10px] text-gray-600">Estimated time</span>
        <span className="text-[10px] text-gray-400 font-medium">{sop.estimatedTime}</span>
      </div>

      {/* Steps */}
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">Steps</p>
      <div className="space-y-2">
        {sop.steps.map(step => {
          const stepDef = processDefinition.stepDefinitions.find(d => d.stepId === step.stepId)
          const color = stepDef?.categoryColor ?? '#94a3b8'
          const bg = stepDef?.categoryBg ?? 'rgba(148,163,184,0.07)'
          const stepEvents = eventsByStepId.get(step.stepId) ?? []
          return (
            <div
              key={step.stepId}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: bg }}
            >
              {/* Step header */}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <span className="text-[9px] font-bold tabular-nums" style={{ color, minWidth: 14 }}>
                  {step.ordinal}
                </span>
                <span className="text-[11px] font-medium text-gray-200 flex-1 leading-snug">{step.title}</span>
                <span className="text-[9px] text-gray-600">{step.durationLabel}</span>
              </div>
              {/* Action */}
              <div className="px-2.5 pb-2">
                <p className="text-[10px] text-gray-400 leading-snug">{step.action}</p>
                {step.warnings.length > 0 && (
                  <p className="text-[9px] text-amber-400/70 mt-1">⚠ {step.warnings[0]}</p>
                )}
              </div>
              {/* Evidence events */}
              <SOPStepEvents events={stepEvents} />
            </div>
          )
        })}
      </div>

      {/* Notes */}
      {sop.notes.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">Notes</p>
          {sop.notes.map((note, i) => (
            <p key={i} className="text-[10px] text-gray-600 leading-relaxed mb-1">{note}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Export view ──────────────────────────────────────────────────────────────

function ExportView({
  meta,
  bundle,
  output,
  eventsByStepId,
  uploadProgress,
  uploadStatus,
  onDiscard,
}: {
  meta: SessionMeta | null
  bundle: SessionBundle | null
  output: ProcessOutput
  eventsByStepId: Map<string, CanonicalEvent[]>
  uploadProgress: number | null
  uploadStatus: ProcessScreenProps['uploadStatus']
  onDiscard: () => void
}) {
  const openFullView = useCallback(() => {
    if (!meta) return
    chrome.tabs.create({
      url: chrome.runtime.getURL(`src/viewer/index.html?sessionId=${meta.sessionId}`),
    })
  }, [meta])

  const exportJson = useCallback(() => {
    if (!bundle) return
    const filename = `ledgerium-${meta?.sessionId ?? 'session'}.json`
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [bundle, meta?.sessionId])

  const exportEnrichedJson = useCallback(() => {
    if (!bundle) return
    const { processDefinition, sop } = output
    // Build enriched export: each derived step includes its process definition,
    // SOP step, and the raw evidence events that produced it.
    const enrichedSteps = processDefinition.stepDefinitions.map(stepDef => {
      const sopStep = sop.steps.find(s => s.stepId === stepDef.stepId)
      const events = eventsByStepId.get(stepDef.stepId) ?? []
      return { ...stepDef, sopStep, sourceEvents: events }
    })
    const enriched = { ...bundle, enrichedSteps }
    const filename = `ledgerium-enriched-${meta?.sessionId ?? 'session'}.json`
    const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [bundle, output, eventsByStepId, meta?.sessionId])

  // ── Download Workflow Report (PDF via print) ────────────────────────────────
  const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const downloadWorkflowReport = useCallback(() => {
    setReportStatus('loading')
    chrome.runtime.sendMessage({ type: MSG.GET_WORKFLOW_REPORT }, (report: unknown) => {
      if (chrome.runtime.lastError || !report) {
        setReportStatus('error')
        setTimeout(() => setReportStatus('idle'), 3000)
        return
      }
      try {
        // Render report JSON into an HTML document and open in new tab for
        // browser-native Print-to-PDF.  This avoids pulling in jspdf/html2canvas
        // as dependencies in the extension and produces high-quality output.
        const r = report as Record<string, unknown>
        const header = r.header as Record<string, unknown>
        const summary = r.executiveSummary as Record<string, unknown>
        const metrics = r.metrics as Record<string, unknown>
        const overview = r.workflowOverview as Record<string, unknown>
        const sop = r.sop as Record<string, unknown>
        const steps = (overview.steps as Array<Record<string, unknown>>) ?? []
        const phases = (overview.phases as Array<Record<string, unknown>>) ?? []
        const sopPhases = (sop.phases as Array<Record<string, unknown>>) ?? []
        const criteria = (sop.completionCriteria as string[]) ?? []
        const observations = (summary.keyObservations as string[]) ?? []
        const tools = (summary.applicationsUsed as string[]) ?? []

        const stepsHtml = steps.map(s =>
          `<tr>
            <td>${s.ordinal}</td>
            <td>${s.title}</td>
            <td>${s.application}</td>
            <td>${s.durationLabel}</td>
            <td>${s.eventCount}</td>
          </tr>`
        ).join('')

        const phasesHtml = phases.map(p =>
          `<li><strong>${p.title}</strong> — ${p.stepCount} step(s)</li>`
        ).join('')

        const sopHtml = sopPhases.map(p => {
          const instructions = (p.instructions as Array<Record<string, unknown>>) ?? []
          const instHtml = instructions.map(i =>
            `<li>${i.text}</li>`
          ).join('')
          return `<h3>${p.phaseTitle}</h3><ol>${instHtml}</ol>`
        }).join('')

        const formatMsForReport = (ms: number): string => {
          if (ms < 1000) return '< 1s'
          const s = Math.round(ms / 1000)
          if (s < 60) return `${s}s`
          const min = Math.floor(s / 60)
          const sec = s % 60
          return sec > 0 ? `${min}m ${sec}s` : `${min}m`
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Workflow Report — ${header.activityName}</title>
<style>
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e; line-height: 1.5; font-size: 13px; }
  h1 { font-size: 22px; margin-bottom: 4px; color: #0f172a; }
  h2 { font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 28px; color: #334155; }
  h3 { font-size: 14px; color: #475569; margin-top: 16px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  .meta span { margin-right: 16px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat .value { font-size: 20px; font-weight: 700; color: #0f172a; }
  .stat .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) { background: #f8fafc; }
  ul, ol { padding-left: 20px; }
  li { margin-bottom: 4px; }
  .badge { display: inline-block; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin: 2px 4px 2px 0; }
  .observations li { color: #475569; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <h1>Workflow Report</h1>
  <p style="font-size:15px;color:#334155;margin-bottom:2px;"><strong>${header.activityName}</strong></p>
  <div class="meta">
    <span>Session: ${(header.sessionId as string).slice(0, 8)}…</span>
    <span>Duration: ${header.durationLabel}</span>
    <span>Generated: ${new Date(header.generatedAt as string).toLocaleString()}</span>
  </div>

  <h2>Executive Summary</h2>
  <div class="stats">
    <div class="stat"><div class="value">${metrics.stepCount}</div><div class="label">Steps</div></div>
    <div class="stat"><div class="value">${metrics.phaseCount}</div><div class="label">Phases</div></div>
    <div class="stat"><div class="value">${metrics.toolCount}</div><div class="label">Tools</div></div>
  </div>
  <p><strong>Applications:</strong> ${tools.map((t: string) => `<span class="badge">${t}</span>`).join('')}</p>
  <p><strong>Confidence:</strong> ${summary.workflowConfidence}</p>
  ${observations.length > 0 ? `<ul class="observations">${observations.map((o: string) => `<li>${o}</li>`).join('')}</ul>` : ''}

  <h2>Workflow Phases</h2>
  <ul>${phasesHtml}</ul>

  <h2>Workflow Steps</h2>
  <table>
    <thead><tr><th>#</th><th>Step</th><th>Application</th><th>Duration</th><th>Events</th></tr></thead>
    <tbody>${stepsHtml}</tbody>
  </table>

  <h2>Metrics</h2>
  <div class="stats">
    <div class="stat"><div class="value">${metrics.totalDurationLabel}</div><div class="label">Total Duration</div></div>
    <div class="stat"><div class="value">${formatMsForReport(Number(metrics.activeDurationMs) || 0)}</div><div class="label">Active Time</div></div>
    <div class="stat"><div class="value">${formatMsForReport(Number(metrics.idleDurationMs) || 0)}</div><div class="label">Idle Time</div></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="value">${metrics.navigationCount}</div><div class="label">Navigations</div></div>
    <div class="stat"><div class="value">${metrics.clickCount}</div><div class="label">Clicks</div></div>
    <div class="stat"><div class="value">${metrics.inputCount}</div><div class="label">Inputs</div></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="value">${metrics.fileActionCount}</div><div class="label">File Actions</div></div>
    <div class="stat"><div class="value">${metrics.sendActionCount}</div><div class="label">Send Actions</div></div>
    <div class="stat"><div class="value">${metrics.lowConfidenceStepCount}</div><div class="label">Low-Confidence Steps</div></div>
  </div>

  <h2>Standard Operating Procedure</h2>
  <p><em>${sop.overview}</em></p>
  ${sopHtml}
  ${criteria.length > 0 ? `<h3>Completion Criteria</h3><ul>${criteria.map((c: string) => `<li>${c}</li>`).join('')}</ul>` : ''}

  <div class="footer">
    <p>Generated by Ledgerium AI — Deterministic Workflow Intelligence</p>
    <p>Schema v${header.schemaVersion} · Recorder v${header.recorderVersion} · Segmentation v${header.segmentationRuleVersion}</p>
  </div>
</body>
</html>`

        // Download the report as an HTML file the user can open in their browser.
        // chrome.tabs.create blocks both blob: and data: URLs in MV3 extensions,
        // so we trigger a file download instead.
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `workflow-report-${(header.sessionId as string).slice(0, 8)}.html`
        a.click()
        URL.revokeObjectURL(url)
        setReportStatus('idle')
      } catch (err) {
        console.error('[LDG-UI] Report render failed:', err)
        setReportStatus('error')
        setTimeout(() => setReportStatus('idle'), 3000)
      }
    })
  }, [])

  // ── Open in Ledgerium AI website ──────────────────────────────────────────
  const [openWebStatus, setOpenWebStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const openInWebsite = useCallback(() => {
    if (!bundle) return

    // Read settings to get the sync URL and API key
    chrome.storage.sync.get(['ledgerium_settings'], async (result) => {
      const s = result['ledgerium_settings'] as { uploadUrl?: string; apiKey?: string } | undefined
      const syncUrl = s?.uploadUrl
      const apiKey = s?.apiKey

      if (!syncUrl || !apiKey) {
        // No sync configured — open the web app with instructions
        const baseUrl = syncUrl?.replace('/api/sync', '') ?? 'https://ledgerium.ai'
        chrome.tabs.create({ url: `${baseUrl}/upload` })
        return
      }

      setOpenWebStatus('loading')

      try {
        const response = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(bundle),
        })

        if (!response.ok) {
          const baseUrl = syncUrl.replace('/api/sync', '')
          // If auth fails, redirect to login
          if (response.status === 401) {
            chrome.tabs.create({ url: `${baseUrl}/login` })
            setOpenWebStatus('idle')
            return
          }
          setOpenWebStatus('error')
          setTimeout(() => setOpenWebStatus('idle'), 3000)
          return
        }

        const data = await response.json() as { workflowId?: string }
        const baseUrl = syncUrl.replace('/api/sync', '')

        if (data.workflowId) {
          chrome.tabs.create({ url: `${baseUrl}/workflows/${data.workflowId}` })
        } else {
          chrome.tabs.create({ url: `${baseUrl}/dashboard` })
        }
        setOpenWebStatus('idle')
      } catch {
        setOpenWebStatus('error')
        setTimeout(() => setOpenWebStatus('idle'), 3000)
      }
    })
  }, [bundle])

  const { processRun, processDefinition } = output

  return (
    <div className="flex flex-col flex-1 overflow-y-auto px-3 py-3 gap-3">
      {/* Session stats */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3">
        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">Session</p>
        {[
          ['Activity', processRun.activityName],
          ['Steps', `${processRun.stepCount}`],
          ['Events', `${processRun.eventCount} (${processRun.humanEventCount} user)`],
          ['Duration', processRun.durationLabel],
          ['Status', processRun.completionStatus],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-0.5">
            <span className="text-[10px] text-gray-600">{label}</span>
            <span className="text-[10px] text-gray-400 font-medium capitalize">{value}</span>
          </div>
        ))}
      </div>

      {/* Systems */}
      {processDefinition.systems.length > 0 && (
        <div>
          <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Systems Accessed</p>
          <div className="flex flex-wrap gap-1.5">
            {processDefinition.systems.map(s => (
              <span key={s} className="text-[10px] text-gray-400 bg-gray-800 border border-gray-700 rounded px-2 py-0.5">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {/* PRIMARY: Open in Ledgerium AI website */}
        <button
          onClick={openInWebsite}
          disabled={openWebStatus === 'loading'}
          className={`w-full text-xs font-medium rounded-md py-2.5 transition-colors ${
            openWebStatus === 'loading'
              ? 'text-gray-500 bg-gray-900 border border-gray-800 cursor-wait'
              : openWebStatus === 'error'
                ? 'text-red-300 bg-red-950/60 border border-red-800'
                : 'text-teal-300 bg-teal-950/60 border border-teal-800 hover:bg-teal-900/60'
          }`}
        >
          {openWebStatus === 'loading'
            ? 'Syncing…'
            : openWebStatus === 'error'
              ? 'Sync Failed — Try Again'
              : '🌐 Open in Ledgerium AI Website'}
        </button>

        {/* Download Workflow Report */}
        <button
          onClick={downloadWorkflowReport}
          disabled={reportStatus === 'loading'}
          className={`w-full text-xs font-medium rounded-md py-2 transition-colors ${
            reportStatus === 'loading'
              ? 'text-gray-500 bg-gray-900 border border-gray-800 cursor-wait'
              : reportStatus === 'error'
                ? 'text-red-300 bg-red-950/60 border border-red-800'
                : 'text-gray-300 border border-gray-700 hover:bg-gray-800'
          }`}
        >
          {reportStatus === 'loading'
            ? 'Generating Report…'
            : reportStatus === 'error'
              ? 'Report Generation Failed'
              : '📄 Download Workflow Report'}
        </button>

        <button
          onClick={openFullView}
          className="w-full text-xs text-gray-300 border border-gray-700 rounded-md py-2 hover:bg-gray-800 transition-colors"
        >
          Open Full Workflow Map ↗
        </button>
        <button
          onClick={exportEnrichedJson}
          className="w-full text-xs text-gray-500 border border-gray-800 rounded-md py-2 hover:bg-gray-900 transition-colors"
        >
          Export Enriched JSON (with events)
        </button>
        <button
          onClick={exportJson}
          className="w-full text-xs text-gray-500 border border-gray-800 rounded-md py-2 hover:bg-gray-900 transition-colors"
        >
          Export Raw Session JSON
        </button>
      </div>

      <ControlBar
        onPrimary={onDiscard}
        primaryLabel="Done"
        primaryVariant="primary"
        {...(uploadStatus !== 'uploading' ? { onDiscard } : {})}
      />
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ProcessScreen({ meta, steps, uploadProgress, uploadStatus, onDiscard }: ProcessScreenProps) {
  const [tab, setTab] = useState<Tab>('map')
  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  // Fetch the full bundle when the screen mounts.
  useEffect(() => {
    let cancelled = false

    function fetchBundle(retriesLeft: number): void {
      console.log('[LDG-UI] ProcessScreen fetchBundle attempt, retriesLeft=', retriesLeft)
      chrome.runtime.sendMessage({ type: MSG.EXPORT_BUNDLE }, (response: unknown) => {
        console.log('[LDG-UI] EXPORT_BUNDLE response:', response ? 'GOT BUNDLE' : 'null/undefined', 'lastError:', chrome.runtime.lastError?.message ?? 'none')
        if (cancelled) return
        if (chrome.runtime.lastError || !response) {
          if (retriesLeft > 0) {
            setTimeout(() => { if (!cancelled) fetchBundle(retriesLeft - 1) }, 500)
            return
          }
          setLoadError('Could not load session data.')
          return
        }
        const b = response as SessionBundle
        console.log('[LDG-UI] Setting bundle, events:', b.normalizedEvents?.length, 'steps:', b.derivedSteps?.length)
        setBundle(b)
      })
    }

    fetchBundle(3)

    // Also listen for FINALIZATION_COMPLETE as a trigger to re-fetch.
    // The background sends a lightweight notification (no bundle payload)
    // when the bundle is ready.  This handles the case where ProcessScreen
    // mounted before handleStop finished building the bundle.
    const handler = (message: Record<string, unknown>) => {
      if (cancelled) return
      if (message.type === MSG.FINALIZATION_COMPLETE) {
        console.log('[LDG-UI] FINALIZATION_COMPLETE received, fetching bundle')
        fetchBundle(2)
      }
    }
    chrome.runtime.onMessage.addListener(handler)

    return () => {
      cancelled = true
      chrome.runtime.onMessage.removeListener(handler)
    }
  }, [])

  // Run the process engine — pure, deterministic, synchronous
  const [processError, setProcessError] = useState<string | null>(null)
  const output: ProcessOutput | null = useMemo(() => {
    if (!bundle) return null
    try {
      setProcessError(null)
      // Sort normalized events by t_ms before passing to process engine.
      // Multi-tab recording can produce events with slightly out-of-order
      // timestamps when content scripts in different tabs emit events at
      // nearly the same time.  The process engine's input validator requires
      // strict t_ms ordering.
      const sortedBundle = {
        ...bundle,
        normalizedEvents: [...bundle.normalizedEvents].sort(
          (a, b) => (a as { t_ms: number }).t_ms - (b as { t_ms: number }).t_ms,
        ),
      }
      const result = processSession(sortedBundle as unknown as Parameters<typeof processSession>[0])
      console.log('[LDG-UI] processSession succeeded, steps:', result.processDefinition.stepDefinitions.length)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[LDG-UI] processSession() threw:', msg, err)
      setProcessError(msg)
      return null
    }
  }, [bundle])

  // Build event lookup: normalized events indexed by event_id for O(1) step lookup
  const eventById = useMemo(
    () => new Map((bundle?.normalizedEvents as CanonicalEvent[] | undefined ?? []).map(e => [e.event_id, e])),
    [bundle],
  )

  // Map step_id → source events, using derivedSteps source_event_ids
  const eventsByStepId = useMemo((): Map<string, CanonicalEvent[]> => {
    if (!bundle) return new Map()
    const derivedSteps = bundle.derivedSteps as Array<{ step_id: string; source_event_ids: string[] }>
    const map = new Map<string, CanonicalEvent[]>()
    for (const ds of derivedSteps) {
      const events = ds.source_event_ids
        .map(id => eventById.get(id))
        .filter((e): e is CanonicalEvent => e !== undefined)
      map.set(ds.step_id, events)
    }
    return map
  }, [bundle, eventById])

  // Derive selected step detail from engine output
  const selectedStepDef: StepDefinition | undefined = useMemo(() =>
    output?.processDefinition.stepDefinitions.find(d => d.stepId === selectedStepId),
    [output, selectedStepId],
  )

  const selectedSOPStep: SOPStep | undefined = useMemo(() =>
    output?.sop.steps.find(s => s.stepId === selectedStepId),
    [output, selectedStepId],
  )

  const handleSelectStep = useCallback((id: string | null) => {
    setSelectedStepId(id)
    // If a step is selected and we're on the map tab, keep focus there
  }, [])

  const handleCloseDrawer = useCallback(() => setSelectedStepId(null), [])

  const finalizedCount = steps.filter(s => s.status === 'finalized').length

  return (
    <div className="flex flex-col h-full">
      {/* Session header */}
      <div className="px-3 pt-3 pb-2.5 border-b border-gray-800 flex-none">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
          <p className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold">Session complete</p>
        </div>
        {meta && (
          <p className="text-xs text-gray-100 font-semibold truncate">{meta.activityName}</p>
        )}
        <p className="text-[10px] text-gray-600 mt-0.5">
          {finalizedCount} step{finalizedCount !== 1 ? 's' : ''} · {bundle ? `${(bundle as SessionBundle).normalizedEvents.length} events` : 'Loading…'}
        </p>
      </div>

      {/* Upload status */}
      <UploadBar progress={uploadProgress} status={uploadStatus} />

      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-none">
        {(['map', 'sop', 'export'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              tab === t
                ? 'text-teal-400 border-b-2 border-teal-500 -mb-px'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {t === 'map' ? 'Map' : t === 'sop' ? 'SOP' : 'Export'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loadError || processError ? (
        <div className="flex items-center justify-center flex-1 px-4">
          <p className="text-xs text-red-400 text-center">{loadError ?? processError}</p>
        </div>
      ) : !output ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-xs text-gray-600">{bundle ? 'Processing…' : 'Loading session data…'}</p>
        </div>
      ) : (
        <>
          {/* MAP TAB */}
          {tab === 'map' && (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Compact metrics bar */}
              {!selectedStepDef && (
                <div className="flex-shrink-0 border-b border-gray-800 px-3 py-2">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-sm font-semibold text-white">{output.processRun.stepCount}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">Steps</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{output.processRun.durationLabel}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">Duration</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{output.processRun.systemsUsed.length}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">Tools</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{output.processRun.humanEventCount}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">Actions</div>
                    </div>
                  </div>
                </div>
              )}
              {/* React Flow map or drawer */}
              {selectedStepDef ? (
                <SidebarStepDrawer
                  stepDef={selectedStepDef}
                  sopStep={selectedSOPStep}
                  onClose={handleCloseDrawer}
                />
              ) : (
                <div className="flex-1">
                  <SidebarProcessMap
                    processMap={output.processMap}
                    selectedStepId={selectedStepId}
                    onSelectStep={handleSelectStep}
                  />
                </div>
              )}
            </div>
          )}

          {/* SOP TAB */}
          {tab === 'sop' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <SOPView output={output} eventsByStepId={eventsByStepId} />
            </div>
          )}

          {/* EXPORT TAB */}
          {tab === 'export' && (
            <ExportView
              meta={meta}
              bundle={bundle}
              output={output}
              eventsByStepId={eventsByStepId}
              uploadProgress={uploadProgress}
              uploadStatus={uploadStatus}
              onDiscard={onDiscard}
            />
          )}
        </>
      )}

      {/* Bottom controls — shown on map/sop tabs for quick access */}
      {tab !== 'export' && output && !selectedStepDef && (
        <div className="flex gap-2 px-3 py-2 border-t border-gray-800 flex-none">
          <button
            onClick={() => setTab('export')}
            className="flex-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Export / Done →
          </button>
        </div>
      )}
    </div>
  )
}
