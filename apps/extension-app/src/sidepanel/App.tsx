import React, { useState, useEffect } from 'react'
import { useRecorderState } from './hooks/useRecorderState.js'
import { Header } from './components/Header.js'
import { IdleScreen } from './screens/IdleScreen.js'
import { ArmingScreen } from './screens/ArmingScreen.js'
import { RecordingScreen } from './screens/RecordingScreen.js'
import { PausedScreen } from './screens/PausedScreen.js'
import { StoppingScreen } from './screens/StoppingScreen.js'
import { ProcessScreen } from './screens/ProcessScreen.js'
import { ErrorScreen } from './screens/ErrorScreen.js'
import { HistoryDetailScreen } from './screens/HistoryDetailScreen.js'
import type { HistoryEntry } from '../shared/types.js'

export function App() {
  const recorder = useRecorderState()

  // Tracks which history entry the user has opened for detail view.
  // Only meaningful when recorder.state === 'idle'.
  const [historyEntry, setHistoryEntry] = useState<HistoryEntry | null>(null)

  // Clear the history detail view whenever we leave the idle state
  // (e.g. user starts a new recording while viewing history).
  useEffect(() => {
    if (recorder.state !== 'idle') setHistoryEntry(null)
  }, [recorder.state])

  function renderScreen() {
    switch (recorder.state) {
      case 'idle':
        if (historyEntry) {
          return (
            <HistoryDetailScreen
              sessionId={historyEntry.sessionId}
              activityName={historyEntry.activityName}
              onBack={() => setHistoryEntry(null)}
              onDeleted={() => setHistoryEntry(null)}
            />
          )
        }
        return (
          <IdleScreen
            onStart={recorder.startSession}
            onOpenHistory={setHistoryEntry}
          />
        )

      case 'arming':
        return <ArmingScreen />

      case 'recording':
        return (
          <RecordingScreen
            meta={recorder.meta}
            steps={recorder.steps}
            rawEventCount={recorder.rawEventCount}
            onPause={recorder.pauseSession}
            onStop={recorder.stopSession}
            onDiscard={recorder.discardSession}
          />
        )

      case 'paused':
        return (
          <PausedScreen
            meta={recorder.meta}
            steps={recorder.steps}
            onResume={recorder.resumeSession}
            onStop={recorder.stopSession}
            onDiscard={recorder.discardSession}
          />
        )

      case 'stopping':
        return <StoppingScreen />

      case 'review_ready':
        return (
          <ProcessScreen
            meta={recorder.meta}
            steps={recorder.steps}
            uploadProgress={recorder.uploadProgress}
            uploadStatus={recorder.uploadStatus}
            onDiscard={recorder.discardSession}
          />
        )

      case 'error':
        return (
          <ErrorScreen
            error={recorder.error}
            onDismiss={recorder.discardSession}
          />
        )

      default:
        return (
          <IdleScreen
            onStart={recorder.startSession}
            onOpenHistory={setHistoryEntry}
          />
        )
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0e14] text-gray-100 overflow-hidden">
      <Header state={recorder.state} meta={recorder.meta} />
      <main className="flex-1 overflow-hidden">
        {renderScreen()}
      </main>
    </div>
  )
}
