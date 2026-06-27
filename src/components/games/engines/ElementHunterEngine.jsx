'use client'
// src/components/games/engines/ElementHunterEngine.jsx
// ─────────────────────────────────────────────────────────────────────────────
// v2 — PROGRESSION + REVIEW UPGRADE
//
// WHAT CHANGED FROM v1:
//   - Missions now come from buildProgressionQueue() instead of a flat
//     shuffle of everything — the round plays recall -> pattern -> reasoning
//     in that order, so difficulty visibly ramps as the student progresses.
//   - Missions with `noTimer: true` (the whole recall tier) render with NO
//     countdown at all — no bar, no pressure — addressing "feels too fast"
//     by removing time pressure entirely where the skill being tested is
//     pure lookup, not pattern/reasoning speed.
//   - pattern/reasoning timers increased (9s / 13s, up from 8s / 11s).
//   - Every mission attempt is now recorded in full: question text, the
//     element the student clicked, whether it was correct, the correct
//     answer's symbol, and the explanation — this feeds the new review
//     screen shown after results.
//   - On completion, POSTs to /api/elementhunter/session with
//     { correct, attempted, avgSeconds } to persist the student's
//     all-time best average speed server-side. avgSeconds is null if
//     the student had zero correct answers (no average to compute) —
//     this is sent as null, never coerced to 0.
//   - GETs /api/elementhunter/session on mount to show the student's
//     existing best BEFORE this session's result is known, so the
//     results screen can show "your best: 2.1s" immediately and then
//     flag "new personal best!" if this session's POST confirms it beat it.
//
// MASTERY BOUNDARY (unchanged from v1, restated because it's easy to
// accidentally violate when adding new fields): avgSeconds and per-mission
// timing NEVER appear in any payload sent anywhere except
// /api/elementhunter/session, which itself only persists a speed stat —
// it does not write to student_topic_mastery. Only correct/attempted
// (accuracy) data crosses into onComplete()'s result for the parent page.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { buildProgressionQueue } from '@/lib/games/missions/elementHunter'

const FAMILY_COLOR = {
  alkali:    { bg: '#FAEEDA', border: '#EF9F27', text: '#633806' },
  alkaline:  { bg: '#FAECE7', border: '#F0997B', text: '#712B13' },
  metalloid: { bg: '#F1EFE8', border: '#B4B2A9', text: '#444441' },
  metal:     { bg: '#E6F1FB', border: '#85B7EB', text: '#0C447C' },
  nonmetal:  { bg: '#E1F5EE', border: '#5DCAA5', text: '#085041' },
  halogen:   { bg: '#FBEAF0', border: '#ED93B1', text: '#72243E' },
  noble:     { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489' },
}

const TIER_LABEL = { recall: 'warm-up', pattern: 'pattern', reasoning: 'reasoning' }
const MISSIONS_PER_TIER = 4

export default function ElementHunterEngine({ game, onComplete }) {
  const { table, timers } = game
  const [missionQueue] = useState(() => buildProgressionQueue(MISSIONS_PER_TIER))
  const [missionIdx,    setMissionIdx]    = useState(0)
  const [score,         setScore]         = useState(0)
  const [combo,         setCombo]         = useState(1)
  const [timeLeft,      setTimeLeft]      = useState(0)
  const [maxTime,       setMaxTime]       = useState(0)
  const [locked,        setLocked]        = useState(false)
  const [feedback,      setFeedback]      = useState({ text: 'tap the matching element', color: 'secondary' })
  const [phase,         setPhase]         = useState('playing') // 'playing' | 'results' | 'review'
  const [flashCell,     setFlashCell]     = useState(null)

  // Full per-mission attempt log — this is what powers the review screen.
  const [attemptLog, setAttemptLog] = useState([])

  // Session accuracy (mastery-eligible) — kept separate from speed stats.
  const [stats, setStats] = useState({ correct: 0, attempted: 0, totalCorrectTimeMs: 0, bestCombo: 1 })

  // Persistent best speed, fetched on mount, updated after this session's POST.
  const [bestSpeed, setBestSpeed] = useState({ loading: true, bestAvgSeconds: null, isNewBest: false })

  const missionStartRef = useRef(Date.now())
  const tickRef = useRef(null)

  const currentMission = missionQueue[missionIdx]
  const isLastMission = missionIdx + 1 >= missionQueue.length
  const currentTierIdx = currentMission ? ['recall', 'pattern', 'reasoning'].indexOf(currentMission.tier) : 0

  // ── Fetch existing best speed on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    fetch('/api/elementhunter/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data) return
        setBestSpeed(prev => ({ ...prev, loading: false, bestAvgSeconds: data.bestAvgSeconds ?? null }))
      })
      .catch(() => { if (!cancelled) setBestSpeed(prev => ({ ...prev, loading: false })) })
    return () => { cancelled = true }
  }, [])

  // ── Start/reset timer (or skip it entirely) whenever the mission changes ───
  useEffect(() => {
    if (!currentMission || phase !== 'playing') return
    missionStartRef.current = Date.now()
    setLocked(false)

    if (currentMission.noTimer) {
      setMaxTime(0)
      setTimeLeft(0)
      return
    }
    const baseTime = timers[currentMission.tier] ?? 9
    setMaxTime(baseTime)
    setTimeLeft(baseTime)
  }, [missionIdx, currentMission, phase, timers])

  // ── Countdown — only runs for timed missions ────────────────────────────────
  useEffect(() => {
    if (locked || phase !== 'playing' || !currentMission || currentMission.noTimer) return
    tickRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 0.1
        if (next <= 0) {
          clearInterval(tickRef.current)
          handleTimeout()
          return 0
        }
        return next
      })
    }, 100)
    return () => clearInterval(tickRef.current)
  }, [missionIdx, locked, phase])

  const advance = useCallback(() => {
    if (isLastMission) {
      setPhase('results')
    } else {
      setMissionIdx(i => i + 1)
    }
  }, [isLastMission])

  const handleTimeout = useCallback(() => {
    setLocked(true)
    setCombo(1)
    setStats(prev => ({ ...prev, attempted: prev.attempted + 1 }))
    setAttemptLog(prev => [...prev, {
      missionText: currentMission.text,
      tier: currentMission.tier,
      isCorrect: false,
      studentPick: null, // timed out, never clicked
      correctSymbol: null,
      explanation: currentMission.explanation,
    }])
    setFeedback({ text: 'too slow — combo reset', color: 'secondary' })
    setTimeout(advance, 500)
  }, [advance, currentMission])

  const handleTileClick = useCallback((element) => {
    if (locked || !currentMission) return
    const isCorrect = currentMission.check(element)
    const elapsedMs = Date.now() - missionStartRef.current

    setLocked(true)
    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      attempted: prev.attempted + 1,
      totalCorrectTimeMs: prev.totalCorrectTimeMs + (isCorrect ? elapsedMs : 0),
      bestCombo: Math.max(prev.bestCombo, isCorrect ? combo + 1 : prev.bestCombo),
    }))

    // Find the/a correct symbol for the review screen, even when the
    // student got it wrong — table.find with the mission's own check
    // function guarantees this matches the same logic used to grade them.
    const correctMatch = table.find(currentMission.check)

    setAttemptLog(prev => [...prev, {
      missionText: currentMission.text,
      tier: currentMission.tier,
      isCorrect,
      studentPick: element.symbol,
      correctSymbol: correctMatch?.symbol ?? null,
      explanation: currentMission.explanation,
    }])

    if (isCorrect) {
      const speedBonus = (!currentMission.noTimer && maxTime > 0) ? Math.round((timeLeft / maxTime) * 15) : 8
      const gained = Math.round((10 + speedBonus) * combo)
      setScore(s => s + gained)
      setCombo(c => Math.min(c + 1, 8))
      setFlashCell({ symbol: element.symbol, result: 'correct' })
      setFeedback({ text: `correct! +${gained} pts`, color: 'success' })
    } else {
      setCombo(1)
      setFlashCell({ symbol: element.symbol, result: 'wrong' })
      setFeedback({ text: 'not that one — combo reset', color: 'danger' })
    }

    setTimeout(() => { setFlashCell(null); advance() }, 400)
  }, [locked, currentMission, combo, maxTime, timeLeft, advance, table])

  // ── On reaching results, persist the session's speed stat ──────────────────
  useEffect(() => {
    if (phase !== 'results') return
    const avgSeconds = stats.correct > 0 ? (stats.totalCorrectTimeMs / stats.correct / 1000) : null

    fetch('/api/elementhunter/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correct: stats.correct, attempted: stats.attempted, avgSeconds }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return
        setBestSpeed({ loading: false, bestAvgSeconds: data.bestAvgSeconds, isNewBest: data.isNewBest })
      })
      .catch(() => { /* non-blocking — results screen still shows session stats either way */ })
  }, [phase, stats])

  // ── RESULTS SCREEN ───────────────────────────────────────────────────────────
  if (phase === 'results') {
    const accuracyPct = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0
    const avgSeconds = stats.correct > 0 ? (stats.totalCorrectTimeMs / stats.correct / 1000) : null

    return (
      <div className="space-y-5 text-center py-6">
        <p className="text-lg font-black text-primary">Hunt complete!</p>

        <div className="flex items-center justify-center gap-3">
          <div className="rounded-2xl px-5 py-4 bg-subtle">
            <p className="text-2xl font-black text-primary">{score}</p>
            <p className="text-xs font-bold text-secondary mt-0.5">points</p>
          </div>
          <div className="rounded-2xl px-5 py-4 bg-subtle">
            <p className="text-2xl font-black text-primary">{accuracyPct}%</p>
            <p className="text-xs font-bold text-secondary mt-0.5">accuracy</p>
          </div>
          <div className="rounded-2xl px-5 py-4 bg-subtle">
            <p className="text-2xl font-black text-primary">x{stats.bestCombo}</p>
            <p className="text-xs font-bold text-secondary mt-0.5">best combo</p>
          </div>
        </div>

        {avgSeconds !== null && (
          <div className="space-y-1">
            <p className="text-xs text-tertiary">avg {avgSeconds.toFixed(1)}s per correct answer this session</p>
            {bestSpeed.isNewBest && (
              <p className="text-xs font-black text-green-600">new personal best speed!</p>
            )}
            {!bestSpeed.isNewBest && bestSpeed.bestAvgSeconds != null && (
              <p className="text-xs text-tertiary">your best ever: {bestSpeed.bestAvgSeconds.toFixed(1)}s</p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setPhase('review')}
            className="px-6 py-3 text-sm font-black rounded-2xl bg-subtle text-primary active:scale-[0.97] transition-all"
          >
            Review answers
          </button>
          <button
            onClick={() => onComplete?.({ correct: stats.correct, total: stats.attempted, score: accuracyPct })}
            className="px-6 py-3 text-sm font-black rounded-2xl text-white active:scale-[0.97] transition-all bg-indigo-600"
          >
            Done →
          </button>
        </div>
      </div>
    )
  }

  // ── REVIEW SCREEN ─────────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div className="space-y-4 py-4">
        <p className="text-base font-black text-primary text-center">Review</p>
        <div className="space-y-3">
          {attemptLog.map((a, i) => (
            <div key={i} className="rounded-2xl p-4 bg-subtle">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-black text-primary leading-snug flex-1">{a.missionText}</p>
                <span className={`text-xs font-black flex-shrink-0 ${a.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {a.isCorrect ? 'correct' : (a.studentPick ? 'wrong' : 'timed out')}
                </span>
              </div>
              {!a.isCorrect && (
                <p className="text-xs text-secondary mb-1">
                  {a.studentPick ? `you picked ${a.studentPick} — ` : ''}
                  correct answer: {a.correctSymbol}
                </p>
              )}
              <p className="text-xs text-tertiary leading-relaxed">{a.explanation}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const accuracyPct = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0
            onComplete?.({ correct: stats.correct, total: stats.attempted, score: accuracyPct })
          }}
          className="w-full px-6 py-3.5 text-sm font-black rounded-2xl text-white active:scale-[0.97] transition-all bg-indigo-600"
        >
          Done →
        </button>
      </div>
    )
  }

  // ── PLAYING SCREEN ───────────────────────────────────────────────────────────
  const timerPct = (currentMission?.noTimer || maxTime <= 0) ? null : Math.max(0, (timeLeft / maxTime) * 100)
  const timerColor = timerPct === null ? null
    : timerPct > 50 ? 'var(--color-text-success, #3b6d11)'
    : timerPct > 20 ? 'var(--color-text-warning, #854f0b)'
    : 'var(--color-text-danger, #a32d2d)'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-1.5">
        {['recall', 'pattern', 'reasoning'].map((tier, i) => (
          <span
            key={tier}
            className="text-[10px] font-black px-2.5 py-1 rounded-full"
            style={{
              background: i === currentTierIdx ? 'var(--color-background-info, #e6f1fb)' : i < currentTierIdx ? 'var(--color-background-success, #eaf3de)' : 'transparent',
              color: i === currentTierIdx ? 'var(--color-text-info, #0c447c)' : i < currentTierIdx ? 'var(--color-text-success, #27500a)' : 'var(--color-text-tertiary)',
            }}
          >
            {TIER_LABEL[tier]}
          </span>
        ))}
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex-1 rounded-2xl px-4 py-3 bg-subtle">
          <p className="text-[10px] font-black uppercase tracking-wide text-tertiary mb-0.5">mission</p>
          <p className="text-sm font-black text-primary leading-snug">{currentMission?.text}</p>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-subtle text-center min-w-[70px] flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-wide text-tertiary">score</p>
          <p className="text-lg font-black text-primary">{score}</p>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-subtle text-center min-w-[70px] flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-wide text-tertiary">combo</p>
          <p className="text-lg font-black text-primary">x{combo}</p>
        </div>
      </div>

      {timerPct !== null ? (
        <div className="h-1.5 rounded-full overflow-hidden bg-subtle">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${timerPct}%`, background: timerColor, transitionDuration: '100ms' }}
          />
        </div>
      ) : (
        <p className="text-center text-[11px] text-tertiary">no timer — take your time on this one</p>
      )}

      <div className="grid grid-cols-9 gap-1.5">
        {table.map(el => {
          const c = FAMILY_COLOR[el.family]
          const isFlashed = flashCell?.symbol === el.symbol
          const flashBorder = isFlashed
            ? (flashCell.result === 'correct' ? '2px solid #639922' : '2px solid #e24b4a')
            : `1.5px solid ${c.border}`
          return (
            <button
              key={el.symbol}
              onClick={() => handleTileClick(el)}
              disabled={locked}
              className="aspect-square rounded-lg flex flex-col items-center justify-center relative transition-transform active:scale-90"
              style={{
                background: c.bg,
                border: flashBorder,
                transform: isFlashed ? (flashCell.result === 'correct' ? 'scale(1.1)' : 'scale(0.92)') : 'scale(1)',
              }}
            >
              <span className="text-[9px] absolute top-1 left-1" style={{ color: c.text, opacity: 0.65 }}>{el.number}</span>
              <span className="text-sm font-black" style={{ color: c.text }}>{el.symbol}</span>
            </button>
          )
        })}
      </div>

      <p className={`text-center text-xs min-h-[18px] ${feedback.color === 'success' ? 'text-green-600' : feedback.color === 'danger' ? 'text-red-600' : 'text-secondary'}`}>
        {feedback.text}
      </p>
    </div>
  )
}