'use client'
// src/app/student/practice/setup/page.js
// The setup flow now lives as a bottom-sheet modal on /student/practice.
// This page redirects there, keeping any deep-links working.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PracticeSetupPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/student/practice') }, [router])
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 24, height: 24, border: '3px solid #1264E5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}