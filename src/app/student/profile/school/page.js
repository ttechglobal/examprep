'use client'
// src/app/student/profile/school/page.js
// School connection page — enter cohort invite code to join school

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SchoolConnectionPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,   setProfile]   = useState(null)
  const [code,      setCode]      = useState('')
  const [loading,   setLoading]   = useState(true)
  const [joining,   setJoining]   = useState(false)
  const [leaving,   setLeaving]   = useState(false)
  const [message,   setMessage]   = useState(null)
  const [cohortInfo, setCohortInfo] = useState(null) // { name, schoolName }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      // Check if already in a cohort
      if (prof?.school_id) {
        const { data: membership } = await supabase
          .from('cohort_members')
          .select('cohort_id, cohorts(name, schools(name))')
          .eq('student_id', user.id)
          .maybeSingle()
        if (membership?.cohorts) {
          setCohortInfo({
            name: membership.cohorts.name,
            schoolName: membership.cohorts.schools?.name ?? prof.school_name ?? 'Your school',
          })
        }
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  async function joinCohort() {
    if (!code.trim()) return
    setJoining(true)
    setMessage(null)
    try {
      const res = await fetch('/api/school/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to join')
      setMessage({ type: 'success', text: `Joined ${data.cohort_name ?? 'cohort'} ✓` })
      setCohortInfo({ name: data.cohort_name, schoolName: data.school_name })
      setCode('')
      // Refresh profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
      setProfile(prof)
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setJoining(false)
    }
  }

  async function leaveCohort() {
    if (!window.confirm('Leave your current school cohort?')) return
    setLeaving(true)
    // Remove from cohort_members and clear school_id
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cohort_members').delete().eq('student_id', user.id)
    await supabase.from('profiles').update({ school_id: null, school_name: null }).eq('id', user.id)
    setCohortInfo(null)
    setProfile(prev => ({ ...prev, school_id: null, school_name: null }))
    setLeaving(false)
    setMessage({ type: 'success', text: 'Left cohort ✓' })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isConnected = !!cohortInfo

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em' }}>School & Class</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tert)', marginTop: 2 }}>Connect to your school's cohort</p>
        </div>
      </div>

      {message && (
        <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {message.text}
        </div>
      )}

      {/* Current connection status */}
      {isConnected ? (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--success)', marginBottom: 4 }}>✓ Connected</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-prim)' }}>{cohortInfo.schoolName}</p>
              <p style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 2 }}>{cohortInfo.name}</p>
            </div>
            <button onClick={leaveCohort} disabled={leaving}
              style={{ padding: '6px 12px', borderRadius: 9, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              {leaving ? '…' : 'Leave'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 10, lineHeight: 1.5 }}>
            Your practice results are shared with your school's dashboard. Your teacher can see your topic mastery and activity.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 4 }}>🏫 Not connected to a school</p>
          <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.55 }}>
            If your school uses ExamPrep, ask your teacher for the class invite code.
          </p>
        </div>
      )}

      {/* Join form */}
      {!isConnected && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)' }}>Join with an invite code</p>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && joinCohort()}
            placeholder="e.g. KINGS24"
            maxLength={10}
            style={{ padding: '13px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 18, fontWeight: 800, letterSpacing: '.1em', textAlign: 'center', outline: 'none', textTransform: 'uppercase' }}
            onFocus={e => e.target.style.borderColor = 'var(--active-border)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button onClick={joinCohort} disabled={joining || !code.trim()}
            style={{ padding: '14px', borderRadius: 14, background: '#0b1330', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: joining || !code.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 5px 0 #05070f', opacity: joining || !code.trim() ? 0.5 : 1 }}>
            {joining ? 'Joining…' : 'Join cohort →'}
          </button>
        </div>
      )}

      {/* What being connected means */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10 }}>What being connected means</p>
        {[
          ['📊', 'Your class rank is shown on the leaderboard (opt-in)'],
          ['🏫', 'Your teacher can see class-wide weak topics'],
          ['✓', 'Your topic mastery feeds the school progress dashboard'],
          ['🔒', 'Your personal data stays private — only aggregates are shared'],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 9 }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <p style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.55 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}