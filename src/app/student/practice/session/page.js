'use client'
// src/app/student/practice/session/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// A practice session: loads questions, tracks answers, saves the result
// locally (then syncs), and shows the summary and review.
//   Screens: SessionFrame (@/components/session/SessionFrame) → SessionSummary
//   → ReviewSession. All UI lives in @/components/session/.
//
// Modes (config.sessionType / config.mode, from the practice setup sheet)
//   practice  pick freely, answers revealed at the end
//   study     instant feedback, two tries, explanation beside the question
//             (desktop) or behind "See the explanation" (phones)
//   timed     Speed Round: a countdown per question
//   config.durationSecs  an overall countdown; without it the clock shows
//             time spent (practice) or nothing (study, Speed Round)
//
// Answers live in answersRef (read by timers and Save, never stale) and are
// mirrored into state for rendering. "Skipped" = left without an answer.
//
// v2: the saved session carries topic_name.
// v3: new session design (SessionFrame, QuestionPanel, ExplanationBlock,
//     SessionSummary). Try Again retries the same questions in place. Timers
//     read answers from a ref, so time-up saves the latest picks.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { saveSessionLocally, flushSyncQueue, readLocalStreak } from '@/lib/localSessionSync'
import { computeSessionXP } from '@/lib/xp'

import { LETTERS, msToSecs } from '@/components/session/SessionUtils'
import { LoadingScreen, ErrorScreen, EndDialog } from '@/components/session/SessionPrimitives'
import { SessionFrame, SessionTopBar, SessionClock, QuestionPanel, QuestionGridSheet, SessionBottomBar, sessionStyles as s } from '@/components/session/SessionFrame'
import { ExplanationBlock, ExplanationSheet, ExplanationTrigger } from '@/components/session/ExplanationBlock'
import { Calculator } from '@/components/session/Calculator'
import { QuestionCard } from '@/components/session/QuestionCard'
import { ReviewSession } from '@/components/session/ReviewSession'
import SessionSummary from '@/components/session/SessionSummary'
import { Bulb } from '@/components/session/icons'

// The first few questions load alone (one fast query) so the session opens
// quickly; the rest load in the background while the student answers them.
const FIRST_BATCH = 3
const MODE_LABEL = { study: 'Study', practice: 'Practice', timed: 'Speed Round', quick5: 'Quick 5', mock: 'Mock Exam' }

function readConfig() {
  try { return JSON.parse(sessionStorage.getItem('practice_config') || '{}') } catch { return {} }
}

async function fetchQuestions(params) {
  const r = await fetch(`/api/student/questions?${new URLSearchParams(params)}`)
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.detail ?? d.error ?? `Server error ${r.status}`)
  return d.questions ?? []
}

function resultFor(q, answer) {
  const isCorrect = !!answer?.isCorrect
  return {
    question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
    topic_name: q.topic_name || '', subject_name: q.subject_name || '',
    isCorrect, is_correct: isCorrect,
    selectedIdx: answer?.selectedIdx ?? null, time_taken_ms: answer?.timeTakenMs ?? 0,
  }
}

export default function PracticeSessionPage() {
  const router   = useRouter()
  const { dark } = useTheme()
  const { totalPoints: currentXP, setTotalPoints } = usePoints()

  const [phase,     setPhase]     = useState('loading')   // loading | session | saving | results | review | error
  const [errMsg,    setErrMsg]    = useState('')
  const [config,    setConfig]    = useState(null)
  const [questions, setQuestions] = useState([])
  const [qIndex,    setQIndex]    = useState(0)
  const [answers,   setAnswers]   = useState({})           // index → { selectedIdx, isCorrect }
  const [skipped,   setSkipped]   = useState(() => new Set())
  const [dialog,    setDialog]    = useState(null)         // null | 'end' | 'submit'
  const [gridOpen,  setGridOpen]  = useState(false)
  const [expOpen,   setExpOpen]   = useState(false)
  const [calcOpen,  setCalcOpen]  = useState(false)
  const [attempt,   setAttempt]   = useState(0)            // remounts the clock on Try Again
  const [saved,     setSaved]     = useState(null)         // { questions, results, xp, streak, durationSecs }

  const answersRef   = useRef({})
  const questionsRef = useRef([])
  const startedAt    = useRef(Date.now())
  const sessionId    = useRef(null)
  const cardRef      = useRef(null)
  const mainRef      = useRef(null)

  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { mainRef.current?.scrollTo?.(0, 0); setExpOpen(false) }, [qIndex])

  const setAnswer = useCallback((idx, answer) => {
    answersRef.current = { ...answersRef.current, [idx]: answer }
    setAnswers(answersRef.current)
    setSkipped(prev => { if (!prev.has(idx)) return prev; const n = new Set(prev); n.delete(idx); return n })
  }, [])

  const beginAttempt = useCallback(cfg => {
    sessionId.current  = crypto.randomUUID()
    startedAt.current  = Date.now()
    answersRef.current = {}
    setAnswers({})
    setSkipped(new Set())
    setQIndex(0)
    setSaved(null)
    setAttempt(a => a + 1)
    try { localStorage.setItem('ep_pending_session', JSON.stringify({ session_id: sessionId.current, config: cfg, savedAt: Date.now() })) } catch {}
    setPhase('session')
  }, [])

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cfg = readConfig()
    if (!cfg.subjects?.length && !cfg.subject_id) {
      setErrMsg('No practice configuration found. Go back and set up a session.')
      setPhase('error')
      return
    }
    setConfig(cfg)

    const base = { exam: cfg.examType || 'WAEC', subjects: (cfg.subjects || []).join(','), mode: cfg.mode || 'practice' }
    if (cfg.subject_id) base.subject_id = cfg.subject_id
    if (cfg.topic_id)   base.topic_id   = cfg.topic_id
    let cancelled = false

    fetchQuestions({ ...base, count: String(FIRST_BATCH) })
      .then(first => {
        if (cancelled) return
        if (!first.length) {
          setErrMsg(`No questions found for ${cfg.subjects?.join(', ') || 'this subject'}.`)
          setPhase('error')
          return
        }
        setQuestions(first)
        beginAttempt(cfg)

        const remaining = (cfg.count || 20) - first.length
        if (remaining <= 0) return
        fetchQuestions({ ...base, count: String(remaining), exclude: first.map(q => q.id).join(',') })
          .then(rest => { if (!cancelled && rest.length) setQuestions(prev => [...prev, ...rest]) })
          .catch(() => {})   // the session carries on with what it has
      })
      .catch(err => {
        if (cancelled) return
        setErrMsg(err?.message || 'Failed to load questions. Check your connection and try again.')
        setPhase('error')
      })
    return () => { cancelled = true }
  }, [beginAttempt])

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveSession = useCallback(() => {
    setDialog(null)
    setPhase('saving')
    const qs           = questionsRef.current
    const map          = answersRef.current
    const durationSecs = msToSecs(Date.now() - startedAt.current)
    const results      = qs.map((q, i) => resultFor(q, map[i]))
    const payload = {
      session_id:      sessionId.current,
      exam:            config?.examType || 'WAEC',
      mode:            config?.mode     || 'practice',
      subject_name:    config?.subjects?.[0] ?? 'Mixed',
      topic_name:      config?.topicName ?? null,
      results,
      duration_secs:   durationSecs,
      questions_count: results.length,
      correct_count:   results.filter(r => r.is_correct).length,
    }

    // Local first: instant and offline-safe, same XP formula as the server.
    const xp = computeSessionXP(payload.mode, results)
    saveSessionLocally(payload, xp)
    try { localStorage.removeItem('ep_pending_session') } catch {}
    setTotalPoints((currentXP || 0) + xp)
    setSaved({ questions: qs, results, xp, streak: readLocalStreak(), durationSecs })
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
  }, [config, currentXP, setTotalPoints])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const sessionType = config?.sessionType ?? 'practice'
  const isStudy     = sessionType === 'study'
  const isSpeed     = config?.mode === 'timed'
  const total       = questions.length
  const isLast      = qIndex >= total - 1

  // The pick on screen. Practice records every pick, but read the card too so
  // a tap followed at once by Next is never lost. Study counts only revealed
  // answers (a wrong first try isn't an answer yet).
  function captureCurrent() {
    if (isStudy) return answersRef.current[qIndex] ?? null
    const live = cardRef.current?.getSelection()
    if (live?.selectedIdx != null) { setAnswer(qIndex, live); return live }
    return answersRef.current[qIndex] ?? null
  }

  function goTo(i) {
    const target = Math.min(Math.max(i, 0), total - 1)
    if (target === qIndex) return
    if (!captureCurrent()) setSkipped(prev => new Set(prev).add(qIndex))
    setQIndex(target)
  }

  function next() {
    if (!isLast) return goTo(qIndex + 1)
    if (!captureCurrent()) setSkipped(prev => new Set(prev).add(qIndex))
    setDialog('submit')
  }

  // Speed Round: time's up on this question — keep any pick, move on.
  function onSpeedTimeUp() {
    if (isLast) { captureCurrent(); saveSession() } else goTo(qIndex + 1)
  }

  function onTimeUp() { captureCurrent(); saveSession() }

  // ── Screens ────────────────────────────────────────────────────────────────
  if (phase === 'loading') return <LoadingScreen />
  if (phase === 'saving')  return <LoadingScreen message="Saving your results…" />
  if (phase === 'error')   return <ErrorScreen message={errMsg} onBack={() => router.push('/student/practice')} />

  if (phase === 'results' || phase === 'review') {
    const finalAnswers = saved.results.map(r => ({ selectedIdx: r.selectedIdx, isCorrect: r.isCorrect }))
    const subject = config?.subjects?.[0] || 'Practice'
    return phase === 'review' ? (
      <ReviewSession questions={saved.questions} answers={finalAnswers} title={subject} onDone={() => setPhase('results')} />
    ) : (
      <SessionSummary
        questions={saved.questions} answers={finalAnswers} config={config}
        xpAwarded={saved.xp} streakDays={saved.streak} durationSecs={saved.durationSecs}
        onRetry={() => beginAttempt(config)} retryNote="Retry these questions"
        onReview={() => setPhase('review')}
        onHome={() => router.push('/student/practice')}
      />
    )
  }

  const q          = questions[qIndex]
  const answer     = answers[qIndex] ?? null
  const answered   = Object.keys(answers).length
  const selectedKey = answer?.selectedIdx != null ? LETTERS[answer.selectedIdx] : null
  const stateOf = i => {
    const a = answers[i]
    if (a) return isStudy ? (a.isCorrect ? 'correct' : 'wrong') : 'answered'
    return skipped.has(i) ? 'skipped' : undefined
  }

  const clock = config?.durationSecs && !isSpeed
    ? <SessionClock key={attempt} limitSecs={config.durationSecs} onTimeUp={onTimeUp} />
    : !isStudy && !isSpeed ? <SessionClock key={attempt} /> : null

  const aside = isStudy ? (
    answer && q?.explanation
      ? <ExplanationBlock question={q} isCorrect={answer.isCorrect} selectedKey={selectedKey} />
      : (
        <div className={s.asideEmpty}>
          <span aria-hidden="true"><Bulb size={26} /></span>
          <strong>{answer ? 'No explanation yet' : 'Explanation'}</strong>
          {answer ? 'This question doesn’t have a worked explanation yet.' : 'Answer the question to see how it’s solved.'}
        </div>
      )
  ) : null

  return (
    <SessionFrame
      mainRef={mainRef}
      top={
        <SessionTopBar
          backLabel="End" onBack={() => setDialog('end')}
          title={config?.subjects?.[0] || 'Practice'}
          subtitle={config?.topicName || MODE_LABEL[config?.mode] || 'Practice'}
          clock={clock}
          calcOpen={calcOpen} onCalc={() => setCalcOpen(o => !o)}
          current={qIndex} total={total} answered={answered}
          onOpenGrid={() => setGridOpen(true)}
        />
      }
      panel={<QuestionPanel total={total} current={qIndex} stateOf={stateOf} graded={isStudy} onJump={goTo} onViewAll={() => setGridOpen(true)} />}
      aside={aside}
      bottom={
        <SessionBottomBar
          onPrev={() => goTo(qIndex - 1)} prevDisabled={qIndex === 0}
          onNext={next} nextLabel={isLast ? 'Submit' : 'Next'}
        />
      }
      overlay={<>
        {gridOpen && <QuestionGridSheet total={total} current={qIndex} stateOf={stateOf} graded={isStudy} onJump={goTo} onClose={() => setGridOpen(false)} />}
        {expOpen && q && (
          <ExplanationSheet
            question={q} isCorrect={!!answer?.isCorrect} selectedKey={selectedKey}
            position={{ current: qIndex, total }} onClose={() => setExpOpen(false)}
          />
        )}
        {dialog && <EndDialog answered={answered} total={total} mode={dialog} onConfirm={saveSession} onCancel={() => setDialog(null)} />}
        {calcOpen && <Calculator onClose={() => setCalcOpen(false)} dark={dark} />}
      </>}
    >
      {q && (
        <>
          <QuestionCard
            ref={cardRef}
            key={`${attempt}-${q.id}-${qIndex}`}
            question={q} qIndex={qIndex}
            sessionType={sessionType}
            speedSecs={isSpeed ? (config?.speedSecs ?? 30) : null}
            onSpeedTimeUp={onSpeedTimeUp}
            alreadyAnswered={answer}
            onAnswerChange={a => setAnswer(qIndex, a)}
          />
          {isStudy && answer && <ExplanationTrigger question={q} isCorrect={answer.isCorrect} onOpen={() => setExpOpen(true)} />}
        </>
      )}
    </SessionFrame>
  )
}
