'use client'
// src/components/ui/DarkModeToggle.jsx
import { useTheme } from '@/contexts/ThemeContext'

export default function DarkModeToggle({ showLabel = false }) {
  const { dark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-subtle transition-colors"
    >
      {dark ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v1m0 16v1M4.22 4.22l.71.71m12.73 12.73.71.71M3 12H2m20 0h-1M4.22 19.78l.71-.71M18.36 5.64l.71-.71M12 6a6 6 0 100 12A6 6 0 0012 6z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">{dark ? 'Light mode' : 'Dark mode'}</span>
      )}
    </button>
  )
}