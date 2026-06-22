'use client'
// src/app/student/games/math-kingdom/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Math Kingdom landing page. Progress header (level title, XP, streak,
// overall mastery) + 5 game cards (1 playable now, 4 marked "Coming soon"
// until their content is seeded — see ARCHITECTURE.md phased build note).
//
// Reuses: useIsDark pattern, existing student_streaks data, existing
// student_topic_mastery for the overall mastery %, existing points_log
// (filtered to math_kingdom_room) for XP, mathKingdomLevels.js for the title.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MATH_KINGDOM_GAMES } from '@/lib/mathKingdomTheme'
import { computeMathKingdomLevel } from '@/lib/mathKingdomLevels'

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

// ── Progress header ───────────────────────────────────────────────────────────
function KingdomHeader({ level, totalXp, streak, overallMasteryPct, isDark }) {
  const cardBg = isDark ? '#26215c' : '#eeedfe'
  const textColor = isDark ? '#cecbf6' : '#3c3489'
  const accentColor = isDark ? '#7f77dd' : '#534ab7'

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: cardBg }}>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: textColor, opacity: 0.7 }}>Math Kingdom</p>
            <p className="text-lg font-black flex items-center gap-1.5" style={{ color: textColor }}>
              <span>{level.emoji}</span>{level.title}
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl" style={{ background: isDark ? '#412402' : '#faeeda' }}>
              <span className="text-sm">🔥</span>
              <span className="text-sm font-black tabular-nums" style={{ color: isDark ? '#fac775' : '#633806' }}>{streak}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs mb-1.5">
          <span style={{ color: textColor, opacity: 0.85 }}>{totalXp.toLocaleString()} XP</span>
          {level.nextTier && (
            <span style={{ color: textColor, opacity: 0.6 }}>{level.xpToNext} XP to {level.nextTier.title}</span>
          )}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${level.progressPct}%`, background: accentColor }} />
        </div>
      </div>

      <div className="px-5 py-3 flex items-center justify-between" style={{ background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)' }}>
        <span className="text-xs font-bold" style={{ color: textColor }}>Overall Math Mastery</span>
        <span className="text-sm font-black" style={{ color: textColor }}>{overallMasteryPct}%</span>
      </div>
    </div>
  )
}

// ── Game card ──────────────────────────────────────────────────────────────────
function GameCard({ game, progressPct, comingSoon, isDark }) {
  const solid = isDark ? game.darkSolid : game.solid
  const softBg = isDark ? game.darkBg : game.bg
  const softText = isDark ? game.darkText : game.text
  const cardBg = isDark ? '#111827' : '#ffffff'
  const cardBorder = isDark ? '#1f2937' : '#ede9e3'

  const inner = (
    <>
      <div style={{ height: 5, background: comingSoon ? (isDark ? '#374151' : '#e5e7eb') : solid }} />
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: comingSoon ? (isDark ? '#1f2937' : '#f3f4f6') : solid }}
          >
            {game.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-primary leading-snug">{game.title}</p>
            <p className="text-[11px] text-secondary mt-0.5 leading-snug">{game.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: comingSoon ? (isDark ? '#1f2937' : '#f3f4f6') : softBg, color: comingSoon ? (isDark ? '#6b7280' : '#9ca3af') : softText }}>
            {game.concept}
          </span>
        </div>

        {!comingSoon && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-tertiary">Progress</span>
              <span className="text-[10px] font-black" style={{ color: solid }}>{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#1f2937' : '#f1f5f9' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: solid }} />
            </div>
          </div>
        )}

        <div
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-colors"
          style={comingSoon
            ? { background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#6b7280' : '#9ca3af' }
            : { background: solid, color: '#ffffff' }}
        >
          {comingSoon ? 'Coming soon' : (progressPct > 0 ? 'Continue' : 'Start')}
          {!comingSoon && (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          )}
        </div>
      </div>
    </>
  )

  const cardStyle = { background: cardBg, border: `1.5px solid ${cardBorder}`, boxShadow: isDark ? 'none' : `0 2px 10px ${solid}12` }

  if (comingSoon) {
    return <div className="rounded-2xl overflow-hidden opacity-70" style={cardStyle}>{inner}</div>
  }

  return (
    <Link href={`/student/games/math-kingdom/${game.id}`} className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-all" style={cardStyle}>
      {inner}
    </Link>
  )
}

export default function MathKingdomPage() {
  const isDark = useIsDark()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ totalXp: 0, streak: 0, overallMasteryPct: 0, gameProgress: {} })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: pointsRows }, { data: streakRow }, { data: progressRows }, { data: masteryRows }] = await Promise.all([
        supabase.from('points_log').select('points').eq('student_id', user.id).eq('reason', 'math_kingdom_room'),
        supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
        supabase.from('math_kingdom_progress').select('game_id, rooms_completed').eq('student_id', user.id),
        supabase.from('student_topic_mastery').select('status').eq('student_id', user.id),
      ])

      const totalXp = (pointsRows ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0)
      const masteredCount = (masteryRows ?? []).filter(m => m.status === 'mastered').length
      const totalMasteryRows = (masteryRows ?? []).length
      const overallMasteryPct = totalMasteryRows > 0 ? Math.round((masteredCount / totalMasteryRows) * 100) : 0

      const gameProgress = {}
      ;(progressRows ?? []).forEach(p => {
        // 20 rooms assumed for equation_escape v1 — adjust if room count differs
        gameProgress[p.game_id] = Math.round((p.rooms_completed / 20) * 100)
      })

      setData({
        totalXp,
        streak: streakRow?.current_streak ?? 0,
        overallMasteryPct,
        gameProgress,
        masteredCount,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const level = computeMathKingdomLevel(data.totalXp, data.masteredCount ?? 0)
  const games = Object.values(MATH_KINGDOM_GAMES)
  const playableGames = ['equation_escape'] // expand as more games ship content

  return (
    <div className="space-y-5 pb-28">
      <div>
        <h1 className="text-2xl font-black text-primary">Math Kingdom</h1>
        <p className="text-xs text-secondary mt-0.5">Master the concepts that unlock everything else</p>
      </div>

      <KingdomHeader
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
            comingSoon={!playableGames.includes(game.id)}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  )
}