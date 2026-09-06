'use client'
// src/app/admin/flashcards/page.js — v2
//
// KEY CHANGES FROM v1:
// 1. Auto-fetches topic objectives from DB when a topic is selected
// 2. Exam targeting removed — flashcards are exam-agnostic
// 3. Redesigned to match reference image: 4-step progress header, 2-panel layout
// 4. Objectives auto-populated into the prompt
// 5. SVG illustrations on empty states
//
// FLOW (same logic as import page):
//   Step 1 → Select subject + topic (objectives auto-loaded from DB)
//   Step 2 → Review objectives + get prompt
//   Step 3 → Paste AI output → live validation preview
//   Step 4 → Save to library (writes to all exam variants)

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GREEN  = '#22c55e'
const GOLD   = '#FFB800'
const RED    = '#f87171'
const ORANGE = '#FF6A00'
const PURPLE = '#7C3AED'

const FORMULA_SUBJECTS = new Set([
  'Physics', 'Chemistry', 'Mathematics', 'Further Mathematics', 'Economics', 'Accounting',
])

// ─── Prompt builders ──────────────────────────────────────────────────────────
function buildFlashcardPrompt(subjectName, topicName, objectives, extraContext) {
  const isMathSci = /physics|chemistry|mathematics|further math|biology|economics/i.test(subjectName)
  const objBlock = objectives?.trim()
    ? `\nLearning objectives for this topic (use these to determine scope and card count):\n${objectives}`
    : ''
  const extra = extraContext?.trim() ? `\nAdditional context: ${extraContext}` : ''

  // Count subtopic blocks to guide the AI on how many cards to generate
  const subtopicCount = objectives ? (objectives.match(/^\S[^\n]+:\s*$/gm) ?? []).length : 0
  const cardGuidance = subtopicCount >= 6
    ? `Generate ${Math.max(subtopicCount * 2, 16)}–${Math.max(subtopicCount * 3, 28)} cards. Every subtopic block and every numbered objective above needs at least one card.`
    : subtopicCount >= 3
    ? `Generate 12–20 cards. Every subtopic and every objective listed above must produce at least one card.`
    : `Generate 8–14 cards covering every distinct concept in this topic.`

  return `You are creating study flashcards for Nigerian secondary school students (WAEC/JAMB exams).

Subject: ${subjectName}
Topic: ${topicName}${objBlock}${extra}

HOW MANY CARDS TO GENERATE
${cardGuidance}
Think like an educator: count the objectives above, then generate enough cards so every distinct testable idea is covered. A topic with 8 subtopics and 24 objectives needs more cards than a topic with 3 subtopics. Do not default to an arbitrary fixed number.

CARD QUALITY RULES
- front_text: one clear question or key term (max 130 chars). Vary types: definitions, "state X", "explain why", "identify", "compare", calculation prompts.
- back_text: precise, examinable answer in plain SS3-level English (max 220 chars).
- hint: gentle nudge that does NOT give away the answer. null if the question is already self-guiding.
- mnemonic: only if genuinely useful and accurate. null otherwise.
- difficulty: easy = pure recall/definition · medium = explain a concept · hard = application or calculation

FORMATTING
- No LaTeX. Plain text maths only: "v² = u² + 2as" not "$v^2$"
- Superscripts: m² cm³ s⁻¹ · Greek: Δ θ π μ λ Ω ρ ±
${isMathSci ? '- For calculation cards, show the key formula on the back' : ''}

ILLUSTRATIONS — ACCURACY FIRST
illustration_prompt is for cards where the diagram IS what is being tested (e.g. "Label this diagram", "Identify this structure", "What does this circuit look like?").

Before writing any illustration_prompt, do both checks:
  1. ACCURACY CHECK: Are you certain of the exact correct diagram for this item — correct electron shell counts, correct apparatus labelling, correct biological structure, correct geometry? If any doubt exists, set null. A wrong diagram actively harms students.
  2. NECESSITY CHECK: Can a student answer this card from text alone? If yes, set null.

If both checks pass, write a FULLY SPECIFIED SVG brief with exact coordinates:
  • viewBox "0 0 400 300", white background rect filling full viewBox
  • Main outlines: stroke #1f2937 stroke-width 2
  • Key/highlighted element: fill or stroke #4f46e5
  • Labels: font-size 14px minimum, font-family "system-ui, sans-serif", fill #1f2937
  • Dashed lines: stroke-dasharray "6 3" stroke #6b7280
  • Every element needs exact coordinates (cx cy r, or x y width height) — no vague instructions
  • End the brief with: "Generate SVG code."
  • The final output must start with <svg — not a standalone viewBox attribute

Set illustration_prompt to null for: definitions, recall, equations, calculations, anything text can fully explain.

Return ONLY a valid JSON array — no markdown fences, no text outside the array:
[
  {
    "front_text": "Question or term here",
    "back_text": "Answer here",
    "hint": "Nudge here or null",
    "mnemonic": "Memory trick or null",
    "difficulty": "easy",
    "illustration_prompt": null
  }
]`
}

function buildFormulaPrompt(subjectName, topicName, objectives, extraContext) {
  const objBlock = objectives?.trim() ? `\nLearning objectives:\n${objectives}` : ''
  const extra = extraContext?.trim() ? `\nAdditional context: ${extraContext}` : ''
  return `You are creating a formula reference sheet for Nigerian secondary school students (WAEC, JAMB, and similar exams).

Subject: ${subjectName}
Topic: ${topicName}${objBlock}${extra}

List every formula a student must know for this topic.

RULES
- label: short human name for the formula
- formula_plain: REQUIRED — clean plain text, no LaTeX, no ^, no <sup>.
  Use superscript characters directly: m² cm³ s⁻¹ m/s²
  Good: "v = u + at"  "PV = nRT"  "E = mc²"
- description: 1–2 plain sentences, secondary school level
- variables: every symbol → meaning + unit. e.g. { "F": "Force in Newtons (N)" }
- example: worked example with numbers — strongly encouraged, null if not applicable

Return ONLY a valid JSON array — no markdown fences, no text outside the array:
[
  {
    "label": "Newton's Second Law",
    "formula_plain": "F = ma",
    "formula_latex": null,
    "description": "Force equals mass times acceleration.",
    "variables": {
      "F": "Force in Newtons (N)",
      "m": "mass in kilograms (kg)",
      "a": "acceleration in m/s²"
    },
    "example": "If m = 5 kg and a = 3 m/s², then F = 15 N"
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
    if (!['easy','medium','hard'].includes(c.difficulty)) errors.push(`Card ${i+1}: difficulty must be easy/medium/hard`)
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

// ─── Difficulty badge ─────────────────────────────────────────────────────────
const DC = { easy: '#4ade80', medium: '#FFB800', hard: '#f87171' }
const DB = { easy: 'rgba(74,222,128,.12)', medium: 'rgba(255,184,0,.12)', hard: 'rgba(248,113,113,.1)' }
function DiffBadge({ d }) {
  return <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:99, color:DC[d]??'#94a3b8', background:DB[d]??'rgba(148,163,184,.1)', border:`1px solid ${(DC[d]??'#94a3b8')}30`, textTransform:'capitalize' }}>{d}</span>
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ t }) {
  if (!t) return null
  return <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'11px 20px', borderRadius:12, background:'#1e293b', border:`1px solid ${t.color}40`, color:t.color, fontSize:13, fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,.5)', animation:'fadeIn .2s ease' }}>{t.msg}</div>
}

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = [
    { n:1, label:'Select', sub:'Subject & Topic' },
    { n:2, label:'Describe', sub:'What to generate' },
    { n:3, label:'Review', sub:'AI Preview' },
    { n:4, label:'Save', sub:'Add to Library' },
  ]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:32, padding:'20px 24px', background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)' }}>
      {steps.map((s, i) => {
        const done    = step > s.n
        const current = step === s.n
        return (
          <div key={s.n} style={{ display:'flex', alignItems:'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:14,
                background: done ? GREEN : current ? BLUE : 'var(--bg-inset)',
                color: done || current ? '#fff' : 'var(--text-tert)',
                border: current ? `2px solid ${BLUE}` : 'none',
                boxShadow: current ? `0 0 0 4px ${BLUE}20` : 'none',
              }}>
                {done ? '✓' : s.n}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:current?800:600, color:current?'#fff':done?'var(--text-tert)':'var(--text-tert)' }}>{s.label}</div>
                <div style={{ fontSize:10, color:'var(--text-tert)' }}>{s.sub}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex:1, height:1, background: done ? `${GREEN}40` : 'var(--border)', margin:'0 16px' }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── SVG empty state ──────────────────────────────────────────────────────────
function EmptySVG({ type }) {
  if (type === 'select') return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="35" height="25" rx="4" fill="#e5e7eb"/>
      <rect x="22" y="22" width="31" height="6" rx="2" fill="#d1d5db"/>
      <rect x="22" y="30" width="20" height="2" rx="1" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1"/>
      <rect x="22" y="34" width="25" height="2" rx="1" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1"/>
      <rect x="65" y="30" width="35" height="25" rx="4" fill="#e5e7eb"/>
      <rect x="67" y="32" width="31" height="6" rx="2" fill="#d1d5db"/>
      <rect x="67" y="40" width="20" height="2" rx="1" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1"/>
      <rect x="67" y="44" width="25" height="2" rx="1" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1"/>
      <circle cx="60" cy="65" r="14" fill="#1264E5" opacity=".15"/>
      <path d="M55 65l4 4 6-8" stroke="#1264E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/>
    </svg>
  )
  if (type === 'flashcard') return (
    <svg width="100" height="80" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="8" width="80" height="52" rx="8" fill="#e5e7eb"/>
      <rect x="10" y="8" width="80" height="52" rx="8" stroke="#d1d5db" strokeWidth="1"/>
      <rect x="22" y="20" width="56" height="8" rx="3" fill="#d1d5db"/>
      <rect x="22" y="32" width="40" height="5" rx="2" fill="#e5e7eb" stroke="#d1d5db"/>
      <rect x="22" y="40" width="48" height="5" rx="2" fill="#e5e7eb" stroke="#d1d5db"/>
      <circle cx="50" cy="68" r="4" fill="#1264E5" opacity=".4"/>
      <circle cx="62" cy="68" r="4" fill="#e5e7eb" stroke="#d1d5db"/>
      <circle cx="38" cy="68" r="4" fill="#e5e7eb" stroke="#d1d5db"/>
    </svg>
  )
  return null
}

// ─── Illustration Panel (same workflow as import page) ───────────────────────
function IllustrationPanel({ prompt, svgCode, onChange }) {
  const [copied, setCopied] = useState(false)
  const [tab,    setTab]    = useState('prompt')
  const hasValidSvg = svgCode && svgCode.trim().toLowerCase().startsWith('<svg')
  return (
    <div style={{ borderRadius:11, border:`2px solid ${PURPLE}30`, background:`${PURPLE}05`, overflow:'hidden', marginTop:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:`${PURPLE}10`, borderBottom:`1px solid ${PURPLE}20` }}>
        <span style={{ fontSize:14 }}>🎨</span>
        <span style={{ fontSize:10, fontWeight:900, color:PURPLE, textTransform:'uppercase', letterSpacing:'.08em', flex:1 }}>Illustration needed</span>
        {hasValidSvg && <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:99, background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)', color:'#16a34a' }}>✓ SVG ready</span>}
      </div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:4, padding:'8px 12px 0' }}>
        {[{id:'prompt',label:'1. Prompt'},{id:'paste',label:'2. Paste SVG'},{id:'preview',label:'3. Preview',disabled:!hasValidSvg}].map(t=>(
          <button key={t.id} onClick={()=>!t.disabled&&setTab(t.id)} disabled={t.disabled}
            style={{ padding:'5px 12px', fontSize:11, fontWeight:700, borderRadius:'8px 8px 0 0', border:'none', cursor:t.disabled?'not-allowed':'pointer', fontFamily:'inherit', transition:'all .1s',
              background:tab===t.id?'#fff':'transparent',
              color:tab===t.id?PURPLE:t.disabled?'var(--text-tert)':'var(--text-sec)',
              borderBottom:tab===t.id?`2px solid ${PURPLE}`:'2px solid transparent',
              opacity:t.disabled?0.4:1 }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding:12, background:'#fff', borderTop:`1px solid ${PURPLE}15` }}>
        {tab==='prompt' && (
          <>
            <p style={{ fontSize:11, color:PURPLE, lineHeight:1.5, marginBottom:10 }}>
              Copy this prompt → paste into Claude or an SVG tool → generate the SVG → come back to paste it.
            </p>
            <div style={{ borderRadius:8, border:`1px solid ${PURPLE}20`, overflow:'hidden', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', background:`${PURPLE}08`, borderBottom:`1px solid ${PURPLE}15` }}>
                <span style={{ fontSize:9, fontWeight:900, color:PURPLE, textTransform:'uppercase', letterSpacing:'.08em' }}>Illustration Prompt</span>
                <button onClick={()=>{navigator.clipboard.writeText(prompt);setCopied(true);setTimeout(()=>setCopied(false),2000)}}
                  style={{ padding:'3px 10px', borderRadius:6, fontSize:10, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit',
                    background:copied?'rgba(34,197,94,.15)':PURPLE, color:copied?'#16a34a':'#fff' }}>
                  {copied?'✓ Copied!':'📋 Copy'}
                </button>
              </div>
              <p style={{ fontSize:11, fontFamily:'monospace', color:'var(--text-sec)', padding:'8px 10px', lineHeight:1.55, margin:0 }}>{prompt}</p>
            </div>
            <button onClick={()=>setTab('paste')}
              style={{ width:'100%', padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700, background:PURPLE, color:'#fff' }}>
              I have the SVG → paste it now
            </button>
          </>
        )}
        {tab==='paste' && (
          <>
            <p style={{ fontSize:11, color:'var(--text-sec)', marginBottom:8 }}>Paste raw SVG code — must start with &lt;svg</p>
            <textarea value={svgCode||''} onChange={e=>onChange(e.target.value)} rows={6}
              placeholder={'<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">\n  ...\n</svg>'}
              style={{ width:'100%', padding:'8px', borderRadius:8, border:`1px solid ${PURPLE}30`, fontSize:11, fontFamily:'monospace', color:'var(--text-prim)', background:'#fff', resize:'vertical', boxSizing:'border-box', outline:'none' }}
              spellCheck={false}/>
            {svgCode && !hasValidSvg && <p style={{ fontSize:10, color:'#dc2626', fontWeight:700, marginTop:4 }}>⚠ Must start with &lt;svg</p>}
            {hasValidSvg && (
              <button onClick={()=>setTab('preview')}
                style={{ width:'100%', marginTop:8, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700, background:'#16a34a', color:'#fff' }}>
                → Preview SVG
              </button>
            )}
          </>
        )}
        {tab==='preview' && hasValidSvg && (
          <>
            <div style={{ borderRadius:8, border:`1px solid ${PURPLE}20`, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:`${PURPLE}08`, borderBottom:`1px solid ${PURPLE}15` }}>
                <span style={{ fontSize:9, fontWeight:900, color:PURPLE, textTransform:'uppercase', letterSpacing:'.08em' }}>Preview</span>
                <button onClick={()=>setTab('paste')} style={{ fontSize:10, fontWeight:700, color:PURPLE, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>✏ Edit</button>
              </div>
              <div style={{ display:'flex', justifyContent:'center', padding:12, background:'#fff', overflowX:'auto' }}
                dangerouslySetInnerHTML={{ __html: svgCode.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+="[^"]*"/gi,'') }}/>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Flashcard preview ────────────────────────────────────────────────────────
function FlashcardPreview({ card, onRemove, svgCode, onSvgChange }) {
  const [flipped, setFlipped] = useState(false)
  const illustrationPrompt = card.illustration_prompt ?? ''
  const needsIllustration  = !!illustrationPrompt
  return (
    <div style={{ borderRadius:12, background:'var(--bg-subtle)', border:'1px solid var(--border)', overflow:'hidden' }}>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', lineHeight:1.45, flex:1, margin:0 }}>{card.front_text}</p>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <DiffBadge d={card.difficulty}/>
            {onRemove && (
              <button onClick={onRemove} style={{ width:22, height:22, borderRadius:6, background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.2)', color:'#f87171', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            )}
          </div>
        </div>
        <button onClick={()=>setFlipped(f=>!f)} style={{ width:'100%', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>
          <div style={{ padding:'10px 12px', borderRadius:9, background:'var(--bg-inset)', border:'1px solid var(--border)' }}>
            {flipped ? (
              <p style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.55, margin:0 }}>{card.back_text}</p>
            ) : (
              <p style={{ fontSize:11, color:'var(--text-sec)', margin:0 }}>Tap to see answer ▾</p>
            )}
          </div>
        </button>
        {(card.hint || card.mnemonic) && (
          <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
            {card.hint     && <span style={{ fontSize:11, color:'#60a5fa' }}>💡 {card.hint}</span>}
            {card.mnemonic && <span style={{ fontSize:11, color:'#c4b5fd' }}>🧠 {card.mnemonic}</span>}
          </div>
        )}
        {needsIllustration && onSvgChange && (
          <IllustrationPanel
            prompt={illustrationPrompt}
            svgCode={svgCode ?? ''}
            onChange={onSvgChange}
          />
        )}
        {card.svg_code && !needsIllustration && (
          <div style={{ marginTop:10, borderRadius:9, overflow:'hidden', border:'1px solid var(--border)', background:'#fff' }}>
            <div style={{ display:'flex', justifyContent:'center', padding:10, overflowX:'auto' }}
              dangerouslySetInnerHTML={{ __html: card.svg_code.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+="[^"]*"/gi,'') }}/>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Formula preview ──────────────────────────────────────────────────────────
function FormulaPreview({ formula, onRemove }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius:12, background:'var(--bg-subtle)', border:'1px solid var(--border)', overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:GOLD, flexShrink:0 }}/>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', flex:1 }}>{formula.label}</span>
        <span style={{ fontFamily:'monospace', fontWeight:800, color:GOLD, fontSize:13, flexShrink:0 }}>{formula.formula_plain}</span>
        {onRemove && (
          <button onClick={e=>{e.stopPropagation();onRemove()}} style={{ width:22, height:22, borderRadius:6, background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.2)', color:'#f87171', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
        )}
        <span style={{ color:'var(--text-sec)', fontSize:11, transform:open?'rotate(180deg)':'none', transition:'transform .2s', display:'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'0 14px 14px', borderTop:'1px solid var(--border)' }}>
          <div style={{ margin:'12px 0', padding:'10px', borderRadius:8, background:'var(--bg-inset)', textAlign:'center', fontFamily:'monospace', fontSize:18, fontWeight:800, color:'var(--text-prim)', letterSpacing:'0.03em' }}>{formula.formula_plain}</div>
          {formula.description && <p style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6, marginBottom:10 }}>{formula.description}</p>}
          {formula.variables && Object.keys(formula.variables).length > 0 && (
            <div style={{ marginBottom:10 }}>
              <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-sec)', marginBottom:6 }}>Variables</p>
              {Object.entries(formula.variables).map(([k,v])=>(
                <div key={k} style={{ display:'flex', gap:10, marginBottom:3 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:800, color:GOLD, fontSize:12, minWidth:28, flexShrink:0 }}>{k}</span>
                  <span style={{ fontSize:11, color:'var(--text-tert)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {formula.example && (
            <div style={{ padding:'8px 10px', borderRadius:8, background:'rgba(255,184,0,.06)', border:'1px solid rgba(255,184,0,.15)' }}>
              <p style={{ fontSize:9, fontWeight:800, color:GOLD, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Example</p>
              <p style={{ fontSize:11, fontFamily:'monospace', color:'var(--text-tert)', lineHeight:1.5 }}>{formula.example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminFlashcardsPage() {
  const [tab,           setTab]           = useState('flashcards')
  const [subjects,      setSubjects]      = useState([])
  const [subject,       setSubject]       = useState(null)
  const [topicGroups,   setTopicGroups]   = useState([])
  const [topicGroup,    setTopicGroup]    = useState(null)
  const [topicSearch,   setTopicSearch]   = useState('')
  const [objectives,    setObjectives]    = useState('')    // auto-fetched from DB
  const [extraContext,  setExtraContext]  = useState('')    // admin can add more
  const [existing,      setExisting]      = useState([])
  const [loadingSubj,   setLoadingSubj]   = useState(false)
  const [loadingObj,    setLoadingObj]    = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [toast,         setToast]         = useState(null)
  const [promptText,    setPromptText]    = useState('')
  const [showPrompt,    setShowPrompt]    = useState(false)
  const [pasteRaw,      setPasteRaw]      = useState('')
  const [validation,    setValidation]    = useState(null)
  const [previewItems,  setPreviewItems]  = useState([])   // editable preview
  const [svgMap,        setSvgMap]        = useState({})    // idx → svg code for cards with illustration_prompt
  const [copied,        setCopied]        = useState(false)

  // Derived step for progress bar
  const step = !topicGroup ? 1 : !showPrompt ? 2 : validation?.ok ? (saving ? 4 : 3) : 3

  function showToast(msg, color='#4ade80') { setToast({msg,color}); setTimeout(()=>setToast(null),3200) }

  // Load subjects once
  useEffect(() => {
    db.from('subjects').select('id,name').eq('is_active',true).order('name').then(({data}) => {
      const seen = new Set()
      setSubjects((data??[]).filter(s => {
        const base = s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()
        if (seen.has(base)) return false
        seen.add(base); return true
      }))
    })
  }, [])

  async function pickSubject(sub) {
    setSubject(sub); setTopicGroup(null); setExisting([]); setObjectives(''); setExtraContext('')
    resetPromptState(); setLoadingSubj(true)
    const baseName = sub.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()
    const {data:allSubs} = await db.from('subjects').select('id,name').eq('is_active',true)
    const subIds = (allSubs??[]).filter(s=>s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()===baseName).map(s=>s.id)
    // objectives lives on subtopics, not topics — fetched when a topic is selected
    const {data:allTopics} = await db.from('topics')
      .select('id,name,order_index,subject_id')
      .in('subject_id',subIds).order('order_index',{nullsLast:true}).order('name')
    const byName = {}
    for (const t of (allTopics??[])) {
      const key = t.name.trim().toLowerCase()
      if (!byName[key]) byName[key] = { name:t.name, topicIds:[], topicExams:[], order:t.order_index??999 }
      byName[key].topicIds.push(t.id)
      byName[key].topicExams.push(t.subject_id ? (allSubs.find(s=>s.id===t.subject_id)?.name?.includes('WAEC') ? 'WAEC' : 'JAMB') : 'WAEC')
    }
    const groups = Object.values(byName).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name))

    // Check which topics have subtopics with objectives — for the OBJ badge.
    // Uses the server-side route (service role key) because anon key is blocked by RLS on subtopics.
    const allTopicIds = groups.flatMap(g => g.topicIds)
    if (allTopicIds.length) {
      try {
        const res = await fetch(`/api/admin/flashcards/subtopics?topicIds=${allTopicIds.join(',')}`)
        const objSubs = res.ok ? await res.json() : []
        const topicsWithObj = new Set(
          (Array.isArray(objSubs) ? objSubs : [])
            .filter(s => {
              const arr = Array.isArray(s.objectives) ? s.objectives : []
              return arr.some(o => typeof o === 'string' && o.trim())
            })
            .map(s => s.topic_id)
        )
        for (const g of groups) {
          g.hasObjectives = g.topicIds.some(id => topicsWithObj.has(id))
        }
      } catch { /* badge just won't show — non-critical */ }
    }

    setTopicGroups(groups)
    setLoadingSubj(false)
  }

  async function pickTopicGroup(group) {
    setTopicGroup(group); resetPromptState()
    setObjectives('') // will be populated after subtopics fetch
    setLoadingObj(true)

    // Fetch subtopics via server-side route using subject+topic name.
    // The API resolves the WAEC subject row server-side — objectives are stored
    // under WAEC curriculum, so WAEC is always the source. Flashcards are exam-agnostic.
    // Anon key (used by this client page) is blocked by RLS on subtopics; the API
    // uses the service role key which bypasses RLS.
    let subs = []
    try {
      const params = new URLSearchParams({
        subjectName: subject.name,
        topicName:   group.name,
      })
      const res = await fetch(`/api/admin/flashcards/subtopics?${params}`)
      subs = res.ok ? (await res.json()) : []
      if (!Array.isArray(subs)) subs = []
    } catch { subs = [] }

    if (subs.length) {
      const seenSub = new Set()
      const blocks = []
      for (const s of subs) {
        if (seenSub.has(s.name)) continue
        seenSub.add(s.name)

        // objectives can be: text[] array, jsonb array, a plain string, or null/[]
        let arr = []
        if (Array.isArray(s.objectives)) {
          arr = s.objectives
        } else if (typeof s.objectives === 'string' && s.objectives.trim()) {
          // Stored as plain text — split on newlines or semicolons
          arr = s.objectives.split(/[\n;]+/).map(o => o.trim()).filter(Boolean)
        }
        // Reject empty arrays and junk
        const filtered = arr.filter(o => typeof o === 'string' && o.trim().length > 3)
        if (filtered.length) {
          const numbered = filtered.map((o, i) =>
            `  (${String.fromCharCode(105 + i)}) ${o.trim()}`
          )
          blocks.push(`${s.name}:\n${numbered.join('\n')}`)
        }
      }
      if (blocks.length) {
        setObjectives(blocks.join('\n'))
      }
    }

    setLoadingObj(false)

    // Load existing flashcards/formulas for this topic
    const table = tab==='flashcards' ? 'flashcards' : 'key_formulas'
    const {data} = await db.from(table).select('*').in('topic_id',group.topicIds)
      .order(tab==='flashcards'?'created_at':'label')
    const seenItems = new Set()
    setExisting((data??[]).filter(item => {
      const key = tab==='flashcards' ? item.front_text : item.label
      if (seenItems.has(key)) return false; seenItems.add(key); return true
    }))
  }

  function resetPromptState() {
    setPromptText(''); setShowPrompt(false); setPasteRaw('')
    setValidation(null); setCopied(false); setPreviewItems([]); setSvgMap({})
  }

  useEffect(() => { if (topicGroup) pickTopicGroup(topicGroup) }, [tab])

  function generatePrompt() {
    const text = tab==='flashcards'
      ? buildFlashcardPrompt(subject.name, topicGroup.name, objectives, extraContext)
      : buildFormulaPrompt(subject.name, topicGroup.name, objectives, extraContext)
    setPromptText(text); setShowPrompt(true); setPasteRaw(''); setValidation(null); setPreviewItems([])
  }

  const handlePaste = useCallback((value) => {
    setPasteRaw(value)
    if (!value.trim()) { setValidation(null); setPreviewItems([]); return }
    const result = tab==='flashcards' ? validateFlashcards(value) : validateFormulas(value)
    setValidation(result)
    if (result.ok) { setPreviewItems(result.data); setSvgMap({}) }
  }, [tab])

  function removePreviewItem(idx) {
    setPreviewItems(prev => prev.filter((_,i) => i !== idx))
  }

  async function handleSave() {
    if (!previewItems.length || !topicGroup) return
    setSaving(true)
    try {
      const endpoint = tab==='flashcards' ? '/api/admin/flashcards' : '/api/admin/formulas'
      const key      = tab==='flashcards' ? 'cards' : 'formulas'
      const rows = topicGroup.topicIds.flatMap(tid =>
        previewItems.map(item => tab==='flashcards' ? {
          front_text: item.front_text, back_text: item.back_text,
          hint: item.hint??null, mnemonic: item.mnemonic??null,
          difficulty: item.difficulty, topic_id: tid, subject_id: subject.id, is_active: true,
          svg_code: (svgMap[previewItems.indexOf(item)]??'').trim()||null,
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
      showToast(`Saved ${previewItems.length} ${tab==='flashcards'?'cards':'formulas'} ✓`)
      await pickTopicGroup(topicGroup)
      resetPromptState()
    } catch(e) { showToast(`Save failed: ${e.message}`, '#f87171') }
    setSaving(false)
  }

  async function deleteExisting(item) {
    if (!confirm(`Delete "${tab==='flashcards'?item.front_text:item.label}"?`)) return
    const endpoint = tab==='flashcards' ? '/api/admin/flashcards' : '/api/admin/formulas'
    const res = await fetch(`${endpoint}?id=${item.id}`, {method:'DELETE'})
    if (!res.ok) { showToast('Delete failed','#f87171'); return }
    setExisting(p=>p.filter(x=>x.id!==item.id))
    showToast('Deleted','#FFB800')
  }

  const filteredTopics = topicGroups.filter(g =>
    !topicSearch || g.name.toLowerCase().includes(topicSearch.toLowerCase())
  )
  const noTopic = !topicGroup
  const wrongSubjectForFormulas = tab==='formulas' && !FORMULA_SUBJECTS.has(subject?.name?.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()??'')

  // ─── Shared styles ──────────────────────────────────────────────────────────
  const S = {
    card:  { borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border)', overflow:'hidden' },
    label: { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-tert)', display:'block', marginBottom:5 },
    input: { width:'100%', padding:'9px 11px', borderRadius:9, background:'#fff', border:'1px solid var(--border)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', boxSizing:'border-box', outline:'none' },
    ta:    { width:'100%', padding:'9px 11px', borderRadius:9, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-prim)', fontSize:12, fontFamily:'monospace', lineHeight:1.55, boxSizing:'border-box', outline:'none', resize:'vertical' },
    sec:   { fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', padding:'10px 14px 4px', display:'block' },
    sideBtn: (on) => ({ width:'100%', padding:'9px 14px', textAlign:'left', border:'none', borderLeft:`3px solid ${on?BLUE:'transparent'}`, background:on?'rgba(18,100,229,.08)':'transparent', color:on?BLUE:'var(--text-tert)', fontSize:12, fontWeight:on?700:400, cursor:'pointer', fontFamily:'inherit', transition:'all .1s', display:'flex', alignItems:'center', justifyContent:'space-between' }),
  }

  return (
    <div style={{ fontFamily:'inherit', color:'var(--text-prim)', maxWidth:1200, margin:'0 auto' }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Toast t={toast}/>

      {/* Page header */}
      <div style={{ marginBottom:24, display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'-0.03em', margin:0, color:'#111827' }}>
              {tab === 'flashcards' ? 'Flashcards Generator' : 'Key Formulas Generator'}
            </h1>
            <span style={{ fontSize:20 }}>{tab === 'flashcards' ? '✨' : '🧮'}</span>
          </div>
          <p style={{ fontSize:13, color:'#374151', margin:0 }}>
            Pick a subject and topic, and AI will generate smart {tab === 'flashcards' ? 'flashcards' : 'formulas'} for you.
            Topics are deduplicated — saving once covers all exam variants.
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ padding:'9px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-tert)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ⓘ How it works
          </button>
          <button style={{ padding:'9px 16px', borderRadius:10, background:'var(--bg-inset)', border:'none', color:'var(--text-prim)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ☰ View all {tab === 'flashcards' ? 'Flashcards' : 'Formulas'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <StepBar step={step}/>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, padding:3, borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)', marginBottom:24, width:'fit-content' }}>
        {[{key:'flashcards',label:'🃏 Flashcards'},{key:'formulas',label:'🧮 Key Formulas'}].map(t=>(
          <button key={t.key} onClick={()=>{setTab(t.key);resetPromptState()}}
            style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
              background:tab===t.key?BLUE:'transparent', color:tab===t.key?'#fff':'var(--text-tert)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Main 2-panel layout */}
      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:20, alignItems:'start' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* 1. Choose Subject — compact scrollable list */}
          <div style={{ ...S.card, maxHeight:220, display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              <span style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:20, height:20, borderRadius:'50%', background:BLUE, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900 }}>1</span>
                Subject
              </span>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'4px 0' }}>
              {subjects
                .filter(s => tab==='formulas' ? FORMULA_SUBJECTS.has(s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()) : true)
                .map(s => {
                  const base = s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()
                  const on = subject?.id === s.id
                  return (
                    <button key={s.id} onClick={()=>pickSubject(s)} style={S.sideBtn(on)}>
                      <span style={{ fontSize:12 }}>{base}</span>
                      {on && <span style={{ fontSize:9, color:BLUE }}>●</span>}
                    </button>
                  )
                })}
            </div>
          </div>

          {/* 2. Choose Topic */}
          {subject && (
            <div style={{ ...S.card, maxHeight:480, overflowY:'auto' }}>
              <div style={{ padding:'12px 14px 8px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--bg-card)', zIndex:1 }}>
                <span style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--bg-inset)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'var(--text-tert)' }}>2</span>
                  Choose Topic
                </span>
                <input
                  value={topicSearch} onChange={e=>setTopicSearch(e.target.value)}
                  placeholder="Search topics…"
                  style={{ ...S.input, padding:'7px 10px', fontSize:12 }}
                />
              </div>
              <div style={{ padding:'6px 0' }}>
                {loadingSubj ? (
                  <p style={{ padding:'12px 14px', fontSize:11, color:'var(--text-sec)' }}>Loading…</p>
                ) : filteredTopics.length === 0 ? (
                  <p style={{ padding:'12px 14px', fontSize:11, color:'var(--text-sec)' }}>No topics found</p>
                ) : filteredTopics.map(g => (
                  <button key={g.name} onClick={()=>pickTopicGroup(g)} style={S.sideBtn(topicGroup?.name===g.name)}>
                    <span style={{ flex:1, textAlign:'left', lineHeight:1.3 }}>{g.name}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      {g.hasObjectives && <span style={{ fontSize:8, fontWeight:800, color:'#4ade80', background:'rgba(74,222,128,.1)', borderRadius:3, padding:'1px 4px' }}>OBJ</span>}
                      {g.topicIds.length > 1 && <span style={{ fontSize:8, fontWeight:800, color:'#4ade80', background:'rgba(74,222,128,.08)', borderRadius:3, padding:'1px 4px' }}>×{g.topicIds.length}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saved count */}
          {topicGroup && (
            <div style={{ ...S.card, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Currently saved</div>
              <div style={{ fontSize:20, fontWeight:900, color: existing.length > 0 ? GREEN : 'var(--text-tert)' }}>{existing.length}</div>
              <div style={{ fontSize:11, color:'var(--text-sec)' }}>{tab==='flashcards'?'flashcard':'formula'}{existing.length!==1?'s':''}</div>
            </div>
          )}

          {/* Tip */}
          {topicGroup && (
            <div style={{ padding:'10px 14px', borderRadius:11, background:'rgba(18,100,229,.06)', border:'1px solid rgba(18,100,229,.15)' }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>💡 Tip</div>
              <p style={{ fontSize:11, color:'var(--text-sec)', margin:0, lineHeight:1.5 }}>
                {tab==='flashcards'
                  ? 'Flashcards are not tied to any exam — students from WAEC, JAMB, and IGCSE can all use them.'
                  : 'Saving once covers WAEC, JAMB, and other exam variants automatically.'}
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Empty state */}
          {noTopic && (
            <div style={{ textAlign:'center', padding:'80px 24px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16 }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
                <EmptySVG type="select"/>
              </div>
              <p style={{ fontSize:16, fontWeight:700, color:'var(--text-sec)', marginBottom:6 }}>Select a subject and topic</p>
              <p style={{ fontSize:12, color:'var(--text-tert)', maxWidth:320, margin:'0 auto' }}>
                Topics that exist across WAEC, JAMB, and other variants are shown once.<br/>
                Objectives are fetched automatically when available.
              </p>
            </div>
          )}

          {/* Wrong subject for formulas */}
          {!noTopic && wrongSubjectForFormulas && (
            <div style={{ textAlign:'center', padding:'48px 24px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16 }}>
              <p style={{ fontSize:28, marginBottom:10 }}>📝</p>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text-tert)' }}>Formulas not applicable for {subject?.name}</p>
              <p style={{ fontSize:12, color:'var(--text-sec)', marginTop:6 }}>Only for: Physics · Chemistry · Mathematics · Further Mathematics · Economics · Accounting</p>
            </div>
          )}

          {/* Main content area */}
          {!noTopic && !wrongSubjectForFormulas && (
            <>
              {/* Step 3: Describe — objectives + generate */}
              <div style={{ ...S.card, padding:'20px 22px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/></svg>
                      <span style={{ fontSize:15, fontWeight:800, color:'var(--text-prim)' }}>3. Describe What You Want</span>
                    </div>
                    <p style={{ fontSize:11, color:'var(--text-sec)', margin:0 }}>
                      {subject?.name?.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i,'').trim()} · {topicGroup.name}
                      {topicGroup.topicIds.length > 1 && ` · ${topicGroup.topicIds.length} exam variants`}
                    </p>
                  </div>
                  <div style={{ padding:'4px 10px', borderRadius:999, background:'rgba(74,222,128,.1)', border:'1px solid rgba(74,222,128,.2)', fontSize:10, fontWeight:700, color:'#4ade80' }}>
                    {tab === 'flashcards' ? '🃏 Exam-agnostic' : '🧮 All variants'}
                  </div>
                </div>

                {/* Objectives — auto-filled */}
                <div style={{ marginBottom:14 }}>
                  <label style={S.label}>
                    Learning objectives
                    {loadingObj && <span style={{ fontWeight:400, color:'#60a5fa', marginLeft:6 }}>⟳ loading objectives…</span>}
                    {!loadingObj && objectives && <span style={{ fontWeight:400, color:'#4ade80', marginLeft:6 }}>✓ auto-loaded from curriculum</span>}
                    {!loadingObj && !objectives && <span style={{ fontWeight:400, color:'var(--text-tert)', marginLeft:6 }}>(none stored — add manually if needed)</span>}
                  </label>
                  <textarea
                    value={objectives} onChange={e=>setObjectives(e.target.value)}
                    placeholder="e.g. Students should be able to: (i) define osmosis, (ii) explain plasmolysis..."
                    rows={objectives ? 4 : 2}
                    style={S.ta}
                  />
                </div>

                {/* Extra context */}
                <div style={{ marginBottom:18 }}>
                  <label style={S.label}>What should the flashcards focus on? <span style={{ fontWeight:400, color:'var(--text-tert)' }}>(optional)</span></label>
                  <textarea
                    value={extraContext} onChange={e=>setExtraContext(e.target.value)}
                    placeholder={tab==='flashcards' ? 'e.g. key terms, definitions, functions, examples, diagrams…' : 'e.g. equations of motion, energy conservation…'}
                    rows={2}
                    style={S.ta}
                  />
                </div>

                {/* What you'll get */}
                <div style={{ padding:'12px 14px', borderRadius:11, background:'rgba(74,222,128,.05)', border:'1px solid rgba(74,222,128,.15)', marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'#4ade80', marginBottom:8 }}>✓ What you'll get</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px' }}>
                    {(tab === 'flashcards' ? [
                      'Key terms & definitions',
                      'Diagrams & labeled parts (where applicable)',
                      'Important facts & concepts',
                      'Memory tricks & mnemonics',
                    ] : [
                      'All required formulas',
                      'Variable definitions with units',
                      'Worked examples',
                      'Plain-text formatting (no LaTeX)',
                    ]).map((item,i) => (
                      <div key={i} style={{ fontSize:11, color:'var(--text-tert)', display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ color:'#4ade80', flexShrink:0 }}>·</span> {item}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={generatePrompt}
                  style={{ padding:'12px 28px', borderRadius:11, background:BLUE, border:'none', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, boxShadow:`0 4px 0 #0a3fa0,0 6px 20px ${BLUE}30` }}>
                  Generate {tab === 'flashcards' ? 'Flashcards' : 'Formulas'} →
                </button>
              </div>

              {/* Prompt box */}
              {showPrompt && (
                <div style={{ ...S.card, padding:'18px 22px', background:'var(--bg-subtle)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', margin:0, marginBottom:2 }}>Copy this prompt</p>
                      <p style={{ fontSize:11, color:'var(--text-sec)', margin:0 }}>Paste into Claude or Gemini and run it</p>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(promptText);setCopied(true);setTimeout(()=>setCopied(false),2500)}}
                      style={{ padding:'8px 16px', borderRadius:9, background:copied?'rgba(74,222,128,.15)':'rgba(18,100,229,.15)', border:`1px solid ${copied?'rgba(74,222,128,.3)':'rgba(18,100,229,.3)'}`, color:copied?'#4ade80':'#60a5fa', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                      {copied ? '✓ Copied!' : '📋 Copy prompt'}
                    </button>
                  </div>
                  <pre style={{ fontSize:11, color:'var(--text-tert)', background:'var(--bg-subtle)', border:'1px solid var(--border)', borderRadius:9, padding:'12px 14px', overflowX:'auto', whiteSpace:'pre-wrap', lineHeight:1.6, maxHeight:220, overflowY:'auto', margin:0 }}>
                    {promptText}
                  </pre>
                </div>
              )}

              {/* Paste area */}
              {showPrompt && (
                <div style={{ ...S.card, padding:'18px 22px' }}>
                  <p style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:2 }}>Paste the AI output</p>
                  <p style={{ fontSize:11, color:'var(--text-sec)', marginBottom:12 }}>Paste the JSON from Claude/Gemini — validates instantly.</p>
                  <textarea value={pasteRaw} onChange={e=>handlePaste(e.target.value)} rows={10}
                    placeholder={'[\n  {\n    "front_text": "...",\n    ...\n  }\n]'}
                    style={{...S.ta, marginBottom:10}}/>
                  {validation && (
                    <div style={{ padding:'12px 14px', borderRadius:10, background:validation.ok?'rgba(74,222,128,.07)':'rgba(248,113,113,.07)', border:`1px solid ${validation.ok?'rgba(74,222,128,.25)':'rgba(248,113,113,.25)'}` }}>
                      {validation.ok ? (
                        <p style={{ fontSize:13, fontWeight:800, color:'#4ade80', margin:0 }}>
                          ✓ {previewItems.length} {tab==='flashcards'?'card':'formula'}{previewItems.length!==1?'s':''} ready — review and save below
                        </p>
                      ) : (
                        <div>
                          <p style={{ fontSize:13, fontWeight:800, color:'#f87171', marginBottom:8 }}>{validation.errors.length} problem{validation.errors.length!==1?'s':''} — fix in source and re-paste</p>
                          <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:3 }}>
                            {validation.errors.map((e,i)=><li key={i} style={{ fontSize:11, color:'#f87171cc' }}>▸ {e}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Preview + Save */}
              {previewItems.length > 0 && (
                <div style={{ ...S.card, padding:'18px 22px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:2 }}>Preview & save</p>
                      <p style={{ fontSize:11, color:'var(--text-sec)' }}>
                        Remove any cards you don't want, then save.
                        Saves to {topicGroup.topicIds.length} exam variant{topicGroup.topicIds.length>1?'s':''}.
                      </p>
                    </div>
                    <button onClick={handleSave} disabled={saving||previewItems.length===0}
                      style={{ padding:'11px 24px', borderRadius:11, background:saving?'var(--bg-inset)':'#16a34a', border:'none', color:'#fff', fontSize:14, fontWeight:800, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', opacity:saving?0.6:1, boxShadow:saving?'none':'0 4px 0 #14532d' }}>
                      {saving ? 'Saving…' : `Save ${previewItems.length} ${tab==='flashcards'?'card':'formula'}${previewItems.length!==1?'s':''}`}
                    </button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {tab==='flashcards'
                      ? previewItems.map((c,i)=><FlashcardPreview key={i} card={c} onRemove={()=>removePreviewItem(i)} svgCode={svgMap[i]??''} onSvgChange={v=>setSvgMap(m=>({...m,[i]:v}))}/>)
                      : previewItems.map((f,i)=><FormulaPreview key={i} formula={f} onRemove={()=>removePreviewItem(i)}/>)
                    }
                  </div>
                </div>
              )}

              {/* Existing content */}
              {existing.length > 0 && (
                <ExistingPanel tab={tab} items={existing} onDelete={deleteExisting}/>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Existing panel ────────────────────────────────────────────────────────────
function ExistingPanel({ tab, items, onDelete }) {
  const [open, setOpen] = useState(false)
  const GOLD = '#FFB800'
  return (
    <div style={{ borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border)', overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)' }}>Saved {tab==='flashcards'?'flashcards':'formulas'}</span>
          <span style={{ fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:99, background:'rgba(18,100,229,.1)', color:BLUE }}>{items.length}</span>
        </div>
        <span style={{ fontSize:12, color:'var(--text-sec)', transform:open?'rotate(180deg)':'none', transition:'transform .2s', display:'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'0 18px 16px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
            {tab==='flashcards' ? items.map(c=>(
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text-prim)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.front_text}</p>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:99, color:c.difficulty==='easy'?'#4ade80':c.difficulty==='hard'?'#f87171':GOLD, background:c.difficulty==='easy'?'rgba(74,222,128,.1)':c.difficulty==='hard'?'rgba(248,113,113,.1)':'rgba(255,184,0,.1)', border:`1px solid ${c.difficulty==='easy'?'rgba(74,222,128,.2)':c.difficulty==='hard'?'rgba(248,113,113,.2)':'rgba(255,184,0,.2)'}` }}>{c.difficulty}</span>
                    <span style={{ fontSize:11, color:'var(--text-sec)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.back_text}</span>
                  </div>
                </div>
                <button onClick={()=>onDelete(c)} style={{ width:26, height:26, borderRadius:7, background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)', color:'#f87171', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
              </div>
            )) : items.map(f=>(
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text-prim)', marginBottom:2 }}>{f.label}</p>
                  <span style={{ fontSize:11, fontFamily:'monospace', color:GOLD }}>{f.formula_plain}</span>
                </div>
                <button onClick={()=>onDelete(f)} style={{ width:26, height:26, borderRadius:7, background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)', color:'#f87171', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}