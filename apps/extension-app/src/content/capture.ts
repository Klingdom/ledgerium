import { MSG } from '../shared/types.js'
import {
  generateId,
  normalizeUrl,
  extractDomain,
  deriveRouteTemplate,
  deriveAppLabel,
} from '../shared/utils.js'
import {
  SCHEMA_VERSION,
  DRAG_STALE_MS,
} from '../shared/constants.js'
import type {
  RawEvent,
  RawEventApplication,
  RawEventContext,
  StateChangeKind,
} from '../shared/types.js'
import { inspectTarget, isSensitiveTarget } from './target-inspector.js'
import { StateObserver } from './state-observer.js'

// Keys that signal intent and are worth capturing (all others ignored)
const INTENT_KEYS = new Set(['Enter', 'Escape', 'Tab'])
const KEYBOARD_INTENT_MAP: Record<string, 'submit' | 'close' | 'navigate'> = {
  Enter: 'submit',
  Escape: 'close',
  Tab: 'navigate',
}

export class CaptureEngine {
  // True when running in the top-level page, false when running inside an iframe.
  // Iframes capture interactions (clicks, inputs) but NOT navigation events — those
  // are internal browser plumbing, not user workflow steps.
  private readonly isTopFrame: boolean = window.self === window.top

  private sessionId: string | null = null
  private sessionStartT = 0
  private isRecording = false
  private isPaused = false
  private cleanupFns: Array<() => void> = []

  // Click dedup — tracks last emitted click to suppress near-duplicate events
  private lastClickT = 0
  private lastClickSelector = ''

  // Drag tracking
  private dragSourceSelector: string | null = null
  private dragStartT = 0

  // Contenteditable dedup — emit one input_changed when the user leaves a CE field
  private lastCeSelector = ''
  private lastCeT = 0

  private stateObserver: StateObserver | null = null

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  startCapture(sessionId: string): void {
    console.log('[LDG-CS] startCapture called, sessionId=', sessionId, 'already recording=', this.isRecording)
    // Idempotent: already capturing this exact session — do nothing.
    // This can happen because broadcastAllTabs fires on start AND onActivated
    // fires again when the user switches back to an already-recording tab.
    if (this.isRecording && this.sessionId === sessionId) return

    // Different session ID while already recording — stop the stale session first.
    if (this.isRecording) this.stopCapture()

    this.sessionId = sessionId
    this.sessionStartT = Date.now()
    this.isRecording = true
    this.isPaused = false

    // Emit initial page-load event (top frame only — iframes are internal plumbing)
    if (this.isTopFrame) {
      this.captureNavigation(location.href, document.title, false)
    }

    this.attachDOMListeners()
    // Window focus/blur and history/state-change events are meaningful only in the top
    // frame. Running them in every iframe on a page like Gmail (12+ iframes) creates a
    // message flood that saturates the chrome.runtime channel and can cause real
    // interaction events to be dropped or delayed.
    if (this.isTopFrame) {
      this.attachWindowListeners()
      this.attachHistoryListeners()
      this.stateObserver = new StateObserver((kind, details) => {
        if (!this.isCapturing()) return
        this.emit({
          event_type: kind,
          state_change_kind: kind,
          ...(details !== undefined ? { state_change_details: details } : {}),
        })
      })
      this.stateObserver.start()
      this.cleanupFns.push(() => this.stateObserver?.stop())
    }
  }

  stopCapture(): void {
    this.isRecording = false
    this.isPaused = false
    this.cleanupFns.forEach(fn => fn())
    this.cleanupFns = []
    this.sessionId = null
    this.stateObserver = null
    this.dragSourceSelector = null
    // Reset dedup timestamps so the first event of a new session on this tab
    // is never silently dropped due to leftover state from the previous session.
    this.lastClickT = 0
    this.lastClickSelector = ''
    this.lastCeSelector = ''
    this.lastCeT = 0
  }

  pauseCapture(): void {
    this.isPaused = true
  }

  resumeCapture(): void {
    this.isPaused = false
  }

  // ─── Listener attachment ───────────────────────────────────────────────────

  private attachDOMListeners(): void {
    const onClick = (e: MouseEvent) => this.captureClick(e)
    document.addEventListener('click', onClick, true)
    this.cleanupFns.push(() => document.removeEventListener('click', onClick, true))

    const onDblClick = (e: MouseEvent) => this.captureDblClick(e)
    document.addEventListener('dblclick', onDblClick, true)
    this.cleanupFns.push(() => document.removeEventListener('dblclick', onDblClick, true))

    const onChange = (e: Event) => this.captureInputChange(e)
    document.addEventListener('change', onChange, true)
    this.cleanupFns.push(() => document.removeEventListener('change', onChange, true))

    const onSubmit = (e: SubmitEvent) => this.captureFormSubmit(e)
    document.addEventListener('submit', onSubmit, true)
    this.cleanupFns.push(() => document.removeEventListener('submit', onSubmit, true))

    const onKeyDown = (e: KeyboardEvent) => this.captureKeyboardIntent(e)
    document.addEventListener('keydown', onKeyDown, true)
    this.cleanupFns.push(() => document.removeEventListener('keydown', onKeyDown, true))

    const onDragStart = (e: DragEvent) => this.captureDragStart(e)
    document.addEventListener('dragstart', onDragStart, true)
    this.cleanupFns.push(() => document.removeEventListener('dragstart', onDragStart, true))

    const onDragEnd = (e: DragEvent) => this.captureDragEnd(e)
    document.addEventListener('dragend', onDragEnd, true)
    this.cleanupFns.push(() => document.removeEventListener('dragend', onDragEnd, true))

    // Contenteditable fields (e.g. Gmail compose body, rich text editors) don't
    // fire 'change' events. Capture on focusout instead — one event per edit session.
    const onFocusOut = (e: FocusEvent) => this.captureContentEditableBlur(e)
    document.addEventListener('focusout', onFocusOut, true)
    this.cleanupFns.push(() => document.removeEventListener('focusout', onFocusOut, true))
  }

  private attachWindowListeners(): void {
    const onBlur = () => this.emit({ event_type: 'window_blurred' })
    const onFocus = () => this.emit({ event_type: 'window_focused' })
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    this.cleanupFns.push(() => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    })

    const onVisibility = () => {
      if (!this.isCapturing()) return
      this.emit({
        event_type: 'visibility_changed',
        visibility_state: document.visibilityState as 'hidden' | 'visible',
      })
    }
    document.addEventListener('visibilitychange', onVisibility)
    this.cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibility))
  }

  private attachHistoryListeners(): void {
    const onPopState = () => this.captureNavigation(location.href, document.title, true)
    window.addEventListener('popstate', onPopState)
    this.cleanupFns.push(() => window.removeEventListener('popstate', onPopState))

    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)

    history.pushState = (...args) => {
      origPush(...args)
      this.captureNavigation(location.href, document.title, true)
    }
    history.replaceState = (...args) => {
      origReplace(...args)
      this.captureNavigation(location.href, document.title, true)
    }
    this.cleanupFns.push(() => {
      history.pushState = origPush
      history.replaceState = origReplace
    })
  }

  // ─── Capture handlers ──────────────────────────────────────────────────────

  private captureNavigation(url: string, title: string, isSpa: boolean): void {
    // Strip query params and fragment from captured URL to avoid leaking PII
    let sanitizedUrl = url
    try {
      const u = new URL(url)
      u.search = ''
      u.hash = ''
      sanitizedUrl = u.toString()
    } catch { /* keep original */ }

    this.emit({
      event_type: isSpa ? 'spa_route_changed' : 'page_loaded',
      url: sanitizedUrl,
      url_normalized: normalizeUrl(url),
      page_title: title,
    })
  }

  private captureClick(e: MouseEvent): void {
    if (!this.isCapturing()) return
    const el = e.target as Element
    if (!el) return
    if (isSensitiveTarget(el)) return

    const inspector = inspectTarget(el)
    const t = Date.now()

    // Dedup: suppress if same selector clicked within 300ms (rapid accidental clicks)
    if (inspector.selector === this.lastClickSelector && t - this.lastClickT < 300) return
    this.lastClickSelector = inspector.selector
    this.lastClickT = t

    this.emit({
      event_type: 'click',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      target_selector: inspector.selector,
      target_label: inspector.label,
      target_role: inspector.role,
      target_element_type: inspector.elementType,
      is_sensitive_target: false,
      target: inspector,
    })
  }

  private captureDblClick(e: MouseEvent): void {
    if (!this.isCapturing()) return
    const el = e.target as Element
    if (!el) return
    if (isSensitiveTarget(el)) return

    const inspector = inspectTarget(el)
    this.emit({
      event_type: 'dblclick',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      target_selector: inspector.selector,
      target_label: inspector.label,
      target_role: inspector.role,
      target_element_type: inspector.elementType,
      is_sensitive_target: false,
      target: inspector,
    })
  }

  private captureInputChange(e: Event): void {
    if (!this.isCapturing()) return
    const el = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!el) return

    if (isSensitiveTarget(el)) {
      // Emit presence-only event — no label, selector, or value
      this.emit({
        event_type: 'input_changed',
        url: location.href,
        url_normalized: normalizeUrl(location.href),
        page_title: document.title,
        target_element_type: (el as HTMLInputElement).type ?? el.tagName.toLowerCase(),
        is_sensitive_target: true,
        privacy: { valueRedacted: true, redactionReason: 'Sensitive field detected' },
      })
      return
    }

    const inspector = inspectTarget(el)
    const isValuePresent = 'value' in el ? Boolean(el.value) : false

    this.emit({
      event_type: 'input_changed',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      target_selector: inspector.selector,
      target_label: inspector.label,
      target_role: inspector.role,
      target_element_type: inspector.elementType,
      is_sensitive_target: false,
      value_present: isValuePresent,
      target: inspector,
    })
  }

  private captureContentEditableBlur(e: FocusEvent): void {
    if (!this.isCapturing()) return
    const el = e.target as HTMLElement
    if (!el) return
    // Only act on elements that are actually contenteditable
    if (!el.isContentEditable) return
    if (isSensitiveTarget(el)) return

    const inspector = inspectTarget(el)

    // Dedup: suppress if same CE element blurred within 500ms (focus bouncing inside rich editors)
    const t = Date.now()
    if (inspector.selector === this.lastCeSelector && t - this.lastCeT < 500) return
    this.lastCeSelector = inspector.selector
    this.lastCeT = t

    this.emit({
      event_type: 'input_changed',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      target_selector: inspector.selector,
      target_label: inspector.label,
      target_role: inspector.role,
      target_element_type: 'contenteditable',
      is_sensitive_target: false,
      value_present: Boolean(el.textContent?.trim()),
      target: inspector,
    })
  }

  private captureFormSubmit(e: SubmitEvent): void {
    if (!this.isCapturing()) return
    const form = e.target as HTMLFormElement
    const url = form.action || location.href
    let sanitizedUrl = url
    try {
      const u = new URL(url)
      u.search = ''
      u.hash = ''
      sanitizedUrl = u.toString()
    } catch { /* keep original */ }

    this.emit({
      event_type: 'form_submitted',
      url: sanitizedUrl,
      url_normalized: normalizeUrl(url),
      page_title: document.title,
    })
  }

  private captureKeyboardIntent(e: KeyboardEvent): void {
    if (!this.isCapturing()) return
    if (!INTENT_KEYS.has(e.key)) return

    // Tab in a textarea is normal text-editing; not a navigation intent
    if (e.key === 'Tab' && e.target instanceof HTMLTextAreaElement) return

    const el = e.target instanceof Element ? e.target : null
    const inspector = el && !isSensitiveTarget(el) ? inspectTarget(el) : null

    this.emit({
      event_type: 'keyboard_intent',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      keyboard_key: e.key,
      // KEYBOARD_INTENT_MAP is keyed on INTENT_KEYS values — the guard above ensures this is always defined
      keyboard_intent: KEYBOARD_INTENT_MAP[e.key] as 'submit' | 'close' | 'navigate',
      ...(inspector
        ? {
            target_selector: inspector.selector,
            target_label: inspector.label,
            target_element_type: inspector.elementType,
            target: inspector,
          }
        : {}),
    })
  }

  private captureDragStart(e: DragEvent): void {
    if (!this.isCapturing()) return
    const el = e.target as Element
    if (!el || isSensitiveTarget(el)) return

    const inspector = inspectTarget(el)
    this.dragSourceSelector = inspector.selector
    this.dragStartT = Date.now()

    this.emit({
      event_type: 'drag_started',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      drag_source_selector: inspector.selector,
      target_selector: inspector.selector,
      target_label: inspector.label,
      target: inspector,
    })
  }

  private captureDragEnd(e: DragEvent): void {
    if (!this.isCapturing()) return

    // Discard if no active drag or drag session has gone stale
    if (!this.dragSourceSelector || Date.now() - this.dragStartT > DRAG_STALE_MS) {
      this.dragSourceSelector = null
      return
    }

    const dropEl = document.elementFromPoint(e.clientX, e.clientY)
    const dropInspector =
      dropEl && !isSensitiveTarget(dropEl) ? inspectTarget(dropEl) : null

    this.emit({
      event_type: 'drag_completed',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      drag_source_selector: this.dragSourceSelector,
      ...(dropInspector ? { drag_target_selector: dropInspector.selector } : {}),
    })

    this.dragSourceSelector = null
  }

  // ─── Core emit ─────────────────────────────────────────────────────────────

  private isCapturing(): boolean {
    return this.isRecording && !this.isPaused && this.sessionId !== null
  }

  private buildContext(): RawEventContext {
    const url = location.href
    const domain = extractDomain(url)
    let pathname = ''
    try {
      pathname = new URL(url).pathname
    } catch { /* ignore */ }

    const application: RawEventApplication = {
      label: deriveAppLabel(domain),
      domain,
      routeTemplate: deriveRouteTemplate(pathname),
    }

    return {
      url,
      urlNormalized: normalizeUrl(url),
      pageTitle: document.title,
      application,
    }
  }

  private emit(partial: Partial<RawEvent> & { event_type: string }): void {
    if (!this.sessionId) return
    console.log('[LDG-CS] emit', partial.event_type)
    const now = Date.now()
    const event: RawEvent = {
      raw_event_id: generateId(),
      session_id: this.sessionId,
      t_ms: now - this.sessionStartT,
      t_wall: new Date().toISOString(),
      schema_version: SCHEMA_VERSION,
      context: this.buildContext(),
      timing: {
        absoluteMs: now,
        sessionOffsetMs: now - this.sessionStartT,
        wallTime: new Date().toISOString(),
      },
      ...partial,
    }
    chrome.runtime.sendMessage({ type: MSG.RAW_EVENT_CAPTURED, payload: { event } }).catch(
      () => { /* background may not be ready — safe to ignore */ },
    )
  }
}
