'use client'
// src/app/school/dashboard/page.js
// Shell only — data fetch + loading/error states + tab routing.
// Each tab is its own file in ./tabs/.

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams }                  from 'next/navigation'
import { createClient }                                from '@/lib/supabase/client'

import { DASH_CSS }        from './tabs/shared'
import OverviewTab         from './tabs/OverviewTab'
import StudentsTab         from './tabs/StudentsTab'
import PerformanceTab      from './tabs/PerformanceTab'
import CohortTab           from './tabs/CohortTab'
import SubscriptionsTab    from './tabs/SubscriptionsTab'
import SettingsTab         from './tabs/SettingsTab'

// ── Session cache — keyed by user id to avoid cross-school bleed ──────────────
const CACHE_TTL = 2 * 60 * 1000

function cacheKey(userId) { return `ep_sdash_v4_${userId}` }
function readCache(userId) {
  try {
    const c = JSON.parse(sessionStorage.getItem(cacheKey(userId)) || 'null')
    return c && Date.now() - c.ts < CACHE_TTL ? c.d : null
  } catch { return null }
}
function writeCache(userId, d) {
  try { sessionStorage.setItem(cacheKey(userId), JSON.stringify({ d, ts: Date.now() })) } catch {}
}

// ── Derive daysSinceLastPractice from lastActive if API didn't send it ─────────
// Belt-and-suspenders: the API now sends this, but cached data might be old.
function hydrateDaysSince(students = []) {
  const now = Date.now()
  return students.map(s => {
    if (s.daysSinceLastPractice != null) return s
    if (!s.lastActive) return { ...s, daysSinceLastPractice: null }
    const days = Math.floor((now - new Date(s.lastActive).getTime()) / 86400000)
    return { ...s, daysSinceLastPractice: days }
  })
}

function DashboardInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tab          = searchParams.get('tab') ?? 'overview'
  const supabase     = createClient()

  const [userId,    setUserId]    = useState(null)
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [adminName, setAdminName] = useState('')

  const load = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/school-login'); return }
      setUserId(user.id)

      if (!force) {
        const cached = readCache(user.id)
        if (cached) {
          const hydrated = { ...cached, students: hydrateDaysSince(cached.students) }
          setData(hydrated)
          setAdminName(hydrated.adminName || '')
          setLoading(false)
          return
        }
      }

      const res = await fetch('/api/school/dashboard')
      const d   = await res.json()
      if (d.error) { setError(d.error); setLoading(false); return }

      const enriched = { ...d, students: hydrateDaysSince(d.students) }
      writeCache(user.id, enriched)
      setData(enriched)
      setAdminName(enriched.adminName || '')
    } catch {
      setError('Failed to load. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  function goTab(id) {
    const p = new URLSearchParams(searchParams)
    p.set('tab', id)
    router.push(`/school/dashboard?${p.toString()}`)
  }

  function handleCohortCreated(c) {
    setData(prev => prev
      ? { ...prev, cohort: c, allCohorts: [c, ...(prev.allCohorts ?? [])], summary: { ...prev.summary, totalStudents: 0 } }
      : prev
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:14 }}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #1264E5', borderTopColor:'transparent', animation:'spin .7s linear infinite' }}/>
      <div style={{ fontSize:13, color:'#7a8aaa' }}>Loading school data…</div>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:36 }}>⚠️</div>
      <div style={{ fontSize:14, fontWeight:700, color:'#3a4870' }}>{error}</div>
      <button onClick={() => load(true)} style={{ color:'#1264E5', fontSize:13, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
        Try again
      </button>
    </div>
  )

  if (!data) return null

  const { cohort, allCohorts = [], summary = {}, students = [], subjectTopics = [], weeklyEngagement = [], school, atRiskSegmented = [] } = data

  const sharedProps = { data, adminName, goTab, cohort }

  return (
    <>
      <style>{DASH_CSS}</style>
      {tab === 'overview'       && <OverviewTab    {...sharedProps} />}
      {tab === 'students'       && <StudentsTab    students={students} cohortName={cohort?.name || ''} atRiskSegmented={atRiskSegmented} />}
      {tab === 'performance'    && <PerformanceTab subjectTopics={subjectTopics} />}
      {tab === 'cohort'         && (
        <CohortTab
          cohort={cohort}
          allCohorts={allCohorts}
          totalStudents={summary.totalStudents ?? 0}
          onCohortCreated={handleCohortCreated}
        />
      )}
      {tab === 'subscriptions'  && (
        <SubscriptionsTab
          school={school}
          adminEmail={adminName}
        />
      )}
      {tab === 'settings' && (
        <SettingsTab
          school={school}
          onSaved={info => setData(d => d ? { ...d, school: { ...d.school, ...info } } : d)}
        />
      )}
    </>
  )
}

export default function SchoolDashboardPage() {
  return <Suspense fallback={null}><DashboardInner /></Suspense>
}