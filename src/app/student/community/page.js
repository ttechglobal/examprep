'use client'
// src/app/student/community/page.js
// Changes:
// 1. APP_URL uses window.location.origin client-side — no localhost in links
// 2. Tabs redesigned: full-width pill strip, compact but well-designed, max visual space for leaderboard
// 3. Leaderboard as focal point — class/school name compact inline, not a full section
// 4. Top 10 / Top 20 toggle built into LeaderboardList
// 5. Full dark mode compliance throughout

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Dynamically use real deployed origin client-side, never localhost in production
function getAppUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://examprep.ng'
}

function rankMedal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

function formatPeriod(start, end) {
  if (!start || !end) return ''
  const s = new Date(start), e = new Date(end)
  return `${s.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

function daysUntil(dateStr) {
  return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000))
}

const BACKDROP = 'fixed inset-0 z-[200] flex flex-col'
const BACKDROP_STYLE = { background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }
const SHEET = 'mt-auto bg-card rounded-t-3xl w-full max-w-lg mx-auto shadow-2xl pb-24'

// ─── Leaderboard row ────────────────────────────────────────────────────────
function LeaderboardRow({ entry, rank, isMe }) {
  const medal = rankMedal(rank)
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
      isMe
        ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
        : 'bg-card border border-default hover:bg-subtle'
    }`}>
      <div className="w-8 text-center flex-shrink-0">
        {medal
          ? <span className="text-xl leading-none">{medal}</span>
          : <span className="text-sm font-black text-tertiary tabular-nums">#{rank}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${
          isMe ? 'text-indigo-700 dark:text-indigo-300' : 'text-primary'
        }`}>
          {isMe ? `${entry.first_name} (you)` : entry.first_name}
        </p>
        {entry.cohort_name && (
          <p className="text-xs text-tertiary mt-0.5 truncate">{entry.cohort_name}</p>
        )}
      </div>
      <div className={`text-sm font-black tabular-nums flex-shrink-0 ${
        rank === 1 ? 'text-amber-500' :
        rank <= 3  ? 'text-indigo-600 dark:text-indigo-400' :
        isMe       ? 'text-indigo-500' : 'text-secondary'
      }`}>
        {entry.points.toLocaleString()} pts
      </div>
    </div>
  )
}

function EmptyLeaderboard({ message = 'No activity yet this period' }) {
  return (
    <div className="bg-card border border-default rounded-2xl p-8 text-center">
      <p className="text-3xl mb-3">🏁</p>
      <p className="font-bold text-primary mb-1">{message}</p>
      <p className="text-sm text-secondary leading-relaxed">Complete lessons and practice questions to earn points and climb the board!</p>
    </div>
  )
}

// ─── Leaderboard list with Top 10/20 toggle ─────────────────────────────────
function LeaderboardList({ entries, userId, emptyMessage }) {
  const [limit, setLimit] = useState(10)
  if (!entries.length) return <EmptyLeaderboard message={emptyMessage} />

  const shown = entries.slice(0, limit)
  const myEntry = entries.find(e => e.student_id === userId)
  const myRankInFull = entries.findIndex(e => e.student_id === userId) + 1
  const myIsVisible = myRankInFull > 0 && myRankInFull <= limit

  return (
    <div className="space-y-2">
      {/* Top 10 / Top 20 pill toggle */}
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-xs text-tertiary">{entries.length} participants</p>
        <div className="flex bg-subtle rounded-xl p-0.5 gap-0.5">
          {[10, 20].map(n => (
            <button key={n} onClick={() => setLimit(n)}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                limit === n ? 'bg-card text-primary shadow-sm' : 'text-secondary hover:text-primary'
              }`}>
              Top {n}
            </button>
          ))}
        </div>
      </div>

      {shown.map((entry, i) => (
        <LeaderboardRow key={entry.student_id} entry={entry} rank={i + 1} isMe={entry.student_id === userId} />
      ))}

      {/* Sticky "your rank" card if you're below the limit */}
      {myEntry && !myIsVisible && (
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <div className="flex-1 h-px bg-default" />
            <span className="text-xs text-tertiary">Your position</span>
            <div className="flex-1 h-px bg-default" />
          </div>
          <LeaderboardRow entry={myEntry} rank={myRankInFull} isMe={true} />
        </div>
      )}
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-16 bg-subtle rounded-2xl" />
      {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-subtle rounded-2xl" />)}
    </div>
  )
}

// ─── Period picker sheet ─────────────────────────────────────────────────────
function PeriodPicker({ periods, selected, onSelect, onClose }) {
  return (
    <div className={BACKDROP} style={BACKDROP_STYLE} onClick={onClose}>
      <div className={`${SHEET} max-h-[60vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-subtle" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
          <p className="font-black text-primary">Past periods</p>
          <button onClick={onClose} className="text-secondary hover:text-primary text-sm font-bold w-8 h-8 rounded-full bg-subtle flex items-center justify-center">✕</button>
        </div>
        <div className="overflow-y-auto p-3 space-y-1 flex-1">
          {periods.map(p => (
            <button key={p.start} onClick={() => { onSelect(p); onClose() }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                selected?.start === p.start
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700'
                  : 'hover:bg-subtle text-primary'
              }`}>
              {p.label}
            </button>
          ))}
          {periods.length === 0 && <p className="text-center text-sm text-secondary py-6">No past periods yet</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Share card sheet ────────────────────────────────────────────────────────
function ShareCard({ code, name, type, onClose }) {
  const [copied, setCopied] = useState(null)
  const appUrl = getAppUrl()
  const link   = `${appUrl}/join/${code}`
  const message = type === 'class'
    ? `Join ${name} on ExamPrep and let's prepare together! 🎉\n\nCode: ${code}\nOr tap: ${link}`
    : `Join ${name} on ExamPrep! 🏫\n\nCode: ${code}\nOr tap: ${link}`

  const copyText = async (text, key) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ text: message }) } catch {} }
    else { await copyText(message, 'share') }
  }

  return (
    <div className={BACKDROP} style={BACKDROP_STYLE} onClick={onClose}>
      <div className={SHEET} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-subtle" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <p className="font-black text-lg text-primary">Invite people</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="mx-5 mb-4 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 text-center">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">{type === 'class' ? 'Class code' : 'School code'}</p>
          <p className="text-5xl font-black text-indigo-700 dark:text-indigo-300 tracking-[0.2em] my-2">{code}</p>
          <p className="text-xs text-indigo-400 truncate">{name}</p>
        </div>
        <div className="px-5 pb-2 space-y-2.5">
          <button onClick={() => copyText(code, 'code')}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-subtle border border-default rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left">
            <span className="text-xl">🔢</span>
            <div className="flex-1">
              <p className="text-sm font-black text-primary">{copied === 'code' ? 'Copied!' : 'Copy Code'}</p>
              <p className="text-xs text-secondary">Share the 6-letter code</p>
            </div>
            {copied === 'code' && <span className="text-green-500 font-bold">✓</span>}
          </button>
          <button onClick={() => copyText(link, 'link')}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-subtle border border-default rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left">
            <span className="text-xl">🔗</span>
            <div className="flex-1">
              <p className="text-sm font-black text-primary">{copied === 'link' ? 'Copied!' : 'Copy Link'}</p>
              <p className="text-xs text-secondary truncate">{link}</p>
            </div>
            {copied === 'link' && <span className="text-green-500 font-bold">✓</span>}
          </button>
          <button onClick={share}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-indigo-600 rounded-2xl hover:bg-indigo-500 transition-colors text-left">
            <span className="text-xl">📤</span>
            <div className="flex-1">
              <p className="text-sm font-black text-white">{copied === 'share' ? 'Copied!' : 'Share Invite'}</p>
              <p className="text-xs text-indigo-200">Send a ready-made message</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Compact info bar above leaderboard ─────────────────────────────────────
function CompactInfoBar({ name, school, myRank, onShare, color = 'indigo' }) {
  const bg = color === 'emerald'
    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
    : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
  const text = color === 'emerald'
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-indigo-700 dark:text-indigo-400'

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${bg}`}>
      <div className="flex-1 min-w-0">
        {school && <p className="text-xs text-tertiary truncate">{school}</p>}
        <p className={`text-sm font-black truncate ${text}`}>{name}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {myRank && (
          <div className="text-right">
            <p className="text-xs text-tertiary">Your rank</p>
            <p className={`text-base font-black tabular-nums ${text}`}>#{myRank}</p>
          </div>
        )}
        {onShare && (
          <button onClick={onShare}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
              ${color === 'emerald'
                ? 'bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                : 'bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/60'}`}>
            <svg className={`w-4 h-4 ${text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Join by code form ───────────────────────────────────────────────────────
function JoinByCodeForm({ type, onJoined, onCancel }) {
  const [code, setCode]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const endpoint = type === 'class' ? '/api/class/join' : '/api/school/join'

  const handleJoin = async () => {
    if (!code.trim()) return
    setLoading(true); setError(null)
    const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invite_code: code.trim().toUpperCase() }) })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onJoined(data)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder={type === 'class' ? 'Class code' : 'School code'}
          maxLength={6} onKeyDown={e => e.key === 'Enter' && handleJoin()}
          className="flex-1 px-4 py-3 border border-default rounded-xl text-sm font-mono uppercase tracking-widest bg-card text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <button onClick={handleJoin} disabled={loading || code.length < 4}
          className="px-4 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
          {loading ? '…' : 'Join'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      <button onClick={onCancel} className="text-xs text-secondary hover:text-primary w-full text-center py-1 transition-colors">Cancel</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// PROTOTYPE-FAITHFUL SHARED VISUAL COMPONENTS
// These match prototype-v3 exactly: my-rank-card, podium, lb-rows
// ═══════════════════════════════════════════════════════════════

// ── My rank card (dark gradient, different accent per tab) ────────────────────
function MyRankCard({ rank, total, pts, ptsChange, label, accentColor, accentBorder, icon }) {
  return (
    <div style={{
      borderRadius: 16,
      background: accentColor,
      border: `1px solid ${accentBorder}`,
      padding: '13px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'rgba(255,255,255,.4)', marginBottom: 2 }}>
          {label}
        </p>
        {rank ? (
          <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>
            #{rank.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>of {total?.toLocaleString()}</span>
          </p>
        ) : (
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>Not ranked yet</p>
        )}
      </div>
      {pts != null && (
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 17, fontWeight: 900, color: 'rgba(255,255,255,.9)' }}>{pts.toLocaleString()}</p>
          {ptsChange != null && <p style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>+{ptsChange} pts</p>}
        </div>
      )}
    </div>
  )
}

// ── Podium — top 3 only, height-proportional blocks ─────────────────────────
function ProtoPodium({ entries, userId }) {
  if (!entries || entries.length < 3) return null
  // Order: 2nd left, 1st centre, 3rd right
  const slots = [
    { entry: entries[1], medal: '🥈', height: 46, size: 42, borderColor: '#c0c0c0', bg: 'rgba(192,192,192,.12)' },
    { entry: entries[0], medal: '🥇', height: 66, size: 50, borderColor: '#ffd700', bg: 'rgba(255,215,0,.13)', crown: '👑' },
    { entry: entries[2], medal: '🥉', height: 34, size: 38, borderColor: '#cd7f32', bg: 'rgba(205,127,50,.12)' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, padding: '14px 10px 0' }}>
      {slots.map(({ entry, medal, height, size, borderColor, bg, crown }, i) => {
        if (!entry) return <div key={i} style={{ flex: 1 }} />
        const isMe = entry.student_id === userId
        const initial = entry.first_name?.[0] ?? (entry.full_name?.[0] ?? '?')
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
            {crown && <span style={{ fontSize: 15, marginBottom: 2 }}>{crown}</span>}
            {!crown && <div style={{ height: 19 }} />}
            <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${isMe ? 'var(--indigo-bd)' : borderColor}`, background: isMe ? 'var(--indigo-bg)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.38), fontWeight: 900, color: isMe ? 'var(--indigo)' : 'var(--text-prim)' }}>
              {initial}
            </div>
            <p style={{ fontSize: 10, fontWeight: i === 1 ? 900 : 700, color: isMe ? 'var(--indigo)' : 'var(--text-prim)', textAlign: 'center', lineHeight: 1.2, marginTop: 3 }}>
              {isMe ? 'You' : (entry.first_name ?? entry.full_name ?? '—')}
            </p>
            <p style={{ fontSize: 9, color: i === 1 ? 'var(--gold)' : 'var(--text-tert)', textAlign: 'center' }}>
              {entry.points?.toLocaleString()}
            </p>
            <div style={{ borderRadius: '10px 10px 0 0', width: '100%', height, background: i === 1 ? 'rgba(255,215,0,.1)' : i === 0 ? 'rgba(192,192,192,.1)' : 'rgba(205,127,50,.1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6 }}>
              <span style={{ fontSize: i === 1 ? 21 : i === 0 ? 17 : 15 }}>{medal}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Compact lb-rows below podium ─────────────────────────────────────────────
function ProtoLbRow({ entry, rank, isMe }) {
  const initial = entry.first_name?.[0] ?? entry.full_name?.[0] ?? '?'
  const subText = entry.cohort_name || entry.state || (entry.points_change != null ? `+${entry.points_change} this week` : null)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '9px 11px', borderRadius: 13,
      background: isMe ? 'var(--indigo-bg)' : 'var(--bg-subtle)',
      border: `1px solid ${isMe ? 'var(--indigo-bd)' : 'var(--border)'}`,
    }}>
      <span style={{ width: 24, textAlign: 'center', fontSize: 11, fontWeight: 800, color: isMe ? 'var(--indigo)' : 'var(--text-tert)', flexShrink: 0 }}>
        #{rank}
      </span>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: isMe ? 'var(--indigo-bg)' : 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: isMe ? 'var(--indigo)' : 'var(--text-prim)', flexShrink: 0 }}>
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: isMe ? 800 : 700, color: isMe ? 'var(--indigo)' : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isMe ? 'You' : (entry.first_name ?? entry.full_name ?? '—')}
        </p>
        {subText && <p style={{ fontSize: 9, color: 'var(--text-tert)' }}>{subText}</p>}
      </div>
      <span style={{ fontSize: 12, fontWeight: 900, color: isMe ? 'var(--indigo)' : 'var(--text-sec)', flexShrink: 0 }}>
        {entry.points?.toLocaleString()}
      </span>
    </div>
  )
}

// ── Leaderboard card: podium + rows ─────────────────────────────────────────
function ProtoLeaderboardCard({ entries, userId, title, headerRight, emptyMsg }) {
  if (!entries?.length) return (
    <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '28px 20px', textAlign: 'center' }}>
      <p style={{ fontSize: 28, marginBottom: 8 }}>🏁</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{emptyMsg ?? 'No activity yet'}</p>
    </div>
  )

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3, 8)
  const myIdx = entries.findIndex(e => e.student_id === userId)
  const myEntry = myIdx >= 0 ? entries[myIdx] : null
  const myInRest = myIdx >= 3 && myIdx < 8

  return (
    <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 13px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>{title}</p>
        {headerRight}
      </div>
      <ProtoPodium entries={top3} userId={userId} />
      <div style={{ padding: '8px 10px 11px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rest.map((entry, i) => (
          <ProtoLbRow key={entry.student_id} entry={entry} rank={i + 4} isMe={entry.student_id === userId} />
        ))}
        {/* Show your row below a separator if you're outside top 8 */}
        {myEntry && myIdx >= 8 && (
          <>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tert)', textAlign: 'center', padding: '4px 0' }}>· · ·</p>
            <ProtoLbRow entry={myEntry} rank={myIdx + 1} isMe={true} />
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CLASS TAB — prototype design, existing data logic
// ═══════════════════════════════════════════════════════════════
function ClassTab({ userId, profile, onProfileChange }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [classData,   setClassData]   = useState(null)
  const [myRank,      setMyRank]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [periods,     setPeriods]     = useState([])
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showShare,  setShowShare]  = useState(false)
  const [showJoin,   setShowJoin]   = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async (period = null) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (period) { params.set('period_start', period.start); params.set('period_end', period.end) }
    const [lbRes, pRes] = await Promise.all([
      fetch(`/api/leaderboard/class?${params}`),
      fetch('/api/leaderboard/periods'),
    ])
    const [lb, p] = await Promise.all([lbRes.json(), pRes.json()])
    setLeaderboard(lb.leaderboard ?? [])
    setClassData(lb.class ?? null)
    setMyRank(lb.my_rank ?? null)
    setPeriods(p.past ?? [])
    setCurrentPeriod(p.current ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const activePeriod = selectedPeriod ?? currentPeriod
  const myEntry      = leaderboard.find(e => e.student_id === userId)

  if (loading) return <TabSkeleton />

  if (!profile?.class_id) {
    return (
      <div className="space-y-4">
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 18px', background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: 6 }}>👥</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Join a class</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.55 }}>Enter your class invite code to compete with classmates.</p>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {showJoin ? (
              <JoinByCodeForm type="class" onJoined={() => { setShowJoin(false); window.location.reload() }} onCancel={() => setShowJoin(false)} />
            ) : (
              <>
                <button onClick={() => setShowJoin(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' }}>Enter class code</button>
                <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Create a class</button>
              </>
            )}
          </div>
        </div>
        {showCreate && <CreateClassModal onCreated={() => { setShowCreate(false); window.location.reload() }} onClose={() => setShowCreate(false)} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {showShare && classData && <ShareCard code={classData.invite_code} name={classData.name} type="class" onClose={() => setShowShare(false)} />}
      {showPicker && <PeriodPicker periods={periods} selected={selectedPeriod} onSelect={p => { setSelectedPeriod(p); load(p) }} onClose={() => setShowPicker(false)} />}

      {/* My rank card — indigo gradient */}
      <MyRankCard
        rank={myRank} total={leaderboard.length || undefined}
        pts={myEntry?.points}
        ptsChange={myEntry?.points_change}
        label={`${classData?.name ?? '—'} · This week`}
        accentColor="linear-gradient(135deg,#0b1330 0%,#1e1b4b 100%)"
        accentBorder="rgba(129,140,248,.3)"
        icon="😊"
      />

      {/* Period label + share */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-sec)' }}>
          {selectedPeriod ? selectedPeriod.label : (activePeriod ? formatPeriod(activePeriod.start, activePeriod.end) : 'This period')}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowShare(true)} style={{ fontSize: 10, fontWeight: 700, color: 'var(--indigo)', background: 'none', border: 'none', cursor: 'pointer' }}>Share code</button>
          <button onClick={() => setShowPicker(true)} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)', background: 'none', border: 'none', cursor: 'pointer' }}>Past results ↓</button>
        </div>
      </div>

      {/* Leaderboard card */}
      <ProtoLeaderboardCard
        entries={leaderboard}
        userId={userId}
        title="Weekly leaderboard"
        headerRight={
          <button style={{ padding: '3px 8px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--bg-card)', fontSize: 9, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer' }}
            onClick={() => setShowPicker(true)}>This week ▾</button>
        }
        emptyMsg="No class activity yet"
      />

      {/* Most improved — surface if available */}
      {leaderboard.length > 3 && (() => {
        const sorted = [...leaderboard].sort((a, b) => (b.points_change ?? 0) - (a.points_change ?? 0))
        const top = sorted[0]
        if (!top || top.student_id === userId) return null
        return (
          <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {top.first_name?.[0] ?? '?'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>{top.first_name} — Most improved 🔥</p>
              <p style={{ fontSize: 10, color: 'var(--success)' }}>↑ +{top.points_change ?? 0} pts this week</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SCHOOL TAB — same design language as Class, emerald accent
// ═══════════════════════════════════════════════════════════════
function SchoolTab({ userId, profile }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [cohortData,  setCohortData]  = useState(null)
  const [myRank,      setMyRank]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [scope,       setScope]       = useState('cohort')
  const [periods,     setPeriods]     = useState([])
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showShare,  setShowShare]  = useState(false)
  const [showJoin,   setShowJoin]   = useState(false)
  const [showRequest, setShowRequest] = useState(false)

  const load = useCallback(async (s = scope, period = null) => {
    setLoading(true)
    const params = new URLSearchParams({ scope: s })
    if (period) { params.set('period_start', period.start); params.set('period_end', period.end) }
    const [lbRes, pRes] = await Promise.all([
      fetch(`/api/leaderboard/cohort?${params}`),
      fetch('/api/leaderboard/periods'),
    ])
    const [lb, p] = await Promise.all([lbRes.json(), pRes.json()])
    setLeaderboard(lb.leaderboard ?? [])
    setCohortData(lb.cohort ?? null)
    setMyRank(lb.my_rank ?? null)
    setPeriods(p.past ?? [])
    setCurrentPeriod(p.current ?? null)
    setLoading(false)
  }, [scope])

  useEffect(() => { load() }, [load])

  const myEntry = leaderboard.find(e => e.student_id === userId)

  if (loading) return <TabSkeleton />

  if (!profile?.cohort_id) {
    return (
      <div className="space-y-4">
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 18px', background: 'linear-gradient(135deg,#059669 0%,#0d9488 100%)', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: 6 }}>🏫</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Connect to your school</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.55 }}>Ask your teacher for your school invite code.</p>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {showJoin ? (
              <JoinByCodeForm type="school" onJoined={() => { setShowJoin(false); window.location.reload() }} onCancel={() => setShowJoin(false)} />
            ) : (
              <>
                <button onClick={() => setShowJoin(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#059669', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' }}>Enter school code</button>
                <button onClick={() => setShowRequest(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>My school doesn't have a code yet</button>
              </>
            )}
          </div>
        </div>
        {showRequest && <SchoolRequestModal userId={userId} onClose={() => setShowRequest(false)} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {showShare && cohortData && <ShareCard code={cohortData.invite_code} name={`${cohortData.schools?.name ?? ''} · ${cohortData.name}`} type="cohort" onClose={() => setShowShare(false)} />}
      {showPicker && <PeriodPicker periods={periods} selected={selectedPeriod} onSelect={p => { setSelectedPeriod(p); load(scope, p) }} onClose={() => setShowPicker(false)} />}

      {/* My rank — emerald gradient */}
      <MyRankCard
        rank={myRank} total={leaderboard.length || undefined}
        pts={myEntry?.points}
        ptsChange={myEntry?.points_change}
        label={`${cohortData?.schools?.name ?? 'Your school'} · Whole school`}
        accentColor="linear-gradient(135deg,#052e16 0%,#064e3b 100%)"
        accentBorder="rgba(52,211,153,.3)"
        icon="🏫"
      />

      {/* Cohort / Whole school toggle */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', borderRadius: 12, padding: 3 }}>
        {[['cohort','My cohort'],['school','Whole school']].map(([val, lbl]) => (
          <button key={val} onClick={() => { setScope(val); setSelectedPeriod(null); load(val, null) }}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all .15s', background: scope === val ? 'var(--bg-card)' : 'transparent', color: scope === val ? 'var(--text-prim)' : 'var(--text-tert)' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Leaderboard card */}
      <ProtoLeaderboardCard
        entries={leaderboard}
        userId={userId}
        title="School leaderboard"
        headerRight={
          <button style={{ padding: '3px 8px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--bg-card)', fontSize: 9, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer' }}
            onClick={() => setShowPicker(true)}>This week ▾</button>
        }
        emptyMsg="No school activity yet"
      />

      {/* Inter-school tournament teaser */}
      <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid rgba(99,102,241,.3)', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>🏟️</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>Inter-school Tournament</p>
          <p style={{ fontSize: 10, color: 'var(--text-sec)' }}>{cohortData?.schools?.name ?? 'Your school'} vs other schools</p>
        </div>
        <button style={{ padding: '4px 10px', borderRadius: 999, border: '1.5px solid var(--indigo-bd)', background: 'var(--indigo-bg)', fontSize: 9, fontWeight: 700, color: 'var(--indigo)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Details</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL TAB — National leaderboard + Challenges, purple accent
// ═══════════════════════════════════════════════════════════════
function GlobalTab({ userId }) {
  const [period,    setPeriod]    = useState('week')
  const [lb,        setLb]        = useState([])
  const [surround,  setSurround]  = useState([])
  const [myRank,    setMyRank]    = useState(null)
  const [myEntry,   setMyEntry]   = useState(null)
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [challenge, setChallenge] = useState(null)
  const [upcoming,  setUpcoming]  = useState([])
  const [pastWins,  setPastWins]  = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [lbRes, chalRes] = await Promise.all([
        fetch(`/api/leaderboard/global?period=${period}&limit=20`),
        fetch('/api/challenges'),
      ])
      const [lbData, chalData] = await Promise.all([lbRes.json(), chalRes.json()])
      setLb(lbData.leaderboard ?? [])
      setSurround(lbData.surround ?? [])
      setMyRank(lbData.my_rank ?? null)
      setMyEntry(lbData.my_entry ?? null)
      setTotal(lbData.total_count ?? 0)
      setChallenge(chalData.active ?? null)
      setUpcoming(chalData.upcoming ?? [])
      setPastWins(chalData.past ?? [])
      setLoading(false)
    }
    load()
  }, [period])

  if (loading) return <TabSkeleton />

  const topPct = myRank && total ? Math.round((myRank / total) * 100) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* My global rank — deep purple gradient */}
      <MyRankCard
        rank={myRank} total={total}
        pts={null}
        label={`Nationwide · ${total.toLocaleString()} students`}
        accentColor="linear-gradient(135deg,#0b0a1a 0%,#1a1040 100%)"
        accentBorder="rgba(167,139,250,.3)"
        icon="🌍"
      >
        {topPct != null && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#c4b5fd' }}>Top {topPct}%</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>nationwide</p>
          </div>
        )}
      </MyRankCard>

      {/* Active challenge banner */}
      {challenge && (
        <div style={{ borderRadius: 16, background: 'linear-gradient(135deg,#1a1200 0%,#251a00 100%)', border: '1px solid rgba(251,191,36,.28)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(251,191,36,.14)', border: '1px solid rgba(251,191,36,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'rgba(255,255,255,.38)', marginBottom: 2 }}>
                Active challenge · {Math.max(0, Math.ceil((new Date(challenge.ends_at) - Date.now()) / 86400000))}d left
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>{challenge.title}</p>
            </div>
            {challenge.my_entry && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 17, fontWeight: 900, color: '#fbbf24' }}>{challenge.my_entry.questions_completed}</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,.28)' }}>/ {challenge.target_count}</p>
              </div>
            )}
          </div>
          {challenge.my_entry && (
            <div style={{ padding: '0 13px 12px' }}>
              <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: 99, width: `${Math.min(100, Math.round((challenge.my_entry.questions_completed / challenge.target_count) * 100))}%`, transition: 'width .7s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{challenge.prize_description}</span>
                {challenge.my_entry.rank && <span style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24' }}>You're #{challenge.my_entry.rank}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* National leaderboard card */}
      <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 13px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>🌍 National leaderboard</p>
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', borderRadius: 10, padding: 2 }}>
            {[['week','This week'],['alltime','All time']].map(([val, lbl]) => (
              <button key={val} onClick={() => setPeriod(val)}
                style={{ padding: '3px 7px', borderRadius: 8, fontSize: 9, fontWeight: 700, border: 'none', cursor: 'pointer', background: period === val ? 'var(--bg-card)' : 'transparent', color: period === val ? 'var(--text-prim)' : 'var(--text-tert)', transition: 'all .15s' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {lb.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🌍</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>Be the first to compete nationwide!</p>
          </div>
        ) : (
          <>
            <ProtoPodium entries={lb.slice(0, 3)} userId={userId} />
            <div style={{ padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {lb.slice(3, 10).map((entry, i) => (
                <ProtoLbRow key={entry.student_id} entry={entry} rank={i + 4} isMe={entry.student_id === userId} />
              ))}
              {/* Gap + surrounding rows */}
              {surround.length > 0 && (
                <>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tert)', textAlign: 'center', padding: '4px 0' }}>· · ·</p>
                  {surround.map(entry => (
                    <ProtoLbRow key={entry.student_id} entry={entry} rank={entry.rank} isMe={entry.student_id === userId} />
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Upcoming challenges */}
      {upcoming.length > 0 && (
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>Coming up</p>
          </div>
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {upcoming.map(ch => (
              <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--indigo-bg)', border: '1px solid var(--indigo-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                  {ch.type === 'school' ? '🏟️' : ch.subject ? '🧪' : '⚡'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>{ch.title}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-tert)' }}>
                    {new Date(ch.starts_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} · {ch.target_count} questions
                  </p>
                </div>
                <button style={{ padding: '4px 9px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 9, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Details</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past wins */}
      {pastWins.length > 0 && (
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {pastWins.map((ch, i) => (
            <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderBottom: i < pastWins.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{ch.my_entry?.rank === 1 ? '🥇' : ch.my_entry?.rank === 2 ? '🥈' : ch.my_entry?.rank === 3 ? '🥉' : '🏅'}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>{ch.title}</p>
                <p style={{ fontSize: 10, color: 'var(--success)' }}>
                  {ch.my_entry?.rank ? `Finished #${ch.my_entry.rank}` : 'Participated'}{ch.prize_description ? ` · ${ch.prize_description}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE — Class · School · Global  (prototype tab-strip design)
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { id: 'class',  label: 'Class',  icon: '👥' },
  { id: 'school', label: 'School', icon: '🏫' },
  { id: 'global', label: 'Global', icon: '🌍' },
]

export default function CommunityPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [user,      setUser]      = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('class')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, cohort_id, class_id, cohorts(id, name, session, invite_code, schools(name, city))')
        .eq('id', user.id).single()
      setProfile(prof)
      if (prof?.cohort_id && !prof?.class_id) setActiveTab('school')
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Days until week reset (next Monday)
  const now = new Date()
  const daysToMonday = (7 - now.getDay() + 1) % 7 || 7
  const hoursRem = 24 - now.getHours()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.2, color: 'var(--text-prim)' }}>Community 🏆</h1>
          <p style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 2, lineHeight: 1.55 }}>Compete · Climb · Improve</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tert)' }}>Week resets in</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--warning)' }}>{daysToMonday}d {hoursRem}h</p>
        </div>
      </div>

      {/* Tab strip — matches prototype tab-strip exactly */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', borderRadius: 14, padding: 3 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: 11, fontSize: 11, fontWeight: 800,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'all .18s',
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-prim)' : 'var(--text-tert)',
              boxShadow: activeTab === tab.id ? '0 1px 6px rgba(0,0,0,.1)' : 'none',
            }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'class'  && <ClassTab  userId={user?.id} profile={profile} onProfileChange={setProfile} />}
      {activeTab === 'school' && <SchoolTab userId={user?.id} profile={profile} />}
      {activeTab === 'global' && <GlobalTab userId={user?.id} />}
    </div>
  )
}