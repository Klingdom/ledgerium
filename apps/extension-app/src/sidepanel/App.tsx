import React from 'react'
import { useRecorderState } from './hooks/useRecorderState.js'
import { Header } from './components/Header.js'
import { IdleScreen } from './screens/IdleScreen.js'
import { ArmingScreen } from './screens/ArmingScreen.js'
import { RecordingScreen } from './screens/RecordingScreen.js'
import { PausedScreen } from './screens/PausedScreen.js'
import { StoppingScreen } from './screens/StoppingScreen.js'
import { ReviewScreen } from './screens/ReviewScreen.js'
import { ErrorScreen } from './screens/ErrorScreen.js'

export function App() {
  const recorder = useRecorderState()

  function renderScreen() {
    switch (recorder.state) {
      case 'idle':
        return <IdleScreen onStart={recorder.startSession} />
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
          <ReviewScreen
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
        return <IdleScreen onStart={recorder.startSession} />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0e14] text-gray-100 overflow-hidden">
      <Header state={recorder.state} meta={recorder.meta} />
      <main className="flex-1 overflow-y-auto">
        {renderScreen()}
      </main>
    </div>
  )
}
