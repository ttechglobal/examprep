'use client'
// src/app/student/games/[worldId]/[gameId]/page.js
// ─────────────────────────────────────────────────────────────────────────────
// THE GENERIC PLAY PAGE DISPATCHER — the piece that was missing, causing
// every "Play" link to 404. Reads game.mechanic from the registry and
// routes to the correct engine. One file handles ALL games, regardless of
// world or mechanic — this is the entire point of the registry.
//
// MECHANIC → ENGINE map:
//   sort      → SortEngine      (config: { buckets, items })
//   match     → MatchEngine     (config: { pairs })
//   build     → BuildEngine     (config: { formula, inputs, output, quiz })
//   hunt      → ElementHunterEngine (config: { missions, table, timers } — static, from elementHunter.js)
//   dungeon   → DungeonEngine   (rooms fetched from math_kingdom_room_defs)
//   assemble  → AssembleRunner  (missions from a static mission data file,
//                                 variant picked by game.assembleVariant)
//
// For 'dungeon' and 'assemble' games, content is NOT inline in the registry
// (it's in a DB table or a sibling mission data file) — this page fetches/
// imports that content based on game.dbGameId / game.missionSource before
// handing off to the engine.
//
// IMPORT PATHS UPDATED for the games/ folder restructure:
//   '@/lib/gameRegistry'                  → '@/lib/games/registry'
//   '@/components/mathKingdom/RoomRunner' → '@/components/games/engines/DungeonEngine'
//   '@/lib/chemLabMissions'               → '@/lib/games/missions/chemLab'
// No other changes — dispatch logic, JSX, and data loading are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getWorld, getGame } from '@/lib/games/registry'

import SortEngine     from '@/components/games/engines/SortEngine'
import MatchEngine    from '@/components/games/engines/MatchEngine'
import BuildEngine    from '@/components/games/engines/BuildEngine'
import DungeonEngine  from '@/components/games/engines/DungeonEngine'
import AssembleRunner from '@/components/games/engines/AssembleRunner'

import EquationEscapeRenderer  from '@/components/games/renderers/equation-escape'
import AtomBuilderRenderer     from '@/components/games/renderers/atom-builder'
import EquationBalancerRenderer from '@/components/games/renderers/equation-balancer'
import ChemistryDetectiveRenderer from '@/components/games/renderers/chemistry-detective'

import { EQUATION_BALANCER_REACTIONS } from '@/lib/games/missions/chemLab'
import { buildAtomBuilderQueue } from '@/lib/games/missions/atomBuilder'
import { shuffleCases } from '@/lib/games/missions/chemistryDetective'

import ElementHunterEngine from '@/components/games/engines/ElementHunterEngine'
import { ELEMENT_HUNTER_TABLE, ELEMENT_HUNTER_TIMERS } from '@/lib/games/missions/elementHunter'

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

// Maps a game's dbGameId (dungeon mechanic) to its room renderer component.
// Extend this map as new dungeon games ship real content.
const DUNGEON_RENDERERS = {
  equation_escape: EquationEscapeRenderer,
}

// Maps a game's id (assemble mechanic) to its mission array + renderer.
// Extend this map as new assemble games ship.
const ASSEMBLE_GAMES = {
  'atom-builder': { Renderer: AtomBuilderRenderer }, // missions built fresh per session, see dispatch block below
  'equation-balancer': { missions: EQUATION_BALANCER_REACTIONS, Renderer: EquationBalancerRenderer },
  'chemistry-detective': { Renderer: ChemistryDetectiveRenderer }, // cases built fresh per session, see dispatch block below
}

function NotFoundBlock({ message }) {
  return (
    <div className="text-center py-20 space-y-3">
      <p className="text-4xl">🎮</p>
      <p className="text-sm font-black text-primary">{message}</p>
      <Link href="/student/games" className="text-xs font-bold text-indigo-600">← Back to Games</Link>
    </div>
  )
}

function Spinner() {
  return (
    <div className="py-20 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function GamePlayPage() {
  const { worldId, gameId } = useParams()
  const router = useRouter()
  const isDark = useIsDark()

  const world = getWorld(worldId)
  const game = getGame(gameId)

  const [loading, setLoading] = useState(true)
  const [dungeonRooms, setDungeonRooms] = useState([])
  // Built once per play session (component mount), NOT once per module
  // load — buildAtomBuilderQueue() shuffles, so this must be fresh per
  // session or every student would see the same shuffle order for the
  // lifetime of the server process. useState's initializer function runs
  // exactly once per mount, which is what we want here.
  const [atomBuilderQueue] = useState(() => buildAtomBuilderQueue(5))
  // Same per-session-shuffle reasoning as atomBuilderQueue above — cases
  // must shuffle fresh per mount, not once per module load.
  const [detectiveCaseQueue] = useState(() => shuffleCases())
  const [resumeRoom, setResumeRoom] = useState(0)

  // For dungeon-mechanic games: fetch room content + saved progress from DB.
  // For every other mechanic, content is already available synchronously
  // (inline config or imported mission data), so loading resolves immediately.
  useEffect(() => {
    if (!game) { setLoading(false); return }

    if (game.mechanic !== 'dungeon') {
      setLoading(false)
      return
    }

    async function loadDungeonContent() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: roomDefs }, { data: progress }] = await Promise.all([
        supabase
          .from('math_kingdom_room_defs')
          .select('*')
          .eq('game_id', game.dbGameId ?? game.id)
          .eq('is_active', true)
          .order('room_number'),
        supabase
          .from('math_kingdom_progress')
          .select('highest_room_reached')
          .eq('student_id', user.id)
          .eq('game_id', game.dbGameId ?? game.id)
          .maybeSingle(),
      ])

      setDungeonRooms(roomDefs ?? [])
      setResumeRoom(progress?.highest_room_reached ?? 0)
      setLoading(false)
    }
    loadDungeonContent()
  }, [game, router])

  // ── Guard: world or game not found ───────────────────────────────────────────
  if (!world) return <NotFoundBlock message="World not found" />
  if (!game)  return <NotFoundBlock message="Game not found" />
  if (game.comingSoon) return <NotFoundBlock message={`${game.title} is coming soon`} />

  if (loading) return <Spinner />

  const handleExit = () => router.push(`/student/games/${worldId}`)
  const handleComplete = () => router.push(`/student/games/${worldId}`)

  // ── Dispatch by mechanic ─────────────────────────────────────────────────────

  if (game.mechanic === 'sort') {
    return (
      <PlayShell worldId={worldId} game={game}>
        <SortEngine game={game.config} onComplete={handleComplete} />
      </PlayShell>
    )
  }

  if (game.mechanic === 'match') {
    return (
      <PlayShell worldId={worldId} game={game}>
        <MatchEngine game={game.config} onComplete={handleComplete} />
      </PlayShell>
    )
  }

  if (game.mechanic === 'build') {
    return (
      <PlayShell worldId={worldId} game={game}>
        <BuildEngine game={game.config} onComplete={handleComplete} />
      </PlayShell>
    )
  }

  if (game.mechanic === 'hunt') {
    return (
      <PlayShell worldId={worldId} game={game}>
        <ElementHunterEngine
          game={{ table: ELEMENT_HUNTER_TABLE, timers: ELEMENT_HUNTER_TIMERS }}
          onComplete={handleComplete}
        />
      </PlayShell>
    )
  }

  if (game.mechanic === 'dungeon') {
    const RoomRenderer = DUNGEON_RENDERERS[game.dbGameId ?? game.id]
    if (!RoomRenderer) return <NotFoundBlock message={`${game.title} has no room content configured yet`} />
    if (dungeonRooms.length === 0) return <NotFoundBlock message="No rooms available yet — check back soon" />

    const startingRooms = resumeRoom > 0 ? dungeonRooms.slice(resumeRoom) : dungeonRooms

    return (
      <div className="pb-28">
        <BackLink worldId={worldId} world={world} />
        <DungeonEngine
          gameId={game.dbGameId ?? game.id}
          rooms={startingRooms}
          theme={game.accent}
          RoomRenderer={RoomRenderer}
          isDark={isDark}
          onExit={handleExit}
        />
      </div>
    )
  }

  if (game.mechanic === 'assemble') {
    const assembleGame = ASSEMBLE_GAMES[game.id]
    if (!assembleGame) return <NotFoundBlock message={`${game.title} has no mission content configured yet`} />

    return (
      <div className="pb-28">
        <BackLink worldId={worldId} world={world} />
        <AssembleRunner
          gameId={game.id}
          missions={
            game.id === 'atom-builder' ? atomBuilderQueue
            : game.id === 'chemistry-detective' ? detectiveCaseQueue
            : assembleGame.missions
          }
          theme={game.accent}
          MissionRenderer={assembleGame.Renderer}
          isDark={isDark}
          onExit={handleExit}
        />
      </div>
    )
  }

  return <NotFoundBlock message={`Unknown game mechanic: ${game.mechanic}`} />
}

// ── Shared back-link, used by sort/match/build (which render inline) ─────────
function BackLink({ worldId, world }) {
  return (
    <Link href={`/student/games/${worldId}`} className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors mb-4">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      {world.title}
    </Link>
  )
}

// ── Shared header + wrapper for sort/match/build games ───────────────────────
// (Dungeon and Assemble games render their own header inside their engine's
// result/play screens, so they skip this wrapper — see the dispatch blocks
// above, which render BackLink directly instead.)
function PlayShell({ worldId, game, children }) {
  return (
    <div className="space-y-4 pb-28">
      <BackLink worldId={worldId} world={{ title: getWorld(worldId)?.title ?? 'Games' }} />

      <div className="rounded-2xl overflow-hidden bg-card border border-default">
        <div style={{ height: 4, background: game.accent?.solid ?? '#6366f1' }} />
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-2xl">{game.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-primary leading-snug">{game.title}</p>
            <p className="text-[11px] text-secondary mt-0.5">{game.tagline}</p>
          </div>
        </div>
      </div>

      {children}
    </div>
  )
}