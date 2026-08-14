'use client'
// src/app/admin/flashcards/page.js
//
// WORKFLOW:
//   1. Pick subject + topic on the left
//   2. Switch between Flashcards tab and Formulas tab
//   3. Click "Get prompt" → copy the generated prompt
//   4. Paste prompt into Claude / Gemini → copy the JSON output
//   5. Paste JSON into the textarea → preview renders live
//   6. Fix any errors shown, then click Save
//
// No AI API calls from this page. Prompts are generated here;
// AI runs externally; results are pasted back and saved to Supabase.

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const svc = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

// ─── Subjects ────────────────────────────────────────────────────────────────
const ALL_SUBJECTS = [
  'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Further Mathematics',
  'English Language', 'Use of English', 'Economics', 'Government', 'Geography',
  'Literature in English', 'Agricultural Science', 'Commerce', 'Accounting',
]
const FORMULA_SUBJECTS = new Set([
  'Physics', 'Chemistry', 'Mathematics', 'Further Mathematics', 'Economics', 'Accounting',
])

// ─── Prompt builders ─────────────────────────────────────────────────────────
function buildFlashcardPrompt({ subjectName, topicName, objectives, examType }) {
  return `You are creating WAEC/JAMB exam flashcards for Nigerian secondary school students.

Subject: ${subjectName}
Topic: ${topicName}
Exam: ${examType || 'WAEC & JAMB'}
${objectives ? `Topic objectives / key ideas:\n${objectives}\n` : ''}
Generate exactly 10 flashcards covering the most important and frequently tested ideas in this topic.

Return ONLY a valid JSON array — no markdown fences, no explanation, just the raw JSON:

[
  {
    "front_text": "Question or term (max 120 characters)",
    "back_text": "Clear, concise answer (max 220 characters)",
    "hint": "A short nudge that doesn't give it away — or null",
    "mnemonic": "A memory trick, acronym, or rhyme — or null",
    "difficulty": "easy | medium | hard"
  }
]

Rules:
- front_text: one clear question or a key term to define
- back_text: the answer in plain, simple English (SS3 level)
- hint: a gentle nudge (e.g. "Think about what happens to volume when pressure increases")
- mnemonic: only include if there is a genuinely useful trick (acronym, rhyme, pattern)
- difficulty: easy = definition/recall, medium = concept, hard = application or calculation
- Focus strictly on what actually appears in ${examType || 'WAEC/JAMB'} past questions
- Do NOT use LaTeX in any field — write maths in plain text (e.g. "v² = u² + 2as" not "$v^2 = u^2 + 2as$")
- Symbols are fine: use ², ³, →, ⁻¹, Δ, θ, α, β, π, μ, λ, Ω, ρ, etc.`
}

function buildFormulaPrompt({ subjectName, topicName, objectives, examType }) {
  return `You are creating a formula reference sheet for Nigerian secondary school students (${examType || 'WAEC & JAMB'}).

Subject: ${subjectName}
Topic: ${topicName}
${objectives ? `Topic objectives / key ideas:\n${objectives}\n` : ''}
List every formula a student needs to know for this topic in the ${examType || 'WAEC/JAMB'} exam.

Return ONLY a valid JSON array — no markdown fences, no explanation, just the raw JSON:

[
  {
    "label": "Name of the formula (e.g. Newton's Second Law)",
    "formula_plain": "The formula in plain text (e.g. F = ma)",
    "formula_latex": null,
    "description": "One or two sentences explaining what the formula means and when to use it",
    "variables": {
      "F": "Force — measured in Newtons (N)",
      "m": "Mass — measured in kilograms (kg)",
      "a": "Acceleration — measured in m/s²"
    },
    "example": "If m = 5 kg and a = 3 m/s², then F = 5 × 3 = 15 N — or null if not needed"
  }
]

Rules:
- label: short human name for the formula
- formula_plain: REQUIRED — write in clean plain text. Use × not *, use proper symbols.
  Good examples: "v = u + at", "PV = nRT", "E = mc²", "sin²θ + cos²θ = 1"
  For fractions write: "v² = u² + 2as" not a fraction bar
- formula_latex: set to null unless you have a strong reason to include it
- description: plain English, secondary school level
- variables: every symbol that appears in the formula, with its meaning and unit
- example: a short worked example with numbers — highly encouraged for Physics/Maths
- Include ONLY formulas genuinely on the ${examType || 'WAEC/JAMB'} syllabus for this topic
- Use superscript characters directly: m², cm³, s⁻¹, m/s², not "m^2" or "m<sup>2</sup>"
- Symbols welcome: Δ, θ, α, β, π, μ, λ, Ω, ρ, ∑, √, ∞, ±, ≈, ≠, ≤, ≥`
}

// ─── Flashcard JSON validator ─────────────────────────────────────────────────
function validateFlashcards(raw) {
  const errors = []
  let parsed = null
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e.message}`], data: null }
  }
  if (!Array.isArray(parsed)) return { valid: false, errors: ['Expected a JSON array'], data: null }
  if (parsed.length === 0) return { valid: false, errors: ['Array is empty'], data: null }
  parsed.forEach((card, i) => {
    const n = i + 1
    if (!card.front_text?.trim()) errors.push(`Card ${n}: front_text is required`)
    else if (card.front_text.length > 140) errors.push(`Card ${n}: front_text too long (${card.front_text.length} chars, max 140)`)
    if (!card.back_text?.trim()) errors.push(`Card ${n}: back_text is required`)
    else if (card.back_text.length > 240) errors.push(`Card ${n}: back_text too long (${card.back_text.length} chars, max 240)`)
    if (!['easy', 'medium', 'hard'].includes(card.difficulty)) errors.push(`Card ${n}: difficulty must be easy / medium / hard`)
    // Warn about LaTeX
    if (card.front_text?.includes('$') || card.back_text?.includes('$')) errors.push(`Card ${n}: contains LaTeX ($…$) — use plain text symbols instead`)
  })
  return { valid: errors.length === 0, errors, data: parsed }
}

// ─── Formula JSON validator ───────────────────────────────────────────────────
function validateFormulas(raw) {
  const errors = []
  let parsed = null
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e.message}`], data: null }
  }
  if (!Array.isArray(parsed)) return { valid: false, errors: ['Expected a JSON array'], data: null }
  if (parsed.length === 0) return { valid: false, errors: ['Array is empty'], data: null }
  parsed.forEach((f, i) => {
    const n = i + 1
    if (!f.label?.trim())         errors.push(`Formula ${n}: label is required`)
    if (!f.formula_plain?.trim()) errors.push(`Formula ${n}: formula_plain is required`)
    else {
      // Catch common mistakes
      if (f.formula_plain.includes('^'))      errors.push(`Formula ${n}: use superscript characters (² ³ ⁻¹) not ^ in formula_plain`)
      if (f.formula_plain.includes('<sup>'))  errors.push(`Formula ${n}: use superscript characters not HTML <sup> tags`)
      if (f.formula_plain.includes('\\'))     errors.push(`Formula ${n}: LaTeX backslash found in formula_plain — use plain text`)
    }
    if (f.variables && typeof f.variables !== 'object') errors.push(`Formula ${n}: variables must be an object`)
    if (f.description && f.description.length > 400) errors.push(`Formula ${n}: description too long (${f.description.length} chars, max 400)`)
  })
  return { valid: errors.length === 0, errors, data: parsed }
}

// ─── Flashcard preview ────────────────────────────────────────────────────────
function FlashcardPreview({ cards }) {
  const diffColor = { easy: '#4ade80', medium: '#FFB800', hard: '#f87171' }
  const diffBg    = { easy: 'rgba(74,222,128,.1)', medium: 'rgba(255,184,0,.1)', hard: 'rgba(248,113,113,.1)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
        {cards.length} card{cards.length !== 1 ? 's' : ''} — scroll to review all
      </p>
      {cards.map((card, i) => (
        <div key={i} style={{ borderRadius: 12, background: '#0a0f1e', border: '1px solid #1e293b', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.45, flex: 1 }}>{card.front_text}</p>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, flexShrink: 0, marginTop: 1,
              color: diffColor[card.difficulty] ?? '#94a3b8',
              background: diffBg[card.difficulty] ?? 'rgba(148,163,184,.1)',
              border: `1px solid ${diffColor[card.difficulty] ?? '#94a3b8'}30` }}>
              {card.difficulty}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, paddingTop: 6, borderTop: '1px solid #1e293b' }}>{card.back_text}</p>
          {(card.hint || card.mnemonic) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {card.hint     && <span style={{ fontSize: 10, color: '#60a5fa' }}>💡 {card.hint}</span>}
              {card.mnemonic && <span style={{ fontSize: 10, color: '#c4b5fd' }}>🧠 {card.mnemonic}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Formula preview ──────────────────────────────────────────────────────────
function FormulaPreview({ formulas }) {
  const [open, setOpen] = useState({})
  const toggle = i => setOpen(s => ({ ...s, [i]: !s[i] }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
        {formulas.length} formula{formulas.length !== 1 ? 's' : ''} — tap to expand
      </p>
      {formulas.map((f, i) => (
        <div key={i} style={{ borderRadius: 12, background: '#0a0f1e', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <button onClick={() => toggle(i)} style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFB800', flexShrink: 0 }}/>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', flex: 1 }}>{f.label}</p>
            <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 800, color: '#FFB800', flexShrink: 0, marginRight: 4 }}>{f.formula_plain}</span>
            <span style={{ fontSize: 11, color: '#475569', transform: open[i] ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▾</span>
          </button>
          {open[i] && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1e293b' }}>
              {/* Formula display */}
              <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 9, background: '#131c2e', textAlign: 'center', fontFamily: 'monospace', fontSize: 17, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.04em' }}>
                {f.formula_plain}
              </div>
              {f.description && (
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>{f.description}</p>
              )}
              {f.variables && Object.keys(f.variables).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#475569', marginBottom: 6 }}>Variables</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {Object.entries(f.variables).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#FFB800', fontSize: 12, minWidth: 28 }}>{k}</span>
                        <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {f.example && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,184,0,.06)', border: '1px solid rgba(255,184,0,.15)' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: '#FFB800', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.1em' }}>Example</p>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.5 }}>{f.example}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  label:    { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', color: '#475569', display: 'block', marginBottom: 5 },
  input:    { width: '100%', padding: '8px 11px', borderRadius: 9, background: '#0f172a', border: '1px solid #1e293b', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' },
  textarea: { width: '100%', padding: '9px 11px', borderRadius: 9, background: '#0f172a', border: '1px solid #1e293b', color: '#f1f5f9', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none', resize: 'vertical' },
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminFlashcardsFormulasPage() {
  const supabase = svc()

  const [tab,        setTab]        = useState('flashcards')  // 'flashcards' | 'formulas'
  const [subjects,   setSubjects]   = useState([])
  const [subject,    setSubject]    = useState(null)
  const [topics,     setTopics]     = useState([])
  const [topic,      setTopic]      = useState(null)
  const [loadingT,   setLoadingT]   = useState(false)

  // Prompt inputs
  const [objectives, setObjectives] = useState('')
  const [examType,   setExamType]   = useState('WAEC & JAMB')

  // Prompt + paste flow
  const [promptText,  setPromptText]  = useState('')
  const [showPrompt,  setShowPrompt]  = useState(false)
  const [pasteRaw,    setPasteRaw]    = useState('')
  const [validation,  setValidation]  = useState(null)   // { valid, errors, data }

  // Existing content counts
  const [existingCards,    setExistingCards]    = useState([])
  const [existingFormulas, setExistingFormulas] = useState([])

  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState(null)

  function showToast(msg, color = '#4ade80') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3200)
  }

  // Load subjects
  useEffect(() => {
    supabase.from('subjects').select('id,name').eq('is_active', true).order('name')
      .then(({ data }) => setSubjects(data ?? []))
  }, [])

  async function pickSubject(sub) {
    setSubject(sub); setTopic(null)
    setExistingCards([]); setExistingFormulas([])
    setPromptText(''); setPasteRaw(''); setValidation(null); setShowPrompt(false)
    setLoadingT(true)
    const { data } = await supabase.from('topics').select('id,name,order_index')
      .eq('subject_id', sub.id).order('order_index', { nullsLast: true }).order('name')
    setTopics(data ?? []); setLoadingT(false)
  }

  async function pickTopic(t) {
    setTopic(t)
    setPromptText(''); setPasteRaw(''); setValidation(null); setShowPrompt(false)
    const [fc, fm] = await Promise.all([
      supabase.from('flashcards').select('id,front_text,difficulty').eq('topic_id', t.id).order('difficulty'),
      supabase.from('key_formulas').select('id,label,formula_plain').eq('topic_id', t.id).order('label'),
    ])
    setExistingCards(fc.data ?? [])
    setExistingFormulas(fm.data ?? [])
  }

  // Build + show prompt
  function generatePrompt() {
    if (!subject || !topic) return
    const text = tab === 'flashcards'
      ? buildFlashcardPrompt({ subjectName: subject.name, topicName: topic.name, objectives, examType })
      : buildFormulaPrompt({ subjectName: subject.name, topicName: topic.name, objectives, examType })
    setPromptText(text)
    setShowPrompt(true)
    setPasteRaw(''); setValidation(null)
  }

  // Live validation as user pastes
  const handlePaste = useCallback((value) => {
    setPasteRaw(value)
    if (!value.trim()) { setValidation(null); return }
    const result = tab === 'flashcards' ? validateFlashcards(value) : validateFormulas(value)
    setValidation(result)
  }, [tab])

  // Save to Supabase
  async function handleSave() {
    if (!validation?.valid || !topic || !subject) return
    setSaving(true)
    try {
      if (tab === 'flashcards') {
        const rows = validation.data.map(c => ({
          front_text:  c.front_text,
          back_text:   c.back_text,
          hint:        c.hint   ?? null,
          mnemonic:    c.mnemonic ?? null,
          difficulty:  c.difficulty,
          topic_id:    topic.id,
          subject_id:  subject.id,
          is_active:   true,
        }))
        const { error } = await supabase.from('flashcards').insert(rows)
        if (error) throw error
        setExistingCards(prev => [...prev, ...rows.map((r, i) => ({ ...r, id: `new-${i}` }))])
        showToast(`${rows.length} flashcards saved ✓`)
      } else {
        const rows = validation.data.map(f => ({
          label:         f.label,
          formula_plain: f.formula_plain,
          formula_latex: f.formula_latex ?? null,
          description:   f.description  ?? null,
          variables:     f.variables    ?? {},
          example:       f.example      ?? null,
          topic_id:      topic.id,
          subject_id:    subject.id,
          is_active:     true,
        }))
        const { error } = await supabase.from('key_formulas').insert(rows)
        if (error) throw error
        setExistingFormulas(prev => [...prev, ...rows.map((r, i) => ({ ...r, id: `new-${i}` }))])
        showToast(`${rows.length} formulas saved ✓`)
      }
      setPasteRaw(''); setValidation(null); setShowPrompt(false); setPromptText('')
    } catch (e) {
      showToast(`Save failed: ${e.message}`, '#f87171')
    }
    setSaving(false)
  }

  async function deleteItem(type, id) {
    if (!confirm('Delete this item?')) return
    const table = type === 'flashcard' ? 'flashcards' : 'key_formulas'
    await supabase.from(table).delete().eq('id', id)
    if (type === 'flashcard') setExistingCards(p => p.filter(c => c.id !== id))
    else setExistingFormulas(p => p.filter(f => f.id !== id))
    showToast('Deleted', '#FFB800')
  }

  const isFormulaSubject = subject && FORMULA_SUBJECTS.has(subject.name)
  const canShowFormulas  = tab === 'formulas' && isFormulaSubject

  return (
    <div style={{ fontFamily: 'inherit', color: '#f1f5f9', maxWidth: 1100, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '11px 20px', borderRadius: 12, background: '#0a0f1e', border: `1px solid ${toast.color}40`, color: toast.color, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', marginBottom: 3, letterSpacing: '-0.02em' }}>
          Flashcards &amp; Formulas
        </h1>
        <p style={{ fontSize: 13, color: '#475569' }}>
          Pick a subject and topic → get a prompt → paste into Claude/Gemini → paste the output back → save.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 24, width: 'fit-content' }}>
        {[{ key: 'flashcards', label: '🃏 Flashcards' }, { key: 'formulas', label: '🧮 Key Formulas' }].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPasteRaw(''); setValidation(null); setShowPrompt(false); setPromptText('') }}
            style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              background: tab === t.key ? '#1264E5' : 'transparent', color: tab === t.key ? '#fff' : '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: subject + topic ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Subjects */}
          <div style={{ borderRadius: 13, background: '#0f172a', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <p style={{ ...S.label, padding: '10px 13px 5px' }}>Subject</p>
            {subjects
              .filter(s => tab === 'formulas' ? FORMULA_SUBJECTS.has(s.name) : true)
              .map(s => (
              <button key={s.id} onClick={() => pickSubject(s)}
                style={{ width: '100%', padding: '8px 13px', textAlign: 'left', border: 'none',
                  borderLeft: `3px solid ${subject?.id === s.id ? '#1264E5' : 'transparent'}`,
                  background: subject?.id === s.id ? 'rgba(18,100,229,.12)' : 'transparent',
                  color: subject?.id === s.id ? '#60a5fa' : '#94a3b8',
                  fontSize: 12, fontWeight: subject?.id === s.id ? 700 : 400,
                  fontFamily: 'inherit', cursor: 'pointer', transition: 'all .1s' }}>
                {s.name}
              </button>
            ))}
          </div>

          {/* Topics */}
          {subject && (
            <div style={{ borderRadius: 13, background: '#0f172a', border: '1px solid #1e293b', overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
              <p style={{ ...S.label, padding: '10px 13px 5px' }}>Topic</p>
              {loadingT
                ? <p style={{ padding: '10px 13px', fontSize: 12, color: '#475569' }}>Loading…</p>
                : topics.map(t => (
                  <button key={t.id} onClick={() => pickTopic(t)}
                    style={{ width: '100%', padding: '8px 13px', textAlign: 'left', border: 'none',
                      borderLeft: `3px solid ${topic?.id === t.id ? '#1264E5' : 'transparent'}`,
                      background: topic?.id === t.id ? 'rgba(18,100,229,.12)' : 'transparent',
                      color: topic?.id === t.id ? '#60a5fa' : '#94a3b8',
                      fontSize: 12, fontWeight: topic?.id === t.id ? 700 : 400,
                      fontFamily: 'inherit', cursor: 'pointer', transition: 'all .1s' }}>
                    {t.name}
                  </button>
                ))
              }
            </div>
          )}

          {/* Existing content summary */}
          {topic && (
            <div style={{ borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', padding: '12px 13px' }}>
              <p style={{ ...S.label, marginBottom: 8 }}>Already saved</p>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                🃏 {existingCards.length} flashcard{existingCards.length !== 1 ? 's' : ''}
              </p>
              <p style={{ fontSize: 12, color: '#64748b' }}>
                🧮 {existingFormulas.length} formula{existingFormulas.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: main panel ── */}
        <div>
          {!topic ? (
            <div style={{ textAlign: 'center', padding: '64px 20px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16 }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>{tab === 'flashcards' ? '🃏' : '🧮'}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Select a subject and topic to begin</p>
              <p style={{ fontSize: 12, color: '#334155' }}>You'll get a prompt to copy into Claude or Gemini.</p>
            </div>
          ) : tab === 'formulas' && !isFormulaSubject ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16 }}>
              <p style={{ fontSize: 28, marginBottom: 10 }}>📝</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>Formulas aren't applicable for {subject?.name}</p>
              <p style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>Formulas are only available for: Physics, Chemistry, Mathematics, Further Mathematics, Economics, Accounting.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Step 1: Prompt inputs ── */}
              <div style={{ borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b', padding: '16px 18px' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>
                  Step 1 — Set context &amp; get prompt
                </p>
                <p style={{ fontSize: 11, color: '#475569', marginBottom: 14 }}>
                  {subject.name} → {topic.name}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={S.label}>Exam target</label>
                    <select value={examType} onChange={e => setExamType(e.target.value)}
                      style={{ ...S.input, cursor: 'pointer' }}>
                      <option>WAEC &amp; JAMB</option>
                      <option>WAEC only</option>
                      <option>JAMB only</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Topic objectives / key ideas <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span></label>
                    <input value={objectives} onChange={e => setObjectives(e.target.value)}
                      placeholder="e.g. Newton's laws, momentum, impulse…"
                      style={S.input}/>
                  </div>
                </div>

                <button onClick={generatePrompt}
                  style={{ padding: '10px 22px', borderRadius: 10, background: '#1264E5', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em' }}>
                  Generate prompt →
                </button>
              </div>

              {/* ── Step 2: Copy prompt ── */}
              {showPrompt && promptText && (
                <div style={{ borderRadius: 14, background: '#0a0f1e', border: '1px solid #1e293b', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>Step 2 — Copy this prompt</p>
                      <p style={{ fontSize: 11, color: '#475569' }}>Paste it into Claude or Gemini and run it.</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(promptText); showToast('Prompt copied ✓') }}
                      style={{ padding: '8px 16px', borderRadius: 9, background: 'rgba(18,100,229,.15)', border: '1px solid rgba(18,100,229,.3)', color: '#60a5fa', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      📋 Copy prompt
                    </button>
                  </div>
                  <pre style={{ fontSize: 11, color: '#64748b', background: '#050b15', border: '1px solid #1e293b', borderRadius: 9, padding: '12px 14px', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 260, overflowY: 'auto', margin: 0 }}>
                    {promptText}
                  </pre>
                </div>
              )}

              {/* ── Step 3: Paste output ── */}
              {showPrompt && (
                <div style={{ borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b', padding: '16px 18px' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>Step 3 — Paste the AI output</p>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>
                    Copy the JSON from Claude/Gemini and paste it below. It will validate instantly.
                  </p>
                  <textarea
                    value={pasteRaw}
                    onChange={e => handlePaste(e.target.value)}
                    rows={10}
                    placeholder={`Paste the JSON array here…\n\nShould start with [ and end with ]`}
                    style={{ ...S.textarea, fontSize: 11 }}
                  />

                  {/* Validation feedback */}
                  {validation && (
                    <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10,
                      background: validation.valid ? 'rgba(74,222,128,.07)' : 'rgba(248,113,113,.07)',
                      border: `1px solid ${validation.valid ? 'rgba(74,222,128,.25)' : 'rgba(248,113,113,.25)'}` }}>
                      {validation.valid ? (
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 800, color: '#4ade80', marginBottom: 4 }}>
                            ✓ Valid — {validation.data.length} {tab === 'flashcards' ? 'card' : 'formula'}{validation.data.length !== 1 ? 's' : ''} ready to save
                          </p>
                          <p style={{ fontSize: 11, color: '#4ade8099' }}>Check the preview below, then click Save.</p>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 800, color: '#f87171', marginBottom: 8 }}>
                            ✕ {validation.errors.length} problem{validation.errors.length !== 1 ? 's' : ''} found — fix in the source, then re-paste
                          </p>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {validation.errors.map((e, i) => (
                              <li key={i} style={{ fontSize: 11, color: '#f87171cc', display: 'flex', gap: 6 }}>
                                <span style={{ color: '#f8717180', flexShrink: 0 }}>▸</span> {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Preview + Save ── */}
              {validation?.valid && validation.data?.length > 0 && (
                <div style={{ borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>Step 4 — Preview &amp; save</p>
                      <p style={{ fontSize: 11, color: '#475569' }}>Review everything looks correct, then save to the database.</p>
                    </div>
                    <button onClick={handleSave} disabled={saving}
                      style={{ padding: '10px 22px', borderRadius: 10, background: saving ? '#1e293b' : '#16a34a', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'Saving…' : `Save ${validation.data.length} ${tab === 'flashcards' ? 'card' : 'formula'}${validation.data.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>

                  {tab === 'flashcards'
                    ? <FlashcardPreview cards={validation.data} />
                    : <FormulaPreview formulas={validation.data} />
                  }
                </div>
              )}

              {/* ── Existing items (collapsible) ── */}
              {(tab === 'flashcards' ? existingCards : existingFormulas).length > 0 && (
                <ExistingItems
                  tab={tab}
                  cards={existingCards}
                  formulas={existingFormulas}
                  onDelete={deleteItem}
                />
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Existing items panel (collapsible) ───────────────────────────────────────
function ExistingItems({ tab, cards, formulas, onDelete }) {
  const [open, setOpen] = useState(false)
  const items = tab === 'flashcards' ? cards : formulas
  const diffColor = { easy: '#4ade80', medium: '#FFB800', hard: '#f87171' }

  return (
    <div style={{ borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
            Existing {tab === 'flashcards' ? 'flashcards' : 'formulas'} for this topic
          </p>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'rgba(18,100,229,.12)', color: '#60a5fa' }}>
            {items.length}
          </span>
        </div>
        <span style={{ fontSize: 12, color: '#475569', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {tab === 'flashcards'
              ? cards.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: '#0a0f1e', border: '1px solid #1e293b' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.front_text}</p>
                    <span style={{ fontSize: 9, fontWeight: 800, color: diffColor[c.difficulty] ?? '#94a3b8' }}>{c.difficulty}</span>
                  </div>
                  <button onClick={() => onDelete('flashcard', c.id)} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', color: '#f87171', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                </div>
              ))
              : formulas.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: '#0a0f1e', border: '1px solid #1e293b' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{f.label}</p>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#FFB800' }}>{f.formula_plain}</span>
                  </div>
                  <button onClick={() => onDelete('formula', f.id)} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', color: '#f87171', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}