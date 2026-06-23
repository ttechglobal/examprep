'use client'
// src/components/games/engines/AssembleRunner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ITERATION 3 — minimal game-feel pass, scoped deliberately narrow:
//
//   Checked both existing renderers (atom-builder.jsx, equation-balancer.jsx)
//   before touching this file — they BOTH already draw their own "Mission X
//   of Y" pill + "How to play" button as the first row inside MissionRenderer,
//   using the missionIndex/totalMissions props this engine already passes
//   down. Adding an engine-level top HUD bar here would either duplicate
//   that row or visually compete with it. So this pass stays narrow:
//
//   1. Exit moved to a small icon button (✕), placed in the engine wrapper
//      ABOVE the card — i.e. before MissionRenderer renders anything, so it
//      never collides with the renderer's own header row. The old "Save and
//      exit lab" text link is kept too (some users may prefer the explicit
//      label) — remove it if you'd rather have only the icon.
//   2. mission_result and lab_complete gained an optional mastery delta bar
//      (see MASTERY DATA CONTRACT below) — purely additive, no-op if the
//      data isn't present.
//   3. Deliberately NOT added: streak indicator (this mechanic has no fail
//      state by design — "no hearts / no fail state" per the original
//      comment — so a streak-that-can-break would contradict the mechanic's
//      own philosophy), and no top-of-play XP pill (would sit right next to
//      / compete with the renderer's own mission pill).
//
// Everything else — XP award via /api/points/award (reason: chem_lab_mission),
// mastery write via /api/chemlab/attempt, phase machine, no hearts / no fail
// state — is unchanged.
//
// MASTERY DATA CONTRACT (same pattern as RoomRunner/DungeonEngine):
//   This component does NOT compute mastery — it only displays it.
//   For the bar to show, /api/chemlab/attempt's response needs to include:
//     { masteryBefore: number, masteryAfter: number }  // 0-100 scale
//   I haven't seen that route's actual response shape — if you share it,
//   I'll wire the exact field names instead of assuming. Until then this
//   is a safe no-op: no fields returned → no bar rendered → nothing else
//   changes.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react'

// ── Mastery delta bar — same component contract as RoomRunner's version.
// Duplicated here (rather than imported) because the two engines currently
// have no shared UI module to import from — see note at the bottom of this
// file if you want to extract this into src/components/games/shared/ once
// a third engine needs it too, to avoid a second drift point.
function MasteryDeltaBar({ before, after, label, softBg, softText, isDark, border }) {
  if (before == null || after == null) return null
  const delta = Math.round(after - before)
  const deltaLabel = delta > 0 ? `+${delta}%` : `${delta}%`

  return (
    <div
      className="text-left rounded-2xl p-4 mx-auto max-w-sm"
      style={{ background: softBg, border: border ? `1.5px solid ${border}` : undefined }}
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

export default function AssembleRunner({
  gameId, missions, theme, MissionRenderer, isDark, onExit,
}) {
  const [missionIdx, setMissionIdx] = useState(0)
  const [phase, setPhase] = useState('playing') // 'playing' | 'mission_result' | 'lab_complete'
  const [sessionStats, setSessionStats] = useState({
    completed: 0,
    xpEarned: 0,
    masteryBefore: null, // NEW — optional, see MASTERY DATA CONTRACT above
    masteryAfter: null,  // NEW
  })
  const [lastMastery, setLastMastery] = useState({ before: null, after: null }) // NEW — for mission_result screen
  const missionStartRef = useRef(Date.now())

  const totalMissions = missions.length
  const mission = missions[missionIdx]
  const nextMission = missions[missionIdx + 1] ?? null
  const isLastMission = missionIdx + 1 >= totalMissions

  const solid = isDark ? theme.darkSolid : theme.solid
  const softBg = isDark ? theme.darkBg : theme.bg
  const softText = isDark ? theme.darkText : theme.text
  const border = isDark ? theme.darkBorder : theme.border
  const cardBg = isDark ? '#111827' : '#ffffff'
  const cardBorder = isDark ? '#1f2937' : '#ede9e3'

  const awardMissionXp = useCallback(async () => {
    try {
      const res = await fetch('/api/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'chem_lab_mission', reference_id: `${gameId}:${mission.id}` }),
      })
      const data = await res.json()
      return data.points_awarded ?? 0
    } catch { return 0 }
  }, [gameId, mission])

  const handleMissionComplete = useCallback(async () => {
    const timeSeconds = Math.round((Date.now() - missionStartRef.current) / 1000)
    let attemptData = null
    try {
      const res = await fetch('/api/chemlab/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, missionId: mission.id, topicId: mission.topicId, timeSeconds }),
      })
      attemptData = await res.json().catch(() => null)
    } catch { /* non-blocking */ }

    // NEW — only populates if the route actually returns these fields
    setLastMastery({
      before: attemptData?.masteryBefore ?? null,
      after: attemptData?.masteryAfter ?? null,
    })
    setSessionStats(prev => ({
      ...prev,
      masteryBefore: prev.masteryBefore ?? attemptData?.masteryBefore ?? null,
      masteryAfter: attemptData?.masteryAfter ?? prev.masteryAfter,
    }))

    setPhase('mission_result')
  }, [gameId, mission])

  const handleContinue = async () => {
    const xp = await awardMissionXp()
    setSessionStats(prev => ({ ...prev, completed: prev.completed + 1, xpEarned: prev.xpEarned + (xp ?? 0) }))

    if (missionIdx + 1 >= totalMissions) {
      setPhase('lab_complete')
    } else {
      missionStartRef.current = Date.now()
      setMissionIdx(i => i + 1)
      setPhase('playing')
    }
  }

  // ── MISSION RESULT — previews the next step, now with optional mastery bar ──
  if (phase === 'mission_result') {
    return (
      <div className="space-y-5 text-center py-6">
        <p className="text-5xl">✨</p>
        <p className="text-lg font-black text-primary">Mission complete!</p>

        {!isLastMission && nextMission ? (
          <div className="rounded-2xl px-4 py-3.5 mx-auto max-w-xs" style={{ background: softBg }}>
            <p className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: softText, opacity: 0.7 }}>
              Up next — mission {missionIdx + 2} of {totalMissions}
            </p>
            <p className="text-sm font-black" style={{ color: softText }}>{nextMission.label}</p>
          </div>
        ) : (
          <div className="rounded-2xl px-4 py-3.5 mx-auto max-w-xs" style={{ background: softBg }}>
            <p className="text-sm font-black" style={{ color: softText }}>🎉 That's the last one in this session!</p>
          </div>
        )}

        {/* NEW — only renders if /api/chemlab/attempt returned mastery data */}
        <MasteryDeltaBar
          before={lastMastery.before}
          after={lastMastery.after}
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
          {isLastMission ? 'Finish lab session →' : 'Next mission →'}
        </button>
      </div>
    )
  }

  if (phase === 'lab_complete') {
    return (
      <div className="space-y-6 text-center py-6">
        <p className="text-5xl">{theme.icon ?? '🧪'}</p>
        <div>
          <p className="text-xl font-black text-primary">Lab session complete!</p>
          <p className="text-sm text-secondary mt-1">{sessionStats.completed} missions done</p>
        </div>
        <div className="rounded-2xl px-5 py-4 mx-auto max-w-xs" style={{ background: softBg }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: softText }}>XP earned</span>
            <span className="text-lg font-black" style={{ color: softText }}>+{sessionStats.xpEarned}</span>
          </div>
        </div>

        {/* NEW — only renders if mastery data made it into session stats */}
        <MasteryDeltaBar
          before={sessionStats.masteryBefore}
          after={sessionStats.masteryAfter}
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
          Back to Chem Lab →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* NEW — small icon exit, sits ABOVE the card so it never collides with
          the renderer's own "Mission X of Y / How to play" header row */}
      <div className="flex items-center justify-end">
        <button
          onClick={onExit}
          aria-label="Save and exit lab"
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-secondary transition-colors"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
        >
          <span className="text-sm leading-none">✕</span>
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1.5px solid ${cardBorder}` }}>
        <div style={{ height: 4, background: solid }} />
        <div className="p-5">
          <MissionRenderer
            mission={mission}
            onComplete={handleMissionComplete}
            isDark={isDark}
            theme={theme}
            missionIndex={missionIdx + 1}
            totalMissions={totalMissions}
          />
        </div>
      </div>

      <button onClick={onExit} className="w-full text-center text-xs text-tertiary py-1">
        Save and exit lab
      </button>
    </div>
  )
}