'use client'
// src/app/admin/past-questions/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// IMPROVEMENTS OVER v1:
//
// 1. YEAR FILTER + BULK DELETE
//    New "Year" dropdown in the filter bar. When a year is selected, a red
//    "Delete all [N] questions for [Year]" button appears. Single confirmation
//    step, then calls /api/admin/questions/bulk-delete. Also updates
//    coverage_summary after delete.
//
// 2. INLINE QUICK-TAG
//    Every collapsed question row now has a "Tag" button visible immediately —
//    no expand, no modal. Clicking it opens a compact inline topic/subtopic
//    picker that saves with one more click. Huge time saving for bulk tagging.
//
// 3. YEAR COUNTS IN FILTER BAR
//    The year dropdown shows question counts per year so you can see at a
//    glance which years are populated and which have only a few.
//
// 4. QUESTION CARD ACTIONS
//    Each card now has a direct Delete button (single question) + a correct
//    answer override button — both visible on expand, no separate page needed.
//
// 5. CLEANER LAYOUT
//    Removed the Year Matrix tab from this page — it lives on /admin/coverage.
//    Tabs are now: Questions | Topic Coverage | Upload History.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'

const INDIGO = '#4F46E5'
const GREEN  = '#16A34A'
const AMBER  = '#D97706'
const RED    = '#DC2626'
const SLATE  = '#64748B'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Badge({ children, color = 'slate' }) {
  const styles = {
    slate:  { background: '#F1F5F9', color: '#475569' },
    indigo: { background: '#EEF2FF', color: INDIGO },
    green:  { background: '#F0FDF4', color: GREEN },
    amber:  { background: '#FFFBEB', color: AMBER },
    red:    { background: '#FEF2F2', color: RED },
    blue:   { background: '#EFF6FF', color: '#2563EB' },
  }
  const s = styles[color] ?? styles.slate
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:800, background:s.background, color:s.color }}>
      {children}
    </span>
  )
}

function Spinner({ size = 20 }) {
  return <div style={{ width:size, height:size, borderRadius:'50%', border:`${size>16?3:2}px solid #E2E8F0`, borderTopColor:INDIGO, animation:'pq-spin .65s linear infinite' }}/>
}

function Btn({ children, onClick, color = INDIGO, outline = false, small = false, disabled = false, danger = false }) {
  const bg  = danger ? RED : color
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '4px 10px' : '7px 14px',
        borderRadius: 10, fontFamily:'inherit', cursor: disabled ? 'default' : 'pointer',
        fontSize: small ? 11 : 12, fontWeight: 800,
        border: outline ? `1.5px solid ${bg}` : 'none',
        background: outline ? 'transparent' : bg,
        color: outline ? bg : '#fff',
        opacity: disabled ? .5 : 1,
        transition: 'all .12s', display:'inline-flex', alignItems:'center', gap:5,
      }}
    >
      {children}
    </button>
  )
}

// ─── INLINE QUICK-TAG ─────────────────────────────────────────────────────────
// Renders directly in the question row — no modal, no expand needed.
function QuickTag({ question, topics, onTagged }) {
  const [open,       setOpen]       = useState(false)
  const [topicId,    setTopicId]    = useState(question.topic_id    ?? '')
  const [subtopicId, setSubtopicId] = useState(question.subtopic_id ?? '')
  const [saving,     setSaving]     = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedTopic     = topics.find(t => t.id === topicId)
  const availableSubtopics = selectedTopic?.subtopics ?? []

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id:    topicId    || null,
          subtopic_id: subtopicId || null,
        }),
      })
      onTagged({ ...question, topic_id: topicId || null, subtopic_id: subtopicId || null,
        topics:    selectedTopic ? { id: selectedTopic.id, name: selectedTopic.name } : null,
        subtopics: availableSubtopics.find(s => s.id === subtopicId) ?? null,
      })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position:'relative' }} ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          padding:'3px 9px', borderRadius:8, fontSize:11, fontWeight:800,
          border:`1.5px solid ${open ? INDIGO : '#E2E8F0'}`,
          background: open ? '#EEF2FF' : '#fff',
          color: open ? INDIGO : SLATE,
          cursor:'pointer', fontFamily:'inherit', flexShrink:0,
        }}
      >
        {question.topic_id ? '✎ Re-tag' : '⚡ Tag'}
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:200,
          background:'#fff', border:'1.5px solid #E2E8F0', borderRadius:14,
          boxShadow:'0 8px 30px rgba(0,0,0,.12)', padding:14, minWidth:260,
        }}>
          <div style={{ fontSize:11, fontWeight:900, color:SLATE, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
            Quick Tag
          </div>
          {/* Topic */}
          <select
            value={topicId}
            onChange={e => { setTopicId(e.target.value); setSubtopicId('') }}
            style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:12, fontFamily:'inherit', marginBottom:8, background:'#fff', outline:'none' }}
          >
            <option value="">— Choose topic —</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {/* Subtopic */}
          {availableSubtopics.length > 0 && (
            <select
              value={subtopicId}
              onChange={e => setSubtopicId(e.target.value)}
              style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:12, fontFamily:'inherit', marginBottom:10, background:'#fff', outline:'none' }}
            >
              <option value="">— Choose subtopic (optional) —</option>
              {availableSubtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <div style={{ display:'flex', gap:6 }}>
            <Btn onClick={save} disabled={!topicId || saving} small>
              {saving ? <Spinner size={11}/> : null}
              {saving ? 'Saving…' : 'Save tag'}
            </Btn>
            <Btn onClick={() => setOpen(false)} outline small color={SLATE}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── QUESTION CARD ─────────────────────────────────────────────────────────────
function QuestionCard({ question: initialQ, topics, onDeleted, onUpdated }) {
  useEffect(() => { injectMathStyles() }, [])
  const [question,   setQuestion]   = useState(initialQ)
  const [expanded,   setExpanded]   = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [editAnswer, setEditAnswer] = useState(false)
  const [newAnswer,  setNewAnswer]  = useState(question.correct_answer ?? '')
  const [savingAns,  setSavingAns]  = useState(false)
  const [editSvg,    setEditSvg]    = useState(false)
  const [svgCode,    setSvgCode]    = useState(question.explanation?.svg_diagram ?? '')
  const [savingSvg,  setSavingSvg]  = useState(false)

  const opts   = question.options ?? {}
  const expl   = question.explanation ?? {}
  const hasSvg = expl.svg_diagram?.trim().toLowerCase().startsWith('<svg')

  function handleTagged(updated) {
    setQuestion(updated)
    onUpdated?.(updated)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/admin/questions/${question.id}`, { method: 'DELETE' })
      onDeleted(question.id)
    } finally { setDeleting(false); setDelConfirm(false) }
  }

  async function saveAnswer() {
    setSavingAns(true)
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct_answer: newAnswer }),
      })
      if (res.ok) {
        const updated = await res.json()
        setQuestion(q => ({ ...q, correct_answer: newAnswer }))
        onUpdated?.({ ...question, correct_answer: newAnswer })
        setEditAnswer(false)
      }
    } finally { setSavingAns(false) }
  }

  async function saveSvg() {
    setSavingSvg(true)
    try {
      const newExpl = { ...expl, svg_diagram: svgCode.trim() || null }
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ explanation: newExpl }),
      })
      if (res.ok) {
        setQuestion(q => ({ ...q, explanation: newExpl }))
        onUpdated?.({ ...question, explanation: newExpl })
        setEditSvg(false)
      }
    } finally { setSavingSvg(false) }
  }

  const optionKeys = Object.keys(opts)

  return (
    <div style={{ borderBottom:'1px solid #F1F5F9', background: expanded ? '#FAFBFF' : '#fff', transition:'background .12s' }}>
      {/* ── Collapsed row ── */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px' }}>
        {/* Expand toggle — takes up most of the row */}
        <div onClick={() => setExpanded(e => !e)} style={{ display:'flex', alignItems:'flex-start', gap:10, flex:1, cursor:'pointer', minWidth:0 }}>
          {/* Left meta */}
          <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0, width:60 }}>
            <Badge color={question.exam_type === 'WAEC' ? 'indigo' : 'blue'}>{question.exam_type ?? '?'}</Badge>
            {question.year && <Badge color="slate">{question.year}</Badge>}
          </div>
          {/* Question text + tag info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, color:'#1E293B', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              <MathText text={question.question_text ?? ''} as="span" className=""/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap', marginTop:4 }}>
              {question.topics?.name && <span style={{ fontSize:11, color:'#94A3B8' }}>{question.topics.name}</span>}
              {question.subtopics?.name && (
                <><span style={{ fontSize:11, color:'#CBD5E1' }}>→</span>
                <span style={{ fontSize:11, color:'#94A3B8' }}>{question.subtopics.name}</span></>
              )}
              {!question.topic_id && <Badge color="red">Untagged</Badge>}
              {hasSvg && <Badge color="green">✓ SVG</Badge>}
              {!hasSvg && expl.illustration_prompt && <Badge color="amber">📋 Prompt</Badge>}
            </div>
          </div>
          {/* Chevron */}
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ transform:expanded?'rotate(180deg)':'none', transition:'transform .2s', opacity:.4, flexShrink:0, marginTop:3 }}>
            <path d="M3 5l4 4 4-4" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* Quick-tag — always visible, outside the expand click area */}
        <QuickTag question={question} topics={topics} onTagged={handleTagged}/>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>

          {/* Options */}
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {optionKeys.map(key => {
              const isCorrect = key === question.correct_answer
              return (
                <div key={key} style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'7px 11px', borderRadius:10, background: isCorrect ? '#F0FDF4' : '#F8FAFC', border:`1px solid ${isCorrect ? '#86EFAC' : '#F1F5F9'}` }}>
                  <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, background: isCorrect ? GREEN : '#E2E8F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color: isCorrect ? '#fff' : '#64748B' }}>
                    {isCorrect ? '✓' : key}
                  </div>
                  <span style={{ fontSize:13, color: isCorrect ? '#166534' : '#374151', fontWeight: isCorrect ? 600 : 400, lineHeight:1.5 }}>
                    <MathText text={String(opts[key] ?? '')} as="span" className=""/>
                  </span>
                </div>
              )
            })}
          </div>

          {/* Explanation summary */}
          {(expl.answer_note || expl.correct || expl.concept) && (
            <div style={{ padding:'10px 12px', borderRadius:10, background:'#EEF2FF', border:'1px solid #C7D2FE' }}>
              <div style={{ fontSize:10, fontWeight:900, color:INDIGO, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Explanation</div>
              {expl.concept && <div style={{ fontSize:12, fontWeight:800, color:INDIGO, marginBottom:2 }}>{expl.concept}</div>}
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>
                <MathText text={expl.answer_note ?? expl.correct ?? ''} as="span" className=""/>
              </div>
            </div>
          )}

          {/* ── Action row ── */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', paddingTop:4, borderTop:'1px solid #F1F5F9' }}>

            {/* Correct answer override */}
            {!editAnswer ? (
              <Btn onClick={() => setEditAnswer(true)} outline small color={AMBER}>
                ✎ Fix answer ({question.correct_answer})
              </Btn>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <select
                  value={newAnswer}
                  onChange={e => setNewAnswer(e.target.value)}
                  style={{ padding:'4px 8px', border:`1.5px solid ${AMBER}`, borderRadius:8, fontSize:12, fontFamily:'inherit', background:'#fff', outline:'none' }}
                >
                  {optionKeys.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <Btn onClick={saveAnswer} disabled={savingAns} small>
                  {savingAns ? <Spinner size={11}/> : null}
                  {savingAns ? 'Saving…' : 'Save'}
                </Btn>
                <Btn onClick={() => setEditAnswer(false)} outline small color={SLATE}>Cancel</Btn>
              </div>
            )}

            {/* SVG illustration */}
            <Btn onClick={() => setEditSvg(o => !o)} outline small color={hasSvg ? GREEN : SLATE}>
              {hasSvg ? '✏️ Edit SVG' : expl.illustration_prompt ? '🖼 Add SVG' : '➕ Illustration'}
            </Btn>

            {/* Delete */}
            {!delConfirm ? (
              <Btn onClick={() => setDelConfirm(true)} outline small danger>🗑 Delete</Btn>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:11, color:RED, fontWeight:700 }}>Delete this question?</span>
                <Btn onClick={handleDelete} disabled={deleting} small danger>
                  {deleting ? <Spinner size={11}/> : null}
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </Btn>
                <Btn onClick={() => setDelConfirm(false)} outline small color={SLATE}>Cancel</Btn>
              </div>
            )}
          </div>

          {/* SVG editor — inline below action row */}
          {editSvg && (
            <div style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:12, padding:12 }}>
              {expl.illustration_prompt && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, fontWeight:900, color:SLATE, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Illustration prompt</div>
                  <div style={{ padding:10, background:'#fff', borderRadius:8, border:'1px solid #E2E8F0', fontSize:11, fontFamily:'monospace', lineHeight:1.7, color:'#374151', whiteSpace:'pre-wrap', maxHeight:160, overflowY:'auto' }}>
                    {expl.illustration_prompt}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(expl.illustration_prompt)}
                    style={{ marginTop:5, fontSize:11, fontWeight:700, color:INDIGO, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                    Copy prompt →
                  </button>
                </div>
              )}
              <div style={{ fontSize:10, fontWeight:900, color:SLATE, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>
                SVG code {svgCode.trim().toLowerCase().startsWith('<svg') ? <span style={{ color:GREEN }}>· valid</span> : svgCode.trim() ? <span style={{ color:RED }}>· must start with &lt;svg</span> : ''}
              </div>
              <textarea
                value={svgCode}
                onChange={e => setSvgCode(e.target.value)}
                rows={6}
                placeholder={'<svg viewBox="0 0 400 300" …>\n  …\n</svg>'}
                style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:11, fontFamily:'monospace', lineHeight:1.6, resize:'vertical', outline:'none', background:'#fff', boxSizing:'border-box' }}
              />
              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                <Btn onClick={saveSvg} disabled={savingSvg} small>
                  {savingSvg ? <Spinner size={11}/> : null}
                  {savingSvg ? 'Saving…' : '💾 Save SVG'}
                </Btn>
                <Btn onClick={() => setEditSvg(false)} outline small color={SLATE}>Close</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── BULK DELETE BAR ──────────────────────────────────────────────────────────
function BulkDeleteBar({ subjectId, subjectName, examType, year, yearCount, onDeleted }) {
  const [confirm,  setConfirm]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [result,   setResult]   = useState(null)

  if (!year || !yearCount) return null

  async function handleDelete() {
    setDeleting(true)
    try {
      const p = new URLSearchParams({ subjectId, examType, year })
      const res = await fetch(`/api/admin/questions/bulk-delete?${p}`, { method:'DELETE' })
      const d   = await res.json()
      if (res.ok) {
        setResult(d.deleted ?? 0)
        onDeleted(year, d.deleted ?? 0)
      }
    } finally { setDeleting(false); setConfirm(false) }
  }

  if (result !== null) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12 }}>
        <span style={{ fontSize:13, color:RED, fontWeight:700 }}>✓ Deleted {result} questions for {subjectName} {examType} {year}</span>
        <button onClick={() => setResult(null)} style={{ fontSize:11, color:SLATE, background:'none', border:'none', cursor:'pointer' }}>Dismiss</button>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#FFF7ED', border:'1px solid #FDE68A', borderRadius:12, flexWrap:'wrap' }}>
      <span style={{ fontSize:13, color:'#92400E', fontWeight:700, flex:1 }}>
        {yearCount} questions for <strong>{subjectName} {examType} {year}</strong>
      </span>
      {!confirm ? (
        <Btn onClick={() => setConfirm(true)} small danger>🗑 Delete all {yearCount} questions for {year}</Btn>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, fontWeight:800, color:RED }}>This cannot be undone. Confirm?</span>
          <Btn onClick={handleDelete} disabled={deleting} small danger>
            {deleting ? <Spinner size={11}/> : null}
            {deleting ? 'Deleting…' : `Yes, delete all ${yearCount}`}
          </Btn>
          <Btn onClick={() => setConfirm(false)} outline small color={SLATE}>Cancel</Btn>
        </div>
      )}
    </div>
  )
}

// ─── TOPIC COVERAGE CHART ─────────────────────────────────────────────────────
function CoverageChart({ subjectId, examType }) {
  const [coverage, setCoverage] = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!subjectId) return
    setLoading(true)
    const p = new URLSearchParams({ subjectId })
    if (examType !== 'ALL') p.set('examType', examType)
    fetch(`/api/admin/questions/coverage?${p}`)
      .then(r => r.json())
      .then(d => setCoverage(Array.isArray(d) ? d : []))
      .catch(() => setCoverage([]))
      .finally(() => setLoading(false))
  }, [subjectId, examType])

  const sorted   = useMemo(() => [...coverage].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)), [coverage])
  const maxCount = sorted[0]?.count ?? 1
  const totalQs  = sorted.reduce((s, t) => s + t.count, 0)

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={32}/></div>
  if (!coverage.length) return <p style={{ textAlign:'center', color:SLATE, fontSize:13, padding:'32px 0' }}>No topics found.</p>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <div style={{ fontSize:12, color:SLATE, marginBottom:6 }}>
        <strong style={{ color:'#1E293B' }}>{totalQs}</strong> questions ·{' '}
        <strong style={{ color:GREEN }}>{sorted.filter(t => t.count >= 10).length}</strong> topics with 10+ ·{' '}
        <strong style={{ color:RED }}>{sorted.filter(t => t.count === 0).length}</strong> empty
      </div>
      <div style={{ maxHeight:440, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
        {sorted.map(topic => {
          const pct      = maxCount > 0 ? (topic.count / maxCount) * 100 : 0
          const barColor = topic.count >= 20 ? '#22C55E' : topic.count >= 10 ? '#86EFAC' : topic.count >= 5 ? '#818CF8' : topic.count >= 1 ? '#FCD34D' : '#E2E8F0'
          return (
            <div key={topic.topic_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 8px', borderRadius:9 }}>
              <div style={{ width:170, flexShrink:0 }}>
                <span style={{ fontSize:12, color:'#374151', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{topic.topic_name}</span>
              </div>
              <div style={{ flex:1, height:6, background:'#F1F5F9', borderRadius:999, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.max(pct, topic.count > 0 ? 3 : 0)}%`, background:barColor, borderRadius:999, transition:'width .4s' }}/>
              </div>
              <span style={{ width:36, textAlign:'right', fontSize:12, fontWeight:800, color: topic.count > 0 ? '#374151' : '#CBD5E1', flexShrink:0 }}>{topic.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── BATCH HISTORY ─────────────────────────────────────────────────────────────
function BatchHistory({ subjectId, examType }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (subjectId) p.set('subjectId', subjectId)
    if (examType)  p.set('examType', examType)
    fetch(`/api/admin/questions/batches?${p}`)
      .then(r => r.json()).then(d => setBatches(d.batches ?? [])).catch(() => setBatches([])).finally(() => setLoading(false))
  }, [subjectId, examType])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner/></div>
  if (!batches.length) return <p style={{ textAlign:'center', color:SLATE, fontSize:13, padding:'40px 0' }}>No upload batches yet.</p>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {batches.map(b => (
        <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#fff', border:'1px solid #F1F5F9', borderRadius:14 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
              <span style={{ fontSize:14, fontWeight:800, color:'#1E293B' }}>{b.subject_name ?? '—'}</span>
              <Badge color={b.exam_type === 'WAEC' ? 'indigo' : 'blue'}>{b.exam_type}</Badge>
            </div>
            <span style={{ fontSize:12, color:'#94A3B8' }}>
              {new Date(b.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
            </span>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:15, fontWeight:900, color:GREEN }}>{b.saved ?? 0} saved</div>
            {(b.errors ?? 0) > 0 && <div style={{ fontSize:12, color:RED }}>{b.errors} errors</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PastQuestionsPage() {
  const [subjects,       setSubjects]       = useState([])
  const [subjectId,      setSubjectId]      = useState('')
  const [subjectName,    setSubjectName]    = useState('')
  const [examType,       setExamType]       = useState('WAEC')
  const [activeTab,      setActiveTab]      = useState('questions')
  const [questions,      setQuestions]      = useState([])
  const [total,          setTotal]          = useState(0)
  const [page,           setPage]           = useState(1)
  const [loadingQ,       setLoadingQ]       = useState(false)
  const [search,         setSearch]         = useState('')
  const [filterTopic,    setFilterTopic]    = useState('')
  const [filterDiff,     setFilterDiff]     = useState('')
  const [filterYear,     setFilterYear]     = useState('')   // ← NEW: year filter
  const [filterUntagged, setFilterUntagged] = useState(false)
  const [topics,         setTopics]         = useState([])
  const [yearCounts,     setYearCounts]     = useState({})  // ← year → count map
  const [expandedId,     setExpandedId]     = useState(null)

  const groupedSubjects = useMemo(() => {
    const map = {}
    for (const s of subjects) {
      if (!map[s.name]) map[s.name] = { name:s.name, exams:{} }
      map[s.name].exams[s.exam_type] = s
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [subjects])

  // Sync subjectId when subjectName or examType changes
  useEffect(() => {
    const group = groupedSubjects.find(g => g.name === subjectName)
    if (!group) return
    const row = group.exams[examType] ?? Object.values(group.exams)[0]
    if (row?.id) setSubjectId(row.id)
  }, [subjectName, examType, groupedSubjects])

  // Load subjects
  useEffect(() => {
    fetch('/api/admin/subjects?active=true')
      .then(r => r.json())
      .then(d => {
        const list = (Array.isArray(d) ? d : (d.subjects ?? [])).filter(s => s.is_active !== false)
        setSubjects(list)
        if (list[0]) { setSubjectName(list[0].name); setSubjectId(list[0].id) }
      }).catch(() => {})
  }, [])

  // Load curriculum topics
  useEffect(() => {
    if (!subjectId) return
    fetch(`/api/admin/curriculum?subjectId=${subjectId}`)
      .then(r => r.json()).then(d => setTopics(Array.isArray(d) ? d : [])).catch(() => setTopics([]))
  }, [subjectId])

  // Load year counts for this subject+exam (shown in year dropdown + bulk delete bar)
  useEffect(() => {
    if (!subjectId) return
    const p = new URLSearchParams({ subject: subjectId, yearCounts: 'true' })
    if (examType !== 'ALL') p.set('exam', examType)
    fetch(`/api/admin/questions?${p}`)
      .then(r => r.json())
      .then(d => setYearCounts(d.yearCounts ?? {}))
      .catch(() => setYearCounts({}))
  }, [subjectId, examType])

  // Load questions
  const loadQuestions = useCallback(() => {
    if (!subjectId) return
    setLoadingQ(true)
    const p = new URLSearchParams({ subject:subjectId, page:String(page), limit:'30' })
    if (examType !== 'ALL') p.set('exam', examType)
    if (search)         p.set('search',     search)
    if (filterTopic)    p.set('topic',      filterTopic)
    if (filterDiff)     p.set('difficulty', filterDiff)
    if (filterYear)     p.set('year',       filterYear)
    if (filterUntagged) p.set('untagged',   'true')
    fetch(`/api/admin/questions?${p}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.questions ?? []); setTotal(d.total ?? 0) })
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQ(false))
  }, [subjectId, examType, page, search, filterTopic, filterDiff, filterYear, filterUntagged])

  useEffect(() => { loadQuestions() }, [loadQuestions])
  useEffect(() => { setPage(1) }, [subjectId, examType, search, filterTopic, filterDiff, filterYear, filterUntagged])

  function handleQuestionDeleted(id) {
    setQuestions(prev => prev.filter(q => q.id !== id))
    setTotal(t => t - 1)
  }

  function handleQuestionUpdated(updated) {
    setQuestions(prev => prev.map(q => q.id === updated.id ? { ...q, ...updated } : q))
  }

  function handleBulkDeleted(year, count) {
    // Remove deleted questions from view, refresh year counts
    setQuestions(prev => prev.filter(q => String(q.year) !== String(year)))
    setTotal(t => Math.max(0, t - count))
    setYearCounts(prev => { const n = { ...prev }; delete n[year]; return n })
    setFilterYear('')  // clear year filter after bulk delete
  }

  // Sorted years for the dropdown — newest first
  const sortedYears = useMemo(() =>
    Object.entries(yearCounts)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, count]) => ({ year, count }))
  , [yearCounts])

  const totalPages = Math.ceil(total / 30)
  const selectedSubj = subjects.find(s => s.id === subjectId)
  const hasFilters = !!(search || filterTopic || filterDiff || filterYear || filterUntagged)

  return (
    <>
      <style>{`
        @keyframes pq-spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box }
      `}</style>

      <div style={{ maxWidth:920, display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, color:'#0F172A', margin:0 }}>Past Questions</h1>
            <p style={{ fontSize:13, color:SLATE, marginTop:3 }}>Browse, tag, and manage your question bank.</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Link href="/admin/coverage" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'8px 14px', border:'1.5px solid #E2E8F0', background:'#fff', color:SLATE, borderRadius:11, fontSize:12, fontWeight:800, textDecoration:'none' }}>
              📊 Coverage
            </Link>
            <Link href="/admin/questions/import" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'8px 14px', background:INDIGO, color:'#fff', borderRadius:11, fontSize:12, fontWeight:800, textDecoration:'none' }}>
              ⬆ Import
            </Link>
          </div>
        </div>

        {/* ── SUBJECT + EXAM SELECTOR ── */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:180 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:800, color:SLATE, marginBottom:5, textTransform:'uppercase', letterSpacing:'.05em' }}>Subject</label>
            <select
              value={subjectName}
              onChange={e => { setSubjectName(e.target.value); setPage(1); setFilterYear('') }}
              style={{ width:'100%', border:'1.5px solid #E2E8F0', borderRadius:11, padding:'9px 12px', fontSize:13, fontWeight:600, background:'#fff', color:'#0F172A', outline:'none', cursor:'pointer', fontFamily:'inherit' }}
            >
              {groupedSubjects.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:800, color:SLATE, marginBottom:5, textTransform:'uppercase', letterSpacing:'.05em' }}>Exam</label>
            <div style={{ display:'flex', gap:2, background:'#F1F5F9', padding:3, borderRadius:11 }}>
              {['WAEC', 'JAMB', 'ALL'].map(et => (
                <button key={et} onClick={() => { setExamType(et); setPage(1); setFilterYear('') }} style={{ padding:'6px 13px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:800, background: examType===et ? '#fff' : 'transparent', color: examType===et ? INDIGO : SLATE, boxShadow: examType===et ? '0 1px 3px rgba(0,0,0,.08)' : 'none', transition:'all .12s' }}>
                  {et}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'right' }}>
            <div style={{ fontSize:20, fontWeight:900, color:'#0F172A' }}>{total.toLocaleString()}</div>
            <div style={{ fontSize:11, color:SLATE }}>questions</div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:'flex', gap:2, background:'#F1F5F9', padding:4, borderRadius:13, width:'fit-content' }}>
          {[
            { id:'questions', label:'📝 Questions' },
            { id:'coverage',  label:'📊 Topic coverage' },
            { id:'history',   label:'📋 Upload history' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:'7px 14px', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:800, whiteSpace:'nowrap', background: activeTab===t.id ? '#fff' : 'transparent', color: activeTab===t.id ? INDIGO : SLATE, boxShadow: activeTab===t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition:'all .12s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── QUESTIONS TAB ── */}
        {activeTab === 'questions' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Bulk delete bar — shows when a year is selected */}
            <BulkDeleteBar
              subjectId={subjectId}
              subjectName={selectedSubj?.name ?? ''}
              examType={examType === 'ALL' ? 'WAEC' : examType}
              year={filterYear}
              yearCount={filterYear ? (yearCounts[filterYear] ?? 0) : 0}
              onDeleted={handleBulkDeleted}
            />

            {/* Search + filters */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search question text…"
                style={{ flex:1, minWidth:200, padding:'8px 14px', border:'1.5px solid #E2E8F0', borderRadius:11, fontSize:13, background:'#fff', color:'#0F172A', outline:'none', fontFamily:'inherit' }}
              />
              {/* Year dropdown — with counts */}
              <select
                value={filterYear}
                onChange={e => { setFilterYear(e.target.value); setPage(1) }}
                style={{ padding:'8px 12px', border:`1.5px solid ${filterYear ? AMBER : '#E2E8F0'}`, borderRadius:11, fontSize:12, background:'#fff', color: filterYear ? '#92400E' : '#374151', outline:'none', cursor:'pointer', fontFamily:'inherit', fontWeight: filterYear ? 800 : 400 }}
              >
                <option value="">All years</option>
                {sortedYears.map(({ year, count }) => (
                  <option key={year} value={year}>{year} · {count} questions</option>
                ))}
              </select>
              {/* Topic */}
              <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                style={{ padding:'8px 12px', border:'1.5px solid #E2E8F0', borderRadius:11, fontSize:12, background:'#fff', color:'#374151', outline:'none', cursor:'pointer', fontFamily:'inherit' }}>
                <option value="">All topics</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {/* Difficulty */}
              <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
                style={{ padding:'8px 12px', border:'1.5px solid #E2E8F0', borderRadius:11, fontSize:12, background:'#fff', color:'#374151', outline:'none', cursor:'pointer', fontFamily:'inherit' }}>
                <option value="">All difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              {/* Untagged */}
              <button onClick={() => setFilterUntagged(f => !f)} style={{ padding:'8px 12px', borderRadius:11, fontSize:12, fontWeight:800, border:`1.5px solid ${filterUntagged ? RED : '#E2E8F0'}`, background: filterUntagged ? '#FEF2F2' : '#fff', color: filterUntagged ? RED : SLATE, cursor:'pointer', fontFamily:'inherit', transition:'all .12s' }}>
                ⚠ Untagged
              </button>
              {hasFilters && (
                <button onClick={() => { setSearch(''); setFilterTopic(''); setFilterDiff(''); setFilterYear(''); setFilterUntagged(false) }}
                  style={{ padding:'8px 12px', borderRadius:11, fontSize:12, fontWeight:700, color:SLATE, background:'#F1F5F9', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                  Clear all ✕
                </button>
              )}
            </div>

            {/* Question list */}
            <div style={{ background:'#fff', border:'1px solid #F1F5F9', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 8px rgba(0,0,0,.04)' }}>
              {loadingQ ? (
                <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={32}/></div>
              ) : questions.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 24px' }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>📝</div>
                  <p style={{ color:SLATE, fontSize:13, marginBottom:8 }}>
                    {hasFilters ? 'No questions match these filters.' : `No questions for ${selectedSubj?.name ?? 'this subject'}.`}
                  </p>
                  {!hasFilters && (
                    <Link href="/admin/questions/import" style={{ color:INDIGO, fontSize:13, fontWeight:700 }}>Import past questions →</Link>
                  )}
                </div>
              ) : (
                questions.map(q => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    topics={topics}
                    onDeleted={handleQuestionDeleted}
                    onUpdated={handleQuestionUpdated}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:SLATE }}>
                  {((page-1)*30)+1}–{Math.min(page*30, total)} of {total.toLocaleString()}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    style={{ padding:'6px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:12, fontWeight:700, color: page===1 ? '#CBD5E1' : '#374151', cursor: page===1 ? 'default' : 'pointer', fontFamily:'inherit' }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize:12, fontWeight:700, color:SLATE, minWidth:60, textAlign:'center' }}>{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                    style={{ padding:'6px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:12, fontWeight:700, color: page===totalPages ? '#CBD5E1' : '#374151', cursor: page===totalPages ? 'default' : 'pointer', fontFamily:'inherit' }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TOPIC COVERAGE TAB ── */}
        {activeTab === 'coverage' && (
          <div style={{ background:'#fff', border:'1px solid #F1F5F9', borderRadius:16, padding:20, boxShadow:'0 1px 8px rgba(0,0,0,.04)' }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:900, color:'#0F172A' }}>{selectedSubj?.name ?? '—'} · {examType === 'ALL' ? 'All exams' : examType}</div>
              <div style={{ fontSize:12, color:SLATE, marginTop:2 }}>Questions per topic for this subject and exam type.</div>
            </div>
            <CoverageChart subjectId={subjectId} examType={examType}/>
            <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:12, marginTop:12 }}>
              <Link href="/admin/coverage" style={{ fontSize:12, fontWeight:700, color:INDIGO }}>View full year × subject matrix →</Link>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div style={{ background:'#fff', border:'1px solid #F1F5F9', borderRadius:16, padding:20, boxShadow:'0 1px 8px rgba(0,0,0,.04)' }}>
            <BatchHistory subjectId={subjectId} examType={examType !== 'ALL' ? examType : ''}/>
          </div>
        )}

      </div>
    </>
  )
}