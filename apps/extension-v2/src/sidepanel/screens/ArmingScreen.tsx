import React from 'react'

export function ArmingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-4 bg-white">
      <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      <div className="text-center">
        <p className="text-sm text-gray-900 font-medium">Starting session...</p>
        <p className="text-xs text-gray-500 mt-1">Preparing to capture your workflow</p>
      </div>
    </div>
  )
}
