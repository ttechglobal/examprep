'use client'
// src/app/student/community/page.js
// Full rewrite — three-tab community page with class, school, and monthly leaderboards.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePoints } from '@/contexts/PointsContext'

// ── Medal helper ──────────────────────────────────────────────────────────────
function rankMedal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

// ── Single leaderboard row ────────────────────────────────────────────────────
function LeaderboardRow({ entry, rank, isMe }) {
  const medal = rankMedal(rank)
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors
      ${isMe
        ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700'
        : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800'}`}
    >
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {medal
          ? <span className="text-lg">{medal}</span>
          : <span className="text-sm font-black text-gray-400">#{rank}</span>
        }
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${
          isMe ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'
        }`}>
          {isMe ? `${entry.first_name} (you)` : entry.first_name}
        </p>
        {entry.cohort_name && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.cohort_name}</p>
        )}
      </div>

      {/* Points */}
      <div className={`text-sm font-black flex-shrink-0 ${
        rank <= 3 ? 'text-indigo-600 dark:text-indigo-400' : isMe ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400'
      }`}>
        {entry.points.toLocaleString()} pts
      </div>
    </div>
  )
}

// ── Empty leaderboard state ───────────────────────────────────────────────────
function EmptyLeaderboard({ message = 'No activity yet this period' }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
      <p className="text-3xl mb-2">🏁</p>
      <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">{message}</p>
      <p className="text-sm text-gray-400">Complete lessons and practice to climb the board!</p>
    </div>
  )
}

// ── Period label helper ───────────────────────────────────────────────────────
function formatPeriod(start, end) {
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  const opts = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString('en-GB', opts)} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${s.getFullYear()}`
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date()
  return Math.max(0, Math.ceil(diff / 86400000))
}

// ── Period picker ─────────────────────────────────────────────────────────────
function PeriodPicker({ periods, selected, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center px-4 pb-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm max-h-[70vh] flex flex-col
                      animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="font-black text-gray-900 dark:text-gray-100">Past periods</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
        </div>
        <div className="overflow-y-auto p-3 space-y-1">
          {periods.map(p => (
            <button
              key={p.start}
              onClick={() => { onSelect(p); onClose() }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors
                ${selected?.start === p.start
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              {p.label}
            </button>
          ))}
          {periods.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">No past periods yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Share invite card ─────────────────────────────────────────────────────────
function InviteCard({ code, name, type, onClose }) {
  const [copied, setCopied] = useState(false)
  const link = `https://examprep.ng/join/${code}`
  const message = type === 'class'
    ? `Join ${name} on ExamPrep and let's learn and compete together! Use code ${code} or tap this link: ${link}`
    : `Join ${name} on ExamPrep! Use code ${code} or tap: ${link}`

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: message }) } catch {}
    } else {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center px-4 pb-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-5 space-y-4
                      animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <p className="font-black text-gray-900 dark:text-gray-100">Invite your classmates</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 text-center">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Invite code</p>
          <p className="text-4xl font-black text-indigo-700 dark:text-indigo-400 tracking-[0.25em]">{code}</p>
          <p className="text-xs text-indigo-400 mt-1">{name}</p>
        </div>

        <button
          onClick={handleShare}
          className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
        >
          {copied ? '✓ Copied to clipboard!' : '📤 Share invite'}
        </button>
      </div>
    </div>
  )
}

// ── Create class modal ────────────────────────────────────────────────────────
function CreateClassModal({ onCreated, onClose }) {
  const [name, setName]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    const res  = await fetch('/api/class/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onCreated(data.class)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center px-4 pb-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-5 space-y-4
                      animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <p className="font-black text-gray-900 dark:text-gray-100">Create a class</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
            Class name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Science Gang 2026"
            maxLength={50}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl
                     hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          {loading ? 'Creating...' : 'Create class →'}
        </button>
      </div>
    </div>
  )
}

// ── Join by code form ─────────────────────────────────────────────────────────
function JoinByCodeForm({ type, onJoined, onCancel }) {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const endpoint = type === 'class' ? '/api/class/join' : '/api/school/join'

  const handleJoin = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    const res  = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onJoined(data)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder={`Enter ${type} code`}
          maxLength={6}
          className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase tracking-widest"
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <button
          onClick={handleJoin}
          disabled={loading || code.length < 4}
          className="px-4 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl
                     hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          {loading ? '...' : 'Join'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {onCancel && (
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      )}
    </div>
  )
}

// ── Leaderboard list ──────────────────────────────────────────────────────────
function LeaderboardList({ entries, userId, emptyMessage }) {
  if (!entries.length) return <EmptyLeaderboard message={emptyMessage} />
  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <LeaderboardRow
          key={entry.student_id}
          entry={entry}
          rank={i + 1}
          isMe={entry.student_id === userId}
        />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MY CLASS TAB
// ══════════════════════════════════════════════════════════════════════════════
function ClassTab({ userId, profile, onProfileChange }) {
  const [leaderboard, setLeaderboard]   = useState([])
  const [classData, setClassData]       = useState(null)
  const [myRank, setMyRank]             = useState(null)
  const [loading, setLoading]           = useState(true)
  const [periods, setPeriods]           = useState([])
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showPicker, setShowPicker]     = useState(false)
  const [showInvite, setShowInvite]     = useState(false)
  const [showCreate, setShowCreate]     = useState(false)
  const [showJoin, setShowJoin]         = useState(false)

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

  const handleCreated = (newClass) => {
    setShowCreate(false)
    onProfileChange({ ...profile, class_id: newClass.id })
    setClassData(newClass)
    setShowInvite(true)
    load()
  }

  const handleJoined = () => {
    setShowJoin(false)
    load()
    onProfileChange({ ...profile, class_id: 'pending' }) // triggers re-fetch upstream
    window.location.reload()
  }

  const activePeriod = selectedPeriod ?? currentPeriod

  if (loading) return <TabSkeleton />

  // Not in a class
  if (!profile?.class_id) {
    return (
      <div className="space-y-4">
        {showCreate && (
          <CreateClassModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />
        )}

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-6 text-white text-center">
            <p className="text-3xl mb-2">👥</p>
            <h2 className="text-base font-black mb-1">Join a class</h2>
            <p className="text-indigo-200 text-sm leading-relaxed">
              Compete with friends and classmates on a shared leaderboard.
            </p>
          </div>
          <div className="p-5 space-y-4">
            {showJoin ? (
              <JoinByCodeForm type="class" onJoined={handleJoined} onCancel={() => setShowJoin(false)} />
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setShowJoin(true)}
                  className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
                >
                  Join with a code
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full py-3 border border-indigo-200 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  Create a new class
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showInvite && classData && (
        <InviteCard
          code={classData.invite_code}
          name={classData.name}
          type="class"
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Class header */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-200">Your class</p>
            <p className="font-black text-lg leading-tight">{classData?.name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            {myRank && (
              <div className="text-right mr-1">
                <p className="text-xs text-indigo-200">Your rank</p>
                <p className="text-3xl font-black">#{myRank}</p>
              </div>
            )}
            <button
              onClick={() => setShowInvite(true)}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Share invite"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Period indicator */}
      {activePeriod && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <span className="font-medium">{selectedPeriod ? selectedPeriod.label : formatPeriod(activePeriod.start, activePeriod.end)}</span>
          {!selectedPeriod && activePeriod.end && (
            <span>Resets in {daysUntil(activePeriod.end)}d</span>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <LeaderboardList entries={leaderboard} userId={userId} emptyMessage="No class activity yet" />

      {/* Past periods */}
      <div className="pt-2">
        {selectedPeriod ? (
          <button
            onClick={() => { setSelectedPeriod(null); load(null) }}
            className="w-full text-xs text-indigo-500 font-bold py-2 hover:underline"
          >
            ← Back to current period
          </button>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-2"
          >
            View past results ↓
          </button>
        )}
      </div>

      {showPicker && (
        <PeriodPicker
          periods={periods}
          selected={selectedPeriod}
          onSelect={p => { setSelectedPeriod(p); load(p) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MY SCHOOL TAB
// ══════════════════════════════════════════════════════════════════════════════
function SchoolTab({ userId, profile }) {
  const router = useRouter()
  const [leaderboard, setLeaderboard]       = useState([])
  const [cohortData, setCohortData]         = useState(null)
  const [myRank, setMyRank]                 = useState(null)
  const [loading, setLoading]               = useState(true)
  const [scope, setScope]                   = useState('cohort')
  const [periods, setPeriods]               = useState([])
  const [currentPeriod, setCurrentPeriod]   = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showPicker, setShowPicker]         = useState(false)
  const [showInvite, setShowInvite]         = useState(false)
  const [showJoin, setShowJoin]             = useState(false)

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

  const handleScopeChange = (s) => {
    setScope(s)
    setSelectedPeriod(null)
    load(s, null)
  }

  const handleJoined = () => {
    setShowJoin(false)
    window.location.reload()
  }

  const activePeriod = selectedPeriod ?? currentPeriod

  if (loading) return <TabSkeleton />

  // Not in a school/cohort
  if (!profile?.cohort_id) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-6 text-white text-center">
            <p className="text-3xl mb-2">🏫</p>
            <h2 className="text-base font-black mb-1">Connect your school</h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Ask your teacher for your school's cohort code and compete with your classmates.
            </p>
          </div>
          <div className="p-5 space-y-4">
            {showJoin ? (
              <JoinByCodeForm type="school" onJoined={handleJoined} onCancel={() => setShowJoin(false)} />
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setShowJoin(true)}
                  className="w-full py-3 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-500 transition-colors"
                >
                  Join with cohort code
                </button>
                <button
                  onClick={() => router.push('/school/onboarding')}
                  className="w-full py-3 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  Set up your school →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showInvite && cohortData && (
        <InviteCard
          code={cohortData.invite_code}
          name={`${cohortData.schools?.name ?? ''} · ${cohortData.name}`}
          type="cohort"
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* School/cohort header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-100">{cohortData?.schools?.name ?? 'Your school'}</p>
            <p className="font-black text-lg leading-tight">{cohortData?.name ?? '—'}</p>
            {cohortData?.session && (
              <p className="text-xs text-emerald-200 mt-0.5">{cohortData.session}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {myRank && (
              <div className="text-right mr-1">
                <p className="text-xs text-emerald-200">Your rank</p>
                <p className="text-3xl font-black">#{myRank}</p>
              </div>
            )}
            <button
              onClick={() => setShowInvite(true)}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cohort / School-wide toggle */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {[
          { value: 'cohort', label: 'My cohort' },
          { value: 'school', label: 'Whole school' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleScopeChange(value)}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
              scope === value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Period indicator */}
      {activePeriod && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <span className="font-medium">{selectedPeriod ? selectedPeriod.label : formatPeriod(activePeriod.start, activePeriod.end)}</span>
          {!selectedPeriod && activePeriod.end && (
            <span>Resets in {daysUntil(activePeriod.end)}d</span>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <LeaderboardList entries={leaderboard} userId={userId} emptyMessage="No activity yet" />

      {/* Past periods */}
      <div className="pt-2">
        {selectedPeriod ? (
          <button
            onClick={() => { setSelectedPeriod(null); load(scope, null) }}
            className="w-full text-xs text-emerald-600 font-bold py-2 hover:underline"
          >
            ← Back to current period
          </button>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-2"
          >
            View past results ↓
          </button>
        )}
      </div>

      {showPicker && (
        <PeriodPicker
          periods={periods}
          selected={selectedPeriod}
          onSelect={p => { setSelectedPeriod(p); load(scope, p) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MONTHLY TAB
// ══════════════════════════════════════════════════════════════════════════════
function MonthlyTab({ userId, profile }) {
  const [classLb, setClassLb]   = useState([])
  const [cohortLb, setCohortLb] = useState([])
  const [loading, setLoading]   = useState(true)
  const [scope, setScope]       = useState(profile?.class_id ? 'class' : 'cohort')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const fetches = []
      if (profile?.class_id)  fetches.push(fetch('/api/leaderboard/monthly?scope=class').then(r => r.json()))
      if (profile?.cohort_id) fetches.push(fetch('/api/leaderboard/monthly?scope=cohort').then(r => r.json()))
      const results = await Promise.all(fetches)
      if (profile?.class_id)  setClassLb(results[0]?.leaderboard ?? [])
      if (profile?.cohort_id) setCohortLb(results[profile?.class_id ? 1 : 0]?.leaderboard ?? [])
      setLoading(false)
    }
    load()
  }, [profile?.class_id, profile?.cohort_id])

  const now         = new Date()
  const monthLabel  = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const hasClass    = Boolean(profile?.class_id)
  const hasCohort   = Boolean(profile?.cohort_id)
  const showToggle  = hasClass && hasCohort
  const entries     = scope === 'class' ? classLb : cohortLb

  if (loading) return <TabSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monthly</p>
          <p className="font-black text-gray-900 dark:text-gray-100">{monthLabel}</p>
        </div>
        {showToggle && (
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setScope('class')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                scope === 'class' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500'
              }`}
            >Class</button>
            <button
              onClick={() => setScope('cohort')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                scope === 'cohort' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500'
              }`}
            >School</button>
          </div>
        )}
      </div>

      {!hasClass && !hasCohort ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
            Join a class or school to see monthly rankings
          </p>
        </div>
      ) : (
        <LeaderboardList entries={entries} userId={userId} emptyMessage="No activity this month yet" />
      )}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function TabSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function CommunityPage() {
  const router         = useRouter()
  const supabase       = createClient()
  const { totalPoints } = usePoints()

  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('class')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, cohort_id, class_id, total_points, cohorts(id, name, session, invite_code, schools(name, city))')
        .eq('id', user.id)
        .single()

      setProfile(prof)
      // Default to school tab if in a cohort but no class
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

  const tabs = [
    { id: 'class',   label: '👥 Class'  },
    { id: 'school',  label: '🏫 School' },
    { id: 'monthly', label: '📅 Monthly' },
  ]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Community 🏆</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Compete, improve, and stay motivated together
        </p>
      </div>

      {/* All-time points banner */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50
                      dark:from-amber-950/30 dark:to-orange-950/30
                      border border-amber-200 dark:border-amber-800
                      rounded-2xl px-5 py-4">
        <span className="text-3xl">⭐</span>
        <div>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">All-time points</p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 tabular-nums">
            {totalPoints.toLocaleString()} pts
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-amber-500 dark:text-amber-500">Never resets</p>
          <p className="text-xs text-amber-400">Your permanent record</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'class' && (
        <ClassTab userId={user?.id} profile={profile} onProfileChange={setProfile} />
      )}
      {activeTab === 'school' && (
        <SchoolTab userId={user?.id} profile={profile} />
      )}
      {activeTab === 'monthly' && (
        <MonthlyTab userId={user?.id} profile={profile} />
      )}

    </div>
  )
}