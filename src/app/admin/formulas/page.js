'use client'
// src/app/admin/formulas/page.js
// Admin tool to create and manage key formulas per subject + topic.
// Flow: pick subject → pick topic → add / edit / delete formulas
// AI assist: generates a set of formulas for the selected topic via Claude API.

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const FORMULA_SUBJECTS = [
  'Physics', 'Chemistry', 'Mathematics', 'Further Mathematics', 'Economics', 'Accounting',
]

// ── Empty formula template ─────────────────────────────────────────────────────
function blankFormula(topic, subject) {
  return {
    id: `draft-${Date.now()}`,
    label: '',
    formula_plain: '',
    formula_latex: '',
    description: '',
    variables: {},
    example: '',
    topic_id: topic.id,
    subject_id: subject.id,
    is_active: true,
    isDraft: true,
  }
}

// ── Variable editor ────────────────────────────────────────────────────────────
function VariableEditor({ variables, onChange }) {
  const entries = Object.entries(variables ?? {})
  const [newKey, setNewKey]   = useState('')
  const [newVal, setNewVal]   = useState('')

  function add() {
    if (!newKey.trim()) return
    onChange({ ...variables, [newKey.trim()]: newVal.trim() })
    setNewKey(''); setNewVal('')
  }

  function remove(k) {
    const copy = { ...variables }
    delete copy[k]
    onChange(copy)
  }

  return (
    <div>
      <label style={labelStyle}>Variables (symbol → meaning)</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#FFB800', minWidth: 32 }}>{k}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{v}</span>
            <button onClick={() => remove(k)} style={{ ...iconBtn, color: '#f87171', borderColor: 'rgba(248,113,113,.2)', background: 'rgba(248,113,113,.08)' }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Symbol (e.g. F)" style={{ ...inputStyle, width: 72, fontFamily: 'monospace' }}/>
        <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Meaning (e.g. Force in Newtons)" style={{ ...inputStyle, flex: 1 }}
          onKeyDown={e => e.key === 'Enter' && add()}/>
        <button onClick={add} style={{ ...outlineBtn, color: '#60a5fa', borderColor: 'rgba(18,100,229,.3)', background: 'rgba(18,100,229,.1)' }}>+ Add</button>
      </div>
    </div>
  )
}

// ── Formula card (read mode) ────────────────────────────────────────────────────
function FormulaRow({ formula, onEdit, onDelete }) {
  return (
    <div style={{ borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{formula.label || <span style={{ color: '#475569' }}>Untitled</span>}</p>
        <p style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#FFB800' }}>{formula.formula_plain}</p>
        {formula.description && <p style={{ fontSize: 11, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>{formula.description}</p>}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={() => onEdit(formula)} style={{ ...iconBtn, color: '#60a5fa', borderColor: 'rgba(18,100,229,.2)', background: 'rgba(18,100,229,.1)' }}>✎</button>
        <button onClick={() => onDelete(formula)} style={{ ...iconBtn, color: '#f87171', borderColor: 'rgba(248,113,113,.2)', background: 'rgba(248,113,113,.08)' }}>✕</button>
      </div>
    </div>
  )
}

// ── Formula edit panel ─────────────────────────────────────────────────────────
function FormulaEditPanel({ formula, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...formula })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ borderRadius: 14, background: '#0f172a', border: '2px solid #1264E5', padding: 18 }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', marginBottom: 14 }}>
        {formula.isDraft ? '+ New formula' : 'Edit formula'}
      </p>

      {/* Name */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Formula name / title *</label>
        <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Newton's Second Law"
          style={inputStyle}/>
      </div>

      {/* Plain formula */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Formula — plain text *</label>
        <input value={form.formula_plain} onChange={e => set('formula_plain', e.target.value)} placeholder="e.g. F = ma"
          style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}/>
      </div>

      {/* LaTeX formula */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Formula — LaTeX (optional)</label>
        <input value={form.formula_latex ?? ''} onChange={e => set('formula_latex', e.target.value)} placeholder="e.g. F = ma"
          style={{ ...inputStyle, fontFamily: 'monospace' }}/>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>What it means</label>
        <textarea rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)}
          placeholder="Plain-English explanation of what the formula represents"
          style={{ ...inputStyle, resize: 'vertical' }}/>
      </div>

      {/* Variables */}
      <div style={{ marginBottom: 12 }}>
        <VariableEditor variables={form.variables ?? {}} onChange={vars => set('variables', vars)}/>
      </div>

      {/* Example */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Worked example (optional)</label>
        <textarea rows={2} value={form.example ?? ''} onChange={e => set('example', e.target.value)}
          placeholder="e.g. If m = 5 kg and a = 2 m/s², then F = 5 × 2 = 10 N"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}/>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave(form)} disabled={saving || !form.label || !form.formula_plain}
          style={{ flex: 1, padding: '10px', borderRadius: 10, background: (!form.label || !form.formula_plain) ? '#1e293b' : '#1264E5', border: 'none', color: (!form.label || !form.formula_plain) ? '#475569' : '#fff', fontSize: 13, fontWeight: 700, cursor: (!form.label || !form.formula_plain) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : 'Save formula'}
        </button>
        <button onClick={onCancel} style={{ padding: '10px 16px', borderRadius: 10, background: 'transparent', border: '1px solid #334155', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const labelStyle = { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 4 }
const inputStyle  = { width: '100%', padding: '9px 11px', borderRadius: 9, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
const iconBtn     = { width: 30, height: 30, borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const outlineBtn  = { padding: '7px 13px', borderRadius: 9, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminFormulasPage() {
  const supabase = svc()

  const [subjects,   setSubjects]   = useState([])
  const [subject,    setSubject]    = useState(null)
  const [topics,     setTopics]     = useState([])
  const [topic,      setTopic]      = useState(null)
  const [formulas,   setFormulas]   = useState([])
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [editId,     setEditId]     = useState(null)  // id of formula being edited (or 'new')
  const [toast,      setToast]      = useState(null)

  function showToast(msg, color = '#4ade80') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

  // Load subjects on mount
  useEffect(() => {
    supabase.from('subjects').select('id,name').eq('is_active', true).order('name')
      .then(({ data }) => setSubjects((data ?? []).filter(s => FORMULA_SUBJECTS.includes(s.name))))
  }, [])

  async function pickSubject(sub) {
    setSubject(sub); setTopic(null); setFormulas([]); setLoading(true); setEditId(null)
    const { data } = await supabase.from('topics').select('id,name,order_index')
      .eq('subject_id', sub.id).order('order_index', { nullsLast: true }).order('name')
    setTopics(data ?? []); setLoading(false)
  }

  async function pickTopic(t) {
    setTopic(t); setLoading(true); setEditId(null)
    const { data } = await supabase.from('key_formulas').select('*').eq('topic_id', t.id).order('label')
    setFormulas(data ?? []); setLoading(false)
  }

  // ── AI generation ────────────────────────────────────────────────────────────
  async function generateFormulas() {
    if (!topic || !subject) return
    setGenerating(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are creating a formula reference sheet for Nigerian secondary school students (WAEC/JAMB).

Subject: ${subject.name}
Topic: ${topic.name}

Generate the key formulas for this topic. Return ONLY valid JSON array, no markdown, no preamble:
[{
  "label": "Name of formula",
  "formula_plain": "Formula in plain text (e.g. v = u + at)",
  "formula_latex": "LaTeX version if useful (optional, can be null)",
  "description": "1-2 sentence plain English explanation",
  "variables": {"v": "final velocity (m/s)", "u": "initial velocity (m/s)"},
  "example": "Short worked example (optional, can be null)"
}]

Rules:
- Include only formulas genuinely in the WAEC/JAMB syllabus for this topic
- formula_plain must be clean and readable (use × not *, use proper symbols)
- Keep descriptions simple — secondary school level
- variables object: key = symbol, value = what it means with units
- If the topic has no formulas (e.g. history topic), return an empty array []`
          }],
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text ?? ''
      const cleaned = text.replace(/```json|```/g, '').trim()
      const generated = JSON.parse(cleaned)
      if (!generated.length) { showToast('No formulas generated for this topic', '#FFB800'); setGenerating(false); return }
      const newFormulas = generated.map(f => ({
        ...f,
        id: `draft-${Math.random().toString(36).slice(2)}`,
        topic_id: topic.id,
        subject_id: subject.id,
        is_active: true,
        isDraft: true,
      }))
      setFormulas(prev => [...prev, ...newFormulas])
      showToast(`Generated ${newFormulas.length} formulas — review and save each one`)
    } catch (e) {
      showToast(`AI generation failed: ${e.message}`, '#f87171')
    }
    setGenerating(false)
  }

  // ── Save formula ─────────────────────────────────────────────────────────────
  async function saveFormula(formula) {
    setSaving(true)
    try {
      if (formula.isDraft) {
        const { id, isDraft, ...rest } = formula
        const { data, error } = await supabase.from('key_formulas').insert(rest).select().single()
        if (error) throw error
        setFormulas(prev => [...prev.filter(f => f.id !== formula.id), data].sort((a, b) => a.label.localeCompare(b.label)))
      } else {
        const { isDraft, ...rest } = formula
        const { error } = await supabase.from('key_formulas').update(rest).eq('id', formula.id)
        if (error) throw error
        setFormulas(prev => prev.map(f => f.id === formula.id ? { ...formula } : f))
      }
      setEditId(null)
      showToast('Formula saved ✓')
    } catch (e) {
      showToast(`Save failed: ${e.message}`, '#f87171')
    }
    setSaving(false)
  }

  // ── Delete formula ────────────────────────────────────────────────────────────
  async function deleteFormula(formula) {
    if (formula.isDraft) { setFormulas(prev => prev.filter(f => f.id !== formula.id)); return }
    if (!confirm(`Delete "${formula.label}"?`)) return
    await supabase.from('key_formulas').delete().eq('id', formula.id)
    setFormulas(prev => prev.filter(f => f.id !== formula.id))
    showToast('Deleted', '#FFB800')
  }

  const editingFormula = editId === 'new'
    ? blankFormula(topic, subject)
    : formulas.find(f => f.id === editId) ?? null

  return (
    <div style={{ fontFamily: 'inherit', maxWidth: 960, margin: '0 auto', padding: '24px 16px', color: '#f1f5f9' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '10px 20px', borderRadius: 12, background: '#1a2035', border: `1px solid ${toast.color}30`, color: toast.color, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>🧮 Key Formulas</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>Add and manage formula reference sheets for each subject and topic</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Subject + Topic selectors ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Subject list */}
          <div style={{ borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#475569', padding: '10px 14px 6px' }}>Subject</p>
            {subjects.map(s => (
              <button key={s.id} onClick={() => pickSubject(s)}
                style={{ width: '100%', padding: '9px 14px', textAlign: 'left', background: subject?.id === s.id ? 'rgba(18,100,229,.15)' : 'transparent', border: 'none', borderLeft: `3px solid ${subject?.id === s.id ? '#1264E5' : 'transparent'}`, cursor: 'pointer', color: subject?.id === s.id ? '#60a5fa' : '#94a3b8', fontSize: 12, fontWeight: subject?.id === s.id ? 700 : 400, fontFamily: 'inherit', transition: 'all .12s' }}>
                {s.name}
              </button>
            ))}
          </div>

          {/* Topic list */}
          {subject && (
            <div style={{ borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b', overflow: 'hidden' }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#475569', padding: '10px 14px 6px' }}>Topic</p>
              {loading && !topics.length
                ? <p style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>Loading…</p>
                : topics.map(t => (
                  <button key={t.id} onClick={() => pickTopic(t)}
                    style={{ width: '100%', padding: '9px 14px', textAlign: 'left', background: topic?.id === t.id ? 'rgba(18,100,229,.15)' : 'transparent', border: 'none', borderLeft: `3px solid ${topic?.id === t.id ? '#1264E5' : 'transparent'}`, cursor: 'pointer', color: topic?.id === t.id ? '#60a5fa' : '#94a3b8', fontSize: 12, fontWeight: topic?.id === t.id ? 700 : 400, fontFamily: 'inherit', transition: 'all .12s' }}>
                    {t.name}
                  </button>
                ))
              }
            </div>
          )}
        </div>

        {/* ── Right: Formulas editor ── */}
        <div>
          {!topic ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, color: '#475569' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>🧮</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Select a subject and topic</p>
              <p style={{ fontSize: 13, color: '#475569' }}>Pick from the left panel to start adding formulas</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{topic.name}</p>
                  <p style={{ fontSize: 11, color: '#475569' }}>{subject.name} · {formulas.length} formula{formulas.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={generateFormulas} disabled={generating}
                  style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(155,122,224,.15)', border: '1px solid rgba(155,122,224,.3)', color: '#c4b5fd', fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: generating ? 0.5 : 1 }}>
                  {generating ? '✦ Generating…' : '✦ AI Generate'}
                </button>
                <button onClick={() => setEditId('new')} disabled={!!editId}
                  style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(18,100,229,.15)', border: '1px solid rgba(18,100,229,.3)', color: '#60a5fa', fontSize: 12, fontWeight: 700, cursor: editId ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: editId ? 0.5 : 1 }}>
                  + Add formula
                </button>
              </div>

              {/* AI-generated drafts notice */}
              {formulas.some(f => f.isDraft) && (
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,184,0,.08)', border: '1px solid rgba(255,184,0,.2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <p style={{ fontSize: 12, color: '#FFB800', lineHeight: 1.5 }}>
                    <strong>{formulas.filter(f => f.isDraft).length} AI-generated formula{formulas.filter(f => f.isDraft).length > 1 ? 's' : ''} waiting.</strong>{' '}
                    Click ✎ to review and save each one.
                  </p>
                </div>
              )}

              {/* New formula editor (shown at top when editId === 'new') */}
              {editId === 'new' && topic && subject && (
                <div style={{ marginBottom: 12 }}>
                  <FormulaEditPanel
                    formula={blankFormula(topic, subject)}
                    onSave={saveFormula}
                    onCancel={() => setEditId(null)}
                    saving={saving}
                  />
                </div>
              )}

              {/* Formulas list */}
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map(i => <div key={i} style={{ height: 64, borderRadius: 13, background: '#0f172a', border: '1px solid #1e293b' }}/>)}
                </div>
              ) : formulas.length === 0 && editId !== 'new' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16 }}>
                  <p style={{ fontSize: 28, marginBottom: 10 }}>🧮</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>No formulas yet</p>
                  <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>Use AI Generate to create a set instantly, or add formulas manually.</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button onClick={generateFormulas} disabled={generating}
                      style={{ padding: '9px 18px', borderRadius: 10, background: 'rgba(155,122,224,.15)', border: '1px solid rgba(155,122,224,.3)', color: '#c4b5fd', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✦ AI Generate
                    </button>
                    <button onClick={() => setEditId('new')}
                      style={{ padding: '9px 18px', borderRadius: 10, background: 'rgba(18,100,229,.15)', border: '1px solid rgba(18,100,229,.3)', color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Add manually
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {formulas.map(f =>
                    editId === f.id ? (
                      <FormulaEditPanel
                        key={f.id}
                        formula={f}
                        onSave={saveFormula}
                        onCancel={() => setEditId(null)}
                        saving={saving}
                      />
                    ) : (
                      <div key={f.id}>
                        {f.isDraft && (
                          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#FFB800', background: 'rgba(255,184,0,.1)', border: '1px solid rgba(255,184,0,.2)', borderRadius: 6, padding: '1px 7px' }}>AI DRAFT — click ✎ to review &amp; save</span>
                          </div>
                        )}
                        <FormulaRow
                          formula={f}
                          onEdit={formula => setEditId(formula.id)}
                          onDelete={deleteFormula}
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}