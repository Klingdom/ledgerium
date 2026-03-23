import React from 'react'

export function StoppingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
      <div className="w-10 h-10 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      <div className="text-center">
        <p className="text-sm text-gray-300 font-medium">Processing session</p>
        <p className="text-xs text-gray-500 mt-1">Deriving steps and building bundle…</p>
      </div>
    </div>
  )
}
