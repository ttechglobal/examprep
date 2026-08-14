'use client'
// src/app/student/formulas/page.js
// Formula reference sheets by subject → topic
// Subjects with formulas: Maths, Physics, Chemistry, Economics, Accounting, Further Maths

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import CoachBanner from '@/components/ui/CoachBanner'
import { useIsDark } from '@/lib/useIsDark'

const FORMULA_SUBJECTS = [
  { name:'Mathematics',         icon:'📐', accent:'#FFB800' },
  { name:'Further Mathematics', icon:'📐', accent:'#FFB800' },
  { name:'Physics',             icon:'⚡', accent:'#18B7F2' },
  { name:'Chemistry',           icon:'⚗️', accent:'#9b7ae0' },
  { name:'Economics',           icon:'📊', accent:'#fcd34d' },
  { name:'Accounting',          icon:'🧮', accent:'#fde68a' },
]

// Simple LaTeX-like renderer (no KaTeX dep — handles common patterns)
function FormulaDisplay({ latex, plain }) {
  // Use plain text — wrap special chars in styled spans
  const text = latex ?? plain
  return (
    <div style={{ fontFamily: '"Courier New", monospace', fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-prim)', padding: '10px 14px', background: 'var(--bg-inset)', borderRadius: 10, textAlign: 'center', overflowX: 'auto', whiteSpace: 'nowrap' }}>
      {text}
    </div>
  )
}

function FormulaCard({ formula, accent }) {
  const [open, setOpen] = useState(false)
  const vars = formula.variables ? Object.entries(formula.variables) : []

  return (
    <div style={{ borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border)', overflow:'hidden', marginBottom:8 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width:'100%', padding:'13px 16px', display:'flex', alignItems:'center', gap:10, background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:accent, flexShrink:0 }}/>
        <p style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', flex:1 }}>{formula.label}</p>
        <span style={{ fontSize:12, fontFamily:'monospace', color:accent, fontWeight:800, flexShrink:0, marginRight:6 }}>{formula.formula_plain}</span>
        <span style={{ fontSize:12, color:'var(--text-tert)', transition:'transform .2s', display:'inline-block', transform:open?'rotate(180deg)':'rotate(0)' }}>▾</span>
      </button>

      {open && (
        <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border)' }}>
          <div style={{ marginTop:12, marginBottom:12 }}>
            <FormulaDisplay latex={formula.formula_latex} plain={formula.formula_plain}/>
          </div>
          {formula.description && <p style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.6, marginBottom:vars.length?12:0 }}>{formula.description}</p>}
          {vars.length > 0 && (
            <div style={{ marginBottom:formula.example?12:0 }}>
              <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:6 }}>Variables</p>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {vars.map(([k, v]) => (
                  <div key={k} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:800, color:accent, minWidth:24 }}>{k}</span>
                    <span style={{ fontSize:11, color:'var(--text-tert)', flex:1, lineHeight:1.4 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {formula.example && (
            <div style={{ padding:'10px 12px', borderRadius:10, background:`${accent}08`, border:`1px solid ${accent}20`, marginTop:8 }}>
              <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:accent, marginBottom:4 }}>Example</p>
              <p style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.6, fontFamily:'monospace' }}>{formula.example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FormulasPage() {
  const supabase = createClient()
  const isDark   = useIsDark()

  const [view,     setView]     = useState('subjects') // subjects | topics | formulas
  const [subject,  setSubject]  = useState(null)
  const [topics,   setTopics]   = useState([])
  const [topic,    setTopic]    = useState(null)
  const [formulas, setFormulas] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')

  async function selectSubject(sub) {
    setSubject(sub); setLoading(true); setView('topics')
    const { data: sRows } = await supabase.from('subjects').select('id').eq('name', sub.name).eq('is_active', true).limit(1)
    const subId = sRows?.[0]?.id
    if (!subId) { setTopics([]); setLoading(false); return }
    const { data: tRows } = await supabase.from('topics').select('id, name, order_index').eq('subject_id', subId).order('order_index', { nullsLast:true }).order('name')
    setTopics(tRows ?? []); setLoading(false)
  }

  async function selectTopic(t) {
    setTopic(t); setLoading(true)
    const res  = await fetch(`/api/student/formulas?topic_id=${t.id}`)
    const data = res.ok ? await res.json() : { formulas: [] }
    setFormulas(data.formulas ?? []); setSearch(''); setView('formulas'); setLoading(false)
  }

  const accent   = subject?.accent ?? '#FFB800'
  const filtered = search ? formulas.filter(f => f.label.toLowerCase().includes(search.toLowerCase()) || f.formula_plain?.toLowerCase().includes(search.toLowerCase())) : formulas

  return (
    <div style={{ paddingBottom: 96 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        {view !== 'subjects' && (
          <button onClick={() => { if(view==='topics') { setView('subjects'); setSubject(null) } else setView('topics') }} style={{ width:34,height:34,borderRadius:10,background:'var(--bg-subtle)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14,color:'var(--text-sec)',flexShrink:0 }}>←</button>
        )}
        <div>
          <p style={{ fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'.12em',color:'var(--text-tert)',marginBottom:2 }}>
            {view==='subjects'?'Study tools':view==='topics'?subject?.name:`${subject?.name} · ${topic?.name}`}
          </p>
          <h1 style={{ fontSize:18,fontWeight:900,color:'var(--text-prim)',letterSpacing:'-0.02em' }}>
            {view==='subjects'?'Key Formulas':view==='topics'?'Choose topic':'Formulas'}
          </h1>
        </div>
      </div>

      {/* Subjects */}
      {view==='subjects' && (
        <>
          <CoachBanner message="Key formulas organised by subject and topic. Tap any formula to expand the full explanation, worked examples, and variable definitions." greeting="Formula Reference 🧮" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {FORMULA_SUBJECTS.map(sub => (
              <button key={sub.name} onClick={() => selectSubject(sub)}
                style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'14px',borderRadius:16,background:'var(--bg-card)',border:`1.5px solid ${sub.accent}30`,cursor:'pointer',textAlign:'left',fontFamily:'inherit',gap:8 }}>
                <div style={{ width:38,height:38,borderRadius:11,background:`${sub.accent}15`,border:`1px solid ${sub.accent}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>{sub.icon}</div>
                <p style={{ fontSize:12,fontWeight:800,color:'var(--text-prim)',lineHeight:1.3 }}>{sub.name}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Topics */}
      {view==='topics' && (
        loading ? (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {[1,2,3].map(i => <div key={i} style={{ height:52,borderRadius:13,background:'var(--bg-subtle)',border:'1px solid var(--border)' }}/>)}
          </div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {topics.map(t => (
              <button key={t.id} onClick={() => selectTopic(t)}
                style={{ display:'flex',alignItems:'center',gap:12,padding:'13px 16px',borderRadius:14,background:'var(--bg-card)',border:'1px solid var(--border)',cursor:'pointer',textAlign:'left',fontFamily:'inherit' }}>
                <div style={{ width:10,height:10,borderRadius:'50%',background:accent,flexShrink:0 }}/>
                <p style={{ fontSize:13,fontWeight:700,color:'var(--text-prim)',flex:1 }}>{t.name}</p>
                <span style={{ fontSize:14,color:'var(--text-tert)' }}>→</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* Formulas list */}
      {view==='formulas' && (
        loading ? (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {[1,2,3].map(i => <div key={i} style={{ height:52,borderRadius:13,background:'var(--bg-subtle)',border:'1px solid var(--border)' }}/>)}
          </div>
        ) : formulas.length === 0 ? (
          <div style={{ textAlign:'center',padding:'40px 20px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:18 }}>
            <p style={{ fontSize:24,marginBottom:10 }}>🧮</p>
            <p style={{ fontSize:14,fontWeight:700,color:'var(--text-prim)',marginBottom:6 }}>No formulas yet</p>
            <p style={{ fontSize:12,color:'var(--text-tert)' }}>Formulas for {topic?.name} are being added. Check back soon.</p>
          </div>
        ) : (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search formulas…"
              style={{ width:'100%',padding:'10px 14px',borderRadius:12,fontSize:13,border:'1.5px solid var(--border)',background:'var(--bg-subtle)',color:'var(--text-prim)',fontFamily:'inherit',marginBottom:14,outline:'none',boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor=accent} onBlur={e => e.target.style.borderColor='var(--border)'}/>
            {filtered.map(f => <FormulaCard key={f.id} formula={f} accent={accent}/>)}
            {filtered.length === 0 && <p style={{ fontSize:12,color:'var(--text-tert)',textAlign:'center',padding:'20px 0' }}>No formulas match "{search}"</p>}
          </>
        )
      )}
    </div>
  )
}