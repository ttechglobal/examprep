'use client'
// src/app/student/community/page.js — v5 full prototype redesign
// ─────────────────────────────────────────────────────────────────────────────
// Design matches prototype screenshot exactly:
//   • "This week" eyebrow + "Leaderboard" hero title + week-reset pill
//   • School badge pill (🏫 Kings College Lagos) below header
//   • Podium: 2nd left / 1st centre / 3rd right with height-proportional bars
//   • Leaderboard rows: rank number + coloured avatar + name + score
//   • "Your" row highlighted in violet, always visible
//   • Challenges section: active challenge with progress bar + monthly
//   • Invite friends: bottom CTA per tab
//
// Tabs: Class · School · National (renamed from Global)
// All tokens — zero --indigo, zero dark: dynamic Tailwind classes
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoachBanner from '@/components/ui/CoachBanner'
import { communityCoach } from '@/lib/coach'
import { usePoints } from '@/contexts/PointsContext'
import { useUser } from '@/contexts/UserContext'

function getAppUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://examprep.ng'
}
function rankMedal(r) { return r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : null }
function formatPeriod(s, e) {
  if (!s || !e) return ''
  return `${new Date(s).toLocaleDateString('en-GB',{month:'short',day:'numeric'})} – ${new Date(e).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`
}

// Deterministic avatar colour from initials
const AV_COLORS = ['#5cb8ea','#9b7ae0','#ff8fab','#6cce8e','#fbbf24','#f87171','#34d399','#818cf8']
const avColor = (name) => AV_COLORS[(name?.charCodeAt(0) ?? 0) % AV_COLORS.length]

// ── Shared atoms ──────────────────────────────────────────────────────────────
function SectionLabel({ children, color }) {
  return <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: color ?? 'var(--text-tert)' }}>{children}</p>
}

function Widget({ header, children }) {
  return (
    <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {header && <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{header}</div>}
      {children}
    </div>
  )
}

// ── Press CTA button ──────────────────────────────────────────────────────────
function PressBtn({ onClick, children, style = {}, variant = 'navy' }) {
  const [p, setP] = useState(false)
  const bg = variant === 'navy' ? '#0b1330' : variant === 'violet' ? '#9b7ae0' : 'var(--bg-subtle)'
  const sh = variant === 'ghost' ? 'none' : `0 ${p ? 2 : 5}px 0 ${variant === 'navy' ? '#05070f' : variant === 'violet' ? '#6d4ac0' : 'var(--bg-inset)'}`
  return (
    <button onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{ border: 'none', cursor: 'pointer', background: bg, color: variant === 'ghost' ? 'var(--text-sec)' : '#fff', fontWeight: 800, fontSize: 13, borderRadius: 14, transform: p ? 'translateY(3px)' : '', boxShadow: sh, transition: 'transform .1s, box-shadow .1s', letterSpacing: '-0.01em', ...style }}>
      {children}
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TabSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[80, 200, 56, 56, 56, 56].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 14, background: 'var(--bg-subtle)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  )
}

// ── Sheet backdrop ────────────────────────────────────────────────────────────
function Sheet({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 512, background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', borderTop: '1px solid var(--border)', paddingBottom: 40, boxShadow: '0 -16px 48px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--bg-inset)' }} />
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Period picker ─────────────────────────────────────────────────────────────
function PeriodPicker({ periods, selected, onSelect, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-prim)' }}>Past periods</p>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-sec)' }}>✕</button>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '50vh', overflowY: 'auto' }}>
        {periods.map(p => (
          <button key={p.start} onClick={() => { onSelect(p); onClose() }}
            style={{ width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: selected?.start === p.start ? '1.5px solid rgba(155,122,224,.3)' : '1px solid var(--border)', background: selected?.start === p.start ? 'rgba(155,122,224,.08)' : 'transparent', color: selected?.start === p.start ? '#9b7ae0' : 'var(--text-prim)' }}>
            {p.label}
          </button>
        ))}
        {periods.length === 0 && <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-sec)', padding: '24px 0' }}>No past periods yet</p>}
      </div>
    </Sheet>
  )
}

// ── Invite / Share sheet ──────────────────────────────────────────────────────
function InviteSheet({ code, name, type, onClose }) {
  const [copied, setCopied] = useState(null)
  const appUrl  = getAppUrl()
  const link    = `${appUrl}/join/${code}`
  const message = `Join ${name} on ExamPrep and let's prepare for ${type === 'class' ? 'our exams' : 'WAEC/JAMB'} together! 🎉\n\nCode: ${code}\nOr tap: ${link}`

  const copyText = async (text, key) => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ text: message }) } catch {} }
    else await copyText(message, 'share')
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-prim)' }}>Invite friends</p>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-sec)' }}>✕</button>
      </div>
      {/* Code display */}
      <div style={{ margin: '0 20px 14px', background: 'rgba(155,122,224,.1)', border: '1px solid rgba(155,122,224,.25)', borderRadius: 20, padding: '16px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9b7ae0', marginBottom: 6 }}>{type === 'class' ? 'Class code' : type === 'school' ? 'School code' : 'Invite code'}</p>
        <p style={{ fontSize: 40, fontWeight: 900, color: '#9b7ae0', letterSpacing: '0.2em', margin: '4px 0' }}>{code}</p>
        <p style={{ fontSize: 11, color: 'var(--text-tert)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { key: 'code',  icon: '🔢', label: copied === 'code'  ? 'Copied!' : 'Copy Code',   sub: 'Share the short code',       act: () => copyText(code, 'code') },
          { key: 'link',  icon: '🔗', label: copied === 'link'  ? 'Copied!' : 'Copy Link',   sub: link,                          act: () => copyText(link, 'link') },
          { key: 'share', icon: '📤', label: copied === 'share' ? 'Copied!' : 'Share Invite', sub: 'Send a ready-made message',  act: share, dark: true },
        ].map(b => (
          <button key={b.key} onClick={b.act} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: b.dark ? '#0b1330' : 'var(--bg-subtle)', border: b.dark ? 'none' : '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', boxShadow: b.dark ? '0 4px 0 #05070f' : 'none' }}>
            <span style={{ fontSize: 20 }}>{b.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: b.dark ? '#fff' : 'var(--text-prim)' }}>{b.label}</p>
              <p style={{ fontSize: 10, color: b.dark ? 'rgba(255,255,255,.45)' : 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.sub}</p>
            </div>
            {!b.dark && copied === b.key && <span style={{ color: 'var(--success)', fontWeight: 800 }}>✓</span>}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

// ── Join by code form ─────────────────────────────────────────────────────────
function JoinByCodeForm({ type, onJoined, onCancel }) {
  const [code, setCode]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const endpoint = type === 'class' ? '/api/class/join' : '/api/school/join'

  const handleJoin = async () => {
    if (!code.trim()) return
    setLoading(true); setError(null)
    const res  = await fetch(endpoint, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ invite_code: code.trim().toUpperCase() }) })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onJoined(data)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder={type === 'class' ? 'Class code' : 'School code'}
          maxLength={6} onKeyDown={e => e.key === 'Enter' && handleJoin()}
          style={{ flex: 1, padding: '11px 12px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-prim)', fontSize: 14, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.12em', outline: 'none' }} />
        <button onClick={handleJoin} disabled={loading || code.length < 4}
          style={{ padding: '11px 16px', borderRadius: 12, background: '#9b7ae0', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: (loading || code.length < 4) ? 0.4 : 1, boxShadow: '0 4px 0 #6d4ac0' }}>
          {loading ? '…' : 'Join'}
        </button>
      </div>
      {error && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</p>}
      <button onClick={onCancel} style={{ fontSize: 11, color: 'var(--text-sec)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'center' }}>Cancel</button>
    </div>
  )
}

// ── Empty join state ──────────────────────────────────────────────────────────
function JoinState({ icon, title, desc, accent, cta, secondaryCta, showJoin, onJoin, onCancel, onJoined, joinType, onSecondary }) {
  return (
    <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 20px', background: `linear-gradient(155deg,${accent}18 0%,${accent}06 100%)`, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ fontSize: 36, marginBottom: 10 }}>{icon}</p>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6, letterSpacing: '-0.01em' }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.6 }}>{desc}</p>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {showJoin ? (
          <JoinByCodeForm type={joinType} onJoined={onJoined} onCancel={onCancel} />
        ) : (
          <>
            <PressBtn onClick={onJoin} style={{ width: '100%', padding: '13px 0' }}>{cta}</PressBtn>
            {secondaryCta && (
              <button onClick={onSecondary} style={{ width: '100%', padding: '12px 0', borderRadius: 13, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {secondaryCta}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── School badge pill ─────────────────────────────────────────────────────────
function SchoolBadge({ name, onShare }) {
  if (!name) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(255,184,0,.1)', border: '1px solid rgba(255,184,0,.25)' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#FFB800' }}>🏫 {name}</span>
      </div>
      {onShare && (
        <button onClick={onShare} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, background: 'rgba(24,183,242,.1)', border: '1px solid rgba(24,183,242,.25)', fontSize: 11, fontWeight: 700, color: '#18B7F2', cursor: 'pointer' }}>
          Invite friends +
        </button>
      )}
    </div>
  )
}

// ── My rank card ──────────────────────────────────────────────────────────────
function MyRankCard({ rank, total, pts, ptsChange, label, gradient, border, icon, liveXP = 0 }) {
  return (
    <div style={{ borderRadius: 18, background: gradient, border: `1px solid ${border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'rgba(255,255,255,.38)', marginBottom: 3 }}>{label}</p>
        {rank ? (
          <p style={{ fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1 }}>
            #{rank.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.38)' }}>of {total?.toLocaleString()}</span>
          </p>
        ) : (
          <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>Not ranked yet — start practising!</p>
        )}
      </div>
      {(() => {
        const displayPts = (pts != null && pts > 0) ? pts : liveXP
        if (displayPts == null || displayPts < 0) return null
        return (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,.9)', lineHeight: 1 }}>{displayPts.toLocaleString()}</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{ptsChange != null && ptsChange > 0 ? `+${ptsChange} this week` : 'Total XP'}</p>
          </div>
        )
      })()}
    </div>
  )
}

// ── Podium — 2nd left, 1st centre, 3rd right ─────────────────────────────────
function Podium({ entries, userId }) {
  if (!entries || entries.length < 3) return null
  const slots = [
    { e: entries[1], rank: 2, medal: '🥈', h: 52, sz: 44, border: '#c0c0c0', bg: 'rgba(192,192,192,.1)',  label: '2ND' },
    { e: entries[0], rank: 1, medal: '🥇', h: 76, sz: 54, border: '#ffd700', bg: 'rgba(255,215,0,.12)',   label: '1ST', crown: '👑' },
    { e: entries[2], rank: 3, medal: '🥉', h: 38, sz: 40, border: '#cd7f32', bg: 'rgba(205,127,50,.1)',   label: '3RD' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '16px 12px 0' }}>
      {slots.map(({ e, rank, medal, h, sz, border, bg, label, crown }, i) => {
        if (!e) return <div key={i} style={{ flex: 1 }} />
        const isMe    = e.student_id === userId
        const initial = (e.first_name ?? e.full_name ?? '?')[0].toUpperCase()
        const avBg    = isMe ? '#9b7ae0' : avColor(e.first_name ?? e.full_name)
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
            {/* SVG crown for 1st place, invisible spacer for others */}
            {rank === 1 ? (
              <svg width="24" height="18" viewBox="0 0 24 18" fill="none" style={{ marginBottom: 2 }}>
                <path d="M2 14L5 5L10 10L12 3L14 10L19 5L22 14H2Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round"/>
                <rect x="2" y="14" width="20" height="3" rx="1.5" fill="#f59e0b"/>
                <circle cx="2" cy="5" r="1.5" fill="#fbbf24"/>
                <circle cx="12" cy="3" r="1.5" fill="#fbbf24"/>
                <circle cx="22" cy="5" r="1.5" fill="#fbbf24"/>
              </svg>
            ) : (
              <div style={{ height: 20, marginBottom: 2 }} />
            )}
            {/* Rank label */}
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.06em', color: rank === 1 ? '#fbbf24' : 'var(--text-tert)' }}>{label}</p>
            {/* Avatar */}
            <div style={{ width: sz, height: sz, borderRadius: '50%', background: avBg, border: `2px solid ${isMe ? 'rgba(155,122,224,.5)' : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(sz * 0.38), fontWeight: 900, color: '#fff', boxShadow: rank === 1 ? `0 0 0 3px ${border}40` : 'none' }}>
              {isMe ? 'YOU' : initial}
            </div>
            <p style={{ fontSize: rank === 1 ? 12 : 10, fontWeight: rank === 1 ? 900 : 700, color: isMe ? '#9b7ae0' : 'var(--text-prim)', textAlign: 'center', lineHeight: 1.2, marginTop: 2 }}>
              {isMe ? 'You' : (e.first_name ?? e.full_name ?? '—')}
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, color: rank === 1 ? '#fbbf24' : 'var(--text-tert)', textAlign: 'center' }}>
              {e.points?.toLocaleString()}
            </p>
            {/* Bar — top border for 1st place emphasis */}
            <div style={{ width: '100%', borderRadius: '8px 8px 0 0', height: h, background: bg, border: rank === 1 ? `1px solid ${border}30` : 'none', borderBottom: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8 }}>
              <span style={{ fontSize: rank === 1 ? 20 : rank === 2 ? 16 : 14 }}>{medal}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Leaderboard row ───────────────────────────────────────────────────────────
function LbRow({ entry, rank, userId }) {
  const isMe    = entry.student_id === userId
  const name    = entry.first_name ?? entry.full_name ?? '?'
  const initial = name[0].toUpperCase()
  const avBg    = isMe ? '#9b7ae0' : avColor(name)
  const sub     = entry.state || (
    entry.using_total ? 'Total XP' :
    (entry.points_change != null && entry.points_change > 0 ? `+${entry.points_change} this week` : null)
  )
  const medal   = rankMedal(rank)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14,
      background: isMe ? 'rgba(155,122,224,.08)' : 'transparent',
      border: `1px solid ${isMe ? 'rgba(155,122,224,.3)' : 'var(--border)'}`,
    }}>
      <div style={{ width: 26, textAlign: 'center', flexShrink: 0 }}>
        {medal ? <span style={{ fontSize: 16 }}>{medal}</span> : <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tert)' }}>#{rank}</span>}
      </div>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: isMe ? 'linear-gradient(135deg,#9b7ae0,#5cb8ea)' : avBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
        border: isMe ? '2px solid rgba(155,122,224,.4)' : 'none',
      }}>
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: isMe ? 800 : 600, color: isMe ? '#9b7ae0' : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isMe ? `You` : name}
        </p>
        {sub && <p style={{ fontSize: 10, color: 'var(--text-tert)' }}>{sub}</p>}
      </div>
      <span style={{ fontSize: 13, fontWeight: 900, color: isMe ? '#ffc36b' : 'var(--text-prim)', flexShrink: 0 }}>
        {entry.points?.toLocaleString()}
      </span>
    </div>
  )
}

// ── Full leaderboard card: podium + rows ──────────────────────────────────────
function LeaderboardCard({ entries, userId, title, headerRight, emptyMsg }) {
  if (!entries?.length) return (
    <Widget>
      <div style={{ padding: '28px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 10 }}>🏁</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 6 }}>{emptyMsg ?? 'No activity yet'}</p>
        <p style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.6 }}>Complete practice questions to earn points and climb the board!</p>
      </div>
    </Widget>
  )

  const showPodium = entries.length >= 3
  const top3       = entries.slice(0, 3)
  // Always show all rows — podium takes top 3 visually, rows show everyone ranked
  const rowEntries = showPodium ? entries.slice(0, Math.min(entries.length, 10)) : entries
  const myIdx      = entries.findIndex(e => e.student_id === userId)
  const myEntry    = myIdx >= 0 ? entries[myIdx] : null

  return (
    <Widget header={<><SectionLabel>{title}</SectionLabel>{headerRight}</>}>
      {showPodium && <Podium entries={top3} userId={userId} />}
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--text-tert)', marginBottom: 2 }}>All students</p>
        {rowEntries.map((e, i) => <LbRow key={e.student_id} entry={e} rank={i + 1} userId={userId} />)}
        {myEntry && myIdx >= 10 && (
          <>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tert)', textAlign: 'center', padding: '4px 0' }}>· · ·</p>
            <LbRow entry={myEntry} rank={myIdx + 1} userId={userId} />
          </>
        )}
      </div>
    </Widget>
  )
}

// ── Challenge card ────────────────────────────────────────────────────────────
function ChallengeCard({ challenge, type = 'weekly' }) {
  if (!challenge) return null
  const daysLeft  = Math.max(0, Math.ceil((new Date(challenge.ends_at) - Date.now()) / 86400000))
  const progress  = challenge.my_entry ? Math.min(100, Math.round((challenge.my_entry.questions_completed / challenge.target_count) * 100)) : 0
  const isMonthly = type === 'monthly'

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: isMonthly ? 'linear-gradient(155deg,#0d0d1a 0%,#1a0d2e 100%)' : 'linear-gradient(155deg,#1a1200 0%,#0d0a00 100%)', border: `1px solid ${isMonthly ? 'rgba(155,122,224,.28)' : 'rgba(251,191,36,.28)'}` }}>
      <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: isMonthly ? 'rgba(155,122,224,.15)' : 'rgba(251,191,36,.12)', border: `1px solid ${isMonthly ? 'rgba(155,122,224,.28)' : 'rgba(251,191,36,.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
          {isMonthly ? '🏆' : '⚡'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: isMonthly ? 'rgba(155,122,224,.6)' : 'rgba(251,191,36,.6)', marginBottom: 2 }}>
            🔥 {isMonthly ? 'Monthly challenge' : 'Weekly challenge'} · {daysLeft}d left
          </p>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{challenge.title}</p>
          {challenge.prize_description && <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>{challenge.prize_description}</p>}
        </div>
        {challenge.my_entry && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: isMonthly ? '#c4b5fd' : '#fbbf24', lineHeight: 1 }}>{challenge.my_entry.questions_completed}</p>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,.3)' }}>/ {challenge.target_count}</p>
          </div>
        )}
      </div>
      {challenge.my_entry && (() => {
        // Mini SVG progress ring — more visual than a flat bar
        const ringColor = isMonthly ? '#9b7ae0' : '#fbbf24'
        const r = 20, circ = 2 * Math.PI * r
        const dash = (progress / 100) * circ
        return (
          <div style={{ padding: '0 14px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Ring */}
            <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="6"/>
                <circle cx="26" cy="26" r={r} fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 26 26)"
                  style={{ transition: 'stroke-dasharray .7s ease' }}/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: ringColor }}>{progress}%</span>
              </div>
            </div>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {challenge.my_entry.questions_completed} / {challenge.target_count} questions
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
                {challenge.target_count - challenge.my_entry.questions_completed > 0
                  ? `${challenge.target_count - challenge.my_entry.questions_completed} more to claim prize`
                  : '🎉 Challenge complete!'}
              </p>
              {challenge.my_entry.rank && (
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 800, color: ringColor, background: `${ringColor}14`, border: `1px solid ${ringColor}28`, padding: '2px 7px', borderRadius: 999 }}>
                  You're #{challenge.my_entry.rank}
                </span>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ClassTab({ userId, profile, liveXP = 0 }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [classData,   setClassData]   = useState(null)
  const [myRank,      setMyRank]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [periods,     setPeriods]     = useState([])
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showJoin,   setShowJoin]   = useState(false)
  const [challenge,  setChallenge]  = useState(null)
  const [monthlyChallenge, setMonthlyChallenge] = useState(null)

  const load = useCallback(async (period = null) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (period) { params.set('period_start', period.start); params.set('period_end', period.end) }
    const [lbRes, pRes, chalRes] = await Promise.all([
      fetch(`/api/leaderboard/class?${params}`),
      fetch('/api/leaderboard/periods'),
      fetch('/api/challenges?scope=class'),
    ])
    const [lb, p, chal] = await Promise.all([lbRes.json(), pRes.json(), chalRes.json()])
    setLeaderboard(lb.leaderboard ?? [])
    setClassData(lb.class ?? null)
    setMyRank(lb.my_rank ?? null)
    setPeriods(p.past ?? [])
    setCurrentPeriod(p.current ?? null)
    setChallenge(chal.active ?? null)
    setMonthlyChallenge(chal.monthly ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <TabSkeleton />

  if (!profile?.class_id) return (
    <JoinState icon="👥" title="Join your class" accent="#9b7ae0"
      desc="Enter your class invite code to compete with your classmates on the leaderboard."
      cta="Enter class code" secondaryCta="Create a class"
      showJoin={showJoin} onJoin={() => setShowJoin(true)} onCancel={() => setShowJoin(false)}
      onJoined={() => window.location.reload()} joinType="class"
      onSecondary={() => {}} />
  )

  const activePeriod = selectedPeriod ?? currentPeriod
  const myEntry      = leaderboard.find(e => e.student_id === userId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {showInvite && classData && <InviteSheet code={classData.invite_code} name={classData.name} type="class" onClose={() => setShowInvite(false)} />}
      {showPicker && <PeriodPicker periods={periods} selected={selectedPeriod} onSelect={p => { setSelectedPeriod(p); load(p) }} onClose={() => setShowPicker(false)} />}

      {/* My rank */}
      <MyRankCard rank={myRank} total={leaderboard.length || undefined} pts={myEntry?.points} ptsChange={myEntry?.points_change}
        liveXP={liveXP}
        label={`${classData?.name ?? 'My class'} · This week`}
        gradient="linear-gradient(155deg,#0b1330 0%,#1e1b4b 100%)" border="rgba(155,122,224,.3)" icon="😊" />

      {/* School / class badge + invite */}
      <SchoolBadge name={classData?.name} onShare={() => setShowInvite(true)} />

      {/* Challenges */}
      <ChallengeCard challenge={challenge} type="weekly" />
      <ChallengeCard challenge={monthlyChallenge} type="monthly" />

      <LeaderboardCard entries={leaderboard} userId={userId} title="Class leaderboard"
        headerRight={<button onClick={() => setShowPicker(true)} style={{ padding: '3px 8px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 9, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer' }}>This week ▾</button>}
        emptyMsg="No class activity yet — start practising!" />

      {/* Most improved callout */}
      {leaderboard.length > 3 && (() => {
        const top = [...leaderboard].sort((a, b) => (b.points_change ?? 0) - (a.points_change ?? 0))[0]
        if (!top || top.student_id === userId) return null
        return (
          <div style={{ borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fbbf24', flexShrink: 0 }}>
              {(top.first_name ?? '?')[0]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>{top.first_name} — Most improved 🔥</p>
              <p style={{ fontSize: 10, color: '#4ade80' }}>+{top.points_change ?? 0} pts this week</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL TAB
// ─────────────────────────────────────────────────────────────────────────────
function SchoolTab({ userId, profile, liveXP = 0 }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [cohortData,  setCohortData]  = useState(null)
  const [myRank,      setMyRank]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [scope,       setScope]       = useState('cohort')
  const [periods,     setPeriods]     = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showPicker,  setShowPicker]  = useState(false)
  const [showInvite,  setShowInvite]  = useState(false)
  const [showJoin,    setShowJoin]    = useState(false)
  const [challenge,   setChallenge]   = useState(null)
  const [monthlyChallenge, setMonthlyChallenge] = useState(null)

  const load = useCallback(async (s = scope, period = null) => {
    setLoading(true)
    const params = new URLSearchParams({ scope: s })
    if (period) { params.set('period_start', period.start); params.set('period_end', period.end) }
    const [lbRes, pRes, chalRes] = await Promise.all([
      fetch(`/api/leaderboard/cohort?${params}`),
      fetch('/api/leaderboard/periods'),
      fetch('/api/challenges?scope=school'),
    ])
    const [lb, p, chal] = await Promise.all([lbRes.json(), pRes.json(), chalRes.json()])
    setLeaderboard(lb.leaderboard ?? [])
    setCohortData(lb.cohort ?? null)
    setMyRank(lb.my_rank ?? null)
    setPeriods(p.past ?? [])
    setChallenge(chal.active ?? null)
    setMonthlyChallenge(chal.monthly ?? null)
    setLoading(false)
  }, [scope])

  useEffect(() => { load() }, [load])

  if (loading) return <TabSkeleton />

  if (!profile?.cohort_id) return (
    <JoinState icon="🏫" title="Connect to your school" accent="#34d399"
      desc="Ask your teacher for the school invite code and join your school's leaderboard."
      cta="Enter school code" secondaryCta="My school isn't on ExamPrep yet"
      showJoin={showJoin} onJoin={() => setShowJoin(true)} onCancel={() => setShowJoin(false)}
      onJoined={() => window.location.reload()} joinType="school"
      onSecondary={() => {}} />
  )

  const schoolName = cohortData?.schools?.name ?? 'Your school'
  const myEntry    = leaderboard.find(e => e.student_id === userId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {showInvite && cohortData && <InviteSheet code={cohortData.invite_code} name={`${schoolName} · ${cohortData.name}`} type="school" onClose={() => setShowInvite(false)} />}
      {showPicker && <PeriodPicker periods={periods} selected={selectedPeriod} onSelect={p => { setSelectedPeriod(p); load(scope, p) }} onClose={() => setShowPicker(false)} />}

      <MyRankCard rank={myRank} total={leaderboard.length || undefined} pts={myEntry?.points} ptsChange={myEntry?.points_change}
        liveXP={liveXP}
        label={`${schoolName} · ${scope === 'cohort' ? 'My cohort' : 'Whole school'}`}
        gradient="linear-gradient(155deg,#052e16 0%,#064e3b 100%)" border="rgba(52,211,153,.3)" icon="🏫" />

      <SchoolBadge name={schoolName} onShare={() => setShowInvite(true)} />

      {/* Cohort / whole school toggle */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', borderRadius: 12, padding: 3 }}>
        {[['cohort','My cohort'],['school','Whole school']].map(([val, lbl]) => (
          <button key={val} onClick={() => { setScope(val); setSelectedPeriod(null); load(val, null) }}
            style={{ flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all .15s', background: scope === val ? 'var(--bg-card)' : 'transparent', color: scope === val ? 'var(--text-prim)' : 'var(--text-tert)' }}>
            {lbl}
          </button>
        ))}
      </div>

      <ChallengeCard challenge={challenge} type="weekly" />
      <ChallengeCard challenge={monthlyChallenge} type="monthly" />

      <LeaderboardCard entries={leaderboard} userId={userId} title="School leaderboard"
        headerRight={<button onClick={() => setShowPicker(true)} style={{ padding: '3px 8px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 9, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer' }}>This week ▾</button>}
        emptyMsg="No school activity yet" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NATIONAL TAB (renamed from Global)
// ─────────────────────────────────────────────────────────────────────────────
function NationalTab({ userId, liveXP = 0 }) {
  const [period,   setPeriod]   = useState('week')
  const [lb,       setLb]       = useState([])
  const [surround, setSurround] = useState([])
  const [myRank,   setMyRank]   = useState(null)
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [weekly,   setWeekly]   = useState(null)
  const [monthly,  setMonthly]  = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [pastWins, setPastWins] = useState([])
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [lbRes, chalRes] = await Promise.all([
        fetch(`/api/leaderboard/global?period=${period}&limit=20`),
        fetch('/api/challenges?scope=national'),
      ])
      const [lbData, chal] = await Promise.all([lbRes.json(), chalRes.json()])
      setLb(lbData.leaderboard ?? [])
      setSurround(lbData.surround ?? [])
      setMyRank(lbData.my_rank ?? null)
      setTotal(lbData.total_count ?? 0)
      setWeekly(chal.active ?? null)
      setMonthly(chal.monthly ?? null)
      setUpcoming(chal.upcoming ?? [])
      setPastWins(chal.past ?? [])
      setLoading(false)
    }
    load()
  }, [period])

  if (loading) return <TabSkeleton />

  const topPct     = myRank && total ? Math.round((myRank / total) * 100) : null
  const inviteCode = 'EXAMNG' // fallback national invite code

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {showInvite && <InviteSheet code={inviteCode} name="ExamPrep Nigeria" type="national" onClose={() => setShowInvite(false)} />}

      {/* My national rank — always shown */}
      <div style={{ borderRadius: 18, background: 'linear-gradient(155deg,#050b1a 0%,#0b1330 45%,#1a1060 100%)', border: '1px solid rgba(24,183,242,.2)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(24,183,242,.12)', border: '1.5px solid rgba(24,183,242,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🇳🇬</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'rgba(255,255,255,.38)', marginBottom: 3 }}>
            Nationwide · {total.toLocaleString()} students
          </p>
          {myRank ? (
            <p style={{ fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1 }}>
              #{myRank.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.38)' }}>of {total.toLocaleString()}</span>
            </p>
          ) : (
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>Keep practising to climb the board!</p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {topPct != null && <p style={{ fontSize: 13, fontWeight: 800, color: '#18B7F2', lineHeight: 1 }}>Top {topPct}%</p>}
          <button onClick={() => setShowInvite(true)} style={{ marginTop: 4, padding: '4px 10px', borderRadius: 999, background: 'rgba(24,183,242,.15)', border: '1px solid rgba(24,183,242,.3)', fontSize: 9, fontWeight: 700, color: '#18B7F2', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Invite friends +
          </button>
        </div>
      </div>

      {/* Challenges */}
      <ChallengeCard challenge={weekly}  type="weekly" />
      <ChallengeCard challenge={monthly} type="monthly" />

      {/* National leaderboard */}
      <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 13px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>🇳🇬 National leaderboard</SectionLabel>
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', borderRadius: 10, padding: 2 }}>
            {[['week','This week'],['alltime','All time']].map(([val, lbl]) => (
              <button key={val} onClick={() => setPeriod(val)}
                style={{ padding: '3px 8px', borderRadius: 8, fontSize: 9, fontWeight: 700, border: 'none', cursor: 'pointer', background: period === val ? 'var(--bg-card)' : 'transparent', color: period === val ? 'var(--text-prim)' : 'var(--text-tert)', transition: 'all .15s' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        {lb.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🇳🇬</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>Be the first to climb the national board!</p>
          </div>
        ) : (
          <>
            {lb.length >= 3 && <Podium entries={lb.slice(0, 3)} userId={userId} />}
            <div style={{ padding: lb.length >= 3 ? '4px 12px 12px' : '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--text-tert)', marginBottom: 2 }}>All students</p>
              {lb.slice(0, 10).map((e, i) => <LbRow key={e.student_id} entry={e} rank={i + 1} userId={userId} />)}
              {surround.length > 0 && (
                <>
                  <p style={{ fontSize: 9, color: 'var(--text-tert)', textAlign: 'center', padding: '4px 0' }}>· · ·</p>
                  {surround.map(e => <LbRow key={e.student_id} entry={e} rank={e.rank} userId={userId} />)}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Upcoming challenges */}
      {upcoming.length > 0 && (
        <Widget header={<SectionLabel>Upcoming challenges</SectionLabel>}>
          <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(ch => (
              <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(155,122,224,.12)', border: '1px solid rgba(155,122,224,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                  {ch.type === 'school' ? '🏟️' : ch.subject ? '🧪' : '⚡'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>{ch.title}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-tert)' }}>
                    {new Date(ch.starts_at).toLocaleDateString('en-GB',{month:'short',day:'numeric'})} · {ch.target_count} questions
                  </p>
                </div>
                <button style={{ padding: '4px 9px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 9, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Details</button>
              </div>
            ))}
          </div>
        </Widget>
      )}

      {/* Past wins */}
      {pastWins.length > 0 && (
        <Widget header={<SectionLabel>Your past wins</SectionLabel>}>
          <div style={{ padding: '4px 12px 8px' }}>
            {pastWins.map((ch, i) => (
              <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < pastWins.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{ch.my_entry?.rank === 1 ? '🥇' : ch.my_entry?.rank === 2 ? '🥈' : ch.my_entry?.rank === 3 ? '🥉' : '🏅'}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>{ch.title}</p>
                  <p style={{ fontSize: 10, color: '#4ade80' }}>{ch.my_entry?.rank ? `Finished #${ch.my_entry.rank}` : 'Participated'}{ch.prize_description ? ` · ${ch.prize_description}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </Widget>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'class',    label: 'Class',    icon: '👥' },
  { id: 'school',   label: 'School',   icon: '🏫' },
  { id: 'national', label: 'National', icon: '🇳🇬' },
]

export default function CommunityPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { totalPoints: liveXP } = usePoints()
  const { userId } = useUser()

  const [profile,   setProfile]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('class')

  useEffect(() => {
    if (!userId) return
    async function init() {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, cohort_id, class_id, cohorts(id, name, session, invite_code, schools(name, city))')
        .eq('id', userId).single()
      setProfile(prof)
      if (prof?.cohort_id && !prof?.class_id) setActiveTab('school')
      setLoading(false)
    }
    init()
  }, [userId]) // eslint-disable-line

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#9b7ae0', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const now          = new Date()
  const daysToMonday = (7 - now.getDay() + 1) % 7 || 7
  const hoursRem     = 24 - now.getHours()

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const coach = communityCoach({ firstName })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 112, maxWidth: 680, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 4 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 3 }}>This week</p>
          <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.025em', lineHeight: 1.1, color: 'var(--text-prim)' }}>Leaderboard</h1>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.25)', flexShrink: 0, marginTop: 4 }}>
          <span style={{ fontSize: 10 }}>⏱</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24' }}>{daysToMonday}d {hoursRem}h left</span>
        </div>
      </div>

      {/* ── Coach banner ── */}
      <CoachBanner emoji={coach.emoji} message={coach.message} />

      {/* ── Tab strip — pill buttons matching prototype exactly ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        {TABS.map(tab => {
          const on = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '5px 13px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                border: `1.5px solid ${on ? 'rgba(24,183,242,.4)' : 'var(--border)'}`,
                cursor: 'pointer', background: on ? 'rgba(24,183,242,.12)' : 'transparent',
                color: on ? '#18B7F2' : 'var(--text-tert)',
                transition: 'all .15s',
              }}>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'class'    && <ClassTab    userId={userId} profile={profile} liveXP={liveXP} />}
      {activeTab === 'school'   && <SchoolTab   userId={userId} profile={profile} liveXP={liveXP} />}
      {activeTab === 'national' && <NationalTab userId={userId} liveXP={liveXP} />}
    </div>
  )
}