'use client'
// src/app/student/community/page.js
// Changes in this version:
// 1. All-time points banner REMOVED entirely
// 2. Tab selector redesigned — clear active state with indigo pill, works in both modes
// 3. All modals: transparent backdrop (backdrop-blur), z-[200], pb-24 to clear navbar
// 4. CreateClass + SchoolRequest modals: transparent
// 5. No "Set up your school" for students — only join or request onboarding

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://examprep.ng'

// ── Helpers ───────────────────────────────────────────────────────────────────
function rankMedal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

function formatPeriod(start, end) {
  if (!start || !end) return ''
  const s = new Date(start), e = new Date(end)
  return `${s.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${s.getFullYear()}`
}

function daysUntil(dateStr) {
  return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000))
}

// ── Transparent modal backdrop ────────────────────────────────────────────────
// pb-24 pushes sheet content above the bottom navbar (navbar ~80px + padding)
const BACKDROP = "fixed inset-0 z-[200] flex flex-col"
const BACKDROP_STYLE = { background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }
const SHEET = "mt-auto bg-card rounded-t-3xl w-full max-w-lg mx-auto shadow-2xl pb-24"

// ── Leaderboard row ───────────────────────────────────────────────────────────
function LeaderboardRow({ entry, rank, isMe }) {
  const medal = rankMedal(rank)
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
      isMe ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700'
           : 'bg-card border border-default'
    }`}>
      <div className="w-8 text-center flex-shrink-0">
        {medal ? <span className="text-lg">{medal}</span>
               : <span className="text-sm font-black text-tertiary">#{rank}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-700 dark:text-indigo-400' : 'text-primary'}`}>
          {isMe ? `${entry.first_name} (you)` : entry.first_name}
        </p>
        {entry.cohort_name && <p className="text-xs text-tertiary mt-0.5 truncate">{entry.cohort_name}</p>}
      </div>
      <div className={`text-sm font-black flex-shrink-0 tabular-nums ${
        rank <= 3 ? 'text-indigo-600 dark:text-indigo-400' : isMe ? 'text-indigo-500' : 'text-secondary'
      }`}>
        {entry.points.toLocaleString()} pts
      </div>
    </div>
  )
}

function EmptyLeaderboard({ message = 'No activity yet this period' }) {
  return (
    <div className="bg-card border border-default rounded-2xl p-8 text-center">
      <p className="text-3xl mb-2">🏁</p>
      <p className="font-bold text-primary mb-1">{message}</p>
      <p className="text-sm text-secondary">Complete lessons and practice to climb the board!</p>
    </div>
  )
}

function LeaderboardList({ entries, userId, emptyMessage }) {
  if (!entries.length) return <EmptyLeaderboard message={emptyMessage} />
  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <LeaderboardRow key={entry.student_id} entry={entry} rank={i + 1} isMe={entry.student_id === userId} />
      ))}
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-24 bg-subtle rounded-2xl" />
      {[1,2,3,4].map(i => <div key={i} className="h-14 bg-subtle rounded-2xl" />)}
    </div>
  )
}

// ── Period picker — transparent modal ─────────────────────────────────────────
function PeriodPicker({ periods, selected, onSelect, onClose }) {
  return (
    <div className={BACKDROP_CLASS} style={BACKDROP_STYLE} onClick={onClose}>
      <div className={`${SHEET} max-h-[60vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-default flex-shrink-0">
          <p className="font-black text-primary">Past periods</p>
          <button onClick={onClose} className="text-secondary hover:text-primary text-sm font-bold">✕</button>
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

// Const alias (hoisted after use in PeriodPicker — fixed below)
const BACKDROP_CLASS = BACKDROP

// ── Share card — transparent modal ───────────────────────────────────────────
function ShareCard({ code, name, type, onClose }) {
  const [copied, setCopied] = useState(null)
  const link    = `${APP_URL}/join/${code}`
  const message = type === 'class'
    ? `Join ${name} on ExamPrep and let's learn and compete together! 🎉\n\nUse code: ${code}\nOr tap: ${link}`
    : `Join ${name} on ExamPrep! 🏫\n\nCohort code: ${code}\nOr tap: ${link}`

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
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <p className="font-black text-lg text-primary">Invite people</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="mx-5 mb-4 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 text-center">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">{type === 'class' ? 'Class code' : 'Cohort code'}</p>
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
            {copied === 'code' && <span className="text-green-500 font-bold text-sm">✓</span>}
          </button>

          <button onClick={() => copyText(link, 'link')}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-subtle border border-default rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left">
            <span className="text-xl">🔗</span>
            <div className="flex-1">
              <p className="text-sm font-black text-primary">{copied === 'link' ? 'Copied!' : 'Copy Link'}</p>
              <p className="text-xs text-secondary truncate">{link}</p>
            </div>
            {copied === 'link' && <span className="text-green-500 font-bold text-sm">✓</span>}
          </button>

          <button onClick={share}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-indigo-600 rounded-2xl hover:bg-indigo-500 transition-colors text-left">
            <span className="text-xl">📤</span>
            <div className="flex-1">
              <p className="text-sm font-black text-white">{copied === 'share' ? 'Copied!' : 'Share Invite'}</p>
              <p className="text-xs text-indigo-200">Send a ready-made invite message</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create class modal — transparent ─────────────────────────────────────────
function CreateClassModal({ onCreated, onClose }) {
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const inputRef = useRef(null)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true); setError(null)
    const res  = await fetch('/api/class/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onCreated(data.class)
  }

  return (
    <div className={BACKDROP} style={BACKDROP_STYLE} onClick={onClose}>
      <div className={SHEET} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>
        <div className="px-5 pt-2 pb-3 flex items-center justify-between">
          <p className="font-black text-primary text-lg">Create a class</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="px-5 pb-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wide block mb-1.5">Class name</label>
            <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Science Gang 2026" maxLength={50}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="w-full px-4 py-3 border border-default rounded-xl text-sm bg-subtle text-primary
                         placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>
          <button onClick={handleCreate} disabled={loading || !name.trim()}
            className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl
                       hover:bg-indigo-500 disabled:opacity-40 transition-colors">
            {loading ? 'Creating...' : 'Create class →'}
          </button>
        </div>
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
    setLoading(true); setError(null)
    const res  = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onJoined(data)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder={type === 'class' ? 'Class code' : 'Cohort code'}
          maxLength={6} onKeyDown={e => e.key === 'Enter' && handleJoin()}
          className="flex-1 px-4 py-3 border border-default rounded-xl text-sm font-mono uppercase
                     tracking-widest bg-card text-primary placeholder:text-tertiary
                     focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <button onClick={handleJoin} disabled={loading || code.length < 4}
          className="px-4 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl
                     hover:bg-indigo-500 disabled:opacity-40 transition-colors">
          {loading ? '…' : 'Join'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {onCancel && <button onClick={onCancel} className="text-xs text-tertiary hover:text-secondary">Cancel</button>}
    </div>
  )
}

// ── School request modal — transparent ────────────────────────────────────────
function SchoolRequestModal({ userId, onClose }) {
  const [schoolName, setSchoolName] = useState('')
  const [state, setState]           = useState('')
  const [phone, setPhone]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState(null)

  const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna',
    'Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun',
    'Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

  const handleSubmit = async () => {
    if (!schoolName.trim()) return
    setLoading(true); setError(null)
    const res = await fetch('/api/school/request-onboarding', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_name: schoolName, state, phone, student_id: userId }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    setDone(true)
  }

  return (
    <div className={BACKDROP} style={BACKDROP_STYLE} onClick={onClose}>
      <div className={SHEET} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>

        {done ? (
          <div className="px-5 py-6 text-center space-y-4">
            <p className="text-4xl">🎉</p>
            <div>
              <p className="font-black text-lg text-primary">Thanks! We're on it.</p>
              <p className="text-sm text-secondary mt-1 leading-relaxed">
                We'll reach out to your school and get them set up on ExamPrep.
              </p>
            </div>
            <button onClick={onClose}
              className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500">
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between">
              <div>
                <p className="font-black text-lg text-primary">Help us bring your school onboard</p>
                <p className="text-sm text-secondary mt-0.5">We'll reach out and get them set up.</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary flex-shrink-0 ml-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="px-5 pb-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-wide block mb-1.5">School name *</label>
                <input value={schoolName} onChange={e => setSchoolName(e.target.value)}
                  placeholder="e.g. Government College Lagos"
                  className="w-full px-4 py-3 border border-default rounded-xl text-sm bg-subtle text-primary
                             placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-wide block mb-1.5">State</label>
                <select value={state} onChange={e => setState(e.target.value)}
                  className="w-full px-4 py-3 border border-default rounded-xl text-sm bg-subtle text-primary
                             focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-wide block mb-1.5">
                  School phone <span className="font-normal normal-case text-tertiary">(optional)</span>
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678" type="tel"
                  className="w-full px-4 py-3 border border-default rounded-xl text-sm bg-subtle text-primary
                             placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={handleSubmit} disabled={loading || !schoolName.trim()}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl
                           hover:bg-indigo-500 disabled:opacity-40 transition-colors mt-1">
                {loading ? 'Sending...' : 'Submit →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Need useRef for CreateClassModal ──────────────────────────────────────────
import { useRef } from 'react'

// ══════════════════════════════════════════════════════════════════════════════
// CLASS TAB
// ══════════════════════════════════════════════════════════════════════════════
function ClassTab({ userId, profile, onProfileChange }) {
  const [leaderboard, setLeaderboard]       = useState([])
  const [classData, setClassData]           = useState(null)
  const [myRank, setMyRank]                 = useState(null)
  const [loading, setLoading]               = useState(true)
  const [periods, setPeriods]               = useState([])
  const [currentPeriod, setCurrentPeriod]   = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showPicker, setShowPicker]         = useState(false)
  const [showShare, setShowShare]           = useState(false)
  const [showCreate, setShowCreate]         = useState(false)
  const [showJoin, setShowJoin]             = useState(false)

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
    setShowShare(true)
    load()
  }

  const activePeriod = selectedPeriod ?? currentPeriod

  if (loading) return <TabSkeleton />

  if (!profile?.class_id) {
    return (
      <div className="space-y-4">
        {showCreate && <CreateClassModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />}
        <div className="bg-card rounded-3xl border border-default overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-6 text-white text-center">
            <p className="text-3xl mb-2">👥</p>
            <h2 className="text-base font-black mb-1">Join a class</h2>
            <p className="text-indigo-200 text-sm leading-relaxed">Compete with friends on a shared bi-weekly leaderboard.</p>
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
                  Join with a code
                </button>
                <button onClick={() => setShowCreate(true)}
                  className="w-full py-3 border border-default text-primary text-sm font-bold rounded-xl hover:bg-subtle transition-colors">
                  Create a new class
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showShare && classData && <ShareCard code={classData.invite_code} name={classData.name} type="class" onClose={() => setShowShare(false)} />}
      {showPicker && <PeriodPicker periods={periods} selected={selectedPeriod} onSelect={p => { setSelectedPeriod(p); load(p) }} onClose={() => setShowPicker(false)} />}

      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-xs font-medium text-indigo-200">Your class</p>
            <p className="font-black text-lg leading-tight truncate">{classData?.name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {myRank && <div className="text-right"><p className="text-xs text-indigo-200">Rank</p><p className="text-2xl font-black">#{myRank}</p></div>}
            <button onClick={() => setShowShare(true)} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <button onClick={() => setShowShare(true)}
        className="w-full flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/40
                   border border-indigo-200 dark:border-indigo-800 rounded-2xl px-4 py-3
                   hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl">📤</span>
          <div className="text-left">
            <p className="text-sm font-black text-indigo-700 dark:text-indigo-400">Invite classmates</p>
            <p className="text-xs text-indigo-500">Code: {classData?.invite_code}</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      {activePeriod && (
        <div className="flex items-center justify-between text-xs text-secondary px-1">
          <span className="font-medium">{selectedPeriod ? selectedPeriod.label : formatPeriod(activePeriod.start, activePeriod.end)}</span>
          {!selectedPeriod && activePeriod.end && <span>Resets in {daysUntil(activePeriod.end)}d</span>}
        </div>
      )}

      <LeaderboardList entries={leaderboard} userId={userId} emptyMessage="No class activity yet" />

      <div className="pt-2">
        {selectedPeriod ? (
          <button onClick={() => { setSelectedPeriod(null); load(null) }} className="w-full text-xs text-indigo-500 font-bold py-2 hover:underline">← Back to current period</button>
        ) : (
          <button onClick={() => setShowPicker(true)} className="w-full text-xs text-secondary hover:text-primary py-2 transition-colors">View past results ↓</button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHOOL TAB
// ══════════════════════════════════════════════════════════════════════════════
function SchoolTab({ userId, profile }) {
  const [leaderboard, setLeaderboard]       = useState([])
  const [cohortData, setCohortData]         = useState(null)
  const [myRank, setMyRank]                 = useState(null)
  const [loading, setLoading]               = useState(true)
  const [scope, setScope]                   = useState('cohort')
  const [periods, setPeriods]               = useState([])
  const [currentPeriod, setCurrentPeriod]   = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showPicker, setShowPicker]         = useState(false)
  const [showShare, setShowShare]           = useState(false)
  const [showJoin, setShowJoin]             = useState(false)
  const [showRequest, setShowRequest]       = useState(false)

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
        {showRequest && <SchoolRequestModal userId={userId} onClose={() => setShowRequest(false)} />}
        <div className="bg-card rounded-3xl border border-default overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-6 text-white text-center">
            <p className="text-3xl mb-2">🏫</p>
            <h2 className="text-base font-black mb-1">Connect to your school</h2>
            <p className="text-emerald-100 text-sm leading-relaxed">Ask your teacher for your cohort code.</p>
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
                  Enter cohort code
                </button>
                <button onClick={() => setShowRequest(true)}
                  className="w-full py-3 border border-default text-secondary text-sm font-medium rounded-xl hover:bg-subtle transition-colors">
                  My school doesn't have a code yet
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showShare && cohortData && <ShareCard code={cohortData.invite_code} name={`${cohortData.schools?.name ?? ''} · ${cohortData.name}`} type="cohort" onClose={() => setShowShare(false)} />}
      {showPicker && <PeriodPicker periods={periods} selected={selectedPeriod} onSelect={p => { setSelectedPeriod(p); load(scope, p) }} onClose={() => setShowPicker(false)} />}

      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-xs font-medium text-emerald-100">{cohortData?.schools?.name ?? 'Your school'}</p>
            <p className="font-black text-lg leading-tight truncate">{cohortData?.name ?? '—'}</p>
            {cohortData?.session && <p className="text-xs text-emerald-200 mt-0.5">{cohortData.session}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {myRank && <div className="text-right"><p className="text-xs text-emerald-200">Rank</p><p className="text-2xl font-black">#{myRank}</p></div>}
            <button onClick={() => setShowShare(true)} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <button onClick={() => setShowShare(true)}
        className="w-full flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30
                   border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3
                   hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl">📤</span>
          <div className="text-left">
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Invite classmates</p>
            <p className="text-xs text-emerald-500">Code: {cohortData?.invite_code}</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      <div className="flex bg-subtle rounded-xl p-1 gap-1">
        {[{value:'cohort',label:'My cohort'},{value:'school',label:'Whole school'}].map(({value,label}) => (
          <button key={value} onClick={() => { setScope(value); setSelectedPeriod(null); load(value, null) }}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
              scope === value ? 'bg-card text-primary shadow-sm' : 'text-secondary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {activePeriod && (
        <div className="flex items-center justify-between text-xs text-secondary px-1">
          <span className="font-medium">{selectedPeriod ? selectedPeriod.label : formatPeriod(activePeriod.start, activePeriod.end)}</span>
          {!selectedPeriod && activePeriod.end && <span>Resets in {daysUntil(activePeriod.end)}d</span>}
        </div>
      )}

      <LeaderboardList entries={leaderboard} userId={userId} emptyMessage="No activity yet" />

      <div className="pt-2">
        {selectedPeriod ? (
          <button onClick={() => { setSelectedPeriod(null); load(scope, null) }} className="w-full text-xs text-emerald-600 font-bold py-2 hover:underline">← Back to current period</button>
        ) : (
          <button onClick={() => setShowPicker(true)} className="w-full text-xs text-secondary hover:text-primary py-2 transition-colors">View past results ↓</button>
        )}
      </div>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-secondary uppercase tracking-wide">Monthly rankings</p>
          <p className="font-black text-primary">{monthLabel}</p>
        </div>
        {hasClass && hasCohort && (
          <div className="flex bg-subtle rounded-lg p-0.5 gap-0.5">
            {[{value:'class',label:'Class'},{value:'cohort',label:'School'}].map(({value,label}) => (
              <button key={value} onClick={() => setScope(value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  scope === value ? 'bg-card text-primary shadow-sm' : 'text-secondary'
                }`}>{label}</button>
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

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — redesigned tabs with clear active state
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'class',   label: 'Class',   icon: '👥' },
  { id: 'school',  label: 'School',  icon: '🏫' },
  { id: 'monthly', label: 'Monthly', icon: '📅' },
]

export default function CommunityPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [loading, setLoading]     = useState(true)
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
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Community 🏆</h1>
        <p className="text-secondary text-sm mt-1">Compete, improve, and stay motivated together</p>
      </div>

      {/* Tab selector — clear active state, works in both modes */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-card border border-default text-secondary hover:text-primary hover:border-indigo-200 dark:hover:border-indigo-700'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'class'   && <ClassTab   userId={user?.id} profile={profile} onProfileChange={setProfile} />}
      {activeTab === 'school'  && <SchoolTab  userId={user?.id} profile={profile} />}
      {activeTab === 'monthly' && <MonthlyTab userId={user?.id} profile={profile} />}
    </div>
  )
}