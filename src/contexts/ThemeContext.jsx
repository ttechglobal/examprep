'use client'
// src/contexts/ThemeContext.jsx
// Provides dark mode state to the whole app.
// Default: system preference. Manual toggle persisted to localStorage.

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ dark: false, toggle: () => {} })

// Storage can be unavailable (private mode) or full. The theme must still
// switch, so a failed save only means the choice isn't remembered.
function readTheme() {
  try { return localStorage.getItem('ep-theme') } catch { return null }
}
function saveTheme(value) {
  try { localStorage.setItem('ep-theme', value) }
  catch (e) { console.warn('Could not save theme preference:', e?.name ?? e) }
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false)
  // False until the stored preference has been read. Until then we leave
  // <html class="dark"> alone: the head script in layout.js already set it,
  // and toggling it with the initial `false` caused a light flash on load.
  const [ready, setReady] = useState(false)

  // On mount: read localStorage override, else use system preference
  useEffect(() => {
    const stored = readTheme()
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
      if (!readTheme()) setDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function toggle() {
    // Save outside the state updater: updaters must be pure, and React may
    // call them twice in development.
    const next = !dark
    setDark(next)
    saveTheme(next ? 'dark' : 'light')
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