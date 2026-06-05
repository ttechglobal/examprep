'use client'

import Link from 'next/link'

export default function SignupPrompt({ subtopicName, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div className="bg-card rounded-3xl w-full max-w-sm p-6 shadow-xl">
        <div className="text-center mb-5">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-black text-gray-900 mb-1">
            You finished {subtopicName}!
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Create a free account to save your progress and pick up right where you left off — every time.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/signup?from=lesson"
            className="block w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors text-center"
          >
            Create free account →
          </Link>
          <Link
            href="/login?from=lesson"
            className="block w-full py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-2xl hover:bg-base transition-colors text-center"
          >
            I already have an account
          </Link>
          <button
            onClick={onDismiss}
            className="block w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors text-center"
          >
            Continue without saving
          </button>
        </div>
      </div>
    </div>
  )
}