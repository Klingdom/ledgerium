import { useState, useEffect, useCallback } from 'react'
import { MSG } from '../../shared/types.js'
import type { HistoryEntry } from '../../shared/types.js'

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MSG.GET_HISTORY }, response => {
      if (chrome.runtime.lastError) { setLoading(false); return }
      setEntries((response as HistoryEntry[] | undefined) ?? [])
      setLoading(false)
    })
  }, [])

  const deleteEntry = useCallback((sessionId: string) => {
    chrome.runtime.sendMessage(
      { type: MSG.DELETE_HISTORY_ENTRY, payload: { sessionId } },
      () => {
        if (!chrome.runtime.lastError) {
          setEntries(prev => prev.filter(e => e.sessionId !== sessionId))
        }
      },
    )
  }, [])

  return { entries, loading, deleteEntry }
}
