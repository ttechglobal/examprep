'use client'
// src/components/ui/BottomNavWrapper.jsx

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import BottomNav from './BottomNav'
import { useLessonNav } from '@/contexts/LessonNavContext'

const HIDDEN_ROUTES = [
  '/student/practice/session',
  '/student/practice/results',
  '/student/learn/',
]

export default function BottomNavWrapper() {
  const pathname       = usePathname()
  const { lessonOpen } = useLessonNav()

  const isHidden =
    HIDDEN_ROUTES.some(r => pathname.startsWith(r)) ||
    lessonOpen ||
    (typeof document !== 'undefined' && document.body.dataset.hideNav === 'true')

  if (isHidden) return null
  return <BottomNav />
}