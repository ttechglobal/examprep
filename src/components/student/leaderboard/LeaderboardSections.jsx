'use client'
// src/components/student/leaderboard/LeaderboardSections.jsx — v2
// ─────────────────────────────────────────────────────────────────────────────
// Presentational pieces of the leaderboard page. Data and state live in
// app/student/leaderboard/page.js. Styles: ./leaderboard.module.css.
//
//   ScopeToggle    National | My School
//   PeriodTabs     This Week · Last Week · This Month · All Time
//   ChampionsHero  last week's top 3 on a podium
//   Board          the rankings table
//   InviteBanner   share an invite link
//
// v2: new design. National / My School is a two-button toggle (was a
//     dropdown). The champions hero shows last week only; older weeks live on
//     the Hall of Champions page, so the carousel arrows and dots are gone.
//     The student's own row is highlighted in the list; when they're outside
//     the list it sticks to the bottom of the board (was a card pinned on top).
//     Podium and invite art sit on CSS fallbacks, so a missing or offline
//     image no longer leaves an empty pedestal.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { useState } from 'react'
import s from './leaderboard.module.css'
import { ArrowRight, Trophy, Crown, NigeriaFlag, SchoolIcon, LevelBadge, RankCoin } from './icons'
import LazyImage from '@/components/ui/LazyImage'
import { shareInvite } from '@/components/student/InviteFriendsCard'
import { HERO_BG, PODIUM_IMAGES, AVATAR_RIM_OFFSET, INVITE_IMAGE } from './art'
import { avatarLook } from '@/lib/leaderboard/avatar'
import JoinSchool from '@/components/student/JoinSchool'

const cx = (...names) => names.filter(Boolean).join(' ')

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ entry }) {
  const look = avatarLook(entry)
  return (
    <span className={s.avatar} style={{ background: look.background, color: look.color }} aria-hidden="true">
      {look.text}
    </span>
  )
}

// ── National | My School ─────────────────────────────────────────────────────
// Both tabs always switch the page; without a linked school, "My School"
// shows SchoolGate in place of the board.
export function ScopeToggle({ scope, onChange }) {
  const options = [
    { key: 'national', label: 'National',  icon: <NigeriaFlag /> },
    { key: 'school',   label: 'My School', icon: <SchoolIcon /> },
  ]
  return (
    <div className={s.scope} role="group" aria-label="Leaderboard">
      {options.map(o => (
        <button
          key={o.key} type="button"
          className={s.scopeBtn}
          aria-pressed={scope === o.key}
          onClick={() => onChange(o.key)}
        >
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  )
}

// ── My School, before there is a school board ────────────────────────────────
// Stays on the page: guests are asked to sign in, signed-in students without a
// linked school connect one right here.
export function SchoolGate({ isGuest, profile, onLinked }) {
  return (
    <section className={cx(s.board, s.gate)} aria-label="My School leaderboard">
      <span className={s.gateIcon} aria-hidden="true"><SchoolIcon /></span>
      {isGuest ? (
        <>
          <p className={s.emptyTitle}>Sign in to join your school leaderboard</p>
          <p className={s.emptyBody}>See how you rank against your classmates and climb together.</p>
          <div className={s.gateActions}>
            <Link href="/onboarding?mode=signin&from=/student/leaderboard" className={s.primaryBtn}>Sign in</Link>
            <Link href="/onboarding?mode=signup" className={s.secondaryBtn}>Create a free account</Link>
          </div>
        </>
      ) : (
        <>
          <p className={s.emptyTitle}>Connect your school to join its leaderboard</p>
          <p className={s.emptyBody}>Enter the code from your teacher to see how you rank against your classmates.</p>
          <div className={s.gateForm}><JoinSchool profile={profile} onLinked={onLinked} compact /></div>
        </>
      )}
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
  // Arrow keys move between tabs (one tab stop for the whole row).
  function onKey(e) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = PERIOD_TABS.findIndex(t => t.key === period)
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

// ── Weekly Champions ─────────────────────────────────────────────────────────
const CONFETTI = [
  ['6%', '18%', '#3B82F6', '35deg'], ['46%', '12%', '#F59E0B', '-20deg'], ['52%', '72%', '#F59E0B', '50deg'],
  ['60%', '8%', '#93C5FD', '25deg'], ['78%', '14%', '#F97316', '-30deg'], ['92%', '12%', '#F59E0B', '40deg'],
  ['96%', '82%', '#3B82F6', '-45deg'], ['40%', '88%', '#3B82F6', '15deg'],
]

function Spot({ entry, place }) {
  const [artShown, setArtShown] = useState(false)
  return (
    <div className={s.spot} data-place={place}>
      <span className={s.spotAvatar} style={{ translate: `0 ${AVATAR_RIM_OFFSET[place] ?? 0}px` }} aria-hidden="true">
        {place === 1 && <span className={s.spotCrown}><Crown size={36} /></span>}
        {(entry?.name || '?').charAt(0).toUpperCase()}
        <span className={s.spotNum}>{place}</span>
      </span>
      {/* The gradient pedestal stays until the pedestal art has loaded. */}
      <div className={s.pedestal} data-art={artShown}>
        <LazyImage src={PODIUM_IMAGES[place]} className={s.pedestalImg} onLoaded={() => setArtShown(true)} />
        <span className={s.spotName}>{entry?.name ?? '—'}</span>
        <span className={s.spotXp}>{entry ? `${entry.xp.toLocaleString()} XP` : ''}</span>
      </div>
    </div>
  )
}

export function ChampionsHero({ dateLabel, entries, loading }) {
  const [first, second, third] = entries
  const summary = entries.length
    ? entries.map((e, i) => `${i + 1}. ${e.name}, ${e.xp.toLocaleString()} XP`).join('; ')
    : 'No champions last week'

  return (
    <section className={s.hero} aria-label="Weekly champions">
      <LazyImage src={HERO_BG} className={s.heroBg} />
      <div className={s.confetti} aria-hidden="true">
        {CONFETTI.map(([left, top, color, r], i) => <i key={i} style={{ left, top, background: color, '--r': r }} />)}
      </div>

      <div className={s.heroText}>
        <h2 className={s.heroTitle}>
          <Trophy size={44} />
          <span>Weekly <em>Champions</em></span>
        </h2>
        <p className={s.heroSub}>
          <span className={s.heroScope}>Top 3 students across Nigeria</span>
          <span>{dateLabel}</span>
        </p>
        <Link href="/student/leaderboard/hall" className={s.heroBtn}>
          View All Champions <ArrowRight />
        </Link>
      </div>

      {entries.length || loading ? (
        <div className={s.podium} aria-busy={loading} aria-label={summary} role="group">
          <Spot entry={second} place={2} />
          <Spot entry={first}  place={1} />
          <Spot entry={third}  place={3} />
        </div>
      ) : (
        <p className={s.heroEmpty}>Nobody earned XP last week. Practise now and this week’s podium could be yours.</p>
      )}

      <Link href="/student/leaderboard/hall" className={s.heroLink}>
        View all champions <ArrowRight size={14} />
      </Link>
    </section>
  )
}

// ── Rankings ─────────────────────────────────────────────────────────────────
// National: which school and where. School board: everyone shares a school,
// so show the class instead.
function metaOf(entry, scope) {
  const first = scope === 'school' ? entry.class_level : entry.school
  return [first, entry.location].filter(Boolean).join(' · ')
}

const PERIOD_WORD = { week: 'this week', lastWeek: 'last week', month: 'this month', all: '' }

/** One line of encouragement for the student's own row. */
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

function Row({ entry, scope, meta }) {
  const place = entry.rank
  return (
    <div className={s.row} data-me={entry.is_me || undefined}>
      <span className={s.rank}>
        {place >= 1 && place <= 3
          ? <><RankCoin place={place} /><span className="sr-only">{place}</span></>
          : place ?? '—'}
      </span>
      <span className={s.who}>
        <Avatar entry={entry} />
        <span style={{ minWidth: 0 }}>
          <span className={s.name}>
            {entry.name}
            {entry.is_me && <span className={s.youTag}>You</span>}
          </span>
          {(meta ?? metaOf(entry, scope)) && <span className={s.meta}>{meta ?? metaOf(entry, scope)}</span>}
        </span>
      </span>
      <span className={cx(s.level, s.colWide)}>
        <LevelBadge tier={entry.level_tier} numeral={entry.level_numeral} />
        {entry.level}
      </span>
      <span className={s.xp}>{entry.xp.toLocaleString()}</span>
      <span className={cx(s.score, s.colWide)}>{entry.accuracy == null ? '—' : `${entry.accuracy}%`}</span>
    </div>
  )
}

function GuestRow() {
  return (
    <div className={s.row} data-me>
      <span className={s.rank}>—</span>
      <span className={s.who}>
        <span className={cx(s.avatar, s.avatarEmpty)} aria-hidden="true">?</span>
        <span style={{ minWidth: 0 }}>
          <span className={s.name}>You’re not on the board yet</span>
          <span className={s.meta}>
            <Link href="/onboarding?mode=signup" className={s.guestCta}>Create a free account</Link> to get ranked.
          </span>
        </span>
      </span>
    </div>
  )
}

export function Board({ board, me, isGuest, scope, period, loading, error, fallback, onRetry, emptyText }) {
  const meInList = board.some(e => e.is_me)
  // The student's own row, when it isn't already in the list: stuck to the
  // bottom of the board so they always see where they stand. Guests get a
  // sign-up row at the end instead.
  const pinned = isGuest ? <GuestRow />
    : me && !meInList ? <Row entry={{ ...me, is_me: true }} scope={scope} meta={meMessage(me, board, period)} />
    : null

  return (
    <section className={s.board} aria-label="Rankings" aria-busy={loading}>
      <div className={s.cols} aria-hidden="true">
        <span className={s.rank}>#</span>
        <span>Student</span>
        <span className={s.colWide}>Level</span>
        <span className={s.xp}>XP</span>
        <span className={cx(s.score, s.colWide)}>Avg. Score</span>
      </div>

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
          {board.map(entry => <li key={entry.student_id}><Row entry={entry} scope={scope} /></li>)}
        </ol>
      )}

      {pinned && !error && <div className={cx(s.pinned, isGuest && s.pinnedStatic)}>{pinned}</div>}
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
  const [copied, setCopied]   = useState(false)
  const [artShown, setArtShown] = useState(false)
  return (
    <button type="button" className={s.invite} onClick={() => shareInvite(() => { setCopied(true); setTimeout(() => setCopied(false), 2800) })}>
      <span className={s.inviteArt}>
        {!artShown && <Kids />}
        <LazyImage src={INVITE_IMAGE} className={s.inviteImg} onLoaded={() => setArtShown(true)} />
      </span>
      <span className={s.inviteText} aria-live="polite">{copied ? 'Invite copied. Send it to your friends!' : 'Invite friends to climb the leaderboard together!'}</span>
      <span className={s.inviteArrow}><ArrowRight size={20} /></span>
    </button>
  )
}

export { s as styles }
