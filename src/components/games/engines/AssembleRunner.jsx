'use client'
// src/components/games/engines/AssembleRunner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ITERATION 2 — two changes from the previous version:
//
//   1. Passes missionIndex (1-based) and totalMissions down to
//      MissionRenderer, so Atom Builder / Equation Balancer can show their
//      own "Mission X of Y" pill without duplicating sequencing state.
//
//   2. The mission_result screen ("clear path to the next level") now
//      PREVIEWS what's coming instead of just saying "Mission complete!" —
//      shows the next mission's label before the student taps through, so
//      progress feels like a path with a visible next step, not a blind
//      button press. On the FINAL mission, this preview is replaced with
//      a distinct "last one!" framing.
//
// Everything else — XP award, mastery write via /api/chemlab/attempt, no
// hearts / no fail state — is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react'

export default function AssembleRunner({
  gameId, missions, theme, MissionRenderer, isDark, onExit,
}) {
  const [missionIdx, setMissionIdx] = useState(0)
  const [phase, setPhase] = useState('playing') // 'playing' | 'mission_result' | 'lab_complete'
  const [sessionStats, setSessionStats] = useState({ completed: 0, xpEarned: 0 })
  const missionStartRef = useRef(Date.now())

  const totalMissions = missions.length
  const mission = missions[missionIdx]
  const nextMission = missions[missionIdx + 1] ?? null
  const isLastMission = missionIdx + 1 >= totalMissions

  const solid = isDark ? theme.darkSolid : theme.solid
  const softBg = isDark ? theme.darkBg : theme.bg
  const softText = isDark ? theme.darkText : theme.text
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
    try {
      await fetch('/api/chemlab/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, missionId: mission.id, topicId: mission.topicId, timeSeconds }),
      })
    } catch { /* non-blocking */ }
    setPhase('mission_result')
  }, [gameId, mission])

  const handleContinue = async () => {
    const xp = await awardMissionXp()
    setSessionStats(prev => ({ completed: prev.completed + 1, xpEarned: prev.xpEarned + (xp ?? 0) }))

    if (missionIdx + 1 >= totalMissions) {
      setPhase('lab_complete')
    } else {
      missionStartRef.current = Date.now()
      setMissionIdx(i => i + 1)
      setPhase('playing')
    }
  }

  // ── MISSION RESULT — now previews the next step instead of a flat button ──
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