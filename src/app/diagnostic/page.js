'use client'
// src/app/diagnostic/page.js — EXL ExamPrep redesign
// Diagnostic setup page — dark game-feel design, matches the app.

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const ALL_SUBJECTS = [
  'Mathematics','English Language','Physics','Chemistry',
  'Biology','Economics','Government','Literature in English',
  'Geography','Agricultural Science','Further Mathematics','Commerce',
]

const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮',
}
const SUBJECT_COLORS = {
  'Physics':'#18B7F2','Chemistry':'#9b7ae0','Biology':'#4ade80',
  'Mathematics':'#FFB800','Further Mathematics':'#FFB800',
  'English Language':'#f472b6','Use of English':'#f472b6',
  'Economics':'#fbbf24','Government':'#f87171','Geography':'#34d399',
  'Literature in English':'#a78bfa','Agricultural Science':'#86efac',
  'Commerce':'#60a5fa','Accounting':'#6ee7b7',
  'default':'#18B7F2',
}
const getIcon  = n => SUBJECT_ICONS[n]  ?? '📝'
const getColor = n => SUBJECT_COLORS[n] ?? SUBJECT_COLORS.default

function LogoMark() {
  return (
    <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#062A78', boxShadow: '0 3px 0 #020c20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="15" height="15" viewBox="0 0 512 512" fill="none">
          <path d="M292 105C235 103 167 118 137 153C112 182 122 208 155 215C185 221 222 210 263 196L226 236C185 253 139 274 131 307C122 344 165 363 208 354C250 345 292 323 331 298L302 353C267 379 210 406 155 403C98 400 64 369 76 325C86 286 120 262 165 241C124 247 83 239 69 210C52 175 81 136 121 116C164 94 226 83 292 86Z" fill="url(#dlg)"/>
          <defs><linearGradient id="dlg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#18B7F2"/><stop offset=".5" stopColor="#1264E5"/><stop offset="1" stopColor="#062A78"/></linearGradient></defs>
        </svg>
      </div>
      <div style={{ position: 'absolute', top: -5, right: -7, background: '#FFB800', borderRadius: 3, fontSize: 6, fontWeight: 900, color: '#062A78', padding: '1px 3px', lineHeight: 1.4 }}>A1</div>
    </div>
  )
}

function DiagnosticSetup() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const presetSubject = searchParams.get('subject') ?? ''
  const presetExam    = searchParams.get('exam') ?? ''

  const [examType,          setExamType]          = useState(presetExam || '')
  const [selectedSubject,   setSelectedSubject]   = useState(presetSubject || '')
  const [enrolledSubjects,  setEnrolledSubjects]  = useState([])
  const [diagnosedSubjects, setDiagnosedSubjects] = useState(new Set())
  const [isSignedIn,        setIsSignedIn]        = useState(false)
  const [loadingProfile,    setLoadingProfile]    = useState(true)
  const [error,             setError]             = useState(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoadingProfile(false); return }
      setIsSignedIn(true)
      try {
        const [{ data: profile }, { data: diagResults }] = await Promise.all([
          supabase.from('profiles').select('subjects, exam_type').eq('id', user.id).single(),
          supabase.from('diagnostic_results').select('subjects(name)').eq('student_id', user.id),
        ])
        let enrolled = []
        if (profile?.subjects) {
          try { enrolled = Array.isArray(profile.subjects) ? profile.subjects : JSON.parse(profile.subjects) } catch {}
        }
        setEnrolledSubjects(enrolled)
        if (!examType && profile?.exam_type) setExamType(profile.exam_type)
        const names = new Set((Array.isArray(diagResults) ? diagResults : []).map(r => r.subjects?.name).filter(Boolean))
        setDiagnosedSubjects(names)
        if (!presetSubject && enrolled.length) {
          const firstUndone = enrolled.find(s => !names.has(s))
          if (firstUndone) setSelectedSubject(firstUndone)
        }
      } catch {}
      setLoadingProfile(false)
    })
  }, []) // eslint-disable-line

  function handleStart() {
    if (!examType)        { setError('Please select your target exam'); return }
    if (!selectedSubject) { setError('Please select a subject to test'); return }
    setError(null)
    sessionStorage.setItem('diagnostic_setup', JSON.stringify({
      examType, subjects: [selectedSubject], questionCount: 10, isPractice: isSignedIn,
    }))
    router.push('/diagnostic/test')
  }

  const subjectsToShow = isSignedIn && enrolledSubjects.length ? enrolledSubjects : ALL_SUBJECTS

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    @keyframes spin { to { transform: rotate(360deg) } }
    @keyframes slide-up { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
    .subj-btn { width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 13px; cursor: pointer; text-align: left; font-family: inherit; transition: all .12s; border: 1.5px solid rgba(255,255,255,.07); background: rgba(255,255,255,.03); }
    .subj-btn:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); }
    .exam-btn { flex: 1; padding: 12px 0; border-radius: 12px; font-size: 14px; font-weight: 800; border: 1.5px solid rgba(255,255,255,.1); cursor: pointer; font-family: inherit; transition: all .15s; background: rgba(255,255,255,.04); color: rgba(255,255,255,.45); }
    .start-btn { width: 100%; padding: 15px 0; border-radius: 14px; border: none; cursor: pointer; font-family: inherit; font-size: 15px; font-weight: 900; color: #fff; background: #1264E5; box-shadow: 0 5px 0 #0a3fa0, 0 8px 20px rgba(18,100,229,.3); letter-spacing: -.015em; position: relative; overflow: hidden; transition: transform .1s, box-shadow .1s; }
    .start-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #0a3fa0; }
    .start-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent); background-size: 200% 100%; animation: shimmer 2.5s infinite; }
    .start-btn:disabled { background: #374151; box-shadow: none; cursor: default; }
    .start-btn:disabled::after { display: none; }
  `

  if (loadingProfile) return (
    <div style={{ minHeight: '100dvh', background: '#0a0c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#18B7F2', animation: 'spin .7s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

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
          {isSignedIn
            ? <>
                <Link href="/student/dashboard" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.4)', textDecoration: 'none', padding: '7px 12px' }}>Skip →</Link>
                <Link href="/student/dashboard" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)', textDecoration: 'none', padding: '7px 12px' }}>Dashboard →</Link>
              </>
            : <>
                <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textDecoration: 'none', padding: '7px 12px' }}>Log in</Link>
                <Link href="/signup" style={{ fontSize: 13, fontWeight: 800, color: '#fff', textDecoration: 'none', padding: '7px 16px', borderRadius: 10, background: '#1264E5', boxShadow: '0 3px 0 #0a3fa0' }}>Sign up</Link>
              </>
          }
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 60px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '40px 0 32px', animation: 'slide-up .4s ease' }}>
          {/* Diagnostic icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,rgba(24,183,242,.2),rgba(18,100,229,.2))', border: '1px solid rgba(24,183,242,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 18px' }}>🩺</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-.035em', lineHeight: 1.1, marginBottom: 10 }}>
            {isSignedIn ? 'Run a diagnostic' : 'Free diagnostic test'}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.65, maxWidth: 340, margin: '0 auto' }}>
            {isSignedIn
              ? 'Pick one subject. We\'ll find your weak areas and add them to your study plan.'
              : '10 quick questions to see exactly where you stand. No account needed.'}
          </p>
        </div>

        {/* Card */}
        <div style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, overflow: 'hidden', animation: 'slide-up .4s .1s ease both' }}>

          {/* Exam toggle */}
          <div style={{ padding: '18px 18px 16px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(255,255,255,.35)', marginBottom: 12 }}>Target exam</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['WAEC','JAMB'].map(et => {
                const on = examType === et
                const col = et === 'WAEC' ? '#18B7F2' : '#9b7ae0'
                return (
                  <button key={et} className="exam-btn" onClick={() => setExamType(et)} style={{
                    background: on ? `${col}18` : 'rgba(255,255,255,.04)',
                    borderColor: on ? col : 'rgba(255,255,255,.1)',
                    color: on ? col : 'rgba(255,255,255,.45)',
                    boxShadow: on ? `0 0 0 1px ${col}25` : 'none',
                  }}>{et}</button>
                )
              })}
            </div>
          </div>

          {/* Subject picker */}
          <div style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(255,255,255,.35)', marginBottom: 12 }}>Choose one subject</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
              {subjectsToShow.map(subj => {
                const on   = selectedSubject === subj
                const done = diagnosedSubjects.has(subj)
                const col  = getColor(subj)
                const icon = getIcon(subj)
                return (
                  <button key={subj} className="subj-btn" onClick={() => setSelectedSubject(subj)} style={{
                    background: on ? `${col}14` : 'rgba(255,255,255,.03)',
                    borderColor: on ? `${col}45` : 'rgba(255,255,255,.07)',
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${col}18`, border: `1px solid ${col}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: on ? 800 : 600, color: on ? col : '#fff' }}>{subj}</span>
                    {done && !on && <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.3)', background: 'rgba(255,255,255,.06)', borderRadius: 6, padding: '2px 7px' }}>retake</span>}
                    {on && <div style={{ width: 18, height: 18, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="9" height="9" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg></div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info strip */}
          <div style={{ margin: '0 18px 16px', padding: '11px 14px', background: 'rgba(24,183,242,.07)', border: '1px solid rgba(24,183,242,.18)', borderRadius: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(24,183,242,.9)', lineHeight: 1.55 }}>
              <strong>10 questions · ~5 minutes</strong> — We draw from the highest-frequency exam topics first.
              {isSignedIn && ' Results update your study plan automatically.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: '0 18px 14px', padding: '10px 14px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)', borderRadius: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>{error}</p>
            </div>
          )}

          {/* CTA */}
          <div style={{ padding: '0 18px 18px' }}>
            <button className="start-btn" onClick={handleStart} disabled={!examType || !selectedSubject}>
              {selectedSubject ? `Start ${selectedSubject} diagnostic →` : 'Select a subject to start →'}
            </button>
            {isSignedIn && (
              <Link href="/student/dashboard" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,.35)', textDecoration: 'none' }}>
                Skip for now — go to dashboard →
              </Link>
            )}
          </div>
        </div>

        {/* Links */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          {isSignedIn ? (
            <Link href="/student/study-plan" style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
              View your study plan →
            </Link>
          ) : (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', lineHeight: 1.6 }}>
              Have an account?{' '}
              <Link href="/login" style={{ color: '#18B7F2', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
              {' '}to save your results.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DiagnosticPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: '#0a0c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#18B7F2', animation: 'spin .7s linear infinite' }} />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    }>
      <DiagnosticSetup />
    </Suspense>
  )
}