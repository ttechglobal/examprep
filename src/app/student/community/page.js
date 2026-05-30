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
// CLASS TAB
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

  if (loading) return <TabSkeleton />

  if (!profile?.class_id) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-default rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-6 text-white text-center">
            <p className="text-3xl mb-2">👥</p>
            <h2 className="text-base font-black mb-1">Join a class</h2>
            <p className="text-indigo-100 text-sm leading-relaxed">Enter your class invite code to join the leaderboard and compete with classmates.</p>
          </div>
          <div className="p-5 space-y-3">
            {showJoin ? (
              <JoinByCodeForm type="class"
                onJoined={() => { setShowJoin(false); window.location.reload() }}
                onCancel={() => setShowJoin(false)} />
            ) : (
              <>
                <button onClick={() => setShowJoin(true)}
                  className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors">
                  Enter class code
                </button>
                <button onClick={() => setShowCreate(true)}
                  className="w-full py-3 border border-default text-secondary text-sm font-medium rounded-xl hover:bg-subtle transition-colors">
                  Create a class
                </button>
              </>
            )}
          </div>
        </div>
        {showCreate && <CreateClassModal onCreated={() => { setShowCreate(false); window.location.reload() }} onClose={() => setShowCreate(false)} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showShare && classData && (
        <ShareCard code={classData.invite_code} name={classData.name} type="class" onClose={() => setShowShare(false)} />
      )}
      {showPicker && (
        <PeriodPicker periods={periods} selected={selectedPeriod}
          onSelect={p => { setSelectedPeriod(p); load(p) }} onClose={() => setShowPicker(false)} />
      )}

      <CompactInfoBar
        name={classData?.name ?? '—'}
        myRank={myRank}
        onShare={() => setShowShare(true)}
        color="indigo"
      />

      {activePeriod && (
        <div className="flex items-center justify-between text-xs text-secondary px-1">
          <span className="font-medium">{selectedPeriod ? selectedPeriod.label : formatPeriod(activePeriod.start, activePeriod.end)}</span>
          {!selectedPeriod && activePeriod.end && <span className="text-tertiary">Resets in {daysUntil(activePeriod.end)}d</span>}
        </div>
      )}

      <LeaderboardList entries={leaderboard} userId={userId} emptyMessage="No class activity yet" />

      <div className="pt-1">
        {selectedPeriod ? (
          <button onClick={() => { setSelectedPeriod(null); load(null) }} className="w-full text-xs text-indigo-500 font-bold py-2 hover:underline">← Back to current period</button>
        ) : (
          <button onClick={() => setShowPicker(true)} className="w-full text-xs text-secondary hover:text-primary py-2 transition-colors">View past results ↓</button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SCHOOL TAB
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
  const [showRequest,setShowRequest] = useState(false)

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

  const activePeriod = selectedPeriod ?? currentPeriod

  if (loading) return <TabSkeleton />

  if (!profile?.cohort_id) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-default rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-6 text-white text-center">
            <p className="text-3xl mb-2">🏫</p>
            <h2 className="text-base font-black mb-1">Connect to your school</h2>
            <p className="text-emerald-100 text-sm leading-relaxed">Ask your teacher for your school invite code.</p>
          </div>
          <div className="p-5 space-y-3">
            {showJoin ? (
              <JoinByCodeForm type="school"
                onJoined={() => { setShowJoin(false); window.location.reload() }}
                onCancel={() => setShowJoin(false)} />
            ) : (
              <>
                <button onClick={() => setShowJoin(true)}
                  className="w-full py-3 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-500 transition-colors">
                  Enter school code
                </button>
                <button onClick={() => setShowRequest(true)}
                  className="w-full py-3 border border-default text-secondary text-sm font-medium rounded-xl hover:bg-subtle transition-colors">
                  My school doesn't have a code yet
                </button>
              </>
            )}
          </div>
        </div>
        {showRequest && <SchoolRequestModal userId={userId} onClose={() => setShowRequest(false)} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showShare && cohortData && (
        <ShareCard
          code={cohortData.invite_code}
          name={`${cohortData.schools?.name ?? ''} · ${cohortData.name}`}
          type="cohort"
          onClose={() => setShowShare(false)}
        />
      )}
      {showPicker && (
        <PeriodPicker periods={periods} selected={selectedPeriod}
          onSelect={p => { setSelectedPeriod(p); load(scope, p) }} onClose={() => setShowPicker(false)} />
      )}

      <CompactInfoBar
        name={cohortData?.name ?? '—'}
        school={cohortData?.schools?.name}
        myRank={myRank}
        onShare={() => setShowShare(true)}
        color="emerald"
      />

      {/* Cohort / School scope toggle */}
      <div className="flex bg-subtle rounded-xl p-0.5 gap-0.5">
        {[{ value: 'cohort', label: 'My cohort' }, { value: 'school', label: 'Whole school' }].map(({ value, label }) => (
          <button key={value} onClick={() => { setScope(value); setSelectedPeriod(null); load(value, null) }}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
              scope === value ? 'bg-card text-primary shadow-sm' : 'text-secondary hover:text-primary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {activePeriod && (
        <div className="flex items-center justify-between text-xs text-secondary px-1">
          <span className="font-medium">{selectedPeriod ? selectedPeriod.label : formatPeriod(activePeriod.start, activePeriod.end)}</span>
          {!selectedPeriod && activePeriod.end && <span className="text-tertiary">Resets in {daysUntil(activePeriod.end)}d</span>}
        </div>
      )}

      <LeaderboardList entries={leaderboard} userId={userId} emptyMessage="No school activity yet" />

      <div className="pt-1">
        {selectedPeriod ? (
          <button onClick={() => { setSelectedPeriod(null); load(scope, null) }} className="w-full text-xs text-emerald-600 font-bold py-2 hover:underline">← Back to current period</button>
        ) : (
          <button onClick={() => setShowPicker(true)} className="w-full text-xs text-secondary hover:text-primary py-2 transition-colors">View past results ↓</button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY TAB
// ═══════════════════════════════════════════════════════════════
function MonthlyTab({ userId, profile }) {
  const [classLb,  setClassLb]  = useState([])
  const [cohortLb, setCohortLb] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [scope,    setScope]    = useState(profile?.class_id ? 'class' : 'cohort')
  const hasClass  = Boolean(profile?.class_id)
  const hasCohort = Boolean(profile?.cohort_id)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const fetches = []
      if (hasClass)  fetches.push(fetch('/api/leaderboard/monthly?scope=class').then(r => r.json()))
      if (hasCohort) fetches.push(fetch('/api/leaderboard/monthly?scope=cohort').then(r => r.json()))
      const results = await Promise.all(fetches)
      if (hasClass)  setClassLb(results[0]?.leaderboard ?? [])
      if (hasCohort) setCohortLb(results[hasClass ? 1 : 0]?.leaderboard ?? [])
      setLoading(false)
    }
    load()
  }, [hasClass, hasCohort])

  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const entries    = scope === 'class' ? classLb : cohortLb

  if (loading) return <TabSkeleton />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-black text-primary">{monthLabel}</p>
        {hasClass && hasCohort && (
          <div className="flex bg-subtle rounded-xl p-0.5 gap-0.5">
            {[{ value: 'class', label: 'Class' }, { value: 'cohort', label: 'School' }].map(({ value, label }) => (
              <button key={value} onClick={() => setScope(value)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  scope === value ? 'bg-card text-primary shadow-sm' : 'text-secondary hover:text-primary'
                }`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasClass && !hasCohort ? (
        <div className="text-center py-10 bg-card border border-default rounded-2xl">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm font-bold text-primary">Join a class or school to see monthly rankings</p>
        </div>
      ) : (
        <LeaderboardList entries={entries} userId={userId} emptyMessage="No activity this month yet" />
      )}
    </div>
  )
}

// ─── CreateClass modal ───────────────────────────────────────────────────────
function CreateClassModal({ onCreated, onClose }) {
  const [name, setName]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const inputRef = useRef(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true); setError(null)
    const res  = await fetch('/api/class/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onCreated(data.class)
  }

  return (
    <div className={BACKDROP} style={BACKDROP_STYLE} onClick={onClose}>
      <div className={SHEET} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1.5 rounded-full bg-subtle" /></div>
        <div className="px-5 pt-2 pb-3 flex items-center justify-between">
          <p className="font-black text-primary text-lg">Create a class</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-5 pb-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wide block mb-1.5">Class name</label>
            <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Science Gang 2026" maxLength={50}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="w-full px-4 py-3 border border-default rounded-xl text-sm bg-subtle text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>
          <button onClick={handleCreate} disabled={loading || !name.trim()}
            className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
            {loading ? 'Creating...' : 'Create class →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── School request modal ────────────────────────────────────────────────────
function SchoolRequestModal({ userId, onClose }) {
  const [schoolName, setSchoolName] = useState('')
  const [state, setState]           = useState('')
  const [phone, setPhone]           = useState('')
  const [sent, setSent]             = useState(false)
  const [saving, setSaving]         = useState(false)

  const handleSend = async () => {
    if (!schoolName.trim()) return
    setSaving(true)
    await fetch('/api/school/request-onboarding', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_name: schoolName, state, phone, student_id: userId }),
    })
    setSaving(false); setSent(true)
  }

  return (
    <div className={BACKDROP} style={BACKDROP_STYLE} onClick={onClose}>
      <div className={SHEET} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1.5 rounded-full bg-subtle" /></div>
        <div className="px-5 pt-2 pb-3 flex items-center justify-between">
          <p className="font-black text-primary text-lg">Request onboarding</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-5 pb-4">
          {sent ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-black text-primary mb-1">Request sent!</p>
              <p className="text-sm text-secondary">We'll reach out to your school to get them set up.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-secondary">Tell us about your school and we'll get in touch.</p>
              <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="School name *"
                className="w-full px-4 py-3 border border-default rounded-xl text-sm bg-subtle text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input value={state} onChange={e => setState(e.target.value)} placeholder="State (e.g. Lagos)"
                className="w-full px-4 py-3 border border-default rounded-xl text-sm bg-subtle text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teacher phone (optional)"
                className="w-full px-4 py-3 border border-default rounded-xl text-sm bg-subtle text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button onClick={handleSend} disabled={saving || !schoolName.trim()}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                {saving ? 'Sending...' : 'Send request →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { id: 'class',   label: 'Class',   icon: '👥' },
  { id: 'school',  label: 'School',  icon: '🏫' },
  { id: 'monthly', label: 'Monthly', icon: '📅' },
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
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Community 🏆</h1>
        <p className="text-secondary text-sm mt-0.5">Compete, improve, and stay motivated</p>
      </div>

      {/* Tabs — full width, well-designed pill strip */}
      <div className="bg-subtle rounded-2xl p-1 flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === tab.id
                ? 'bg-card text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content — leaderboard has maximum space */}
      {activeTab === 'class'   && <ClassTab   userId={user?.id} profile={profile} onProfileChange={setProfile} />}
      {activeTab === 'school'  && <SchoolTab  userId={user?.id} profile={profile} />}
      {activeTab === 'monthly' && <MonthlyTab userId={user?.id} profile={profile} />}
    </div>
  )
}