'use client'
// src/components/student/leaderboard/LeaderboardSections.jsx
// Presentational pieces of the leaderboard page. Data + state live in
// app/student/leaderboard/page.js.

import Link from 'next/link'
import { useState } from 'react'
import s from './leaderboard.module.css'
import {
  ChevronLeft, ChevronRight, ChevronDown, ArrowRight, Trophy, Crown,
  NigeriaFlag, SchoolIcon, LevelBadge, RankCoin,
} from './icons'
import { shareInvite } from '@/components/student/InviteFriendsCard'

// ── Avatars ──────────────────────────────────────────────────────────────────
// No profile photos yet: a stable tint per student from their id.
const TINTS = [
  ['#E0EAFF', '#1D4ED8'], ['#FDE7D6', '#C2410C'], ['#DCFCE7', '#15803D'],
  ['#F3E8FF', '#7E22CE'], ['#FFE4E6', '#BE123C'], ['#E0F2FE', '#0369A1'],
]
function tintFor(id = '') {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}

export function Avatar({ entry }) {
  if (entry.is_me) {
    return (
      <span className={s.avatar} style={{ background: 'linear-gradient(145deg,#0a2470,#1264e5)', color: '#FFB800', fontSize: '0.92em' }} aria-hidden="true">
        {(entry.name || 'ME').slice(0, 2).toUpperCase()}
      </span>
    )
  }
  const [bg, fg] = tintFor(entry.student_id)
  return (
    <span className={s.avatar} style={{ background: bg, color: fg }} aria-hidden="true">
      {(entry.name || 'S').charAt(0).toUpperCase()}
    </span>
  )
}

// ── Champions hero ───────────────────────────────────────────────────────────
const PLACE = {
  1: { ring: '#FFC53D', p1: '#F7C744', p2: '#C98A10', avatar: 'linear-gradient(145deg,#F59E0B,#B45309)' },
  2: { ring: '#8FB6FF', p1: '#4F86F7', p2: '#2350C8', avatar: 'linear-gradient(145deg,#3B82F6,#1E3A8A)' },
  3: { ring: '#FF9A5A', p1: '#E8834A', p2: '#A8481C', avatar: 'linear-gradient(145deg,#F97316,#9A3412)' },
}
const CONFETTI = [
  ['6%', '18%', '#3B82F6', '35deg'], ['46%', '12%', '#F59E0B', '-20deg'], ['52%', '70%', '#F59E0B', '50deg'],
  ['58%', '8%', '#64748B', '25deg'], ['78%', '14%', '#F97316', '-30deg'], ['90%', '10%', '#F59E0B', '40deg'],
  ['96%', '84%', '#3B82F6', '-45deg'], ['41%', '90%', '#3B82F6', '15deg'],
]

function Spot({ entry, place }) {
  const p = PLACE[place]
  return (
    <div className={s.spot} data-place={place} style={{ '--ring': p.ring, '--p1': p.p1, '--p2': p.p2 }}>
      <span className={s.spotAvatar} style={{ background: p.avatar }} aria-hidden="true">
        {place === 1 && <span className={s.spotCrown}><Crown size={34} /></span>}
        {(entry?.name || '?').charAt(0).toUpperCase()}
        <span className={s.spotNum}>{place}</span>
      </span>
      <div className={s.pedestal}>
        <span className={s.spotName}>{entry?.name ?? '—'}</span>
        <span className={s.spotXp}>{entry ? `${entry.xp.toLocaleString()} XP` : ''}</span>
      </div>
    </div>
  )
}

export function ChampionsHero({ weeksAgo, maxWeeksAgo, onChange, dateLabel, entries, loading }) {
  const [first, second, third] = entries
  const olderDisabled = weeksAgo >= maxWeeksAgo
  const newerDisabled = weeksAgo <= 1
  const summary = entries.length
    ? entries.map((e, i) => `${i + 1}. ${e.name}, ${e.xp.toLocaleString()} XP`).join('; ')
    : 'No champions for this week'

  return (
    <section className={s.hero} aria-roledescription="carousel" aria-label="Weekly champions">
      <div className={s.confetti} aria-hidden="true">
        {CONFETTI.map(([left, top, color, r], i) => <i key={i} style={{ left, top, background: color, '--r': r }} />)}
      </div>

      <div className={s.heroText}>
        <h2 className={s.heroTitle}>
          <Trophy size={40} />
          <span>Weekly <em>Champions</em></span>
        </h2>
        <p className={s.heroSub}>
          <span className={s.heroSubScope}>Top 3 students across Nigeria • </span>{dateLabel}
        </p>
        <Link href="/student/leaderboard/hall" className={s.heroBtn}>
          View All Champions <ArrowRight />
        </Link>
      </div>

      <div className={s.stage}>
        <button type="button" className={s.navBtn} onClick={() => onChange(weeksAgo + 1)} disabled={olderDisabled} aria-label="Previous week">
          <ChevronLeft />
        </button>

        {entries.length || loading ? (
          <div className={s.podium} aria-busy={loading} aria-live="polite" aria-label={summary} role="group">
            <Spot entry={second} place={2} />
            <Spot entry={first}  place={1} />
            <Spot entry={third}  place={3} />
          </div>
        ) : (
          <p className={s.heroEmpty} aria-live="polite">Nobody earned XP this week. Practise now and next week’s podium could be yours.</p>
        )}

        <button type="button" className={s.navBtn} onClick={() => onChange(weeksAgo - 1)} disabled={newerDisabled} aria-label="Next week">
          <ChevronRight />
        </button>
      </div>

      <div className={s.dots}>
        {Array.from({ length: maxWeeksAgo }, (_, i) => i + 1).map(w => (
          <button
            key={w} type="button"
            aria-label={w === 1 ? 'Last week' : `${w} weeks ago`}
            aria-current={w === weeksAgo}
            onClick={() => onChange(w)}
          />
        ))}
      </div>
    </section>
  )
}

// ── Period tabs ──────────────────────────────────────────────────────────────
export const PERIOD_TABS = [
  { key: 'week',     label: 'This Week'  },
  { key: 'lastWeek', label: 'Last Week'  },
  { key: 'month',    label: 'This Month' },
  { key: 'all',      label: 'All Time'   },
]

export function PeriodTabs({ period, onChange }) {
  function onKey(e) {
    const i = PERIOD_TABS.findIndex(t => t.key === period)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = PERIOD_TABS[(i + step + PERIOD_TABS.length) % PERIOD_TABS.length]
    onChange(next.key)
    e.currentTarget.parentElement.querySelector(`[data-key="${next.key}"]`)?.focus()
  }
  return (
    <div className={s.tabs} role="tablist" aria-label="Time period">
      {PERIOD_TABS.map(t => (
        <button
          key={t.key} type="button" role="tab" data-key={t.key}
          className={s.tab}
          aria-selected={period === t.key}
          tabIndex={period === t.key ? 0 : -1}
          onClick={() => onChange(t.key)}
          onKeyDown={onKey}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Scope picker ─────────────────────────────────────────────────────────────
export function ScopeSelect({ scope, schoolName, hasSchool, onChange }) {
  const label = scope === 'school' ? (schoolName || 'My School') : 'National (Nigeria)'
  return (
    <label className={s.scope}>
      {scope === 'school' ? <SchoolIcon /> : <NigeriaFlag />}
      <span>{label}</span>
      <ChevronDown />
      <select value={scope} onChange={e => onChange(e.target.value)} aria-label="Leaderboard">
        <option value="national">National (Nigeria)</option>
        {hasSchool
          ? <option value="school">{schoolName || 'My School'}</option>
          : <option value="join">My school: connect…</option>}
      </select>
    </label>
  )
}

// ── Table ────────────────────────────────────────────────────────────────────
function metaOf(entry) {
  return [entry.class_level, entry.location].filter(Boolean).join(' · ')
}

function Level({ entry }) {
  return (
    <span className={s.level}>
      <LevelBadge tier={entry.level_tier} numeral={entry.level_numeral} />
      {entry.level}
    </span>
  )
}

function Row({ entry }) {
  const place = entry.rank
  return (
    <div className={s.row} data-me={entry.is_me}>
      <span className={s.rank}>
        {place >= 1 && place <= 3 ? <><RankCoin place={place} /><span className="sr-only">{place}</span></> : place ?? '—'}
      </span>
      <span className={s.who}>
        <Avatar entry={entry} />
        <span style={{ minWidth: 0 }}>
          <p className={s.name}>{entry.name}{entry.is_me && <span className="sr-only"> (you)</span>}</p>
          {metaOf(entry) && <p className={s.meta}>{metaOf(entry)}</p>}
        </span>
      </span>
      <Level entry={entry} />
      <span className={s.num}>{entry.xp.toLocaleString()}</span>
      <span className={`${s.num} ${s.col5}`}>{entry.accuracy == null ? '—' : `${entry.accuracy}%`}</span>
      <span className={`${s.num} ${s.col6}`}>{entry.questions.toLocaleString()}</span>
    </div>
  )
}

const PERIOD_WORD = { week: 'this week', lastWeek: 'last week', month: 'this month', all: '' }

export function meMessage(me, board, period) {
  if (!me?.rank) {
    const when = PERIOD_WORD[period]
    return `Answer questions${when ? ` ${when}` : ''} to get on the board 🎯`
  }
  if (me.rank === 1) return 'You’re leading! Stay sharp. 👑'
  if (me.rank <= 3)  return 'You’re on the podium! 🏆'
  if (me.rank <= 10) return 'Keep going! You’re in the top 10! 🎯'
  const tenth = board[9]
  return tenth ? `${(tenth.xp - me.xp + 10).toLocaleString()} XP to reach the top 10 🎯` : 'Keep climbing! 🎯'
}

function MeCard({ me, board, period }) {
  return (
    <div className={s.meCard}>
      <div className={s.row} data-me="true">
        <span className={s.rank}>{me.rank ? `#${me.rank}` : '—'}</span>
        <span className={s.who}>
          <Avatar entry={me} />
          <span style={{ minWidth: 0 }}>
            <p className={s.name}>{me.name}</p>
            <p className={s.meta}>{meMessage(me, board, period)}</p>
          </span>
        </span>
        <Level entry={me} />
        <span className={s.num}>{me.xp.toLocaleString()}</span>
        <span className={`${s.num} ${s.col5}`}>{me.accuracy == null ? '—' : `${me.accuracy}%`}</span>
        <span className={`${s.num} ${s.col6}`}>{me.questions.toLocaleString()}</span>
      </div>
    </div>
  )
}

function GuestCard() {
  return (
    <div className={s.meCard}>
      <div className={s.row}>
        <span className={s.rank}>—</span>
        <span className={s.who}>
          <span className={s.avatar} style={{ background: 'var(--lb-surface)', color: 'var(--lb-muted)', border: '1px dashed var(--lb-me-line)' }} aria-hidden="true">?</span>
          <span style={{ minWidth: 0 }}>
            <p className={s.name}>You’re not on the board yet</p>
            <p className={s.meta}>
              <Link href="/onboarding?mode=signup" className={s.guestCta}>Create a free account</Link> to get ranked.
            </p>
          </span>
        </span>
      </div>
    </div>
  )
}

export function Board({ board, me, isGuest, period, loading, error, fallback, onRetry, emptyText }) {
  const meInList = board.some(e => e.is_me)
  return (
    <section className={s.board} aria-label="Rankings" aria-busy={loading}>
      <div className={s.cols} aria-hidden="true">
        <span style={{ textAlign: 'center' }}>#</span>
        <span>Student</span>
        <span>Level</span>
        <span>XP</span>
        <span className={s.col5}>Avg. Score</span>
        <span className={s.col6}>Questions</span>
      </div>

      {isGuest ? <GuestCard /> : me && <MeCard me={me} board={board} period={period} />}

      {fallback && !loading && board.length > 0 && (
        <p className={s.notice}>Nobody has practised {PERIOD_WORD[period]} yet, so this shows all-time XP.</p>
      )}

      {loading && !board.length ? (
        <ul className={s.list} aria-label="Loading rankings">
          {Array.from({ length: 6 }, (_, i) => <li key={i} className={s.skel} />)}
        </ul>
      ) : error ? (
        <div className={s.empty}>
          <p className={s.emptyTitle}>Couldn’t load the leaderboard</p>
          <p className={s.emptyBody}>Check your connection, then try again.</p>
          <button type="button" className={s.primaryBtn} onClick={onRetry}>Try again</button>
        </div>
      ) : !board.length ? (
        <div className={s.empty}>
          <p className={s.emptyTitle}>No rankings yet</p>
          <p className={s.emptyBody}>{emptyText}</p>
          <Link href="/student/practice" className={s.primaryBtn}>Start practising</Link>
        </div>
      ) : (
        <ol className={s.list}>
          {board.map(entry => <li key={entry.student_id}><Row entry={entry} /></li>)}
          {!meInList && me?.rank && (
            <>
              <li className={s.gap} aria-hidden="true">•••</li>
              <li><Row entry={me} /></li>
            </>
          )}
        </ol>
      )}
    </section>
  )
}

// ── Invite banner ────────────────────────────────────────────────────────────
function Kids() {
  return (
    <svg aria-hidden="true" width="104" height="58" viewBox="0 0 104 58">
      <ellipse cx="52" cy="56" rx="50" ry="3" fill="#1264E5" opacity=".08" />
      {[[22, '#F59E0B', '#7C2D12', 10], [52, '#1264E5', '#3F2A1D', 13], [82, '#22C55E', '#5B3A24', 10]].map(([x, shirt, skin, r]) => (
        <g key={x}>
          <path d={`M${x - r * 1.6} 56c0-${r * 2} ${r * 0.8}-${r * 2.6} ${r * 1.6}-${r * 2.6}s${r * 1.6} ${r * 0.6} ${r * 1.6} ${r * 2.6}z`} fill={shirt} />
          <circle cx={x} cy={56 - r * 3.4} r={r} fill={skin} />
          <path d={`M${x - r} ${56 - r * 3.6}a${r} ${r} 0 01${r * 2} 0c-.6-${r * 0.9}-${r * 1.6}-${r * 1.1}-${r}-${r * 1.1}s-${r * 1.4} .2-${r} ${r * 1.1}z`} fill="#1F130B" />
        </g>
      ))}
    </svg>
  )
}

export function InviteBanner() {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" className={s.invite} onClick={() => shareInvite(() => { setCopied(true); setTimeout(() => setCopied(false), 2800) })}>
      <Kids />
      <span aria-live="polite">{copied ? 'Invite copied. Send it to your friends!' : 'Invite friends to climb the leaderboard together!'}</span>
      <span className={s.inviteArrow}><ArrowRight size={20} /></span>
    </button>
  )
}

export { s as styles }
