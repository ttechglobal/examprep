'use client'
// src/components/student/JoinSchool.jsx
// "Connect your school" widget used on the leaderboard and profile pages.
//
// Two flows:
//   1. Student has a school code → enters it, calls /api/school/join
//   2. Student's school isn't on ExamPrep yet → clicks "My school doesn't have a code"
//      → fills in a short request form → calls /api/school/request-onboarding
//
// NOTE: this uses the SCHOOL / COHORT invite-code flow (/api/school/join).
// It is NOT the premium access-code flow (/api/access-codes/redeem), which is
// for schools selling premium licences to students. Keep them separate.

import { useState } from 'react'

const BLUE  = '#1264E5'
const GREEN = '#22c55e'
const RED   = '#f43f5e'
const NAVY  = '#062A78'

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]

// ── Sub-component: request form shown when school has no code ──────────────────
function RequestForm({ studentId, onDone }) {
  const [schoolName, setSchoolName] = useState('')
  const [state,      setState]      = useState('')
  const [phone,      setPhone]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState(null)

  async function submit() {
    if (!schoolName.trim()) { setErr('Please enter your school name.'); return }
    setSaving(true)
    setErr(null)
    try {
      await fetch('/api/school/request-onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: schoolName.trim(),
          state:       state || null,
          phone:       phone.trim() || null,
          student_id:  studentId ?? null,
        }),
      })
      // Always succeed from the student's perspective — backend is best-effort
      onDone()
    } catch {
      setErr('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>
        Tell us about your school
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.5, marginBottom: 2 }}>
        We'll reach out to your school and get them set up on ExamPrep.
      </div>

      {/* School name */}
      <input
        value={schoolName}
        onChange={e => { setSchoolName(e.target.value); setErr(null) }}
        placeholder="School name *"
        maxLength={120}
        style={inputStyle(!!err && !schoolName.trim())}
      />

      {/* State */}
      <select
        value={state}
        onChange={e => setState(e.target.value)}
        style={{ ...inputStyle(false), color: state ? 'var(--text-prim)' : 'var(--text-tert)' }}
      >
        <option value="">State (optional)</option>
        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Contact phone */}
      <input
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="School phone / contact (optional)"
        maxLength={20}
        type="tel"
        style={inputStyle(false)}
      />

      {err && <p style={{ fontSize: 11, color: RED, margin: 0 }}>{err}</p>}

      <button
        onClick={submit}
        disabled={saving}
        style={{
          padding: '10px', borderRadius: 10, border: 'none',
          background: NAVY, color: '#fff', fontSize: 13, fontWeight: 800,
          cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Sending…' : 'Submit request →'}
      </button>
    </div>
  )
}

function inputStyle(hasError) {
  return {
    width: '100%', padding: '9px 12px', borderRadius: 10, boxSizing: 'border-box',
    border: `1.5px solid ${hasError ? RED : 'var(--border)'}`,
    background: 'var(--bg-card)', color: 'var(--text-prim)',
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }
}

// ── Main widget ────────────────────────────────────────────────────────────────
export default function JoinSchool({ profile, onLinked, compact = false }) {
  const [code,        setCode]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState(null)
  const [done,        setDone]        = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [requested,   setRequested]   = useState(false)

  const isConnected = !!(profile?.school_id)
  const schoolLabel = profile?.school_name || (isConnected ? 'School connected' : null)

  async function connect() {
    const clean = code.trim().toUpperCase()
    if (!clean) return
    setSaving(true)
    setErr(null)
    try {
      const res  = await fetch('/api/school/join', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Invalid code — check with your teacher and try again')
      setDone(true)
      onLinked?.({
        school_id:   data.school_id   ?? data.cohort?.school_id ?? null,
        school_name: data.school_name ?? data.cohort?.school    ?? null,
      })
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Already connected ────────────────────────────────────────────────────────
  if (done || isConnected) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: compact ? '8px 12px' : '10px 14px',
        borderRadius: compact ? 10 : 12,
        background: 'rgba(34,197,94,.06)',
        border: '1px solid rgba(34,197,94,.25)',
      }}>
        <span style={{ fontSize: compact ? 16 : 18 }}>🏫</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: compact ? 11 : 12, fontWeight: 800, color: GREEN }}>
            School connected
          </div>
          {schoolLabel && (
            <div style={{
              fontSize: 11, color: 'var(--text-tert)', marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {schoolLabel}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>✓</span>
      </div>
    )
  }

  // ── Request sent confirmation ────────────────────────────────────────────────
  if (requested) {
    return (
      <div style={{
        padding: compact ? '10px 12px' : '14px 16px',
        borderRadius: compact ? 10 : 12,
        background: 'rgba(18,100,229,.05)',
        border: '1px solid rgba(18,100,229,.18)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>🎉</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 4 }}>
          Request sent!
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.5 }}>
          We'll reach out to your school and let you know when they're set up on ExamPrep.
        </div>
      </div>
    )
  }

  // ── Code entry + "no code" toggle ────────────────────────────────────────────
  return (
    <div style={{
      padding: compact ? '10px 12px' : '12px 14px',
      borderRadius: compact ? 10 : 12,
      background: 'rgba(6,42,120,.03)',
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🏫</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>
            Connect your school
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tert)' }}>
            Enter the school code your teacher gave you
          </div>
        </div>
      </div>

      {!showRequest ? (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setErr(null) }}
              onKeyDown={e => e.key === 'Enter' && connect()}
              placeholder="e.g. KINGS2025"
              maxLength={20}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 10,
                border: `1.5px solid ${err ? RED : 'var(--border)'}`,
                background: 'var(--bg-card)', color: 'var(--text-prim)',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
                letterSpacing: '.05em', fontWeight: 700, textTransform: 'uppercase',
              }}
            />
            <button
              onClick={connect}
              disabled={saving || !code.trim()}
              style={{
                padding: '9px 16px', borderRadius: 10, border: 'none',
                background: BLUE, color: '#fff', fontSize: 13, fontWeight: 800,
                cursor: saving || !code.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: saving || !code.trim() ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? '…' : 'Connect'}
            </button>
          </div>

          {err && (
            <p style={{ fontSize: 11, color: RED, marginTop: 6, margin: '6px 0 0' }}>
              {err}
            </p>
          )}

          {/* "No code" link */}
          <button
            onClick={() => { setShowRequest(true); setErr(null) }}
            style={{
              marginTop: 10, padding: 0, border: 'none', background: 'none',
              fontSize: 11, color: 'var(--text-tert)', cursor: 'pointer',
              fontFamily: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted',
              textUnderlineOffset: 2,
            }}
          >
            My school doesn't have a code
          </button>
        </>
      ) : (
        <>
          <RequestForm
            studentId={profile?.id ?? null}
            onDone={() => setRequested(true)}
          />
          <button
            onClick={() => setShowRequest(false)}
            style={{
              marginTop: 8, padding: 0, border: 'none', background: 'none',
              fontSize: 11, color: 'var(--text-tert)', cursor: 'pointer',
              fontFamily: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted',
              textUnderlineOffset: 2,
            }}
          >
            ← Back — I have a code
          </button>
        </>
      )}
    </div>
  )
}