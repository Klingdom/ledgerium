// ProcessScreen-quota.test.ts — the sidepanel must tell a quota refusal apart
// from every other sync failure, and must not guess.

import { describe, it, expect } from 'vitest'
import { classifySyncFailure, quotaNotice } from './ProcessScreen.js'

describe('quotaNotice copy', () => {
  it('includes counts when both are known', () => {
    expect(quotaNotice(5, 5).title).toBe('Monthly upload limit reached (5 of 5)')
  })

  it('omits counts rather than printing null', () => {
    expect(quotaNotice(null, 5).title).toBe('Monthly upload limit reached')
    expect(quotaNotice(5, null).title).not.toMatch(/null/)
  })

  it('says the recording is kept, never implies loss, and does not name Team or Starter', () => {
    const n = quotaNotice(5, 5)
    const all = `${n.title} ${n.body} ${n.cta}`
    // Must name the list the user can actually see (IdleScreen section header).
    expect(n.body).toMatch(/kept in Recent Recordings/)
    expect(all).not.toMatch(/delet|lost|lose/i)
    expect(all).not.toMatch(/Team|Starter/)
    expect(n.body).toMatch(/Solo removes the monthly cap/)
  })

  it('does not tell the user to retry — retrying cannot succeed', () => {
    const n = quotaNotice(5, 5)
    expect(`${n.title} ${n.body} ${n.cta}`).not.toMatch(/try again|retry/i)
  })
})

describe('classifySyncFailure', () => {
  it('401 is an auth failure regardless of body', () => {
    expect(classifySyncFailure(401, null)).toEqual({ kind: 'auth' })
    expect(classifySyncFailure(401, { code: 'UPGRADE_REQUIRED' })).toEqual({ kind: 'auth' })
  })

  it('403 with UPGRADE_REQUIRED is a quota refusal carrying the counts', () => {
    // Exact shape returned by apps/web-app/src/app/api/sync/route.ts.
    const body = { error: 'Recording limit reached', code: 'UPGRADE_REQUIRED', used: 5, limit: 5 }
    expect(classifySyncFailure(403, body)).toEqual({ kind: 'quota', used: 5, limit: 5 })
  })

  it('403 without the code is NOT treated as quota', () => {
    expect(classifySyncFailure(403, { error: 'Forbidden' })).toEqual({ kind: 'error' })
    expect(classifySyncFailure(403, null)).toEqual({ kind: 'error' })
    expect(classifySyncFailure(403, 'UPGRADE_REQUIRED')).toEqual({ kind: 'error' })
  })

  it('the code only counts on a 403', () => {
    expect(classifySyncFailure(500, { code: 'UPGRADE_REQUIRED' })).toEqual({ kind: 'error' })
    expect(classifySyncFailure(429, { code: 'UPGRADE_REQUIRED' })).toEqual({ kind: 'error' })
  })

  it('malformed counts become null rather than being trusted', () => {
    const r = classifySyncFailure(403, { code: 'UPGRADE_REQUIRED', used: '5', limit: -1 })
    expect(r).toEqual({ kind: 'quota', used: null, limit: null })
    expect(classifySyncFailure(403, { code: 'UPGRADE_REQUIRED', used: 2.5, limit: 5 }))
      .toEqual({ kind: 'quota', used: null, limit: 5 })
  })

  it('other failures are generic errors', () => {
    expect(classifySyncFailure(500, { error: 'boom' })).toEqual({ kind: 'error' })
    expect(classifySyncFailure(413, null)).toEqual({ kind: 'error' })
  })

  it('is deterministic', () => {
    const body = { code: 'UPGRADE_REQUIRED', used: 3, limit: 5 }
    expect(classifySyncFailure(403, body)).toEqual(classifySyncFailure(403, body))
  })
})
