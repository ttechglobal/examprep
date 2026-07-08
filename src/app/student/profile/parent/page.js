'use client'
// src/app/student/profile/parent/page.js
// Parent reports setup page — linked from profile "Parent reports" row

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ParentReportsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,       setProfile]       = useState(null)
  const [parentEmail,   setParentEmail]   = useState('')
  const [enabled,       setEnabled]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [message,       setMessage]       = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setParentEmail(prof?.parent_email ?? '')
      setEnabled(prof?.parent_reports_enabled ?? false)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update({ parent_email: parentEmail.trim() || null, parent_reports_enabled: enabled })
      .eq('id', profile.id)
    setSaving(false)
    if (!error) {
      setMessage({ type: 'success', text: 'Saved ✓' })
      setTimeout(() => setMessage(null), 2000)
    } else {
      setMessage({ type: 'error', text: error.message })
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em' }}>Parent Reports</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tert)', marginTop: 2 }}>Weekly progress summary to your parent</p>
        </div>
      </div>

      {message && (
        <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {message.text}
        </div>
      )}

      {/* Info card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6 }}>👨‍👩‍👧 What gets sent</p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['Days you studied that week', 'Topics you covered', 'Score change vs last week', 'Your current streak'].map(item => (
            <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-sec)' }}>
              <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 12 }}>✓</span>{item}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 12, lineHeight: 1.5 }}>
          Sent every Sunday evening. Your parent can only see your progress — not your account settings.
        </p>
      </div>

      {/* Email input */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 6 }}>Parent email</p>
          <input
            type="email"
            value={parentEmail}
            onChange={e => setParentEmail(e.target.value)}
            placeholder="parent@example.com"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 14, outline: 'none', transition: 'border-color .15s' }}
            onFocus={e => e.target.style.borderColor = 'var(--active-border)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>Enable weekly reports</p>
            <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 2 }}>{enabled ? 'Reports are on' : 'Reports are off'}</p>
          </div>
          <button onClick={() => setEnabled(e => !e)}
            style={{ position: 'relative', width: 48, height: 26, borderRadius: 999, background: enabled ? '#4f46e5' : 'var(--bg-subtle)', border: `1px solid ${enabled ? '#4f46e5' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', left: enabled ? 25 : 3, transition: 'left .2s' }} />
          </button>
        </div>
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving || !parentEmail.trim()}
        style={{ padding: '14px', borderRadius: 14, background: '#0b1330', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: saving || !parentEmail.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 5px 0 #05070f', opacity: saving || !parentEmail.trim() ? 0.5 : 1, transition: 'all .1s' }}>
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  )
}