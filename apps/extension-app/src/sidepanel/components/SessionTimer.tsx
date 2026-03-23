import React, { useState, useEffect, useRef } from 'react'

interface SessionTimerProps {
  startedAt: string
  isPaused: boolean
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function SessionTimer({ startedAt, isPaused }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedAtRef = useRef<number | null>(null)
  const accumulatedRef = useRef(0)

  useEffect(() => {
    const start = new Date(startedAt).getTime()

    function tick() {
      const now = Date.now()
      setElapsed(accumulatedRef.current + (now - start))
    }

    if (!isPaused) {
      // Resume: reset the "paused at" reference
      if (pausedAtRef.current !== null) {
        // Adjust start to account for time already elapsed before pause
        // We just track accumulated separately
        pausedAtRef.current = null
      }
      intervalRef.current = setInterval(tick, 500)
      tick()
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startedAt, isPaused])

  return (
    <span className="text-xs font-mono text-gray-400 tabular-nums">
      {formatDuration(elapsed)}
    </span>
  )
}
