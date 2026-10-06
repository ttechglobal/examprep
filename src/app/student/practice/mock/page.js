'use client'
// src/app/student/practice/mock/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Mock exam. WAEC: 1 subject, 50 questions, 60 min. JAMB: 2–4 subjects
// (student's choice), 40 questions each, 2 hours, one tab per subject.
//   Choose your exam → setup (components/student/mock/MockSetupScreens.jsx)
//   → the exam on SessionFrame → SessionSummary → ReviewSession.
//
// Both exams are a list of sections (one per subject; WAEC has one). A JAMB
// subject's questions load when the exam starts (the first at once, the rest
// staggered) or when its tab is opened, whichever comes first.
// Answers live in answersRef (read by the clock's time-up, never stale).
//
// v2: always starts at "Choose your exam"; subjects come from the profile per
//     exam (hooks/useExamSubjects).
// v3: new session design (SessionFrame, SubjectTabs, QuestionPanel,
//     SessionSummary with the per-subject breakdown built in). WAEC and JAMB
//     share one code path (sections).
// Premium only (lib/plans.js): choosing an exam or starting asks Free
// students to upgrade, whichever way they reached this page; the questions
// API refuses Free students too.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { usePlan } from '@/contexts/PlanContext'
import { saveSessionLocally, flushSyncQueue, readLocalStreak } from '@/lib/localSessionSync'
import { computeSessionXP } from '@/lib/xp'

import { msToSecs } from '@/components/session/SessionUtils'
import { ErrorScreen, EndDialog } from '@/components/session/SessionPrimitives'
import { SessionFrame, SessionTopBar, SessionClock, QuestionPanel, QuestionGridSheet, SessionBottomBar, SubjectTabs, sessionStyles as s } from '@/components/session/SessionFrame'
import { Calculator } from '@/components/session/Calculator'
import { QuestionCard } from '@/components/session/QuestionCard'
import { ReviewSession } from '@/components/session/ReviewSession'
import SessionSummary from '@/components/session/SessionSummary'
import { ExamChooser, MockSetup, MOCK_RULES } from '@/components/student/mock/MockSetupScreens'
import { useStudentUser } from '@/app/student/layout'
import { useExamSubjects } from '@/hooks/useExamSubjects'

const key = (sec, i) => `${sec}:${i}`

function resultFor(q, answer) {
  const isCorrect = !!answer?.isCorrect
  return {
    question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
    topic_name: q.topic_name || '', subject_name: q.subject_name || '',
    isCorrect, is_correct: isCorrect, selectedIdx: answer?.selectedIdx ?? null, time_taken_ms: 0,
  }
}

export default function MockPage() {
  const router   = useRouter()
  const { dark } = useTheme()
  const { totalPoints: currentXP, setTotalPoints } = usePoints()
  const profile  = useStudentUser()
  const plan     = usePlan()

  const [phase,    setPhase]    = useState('pick-exam')   // pick-exam | setup | session | results | review | error
  const [examType, setExamType] = useState(null)
  const examSubjects = useExamSubjects(profile, examType ?? 'WAEC')
  const [errMsg,   setErrMsg]   = useState('')

  const [sections, setSections] = useState([])            // [{ subject, questions, loaded }]
  const [section,  setSection]  = useState(0)
  const [qIndex,   setQIndex]   = useState(0)
  const [answers,  setAnswers]  = useState({})            // key(sec, i) → { selectedIdx, isCorrect }
  const [skipped,  setSkipped]  = useState(() => new Set())
  const [dialog,   setDialog]   = useState(false)
  const [gridOpen, setGridOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [saved,    setSaved]    = useState(null)          // { questions, results, subjects, xp, streak, durationSecs }

  const answersRef  = useRef({})
  const sectionsRef = useRef([])
  const requested   = useRef(new Set())
  const startedAt   = useRef(Date.now())
  const sessionId   = useRef(null)
  const cardRef     = useRef(null)
  const mainRef     = useRef(null)

  const isWAEC = examType === 'WAEC'
  const rules  = MOCK_RULES[examType ?? 'WAEC']

  const updateSections = useCallback(fn => {
    sectionsRef.current = fn(sectionsRef.current)
    setSections(sectionsRef.current)
  }, [])

  // ── Questions ──────────────────────────────────────────────────────────────
  const loadSection = useCallback(async (idx, exam) => {
    if (requested.current.has(idx)) return
    requested.current.add(idx)
    const subject = sectionsRef.current[idx]?.subject
    let questions = []
    try {
      const count = exam === 'WAEC' ? MOCK_RULES.WAEC.count : MOCK_RULES.JAMB.perSubject
      const r = await fetch(`/api/student/questions?${new URLSearchParams({ exam, subject_id: subject.id, count: String(count), mode: 'mock', ref: sessionId.current })}`)
      if (r.ok) questions = (await r.json()).questions ?? []
      else if (r.status === 403) {
        const body = await r.json().catch(() => ({}))
        plan.denied(body)
        setErrMsg(body.error || 'Mock exams are part of Premium.')
        setPhase('error')
        return
      }
    } catch { /* shown as an empty section below */ }
    if (exam === 'WAEC' && !questions.length) {
      setErrMsg(`No questions found for ${subject.name}. Check your connection and try again.`)
      setPhase('error')
      return
    }
    updateSections(prev => prev.map((sec, i) => (i === idx ? { ...sec, questions, loaded: true } : sec)))
  }, [updateSections, plan])

  function start(picked) {
    if (!plan.gate('mock')) return
    sectionsRef.current = picked.map(subject => ({ subject, questions: [], loaded: false }))
    setSections(sectionsRef.current)
    requested.current  = new Set()
    answersRef.current = {}
    setAnswers({})
    setSkipped(new Set())
    setSection(0)
    setQIndex(0)
    setSaved(null)
    sessionId.current = crypto.randomUUID()
    startedAt.current = Date.now()
    setPhase('session')
    loadSection(0, examType)
    for (let i = 1; i < picked.length; i++) setTimeout(() => loadSection(i, examType), i * 800)
  }

  // ── Answers ────────────────────────────────────────────────────────────────
  const setAnswer = useCallback((sec, i, answer) => {
    const k = key(sec, i)
    answersRef.current = { ...answersRef.current, [k]: answer }
    setAnswers(answersRef.current)
    setSkipped(prev => { if (!prev.has(k)) return prev; const n = new Set(prev); n.delete(k); return n })
  }, [])

  // Read the card too, so a tap followed at once by Next is never lost.
  function captureCurrent() {
    const live = cardRef.current?.getSelection()
    if (live?.selectedIdx != null) { setAnswer(section, qIndex, live); return live }
    return answersRef.current[key(section, qIndex)] ?? null
  }

  function leave() {
    if (!captureCurrent() && sections[section]?.questions[qIndex]) {
      setSkipped(prev => new Set(prev).add(key(section, qIndex)))
    }
    mainRef.current?.scrollTo?.(0, 0)
  }

  function goTo(sec, i) {
    if (sec === section && i === qIndex) return
    leave()
    setSection(sec)
    setQIndex(i)
    loadSection(sec, examType)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveSession = useCallback(() => {
    setDialog(false)
    const secs         = sectionsRef.current
    const map          = answersRef.current
    const questions    = secs.flatMap(sec => sec.questions)
    const results      = secs.flatMap((sec, si) => sec.questions.map((q, i) => resultFor(q, map[key(si, i)])))
    const durationSecs = msToSecs(Date.now() - startedAt.current)
    const payload = {
      session_id: sessionId.current, ref: sessionId.current, exam: examType, mode: 'mock',
      subject_name: examType === 'WAEC' ? secs[0]?.subject.name ?? 'WAEC' : 'JAMB Mock',
      results, duration_secs: durationSecs,
      questions_count: results.length, correct_count: results.filter(r => r.is_correct).length,
    }
    const xp = computeSessionXP('mock', results)
    saveSessionLocally(payload, xp)
    setTotalPoints((currentXP || 0) + xp)
    setSaved({
      questions, results, xp, streak: readLocalStreak(), durationSecs,
      subjects: secs.map((sec, si) => ({
        name: sec.subject.name,
        count: sec.questions.length,
        correct: sec.questions.filter((_, i) => map[key(si, i)]?.isCorrect).length,
      })),
    })
    setPhase('results')

    flushSyncQueue().then(synced => {
      if (!synced) return
      fetch('/api/student/profile')
        .then(r => (r.ok ? r.json() : null))
        .then(prof => {
          if (prof?.total_points) setTotalPoints(prof.total_points)
          if (prof?.streak_days != null) setSaved(prev => (prev ? { ...prev, streak: prof.streak_days } : prev))
        })
        .catch(() => {})
    }).catch(() => {})
  }, [examType, currentXP, setTotalPoints])

  function onTimeUp() { captureCurrent(); saveSession() }

  // ── Screens ────────────────────────────────────────────────────────────────
  if (phase === 'error')     return <ErrorScreen message={errMsg} onBack={() => router.push('/student/practice')} />
  if (phase === 'pick-exam') return <ExamChooser onPick={e => { if (!plan.gate('mock')) return; setExamType(e); setPhase('setup') }} onBack={() => router.push('/student/practice')} />
  if (phase === 'setup')     return <MockSetup exam={examType} subjects={examSubjects.subjects} loading={examSubjects.loading} hasAny={examSubjects.hasAny} dark={dark} onStart={start} onBack={() => setPhase('pick-exam')} />

  if (phase === 'results' || phase === 'review') {
    const finalAnswers = saved.results.map(r => ({ selectedIdx: r.selectedIdx, isCorrect: r.isCorrect }))
    const title = isWAEC ? saved.subjects[0]?.name ?? 'WAEC' : `${examType} Mock`
    return phase === 'review' ? (
      <ReviewSession
        questions={saved.questions} answers={finalAnswers} title={title}
        subjects={isWAEC ? undefined : saved.subjects}
        onDone={() => setPhase('results')}
      />
    ) : (
      <SessionSummary
        questions={saved.questions} answers={finalAnswers}
        config={{ mode: 'mock', subjects: [title] }}
        xpAwarded={saved.xp} streakDays={saved.streak} durationSecs={saved.durationSecs}
        subjectBreakdown={isWAEC ? undefined : saved.subjects.map(({ name, correct, count }) => ({ name, correct, total: count }))}
        onRetry={() => setPhase('pick-exam')}
        onReview={() => setPhase('review')}
        onHome={() => router.push('/student/practice')}
      />
    )
  }

  // ── The exam ───────────────────────────────────────────────────────────────
  const current   = sections[section]
  const qs        = current?.questions ?? []
  const q         = qs[qIndex]
  const total     = current?.loaded ? qs.length : isWAEC ? rules.count : rules.perSubject
  const countIn   = sec => Object.keys(answers).filter(k => k.startsWith(`${sec}:`)).length
  const answeredAll = Object.keys(answers).length
  const totalAll  = sections.reduce((n, sec) => n + (sec.loaded ? sec.questions.length : isWAEC ? rules.count : rules.perSubject), 0)
  const stateOf   = i => (answers[key(section, i)] ? 'answered' : skipped.has(key(section, i)) ? 'skipped' : undefined)

  const isLastInSection = qIndex >= qs.length - 1
  // The next subject with questions left, after this one first, then wrapping.
  const unfinished      = i => countIn(i) < (sections[i].loaded ? sections[i].questions.length : 1)
  const nextSection     = [...sections.keys()].map(n => (section + 1 + n) % sections.length).find(i => i !== section && unfinished(i)) ?? -1
  const lastStep        = isLastInSection && (isWAEC || nextSection === -1)

  function next() {
    if (!isLastInSection) return goTo(section, qIndex + 1)
    if (!lastStep) return goTo(nextSection, 0)
    leave()
    setDialog(true)
  }

  return (
    <SessionFrame
      mainRef={mainRef}
      top={
        <SessionTopBar
          backLabel="End" onBack={() => setDialog(true)}
          title={`${examType} Mock Exam`}
          subtitle={current?.subject.name}
          clock={<SessionClock limitSecs={rules.mins * 60} onTimeUp={onTimeUp} />}
          calcOpen={calcOpen} onCalc={() => setCalcOpen(o => !o)}
          current={qIndex} total={total} answered={countIn(section)}
          onOpenGrid={() => setGridOpen(true)}
        />
      }
      tabs={!isWAEC && (
        <SubjectTabs
          active={section}
          onSelect={i => goTo(i, 0)}
          subjects={sections.map((sec, i) => ({ name: sec.subject.name, note: `${countIn(i)}/${sec.loaded ? sec.questions.length : rules.perSubject}` }))}
        />
      )}
      panel={current?.loaded && <QuestionPanel total={qs.length} current={qIndex} stateOf={stateOf} onJump={i => goTo(section, i)} onViewAll={() => setGridOpen(true)} />}
      bottom={
        <SessionBottomBar
          onPrev={() => goTo(section, qIndex - 1)} prevDisabled={qIndex === 0}
          onNext={next}
          nextLabel={!isLastInSection ? 'Next' : lastStep ? 'Submit' : 'Next subject'}
        />
      }
      overlay={<>
        {gridOpen && <QuestionGridSheet total={qs.length} current={qIndex} stateOf={stateOf} onJump={i => goTo(section, i)} onClose={() => setGridOpen(false)} />}
        {dialog && <EndDialog answered={answeredAll} total={totalAll} mode="submit" onConfirm={saveSession} onCancel={() => setDialog(false)} />}
        {calcOpen && <Calculator onClose={() => setCalcOpen(false)} dark={dark} />}
      </>}
    >
      {!current?.loaded ? (
        <div className={s.pending}><span className={s.spinner} />Loading {current?.subject.name ?? ''} questions…</div>
      ) : q ? (
        <QuestionCard
          ref={cardRef}
          key={`${section}-${q.id}-${qIndex}`}
          question={q} qIndex={qIndex}
          sessionType="practice" hideHint
          alreadyAnswered={answers[key(section, qIndex)] ?? null}
          onAnswerChange={a => setAnswer(section, qIndex, a)}
        />
      ) : (
        <div className={s.pending}>No {current.subject.name} questions are available right now. Move on to the next subject.</div>
      )}
    </SessionFrame>
  )
}
