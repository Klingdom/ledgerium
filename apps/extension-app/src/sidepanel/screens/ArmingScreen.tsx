import React from 'react'

export function ArmingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
      <div className="w-10 h-10 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      <p className="text-sm text-gray-400">Initializing session…</p>
    </div>
  )
}
