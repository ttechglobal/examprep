'use client'
// src/contexts/ThemeContext.jsx
// Provides dark mode state to the whole app.
// Default: system preference. Manual toggle persisted to localStorage.

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ dark: false, toggle: () => {} })

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false)
  // False until the stored preference has been read. Until then we leave
  // <html class="dark"> alone: the head script in layout.js already set it,
  // and toggling it with the initial `false` caused a light flash on load.
  const [ready, setReady] = useState(false)

  // On mount: read localStorage override, else use system preference
  useEffect(() => {
    const stored = localStorage.getItem('ep-theme')
    if (stored) {
      setDark(stored === 'dark')
    } else {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    setReady(true)
  }, [])

  // Apply class to <html> whenever dark changes
  useEffect(() => {
    if (!ready) return
    document.documentElement.classList.toggle('dark', dark)
  }, [dark, ready])

  // Listen for system preference changes (only when no manual override)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handler(e) {
      if (!localStorage.getItem('ep-theme')) setDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function toggle() {
    setDark(d => {
      const next = !d
      localStorage.setItem('ep-theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}