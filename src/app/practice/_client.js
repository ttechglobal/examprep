'use client'
// src/app/practice/_client.js — EXL ExamPrep redesign
// Public free practice page — no auth required.
// Dark-first, matches the app's game-feel design system.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EXAM_OPTIONS = [
  { key: 'WAEC', label: 'WAEC', sub: 'West African Senior School Certificate', color: '#18B7F2', bg: 'rgba(24,183,242,.12)', border: 'rgba(24,183,242,.3)' },
  { key: 'JAMB', label: 'JAMB', sub: 'Joint Admissions & Matriculation Board', color: '#9b7ae0', bg: 'rgba(155,122,224,.12)', border: 'rgba(155,122,224,.3)' },
  { key: 'IGCSE', label: 'IGCSE', sub: 'Cambridge International Certificate', color: '#4ade80', bg: 'rgba(74,222,128,.1)', border: 'rgba(74,222,128,.25)' },
]
const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getIcon = n => SUBJECT_ICONS[n] ?? SUBJECT_ICONS.default

const COUNTS = [
  { n: 5,  label: 'Quick 5',  sub: '~4 mins',  gold: true },
  { n: 10, label: '10 Qs',    sub: '~8 mins' },
  { n: 20, label: '20 Qs',    sub: '~15 mins' },
  { n: 40, label: '40 Qs',    sub: '~35 mins' },
]

function LogoMark() {
  return (
    <img
      src="/images/examprep_logo.png"
      alt="ExamPrep A1 logo"
      width={28}
      height={28}
      style={{ flexShrink: 0, objectFit: 'contain', display: 'block' }}
    />
  )
}

export default function FreePracticePage() {
  const router = useRouter()
  const [step, setStep]       = useState(1)
  const [exam, setExam]       = useState(null)
  const [subjects, setSubjects] = useState([])
  const [subject, setSubject] = useState(null)
  const [count, setCount]     = useState(5)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!exam) return
    setLoading(true); setSubject(null); setSubjects([])
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => {
        const filtered = Array.isArray(data) ? data.filter(s => s.is_active && s.exam_type === exam) : []
        setSubjects(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [exam])

  const examCfg = EXAM_OPTIONS.find(e => e.key === exam)

  function handleStart() {
    if (!exam || !subject) return
    setStarting(true)
    sessionStorage.setItem('practice_config', JSON.stringify({
      subjects: [subject.name], subject_id: subject.id,
      examType: exam, count, mode: 'mixed', answerMode: 'practice', isGuest: true,
    }))
    router.push('/student/practice/session')
  }

  const css = `
    @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes slide-up{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
    .fp-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px 18px;cursor:pointer;text-align:left;width:100%;font-family:inherit;transition:all .12s;display:flex;align-items:center;gap:14px}
    .fp-card:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.14)}
    .fp-card.selected{background:rgba(18,183,242,.1);border-color:rgba(24,183,242,.4)}
    .step-btn{width:100%;padding:15px 0;border-radius:14px;border:none;cursor:pointer;font-family:inherit;font-size:15px;font-weight:900;color:#fff;background:#1264E5;box-shadow:0 5px 0 #0a3fa0,0 8px 20px rgba(18,100,229,.3);letter-spacing:-.015em;position:relative;overflow:hidden;transition:transform .1s,box-shadow .1s}
    .step-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #0a3fa0}
    .step-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);background-size:200% 100%;animation:shimmer 2.5s infinite}
    .step-btn:disabled{background:#374151;box-shadow:none;cursor:default}
    .back-btn{width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:pointer;color:rgba(255,255,255,.6);font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:inherit}
  `

  const stepLabels = ['Exam', 'Subject', 'Questions']

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0c14', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{css}</style>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(6,10,20,.85)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <LogoMark />
          <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-.03em' }}>Exam<span style={{ fontWeight: 400, color: 'rgba(255,255,255,.38)' }}>Prep</span></span>
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textDecoration: 'none', padding: '7px 12px' }}>Log in</Link>
          <Link href="/signup" style={{ fontSize: 13, fontWeight: 800, color: '#fff', textDecoration: 'none', padding: '7px 16px', borderRadius: 10, background: '#1264E5', boxShadow: '0 3px 0 #0a3fa0' }}>Sign up free</Link>
        </div>
      </nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 60px', maxWidth: 500, margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '40px 0 28px', animation: 'slide-up .4s ease' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,184,0,.12)', border: '1px solid rgba(255,184,0,.28)', borderRadius: 999, padding: '5px 13px', marginBottom: 18 }}>
            <span>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#FFB800', textTransform: 'uppercase', letterSpacing: '.1em' }}>Free · No signup needed</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-.035em', lineHeight: 1.1, marginBottom: 10 }}>
            Start practising now
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
            WAEC and JAMB past questions. Real exam format.<br/>Instant explanations on every answer.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 28 }}>
          {stepLabels.map((label, i) => {
            const n = i + 1, done = step > n, active = step === n
            const col = active ? '#18B7F2' : done ? '#4ade80' : 'rgba(255,255,255,.2)'
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: done ? '#4ade80' : active ? '#18B7F2' : 'rgba(255,255,255,.07)', color: done || active ? '#fff' : 'rgba(255,255,255,.3)', border: `2px solid ${col}`, transition: 'all .2s' }}>
                    {done ? '✓' : n}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: col, transition: 'color .2s' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ height: 2, flex: .4, background: done ? '#4ade80' : 'rgba(255,255,255,.08)', margin: '0 4px 14px', transition: 'background .2s' }} />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Exam */}
        {step === 1 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, animation: 'slide-up .3s ease' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>Which exam are you preparing for?</p>
            {EXAM_OPTIONS.map(e => (
              <button key={e.key} onClick={() => { setExam(e.key); setStep(2) }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 16, cursor: 'pointer', textAlign: 'left', background: 'rgba(255,255,255,.04)', border: `1.5px solid rgba(255,255,255,.09)`, width: '100%', fontFamily: 'inherit', transition: 'all .12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${EXAM_OPTIONS.find(x=>x.key===e.currentTarget.dataset.key)?.bg ?? 'rgba(255,255,255,.07)'}` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                data-key={e.key}
              >
                <div style={{ width: 44, height: 44, borderRadius: 13, background: e.bg, border: `1px solid ${e.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: e.color, flexShrink: 0 }}>{e.key}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{e.label}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{e.sub}</p>
                </div>
                <span style={{ fontSize: 18, color: 'rgba(255,255,255,.25)' }}>›</span>
              </button>
            ))}
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', textAlign: 'center', lineHeight: 1.6, marginTop: 16 }}>
              Real past questions · Instant explanations · Used by students across Nigeria
            </p>
          </div>
        )}

        {/* Step 2: Subject */}
        {step === 2 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, animation: 'slide-up .3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button className="back-btn" onClick={() => setStep(1)}>←</button>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>
                Choose a <span style={{ color: examCfg?.color ?? '#18B7F2' }}>{exam}</span> subject
              </p>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 10px', border: `3px solid ${examCfg?.color ?? '#18B7F2'}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)' }}>Loading subjects…</p>
              </div>
            ) : subjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(255,255,255,.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>No subjects available yet</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Questions for {exam} are being added. Check back soon.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {subjects.map(s => {
                  const on = subject?.id === s.id
                  const cfg = examCfg
                  return (
                    <button key={s.id} onClick={() => setSubject(s)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 7,
                      padding: '14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                      background: on ? (cfg?.bg ?? 'rgba(24,183,242,.12)') : 'rgba(255,255,255,.04)',
                      border: `1.5px solid ${on ? (cfg?.color ?? '#18B7F2') : 'rgba(255,255,255,.08)'}`,
                      transition: 'all .12s',
                    }}>
                      <span style={{ fontSize: 22 }}>{getIcon(s.name)}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: on ? (cfg?.color ?? '#18B7F2') : '#fff', lineHeight: 1.3, textAlign: 'left' }}>{s.name}</span>
                      {on && <span style={{ fontSize: 10, fontWeight: 700, color: cfg?.color ?? '#18B7F2' }}>✓ Selected</span>}
                    </button>
                  )
                })}
              </div>
            )}
            {subject && (
              <button className="step-btn" onClick={() => setStep(3)} style={{ marginTop: 4 }}>
                Continue with {subject.name} →
              </button>
            )}
          </div>
        )}

        {/* Step 3: Count */}
        {step === 3 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, animation: 'slide-up .3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button className="back-btn" onClick={() => setStep(2)}>←</button>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>How many questions?</p>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: examCfg ? examCfg.bg : 'rgba(24,183,242,.1)', border: `1px solid ${examCfg?.border ?? 'rgba(24,183,242,.3)'}` }}>
              <span style={{ fontSize: 20 }}>{getIcon(subject?.name ?? '')}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: examCfg?.color ?? '#18B7F2' }}>{subject?.name}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{exam}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {COUNTS.map(c => {
                const on = count === c.n
                return (
                  <button key={c.n} onClick={() => setCount(c.n)} style={{
                    padding: '16px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    background: on ? (c.gold ? 'linear-gradient(135deg,#FFB800,#FF6A00)' : '#1264E5') : 'rgba(255,255,255,.04)',
                    border: `1.5px solid ${on ? 'transparent' : 'rgba(255,255,255,.08)'}`,
                    boxShadow: on ? (c.gold ? '0 4px 0 #b85000' : '0 4px 0 #0a3fa0') : 'none',
                    transition: 'all .12s', position: 'relative',
                  }}>
                    {c.gold && <div style={{ position: 'absolute', top: -8, right: -4, background: '#FFB800', borderRadius: 6, fontSize: 8, fontWeight: 900, color: '#062A78', padding: '2px 6px' }}>RECOMMENDED</div>}
                    <p style={{ fontSize: 22, fontWeight: 900, color: on ? '#fff' : '#fff', marginBottom: 2 }}>{c.n}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: on ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.35)' }}>{c.label}</p>
                    <p style={{ fontSize: 10, color: on ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.25)' }}>{c.sub}</p>
                  </button>
                )
              })}
            </div>

            <button className="step-btn" onClick={handleStart} disabled={starting} style={{ marginTop: 4 }}>
              {starting ? 'Starting…' : `Start ${count} questions →`}
            </button>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textAlign: 'center', lineHeight: 1.6 }}>
              No account needed. After you finish, you'll see your score and what to improve.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}