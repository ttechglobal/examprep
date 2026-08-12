'use client'
// src/app/student/exam/page.js — v5
// Redesigned to match prototype exactly:
//   • Golden hero card with 200 Qs / 2h 30m / 400 max score stats
//   • Subject breakdown table with "% ready" from mastery
//   • Readiness check card with XP bar + study weak topics CTA
//   • Past attempts with grade badge + score + improvement delta
//   • Clean blue Start button

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useIsDark } from '@/lib/useIsDark'

const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮',
}
const SUBJECT_COLORS = {
  'Chemistry':'#9b7ae0','Physics':'#18B7F2','Biology':'#4ade80',
  'Mathematics':'#FFB800','Further Mathematics':'#FFB800',
  'English Language':'#a78bfa','Use of English':'#a78bfa',
  'Economics':'#fcd34d','Government':'#f87171','Geography':'#34d399',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a',
}
const getIcon  = n => SUBJECT_ICONS[n] ?? '📝'
const getColor = n => SUBJECT_COLORS[n] ?? '#9b7ae0'

function xpBar(pct) {
  return (
    <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#18B7F2,#1264E5)', width: `${Math.max(pct, 2)}%`, transition: 'width .8s cubic-bezier(.34,1.56,.64,1)' }} />
    </div>
  )
}

export default function ExamModePage() {
  const router   = useRouter()
  const isDark   = useIsDark()
  const supabase = createClient()

  const [subjects,    setSubjects]    = useState([])
  const [mastery,     setMastery]     = useState({}) // subject_id → pct
  const [examType,    setExamType]    = useState('WAEC')
  const [selected,    setSelected]    = useState([])
  const [pastAttempts, setPastAttempts] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [starting,    setStarting]    = useState(false)
  const [step,        setStep]        = useState(1) // 1 = setup, 2 = review

  const JAMB_COMPULSORY = ['Use of English', 'English Language']
  const isJAMB = examType === 'JAMB'
  const qPerSubject   = isJAMB ? 40 : 50
  const minsPerSubject = isJAMB ? 30 : 90
  const maxSubjects   = isJAMB ? 4 : 9
  const minSubjects   = isJAMB ? 4 : 1

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, subjectsRes, { data: masteryRows }, { data: examAttempts }] = await Promise.all([
        supabase.from('profiles').select('exam_type').eq('id', user.id).single(),
        fetch('/api/student/subjects'),
        supabase.from('student_topic_mastery')
          .select('score, topics(subject_id)')
          .eq('student_id', user.id),
        supabase.from('question_attempts')
          .select('created_at, is_correct, mode')
          .eq('student_id', user.id)
          .eq('mode', 'exam')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      const subjectList = subjectsRes.ok ? await subjectsRes.json() : []
      const examT = prof?.exam_type ?? 'WAEC'
      setExamType(examT === 'JAMB' ? 'JAMB' : 'WAEC')
      setSubjects(subjectList)

      // Build per-subject mastery avg
      const scoreMap = {}
      for (const row of masteryRows ?? []) {
        const sid = row.topics?.subject_id; if (!sid) continue
        if (!scoreMap[sid]) scoreMap[sid] = []
        scoreMap[sid].push(row.score ?? 0)
      }
      const masteryMap = {}
      for (const [sid, scores] of Object.entries(scoreMap)) {
        masteryMap[sid] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }
      setMastery(masteryMap)

      // Build past attempts — group exam attempts by day (each exam = a day's block)
      if (examAttempts?.length > 0) {
        const byDay = {}
        for (const a of examAttempts) {
          const day = a.created_at?.slice(0, 10)
          if (!day) continue
          if (!byDay[day]) byDay[day] = { total: 0, correct: 0 }
          byDay[day].total++
          if (a.is_correct) byDay[day].correct++
        }
        const attempts = Object.entries(byDay)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 5)
          .map(([day, { total, correct }], i, arr) => {
            const pct  = Math.round((correct / total) * 100)
            const prev = arr[i + 1]
            const prevPct = prev ? Math.round((prev[1].correct / prev[1].total) * 100) : null
            const improve = prevPct != null && pct > prevPct ? `+${pct - prevPct}` : null
            const date = new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            return { score: correct, maxScore: total, pct, date, improve }
          })
        setPastAttempts(attempts)
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  // Auto-select subjects when exam type changes
  useEffect(() => {
    if (!subjects.length) return
    if (isJAMB) {
      const eng  = subjects.find(s => JAMB_COMPULSORY.includes(s.name))
      const rest = subjects.filter(s => !JAMB_COMPULSORY.includes(s.name))
      setSelected(eng ? [eng.name, ...rest.slice(0, 3).map(s => s.name)] : rest.slice(0, 4).map(s => s.name))
    } else {
      setSelected(subjects.slice(0, 1).map(s => s.name))
    }
  }, [examType, subjects]) // eslint-disable-line

  function toggleSubject(name) {
    if (JAMB_COMPULSORY.includes(name) && isJAMB) return
    setSelected(prev => {
      if (prev.includes(name)) return prev.filter(s => s !== name)
      if (prev.length >= maxSubjects) return prev
      return [...prev, name]
    })
  }

  async function startExam() {
    setStarting(true)
    sessionStorage.setItem('practice_config', JSON.stringify({
      examType, subjects: selected,
      count: qPerSubject * selected.length,
      durationSecs: minsPerSubject * 60 * selected.length,
      mode: 'exam', isExamMode: true,
    }))
    router.push('/student/exam/session')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #FFB800', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const totalQs   = qPerSubject * selected.length
  const totalMins = minsPerSubject * selected.length
  const h = Math.floor(totalMins / 60), m = totalMins % 60
  const duration  = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
  const needsMore = isJAMB && selected.length < 4
  const canStart  = selected.length >= minSubjects && !needsMore

  // Overall readiness from selected subjects' mastery
  const selectedMastery = selected.map(name => {
    const sub = subjects.find(s => s.name === name)
    return sub ? (mastery[sub.id] ?? 0) : 0
  })
  const overallReadiness = selectedMastery.length
    ? Math.round(selectedMastery.reduce((a, b) => a + b, 0) / selectedMastery.length)
    : 0
  const weakInSelected = selected.filter(name => {
    const sub = subjects.find(s => s.name === name)
    return sub ? (mastery[sub.id] ?? 0) < 40 : true
  })

  return (
    <div style={{ paddingBottom: 100, maxWidth: 560, margin: '0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes exl-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => step === 2 ? setStep(1) : router.back()} style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', border: '1.5px solid var(--border)', color: 'var(--text-sec)', cursor: 'pointer' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', marginBottom: 3 }}>Simulation</p>
          <h1 style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>Mock Exam</h1>
        </div>
        <div style={{ padding: '5px 12px', borderRadius: 999, background: 'rgba(255,184,0,.1)', border: '1px solid rgba(255,184,0,.25)' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#FFB800' }}>+200 XP on completion</span>
        </div>
      </div>

      {step === 1 && (
        <>
          {/* ── Exam type toggle ── */}
          <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 13, padding: 4, marginBottom: 16, border: '1px solid var(--border)' }}>
            {['WAEC', 'JAMB'].map(e => (
              <button key={e} onClick={() => setExamType(e)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: examType === e ? '#1264E5' : 'transparent', color: examType === e ? '#fff' : 'var(--text-tert)', boxShadow: examType === e ? '0 2px 8px rgba(18,100,229,.4)' : 'none', transition: 'all .15s' }}>
                {e}
              </button>
            ))}
          </div>

          {/* ── Hero exam card — prototype golden style ── */}
          <div style={{ borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(145deg,#1a1000 0%,#2a1800 55%,#1a1200 100%)', border: '1.5px solid rgba(255,184,0,.25)', padding: 18, position: 'relative', marginBottom: 14 }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,184,0,.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📝</div>
                <div>
                  <p style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(255,184,0,.6)', marginBottom: 3 }}>Full simulation</p>
                  <p style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>{examType} Mock {new Date().getFullYear()}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { v: String(totalQs),    l: 'Questions' },
                  { v: duration,           l: 'Time limit' },
                  { v: isJAMB ? '400' : String(selected.length * 100), l: 'Max score' },
                ].map(({ v, l }) => (
                  <div key={l} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                    <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 3 }}>{v}</p>
                    <p style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(255,255,255,.35)' }}>{l}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => canStart && setStep(2)} disabled={!canStart}
                style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', cursor: canStart ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 13, fontWeight: 900, color: '#fff', background: canStart ? 'linear-gradient(135deg,#FFB800,#FF6A00)' : 'rgba(255,255,255,.1)', boxShadow: canStart ? '0 5px 0 #b85000, 0 8px 20px rgba(255,106,0,.25)' : 'none', position: 'relative', overflow: 'hidden', transition: 'all .1s', letterSpacing: '-.015em' }}>
                {canStart ? '▶ Start Mock Exam' : needsMore ? `Select ${4 - selected.length} more subject${4 - selected.length > 1 ? 's' : ''}` : 'Select a subject to continue'}
                {canStart && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize: '200% 100%', animation: 'exl-shimmer 2.5s infinite', pointerEvents: 'none' }} />}
              </button>
            </div>
          </div>

          {/* ── JAMB note ── */}
          {isJAMB && (
            <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(18,100,229,.08)', border: '1px solid rgba(18,100,229,.2)', marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#18B7F2', lineHeight: 1.5 }}>
                🎓 JAMB requires exactly 4 subjects. Use of English is automatically included.
              </p>
            </div>
          )}

          {/* ── Subjects in this exam ── */}
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Subjects in this exam</span>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '0 14px', marginBottom: 14 }}>
            {subjects.map((sub, i) => {
              const c       = getColor(sub.name)
              const checked = selected.includes(sub.name)
              const isComp  = JAMB_COMPULSORY.includes(sub.name) && isJAMB
              const dimmed  = !checked && selected.length >= maxSubjects && !isComp
              const pct     = mastery[sub.id] ?? 0
              const pctCol  = pct >= 70 ? '#4ade80' : pct >= 40 ? '#FFB800' : '#f87171'
              return (
                <div key={sub.id} onClick={() => !isComp && !dimmed && toggleSubject(sub.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < subjects.length - 1 ? '1px solid var(--border)' : 'none', cursor: isComp ? 'default' : dimmed ? 'not-allowed' : 'pointer', opacity: dimmed ? 0.35 : 1 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${checked ? c : 'var(--border)'}`, background: checked ? c : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}>
                    {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>}
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${c}14`, border: `1px solid ${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{getIcon(sub.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>{qPerSubject} questions · {Math.round(qPerSubject / totalQs * 100)}% of exam</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: pctCol }}>{pct}% ready</p>
                    {isComp && <p style={{ fontSize: 8, fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Required</p>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Readiness check ── */}
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Readiness check</span>
          <div style={{ padding: 14, background: 'rgba(255,184,0,.06)', border: '1.5px solid rgba(255,184,0,.18)', borderRadius: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>Overall readiness</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#FFB800' }}>{overallReadiness}%</p>
            </div>
            {xpBar(overallReadiness)}
            <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 8, lineHeight: 1.5 }}>
              {weakInSelected.length > 0
                ? `Study ${weakInSelected.slice(0, 2).join(' and ')} before attempting. You're on track for ~${Math.round(overallReadiness * (isJAMB ? 4 : selected.length))}.`
                : 'You look well-prepared! Good luck. 🎉'}
            </p>
            {weakInSelected.length > 0 && (
              <button onClick={() => router.push('/student/learn')} style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,184,0,.3)', background: 'rgba(255,184,0,.08)', color: '#FFB800', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Study weak topics first →
              </button>
            )}
          </div>

          {/* ── Past attempts ── */}
          {pastAttempts.length > 0 && (
            <>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Past attempts</span>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                {pastAttempts.map((a, i) => {
                  const grade   = a.pct >= 80 ? 'A' : a.pct >= 70 ? 'B' : a.pct >= 55 ? 'C' : a.pct >= 45 ? 'D' : 'F'
                  const gradeCol = a.pct >= 55 ? '#4ade80' : '#f87171'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderBottom: i < pastAttempts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: a.pct >= 55 ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', border: `1px solid ${a.pct >= 55 ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: gradeCol, flexShrink: 0 }}>
                        {grade}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{a.score} / {a.maxScore ?? 400}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>{a.date}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 900, color: gradeCol }}>{a.pct}%</p>
                        {a.improve ? <p style={{ fontSize: 9, color: '#4ade80', fontWeight: 700 }}>↑ {a.improve} pts</p> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {step === 2 && (
        <>
          {/* Review summary */}
          <div style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ background: 'linear-gradient(145deg,#1a1000 0%,#2a1800 55%,#1a1200 100%)', padding: '22px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: .04, backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '18px 18px', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.25)', marginBottom: 14 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#FFB800' }}>📝 {examType} Mock Exam</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                  {[{ v: totalQs, l: 'Questions' }, { v: duration, l: 'Duration' }, { v: selected.length, l: 'Subjects' }].map(({ v, l }, i) => (
                    <div key={l} style={{ textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,.1)' : 'none', paddingTop: 4 }}>
                      <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5 }}>{v}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.4)' }}>{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '14px 16px' }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>Subjects in this paper</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {selected.map(name => {
                  const c = getColor(name)
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: `${c}0a`, border: `1.5px solid ${c}25` }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{getIcon(name)}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)', flexShrink: 0 }}>{qPerSubject} qs · {minsPerSubject}m</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Rules */}
          <div style={{ borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 8 }}>Before you begin</p>
            {[['⏱️','Timer starts immediately and cannot be paused'],['🚫','No explanations shown during the exam'],['✅','Full review available once you submit'],['📶','Keep your connection stable']].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          <button onClick={startExam} disabled={starting} style={{ width: '100%', padding: '16px 0', borderRadius: 16, fontSize: 15, fontWeight: 900, letterSpacing: '-0.01em', background: starting ? 'var(--bg-subtle)' : 'linear-gradient(135deg,#FFB800,#FF6A00)', color: starting ? 'var(--text-tert)' : '#fff', border: 'none', cursor: starting ? 'not-allowed' : 'pointer', boxShadow: starting ? 'none' : '0 5px 0 #b85000, 0 8px 20px rgba(255,106,0,.25)', transition: 'all .12s', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}>
            {starting ? 'Starting…' : `🚀 Start ${examType} mock exam`}
            {!starting && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize: '200% 100%', animation: 'exl-shimmer 2.5s infinite', pointerEvents: 'none' }} />}
          </button>
        </>
      )}
    </div>
  )
}