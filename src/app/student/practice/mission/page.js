'use client'
// src/app/student/practice/mission/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Mission mode page — the gamified practice experience.
//
// URL: /student/practice/mission
// Entry: reads `mission_config` from sessionStorage, set by practice/page.js
//        when student taps "Begin Mission" from any subject card.
//
// mission_config shape:
//   {
//     subject_id: string,
//     subjectName: string,
//     topicId: string,
//     topicName: string,
//     examType: 'WAEC' | 'JAMB' | 'BOTH',
//     count: number,   // default 10
//     masteryPct: number,
//     bestStars: number,
//   }
//
// PHASE FLOW:
//   'briefing' → 'playing' → 'complete' | 'failed'
//
// DATA:
//   Questions fetched from /api/practice/questions (same API as session page).
//   On complete/fail: saves result to /api/student/practice/save.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { useMissionEngine } from '@/components/mission/useMissionEngine'
import MissionBriefing from '@/components/mission/MissionBriefing'
import MissionGameplay from '@/components/mission/MissionGameplay'
import MissionFail from '@/components/mission/MissionFail'
import MissionComplete from '@/components/mission/MissionComplete'

const SUBJECT_ICONS = {
  'Chemistry': '⚗️', 'Physics': '⚡', 'Biology': '🧬',
  'Mathematics': '📐', 'Further Mathematics': '📐',
  'English Language': '📖', 'Use of English': '📖',
  'Economics': '📊', 'Government': '🏛️', 'Geography': '🌍',
  'Literature in English': '📚', 'Agricultural Science': '🌱',
  'Commerce': '💼', 'Accounting': '🧮', 'Computer Science': '💻',
  'default': '📝',
}

export default function MissionPage() {
  const router   = useRouter()
  const supabase = createClient()
  const isDark   = useIsDark()

  const [phase,     setPhase]    = useState('loading') // loading | briefing | playing | failed | complete
  const [config,    setConfig]   = useState(null)
  const [questions, setQuestions]= useState([])
  const [endData,   setEndData]  = useState(null)   // { correct, wrong, xp, lives, stars, bonus }
  const [error,     setError]    = useState(null)

  // Load config + questions on mount
  useEffect(() => {
    async function load() {
      // Read config from sessionStorage
      let cfg
      try {
        const raw = sessionStorage.getItem('mission_config')
        cfg = raw ? JSON.parse(raw) : null
      } catch {}

      // Fallback: read practice_config and treat as mission
      if (!cfg) {
        try {
          const raw = sessionStorage.getItem('practice_config')
          if (raw) {
            const pc = JSON.parse(raw)
            cfg = {
              subject_id:  pc.subject_id,
              subjectName: pc.subjects?.[0] ?? 'Chemistry',
              topicId:     pc.topic_id,
              topicName:   pc.topicName ?? 'Mixed Practice',
              examType:    pc.examType ?? 'WAEC',
              count:       pc.count ?? 10,
              masteryPct:  pc.masteryPct ?? null,
              bestStars:   0,
            }
          }
        } catch {}
      }

      if (!cfg) {
        // No config — send back to practice page
        router.replace('/student/practice')
        return
      }
      setConfig(cfg)

      // Fetch questions
      try {
        const params = new URLSearchParams({
          subject_id: cfg.subject_id ?? '',
          exam_type:  cfg.examType   ?? 'WAEC',
          count:      String(cfg.count ?? 10),
          mode:       'topic',
        })
        if (cfg.topicId)   params.set('topic_id',   cfg.topicId)
        if (cfg.topicName) params.set('topic_name', cfg.topicName)

        const res  = await fetch(`/api/practice/questions?${params}`)
        const data = await res.json()

        if (!data.questions?.length) {
          setError('No questions found for this topic yet.')
          setPhase('error')
          return
        }
        setQuestions(data.questions)
      } catch (e) {
        setError('Failed to load questions. Please try again.')
        setPhase('error')
        return
      }

      setPhase('briefing')
    }
    load()
  }, []) // eslint-disable-line

  // Save result to DB (non-blocking)
  async function saveResult({ correct, wrong, xp, stars }) {
    if (!config) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await fetch('/api/student/practice/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id:  user.id,
          subject_id:  config.subject_id,
          topic_id:    config.topicId,
          correct,
          wrong,
          xp_earned:   xp,
          stars,
          mode:        'mission',
        }),
      })
    } catch {}
  }

  const handleComplete = useCallback((data) => {
    setEndData(data)
    setPhase('complete')
    saveResult(data)
  }, [config]) // eslint-disable-line

  const handleFail = useCallback((data) => {
    setEndData(data)
    setPhase('failed')
    saveResult({ ...data, stars: 0 })
  }, [config]) // eslint-disable-line

  // Mission engine
  const engine = useMissionEngine({
    questions,
    onComplete: handleComplete,
    onFail:     handleFail,
  })

  // Phase transitions
  function startMission() { engine.reset(); setPhase('playing') }
  function retry()        { engine.reset(); setPhase('playing') }
  function goHome()       { router.push('/student/dashboard') }
  function goBriefing()   { setPhase('briefing') }

  // Derived colours
  const colors = resolveSubjectColors(config?.subjectName ?? 'Chemistry', isDark)
  const accent = colors.solid
  const accentBg = colors.bg

  const subjectIcon = SUBJECT_ICONS[config?.subjectName] ?? SUBJECT_ICONS.default

  // Difficulty counts
  const easyCount   = questions.filter(q => (q.difficulty ?? '').toLowerCase() === 'easy').length
  const mediumCount = questions.filter(q => (q.difficulty ?? '').toLowerCase() === 'medium').length
  const hardCount   = questions.filter(q => (q.difficulty ?? '').toLowerCase() === 'hard').length

  // ── RENDER ──────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
        background: 'var(--bg-base)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: `3px solid ${accent}`, borderTopColor: 'transparent',
          animation: 'spin .7s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: 'var(--text-sec)' }}>
          Loading mission…
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
        padding: '32px 24px', background: 'var(--bg-base)',
      }}>
        <span style={{ fontSize: 40 }}>⚠️</span>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-prim)', textAlign: 'center' }}>
          {error}
        </p>
        <button onClick={() => router.push('/student/practice')} style={{
          padding: '12px 24px', borderRadius: 12, background: '#0b1330',
          color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>
          Back to Practice
        </button>
      </div>
    )
  }

  if (phase === 'briefing') {
    return (
      <MissionBriefing
        subjectName={config.subjectName}
        topicName={config.topicName}
        subjectIcon={subjectIcon}
        accent={accent}
        accentBg={accentBg}
        examType={config.examType}
        questionCount={questions.length}
        easyCount={easyCount}
        mediumCount={mediumCount}
        hardCount={hardCount}
        bestStars={config.bestStars ?? 0}
        masteryPct={config.masteryPct}
        onBegin={startMission}
        onBack={() => router.push('/student/practice')}
      />
    )
  }

  if (phase === 'playing') {
    return (
      <MissionGameplay
        question={engine.question}
        idx={engine.idx}
        total={engine.total}
        lives={engine.lives}
        xp={engine.xp}
        results={engine.results}
        answered={engine.answered}
        selected={engine.selected}
        accent={accent}
        subjectName={config?.subjectName ?? ''}
        topicName={config?.topicName ?? ''}
        subjectIcon={subjectIcon}
        onPick={engine.pick}
        onNext={engine.next}
        onBack={goBriefing}
        phase={engine.phase}
      />
    )
  }

  if (phase === 'failed') {
    return (
      <MissionFail
        subjectName={config?.subjectName ?? ''}
        topicName={config?.topicName ?? ''}
        subjectIcon={subjectIcon}
        accent={accent}
        correct={endData?.correct ?? 0}
        wrong={endData?.wrong ?? 0}
        xp={endData?.xp ?? 0}
        masteryPct={config?.masteryPct ?? 0}
        onRetry={retry}
        onHome={goHome}
      />
    )
  }

  if (phase === 'complete') {
    // Estimate updated mastery (simple heuristic: +20 per star)
    const stars        = endData?.stars ?? 1
    const masteryBefore= config?.masteryPct ?? 24
    const masteryAfter = Math.min(masteryBefore + (stars * 20), 100)

    return (
      <MissionComplete
        subjectName={config?.subjectName ?? ''}
        topicName={config?.topicName ?? ''}
        subjectIcon={subjectIcon}
        accent={accent}
        stars={stars}
        correct={endData?.correct ?? 0}
        wrong={endData?.wrong ?? 0}
        xp={endData?.xp ?? 0}
        bonus={endData?.bonus ?? 0}
        lives={endData?.lives ?? 0}
        masteryBefore={masteryBefore}
        masteryAfter={masteryAfter}
        nextTopicName={null} // TODO: wire to /api/student/next-topic
        onRetry={retry}
        onHome={goHome}
        onNextMission={() => router.push('/student/practice')}
      />
    )
  }

  return null
}
