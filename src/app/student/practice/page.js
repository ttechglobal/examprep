'use client'
// src/app/student/practice/page.js — v16
// ─────────────────────────────────────────────────────────────────────────────
// Practice: pick a way to practise, see recent sessions and this week's streak.
// Local-first: works for guests and signed-in students. The profile comes from
// the layout (useStudentUser); subjects resolve from the device cache first.
//
//   Hero · Topic Practice + Mock Exam cards · More Practice Modes (Quick 5,
//   Custom, Study) · Recent Sessions · Practice Streak
// Sections: components/student/practice/. The mode + subject picker is
// components/student/practice/PracticeSetupSheet.jsx.
//
// v16: new design. The Battle card left this page (Battle has its own tab).
//      Recent Sessions shows topic, score bar and time (hooks/useRecentSessions);
//      the streak card is shared with Home. "Study Practice" opens Custom with
//      Study mode chosen. Speed Round stays in the sheet only.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useStudentUser } from '@/app/student/layout'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { readSubjectIdCache, writeSubjectIdCache } from '@/lib/localProfile'
import { appDay } from '@/lib/dates'
import { useStudentActivity } from '@/hooks/useStudentActivity'
import { useRecentSessions } from '@/hooks/useRecentSessions'
import WeekActivityCard from '@/components/student/WeekActivityCard'
import PracticeSetupSheet from '@/components/student/practice/PracticeSetupSheet'
import { PracticeHero, PrimaryModes, MoreModes, RecentSessions, NoSubjects } from '@/components/student/practice/PracticeSections'
import s from '@/components/student/practice/practice.module.css'

const RECENT_LIMIT = 3
const cap = str => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '')

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const router       = useRouter()
  const { dark }     = useTheme()
  const { totalPoints: xp } = usePoints()
  const searchParams = useSearchParams()
  const subjectCache = useRef({})

  // ── Profile: read from layout context (already handles guest + auth) ─────────
  const profile  = useStudentUser()
  const isGuest  = !!profile?.isGuest
  const isReady  = profile !== null  // layout has finished its auth check
  const userId   = profile?.id ?? null

  const activity = useStudentActivity('week', { userId, isGuest, ready: isReady })
  const recent   = useRecentSessions(RECENT_LIMIT, { userId, isGuest, ready: isReady })

  // Derive exam type from profile
  const [exam,            setExam]            = useState('WAEC')
  const [subjects,        setSubjects]        = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  // Open setup sheet: { mode, sessionType } or null
  const [sheet,           setSheet]           = useState(null)

  // Initialise exam + subjects from profile — local-first.
  // Profile already carries subject names from layout (no extra network call).
  // We show stubs instantly, then resolve IDs in background.
  // Fire when profile becomes available OR when subjects change (e.g. after profile save)
  // Use a fingerprint that captures: who the user is + what subjects they have
  const profileSubjectKey = profile
    ? `${profile.id ?? 'guest'}_${profile.exam_type ?? ''}_${(profile.subjects_waec ?? profile.subjects ?? []).join(',')}_${(profile.subjects_jamb ?? []).join(',')}`
    : null

  useEffect(() => {
    if (!profile) return
    const examType = profile.exam_type ?? profile.exam_types?.[0] ?? 'WAEC'
    setExam(examType)
    // Clear cache so we re-resolve with new subject names
    subjectCache.current = {}
    loadSubjects(examType, profile)
  }, [profileSubjectKey]) // eslint-disable-line

  async function loadSubjects(examTab, currentProfile) {
    // 1. In-memory cache (same session, tab not closed)
    if (subjectCache.current[examTab]) {
      setSubjects(subjectCache.current[examTab])
      return
    }

    // Extract names from local profile — zero latency.
    // Normalize exam-specific English names: WAEC="English Language", JAMB="Use of English".
    // Onboarding sometimes stores the WAEC name in subjects_jamb — fix it here so the
    // API lookup and the UI both show the right name.
    const JAMB_NAME_NORM = { 'English Language': 'Use of English' }
    const WAEC_NAME_NORM = { 'Use of English': 'English Language' }
    function normName(n) {
      if (examTab === 'JAMB') return JAMB_NAME_NORM[n] ?? n
      if (examTab === 'WAEC') return WAEC_NAME_NORM[n] ?? n
      return n
    }
    const rawNames = examTab === 'WAEC'
      ? (currentProfile?.subjects_waec ?? currentProfile?.subjects ?? [])
      : (currentProfile?.subjects_jamb ?? currentProfile?.subjects ?? [])
    const names = rawNames.map(normName)

    if (!names.length) {
      setSubjects([])
      return
    }

    // 2. localStorage cache — skip the network on repeat visits
    const lsCached = readSubjectIdCache(examTab)
    if (lsCached?.length) {
      // Validate names still match the profile (subjects may have changed)
      const cachedNames = new Set(lsCached.map(s => s.name))
      if (names.every(n => cachedNames.has(n))) {
        subjectCache.current[examTab] = lsCached
        setSubjects(lsCached)
        return
      }
    }

    // 3. Show name-only stubs immediately — UI is never blank
    const stubs = names.map(n => ({ id: null, name: n }))
    setSubjects(stubs)

    // 4. Background fetch to resolve real IDs, then cache for next visit
    setLoadingSubjects(true)
    try {
      const res  = await fetch(`/api/student/subjects?exam=${examTab}&names=${encodeURIComponent(names.join(','))}`)
      const data = res.ok ? await res.json() : []
      const rows = Array.isArray(data) && data.length
        ? data.map(s => ({ id: s.id, name: s.name }))
        : stubs
      subjectCache.current[examTab] = rows
      writeSubjectIdCache(examTab, rows)  // persist for next visit
      setSubjects(rows)
    } catch {
      // Keep stubs — subjects still visible, IDs resolve on retry
    } finally {
      setLoadingSubjects(false)
    }
  }

  function handleExamChange(e) {
    setExam(e)
    // Clear in-memory cache so switching exam tabs always re-normalizes names
    subjectCache.current = {}
    loadSubjects(e, profile)
  }

  function openSheet(mode = 'custom', sessionType = 'practice') {
    setSheet({ mode, sessionType })
  }

  function handleStart(config) {
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    setSheet(null)
    router.push('/student/practice/session')
  }

  // Handle URL params (e.g. ?modal=1 or ?mode=quick5)
  useEffect(() => {
    if (!isReady) return
    if (searchParams?.get('modal') === '1') openSheet('custom')
  }, [searchParams, isReady])

  useEffect(() => {
    if (!isReady) return
    const m = searchParams?.get('mode')
    if (m) {
      const map = { speed: 'timed', mock: 'mock', custom: 'custom', quick5: 'quick5' }
      if (map[m]) openSheet(map[m])
    }
  }, [searchParams, isReady])

  function startMock() {
    sessionStorage.setItem('mock_config', JSON.stringify({ subjects, examType: exam }))
    router.push('/student/practice/mock')
  }

  if (!isReady) return <PracticeSkeleton />

  const hasSubjects = subjects.length > 0
  const name = cap(profile.full_name?.split(' ')[0] || profile.username || 'Student')

  return (
    <div className={s.page}>
      <PracticeHero name={name} />

      {!hasSubjects && !loadingSubjects ? (
        <NoSubjects isGuest={isGuest} />
      ) : (
        <>
          <PrimaryModes onTopic={() => openSheet('topic')} onMock={startMock} />
          <MoreModes
            onPick={key => (key === 'study' ? openSheet('custom', 'study') : openSheet(key))}
            onSeeAll={() => openSheet('custom')}
          />
          <div className={s.bottom}>
            <RecentSessions sessions={recent.sessions} loading={recent.loading} dark={dark} />
            <div className={s.streak}>
              <WeekActivityCard
                title="Practice Streak" link={{ href: '/student/progress', label: 'This Week' }}
                days={activity.days} today={appDay()}
                questions={activity.stats.questions} questionsLabel="Questions This Week"
                streak={activity.stats.streak} xp={xp || 0}
              />
            </div>
          </div>
        </>
      )}

      {sheet && (
        <PracticeSetupSheet
          subjects={subjects}
          loadingSubjects={loadingSubjects}
          initialMode={sheet.mode}
          initialSessionType={sheet.sessionType}
          exam={exam}
          onExamChange={handleExamChange}
          onClose={() => setSheet(null)}
          onStart={handleStart}
          onMockExam={() => { setSheet(null); startMock() }}
        />
      )}
    </div>
  )
}

function PracticeSkeleton() {
  const block = height => ({ height, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy="true">
      <div style={{ height: 200 }} />
      <div style={block(156)} />
      <div style={block(156)} />
      <div style={block(120)} />
    </div>
  )
}
