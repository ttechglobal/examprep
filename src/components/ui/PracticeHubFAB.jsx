// src/components/ui/PracticeHubFAB.jsx
// Floating Action Button — navigates to Practice Hub
// Only renders on mobile (hidden on lg+ where sidebar nav exists)
// Positioned above the bottom nav bar
'use client'
import { useRouter, usePathname } from 'next/navigation'

export default function PracticeHubFAB() {
  const router   = useRouter()
  const pathname = usePathname()

  // Don't show on practice pages themselves
  if (pathname.startsWith('/student/practice')) return null

  return (
    <button
      onClick={() => router.push('/student/practice')}
      aria-label="Go to Practice Hub"
      className="fixed bottom-24 right-4 z-40 lg:hidden
                 w-14 h-14 rounded-2xl
                 bg-indigo-600 hover:bg-indigo-500 active:scale-95
                 shadow-lg shadow-indigo-500/30
                 flex items-center justify-center
                 transition-all duration-150"
    >
      {/* Gamepad / controller icon */}
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="7" width="20" height="12" rx="3" />
        {/* D-pad */}
        <path strokeLinecap="round" d="M7 13h2M8 12v2" />
        {/* Buttons */}
        <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="13" r="1" fill="currentColor" stroke="none" />
        {/* Shoulder bumpers hint */}
        <path strokeLinecap="round" d="M6 7V6a1 1 0 011-1h3M18 7V6a1 1 0 00-1-1h-3" />
      </svg>
    </button>
  )
}