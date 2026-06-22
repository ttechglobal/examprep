'use client'
// src/components/mathkingdom/RoomRunner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// THE REUSABLE ENGINE — powers all 5 Math Kingdom games.
//
// Each game provides:
//   - `roomRenderer`: a component that receives { room, onAnswer } and
//     renders THIS game's question UI (multiple choice / numeric / drag-drop /
//     etc.) — see equationEscapeRenderer.jsx for the reference implementation
//   - `theme`: from mathKingdomTheme.js
//   - `rooms`: array of room defs fetched from math_kingdom_room_defs
//
// RoomRunner itself handles, identically across every game:
//   - room sequencing + progress indicator
//   - hearts/lives (soft — see handleHeartsExhausted)
//   - hint reveal
//   - completion screen
//   - XP award call (existing points system, reason='math_kingdom_room')
//   - mastery update call (existing student_topic_mastery, via room.topic_id)
//   - room attempt logging (math_kingdom_room_attempts)
//
// SOFT HEARTS PHILOSOPHY (per product decision):
// Running out of hearts in a room never blocks progress or restarts the
// dungeon. It shows the worked steps, marks the room "completed with
// struggle", flags the topic for review (writes a lower-confidence mastery
// signal), and lets the student continue. Matches the existing
// PrerequisiteGate soft-gate pattern (canProceed: true) already in this app.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const STARTING_HEARTS = 3

// ── Count-up score ring (same pattern as gameTheme.js games) ─────────────────
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

// ── Hearts display ─────────────────────────────────────────────────────────────
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

// ── Room progress dots/bar ─────────────────────────────────────────────────────
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

export default function RoomRunner({
  gameId,
  rooms,           // array of room defs from math_kingdom_room_defs
  theme,           // from mathKingdomTheme.js
  RoomRenderer,    // game-specific question UI component
  isDark,
  onExit,          // called when student exits mid-dungeon
}) {
  const [roomIdx,      setRoomIdx]      = useState(0)
  const [hearts,       setHearts]       = useState(STARTING_HEARTS)
  const [hintsUsedHere, setHintsUsedHere] = useState(0)
  const [phase,        setPhase]        = useState('playing') // 'playing' | 'room_result' | 'dungeon_complete'
  const [lastResult,   setLastResult]   = useState(null)       // { isCorrect, struggledOut }
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, xpEarned: 0, startedAt: Date.now() })
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
        // SOFT HEARTS: reveal the worked steps, mark as struggled-through,
        // but DO NOT block progress. canProceed stays true always.
        struggledOut = true
        setShowSteps(true)
      } else {
        return // student gets to try again — hearts absorbed the miss
      }
    }

    // Log the attempt
    try {
      await fetch('/api/mathkingdom/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          roomDefId: room.id,
          roomNumber: room.room_number,
          isCorrect: isCorrect && !struggledOut,
          heartsLost: STARTING_HEARTS - hearts + (isCorrect ? 0 : 1),
          hintsUsed: hintsUsedHere,
          timeSeconds,
          topicId: room.topic_id,
          struggledOut,
        }),
      })
    } catch { /* non-blocking */ }

    setLastResult({ isCorrect: isCorrect && !struggledOut, struggledOut, timeSeconds })
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect && !struggledOut ? 1 : 0),
      total: prev.total + 1,
    }))
    setPhase('room_result')
  }, [hearts, hintsUsedHere, room, gameId])

  const handleUseHint = () => {
    setShowHint(true)
    setHintsUsedHere(h => h + 1)
  }

  // ── Award XP for this room (existing points system) ─────────────────────────
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
    const { isCorrect, struggledOut, timeSeconds } = lastResult
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
          <div className="rounded-2xl p-4 text-left max-w-sm mx-auto" style={{ background: softBg, border: `1.5px solid ${isDark ? theme.darkBorder : theme.border}` }}>
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
        </div>

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

        <div className="rounded-2xl px-5 py-4 mx-auto max-w-xs" style={{ background: softBg, border: `1.5px solid ${isDark ? theme.darkBorder : theme.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: softText }}>XP earned</span>
            <span className="text-lg font-black" style={{ color: softText }}>+{sessionStats.xpEarned}</span>
          </div>
        </div>

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
      {/* Top bar: room progress + hearts */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black text-secondary whitespace-nowrap">
          Room {roomIdx + 1}/{totalRooms}
        </span>
        <RoomProgress current={roomIdx + 1} total={totalRooms} solidColor={solid} />
        <HeartsDisplay hearts={hearts} />
      </div>

      {/* Game-specific question UI */}
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

      {/* Hint */}
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

      {/* Exit */}
      <button onClick={onExit} className="w-full text-center text-xs text-tertiary py-1">
        Save and exit dungeon
      </button>
    </div>
  )
}