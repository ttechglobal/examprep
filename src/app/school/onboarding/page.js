'use client'
// src/app/school/onboarding/page.js
// Route: /school/onboarding
//
// Shown after signup when the school name hasn't been set yet.
// Collects: school name (required), city, state.
// Calls POST /api/school/setup then redirects to /school/dashboard.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const NAVY   = '#062A78'
const BG     = '#f0f4ff'
const WHITE  = '#ffffff'
const BORDER = '#dde4f5'
const TEXT   = '#071B49'
const DIM    = '#7a8aaa'
const FAINT  = '#b0bada'
const ERR    = '#dc2626'
const GREEN  = '#059669'

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa',
  'Benue','Borno','Cross River','Delta','Ebonyi','Edo',
  'Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna',
  'Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers',
  'Sokoto','Taraba','Yobe','Zamfara',
]

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:FAINT, marginBottom:7 }}>
        {label}{required && <span style={{ color:ERR, marginLeft:2 }}>*</span>}
        {hint && <span style={{ textTransform:'none', letterSpacing:0, fontWeight:500, color:FAINT, marginLeft:6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = (filled) => ({
  width:'100%', padding:'12px 14px', borderRadius:12, boxSizing:'border-box',
  border:`1.5px solid ${filled ? NAVY : BORDER}`,
  background:'#f7f8fc', fontSize:14, color:TEXT, outline:'none',
  fontFamily:'inherit', transition:'border-color .15s',
})

export default function SchoolOnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [schoolName, setSchoolName] = useState('')
  const [city,       setCity]       = useState('')
  const [state,      setState]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  // Guard: make sure user is authenticated
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/school-login')
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!schoolName.trim()) { setError('School name is required'); return }
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/school/setup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ schoolName: schoolName.trim(), city: city.trim(), state }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      router.push('/school/dashboard')
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100dvh', background:BG, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 16px', gap:20 }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:11, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:'#fff', boxShadow:'0 4px 0 #03153d' }}>E</div>
        <span style={{ fontSize:15, fontWeight:800, color:TEXT }}>ExamPrep</span>
      </Link>

      {/* Card */}
      <div style={{ width:'100%', maxWidth:440, background:WHITE, borderRadius:24, border:`1px solid ${BORDER}`, padding:'32px 28px', boxShadow:'0 4px 24px rgba(6,42,120,.07)' }}>

        {/* Badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(5,150,105,.08)', border:'1px solid rgba(5,150,105,.2)', borderRadius:999, padding:'4px 12px', marginBottom:20 }}>
          <span>🏫</span>
          <span style={{ fontSize:10, fontWeight:800, color:GREEN, textTransform:'uppercase', letterSpacing:'.08em' }}>Almost ready</span>
        </div>

        <h1 style={{ fontSize:22, fontWeight:900, color:TEXT, letterSpacing:'-.03em', marginBottom:6 }}>
          Tell us about your school
        </h1>
        <p style={{ fontSize:13, color:DIM, marginBottom:28, lineHeight:1.6 }}>
          This shows on your dashboard and on student reports.
        </p>

        {error && (
          <div style={{ padding:'12px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, fontSize:13, color:ERR, marginBottom:20, lineHeight:1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

          <Field label="School name" required>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="e.g. Kings College Lagos"
              autoFocus
              style={inputStyle(schoolName)}
            />
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="City">
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Lagos"
                style={inputStyle(city)}
              />
            </Field>

            <Field label="State">
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                style={{ ...inputStyle(state), cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23b0bada' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', paddingRight:32 }}
              >
                <option value="">Select</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading || !schoolName.trim()}
            style={{
              width:'100%', padding:'14px', borderRadius:13, border:'none', marginTop:6,
              background: (loading || !schoolName.trim()) ? '#e2e8f0' : NAVY,
              color:      (loading || !schoolName.trim()) ? DIM        : '#fff',
              fontSize:15, fontWeight:800,
              cursor: loading ? 'wait' : !schoolName.trim() ? 'not-allowed' : 'pointer',
              boxShadow: (loading || !schoolName.trim()) ? 'none' : '0 5px 0 #03153d',
              letterSpacing:'-.01em', fontFamily:'inherit', transition:'all .15s',
            }}
          >
            {loading ? 'Setting up your dashboard…' : 'Go to my dashboard →'}
          </button>
        </form>
      </div>

      <p style={{ fontSize:12, color:FAINT }}>
        Need help?{' '}
        <a href="mailto:schools@examprep.ng" style={{ color:NAVY, fontWeight:600, textDecoration:'none' }}>schools@examprep.ng</a>
      </p>
    </div>
  )
}