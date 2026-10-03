'use client'
// Battle leaderboard: XP earned in battles only, this week / last week / all
// time. Battle XP also counts on the main leaderboard; this board just scopes
// it. Data: /api/leaderboard/battle (lib/leaderboard/server.js), painted from
// the device cache first and refreshed in the background.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStudentUser } from '@/app/student/layout'
import { avatarLook } from '@/lib/leaderboard/avatar'
import { periodWindow, formatWindow } from '@/lib/leaderboard/periods'
import { BattleWorld, BattleSign, GameButton } from './BattleWorld'
import { BATTLE_HUB } from './BattleExperience'
import { GameGlyph } from '@/components/student/GameShell'
import s from './BattleLeaderboard.module.css'

const PERIODS = [['week','This Week'],['lastWeek','Last Week'],['all','All Time']]
const TTL_MS = 60_000
const EMPTY = { leaderboard: [], me: null, unavailable: false }
const cacheKey = (userId, period) => `ep_battle_lb_${userId ?? 'guest'}_${period}`
function readCache(key) { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
function writeCache(key, data) { try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {} }

function useBattleBoard(period, userId, ready) {
  const [state, setState] = useState({ data: EMPTY, loading: true, error: false })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!ready) return
    const key = cacheKey(userId, period)
    const cached = readCache(key)
    let cancelled = false
    // Deferred so the cached board paints in the same frame as the tab change.
    Promise.resolve().then(() => {
      if (cancelled) return
      if (cached?.data) setState({ data: cached.data, loading: false, error: false })
      else setState(v => ({ ...v, loading: true, error: false }))
    })
    if (cached && Date.now() - (cached.ts || 0) < TTL_MS && nonce === 0) return () => { cancelled = true }
    fetch(`/api/leaderboard/battle?period=${period}&limit=20`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(json => {
        if (cancelled) return
        const data = { leaderboard: json.leaderboard ?? [], me: json.me ?? null, unavailable: !!json.unavailable }
        if (!data.unavailable) writeCache(key, data)
        setState({ data, loading: false, error: false })
      })
      .catch(() => { if (!cancelled) setState(v => ({ ...v, loading: false, error: !v.data.leaderboard.length })) })
    return () => { cancelled = true }
  }, [period, userId, ready, nonce])
  return { ...state.data, loading: state.loading, error: state.error, retry: useCallback(() => setNonce(n => n + 1), []) }
}

function Row({ entry, pinned = false }) {
  const look = avatarLook(entry)
  const medal = entry.rank && entry.rank <= 3 ? entry.rank : null
  return <div className={`${s.row} ${entry.is_me ? s.me : ''} ${pinned ? s.pinned : ''}`}>
    <span className={s.rank} data-medal={medal ?? undefined}>{entry.rank ?? '—'}</span>
    <span className={s.avatar} style={{ background: look.background, color: look.color }} aria-hidden="true">{look.text}</span>
    <span className={s.who}>
      <strong>{entry.is_me ? `${entry.name} (You)` : entry.name}</strong>
      <small>{entry.battles ? `${entry.wins} ${entry.wins === 1 ? 'win' : 'wins'} · ${entry.battles} ${entry.battles === 1 ? 'battle' : 'battles'}` : 'No battles yet'}</small>
    </span>
    <span className={s.xp}>{entry.xp.toLocaleString()}<small>XP</small></span>
  </div>
}

export default function BattleLeaderboard() {
  const router = useRouter()
  const profile = useStudentUser()
  const ready = profile !== null
  const isGuest = !profile?.id || !!profile?.isGuest
  const [period, setPeriod] = useState('week')
  const board = useBattleBoard(period, profile?.id ?? null, ready)
  const range = periodWindow(period)
  const subtitle = range ? `Battle XP · ${formatWindow(range)}` : 'Battle XP since the arena opened'
  const meInList = board.leaderboard.some(e => e.is_me)
  const emptyText = { week: 'No battles yet this week. Win one now and take the top spot!', lastWeek: 'Nobody battled last week.', all: 'No battles yet. Be the first on the board!' }[period]

  const dock = <GameButton arrow onClick={() => router.push('/student/battle/setup')}><GameGlyph name="battle" size={28}/>Battle now</GameButton>
  return <BattleWorld guide={{ title: 'Climb the ranks!', text: 'Every battle earns XP. Top battlers lead the board each week.' }} header={<BattleSign title="Battle|leaderboard">{subtitle}</BattleSign>} onBack={() => router.push(BATTLE_HUB)} dock={dock} label="Battle leaderboard">
    <div className={s.tabs} role="tablist" aria-label="Time period">
      {PERIODS.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={period === key} className={s.tab} onClick={() => setPeriod(key)}>{label}</button>)}
    </div>
    <section className={s.board} aria-label="Battle rankings" aria-busy={board.loading}>
      {board.loading && !board.leaderboard.length ? <ol className={s.list} aria-label="Loading rankings">{Array.from({ length: 5 }, (_, i) => <li key={i} className={s.skeleton}/>)}</ol>
        : board.error ? <div className={s.empty}><strong>Couldn’t load the leaderboard</strong><p>Check your connection, then try again.</p><GameButton secondary onClick={board.retry}>Try again</GameButton></div>
        : board.unavailable ? <div className={s.empty}><strong>Battle rankings are warming up</strong><p>Your battles still earn XP. The board opens shortly.</p></div>
        : !board.leaderboard.length ? <div className={s.empty}><strong>The arena is quiet</strong><p>{emptyText}</p></div>
        : <ol className={s.list}>{board.leaderboard.map(entry => <li key={entry.student_id}><Row entry={entry}/></li>)}</ol>}
      {!board.error && !board.unavailable && (isGuest
        ? <div className={`${s.row} ${s.pinned} ${s.guest}`}><span className={s.who}><strong>You’re not on the board yet</strong><small><Link href="/onboarding?mode=signin&from=/student/battle/leaderboard">Sign in</Link> or <Link href="/onboarding?mode=signup">create a free account</Link> to get ranked.</small></span></div>
        : board.me && !meInList && <Row entry={board.me} pinned/>)}
    </section>
  </BattleWorld>
}
