'use client'

// src/app/early-access/page.js
// General lead capture page — used at events, on flyers, shared via QR code.
// Works for: coding competitions, education fairs, school visits, or any
// scenario where someone hears about ExamPrep and wants to sign up their school.
//
// No longer "early access" framing — the platform is live.
// Goal: collect school/educator details so the team can reach out and onboard them.

import { useState } from 'react'

const ROLES = [
  { value: 'school_owner',  label: 'School Owner' },
  { value: 'principal',     label: 'Principal / Head Teacher' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'teacher',       label: 'Teacher' },
]

const DIGITAL_TOOLS_OPTIONS = [
  { value: 'yes_actively',   label: 'Yes — we use digital tools regularly' },
  { value: 'yes_sometimes',  label: 'Yes — occasionally' },
  { value: 'no',             label: 'No — we don\'t currently use any' },
]

const CHALLENGES = [
  { value: 'coverage',    label: 'Covering enough topics before the exam' },
  { value: 'engagement',  label: 'Keeping students motivated to study' },
  { value: 'weak_areas',  label: 'Identifying each student\'s weak areas' },
  { value: 'practice',    label: 'Lack of quality practice questions' },
  { value: 'progress',    label: 'Tracking student progress consistently' },
  { value: 'resources',   label: 'Limited teaching resources and time' },
]

const FEATURES = [
  {
    icon: '📚',
    title: 'Real past questions — WAEC & JAMB',
    desc: 'Thousands of real past exam questions tagged by topic, subtopic, and difficulty. Students practice exactly what shows up.',
  },
  {
    icon: '🧭',
    title: 'Personalized study paths',
    desc: 'A short diagnostic finds each student\'s weak areas. ExamPrep builds a prioritised study plan around them automatically.',
  },
  {
    icon: '📈',
    title: 'Performance trends',
    desc: 'Track improvement over time by subject and topic — not just a score at the end of the term.',
  },
  {
    icon: '🏫',
    title: 'School dashboard',
    desc: 'See which topics your entire class is struggling with most — so you can focus your teaching where it matters.',
  },
  {
    icon: '⚡',
    title: 'Key formulas & flashcards',
    desc: 'Essential facts built around the official exam objectives — so students aren\'t just memorising, they\'re covering what\'s tested.',
  },
  {
    icon: '🎯',
    title: 'Exam simulation',
    desc: 'Full timed mock exams in the exact format of WAEC and JAMB — so students know what exam day feels like before it arrives.',
  },
]

export default function LeadCapturePage() {
  const [form, setForm] = useState({
    full_name: '',
    school_name: '',
    role: '',
    phone: '',
    email: '',
    uses_digital_tools: '',
    biggest_challenge: '',
  })
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.full_name.trim())   return setError('Please enter your full name.')
    if (!form.school_name.trim()) return setError('Please enter your school name.')
    if (!form.role)               return setError('Please select your role.')
    if (!form.email.trim())       return setError('Please enter your email address.')
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(form.email)) return setError('Please enter a valid email address.')

    setLoading(true)
    try {
      const res = await fetch('/api/early-access', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setSubmitted(true)
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const font = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif'

  return (
    <div style={{ fontFamily: font, minHeight: '100vh', background: '#f0f4ff' }}>

      {/* Nav */}
      <header style={{ background: '#062A78', padding: '0 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/examprep_logo.png" alt="ExamPrep" width={30} height={30} style={{ borderRadius: 6 }} />
            <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>ExamPrep</span>
          </div>
          <a
            href="/login"
            style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}
          >
            Already a user? Sign in →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(150deg, #062A78 0%, #1040b8 55%, #1e5fe8 100%)',
        padding: '64px 24px 72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: '#93c5fd',
            letterSpacing: '1.2px', textTransform: 'uppercase',
            margin: '0 0 18px',
          }}>
            For Secondary Schools in Nigeria
          </p>
          <h1 style={{
            fontSize: 'clamp(26px, 5vw, 44px)',
            fontWeight: 800, color: '#fff',
            lineHeight: 1.15, margin: '0 0 18px',
            letterSpacing: '-0.8px',
          }}>
            Your students deserve better WAEC and JAMB preparation
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
            ExamPrep gives every student a personalised path to exam readiness — 
            and gives your school clear visibility into how they're progressing.
          </p>
        </div>
      </section>

      {/* School visibility highlight */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '44px 24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
          }}>
            {[
              { icon: '📊', stat: 'Topic-by-topic', desc: 'See exactly which concepts your class is struggling with' },
              { icon: '📅', stat: 'Week by week', desc: 'Track improvement over time, not just end-of-term scores' },
              { icon: '👤', stat: 'Every student', desc: 'Individual progress visible to teachers, not just aggregates' },
            ].map(({ icon, stat, desc }) => (
              <div key={stat} style={{
                background: '#f8faff',
                border: '1.5px solid #dbeafe',
                borderRadius: 12,
                padding: '20px 20px 22px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#062A78', marginBottom: 4 }}>{stat}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#475569', marginTop: 24, marginBottom: 0 }}>
            ExamPrep isn't just a student app — it's a teaching tool that shows you where to focus before results day.
          </p>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '52px 24px', background: '#f0f4ff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
            Everything students need. Everything schools want to see.
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, margin: '0 0 36px' }}>
            Built specifically for WAEC and JAMB — not a generic quiz app.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 14 }}>
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px 20px 22px',
              }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section style={{ background: '#fff', padding: '56px 24px 72px', borderTop: '1px solid #e2e8f0' }} id="get-started">
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#062A78', margin: '0 0 6px', textAlign: 'center' }}>
            Get ExamPrep for your school
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, margin: '0 0 32px', lineHeight: 1.6 }}>
            Fill in your details and our team will reach out to walk you through getting started.
          </p>

          {submitted ? (
            <SuccessCard />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <Field label="Full name" required>
                  <TextInput placeholder="e.g. Amaka Okonkwo" value={form.full_name} onChange={v => set('full_name', v)} />
                </Field>

                <Field label="School name" required>
                  <TextInput placeholder="e.g. Greenfield Secondary School" value={form.school_name} onChange={v => set('school_name', v)} />
                </Field>

                <Field label="Your role" required>
                  <SelectInput placeholder="Select your role" options={ROLES} value={form.role} onChange={v => set('role', v)} />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Phone number">
                    <TextInput type="tel" placeholder="08012345678" value={form.phone} onChange={v => set('phone', v)} />
                  </Field>
                  <Field label="Email address" required>
                    <TextInput type="email" placeholder="you@school.ng" value={form.email} onChange={v => set('email', v)} />
                  </Field>
                </div>

                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 4, marginTop: 2 }}>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 14px' }}>Two quick questions to help us prepare:</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Field label="Does your school currently use any digital tools for WAEC or JAMB prep?">
                      <SelectInput placeholder="Select an option" options={DIGITAL_TOOLS_OPTIONS} value={form.uses_digital_tools} onChange={v => set('uses_digital_tools', v)} />
                    </Field>

                    <Field label="What's your biggest challenge preparing students for WAEC or JAMB?">
                      <SelectInput placeholder="Select the closest answer" options={CHALLENGES} value={form.biggest_challenge} onChange={v => set('biggest_challenge', v)} />
                    </Field>
                  </div>
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#dc2626' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: 6,
                    width: '100%',
                    padding: '14px 24px',
                    background: loading ? '#93aee8' : '#062A78',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {loading ? 'Sending…' : 'Get ExamPrep for my school →'}
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', margin: 0 }}>
                  No commitment. We'll contact you to explain how it works for your school.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#062A78', padding: '24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          © {new Date().getFullYear()} ExamPrep · Helping Nigerian students ace WAEC and JAMB
        </p>
      </footer>
    </div>
  )
}

function SuccessCard() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
      border: '1.5px solid #bfdbfe',
      borderRadius: 16,
      padding: '40px 32px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🎉</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#062A78', margin: '0 0 10px' }}>
        Thank you! We'll be in touch.
      </h3>
      <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.65, margin: 0 }}>
        We are excited to partner with your school in helping your students prepare for WAEC and JAMB.
        Check your email — we'll reach out to you shortly.
      </p>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '11px 13px',
        border: '1.5px solid #e2e8f0',
        borderRadius: 8, fontSize: 14, color: '#0f172a',
        background: '#fff', outline: 'none', fontFamily: 'inherit',
      }}
      onFocus={e => { e.target.style.borderColor = '#062A78' }}
      onBlur={e =>  { e.target.style.borderColor = '#e2e8f0' }}
    />
  )
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '11px 13px',
        border: '1.5px solid #e2e8f0',
        borderRadius: 8, fontSize: 14,
        color: value ? '#0f172a' : '#94a3b8',
        background: '#fff', outline: 'none', fontFamily: 'inherit',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 13px center',
        cursor: 'pointer',
      }}
      onFocus={e => { e.target.style.borderColor = '#062A78' }}
      onBlur={e =>  { e.target.style.borderColor = '#e2e8f0' }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
