'use client'
// src/app/student/games/math-kingdom/equation_escape/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Equation Escape entry point. Two phases: intro screen → RoomRunner dungeon.
// Fetches room defs from math_kingdom_room_defs (game_id='equation_escape'),
// and the student's saved progress to resume where they left off.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MATH_KINGDOM_GAMES } from '@/lib/mathKingdomTheme'
import RoomRunner from '@/components/mathKingdom/RoomRunner'
import EquationEscapeRenderer from '@/components/mathKingdom/games/EquationEscapeRenderer'

function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

const game = MATH_KINGDOM_GAMES.equation_escape

export default function EquationEscapePage() {
  const router = useRouter()
  const isDark = useIsDark()
  const [phase, setPhase] = useState('intro') // 'intro' | 'playing'
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [resumeRoom, setResumeRoom] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: roomDefs }, { data: progress }] = await Promise.all([
        supabase
          .from('math_kingdom_room_defs')
          .select('*')
          .eq('game_id', 'equation_escape')
          .eq('is_active', true)
          .order('room_number'),
        supabase
          .from('math_kingdom_progress')
          .select('highest_room_reached')
          .eq('student_id', user.id)
          .eq('game_id', 'equation_escape')
          .maybeSingle(),
      ])

      setRooms(roomDefs ?? [])
      setResumeRoom(progress?.highest_room_reached ?? 0)
      setLoading(false)
    }
    load()
  }, [router])

  const solid = isDark ? game.darkSolid : game.solid
  const softBg = isDark ? game.darkBg : game.bg
  const softText = isDark ? game.darkText : game.text

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-4xl">🗝️</p>
        <p className="text-sm font-black text-primary">No rooms available yet</p>
        <Link href="/student/games/math-kingdom" className="text-xs font-bold" style={{ color: solid }}>← Back to Math Kingdom</Link>
      </div>
    )
  }

  // ── INTRO SCREEN ──────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="space-y-5 pb-28">
        <Link href="/student/games/math-kingdom" className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Math Kingdom
        </Link>

        <div className="rounded-3xl overflow-hidden text-center" style={{ background: softBg }}>
          <div className="px-6 py-10">
            <p className="text-6xl mb-4">{game.icon}</p>
            <p className="text-2xl font-black mb-2" style={{ color: softText }}>{game.title}</p>
            <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: softText, opacity: 0.85 }}>
              Escape the Algebra Dungeon. Solve equations. Unlock rooms. Master algebra.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Rooms', value: rooms.length },
            { label: 'Hearts', value: '❤️❤️❤️' },
            { label: 'Max XP', value: `+${rooms.reduce((s, r) => s + (r.xp_reward ?? 0), 0)}` },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl py-3 text-center" style={{ background: softBg }}>
              <p className="text-sm font-black" style={{ color: softText }}>{stat.value}</p>
              <p className="text-[10px]" style={{ color: softText, opacity: 0.7 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {resumeRoom > 0 && (
          <p className="text-xs text-center text-secondary">
            You've reached room {resumeRoom + 1} — pick up where you left off
          </p>
        )}

        <button
          onClick={() => setPhase('playing')}
          className="w-full py-4 text-sm font-black rounded-2xl text-white active:scale-[0.98] transition-all"
          style={{ background: solid }}
        >
          {resumeRoom > 0 ? 'Continue dungeon →' : 'Start →'}
        </button>
      </div>
    )
  }

  // ── DUNGEON ───────────────────────────────────────────────────────────────────
  const startingRooms = resumeRoom > 0 ? rooms.slice(resumeRoom) : rooms

  return (
    <div className="pb-28">
      <RoomRunner
        gameId="equation_escape"
        rooms={startingRooms}
        theme={game}
        RoomRenderer={EquationEscapeRenderer}
        isDark={isDark}
        onExit={() => router.push('/student/games/math-kingdom')}
      />
    </div>
  )
}