/// <reference types="@testing-library/jest-dom/vitest" />
/**
 * ReviewScreen — component-level tests (iter-042, #31 sidepanel test harness).
 *
 * Harness: jsdom + @testing-library/react + @testing-library/jest-dom.
 * Jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.) are
 * registered globally by apps/extension-app/vitest.setup.ts.
 *
 * Chrome API surface touched by this component:
 *   - chrome.runtime.sendMessage  (called inside exportJson — only on button click)
 *
 * chrome.runtime.sendMessage is NOT called on mount, so all render-branch tests
 * work with a minimal chrome stub that is never invoked.  The Export JSON button
 * test installs a sendMessage mock to verify the call.
 *
 * Production code is NOT modified.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ReviewScreen } from './ReviewScreen.js'
import type { SessionMeta, LiveStep } from '../../shared/types.js'

// ---------------------------------------------------------------------------
// Chrome stub — minimal surface; sendMessage overridden per-test where needed
// ---------------------------------------------------------------------------

const chromeSendMessage = vi.fn()

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: chromeSendMessage,
    lastError: undefined,
  },
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMeta(overrides: Partial<SessionMeta> = {}): SessionMeta {
  return {
    sessionId: 'sess-001',
    activityName: 'Onboarding flow',
    startedAt: '2024-01-15T10:00:00Z',
    state: 'review_ready',
    pauseIntervals: [],
    schemaVersion: '1.0.0',
    recorderVersion: '2.0.0',
    ...overrides,
  }
}

function makeStep(overrides: Partial<LiveStep> = {}): LiveStep {
  return {
    stepId: 'step-001',
    title: 'Fill login form',
    status: 'finalized',
    confidence: 0.9,
    eventCount: 4,
    startedAt: 1705312800000,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown — explicit cleanup prevents DOM accumulation across tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  chromeSendMessage.mockReset()
  // Suppress act() warnings — ReviewScreen has no async effects on mount
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// 1. Basic mount
// ---------------------------------------------------------------------------

describe('ReviewScreen — basic mount', () => {
  it('renders without throwing when given valid props', () => {
    expect(() =>
      render(
        <ReviewScreen
          meta={makeMeta()}
          steps={[makeStep()]}
          uploadProgress={null}
          uploadStatus={null}
          onDiscard={vi.fn()}
        />,
      ),
    ).not.toThrow()
  })

  it('shows "Session complete" header label', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('Session complete')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 2. Steps list rendering
// ---------------------------------------------------------------------------

describe('ReviewScreen — steps list', () => {
  it('renders the activity name from meta when meta is provided', () => {
    render(
      <ReviewScreen
        meta={makeMeta({ activityName: 'Customer support workflow' })}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('Customer support workflow')).toBeInTheDocument()
  })

  it('shows correct step count in the summary line (singular)', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    // Component renders: {count} step{s} captured — may be separate text nodes
    // Use getByText with exact:false / regex to match across nodes
    expect(screen.getByText(/1\s+step\s+captured/)).toBeInTheDocument()
  })

  it('shows correct step count in the summary line (plural)', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep({ stepId: 's1' }), makeStep({ stepId: 's2', title: 'Submit form' })]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText(/2\s+steps\s+captured/)).toBeInTheDocument()
  })

  it('renders each finalized step title in the list', () => {
    const steps = [
      makeStep({ stepId: 's1', title: 'Open dashboard' }),
      makeStep({ stepId: 's2', title: 'Click workflow row' }),
      makeStep({ stepId: 's3', title: 'Review metrics' }),
    ]
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={steps}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('Open dashboard')).toBeInTheDocument()
    expect(screen.getByText('Click workflow row')).toBeInTheDocument()
    expect(screen.getByText('Review metrics')).toBeInTheDocument()
  })

  it('shows "No steps captured" empty state when steps array is empty', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('No steps captured')).toBeInTheDocument()
  })

  it('does NOT render provisional steps in the list (only finalized steps show)', () => {
    const steps = [
      makeStep({ stepId: 's-final', title: 'Finalized step', status: 'finalized' }),
      makeStep({ stepId: 's-prov', title: 'Provisional step', status: 'provisional' }),
    ]
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={steps}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('Finalized step')).toBeInTheDocument()
    expect(screen.queryByText('Provisional step')).not.toBeInTheDocument()
  })

  it('shows step event count label when eventCount > 0', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep({ eventCount: 7 })]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    // Component renders: {count} events — may span text nodes
    expect(screen.getByText(/7\s+events/)).toBeInTheDocument()
  })

  it('omits event count label when eventCount is 0', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep({ eventCount: 0 })]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.queryByText(/events/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 3. Truncation warning banner
// ---------------------------------------------------------------------------

describe('ReviewScreen — TruncationWarningBanner', () => {
  it('does NOT render the truncation banner when persistenceTruncated is absent', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.queryByText(/Some events may be missing/)).not.toBeInTheDocument()
  })

  it('renders the truncation banner when meta.persistenceTruncated is true', () => {
    render(
      <ReviewScreen
        meta={makeMeta({ persistenceTruncated: true })}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText(/Some events may be missing from this session/)).toBeInTheDocument()
  })

  it('truncation banner contains the storage-limit explanation copy', () => {
    render(
      <ReviewScreen
        meta={makeMeta({ persistenceTruncated: true })}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText(/browser hit a storage limit/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 4. UploadBar rendering
// ---------------------------------------------------------------------------

describe('ReviewScreen — UploadBar', () => {
  it('does NOT render the upload bar when uploadStatus is null', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.queryByText(/Uploading/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Upload complete/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Upload failed/)).not.toBeInTheDocument()
  })

  it('renders "Upload complete" label when uploadStatus is "complete"', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={100}
        uploadStatus="complete"
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('Upload complete')).toBeInTheDocument()
  })

  it('renders "Upload failed" label when uploadStatus is "failed"', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={42}
        uploadStatus="failed"
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
  })

  it('renders "Uploading…" with progress percentage when uploadStatus is "uploading"', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={37}
        uploadStatus="uploading"
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('Uploading… 37%')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 5. Controls — Done button and Discard visibility
// ---------------------------------------------------------------------------

describe('ReviewScreen — controls', () => {
  it('renders a "Done" button via ControlBar', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('calls onDiscard when the "Done" button is clicked (not uploading)', () => {
    const onDiscard = vi.fn()
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={onDiscard}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDiscard).toHaveBeenCalledOnce()
  })

  it('renders "Discard" button when upload is not in progress', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Discard/i })).toBeInTheDocument()
  })

  it('hides the "Discard" button when uploadStatus is "uploading"', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={50}
        uploadStatus="uploading"
        onDiscard={vi.fn()}
      />,
    )
    // ControlBar receives onDiscard=undefined when uploading; Discard button should not render
    expect(screen.queryByRole('button', { name: /Discard/i })).not.toBeInTheDocument()
  })

  it('renders the "Export session JSON" button', () => {
    render(
      <ReviewScreen
        meta={makeMeta()}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Export session JSON' })).toBeInTheDocument()
  })

  it('calls chrome.runtime.sendMessage with MSG.EXPORT_BUNDLE when export button is clicked', () => {
    chromeSendMessage.mockImplementation((_msg: unknown, _cb: () => void) => {
      // No-op — simulates no response; chrome.runtime.lastError guard in component covers this
    })
    render(
      <ReviewScreen
        meta={makeMeta({ sessionId: 'test-session-99' })}
        steps={[makeStep()]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Export session JSON' }))
    expect(chromeSendMessage).toHaveBeenCalledOnce()
    expect(chromeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EXPORT_BUNDLE' }),
      expect.any(Function),
    )
  })
})

// ---------------------------------------------------------------------------
// 6. Null meta edge case
// ---------------------------------------------------------------------------

describe('ReviewScreen — null meta', () => {
  it('renders without throwing when meta is null', () => {
    expect(() =>
      render(
        <ReviewScreen
          meta={null}
          steps={[]}
          uploadProgress={null}
          uploadStatus={null}
          onDiscard={vi.fn()}
        />,
      ),
    ).not.toThrow()
  })

  it('does NOT render the activity name section when meta is null', () => {
    render(
      <ReviewScreen
        meta={null}
        steps={[]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    // activityName element only renders when meta is truthy (conditional block in component)
    expect(screen.queryByText('Onboarding flow')).not.toBeInTheDocument()
  })

  it('does NOT render the truncation banner when meta is null', () => {
    render(
      <ReviewScreen
        meta={null}
        steps={[]}
        uploadProgress={null}
        uploadStatus={null}
        onDiscard={vi.fn()}
      />,
    )
    // meta?.persistenceTruncated guard means null meta never shows the banner
    expect(screen.queryByText(/Some events may be missing/)).not.toBeInTheDocument()
  })
})
