import { MSG } from '../shared/types.js'
import { generateId, normalizeUrl, extractDomain } from '../shared/utils.js'
import { SCHEMA_VERSION } from '../shared/constants.js'
import type { RawEvent } from '../shared/types.js'

const SENSITIVE_INPUT_TYPES = new Set(['password', 'hidden'])
const SENSITIVE_RE = /password|passwd|secret|token|api[_-]?key|credit|cvv|ssn/i

function isSensitiveElement(el: Element): boolean {
  if (el instanceof HTMLInputElement) {
    if (SENSITIVE_INPUT_TYPES.has(el.type.toLowerCase())) return true
    if (el.autocomplete?.toLowerCase().includes('password')) return true
  }
  const selector = el.getAttribute('data-testid') ?? el.getAttribute('name') ?? el.getAttribute('id') ?? ''
  const label = el.getAttribute('aria-label') ?? ''
  return SENSITIVE_RE.test(selector) || SENSITIVE_RE.test(label)
}

function getSelector(el: Element): string {
  const testId = el.getAttribute('data-testid') ?? el.getAttribute('data-qa')
  if (testId) return `[data-testid="${testId}"]`
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) return `[aria-label="${ariaLabel}"]`
  const role = el.getAttribute('role') ?? (el instanceof HTMLButtonElement ? 'button' : '')
  if (role) return `${el.tagName.toLowerCase()}[role="${role}"]`
  return el.tagName.toLowerCase()
}

function getLabel(el: Element): string {
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel.slice(0, 80)
  const innerText = (el as HTMLElement).innerText?.trim()
  if (innerText) return innerText.slice(0, 80)
  return ''
}

export class CaptureEngine {
  private sessionId: string | null = null
  private sessionStartT = 0
  private isRecording = false
  private isPaused = false
  private cleanupFns: Array<() => void> = []
  private lastClickT = 0
  private lastClickSelector = ''

  startCapture(sessionId: string): void {
    this.sessionId = sessionId
    this.sessionStartT = Date.now()
    this.isRecording = true
    this.isPaused = false

    // Emit initial page load event
    this.captureNavigation(location.href, document.title, false)

    // Click events
    const onClick = (e: MouseEvent) => this.captureClick(e)
    document.addEventListener('click', onClick, true)
    this.cleanupFns.push(() => document.removeEventListener('click', onClick, true))

    // Input change events
    const onChange = (e: Event) => this.captureInputChange(e)
    document.addEventListener('change', onChange, true)
    this.cleanupFns.push(() => document.removeEventListener('change', onChange, true))

    // Form submit
    const onSubmit = (e: SubmitEvent) => this.captureFormSubmit(e)
    document.addEventListener('submit', onSubmit, true)
    this.cleanupFns.push(() => document.removeEventListener('submit', onSubmit, true))

    // SPA navigation via popstate
    const onPopState = () => this.captureNavigation(location.href, document.title, true)
    window.addEventListener('popstate', onPopState)
    this.cleanupFns.push(() => window.removeEventListener('popstate', onPopState))

    // Intercept history.pushState and replaceState
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

  stopCapture(): void {
    this.isRecording = false
    this.isPaused = false
    this.cleanupFns.forEach(fn => fn())
    this.cleanupFns = []
    this.sessionId = null
  }

  pauseCapture(): void {
    this.isPaused = true
  }

  resumeCapture(): void {
    this.isPaused = false
  }

  private captureNavigation(url: string, title: string, isSpa: boolean): void {
    this.emit({
      event_type: isSpa ? 'spa_route_changed' : 'page_loaded',
      url,
      url_normalized: normalizeUrl(url),
      page_title: title,
    })
  }

  private captureClick(e: MouseEvent): void {
    if (!this.isCapturing()) return
    const target = e.target as Element
    if (!target) return
    if (isSensitiveElement(target)) return

    const selector = getSelector(target)
    const label = getLabel(target)
    const t = Date.now()

    // Dedup: skip if same selector clicked within 300ms
    if (selector === this.lastClickSelector && t - this.lastClickT < 300) return
    this.lastClickSelector = selector
    this.lastClickT = t

    this.emit({
      event_type: 'click',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      target_selector: selector,
      target_label: label,
      target_role: target.getAttribute('role') ?? target.tagName.toLowerCase(),
      target_element_type: target.tagName.toLowerCase(),
      is_sensitive_target: false,
    })
  }

  private captureInputChange(e: Event): void {
    if (!this.isCapturing()) return
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!target) return

    // Never capture sensitive fields
    if (isSensitiveElement(target)) {
      this.emit({
        event_type: 'input_changed',
        url: location.href,
        url_normalized: normalizeUrl(location.href),
        page_title: document.title,
        target_element_type: (target as HTMLInputElement).type ?? target.tagName.toLowerCase(),
        is_sensitive_target: true,
      })
      return
    }

    const selector = getSelector(target)
    const label = getLabel(target)
    const valuePresentFlag = 'value' in target ? Boolean(target.value) : false

    this.emit({
      event_type: 'input_changed',
      url: location.href,
      url_normalized: normalizeUrl(location.href),
      page_title: document.title,
      target_selector: selector,
      target_label: label,
      target_role: target.getAttribute('role') ?? target.tagName.toLowerCase(),
      target_element_type: (target as HTMLInputElement).type ?? target.tagName.toLowerCase(),
      is_sensitive_target: false,
      value_present: valuePresentFlag,
    })
  }

  private captureFormSubmit(e: SubmitEvent): void {
    if (!this.isCapturing()) return
    const form = e.target as HTMLFormElement
    this.emit({
      event_type: 'form_submitted',
      url: form.action || location.href,
      url_normalized: normalizeUrl(form.action || location.href),
      page_title: document.title,
    })
  }

  private isCapturing(): boolean {
    return this.isRecording && !this.isPaused && this.sessionId !== null
  }

  private emit(partial: Partial<RawEvent> & { event_type: string }): void {
    if (!this.sessionId) return
    const event: RawEvent = {
      raw_event_id: generateId(),
      session_id: this.sessionId,
      t_ms: Date.now() - this.sessionStartT,
      t_wall: new Date().toISOString(),
      schema_version: SCHEMA_VERSION,
      ...partial,
    }
    chrome.runtime.sendMessage({ type: MSG.RAW_EVENT_CAPTURED, payload: { event } }).catch(() => { /* ignore */ })
  }
}
