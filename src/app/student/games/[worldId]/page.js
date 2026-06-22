'use client'
// src/app/student/games/[worldId]/page.js
// ─────────────────────────────────────────────────────────────────────────────
// THE generic world landing page. Renders ANY world from the registry —
// Math Kingdom, Biology Lab, Chemistry Workshop, all use this exact same
// file. No per-world page code. Adding a new world to gameRegistry.js is
// the entire integration cost.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getWorld, getGamesForWorld } from '@/lib/gameRegistry'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { computeWorldLevel } from '@/lib/gameLevels'
import WorldHeader from '@/components/games/shared/WorldHeader'
import GameCard from '@/components/games/shared/GameCard'

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

export default function WorldLandingPage() {
  const { worldId } = useParams()
  const router = useRouter()
  const isDark = useIsDark()
  const world = getWorld(worldId)
  const games = getGamesForWorld(worldId)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ totalXp: 0, streak: 0, overallMasteryPct: 0, masteredCount: 0, gameProgress: {} })

  useEffect(() => {
    if (!world) { setLoading(false); return }

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // XP: sum points_log rows tagged for THIS world's games.
      // reason values for world games follow `{worldId}_room` or
      // game-specific reasons — for now we filter by reference_id prefix
      // matching any gameId in this world (works for both dungeon 'db'
      // games and any future static-content XP awards).
      const gameIds = games.map(g => g.id)

      const [{ data: pointsRows }, { data: streakRow }, { data: progressRows }, { data: masteryRows }, { data: topicRows }] = await Promise.all([
        supabase.from('points_log').select('points, reference_id').like('reference_id', '%'),
        supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
        supabase.from('math_kingdom_progress').select('game_id, rooms_completed').eq('student_id', user.id).in('game_id', gameIds),
        supabase.from('student_topic_mastery').select('status, topic_id').eq('student_id', user.id),
        supabase.from('topics').select('id').eq('subject_id', null), // placeholder — see note below
      ])

      // Filter points_log client-side to this world's games (reference_id
      // format is "{gameId}:{roomNumber}" for dungeon games, or "{gameId}"
      // for simpler static games — see registry note on XP awarding)
      const worldXp = (pointsRows ?? [])
        .filter(r => gameIds.some(gid => r.reference_id?.startsWith(gid)))
        .reduce((sum, r) => sum + (r.points ?? 0), 0)

      // Mastery: count mastered topics whose subject matches this world.
      // NOTE: this requires a join — simplified here by fetching topics for
      // the world's subject directly. Replace the placeholder query above
      // with a real subject_id lookup in production:
      //   const { data: subjectRow } = await supabase.from('subjects').select('id').eq('name', world.subject).single()
      //   then .eq('subject_id', subjectRow.id) on the topics query
      const masteredCount = (masteryRows ?? []).filter(m => m.status === 'mastered').length

      const gameProgress = {}
      ;(progressRows ?? []).forEach(p => {
        gameProgress[p.game_id] = Math.round((p.rooms_completed / 20) * 100) // adjust room count per game as needed
      })

      setData({
        totalXp: worldXp,
        streak: streakRow?.current_streak ?? 0,
        overallMasteryPct: 0, // wire up once subject_id join is in place
        masteredCount,
        gameProgress,
      })
      setLoading(false)
    }
    load()
  }, [world, worldId, router])

  if (!world) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-4xl">🎮</p>
        <p className="text-sm font-black text-primary">World not found</p>
        <Link href="/student/games" className="text-xs font-bold text-indigo-600">← Back to Games</Link>
      </div>
    )
  }

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const c = resolveSubjectColors(world.subject, isDark)
  const level = computeWorldLevel(world.id, data.totalXp, data.masteredCount)

  // Adapt world theme shape for WorldHeader (expects .theme.bg etc.)
  const worldWithTheme = {
    ...world,
    theme: {
      bg: c.bg, text: c.text, solid: c.solid, border: c.border,
      darkBg: c.bg, darkText: c.text, darkSolid: c.solid, darkBorder: c.border,
    },
  }

  return (
    <div className="space-y-5 pb-28">
      <Link href="/student/games" className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        All worlds
      </Link>

      <WorldHeader
        world={worldWithTheme}
        level={level}
        totalXp={data.totalXp}
        streak={data.streak}
        overallMasteryPct={data.overallMasteryPct}
        isDark={isDark}
      />

      <div className="grid grid-cols-1 gap-3">
        {games.map(game => (
          <GameCard
            key={game.id}
            game={game}
            progressPct={data.gameProgress[game.id] ?? 0}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  )
}