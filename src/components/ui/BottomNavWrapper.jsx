'use client'
// src/components/ui/BottomNavWrapper.jsx
// Wraps BottomNav and hides it during focused sessions (practice, lesson viewer)
// Reads document.body.dataset.hideNav set by session page
// Also hides on /student/practice/session and /student/lessons/* routes

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import BottomNav from './BottomNav'

const HIDDEN_ROUTES = [
  '/student/practice/session',
  '/student/practice/results',
]

export default function BottomNavWrapper() {
  const pathname = usePathname()
  const [navHidden, setNavHidden] = useState(false)

  // Check both route-based hiding and body data attribute (for programmatic hiding)
  useEffect(() => {
    const isHiddenRoute = HIDDEN_ROUTES.some(r => pathname.startsWith(r))
    setNavHidden(isHiddenRoute)
  }, [pathname])

  // Also listen for body data attribute changes (set by session page useEffect)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setNavHidden(prev => {
        const hiddenByAttr = document.body.dataset.hideNav === 'true'
        const isHiddenRoute = HIDDEN_ROUTES.some(r => pathname.startsWith(r))
        return hiddenByAttr || isHiddenRoute
      })
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-hide-nav'] })
    return () => observer.disconnect()
  }, [pathname])

  if (navHidden) return null
  return <BottomNav />
}