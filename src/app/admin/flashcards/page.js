'use client'
// src/app/admin/flashcards/page.js
//
// WHAT THIS PAGE DOES
// ───────────────────
// Manages flashcards and key formulas per subject topic.
//
// KEY DESIGN DECISIONS
// ─────────────────────
// 1. TOPIC DEDUPLICATION
//    Topics exist per-exam in the DB (Physics WAEC, Physics JAMB).
//    Flashcards and formulas are the SAME for the same concept regardless of exam.
//    We fetch all topics for the base subject name (across all exam variants),
//    deduplicate by topic name, and when saving we write rows for ALL matching
//    topic IDs — so the same card appears for WAEC and JAMB students.
//
// 2. RLS FIX
//    All writes go through /api/admin/flashcards and /api/admin/formulas which
//    use SUPABASE_SERVICE_ROLE_KEY — bypassing student-facing RLS on these tables.
//
// 3. PROMPT FLOW (same pattern as the import page)
//    Step 1 → fill in topic objectives → click "Get prompt"
//    Step 2 → copy prompt → paste into Claude/Gemini
//    Step 3 → paste AI JSON back → validates live
//    Step 4 → review preview → save

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const FORMULA_SUBJECTS = new Set([
  'Physics', 'Chemistry', 'Mathematics', 'Further Mathematics', 'Economics', 'Accounting',
])

// ─── Prompt builders ──────────────────────────────────────────────────────────
function buildFlashcardPrompt(subjectName, topicName, objectives, examHint) {
  const isMathSci = /physics|chemistry|mathematics|further math|biology|economics/i.test(subjectName)
  return `You are creating study flashcards for Nigerian secondary school students preparing for ${examHint || 'WAEC and JAMB'}.

Subject: ${subjectName}
Topic: ${topicName}${objectives ? `\nKey objectives / ideas: ${objectives}` : ''}

Generate exactly 10 flashcards covering the most important and frequently tested ideas in this topic.

STYLE RULES
- front_text: one clear question or a key term to define (max 130 characters)
- back_text: the answer in plain, simple English — SS3 level (max 220 characters)
- hint: a gentle nudge that does not give away the answer, or null
- mnemonic: a memory trick, acronym, or rhyme — only if genuinely useful, or null
- difficulty: easy = definition/recall · medium = concept · hard = application

FORMATTING
- No LaTeX. Write maths in plain text: "v² = u² + 2as" not "$v^2$"
- Superscripts OK: m² cm³ s⁻¹ · Symbols OK: Δ θ π μ λ Ω ρ ±
${isMathSci ? '- For calculation-based cards, show the key formula on the back' : ''}

Return ONLY a valid JSON array — no markdown fences, no text outside the array:
[
  {
    "front_text": "Question or term here",
    "back_text": "Answer here",
    "hint": "Nudge here or null",
    "mnemonic": "Memory trick or null",
    "difficulty": "easy"
  }
]`
}

function buildFormulaPrompt(subjectName, topicName, objectives) {
  return `You are creating a formula reference sheet for Nigerian secondary school students (WAEC and JAMB).

Subject: ${subjectName}
Topic: ${topicName}${objectives ? `\nKey objectives / ideas: ${objectives}` : ''}

List every formula a student must know for this topic.

RULES
- label: short human name for the formula
- formula_plain: REQUIRED — clean plain text, no LaTeX, no ^, no <sup>.
  Use superscript characters directly: m² cm³ s⁻¹ m/s²
  Good: "v = u + at"  "PV = nRT"  "E = mc²"
- description: 1–2 plain sentences, secondary school level
- variables: every symbol → meaning + unit. e.g. { "F": "Force in Newtons (N)" }
- example: worked example with numbers — strongly encouraged, null if not applicable
- Use ₦ directly for Naira. Symbols: Δ θ α β π μ λ Ω ρ ∑ √ ∞ ± ≈ ≤ ≥

Return ONLY a valid JSON array — no markdown fences, no text outside the array:
[
  {
    "label": "Newton's Second Law",
    "formula_plain": "F = ma",
    "formula_latex": null,
    "description": "Force equals mass times acceleration. Used when an unbalanced force acts on an object.",
    "variables": {
      "F": "Force in Newtons (N)",
      "m": "mass in kilograms (kg)",
      "a": "acceleration in m/s²"
    },
    "example": "If m = 5 kg and a = 3 m/s², then F = 5 × 3 = 15 N"
  }
]`
}

// ─── Validators ───────────────────────────────────────────────────────────────
function clean(raw) {
  return raw.trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
}

function validateFlashcards(raw) {
  let parsed
  try { parsed = JSON.parse(clean(raw)) } catch (e) { return { ok: false, errors: [`Invalid JSON: ${e.message}`], data: null } }
  if (!Array.isArray(parsed)) return { ok: false, errors: ['Expected a JSON array'], data: null }
  if (!parsed.length)         return { ok: false, errors: ['Array is empty'], data: null }
  const errors = []
  parsed.forEach((c, i) => {
    if (!c.front_text?.trim())  errors.push(`Card ${i+1}: front_text required`)
    if (!c.back_text?.trim())   errors.push(`Card ${i+1}: back_text required`)
    if (!['easy','medium','hard'].includes(c.difficulty)) errors.push(`Card ${i+1}: difficulty must be easy / medium / hard`)
    if ((c.front_text + c.back_text).includes('$')) errors.push(`Card ${i+1}: contains LaTeX — use plain text`)
  })
  return { ok: errors.length === 0, errors, data: parsed }
}

function validateFormulas(raw) {
  let parsed
  try { parsed = JSON.parse(clean(raw)) } catch (e) { return { ok: false, errors: [`Invalid JSON: ${e.message}`], data: null } }
  if (!Array.isArray(parsed)) return { ok: false, errors: ['Expected a JSON array'], data: null }
  if (!parsed.length)         return { ok: false, errors: ['Array is empty'], data: null }
  const errors = []
  parsed.forEach((f, i) => {
    if (!f.label?.trim())         errors.push(`Formula ${i+1}: label required`)
    if (!f.formula_plain?.trim()) errors.push(`Formula ${i+1}: formula_plain required`)
    else {
      if (f.formula_plain.includes('^'))     errors.push(`Formula ${i+1}: use ² ³ ⁻¹ not ^`)
      if (f.formula_plain.includes('<sup>')) errors.push(`Formula ${i+1}: use superscript chars not <sup>`)
      if (f.formula_plain.includes('\\'))    errors.push(`Formula ${i+1}: LaTeX backslash in formula_plain`)
    }
  })
  return { ok: errors.length === 0, errors, data: parsed }
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
const DC = { easy: '#4ade80', medium: '#FFB800', hard: '#f87171' }
const DB = { easy: 'rgba(74,222,128,.12)', medium: 'rgba(255,184,0,.12)', hard: 'rgba(248,113,113,.1)' }

function DiffBadge({ d }) {
  return <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, color: DC[d]??'#94a3b8', background: DB[d]??'rgba(148,163,184,.1)', border: `1px solid ${(DC[d]??'#94a3b8')}30` }}>{d}</span>
}

function Toast({ t }) {
  if (!t) return null
  return <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'11px 20px', borderRadius:12, background:'#0f1728', border:`1px solid ${t.color}40`, color:t.color, fontSize:13, fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>{t.msg}</div>
}

function FlashcardPreview({ card }) {
  return (
    <div style={{ borderRadius:12, background:'#0a0f1e', border:'1px solid #1e293b', padding:'12px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
        <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', lineHeight:1.45, flex:1 }}>{card.front_text}</p>
        <DiffBadge d={card.difficulty} />
      </div>
      <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5, paddingTop:8, borderTop:'1px solid #1e293b' }}>{card.back_text}</p>
      {(card.hint||card.mnemonic) && (
        <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
          {card.hint     && <span style={{ fontSize:11, color:'#60a5fa' }}>💡 {card.hint}</span>}
          {card.mnemonic && <span style={{ fontSize:11, color:'#c4b5fd' }}>🧠 {card.mnemonic}</span>}
        </div>
      )}
    </div>
  )
}

function FormulaPreview({ formula }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius:12, background:'#0a0f1e', border:'1px solid #1e293b', overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#FFB800', flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', flex:1 }}>{formula.label}</span>
        <span style={{ fontFamily:'monospace', fontWeight:800, color:'#FFB800', fontSize:13, flexShrink:0 }}>{formula.formula_plain}</span>
        <span style={{ color:'#475569', fontSize:11, transform:open?'rotate(180deg)':'none', transition:'transform .2s', display:'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'0 14px 14px', borderTop:'1px solid #1e293b' }}>
          <div style={{ margin:'12px 0', padding:'10px', borderRadius:8, background:'#131c2e', textAlign:'center', fontFamily:'monospace', fontSize:18, fontWeight:800, color:'#f1f5f9', letterSpacing:'0.03em' }}>
            {formula.formula_plain}
          </div>
          {formula.description && <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6, marginBottom:10 }}>{formula.description}</p>}
          {formula.variables && Object.keys(formula.variables).length > 0 && (
            <div style={{ marginBottom:10 }}>
              <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'#475569', marginBottom:6 }}>Variables</p>
              {Object.entries(formula.variables).map(([k,v])=>(
                <div key={k} style={{ display:'flex', gap:10, marginBottom:3 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:800, color:'#FFB800', fontSize:12, minWidth:28, flexShrink:0 }}>{k}</span>
                  <span style={{ fontSize:11, color:'#64748b' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {formula.example && (
            <div style={{ padding:'8px 10px', borderRadius:8, background:'rgba(255,184,0,.06)', border:'1px solid rgba(255,184,0,.15)' }}>
              <p style={{ fontSize:9, fontWeight:800, color:'#FFB800', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Example</p>
              <p style={{ fontSize:11, fontFamily:'monospace', color:'#94a3b8', lineHeight:1.5 }}>{formula.example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminFlashcardsPage() {
  const [tab,         setTab]         = useState('flashcards')
  const [subjects,    setSubjects]    = useState([])
  const [subject,     setSubject]     = useState(null)
  const [topicGroups, setTopicGroups] = useState([])
  const [topicGroup,  setTopicGroup]  = useState(null)
  const [existing,    setExisting]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState(null)
  const [objectives,  setObjectives]  = useState('')
  const [examHint,    setExamHint]    = useState('WAEC & JAMB')
  const [promptText,  setPromptText]  = useState('')
  const [showPrompt,  setShowPrompt]  = useState(false)
  const [pasteRaw,    setPasteRaw]    = useState('')
  const [validation,  setValidation]  = useState(null)
  const [copied,      setCopied]      = useState(false)
  const [manualMode,  setManualMode]  = useState(false)
  const [manualItem,  setManualItem]  = useState(null)

  const ST = {
    label:   { fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.09em', color:'#475569', display:'block', marginBottom:5 },
    input:   { width:'100%', padding:'8px 10px', borderRadius:8, background:'#0f172a', border:'1px solid #1e293b', color:'#f1f5f9', fontSize:13, fontFamily:'inherit', boxSizing:'border-box', outline:'none' },
    ta:      { width:'100%', padding:'8px 10px', borderRadius:8, background:'#0f172a', border:'1px solid #1e293b', color:'#f1f5f9', fontSize:12, fontFamily:'monospace', lineHeight:1.5, boxSizing:'border-box', outline:'none', resize:'vertical' },
    card:    { borderRadius:14, background:'#0f172a', border:'1px solid #1e293b', overflow:'hidden' },
    sideBtn: (on) => ({ width:'100%', padding:'8px 12px', textAlign:'left', border:'none', borderLeft:`3px solid ${on?'#1264E5':'transparent'}`, background:on?'rgba(18,100,229,.12)':'transparent', color:on?'#60a5fa':'#94a3b8', fontSize:12, fontWeight:on?700:400, cursor:'pointer', fontFamily:'inherit', transition:'all .1s' }),
    sec:     { fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'#475569', padding:'10px 12px 4px', display:'block' },
  }

  function showToast(msg, color='#4ade80') { setToast({msg,color}); setTimeout(()=>setToast(null),3200) }

  useEffect(() => {
    db.from('subjects').select('id,name').eq('is_active',true).order('name').then(({data}) => {
      // Show each base subject once (strip WAEC/JAMB suffix for display)
      const seen = new Set()
      setSubjects((data??[]).filter(s => {
        const base = s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()
        if (seen.has(base)) return false
        seen.add(base); return true
      }))
    })
  }, [])

  async function pickSubject(sub) {
    setSubject(sub); setTopicGroup(null); setExisting([]); setLoading(true)
    resetPromptState()
    const baseName = sub.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()
    const {data:allSubs} = await db.from('subjects').select('id,name').eq('is_active',true)
    const subIds = (allSubs??[]).filter(s=>s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()===baseName).map(s=>s.id)
    const {data:allTopics} = await db.from('topics').select('id,name,order_index,subject_id')
      .in('subject_id',subIds).order('order_index',{nullsLast:true}).order('name')
    const byName = {}
    for (const t of (allTopics??[])) {
      const key = t.name.trim().toLowerCase()
      if (!byName[key]) byName[key] = {name:t.name, topicIds:[], order:t.order_index??999}
      byName[key].topicIds.push(t.id)
    }
    setTopicGroups(Object.values(byName).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name)))
    setLoading(false)
  }

  async function pickTopicGroup(group) {
    setTopicGroup(group); setLoading(true); setManualMode(false); setManualItem(null)
    resetPromptState()
    const table = tab==='flashcards' ? 'flashcards' : 'key_formulas'
    const {data} = await db.from(table).select('*').in('topic_id',group.topicIds).order(tab==='flashcards'?'created_at':'label')
    const seen = new Set()
    setExisting((data??[]).filter(item => {
      const key = tab==='flashcards' ? item.front_text : item.label
      if (seen.has(key)) return false; seen.add(key); return true
    }))
    setLoading(false)
  }

  function resetPromptState() { setPromptText(''); setShowPrompt(false); setPasteRaw(''); setValidation(null); setCopied(false) }

  useEffect(() => { if (topicGroup) pickTopicGroup(topicGroup) }, [tab])

  function generatePrompt() {
    const text = tab==='flashcards'
      ? buildFlashcardPrompt(subject.name, topicGroup.name, objectives, examHint)
      : buildFormulaPrompt(subject.name, topicGroup.name, objectives)
    setPromptText(text); setShowPrompt(true); setPasteRaw(''); setValidation(null)
  }

  const handlePaste = useCallback((value) => {
    setPasteRaw(value)
    if (!value.trim()) { setValidation(null); return }
    setValidation(tab==='flashcards' ? validateFlashcards(value) : validateFormulas(value))
  }, [tab])

  async function handleSave() {
    if (!validation?.ok || !topicGroup) return
    setSaving(true)
    try {
      const endpoint = tab==='flashcards' ? '/api/admin/flashcards' : '/api/admin/formulas'
      const key      = tab==='flashcards' ? 'cards' : 'formulas'
      const rows = topicGroup.topicIds.flatMap(tid =>
        validation.data.map(item => tab==='flashcards' ? {
          front_text: item.front_text, back_text: item.back_text,
          hint: item.hint??null, mnemonic: item.mnemonic??null,
          difficulty: item.difficulty, topic_id: tid, subject_id: subject.id, is_active: true,
        } : {
          label: item.label, formula_plain: item.formula_plain,
          formula_latex: item.formula_latex??null, description: item.description??null,
          variables: item.variables??{}, example: item.example??null,
          topic_id: tid, subject_id: subject.id, is_active: true,
        })
      )
      const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({[key]:rows}) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      showToast(`Saved ${validation.data.length} ${tab==='flashcards'?'cards':'formulas'} across ${topicGroup.topicIds.length} exam variant(s) ✓`)
      await pickTopicGroup(topicGroup)
      resetPromptState()
    } catch(e) { showToast(`Save failed: ${e.message}`, '#f87171') }
    setSaving(false)
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${tab==='flashcards'?item.front_text:item.label}"?`)) return
    const endpoint = tab==='flashcards' ? '/api/admin/flashcards' : '/api/admin/formulas'
    const res = await fetch(`${endpoint}?id=${item.id}`, {method:'DELETE'})
    if (!res.ok) { showToast('Delete failed','#f87171'); return }
    setExisting(p=>p.filter(x=>x.id!==item.id))
    showToast('Deleted','#FFB800')
  }

  async function saveManual() {
    if (!manualItem || !topicGroup) return
    setSaving(true)
    try {
      const endpoint = tab==='flashcards' ? '/api/admin/flashcards' : '/api/admin/formulas'
      const key      = tab==='flashcards' ? 'cards' : 'formulas'
      const rows = topicGroup.topicIds.map(tid => tab==='flashcards' ? {
        front_text: manualItem.front_text, back_text: manualItem.back_text,
        hint: manualItem.hint||null, mnemonic: manualItem.mnemonic||null,
        difficulty: manualItem.difficulty??'medium', topic_id: tid, subject_id: subject.id, is_active: true,
      } : {
        label: manualItem.label, formula_plain: manualItem.formula_plain,
        formula_latex: manualItem.formula_latex||null, description: manualItem.description||null,
        variables: manualItem.variables??{}, example: manualItem.example||null,
        topic_id: tid, subject_id: subject.id, is_active: true,
      })
      const res = await fetch(endpoint, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:rows})})
      if (!res.ok) { const j=await res.json(); throw new Error(j.error) }
      showToast('Saved ✓')
      await pickTopicGroup(topicGroup)
      setManualMode(false); setManualItem(null)
    } catch(e) { showToast(`Save failed: ${e.message}`,'#f87171') }
    setSaving(false)
  }

  const noTopic = !topicGroup
  const wrongSubjectForFormulas = tab==='formulas' && !FORMULA_SUBJECTS.has(subject?.name??'')

  return (
    <div style={{ fontFamily:'inherit', color:'#f1f5f9', maxWidth:1100, margin:'0 auto' }}>
      <Toast t={toast} />

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.02em', marginBottom:3 }}>Flashcards &amp; Key Formulas</h1>
        <p style={{ fontSize:13, color:'#475569' }}>
          Pick a subject + topic → get a prompt → paste into Claude/Gemini → paste output back → save.
          Topics are deduplicated — saving once covers WAEC, JAMB, and other exam variants automatically.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, padding:3, borderRadius:12, background:'#0f172a', border:'1px solid #1e293b', marginBottom:24, width:'fit-content' }}>
        {[{key:'flashcards',label:'🃏 Flashcards'},{key:'formulas',label:'🧮 Key Formulas'}].map(t=>(
          <button key={t.key} onClick={()=>{setTab(t.key);resetPromptState()}}
            style={{ padding:'8px 18px',borderRadius:9,fontSize:13,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
              background:tab===t.key?'#1264E5':'transparent', color:tab===t.key?'#fff':'#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'196px 1fr', gap:20, alignItems:'start' }}>

        {/* Left sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* Subject list */}
          <div style={ST.card}>
            <span style={ST.sec}>Subject</span>
            {subjects.filter(s=>tab==='formulas'?FORMULA_SUBJECTS.has(s.name):true).map(s=>(
              <button key={s.id} onClick={()=>pickSubject(s)} style={ST.sideBtn(subject?.id===s.id)}>
                {s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()}
              </button>
            ))}
          </div>

          {/* Topic list */}
          {subject && (
            <div style={{ ...ST.card, maxHeight:420, overflowY:'auto' }}>
              <span style={ST.sec}>Topic</span>
              {loading ? <p style={{ padding:'10px 12px',fontSize:11,color:'#475569' }}>Loading…</p>
                : topicGroups.length === 0
                ? <p style={{ padding:'10px 12px',fontSize:11,color:'#475569' }}>No topics found</p>
                : topicGroups.map(g=>(
                <button key={g.name} onClick={()=>pickTopicGroup(g)} style={ST.sideBtn(topicGroup?.name===g.name)}>
                  <span>{g.name}</span>
                  {g.topicIds.length>1 && <span style={{ marginLeft:5,fontSize:8,fontWeight:800,color:'#4ade80',background:'rgba(74,222,128,.12)',borderRadius:4,padding:'1px 4px' }}>×{g.topicIds.length}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Count pill */}
          {topicGroup && !loading && (
            <div style={{ ...ST.card, padding:'12px' }}>
              <span style={{ ...ST.sec, padding:0, marginBottom:6 }}>Saved</span>
              <p style={{ fontSize:13, fontWeight:700, color:existing.length>0?'#4ade80':'#475569' }}>
                {existing.length} {tab==='flashcards'?'flashcard':'formula'}{existing.length!==1?'s':''}
              </p>
            </div>
          )}
        </div>

        {/* Main panel */}
        <div>
          {noTopic ? (
            <div style={{ textAlign:'center',padding:'72px 20px',background:'#0f172a',border:'1px solid #1e293b',borderRadius:16 }}>
              <p style={{ fontSize:40,marginBottom:12 }}>{tab==='flashcards'?'🃏':'🧮'}</p>
              <p style={{ fontSize:15,fontWeight:700,color:'#64748b',marginBottom:6 }}>Select a subject and topic</p>
              <p style={{ fontSize:12,color:'#334155' }}>Topics that exist across WAEC and JAMB are shown once — one save covers both.</p>
            </div>
          ) : wrongSubjectForFormulas ? (
            <div style={{ textAlign:'center',padding:'48px 20px',background:'#0f172a',border:'1px solid #1e293b',borderRadius:16 }}>
              <p style={{ fontSize:28,marginBottom:10 }}>📝</p>
              <p style={{ fontSize:14,fontWeight:700,color:'#64748b' }}>Formulas not applicable for {subject?.name}</p>
              <p style={{ fontSize:12,color:'#475569',marginTop:6 }}>Only for: Physics · Chemistry · Mathematics · Further Mathematics · Economics · Accounting</p>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

              {/* Context + Get prompt */}
              <div style={{ ...ST.card, padding:'18px 20px' }}>
                <p style={{ fontSize:15,fontWeight:800,color:'#f1f5f9',marginBottom:2 }}>{topicGroup.name}</p>
                <p style={{ fontSize:11,color:'#475569',marginBottom:16 }}>
                  {subject.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()} ·{' '}
                  {topicGroup.topicIds.length} exam variant{topicGroup.topicIds.length>1?'s':''} · cards save to all
                </p>

                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
                  <div>
                    <label style={ST.label}>Topic objectives <span style={{ fontWeight:400,color:'#334155' }}>(optional)</span></label>
                    <input value={objectives} onChange={e=>setObjectives(e.target.value)}
                      placeholder={tab==='flashcards'?"e.g. Newton's laws, types of force…":"e.g. equations of motion, energy…"}
                      style={ST.input}/>
                  </div>
                  {tab==='flashcards' && (
                    <div>
                      <label style={ST.label}>Exam target</label>
                      <select value={examHint} onChange={e=>setExamHint(e.target.value)} style={{...ST.input,cursor:'pointer'}}>
                        <option>WAEC &amp; JAMB</option><option>WAEC only</option><option>JAMB only</option><option>IGCSE</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                  <button onClick={generatePrompt}
                    style={{ padding:'10px 20px',borderRadius:10,background:'#1264E5',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit' }}>
                    Get prompt →
                  </button>
                  <button onClick={()=>{setManualMode(m=>!m);setManualItem(tab==='flashcards'?{front_text:'',back_text:'',hint:'',mnemonic:'',difficulty:'medium'}:{label:'',formula_plain:'',formula_latex:'',description:'',variables:{},example:''})}}
                    style={{ padding:'10px 16px',borderRadius:10,background:'transparent',border:'1px solid #334155',color:'#64748b',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
                    + Add manually
                  </button>
                </div>
              </div>

              {/* Manual add */}
              {manualMode && manualItem && (
                <div style={{ ...ST.card, padding:'18px 20px', border:'2px solid #1264E5' }}>
                  <p style={{ fontSize:13,fontWeight:800,color:'#60a5fa',marginBottom:14 }}>+ New {tab==='flashcards'?'flashcard':'formula'}</p>
                  {tab==='flashcards' ? (
                    <>
                      {[{k:'front_text',l:'Front — question or term',r:2},{k:'back_text',l:'Answer',r:3},{k:'hint',l:'Hint (optional)',r:1},{k:'mnemonic',l:'Memory tip (optional)',r:1}].map(f=>(
                        <div key={f.k} style={{ marginBottom:10 }}>
                          <label style={ST.label}>{f.l}</label>
                          <textarea rows={f.r} value={manualItem[f.k]??''} onChange={e=>setManualItem(m=>({...m,[f.k]:e.target.value}))} style={ST.ta}/>
                        </div>
                      ))}
                      <div style={{ marginBottom:14 }}>
                        <label style={ST.label}>Difficulty</label>
                        <div style={{ display:'flex',gap:6 }}>
                          {['easy','medium','hard'].map(d=>(
                            <button key={d} onClick={()=>setManualItem(m=>({...m,difficulty:d}))}
                              style={{ padding:'5px 14px',borderRadius:8,fontSize:11,fontWeight:700,border:'1px solid',cursor:'pointer',fontFamily:'inherit',
                                background:manualItem.difficulty===d?'#1264E5':'transparent',
                                borderColor:manualItem.difficulty===d?'#1264E5':'#334155',
                                color:manualItem.difficulty===d?'#fff':'#64748b' }}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {[{k:'label',l:'Formula name',r:1,mono:false},{k:'formula_plain',l:'Formula — plain text (e.g. F = ma)',r:1,mono:true},{k:'description',l:'What it means',r:2,mono:false},{k:'example',l:'Worked example (optional)',r:2,mono:true}].map(f=>(
                        <div key={f.k} style={{ marginBottom:10 }}>
                          <label style={ST.label}>{f.l}</label>
                          <textarea rows={f.r} value={manualItem[f.k]??''} onChange={e=>setManualItem(m=>({...m,[f.k]:e.target.value}))} style={{...ST.ta,fontFamily:f.mono?'monospace':'inherit'}}/>
                        </div>
                      ))}
                    </>
                  )}
                  <div style={{ display:'flex',gap:8 }}>
                    <button onClick={saveManual} disabled={saving} style={{ flex:1,padding:'10px',borderRadius:10,background:'#1264E5',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:saving?0.6:1 }}>
                      {saving?'Saving…':'Save'}
                    </button>
                    <button onClick={()=>{setManualMode(false);setManualItem(null)}} style={{ padding:'10px 16px',borderRadius:10,background:'transparent',border:'1px solid #334155',color:'#64748b',fontSize:13,cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Prompt box */}
              {showPrompt && promptText && (
                <div style={{ ...ST.card, padding:'18px 20px', background:'#0a0f1e' }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                    <div>
                      <p style={{ fontSize:14,fontWeight:800,color:'#f1f5f9',marginBottom:2 }}>Copy this prompt</p>
                      <p style={{ fontSize:11,color:'#475569' }}>Paste into Claude or Gemini and run it</p>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(promptText);setCopied(true);setTimeout(()=>setCopied(false),2500)}}
                      style={{ padding:'8px 16px',borderRadius:9,background:copied?'rgba(74,222,128,.15)':'rgba(18,100,229,.15)',border:`1px solid ${copied?'rgba(74,222,128,.3)':'rgba(18,100,229,.3)'}`,color:copied?'#4ade80':'#60a5fa',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0 }}>
                      {copied?'✓ Copied!':'📋 Copy prompt'}
                    </button>
                  </div>
                  <pre style={{ fontSize:11,color:'#64748b',background:'#050b15',border:'1px solid #1e293b',borderRadius:9,padding:'12px 14px',overflowX:'auto',whiteSpace:'pre-wrap',lineHeight:1.6,maxHeight:240,overflowY:'auto',margin:0 }}>
                    {promptText}
                  </pre>
                </div>
              )}

              {/* Paste area */}
              {showPrompt && (
                <div style={{ ...ST.card, padding:'18px 20px' }}>
                  <p style={{ fontSize:14,fontWeight:800,color:'#f1f5f9',marginBottom:2 }}>Paste the AI output</p>
                  <p style={{ fontSize:11,color:'#475569',marginBottom:12 }}>Paste the JSON from Claude/Gemini — validates instantly as you type.</p>
                  <textarea value={pasteRaw} onChange={e=>handlePaste(e.target.value)} rows={10}
                    placeholder={'[\n  {\n    "front_text": "...",\n    ...\n  }\n]'}
                    style={{...ST.ta,fontSize:11,marginBottom:10}}/>
                  {validation && (
                    <div style={{ padding:'12px 14px',borderRadius:10,background:validation.ok?'rgba(74,222,128,.07)':'rgba(248,113,113,.07)',border:`1px solid ${validation.ok?'rgba(74,222,128,.25)':'rgba(248,113,113,.25)'}` }}>
                      {validation.ok ? (
                        <p style={{ fontSize:13,fontWeight:800,color:'#4ade80' }}>
                          ✓ {validation.data.length} {tab==='flashcards'?'card':'formula'}{validation.data.length!==1?'s':''} ready — review below and save
                        </p>
                      ) : (
                        <div>
                          <p style={{ fontSize:13,fontWeight:800,color:'#f87171',marginBottom:8 }}>{validation.errors.length} problem{validation.errors.length!==1?'s':''} — fix in source and re-paste</p>
                          <ul style={{ listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:3 }}>
                            {validation.errors.map((e,i)=><li key={i} style={{ fontSize:11,color:'#f87171cc' }}>▸ {e}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Preview + Save */}
              {validation?.ok && validation.data?.length>0 && (
                <div style={{ ...ST.card, padding:'18px 20px' }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
                    <div>
                      <p style={{ fontSize:14,fontWeight:800,color:'#f1f5f9',marginBottom:2 }}>Preview &amp; save</p>
                      <p style={{ fontSize:11,color:'#475569' }}>Review everything looks right, then save.</p>
                    </div>
                    <button onClick={handleSave} disabled={saving}
                      style={{ padding:'10px 22px',borderRadius:10,background:saving?'#1e293b':'#16a34a',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit',opacity:saving?0.6:1 }}>
                      {saving?'Saving…':`Save ${validation.data.length} ${tab==='flashcards'?'card':'formula'}${validation.data.length!==1?'s':''}`}
                    </button>
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                    {tab==='flashcards'
                      ? validation.data.map((c,i)=><FlashcardPreview key={i} card={c}/>)
                      : validation.data.map((f,i)=><FormulaPreview key={i} formula={f}/>)
                    }
                  </div>
                </div>
              )}

              {/* Existing content */}
              {existing.length>0 && (
                <ExistingPanel tab={tab} items={existing} onDelete={deleteItem}/>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ExistingPanel({ tab, items, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius:14,background:'#0f172a',border:'1px solid #1e293b',overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <span style={{ fontSize:13,fontWeight:700,color:'#64748b' }}>Saved {tab==='flashcards'?'flashcards':'formulas'}</span>
          <span style={{ fontSize:11,fontWeight:800,padding:'2px 8px',borderRadius:99,background:'rgba(18,100,229,.12)',color:'#60a5fa' }}>{items.length}</span>
        </div>
        <span style={{ fontSize:12,color:'#475569',transform:open?'rotate(180deg)':'none',transition:'transform .2s',display:'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'0 18px 16px',borderTop:'1px solid #1e293b' }}>
          <div style={{ display:'flex',flexDirection:'column',gap:6,marginTop:12 }}>
            {tab==='flashcards' ? items.map(c=>(
              <div key={c.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'#0a0f1e',border:'1px solid #1e293b' }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:12,fontWeight:700,color:'#f1f5f9',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.front_text}</p>
                  <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                    <DiffBadge d={c.difficulty}/>
                    <span style={{ fontSize:11,color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.back_text}</span>
                  </div>
                </div>
                <button onClick={()=>onDelete(c)} style={{ width:26,height:26,borderRadius:7,background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',color:'#f87171',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>✕</button>
              </div>
            )) : items.map(f=>(
              <div key={f.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'#0a0f1e',border:'1px solid #1e293b' }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:12,fontWeight:700,color:'#f1f5f9',marginBottom:2 }}>{f.label}</p>
                  <span style={{ fontSize:11,fontFamily:'monospace',color:'#FFB800' }}>{f.formula_plain}</span>
                </div>
                <button onClick={()=>onDelete(f)} style={{ width:26,height:26,borderRadius:7,background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',color:'#f87171',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}