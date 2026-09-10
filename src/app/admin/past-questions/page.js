'use client'
// src/app/admin/past-questions/page.js
// Rebuilt: question browser + illustration workflow + SVG editor

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INDIGO  = '#4F46E5'
const GREEN   = '#16A34A'
const AMBER   = '#D97706'
const RED     = '#DC2626'
const SLATE   = '#64748B'

// ─── TINY HELPERS ─────────────────────────────────────────────────────────────
function Badge({ children, color = 'slate' }) {
  const styles = {
    slate:  { background: '#F1F5F9', color: '#475569' },
    indigo: { background: '#EEF2FF', color: INDIGO },
    green:  { background: '#F0FDF4', color: GREEN },
    amber:  { background: '#FFFBEB', color: AMBER },
    red:    { background: '#FEF2F2', color: RED },
    blue:   { background: '#EFF6FF', color: '#2563EB' },
    purple: { background: '#F5F3FF', color: '#7C3AED' },
  }
  const s = styles[color] ?? styles.slate
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 800,
      background: s.background, color: s.color,
    }}>
      {children}
    </span>
  )
}

function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${size > 20 ? 3 : 2}px solid #E2E8F0`,
      borderTopColor: INDIGO,
      animation: 'pq-spin .65s linear infinite',
    }}/>
  )
}

// ─── ILLUSTRATION STATUS INDICATOR ────────────────────────────────────────────
// Returns one of: 'has_svg' | 'has_prompt' | 'no_prompt' | 'none'
function illustrationStatus(q) {
  const expl = q.explanation ?? {}
  if (expl.svg_diagram?.trim().toLowerCase().startsWith('<svg')) return 'has_svg'
  if (expl.illustration_prompt?.trim()) return 'has_prompt'
  return 'none'
}

function IllustBadge({ status }) {
  if (status === 'has_svg')    return <Badge color="green">✓ SVG</Badge>
  if (status === 'has_prompt') return <Badge color="amber">📋 Prompt</Badge>
  return null
}

// ─── SVG EDITOR PANEL ─────────────────────────────────────────────────────────
// Opens below a question card. Shows prompt + SVG textarea + live preview + save.
function SvgEditor({ question, onSave, onClose }) {
  const expl    = question.explanation ?? {}
  const prompt  = expl.illustration_prompt ?? ''
  const initSvg = expl.svg_diagram ?? ''

  const [svgCode, setSvgCode]   = useState(initSvg)
  const [saving,  setSaving]    = useState(false)
  const [copied,  setCopied]    = useState(false)
  const [tab,     setTab]       = useState(initSvg ? 'preview' : 'prompt') // 'prompt' | 'editor' | 'preview'
  const textRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto'
      textRef.current.style.height = textRef.current.scrollHeight + 'px'
    }
  }, [svgCode, tab])

  const isValidSvg = svgCode.trim().toLowerCase().startsWith('<svg')
  const hasChanged = svgCode !== initSvg

  async function handleSave() {
    setSaving(true)
    try {
      const newExpl = {
        ...expl,
        svg_diagram: svgCode.trim() || null,
      }
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ explanation: newExpl }),
      })
      if (res.ok) {
        const updated = await res.json()
        onSave(updated)
      }
    } finally {
      setSaving(false)
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const TAB_STYLE = (active) => ({
    padding: '6px 14px', fontSize: 12, fontWeight: 700,
    borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    background: active ? '#fff' : 'transparent',
    color: active ? INDIGO : SLATE,
    boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
    transition: 'all .12s',
  })

  return (
    <div style={{
      margin: '0 0 2px', background: '#F8FAFC',
      border: `1.5px solid ${isValidSvg ? '#86EFAC' : '#CBD5E1'}`,
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Editor header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#fff', borderBottom: '1px solid #F1F5F9',
      }}>
        <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
          {[
            { id: 'prompt',  label: prompt ? '📋 Prompt' : 'No prompt' },
            { id: 'editor',  label: '✏️ SVG code' },
            { id: 'preview', label: '👁 Preview' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={TAB_STYLE(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasChanged && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '6px 14px', borderRadius: 10, border: 'none',
                background: isValidSvg ? GREEN : AMBER,
                color: '#fff', fontSize: 12, fontWeight: 800,
                cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
                opacity: saving ? .7 : 1, display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {saving ? <Spinner size={12}/> : null}
              {saving ? 'Saving…' : isValidSvg ? '💾 Save SVG' : '💾 Save (clear)'}
            </button>
          )}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: SLATE, fontFamily: 'inherit' }}>×</button>
        </div>
      </div>

      {/* Prompt tab */}
      {tab === 'prompt' && (
        <div style={{ padding: 14 }}>
          {prompt ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: SLATE, textTransform: 'uppercase', letterSpacing: '.06em' }}>Illustration prompt</span>
                <button
                  onClick={copyPrompt}
                  style={{
                    padding: '4px 12px', borderRadius: 8, border: `1px solid ${INDIGO}`,
                    background: copied ? INDIGO : 'transparent',
                    color: copied ? '#fff' : INDIGO, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy prompt'}
                </button>
              </div>
              <div style={{
                background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0',
                padding: 12, fontSize: 12, color: '#374151', lineHeight: 1.7,
                whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace',
                maxHeight: 280, overflowY: 'auto',
              }}>
                {prompt}
              </div>
              <p style={{ fontSize: 11, color: SLATE, marginTop: 8, lineHeight: 1.5 }}>
                Copy this prompt → paste into Claude or another AI → get SVG code → paste into the <strong>SVG code</strong> tab → Save.
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <p style={{ fontSize: 13, color: SLATE }}>No illustration prompt for this question.</p>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Re-generate the explanation to add one, or paste SVG code directly in the editor tab.</p>
            </div>
          )}
        </div>
      )}

      {/* SVG editor tab */}
      {tab === 'editor' && (
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: SLATE, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            SVG code {isValidSvg ? <span style={{ color: GREEN }}>· valid</span> : svgCode.trim() ? <span style={{ color: RED }}>· must start with &lt;svg</span> : ''}
          </div>
          <textarea
            ref={textRef}
            value={svgCode}
            onChange={e => setSvgCode(e.target.value)}
            placeholder={'<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">\n  <!-- Paste SVG code here -->\n</svg>'}
            spellCheck={false}
            style={{
              width: '100%', minHeight: 160, padding: '10px 12px',
              borderRadius: 10, border: `1.5px solid ${isValidSvg ? '#86EFAC' : '#E2E8F0'}`,
              background: '#fff', color: '#1E293B',
              fontSize: 12, fontFamily: 'ui-monospace, monospace',
              lineHeight: 1.6, resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {svgCode && (
            <button
              onClick={() => setSvgCode('')}
              style={{ marginTop: 6, fontSize: 11, color: RED, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              Clear SVG ×
            </button>
          )}
        </div>
      )}

      {/* Preview tab */}
      {tab === 'preview' && (
        <div style={{ padding: 14 }}>
          {isValidSvg ? (
            <div style={{
              borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0',
              background: '#fff', padding: 12,
              display: 'flex', justifyContent: 'center',
            }}
              dangerouslySetInnerHTML={{ __html: svgCode.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '') }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: SLATE, fontSize: 13 }}>
              {svgCode.trim() ? 'SVG must start with <svg …>' : 'No SVG code yet. Paste it in the editor tab.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── QUESTION CARD ─────────────────────────────────────────────────────────────
function QuestionCard({ question, isExpanded, onToggle, onQuestionUpdated }) {
  useEffect(() => { injectMathStyles() }, [])

  const [editOpen, setEditOpen] = useState(false)
  const opts   = question.options ?? {}
  const expl   = question.explanation ?? {}
  const status = illustrationStatus(question)

  function handleSaved(updatedQ) {
    onQuestionUpdated(updatedQ)
    setEditOpen(false)
  }

  return (
    <div style={{
      borderBottom: '1px solid #F1F5F9',
      background: isExpanded ? '#FAFBFF' : '#fff',
      transition: 'background .12s',
    }}>
      {/* Collapsed row — always visible */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '13px 16px', cursor: 'pointer',
        }}
      >
        {/* Left meta column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, width: 64 }}>
          <Badge color={question.exam_type === 'WAEC' ? 'indigo' : question.exam_type === 'JAMB' ? 'blue' : 'purple'}>
            {question.exam_type ?? '?'}
          </Badge>
          {question.year && <Badge color="slate">{question.year}</Badge>}
        </div>

        {/* Question text + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <MathText text={question.question_text ?? ''} as="span" className=""/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
            {question.topics?.name && <span style={{ fontSize: 11, color: '#94A3B8' }}>{question.topics.name}</span>}
            {question.subtopics?.name && (
              <><span style={{ fontSize: 11, color: '#CBD5E1' }}>→</span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{question.subtopics.name}</span></>
            )}
            {!question.topic_id && <Badge color="red">Untagged</Badge>}
          </div>
        </div>

        {/* Right: illustration status + expand chevron */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <IllustBadge status={status}/>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: .4 }}>
            <path d="M3 5l4 4 4-4" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px' }}>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {Object.entries(opts).map(([key, text]) => {
              const isCorrect = key === question.correct_answer
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 12px', borderRadius: 10,
                  background: isCorrect ? '#F0FDF4' : '#F8FAFC',
                  border: `1px solid ${isCorrect ? '#86EFAC' : '#F1F5F9'}`,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                    background: isCorrect ? GREEN : '#E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 900, color: isCorrect ? '#fff' : '#64748B',
                  }}>
                    {isCorrect ? '✓' : key}
                  </div>
                  <span style={{ fontSize: 13, color: isCorrect ? '#166534' : '#374151', fontWeight: isCorrect ? 600 : 400, lineHeight: 1.5 }}>
                    <MathText text={String(text ?? '')} as="span" className=""/>
                  </span>
                </div>
              )
            })}
          </div>

          {/* Explanation summary */}
          {(expl.answer_note || expl.correct || expl.concept) && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: INDIGO, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Explanation</div>
              {expl.concept && <div style={{ fontSize: 12, fontWeight: 800, color: INDIGO, marginBottom: 3 }}>{expl.concept}</div>}
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                <MathText text={expl.answer_note ?? expl.correct ?? ''} as="span" className=""/>
              </div>
            </div>
          )}

          {/* Illustration section */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: SLATE, textTransform: 'uppercase', letterSpacing: '.06em' }}>Illustration</span>
                <IllustBadge status={status}/>
              </div>
              <button
                onClick={() => setEditOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 9,
                  border: `1.5px solid ${editOpen ? INDIGO : '#E2E8F0'}`,
                  background: editOpen ? '#EEF2FF' : '#fff',
                  color: editOpen ? INDIGO : SLATE,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .12s',
                }}
              >
                {status === 'has_svg' ? '✏️ Edit SVG' : status === 'has_prompt' ? '🖼 Add SVG' : '➕ Add illustration'}
              </button>
            </div>

            {/* Existing SVG preview (when not editing) */}
            {status === 'has_svg' && !editOpen && (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0', background: '#fff', padding: 8 }}>
                <div
                  style={{ display: 'flex', justifyContent: 'center' }}
                  dangerouslySetInnerHTML={{ __html: expl.svg_diagram.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '') }}
                />
              </div>
            )}

            {/* Prompt hint when no SVG */}
            {status === 'has_prompt' && !editOpen && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
                💡 Prompt ready — click <strong>Add SVG</strong> to copy it and paste the generated SVG
              </div>
            )}

            {/* SVG Editor */}
            {editOpen && (
              <SvgEditor
                question={question}
                onSave={handleSaved}
                onClose={() => setEditOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COVERAGE CHART ────────────────────────────────────────────────────────────
function CoverageChart({ subjectId, examType, onMarkCore, coreTopicIds, onCoreUpdated }) {
  const [coverage, setCoverage] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [marking,  setMarking]  = useState(null)

  const load = useCallback(() => {
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

  useEffect(() => { load() }, [load])

  const sorted   = useMemo(() => [...coverage].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)), [coverage])
  const maxCount = sorted[0]?.count ?? 1
  const totalQs  = sorted.reduce((s, t) => s + t.count, 0)

  async function handleMark(topic) {
    setMarking(topic.topic_id)
    await onMarkCore(topic)
    setMarking(null)
    onCoreUpdated?.()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Spinner /></div>
  if (!coverage.length) return <p style={{ textAlign: 'center', color: SLATE, fontSize: 13, padding: '32px 0' }}>No topics found.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: SLATE, flexWrap: 'wrap', marginBottom: 4 }}>
        <span><strong style={{ color: '#1E293B' }}>{totalQs}</strong> questions</span>
        <span><strong style={{ color: GREEN }}>{sorted.filter(t => t.count >= 10).length}</strong> topics with 10+</span>
        <span><strong style={{ color: RED }}>{sorted.filter(t => t.count === 0).length}</strong> empty</span>
      </div>
      <div style={{ maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sorted.map(topic => {
          const isCore    = coreTopicIds.has(topic.topic_id)
          const isMarking = marking === topic.topic_id
          const pct       = maxCount > 0 ? (topic.count / maxCount) * 100 : 0
          const barColor  = topic.count >= 20 ? '#22C55E' : topic.count >= 10 ? '#86EFAC' : topic.count >= 5 ? '#818CF8' : topic.count >= 1 ? '#FCD34D' : '#E2E8F0'
          return (
            <div key={topic.topic_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', borderRadius: 10, transition: 'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <button
                onClick={() => !isCore && handleMark(topic)}
                disabled={isCore || !!isMarking}
                style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: 'none', border: 'none', cursor: isCore ? 'default' : 'pointer', color: isCore ? INDIGO : '#CBD5E1', opacity: isMarking ? .5 : 1 }}
                title={isCore ? 'Core topic' : 'Mark as core'}
              >
                {isMarking ? <Spinner size={12}/> : '⭐'}
              </button>
              <div style={{ width: 160, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#374151', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.topic_name}</span>
                {isCore && <span style={{ fontSize: 9, fontWeight: 900, color: INDIGO }}>CORE</span>}
              </div>
              <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(pct, topic.count > 0 ? 3 : 0)}%`, background: barColor, borderRadius: 999, transition: 'width .4s' }}/>
              </div>
              <span style={{ width: 36, textAlign: 'right', fontSize: 12, fontWeight: 800, color: topic.count > 0 ? '#374151' : '#CBD5E1', flexShrink: 0 }}>{topic.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── YEAR COVERAGE MATRIX ─────────────────────────────────────────────────────
function YearCoverage({ examType }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setLoading(true); setData(null)
    fetch(`/api/admin/questions/coverage-matrix?examType=${examType === 'ALL' ? 'ALL' : examType}`)
      .then(r => r.json()).then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [examType])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner/></div>
  if (!data?.subjects?.length) return <p style={{ textAlign: 'center', color: SLATE, fontSize: 13, padding: 32 }}>No data.</p>

  const { subjects, years, matrix } = data
  const display = showAll ? subjects : subjects.slice(0, 12)
  const totalQ  = subjects.reduce((a, s) => a + s.totalQuestions, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Total questions', value: totalQ.toLocaleString(), color: INDIGO },
          { label: 'Subjects with data', value: `${subjects.filter(s => s.totalQuestions > 0).length} / ${subjects.length}`, color: GREEN },
          { label: 'Empty subjects', value: subjects.filter(s => s.totalQuestions === 0).length, color: RED },
          { label: 'Years tracked', value: years.length, color: SLATE },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: '-.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Link href="/admin/questions/import" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: INDIGO, color: '#fff', borderRadius: 10, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
          ⬆ Import questions
        </Link>
      </div>
      <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: '#F8FAFC', textAlign: 'left', padding: '10px 14px', fontWeight: 800, color: '#64748B', whiteSpace: 'nowrap', borderRight: '1px solid #F1F5F9', minWidth: 160 }}>Subject</th>
                <th style={{ padding: '10px 10px', fontWeight: 800, color: '#64748B', textAlign: 'center', borderRight: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>Total</th>
                {years.map(y => <th key={y} style={{ padding: '10px 4px', fontWeight: 700, color: '#94A3B8', textAlign: 'center', minWidth: 42 }}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {display.map((s, i) => {
                const counts = matrix[s.id] ?? {}
                return (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F5F7FF'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                  >
                    <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'inherit', padding: '9px 14px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', borderRight: '1px solid #F1F5F9' }}>
                      {s.name} <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{s.exam_type}</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800, borderRight: '1px solid #F1F5F9', color: s.totalQuestions > 0 ? INDIGO : '#CBD5E1' }}>
                      {s.totalQuestions > 0 ? s.totalQuestions.toLocaleString() : '—'}
                    </td>
                    {years.map(y => {
                      const count = counts[y] ?? 0
                      const bg = count >= 40 ? '#16A34A' : count >= 20 ? '#22C55E' : count >= 10 ? '#86EFAC' : count >= 1 ? '#FDE68A' : ''
                      const fg = count >= 20 ? '#fff' : count >= 10 ? '#166534' : count >= 1 ? '#92400E' : '#CBD5E1'
                      return (
                        <td key={y} style={{ padding: '4px 3px', textAlign: 'center' }}>
                          <Link
                            href={`/admin/questions/import?subject=${encodeURIComponent(s.name)}&examType=${s.exam_type}&year=${y}`}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 36, height: 26, borderRadius: 8, margin: '0 auto',
                              fontSize: 11, fontWeight: 700, textDecoration: 'none',
                              background: bg || 'transparent',
                              color: fg,
                              border: count === 0 ? '1.5px dashed #E2E8F0' : 'none',
                              transition: 'all .12s',
                            }}
                          >
                            {count > 0 ? count : '+'}
                          </Link>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {subjects.length > 12 && (
          <div style={{ borderTop: '1px solid #F1F5F9', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: SLATE }}>Showing {display.length} of {subjects.length}</span>
            <button onClick={() => setShowAll(v => !v)} style={{ fontSize: 12, fontWeight: 700, color: INDIGO, background: 'none', border: 'none', cursor: 'pointer' }}>
              {showAll ? 'Show fewer ↑' : `Show all ${subjects.length} ↓`}
            </button>
          </div>
        )}
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner/></div>
  if (!batches.length) return (
    <div style={{ textAlign: 'center', padding: '40px 24px', color: SLATE, fontSize: 13 }}>
      No upload batches yet. <Link href="/admin/questions/upload" style={{ color: INDIGO, fontWeight: 700 }}>Upload your first batch →</Link>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {batches.map(b => (
        <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', border: '1px solid #F1F5F9', borderRadius: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{b.subject_name ?? '—'}</span>
              <Badge color={b.exam_type === 'WAEC' ? 'indigo' : 'blue'}>{b.exam_type}</Badge>
            </div>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: GREEN }}>{b.saved ?? 0} saved</div>
            {(b.errors ?? 0) > 0 && <div style={{ fontSize: 12, color: RED }}>{b.errors} errors</div>}
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
  const [filterImage,    setFilterImage]    = useState(false)
  const [filterUntagged, setFilterUntagged] = useState(false)
  const [filterIllust,   setFilterIllust]   = useState('') // '' | 'has_svg' | 'has_prompt' | 'none'
  const [topics,         setTopics]         = useState([])
  const [expandedId,     setExpandedId]     = useState(null)
  const [coreTopicIds,   setCoreTopicIds]   = useState(new Set())

  const groupedSubjects = useMemo(() => {
    const map = {}
    for (const s of subjects) {
      if (!map[s.name]) map[s.name] = { name: s.name, exams: {} }
      map[s.name].exams[s.exam_type] = s
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [subjects])

  useEffect(() => {
    const group = groupedSubjects.find(g => g.name === subjectName)
    if (!group) return
    const row = group.exams[examType] ?? Object.values(group.exams)[0]
    if (row?.id) setSubjectId(row.id)
  }, [subjectName, examType, groupedSubjects])

  useEffect(() => {
    fetch('/api/admin/subjects?active=true')
      .then(r => r.json())
      .then(d => {
        const list = (Array.isArray(d) ? d : (d.subjects ?? [])).filter(s => s.is_active !== false)
        setSubjects(list)
        if (list[0]) { setSubjectName(list[0].name); setSubjectId(list[0].id) }
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!subjectId) return
    fetch(`/api/admin/curriculum?subjectId=${subjectId}`)
      .then(r => r.json()).then(d => setTopics(Array.isArray(d) ? d : [])).catch(() => setTopics([]))
  }, [subjectId])

  const loadCoreTopicIds = useCallback(() => {
    if (!subjectId) return
    const et = examType === 'ALL' ? 'WAEC' : examType
    fetch(`/api/admin/core-topics?subjectId=${subjectId}&examType=${et}`)
      .then(r => r.json())
      .then(d => setCoreTopicIds(new Set((d.topics ?? []).filter(t => t.is_core).map(t => t.id))))
      .catch(() => {})
  }, [subjectId, examType])

  useEffect(() => { loadCoreTopicIds() }, [loadCoreTopicIds])

  const loadQuestions = useCallback(() => {
    if (!subjectId) return
    setLoadingQ(true)
    const p = new URLSearchParams({ subject: subjectId, page: String(page), limit: '30' })
    if (examType !== 'ALL') p.set('exam', examType)
    if (search)         p.set('search', search)
    if (filterTopic)    p.set('topic', filterTopic)
    if (filterDiff)     p.set('difficulty', filterDiff)
    if (filterImage)    p.set('has_image', 'true')
    if (filterUntagged) p.set('untagged', 'true')
    fetch(`/api/admin/questions?${p}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.questions ?? []); setTotal(d.total ?? 0) })
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQ(false))
  }, [subjectId, examType, page, search, filterTopic, filterDiff, filterImage, filterUntagged])

  useEffect(() => { loadQuestions() }, [loadQuestions])
  useEffect(() => { setPage(1) }, [subjectId, examType, search, filterTopic, filterDiff, filterImage, filterUntagged])

  // Client-side illustration filter
  const displayQuestions = useMemo(() => {
    if (!filterIllust) return questions
    return questions.filter(q => illustrationStatus(q) === filterIllust)
  }, [questions, filterIllust])

  // Illustration stats for the current page
  const illustStats = useMemo(() => {
    const hasSvg    = questions.filter(q => illustrationStatus(q) === 'has_svg').length
    const hasPrompt = questions.filter(q => illustrationStatus(q) === 'has_prompt').length
    const noPrompt  = questions.filter(q => illustrationStatus(q) === 'none').length
    return { hasSvg, hasPrompt, noPrompt }
  }, [questions])

  async function markCore(topic) {
    const et = examType === 'ALL' ? 'WAEC' : examType
    await fetch('/api/admin/core-topics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, topicId: topic.topic_id, examType: et }),
    })
    loadCoreTopicIds()
  }

  function handleQuestionUpdated(updatedQ) {
    setQuestions(prev => prev.map(q => q.id === updatedQ.id ? { ...q, explanation: updatedQ.explanation } : q))
  }

  const totalPages   = Math.ceil(total / 30)
  const selectedSubj = subjects.find(s => s.id === subjectId)
  const hasFilters   = !!(search || filterTopic || filterDiff || filterImage || filterUntagged || filterIllust)

  // PILL BUTTON style
  const Pill = ({ active, onClick, children, activeColor = INDIGO }) => (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      border: `1.5px solid ${active ? activeColor : '#E2E8F0'}`,
      background: active ? activeColor + '12' : '#fff',
      color: active ? activeColor : SLATE,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s', whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  )

  return (
    <>
      <style>{`
        @keyframes pq-spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box }
      `}</style>

      <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-.02em' }}>Past Questions</h1>
            <p style={{ fontSize: 13, color: SLATE, marginTop: 3 }}>Browse, review, and add SVG illustrations to questions.</p>
          </div>
          <Link href="/admin/questions/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: INDIGO, color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 800, textDecoration: 'none', flexShrink: 0 }}>
            ⬆ Upload
          </Link>
        </div>

        {/* ── SUBJECT + EXAM SELECTOR ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: SLATE, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Subject</label>
            <select
              value={subjectName}
              onChange={e => { setSubjectName(e.target.value); setPage(1) }}
              style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '9px 12px', fontSize: 14, fontWeight: 600, background: '#fff', color: '#0F172A', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {groupedSubjects.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: SLATE, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Exam</label>
            <div style={{ display: 'flex', gap: 2, background: '#F1F5F9', padding: 3, borderRadius: 12 }}>
              {['WAEC', 'JAMB', 'ALL'].map(et => (
                <button key={et} onClick={() => { setExamType(et); setPage(1) }} style={{
                  padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 800,
                  background: examType === et ? '#fff' : 'transparent',
                  color: examType === et ? INDIGO : SLATE,
                  boxShadow: examType === et ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                  transition: 'all .12s',
                }}>
                  {et}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-.02em' }}>{total.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: SLATE }}>questions</div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 2, background: '#F1F5F9', padding: 4, borderRadius: 14, width: 'fit-content' }}>
          {[
            { id: 'questions', label: `📝 Questions` },
            { id: 'coverage',  label: '📊 Topic coverage' },
            { id: 'years',     label: '📅 Year matrix' },
            { id: 'history',   label: '📋 Upload history' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
              background: activeTab === t.id ? '#fff' : 'transparent',
              color: activeTab === t.id ? INDIGO : SLATE,
              boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              transition: 'all .12s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── QUESTIONS TAB ── */}
        {activeTab === 'questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Illustration summary bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: SLATE, marginRight: 4 }}>Illustration status (this page):</span>
              <Pill active={filterIllust === 'has_svg'} activeColor={GREEN} onClick={() => setFilterIllust(f => f === 'has_svg' ? '' : 'has_svg')}>
                ✓ SVG ready · {illustStats.hasSvg}
              </Pill>
              <Pill active={filterIllust === 'has_prompt'} activeColor={AMBER} onClick={() => setFilterIllust(f => f === 'has_prompt' ? '' : 'has_prompt')}>
                📋 Prompt only · {illustStats.hasPrompt}
              </Pill>
              <Pill active={filterIllust === 'none'} activeColor={SLATE} onClick={() => setFilterIllust(f => f === 'none' ? '' : 'none')}>
                No illustration · {illustStats.noPrompt}
              </Pill>
              {filterIllust && <button onClick={() => setFilterIllust('')} style={{ fontSize: 11, color: SLATE, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}>Clear ×</button>}
            </div>

            {/* Search + filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search question text…"
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 13, background: '#fff', color: '#0F172A', outline: 'none', fontFamily: 'inherit' }}
              />
              <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 12, background: '#fff', color: '#374151', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="">All topics</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
                style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 12, background: '#fff', color: '#374151', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="">All difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <Pill active={filterImage} activeColor={INDIGO} onClick={() => setFilterImage(f => !f)}>🖼 Has image</Pill>
              <Pill active={filterUntagged} activeColor={RED} onClick={() => setFilterUntagged(f => !f)}>⚠ Untagged</Pill>
              {hasFilters && (
                <button onClick={() => { setSearch(''); setFilterTopic(''); setFilterDiff(''); setFilterImage(false); setFilterUntagged(false); setFilterIllust('') }}
                  style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: SLATE, background: '#F1F5F9', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear all ✕
                </button>
              )}
            </div>

            {/* Question list */}
            <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,.04)' }}>
              {loadingQ ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={32}/></div>
              ) : displayQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
                  <p style={{ color: SLATE, fontSize: 13, marginBottom: 8 }}>
                    {hasFilters ? 'No questions match these filters.' : `No questions for ${selectedSubj?.name ?? 'this subject'}.`}
                  </p>
                  {!hasFilters && <Link href="/admin/questions/upload" style={{ color: INDIGO, fontSize: 13, fontWeight: 700 }}>Upload past questions →</Link>}
                </div>
              ) : (
                displayQuestions.map(q => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    isExpanded={expandedId === q.id}
                    onToggle={() => setExpandedId(id => id === q.id ? null : q.id)}
                    onQuestionUpdated={handleQuestionUpdated}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: SLATE }}>
                  {((page - 1) * 30) + 1}–{Math.min(page * 30, total)} of {total.toLocaleString()}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '6px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 700, color: page === 1 ? '#CBD5E1' : '#374151', cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: SLATE, minWidth: 60, textAlign: 'center' }}>{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: '6px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 700, color: page === totalPages ? '#CBD5E1' : '#374151', cursor: page === totalPages ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COVERAGE TAB ── */}
        {activeTab === 'coverage' && (
          <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 16, padding: 20, boxShadow: '0 1px 8px rgba(0,0,0,.04)' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0F172A' }}>{selectedSubj?.name ?? '—'} · {examType === 'ALL' ? 'All exams' : examType}</div>
              <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Click ⭐ to mark a topic as Core — prioritised in student practice and diagnostics.</div>
            </div>
            <CoverageChart subjectId={subjectId} examType={examType} onMarkCore={markCore} coreTopicIds={coreTopicIds} onCoreUpdated={loadCoreTopicIds}/>
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, marginTop: 12 }}>
              <Link href="/admin/core-topics" style={{ fontSize: 12, fontWeight: 700, color: INDIGO }}>Manage core topics in detail →</Link>
            </div>
          </div>
        )}

        {/* ── YEAR MATRIX TAB ── */}
        {activeTab === 'years' && <YearCoverage examType={examType}/>}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && <BatchHistory subjectId={subjectId} examType={examType !== 'ALL' ? examType : ''}/>}

      </div>
    </>
  )
}