// src/lib/useIsDark.js
// ─────────────────────────────────────────────────────────────────────────────
// Extracted shared hook — was duplicated inline in StudyPlanCard.jsx and
// LearnPage.jsx. Centralising it here so every games component imports the
// same implementation instead of re-pasting it.
//
// If your codebase already has this in a shared file, skip this one and
// just import from wherever it already lives — the games components below
// import it as `@/lib/useIsDark`.
// ─────────────────────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'

export function useIsDark() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}