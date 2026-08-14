'use client'
// src/app/student/flashcards/page.js
// Three views in one page:
//   1. Subject grid  — pick a subject
//   2. Topic list    — pick a topic
//   3. Card session  — flip through cards with know/unsure/learning rating

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import CoachBanner from '@/components/ui/CoachBanner'
import { useIsDark } from '@/lib/useIsDark'

// ── Subjects that have flashcards ─────────────────────────────────────────────
const FC_SUBJECTS = [
  { name:'Physics',              icon:'⚡', accent:'#18B7F2' },
  { name:'Chemistry',            icon:'⚗️', accent:'#9b7ae0' },
  { name:'Biology',              icon:'🧬', accent:'#4ade80' },
  { name:'Mathematics',          icon:'📐', accent:'#FFB800' },
  { name:'Further Mathematics',  icon:'📐', accent:'#FFB800' },
  { name:'Economics',            icon:'📊', accent:'#fcd34d' },
  { name:'Government',           icon:'🏛️', accent:'#f87171' },
  { name:'Geography',            icon:'🌍', accent:'#34d399' },
  { name:'Literature in English',icon:'📚', accent:'#f9a8d4' },
  { name:'English Language',     icon:'📖', accent:'#a78bfa' },
  { name:'Use of English',       icon:'📖', accent:'#a78bfa' },
  { name:'Accounting',           icon:'🧮', accent:'#fde68a' },
  { name:'Commerce',             icon:'💼', accent:'#818cf8' },
  { name:'Agricultural Science', icon:'🌱', accent:'#86efac' },
]

// ── Mascot SVG ────────────────────────────────────────────────────────────────
function Mascot({ size = 48, mood = 'happy' }) {
  const expressions = {
    happy:    { eyes: '◠ ◠', mouth: '‿', color: '#FFB800' },
    thinking: { eyes: '◔ ◔', mouth: '–', color: '#18B7F2' },
    celebrate:{ eyes: '★ ★', mouth: '▾', color: '#4ade80' },
    unsure:   { eyes: '◑ ◑', mouth: '~', color: '#f87171' },
  }
  const e = expressions[mood] ?? expressions.happy
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${e.color}20`, border: `2px solid ${e.color}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.25, userSelect: 'none', flexShrink: 0 }}>
      <span style={{ letterSpacing: size * 0.05, lineHeight: 1 }}>{e.eyes}</span>
      <span style={{ fontSize: size * 0.2, marginTop: 2 }}>{e.mouth}</span>
    </div>
  )
}

// ── Progress ring ─────────────────────────────────────────────────────────────
function ProgressRing({ known, total, size = 36 }) {
  const r    = (size - 4) / 2
  const circ = 2 * Math.PI * r
  const pct  = total > 0 ? known / total : 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#4ade80" strokeWidth={3}
        strokeLinecap="round" strokeDasharray={`${pct * circ} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray .5s ease' }}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" style={{ fontSize: 9, fontWeight: 800, fill: 'var(--text-prim)', fontFamily: 'inherit' }}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

// ── Flip card component ───────────────────────────────────────────────────────
function FlipCard({ card, onRate, cardIndex, totalCards, accent, isDark }) {
  const [flipped,    setFlipped]    = useState(false)
  const [showHint,   setShowHint]   = useState(false)
  const [animClass,  setAnimClass]  = useState('card-enter')
  const [ratingDone, setRatingDone] = useState(false)

  // Reset on card change
  useEffect(() => {
    setFlipped(false); setShowHint(false)
    setAnimClass('card-enter'); setRatingDone(false)
    const t = setTimeout(() => setAnimClass(''), 320)
    return () => clearTimeout(t)
  }, [card?.id])

  function handleFlip() { if (!flipped) setFlipped(true) }

  function handleRate(status) {
    if (ratingDone) return
    setRatingDone(true)
    // Brief exit animation then call parent
    setAnimClass('card-exit')
    setTimeout(() => onRate(card.id, status), 280)
  }

  const moodMap = { new: 'thinking', learning: 'unsure', known: 'celebrate' }
  const mood    = flipped ? moodMap[card?.status ?? 'new'] : 'happy'

  return (
    <div className={animClass} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 420, margin: '0 auto' }}>

      {/* Card counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)' }}>{cardIndex + 1} / {totalCards}</span>
        <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'var(--border)', margin: '0 12px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((cardIndex + 1) / totalCards) * 100}%`, background: accent, borderRadius: 99, transition: 'width .3s' }}/>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: accent }}>
          {card?.status === 'known' ? '✓ Known' : card?.status === 'learning' ? '~ Learning' : 'New'}
        </span>
      </div>

      {/* The card itself */}
      <div onClick={handleFlip} style={{ perspective: 1000, width: '100%', cursor: flipped ? 'default' : 'pointer' }}>
        <div style={{
          position: 'relative', width: '100%', minHeight: 240,
          transformStyle: 'preserve-3d', transition: 'transform .55s cubic-bezier(.4,0,.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
        }}>
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 24, backfaceVisibility: 'hidden',
            background: isDark ? 'linear-gradient(145deg,#0f1729,#162040)' : 'linear-gradient(145deg,#f8faff,#eef2ff)',
            border: `2px solid ${accent}35`, padding: '28px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxShadow: `0 8px 32px ${accent}18, 0 2px 8px rgba(0,0,0,.12)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: accent }}>Flashcard</span>
              <Mascot size={36} mood="thinking" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.5, textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card?.front_text}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              {card?.hint && !showHint ? (
                <button onClick={e => { e.stopPropagation(); setShowHint(true) }} style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}14`, border: `1px solid ${accent}25`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  💡 Hint
                </button>
              ) : card?.hint && showHint ? (
                <p style={{ fontSize: 11, color: 'var(--text-tert)', fontStyle: 'italic' }}>{card.hint}</p>
              ) : <span/>}
              <p style={{ fontSize: 11, color: 'var(--text-tert)' }}>Tap to flip →</p>
            </div>
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 24,
            backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
            background: isDark ? `linear-gradient(145deg,${accent}18,#0f1729)` : `linear-gradient(145deg,${accent}10,#f8faff)`,
            border: `2px solid ${accent}50`, padding: '24px 24px 20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxShadow: `0 8px 32px ${accent}25, 0 2px 8px rgba(0,0,0,.12)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: accent }}>Answer</span>
              <Mascot size={36} mood="celebrate" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-prim)', lineHeight: 1.6, flex: 1, display: 'flex', alignItems: 'center' }}>
              {card?.back_text}
            </p>
            {card?.mnemonic && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: `${accent}12`, border: `1px solid ${accent}25` }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: accent, marginBottom: 2 }}>🧠 Memory tip</p>
                <p style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.4 }}>{card.mnemonic}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons — only after flip */}
      <div style={{ display: 'flex', gap: 10, width: '100%', opacity: flipped ? 1 : 0, transform: flipped ? 'translateY(0)' : 'translateY(8px)', transition: 'all .3s .1s', pointerEvents: flipped && !ratingDone ? 'auto' : 'none' }}>
        {[
          { status: 'learning', label: "Didn't know", emoji: '😬', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.3)', color: '#f87171' },
          { status: 'learning', label: 'Almost',      emoji: '🤔', bg: 'rgba(255,184,0,.1)',    border: 'rgba(255,184,0,.3)',    color: '#FFB800' },
          { status: 'known',    label: 'Got it!',     emoji: '🎯', bg: 'rgba(74,222,128,.1)',   border: 'rgba(74,222,128,.3)',   color: '#4ade80' },
        ].map(r => (
          <button key={r.label} onClick={() => handleRate(r.status)}
            style={{ flex: 1, padding: '11px 4px', borderRadius: 14, background: r.bg, border: `2px solid ${r.border}`, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .1s, box-shadow .1s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(.96)'}
            onMouseUp={e => e.currentTarget.style.transform = ''}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{r.emoji}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: r.color }}>{r.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Session complete screen ────────────────────────────────────────────────────
function SessionComplete({ known, total, onReview, onExit, accent }) {
  const pct = total > 0 ? Math.round((known / total) * 100) : 0
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <Mascot size={72} mood={pct >= 70 ? 'celebrate' : 'thinking'} />
      <div>
        <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.03em', marginBottom: 4 }}>
          {pct >= 80 ? 'Excellent! 🎉' : pct >= 50 ? 'Good progress! 💪' : 'Keep going! 📚'}
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-tert)' }}>{known} of {total} cards known · {pct}%</p>
      </div>
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 360 }}>
        <button onClick={onReview} style={{ flex: 1, padding: '13px 0', borderRadius: 14, background: 'var(--bg-card)', border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer', fontFamily: 'inherit' }}>
          Review again
        </button>
        <button onClick={onExit} style={{ flex: 1, padding: '13px 0', borderRadius: 14, background: accent, border: 'none', fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 0 ${accent}90` }}>
          Done ✓
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const router       = useRouter()
  const { userId }   = useUser()
  const isDark       = useIsDark()
  const supabase     = createClient()

  const [view,        setView]       = useState('subjects') // subjects | topics | session | complete
  const [subject,     setSubject]    = useState(null)
  const [topics,      setTopics]     = useState([])
  const [topic,       setTopic]      = useState(null)
  const [cards,       setCards]      = useState([])
  const [cardIndex,   setCardIndex]  = useState(0)
  const [knownIds,    setKnownIds]   = useState(new Set())
  const [loading,     setLoading]    = useState(false)
  const progressRef  = useRef({})    // cardId → status cache

  // Load topics when subject selected
  async function selectSubject(sub) {
    setSubject(sub); setLoading(true); setView('topics')
    const { data: sRows } = await supabase.from('subjects').select('id').eq('name', sub.name).eq('is_active', true).limit(1)
    const subId = sRows?.[0]?.id
    if (!subId) { setTopics([]); setLoading(false); return }
    const { data: tRows } = await supabase.from('topics').select('id, name, order_index').eq('subject_id', subId).order('order_index', { nullsLast: true }).order('name')
    setTopics(tRows ?? []); setLoading(false)
  }

  // Load cards when topic selected
  async function selectTopic(t) {
    setTopic(t); setLoading(true)
    const res  = await fetch(`/api/student/flashcards?topic_id=${t.id}`)
    const data = res.ok ? await res.json() : { cards: [] }
    const fetched = data.cards ?? []
    if (!fetched.length) { setLoading(false); return }
    setCards(fetched); setCardIndex(0); setKnownIds(new Set()); setView('session'); setLoading(false)
  }

  // Rate a card
  async function handleRate(cardId, status) {
    // Update progress in DB (fire-and-forget)
    fetch('/api/student/flashcards', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcard_id: cardId, status }),
    }).catch(() => {})

    if (status === 'known') setKnownIds(prev => new Set([...prev, cardId]))

    if (cardIndex < cards.length - 1) {
      setCardIndex(i => i + 1)
    } else {
      setView('complete')
    }
  }

  const currentCard = cards[cardIndex] ?? null
  const accent      = subject?.accent ?? '#9b7ae0'

  return (
    <div style={{ paddingBottom: 96 }}>
      <style>{`
        @keyframes card-enter { from { opacity:0;transform:translateY(16px) } to { opacity:1;transform:translateY(0) } }
        @keyframes card-exit  { from { opacity:1;transform:translateX(0) } to { opacity:0;transform:translateX(-24px) } }
        .card-enter { animation: card-enter .3s cubic-bezier(.34,1.56,.64,1) }
        .card-exit  { animation: card-exit  .28s ease }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        {view !== 'subjects' && (
          <button onClick={() => { if(view==='topics'||view==='complete') { setView('subjects'); setSubject(null) } else if(view==='session') setView('topics') }} style={{ width:34,height:34,borderRadius:10,background:'var(--bg-subtle)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14,color:'var(--text-sec)',flexShrink:0 }}>←</button>
        )}
        <div style={{ flex:1 }}>
          <p style={{ fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'.12em',color:'var(--text-tert)',marginBottom:2 }}>
            {view==='subjects'?'Study tools':view==='topics'?subject?.name:view==='session'?`${subject?.name} · ${topic?.name}`:'Session complete'}
          </p>
          <h1 style={{ fontSize:18,fontWeight:900,color:'var(--text-prim)',letterSpacing:'-0.02em' }}>
            {view==='subjects'?'Flashcards':view==='topics'?'Choose topic':view==='session'?'Flip & learn':'Done!'}
          </h1>
        </div>
        {view==='session' && <ProgressRing known={knownIds.size} total={cards.length} size={42}/>}
      </div>

      {/* ── Subject grid ── */}
      {view==='subjects' && (
        <>
          <CoachBanner message="Choose a subject to start. Tap each card to flip it, then rate how well you knew it — I'll track your progress!" greeting="Ready to study?" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {FC_SUBJECTS.map(sub => (
              <button key={sub.name} onClick={() => selectSubject(sub)}
                style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'14px 14px 12px',borderRadius:16,background:'var(--bg-card)',border:`1.5px solid ${sub.accent}30`,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all .12s',gap:6 }}>
                <div style={{ width:38,height:38,borderRadius:11,background:`${sub.accent}15`,border:`1px solid ${sub.accent}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>{sub.icon}</div>
                <p style={{ fontSize:12,fontWeight:800,color:'var(--text-prim)',lineHeight:1.3 }}>{sub.name}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Topic list ── */}
      {view==='topics' && (
        loading ? (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height:52,borderRadius:13,background:'var(--bg-subtle)',border:'1px solid var(--border)' }}/>)}
          </div>
        ) : topics.length === 0 ? (
          <div style={{ textAlign:'center',padding:'40px 20px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:18 }}>
            <p style={{ fontSize:24,marginBottom:10 }}>🃏</p>
            <p style={{ fontSize:14,fontWeight:700,color:'var(--text-prim)',marginBottom:6 }}>No flashcards yet</p>
            <p style={{ fontSize:12,color:'var(--text-tert)' }}>Cards for {subject?.name} are being added. Check back soon.</p>
          </div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {topics.map(t => (
              <button key={t.id} onClick={() => selectTopic(t)}
                style={{ display:'flex',alignItems:'center',gap:12,padding:'13px 16px',borderRadius:14,background:'var(--bg-card)',border:`1px solid var(--border)`,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all .12s' }}>
                <div style={{ width:10,height:10,borderRadius:'50%',background:accent,flexShrink:0 }}/>
                <p style={{ fontSize:13,fontWeight:700,color:'var(--text-prim)',flex:1 }}>{t.name}</p>
                <span style={{ fontSize:14,color:'var(--text-tert)' }}>→</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* ── Session ── */}
      {view==='session' && currentCard && (
        <FlipCard card={currentCard} onRate={handleRate} cardIndex={cardIndex} totalCards={cards.length} accent={accent} isDark={isDark}/>
      )}

      {/* ── Complete ── */}
      {view==='complete' && (
        <SessionComplete known={knownIds.size} total={cards.length} accent={accent}
          onReview={() => { setCardIndex(0); setKnownIds(new Set()); setView('session') }}
          onExit={() => setView('topics')} />
      )}
    </div>
  )
}