'use client'
// src/components/games/engines/DungeonEngine.jsx
// (moved + renamed from src/components/mathKingdom/RoomRunner.jsx as part of
//  the games/ folder restructure. Update the dispatcher import from
//  '@/components/mathKingdom/RoomRunner' to
//  '@/components/games/engines/DungeonEngine'. Internal component name kept
//  as RoomRunner export default's logic — only the file location and name
//  changed, props/behavior are identical to the last working version.)
// ─────────────────────────────────────────────────────────────────────────────
// THE REUSABLE ENGINE — powers every 'dungeon' mechanic game in the registry
// (Equation Escape today; Fraction Kitchen, Formula Lab, Word Problem
// Detective, Graph Detective as they ship content).
//
// GAME-FEEL UPGRADE (visual layer, contract unchanged from the original):
//   - Same props: gameId, rooms, theme, RoomRenderer, isDark, onExit
//   - Same phase machine: 'playing' | 'room_result' | 'dungeon_complete'
//   - Same API calls: /api/mathkingdom/attempt, /api/points/award
//   - Same soft-hearts philosophy (canProceed stays true always)
//   - Added a HUD strip above the question card: streak flame + session
//     XP pill, sitting above the existing room-progress/hearts row. Both
//     are purely client-side session counters — no new API calls.
//   - Icons stay emoji throughout (❤️ 🔥 ⭐ 💡), matching the existing
//     convention in this file, WorldHeader.jsx, and GameCard.jsx. No icon
//     font is loaded in this app — confirmed against src/app/layout.js.
//   - Exit moved to a small icon button top-left (was a full-width text
//     link at the bottom) — frees the bottom for the primary CTA and
//     reads like a game screen rather than a form.
//   - room_result and dungeon_complete screens gained an optional mastery
//     delta bar (see MASTERY DATA CONTRACT below). Purely additive — if
//     the data isn't there, the bar doesn't render and nothing else changes.
//
// MASTERY DATA CONTRACT (read before wiring up the mastery bar):
//   This component does NOT compute mastery — it only displays it.
//   For the bar to show, /api/mathkingdom/attempt's response needs to
//   include: { masteryBefore: number, masteryAfter: number }  // 0-100
//   If that route doesn't return these fields yet, the bar simply doesn't
//   render — safe no-op either way.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const STARTING_HEARTS = 3

// ── Count-up score ring (unchanged) ──────────────────────────────────────────
function ScoreRing({ pct, isDark, color }) {
  const [displayPct, setDisplayPct] = useState(0)
  useEffect(() => {
    const duration = 700
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setDisplayPct(Math.round(t * pct))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pct])

  const r = 44, circ = 2 * Math.PI * r, fill = (displayPct / 100) * circ
  const track = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
      <circle cx="54" cy="54" r={r} fill="none" stroke={track} strokeWidth="9"/>
      <circle cx="54" cy="54" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 54 54)"/>
      <text x="54" y="50" textAnchor="middle" style={{ fontSize: 24, fontWeight: 900, fill: color }}>{displayPct}%</text>
      <text x="54" y="67" textAnchor="middle" style={{ fontSize: 11, fill: isDark ? '#6b7280' : '#9ca3af' }}>accuracy</text>
    </svg>
  )
}

// ── Hearts display (unchanged — emoji) ────────────────────────────────────────
function HeartsDisplay({ hearts, max = STARTING_HEARTS }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${hearts} of ${max} hearts remaining`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className="text-base leading-none" style={{ opacity: i < hearts ? 1 : 0.25 }}>
          ❤️
        </span>
      ))}
    </div>
  )
}

// ── Room progress bar (unchanged) ─────────────────────────────────────────────
function RoomProgress({ current, total, solidColor }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%`, background: solidColor }}
        />
      </div>
      <span className="text-xs font-black text-secondary whitespace-nowrap tabular-nums">
        {current}/{total}
      </span>
    </div>
  )
}

// ── Streak + XP HUD pill row — emoji, same style as WorldHeader's 🔥 badge ───
function GameStatsBar({ streak, points, softBg, softText }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-base leading-none" style={{ opacity: streak > 0 ? 1 : 0.35 }}>🔥</span>
        <span className="text-sm font-black text-primary tabular-nums">{streak}</span>
        <span className="text-xs text-tertiary">streak</span>
      </div>

      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-1"
        style={{ background: softBg }}
      >
        <span className="text-xs leading-none">⭐</span>
        <span className="text-xs font-black tabular-nums" style={{ color: softText }}>{points} XP</span>
      </div>
    </div>
  )
}

// ── Mastery delta bar — only renders if before/after data is present ─────────
function MasteryDeltaBar({ before, after, label, softBg, softText, isDark, border }) {
  if (before == null || after == null) return null
  const delta = Math.round(after - before)
  const deltaLabel = delta > 0 ? `+${delta}%` : `${delta}%`

  return (
    <div
      className="text-left rounded-2xl p-4 mx-auto max-w-sm"
      style={{ background: softBg, border: `1.5px solid ${border}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: softText, opacity: 0.75 }}>
          mastery{label ? ` · ${label}` : ''}
        </span>
        {delta !== 0 && (
          <span
            className="text-xs font-black tabular-nums"
            style={{ color: delta > 0 ? '#27500a' : softText }}
          >
            {Math.round(after)}% ({deltaLabel})
          </span>
        )}
      </div>
      <div className="h-2 rounded-full overflow-hidden relative" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}>
        <div
          className="h-full rounded-full absolute left-0 transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, after))}%`, background: '#3b6d11' }}
        />
      </div>
    </div>
  )
}

export default function DungeonEngine({
  gameId,
  rooms,           // array of room defs from math_kingdom_room_defs
  theme,           // accent object passed in by the dispatcher (game.accent)
  RoomRenderer,    // game-specific question UI component
  isDark,
  onExit,          // called when student exits mid-dungeon
}) {
  const [roomIdx,      setRoomIdx]      = useState(0)
  const [hearts,       setHearts]       = useState(STARTING_HEARTS)
  const [hintsUsedHere, setHintsUsedHere] = useState(0)
  const [phase,        setPhase]        = useState('playing') // 'playing' | 'room_result' | 'dungeon_complete'
  const [lastResult,   setLastResult]   = useState(null)       // { isCorrect, struggledOut, masteryBefore?, masteryAfter? }
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    total: 0,
    xpEarned: 0,
    startedAt: Date.now(),
    streak: 0,
    bestStreak: 0,
    masteryBefore: null,
    masteryAfter: null,
  })
  const [showHint,     setShowHint]     = useState(false)
  const [showSteps,    setShowSteps]    = useState(false)
  const roomStartRef = useRef(Date.now())

  const totalRooms = rooms.length
  const room = rooms[roomIdx]

  useEffect(() => {
    roomStartRef.current = Date.now()
    setHearts(STARTING_HEARTS)
    setHintsUsedHere(0)
    setShowHint(false)
    setShowSteps(false)
  }, [roomIdx])

  const solid = isDark ? theme.darkSolid : theme.solid
  const softBg = isDark ? theme.darkBg : theme.bg
  const softText = isDark ? theme.darkText : theme.text
  const border = isDark ? theme.darkBorder : theme.border
  const cardBg = isDark ? '#111827' : '#ffffff'
  const cardBorder = isDark ? '#1f2937' : '#ede9e3'

  // ── Submit an answer for the current room ───────────────────────────────────
  const handleAnswer = useCallback(async (isCorrect) => {
    const timeSeconds = Math.round((Date.now() - roomStartRef.current) / 1000)
    let struggledOut = false

    if (!isCorrect) {
      const newHearts = hearts - 1
      setHearts(newHearts)
      if (newHearts <= 0) {
        struggledOut = true
        setShowSteps(true)
      } else {
        return
      }
    }

    const finalIsCorrect = isCorrect && !struggledOut

    let attemptData = null
    try {
      const res = await fetch('/api/mathkingdom/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          roomDefId: room.id,
          roomNumber: room.room_number,
          isCorrect: finalIsCorrect,
          heartsLost: STARTING_HEARTS - hearts + (isCorrect ? 0 : 1),
          hintsUsed: hintsUsedHere,
          timeSeconds,
          topicId: room.topic_id,
          struggledOut,
        }),
      })
      attemptData = await res.json().catch(() => null)
    } catch { /* non-blocking */ }

    setSessionStats(prev => {
      const newStreak = finalIsCorrect ? prev.streak + 1 : 0
      return {
        ...prev,
        correct: prev.correct + (finalIsCorrect ? 1 : 0),
        total: prev.total + 1,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        masteryBefore: prev.masteryBefore ?? attemptData?.masteryBefore ?? null,
        masteryAfter: attemptData?.masteryAfter ?? prev.masteryAfter,
      }
    })

    setLastResult({
      isCorrect: finalIsCorrect,
      struggledOut,
      timeSeconds,
      masteryBefore: attemptData?.masteryBefore ?? null,
      masteryAfter: attemptData?.masteryAfter ?? null,
    })
    setPhase('room_result')
  }, [hearts, hintsUsedHere, room, gameId])

  const handleUseHint = () => {
    setShowHint(true)
    setHintsUsedHere(h => h + 1)
  }

  // ── Award XP for this room (existing points system, unchanged) ──────────────
  const awardRoomXp = useCallback(async () => {
    try {
      const res = await fetch('/api/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'math_kingdom_room',
          reference_id: `${gameId}:${room.room_number}`,
        }),
      })
      const data = await res.json()
      return data.points_awarded ?? 0
    } catch {
      return 0
    }
  }, [gameId, room])

  const handleContinue = async () => {
    const xp = await awardRoomXp()
    setSessionStats(prev => ({ ...prev, xpEarned: prev.xpEarned + (xp ?? 0) }))

    if (roomIdx + 1 >= totalRooms) {
      setPhase('dungeon_complete')
    } else {
      setRoomIdx(i => i + 1)
      setPhase('playing')
      setLastResult(null)
    }
  }

  // ── ROOM RESULT SCREEN ───────────────────────────────────────────────────────
  if (phase === 'room_result') {
    const { isCorrect, struggledOut, timeSeconds, masteryBefore, masteryAfter } = lastResult
    const mins = Math.floor(timeSeconds / 60)
    const secs = timeSeconds % 60

    return (
      <div className="space-y-5 text-center py-4">
        <p className="text-5xl">{struggledOut ? '📖' : '🎉'}</p>
        <div>
          <p className="text-lg font-black text-primary">
            {struggledOut ? 'Room unlocked — let\u2019s review this one' : 'Room completed!'}
          </p>
          {struggledOut && (
            <p className="text-xs text-secondary mt-1.5 max-w-xs mx-auto leading-relaxed">
              This concept needs another look — it's been added to your study plan.
              You can keep going right now.
            </p>
          )}
        </div>

        {showSteps && room.payload?.steps && (
          <div className="rounded-2xl p-4 text-left max-w-sm mx-auto" style={{ background: softBg, border: `1.5px solid ${border}` }}>
            <p className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: softText }}>Worked solution</p>
            <div className="space-y-1">
              {room.payload.steps.map((step, i) => (
                <p key={i} className="text-sm font-mono" style={{ color: softText }}>{step}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 text-sm">
          <div>
            <p className="text-xs text-tertiary">Time</p>
            <p className="font-black text-primary">{mins}:{secs.toString().padStart(2, '0')}</p>
          </div>
          <div>
            <p className="text-xs text-tertiary">Hearts left</p>
            <p className="font-black text-primary">{hearts}/{STARTING_HEARTS}</p>
          </div>
          {isCorrect && sessionStats.streak > 1 && (
            <div>
              <p className="text-xs text-tertiary">Streak</p>
              <p className="font-black text-primary">🔥 {sessionStats.streak}</p>
            </div>
          )}
        </div>

        <MasteryDeltaBar
          before={masteryBefore}
          after={masteryAfter}
          softBg={softBg}
          softText={softText}
          isDark={isDark}
          border={border}
        />

        <button
          onClick={handleContinue}
          className="px-8 py-3.5 text-sm font-black rounded-2xl text-white active:scale-[0.97] transition-all"
          style={{ background: solid }}
        >
          {roomIdx + 1 >= totalRooms ? 'Finish dungeon →' : `Next room →`}
        </button>
      </div>
    )
  }

  // ── DUNGEON COMPLETE SCREEN ──────────────────────────────────────────────────
  if (phase === 'dungeon_complete') {
    const pct = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0
    return (
      <div className="space-y-6 text-center py-6">
        <p className="text-5xl">{theme.icon}</p>
        <div>
          <p className="text-xl font-black text-primary">Dungeon complete!</p>
          <p className="text-sm text-secondary mt-1">You finished every room in {theme.title}</p>
        </div>

        <div className="flex justify-center">
          <ScoreRing pct={pct} isDark={isDark} color={solid} />
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="rounded-2xl px-5 py-4" style={{ background: softBg, border: `1.5px solid ${border}` }}>
            <div className="flex items-center gap-1.5">
              <span className="text-sm leading-none">⭐</span>
              <span className="text-lg font-black" style={{ color: softText }}>+{sessionStats.xpEarned}</span>
            </div>
            <p className="text-xs font-bold mt-0.5" style={{ color: softText, opacity: 0.7 }}>XP earned</p>
          </div>

          {sessionStats.bestStreak > 1 && (
            <div className="rounded-2xl px-5 py-4" style={{ background: softBg, border: `1.5px solid ${border}` }}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">🔥</span>
                <span className="text-lg font-black" style={{ color: softText }}>{sessionStats.bestStreak}</span>
              </div>
              <p className="text-xs font-bold mt-0.5" style={{ color: softText, opacity: 0.7 }}>best streak</p>
            </div>
          )}
        </div>

        <MasteryDeltaBar
          before={sessionStats.masteryBefore}
          after={sessionStats.masteryAfter}
          label={theme.concept}
          softBg={softBg}
          softText={softText}
          isDark={isDark}
          border={border}
        />

        <button
          onClick={onExit}
          className="px-8 py-3.5 text-sm font-black rounded-2xl text-white active:scale-[0.97] transition-all"
          style={{ background: solid }}
        >
          Back to Math Kingdom →
        </button>
      </div>
    )
  }

  // ── PLAYING SCREEN ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onExit}
          aria-label="Save and exit dungeon"
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-secondary transition-colors"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
        >
          <span className="text-sm leading-none">✕</span>
        </button>
        <span className="text-xs font-black text-secondary whitespace-nowrap">
          Room {roomIdx + 1}/{totalRooms}
        </span>
        <RoomProgress current={roomIdx + 1} total={totalRooms} solidColor={solid} />
      </div>

      <GameStatsBar
        streak={sessionStats.streak}
        points={sessionStats.xpEarned}
        softBg={softBg}
        softText={softText}
      />

      <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1.5px solid ${cardBorder}` }}>
        <div style={{ height: 4, background: solid }} />
        <div className="p-5">
          <RoomRenderer
            room={room}
            onAnswer={handleAnswer}
            isDark={isDark}
            theme={theme}
            hintRevealed={showHint}
          />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <HeartsDisplay hearts={hearts} />
      </div>

      {room.payload?.hint && !showHint && (
        <button
          onClick={handleUseHint}
          className="w-full py-2.5 text-xs font-bold rounded-xl transition-colors"
          style={{ background: softBg, color: softText }}
        >
          💡 Need a hint?
        </button>
      )}
      {showHint && room.payload?.hint && (
        <div className="px-4 py-2.5 rounded-xl text-xs font-medium" style={{ background: softBg, color: softText }}>
          💡 {room.payload.hint}
        </div>
      )}
    </div>
  )
}