'use client'
// src/app/student/games/page.js
// ─────────────────────────────────────────────────────────────────────────────
// THE HUB OF HUBS. Lists every world from the registry. Adding a new world
// (new subject) requires zero changes to this file — it renders generically
// from gameRegistry.js's WORLDS array.
//
// Reflects the current registry: 7 worlds, including the merged chem_lab
// (5 games: atom-builder, equation-balancer, acids-bases,
// organic-functional-groups, ideal-gas) — chemistry_workshop no longer
// exists as a separate world.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAllWorlds, getGamesForWorld, getPlayableGamesForWorld } from '@/lib/gameRegistry'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { getElevationShadow, getElevationBorder } from '@/lib/gamePremiumTokens'

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

function WorldCard({ world, playableCount, isDark }) {
  const c = resolveSubjectColors(world.subject, isDark)
  const cardBg = isDark ? '#111827' : '#ffffff'
  const cardBorderNeutral = isDark ? '#1f2937' : '#ede9e3'
  const isLocked = playableCount === 0

  return (
    <Link
      href={isLocked ? '#' : `/student/games/${world.id}`}
      className="block rounded-3xl overflow-hidden active:scale-[0.98] transition-transform duration-150"
      style={{
        background: cardBg,
        border: getElevationBorder('resting', cardBorderNeutral, isDark),
        boxShadow: getElevationShadow('resting', c.solid, isDark),
        opacity: isLocked ? 0.6 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}
    >
      <div className="flex items-center gap-4 p-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ background: c.solid }}
        >
          {world.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-primary leading-snug">{world.title}</p>
          <p className="text-xs text-secondary mt-0.5 leading-snug line-clamp-2">{world.description}</p>
          <p className="text-[10px] font-bold mt-1.5" style={{ color: c.solid }}>
            {isLocked ? 'Coming soon' : `${playableCount} game${playableCount !== 1 ? 's' : ''} ready to play`}
          </p>
        </div>
        {!isLocked && (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: c.solid }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        )}
      </div>
    </Link>
  )
}

export default function GamesHubPage() {
  const isDark = useIsDark()
  const worlds = getAllWorlds()

  return (
    <div className="space-y-5 pb-28">
      <div>
        <h1 className="text-2xl font-black text-primary">Games</h1>
        <p className="text-xs text-secondary mt-0.5">Pick a world and play your way to mastery</p>
      </div>

      <div className="space-y-3">
        {worlds.map(world => (
          <WorldCard
            key={world.id}
            world={world}
            playableCount={getPlayableGamesForWorld(world.id).length}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  )
}