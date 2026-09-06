'use client'
// src/app/student/learn/flashcards/page.js
//
// FLOW:  Learn page → /student/learn/flashcards (this page)
//   View 1 — "Flashcards" landing: hero header + subject cards grid
//   View 2 — Subject selected: topic list with per-topic card counts + last-studied badge
//   View 3 — Topic selected: full flip-card study session with progress tracking
//
// PROGRESS TRACKING (localStorage, key: ep_fc_progress)
//   Shape: { [topicId]: { total, done, lastStudied, completed } }
//   "done" increments per "Got it" click — resets when student restarts the deck.
//   "completed" = true when done >= total in a single session.
//
// The API endpoint (/api/student/flashcards) handles three call modes:
//   1. GET /api/student/flashcards              → { subjects: [...] }
//   2. GET ?subjectName=Physics                 → { topics: [...] }
//   3. GET ?topicId=<uuid>                      → { cards: [...] }

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'

// ─── BRAND ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'
const CYAN   = '#18B7F2'

const SUBJECT_COLOR = {
  'Mathematics':           ORANGE,
  'Further Mathematics':   ORANGE,
  'English Language':      GREEN,
  'Use of English':        GREEN,
  'Physics':               PURPLE,
  'Chemistry':             BLUE,
  'Biology':               CYAN,
  'Economics':             '#f43f5e',
  'Government':            '#9b7ae0',
  'Geography':             '#34d399',
  'Literature in English': '#f9a8d4',
  'Agricultural Science':  '#86efac',
  'Commerce':              '#818cf8',
  'Accounting':            GOLD,
  'default':               BLUE,
}
const SUBJECT_EMOJI = {
  'Mathematics':           '🧮',
  'Further Mathematics':   '📐',
  'English Language':      '📖',
  'Use of English':        '📖',
  'Physics':               '⚡',
  'Chemistry':             '⚗️',
  'Biology':               '🧬',
  'Economics':             '📊',
  'Government':            '🏛️',
  'Geography':             '🌍',
  'Literature in English': '📚',
  'Agricultural Science':  '🌱',
  'Commerce':              '💼',
  'Accounting':            '🧾',
  'default':               '📝',
}
const subCol  = n => SUBJECT_COLOR[n] ?? SUBJECT_COLOR.default
const subIcon = n => SUBJECT_EMOJI[n] ?? SUBJECT_EMOJI.default

const DIFF_COLOR = { easy: GREEN, medium: GOLD, hard: '#f87171' }
const DIFF_BG    = { easy: 'rgba(34,197,94,.12)', medium: 'rgba(255,184,0,.12)', hard: 'rgba(248,113,113,.1)' }

// ─── PROGRESS STORE ──────────────────────────────────────────────────────────
const FC_PROGRESS_KEY = 'ep_fc_progress'

function readProgress() {
  try { return JSON.parse(localStorage.getItem(FC_PROGRESS_KEY) || '{}') } catch { return {} }
}
function writeProgress(data) {
  try { localStorage.setItem(FC_PROGRESS_KEY, JSON.stringify(data)) } catch {}
}
function markTopicProgress(topicId, done, total, completed, cardIndex) {
  const all = readProgress()
  all[topicId] = { done, total, completed, lastStudied: Date.now(), cardIndex: cardIndex ?? 0 }
  writeProgress(all)
}

// ─── BG ──────────────────────────────────────────────────────────────────────
function AppBg({ dark }) {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0,
        backgroundImage: dark
          ? 'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)'
          : 'radial-gradient(circle,rgba(6,42,120,.05) 1px,transparent 1px)',
        backgroundSize:'28px 28px' }}/>
      <div style={{ position:'absolute', width:380, height:380, borderRadius:'50%', background:'rgba(124,58,237,.07)', filter:'blur(80px)', top:-100, right:-60, pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', bottom:-60, left:-60, pointerEvents:'none' }}/>
    </div>
  )
}

// ─── SPINNER ─────────────────────────────────────────────────────────────────
function Spinner({ color = PURPLE }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'64px 0' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid var(--border)`, borderTopColor:color, animation:'fc-spin .7s linear infinite' }}/>
      <style>{`@keyframes fc-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── BACK BUTTON ─────────────────────────────────────────────────────────────
function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ width:38, height:38, borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, boxShadow:'0 1px 4px rgba(6,42,120,.06)' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8l5 5" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW 1 — SUBJECT CARDS
// ─────────────────────────────────────────────────────────────────────────────

function SubjectHero() {
  return (
    <div style={{
      borderRadius: 22, overflow: 'hidden', position: 'relative',
      background: `linear-gradient(135deg, ${NAVY} 0%, #1a1060 50%, #2a1280 100%)`,
      padding: '28px 28px 28px 28px', minHeight: 140,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Glow blobs */}
      <div style={{ position:'absolute', top:-30, right:100, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,.3) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-40, left:60, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(18,100,229,.2) 0%,transparent 70%)', pointerEvents:'none' }}/>

      {/* Floating card stack illustration */}
      <div style={{ position:'absolute', right:24, top:'50%', transform:'translateY(-50%)', opacity:.9 }}>
        {[
          { rotate:-8, y:6, bg:'rgba(124,58,237,.5)', z:0 },
          { rotate:3,  y:2, bg:'rgba(18,100,229,.6)', z:1 },
          { rotate:0,  y:0, bg:'rgba(255,255,255,.12)',z:2 },
        ].map((c, i) => (
          <div key={i} style={{
            position: i === 0 ? 'relative' : 'absolute',
            top: i === 0 ? 0 : c.y,
            left: i === 0 ? 0 : 0,
            width: 72, height: 50, borderRadius: 10,
            background: c.bg,
            border: '1px solid rgba(255,255,255,.18)',
            backdropFilter: 'blur(4px)',
            transform: `rotate(${c.rotate}deg)`,
            zIndex: c.z,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {i === 2 && <span style={{ fontSize:22, filter:'drop-shadow(0 2px 4px rgba(0,0,0,.4))' }}>🃏</span>}
          </div>
        ))}
      </div>

      {/* Text */}
      <div style={{ zIndex:1, maxWidth:260 }}>
        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.14em', color:'rgba(255,255,255,.45)', marginBottom:8 }}>
          Active Recall · Smart Practice
        </div>
        <h1 style={{ fontSize:26, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-.04em', lineHeight:1.2, marginBottom:8 }}>
          Flashcards
        </h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.55)', margin:0, lineHeight:1.6 }}>
          Small cards. Big progress.
          <br/>Pick a subject to start.
        </p>
      </div>
    </div>
  )
}

function SubjectCard({ subject, progress, onClick }) {
  const [pressed, setPressed] = useState(false)
  const c   = subCol(subject.name)
  const em  = subIcon(subject.name)
  const prog = progress ?? {}

  // How many of this subject's topics are completed?
  const completed = Object.keys(prog).length  // computed from topic IDs — rough signal

  return (
    <button
      onClick={() => onClick(subject)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', padding: 0,
        borderRadius: 20, border: `1.5px solid ${c}25`,
        background: 'var(--bg-card)',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        overflow: 'hidden',
        boxShadow: pressed ? `0 2px 8px ${c}18` : `0 4px 20px ${c}12, 0 1px 4px rgba(0,0,0,.05)`,
        transform: pressed ? 'scale(.98)' : 'scale(1)',
        transition: 'all .13s ease',
      }}
    >
      {/* Subject colour stripe at top */}
      <div style={{ width:'100%', height:4, background:`linear-gradient(90deg,${c},${c}60)`, flexShrink:0 }}/>

      <div style={{ padding:'16px 16px 14px', width:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:0 }}>
        {/* Icon */}
        <div style={{
          width:48, height:48, borderRadius:14,
          background:`${c}14`, border:`1.5px solid ${c}20`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:24, marginBottom:12, flexShrink:0,
        }}>
          {em}
        </div>

        {/* Name */}
        <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', lineHeight:1.25, letterSpacing:'-.02em', marginBottom:6 }}>
          {subject.name}
        </div>

        {/* Card count pill */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:4,
          padding:'3px 9px', borderRadius:999,
          background:`${c}10`, border:`1px solid ${c}22`,
          width:'fit-content', marginBottom:14,
        }}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <rect x="1" y="1.5" width="7" height="5.5" rx="1.2" stroke={c} strokeWidth="1.1"/>
            <path d="M2.5 3.5h4M2.5 5h2.5" stroke={c} strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize:11, fontWeight:800, color:c }}>
            {subject.card_count} card{subject.card_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Arrow */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, color:'var(--text-tert)', fontWeight:600 }}>
            {subject.topic_count ? `${subject.topic_count} topic${subject.topic_count !== 1 ? 's' : ''}` : 'Start studying →'}
          </span>
          <div style={{ width:26, height:26, borderRadius:8, background:`${c}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 5.5h7M6 2l3 3.5-3 3.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </button>
  )
}

function SubjectsView({ subjects, loading, onSelect }) {
  const allProgress = readProgress()

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <SubjectHero/>

      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>Choose a Subject</div>
            <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:2 }}>Tap any subject to pick a topic</div>
          </div>
          <div style={{ padding:'4px 10px', borderRadius:999, background:`${PURPLE}10`, border:`1px solid ${PURPLE}20` }}>
            <span style={{ fontSize:11, fontWeight:800, color:PURPLE }}>{subjects.length} subjects</span>
          </div>
        </div>

        {loading ? <Spinner/> : subjects.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 24px', background:'var(--bg-card)', borderRadius:20, border:'1.5px solid var(--border)' }}>
            <div style={{ fontSize:44, marginBottom:14 }}>🃏</div>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', marginBottom:8 }}>No flashcards yet</div>
            <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6 }}>Flashcards are being added for all subjects. Check back soon.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {subjects.map(sub => (
              <SubjectCard key={sub.id} subject={sub} progress={allProgress} onClick={onSelect}/>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW 2 — TOPIC LIST
// ─────────────────────────────────────────────────────────────────────────────

function TopicCard({ topic, color, topicProgress, onClick, onContinue }) {
  const [hover, setHover] = useState(false)
  const prog        = topicProgress ?? {}
  const done        = prog.done ?? 0
  const total       = prog.total ?? topic.card_count
  const completed   = prog.completed ?? false
  const lastStudied = prog.lastStudied
  const cardIndex   = prog.cardIndex ?? 0
  const pct         = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  const inProgress  = !!lastStudied && !completed && cardIndex > 0

  const relativeTime = lastStudied ? (() => {
    const mins = Math.floor((Date.now() - lastStudied) / 60000)
    if (mins < 2)   return 'Just now'
    if (mins < 60)  return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)   return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  })() : null

  return (
    <div style={{
      borderRadius:16, overflow:'hidden',
      border: completed
        ? `1.5px solid ${color}35`
        : inProgress ? `1.5px solid ${color}40` : '1.5px solid var(--border)',
      background: completed ? `${color}05` : 'var(--bg-card)',
      boxShadow: inProgress ? `0 2px 12px ${color}10` : '0 1px 4px rgba(6,42,120,.05)',
      transition:'all .13s',
    }}>
      {/* Main row — tapping anywhere starts from beginning */}
      <button
        onClick={() => onClick(topic)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:14,
          padding:'14px 16px',
          background: hover ? `${color}04` : 'transparent',
          cursor:'pointer', textAlign:'left', fontFamily:'inherit',
          border:'none', transition:'background .12s',
        }}
      >
        {/* Left icon */}
        <div style={{
          width:42, height:42, borderRadius:13, flexShrink:0,
          background: completed ? `${color}18` : inProgress ? `${color}14` : `${color}10`,
          border: `1.5px solid ${color}20`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {completed ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" fill={color} opacity=".15"/>
              <path d="M5.5 9l2.5 2.5 5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : inProgress ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.4"/>
              <path d="M6 8h4M10 8l-2-2M10 8l-2 2" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="9" rx="2" stroke={color} strokeWidth="1.4"/>
              <path d="M5 6h6M5 8h4" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M4 13l4-2.5 4 2.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {topic.name}
            </div>
            {completed && (
              <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${color}15`, color, border:`1px solid ${color}30`, flexShrink:0 }}>
                Done ✓
              </span>
            )}
            {inProgress && (
              <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${color}12`, color, border:`1px solid ${color}25`, flexShrink:0 }}>
                In progress
              </span>
            )}
          </div>

          {/* Progress bar */}
          {lastStudied && (
            <div style={{ marginBottom:5 }}>
              <div style={{ height:4, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:`linear-gradient(90deg,${color},${color}99)`, transition:'width .4s ease' }}/>
              </div>
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--text-tert)', fontWeight:600 }}>
              {topic.card_count} card{topic.card_count !== 1 ? 's' : ''}
            </span>
            {lastStudied && (
              <>
                <span style={{ fontSize:10, color:'var(--border-strong)' }}>·</span>
                <span style={{ fontSize:11, color:'var(--text-tert)' }}>{pct}% done</span>
                <span style={{ fontSize:10, color:'var(--border-strong)' }}>·</span>
                <span style={{ fontSize:10, color:'var(--text-tert)' }}>{relativeTime}</span>
              </>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0, opacity:.3 }}>
          <path d="M5 3l4 4-4 4" stroke="var(--text-prim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Continue strip — only shows when in progress */}
      {inProgress && (
        <button
          onClick={e => { e.stopPropagation(); onContinue(topic, cardIndex) }}
          style={{
            width:'100%', padding:'10px 16px',
            borderTop:`1px solid ${color}20`,
            background:`${color}08`,
            border:'none', borderTop:`1px solid ${color}20`,
            cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke={color} strokeWidth="1.3"/>
              <path d="M5 6.5h4M7 4.5l2 2-2 2" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:12, fontWeight:800, color }}>
              Continue — card {cardIndex + 1} of {total}
            </span>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

function TopicsView({ subject, topics, loading, progress, onSelect, onContinue, onBack }) {
  const c  = subCol(subject.name)
  const em = subIcon(subject.name)

  const completed = topics.filter(t => progress[t.id]?.completed).length
  const started   = topics.filter(t => progress[t.id]?.lastStudied && !progress[t.id]?.completed).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <BackBtn onClick={onBack}/>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:13, background:`${c}14`, border:`1.5px solid ${c}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
            {em}
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:c, marginBottom:1 }}>
              {subject.name}
            </div>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>
              Select a Topic
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {topics.length > 0 && (
        <div style={{ display:'flex', gap:10, marginBottom:18 }}>
          {[
            { label:'Topics', val:topics.length, color:'var(--text-tert)' },
            { label:'Done', val:completed, color:GREEN },
            { label:'In progress', val:started, color:GOLD },
          ].map(s => (
            <div key={s.label} style={{ flex:1, padding:'10px 12px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:900, color:s.color, letterSpacing:'-.02em' }}>{s.val}</div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', marginTop:1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Topic list */}
      {loading ? <Spinner color={c}/> : topics.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 24px', background:'var(--bg-card)', borderRadius:20, border:'1.5px solid var(--border)' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No flashcards yet</div>
          <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6 }}>
            Flashcards for {subject.name} are coming soon.
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {topics.map(t => (
            <TopicCard
              key={t.id}
              topic={t}
              color={c}
              topicProgress={progress[t.id]}
              onClick={onSelect}
              onContinue={onContinue}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW 3 — STUDY MODE
// ─────────────────────────────────────────────────────────────────────────────

function FlipCard({ card, flipped, onFlip }) {
  const dc = DIFF_COLOR[card.difficulty] ?? '#94a3b8'
  const db = DIFF_BG[card.difficulty]   ?? 'rgba(148,163,184,.1)'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Difficulty pill */}
      <div style={{ display:'flex', justifyContent:'center' }}>
        <span style={{ fontSize:10, fontWeight:800, padding:'3px 12px', borderRadius:999, color:dc, background:db, border:`1px solid ${dc}40`, textTransform:'capitalize', letterSpacing:'.04em' }}>
          {card.difficulty ?? 'medium'}
        </span>
      </div>

      {/* Card front (question) */}
      <div style={{
        borderRadius:22, background:'var(--bg-card)',
        border:'1.5px solid var(--border)',
        padding:'30px 24px', minHeight:180,
        display:'flex', flexDirection:'column', justifyContent:'center',
        boxShadow:'0 6px 24px rgba(6,42,120,.09)',
        position:'relative', overflow:'hidden',
      }}>
        {/* Decorative corner dot */}
        <div style={{ position:'absolute', top:14, right:14, width:8, height:8, borderRadius:'50%', background:`${PURPLE}30` }}/>
        <div style={{ position:'absolute', top:22, right:22, width:5, height:5, borderRadius:'50%', background:`${PURPLE}18` }}/>

        {/* SVG illustration */}
        {card.svg_code && (
          <div style={{ marginBottom:16, borderRadius:14, overflow:'hidden', background:'#fff', border:'1px solid var(--border)', maxHeight:180, display:'flex', justifyContent:'center', alignItems:'center' }}
            dangerouslySetInnerHTML={{ __html: card.svg_code.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+="[^"]*"/gi,'') }}/>
        )}

        <div style={{ fontSize:18, fontWeight:800, color:'var(--text-prim)', lineHeight:1.55, textAlign:'center', letterSpacing:'-.01em' }}>
          {card.front_text}
        </div>


      </div>

      {/* Answer section */}
      {flipped ? (
        <div style={{
          borderRadius:20, border:`1.5px solid ${GREEN}35`,
          background:`${GREEN}06`, padding:'22px 24px',
          animation:'fc-fadeup .22s ease',
        }}>
          <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.12em', color:GREEN, marginBottom:10 }}>
            Answer
          </div>
          <div style={{ fontSize:15, color:'var(--text-prim)', lineHeight:1.7, fontWeight:600, textAlign:'center' }}>
            {card.back_text}
          </div>

        </div>
      ) : (
        <button
          onClick={onFlip}
          style={{
            width:'100%', padding:'16px', borderRadius:18,
            border:'1.5px dashed var(--border-strong)',
            background:'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            cursor:'pointer', fontFamily:'inherit',
            transition:'all .13s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9a6 6 0 1012 0 6 6 0 00-12 0" stroke="var(--text-tert)" strokeWidth="1.5"/>
            <path d="M9 6v3l2 1.5" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text-tert)' }}>Flip to see answer</span>
        </button>
      )}
    </div>
  )
}

function StudyResults({ cards, known, learning, topicName, subjectColor, onRestart, onBack }) {
  const total    = cards.length
  const knownN   = known.size
  const learnN   = learning.size
  const skippedN = total - knownN - learnN
  const pct      = total > 0 ? Math.round((knownN / total) * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
        <BackBtn onClick={onBack}/>
        <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Session complete</div>
      </div>

      {/* Result card */}
      <div style={{ borderRadius:22, background:'var(--bg-card)', border:'1.5px solid var(--border)', padding:'28px 24px', textAlign:'center', boxShadow:'0 4px 20px rgba(6,42,120,.08)' }}>
        {/* Emoji + score */}
        <div style={{ fontSize:52, marginBottom:12 }}>
          {pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖'}
        </div>
        <div style={{ fontSize:13, color:'var(--text-tert)', marginBottom:4 }}>{topicName}</div>
        <div style={{ fontSize:42, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.04em', lineHeight:1 }}>
          {pct}<span style={{ fontSize:22, color:'var(--text-tert)', fontWeight:700 }}>%</span>
        </div>
        <div style={{ fontSize:13, color:'var(--text-tert)', marginTop:4, marginBottom:24 }}>confidence score</div>

        {/* Stat boxes */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:24 }}>
          {[
            { label:'Got it', count:knownN, color:GREEN, emoji:'✓' },
            { label:'Still learning', count:learnN, color:GOLD, emoji:'↺' },
            { label:'Skipped', count:skippedN, color:'var(--text-tert)', emoji:'→' },
          ].map(r => (
            <div key={r.label} style={{ borderRadius:14, background:`${r.color === 'var(--text-tert)' ? 'rgba(0,0,0,.03)' : r.color + '0E'}`, border:`1px solid ${r.color === 'var(--text-tert)' ? 'var(--border)' : r.color + '25'}`, padding:'14px 6px' }}>
              <div style={{ fontSize:20, fontWeight:900, color:r.color, marginBottom:2 }}>{r.count}</div>
              <div style={{ fontSize:9, fontWeight:700, color:r.color, lineHeight:1.3, opacity:r.color === 'var(--text-tert)' ? .6 : 1 }}>{r.label}</div>
            </div>
          ))}
        </div>

        {/* Motivational message */}
        <div style={{ padding:'12px 14px', borderRadius:14, background:`${subjectColor}06`, border:`1px solid ${subjectColor}18`, marginBottom:20, fontSize:13, color:'var(--text-tert)', lineHeight:1.5 }}>
          {pct >= 80
            ? '🌟 Excellent work! You\'re mastering this topic.'
            : pct >= 50
            ? '💪 Good progress! A second pass will lock these in.'
            : '📖 Keep going — each review makes it sticker.'}
        </div>

        <button onClick={onRestart} style={{ width:'100%', padding:'15px', borderRadius:15, border:'none', background:subjectColor, color:'#fff', fontSize:14, fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 0 ${subjectColor}88, 0 8px 20px ${subjectColor}30`, marginBottom:10 }}>
          Study again →
        </button>
        <button onClick={onBack} style={{ width:'100%', padding:'13px', borderRadius:15, border:'1.5px solid var(--border)', background:'transparent', color:'var(--text-tert)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          Back to topics
        </button>
      </div>
    </div>
  )
}

function StudyView({ cards, topic, subject, onBack, startIndex = 0 }) {
  const [index,    setIndex]    = useState(startIndex)
  const [flipped,  setFlipped]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [known,    setKnown]    = useState(new Set())
  const [learning, setLearning] = useState(new Set())

  const subjectColor = subCol(subject.name)
  const card = cards[index]

  function advance(outcome) {
    const newKnown    = new Set(known)
    const newLearning = new Set(learning)
    if (outcome === 'known')    newKnown.add(index)
    if (outcome === 'learning') newLearning.add(index)
    setKnown(newKnown)
    setLearning(newLearning)

    // Save progress incrementally
    const doneCount = newKnown.size
    const completed = index + 1 >= cards.length && doneCount >= cards.length
    markTopicProgress(topic.id, doneCount, cards.length, completed, index + 1 >= cards.length ? 0 : index + 1)

    if (index + 1 >= cards.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setFlipped(false)
    }
  }

  function restart() {
    setIndex(0); setFlipped(false); setDone(false)
    setKnown(new Set()); setLearning(new Set())
    markTopicProgress(topic.id, 0, cards.length, false, 0)
  }

  if (done) {
    return (
      <StudyResults
        cards={cards}
        known={known}
        learning={learning}
        topicName={topic.name}
        subjectColor={subjectColor}
        onRestart={restart}
        onBack={onBack}
      />
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <style>{`@keyframes fc-fadeup{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <BackBtn onClick={onBack}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:subjectColor, marginBottom:1 }}>
            {subject.name}
          </div>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {topic.name}
          </div>
        </div>
      </div>

      {/* Flip card */}
      <FlipCard card={card} flipped={flipped} onFlip={() => setFlipped(true)}/>

      {/* Action buttons — shown after flip */}
      {flipped ? (
        <div style={{ display:'flex', gap:10, marginTop:16, animation:'fc-fadeup .2s ease' }}>
          <button
            onClick={() => { if (index > 0) { setIndex(i => i - 1); setFlipped(false) } }}
            disabled={index === 0}
            style={{ flex:1, padding:'14px 0', borderRadius:16, border:'1.5px solid var(--border)', background:'transparent', color: index === 0 ? 'var(--text-tert)' : 'var(--text-prim)', fontSize:13, fontWeight:800, cursor: index === 0 ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity: index === 0 ? 0.4 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Previous
          </button>
          <button
            onClick={() => advance('known')}
            style={{ flex:1, padding:'14px 0', borderRadius:16, border:'none', background:GREEN, color:'#fff', fontSize:13, fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 0 #15803d,0 6px 16px ${GREEN}30`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Got it!
          </button>
        </div>
      ) : (
        <button
          onClick={() => advance('skipped')}
          style={{ marginTop:10, width:'100%', padding:'11px', borderRadius:14, border:'1.5px solid var(--border)', background:'transparent', color:'var(--text-tert)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
        >
          Skip this card
        </button>
      )}

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const { dark } = useTheme()

  // Navigation state
  const [view,          setView]          = useState('subjects')   // 'subjects' | 'topics' | 'study'
  const [subjects,      setSubjects]      = useState([])
  const [activeSubject, setActiveSubject] = useState(null)
  const [topics,        setTopics]        = useState([])
  const [activeTopic,   setActiveTopic]   = useState(null)
  const [cards,         setCards]         = useState([])
  const [startIndex,    setStartIndex]    = useState(0)   // card to resume from

  // Loading states
  const [loadingSubs,    setLoadingSubs]    = useState(true)
  const [loadingTopics,  setLoadingTopics]  = useState(false)
  const [loadingCards,   setLoadingCards]   = useState(false)

  // Progress (read once on mount, re-read on topic view)
  const [progress, setProgress] = useState({})

  useEffect(() => {
    setProgress(readProgress())
  }, [])

  // Load subjects on mount
  useEffect(() => {
    fetch('/api/student/flashcards')
      .then(r => r.json())
      .then(d => setSubjects(d.subjects ?? []))
      .catch(() => setSubjects([]))
      .finally(() => setLoadingSubs(false))
  }, [])

  async function selectSubject(subject) {
    setActiveSubject(subject)
    setView('topics')
    setTopics([])
    setLoadingTopics(true)
    setProgress(readProgress())   // refresh progress
    try {
      const r = await fetch(`/api/student/flashcards?subjectName=${encodeURIComponent(subject.name)}`)
      const d = await r.json()
      setTopics(d.topics ?? [])
    } catch { setTopics([]) }
    setLoadingTopics(false)
  }

  async function selectTopic(topic) {
    setActiveTopic(topic)
    setCards([])
    setLoadingCards(true)
    setView('study')
    try {
      const r = await fetch(`/api/student/flashcards?topicId=${topic.id}`)
      const d = await r.json()
      setCards(d.cards ?? [])
    } catch { setCards([]) }
    setLoadingCards(false)
  }

  // Resume from a specific card index (triggered by Continue button)
  async function selectTopicFrom(topic, cardIndex) {
    setStartIndex(cardIndex)
    await selectTopic(topic)
  }

  function backToSubjects() {
    setView('subjects')
    setActiveSubject(null)
    setTopics([])
  }

  function backToTopics() {
    setView('topics')
    setActiveTopic(null)
    setCards([])
    setStartIndex(0)
    setProgress(readProgress())   // re-read so progress updates are reflected
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes fc-spin{to{transform:rotate(360deg)}} @keyframes fc-fadeup{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box}`}</style>
      <AppBg dark={dark}/>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'0 0 100px', position:'relative', zIndex:1 }}>

        {/* Breadcrumb — hidden in study mode (it has its own header) */}
        {view !== 'study' && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20, flexWrap:'wrap' }}>
            <Link href="/student/learn" style={{ textDecoration:'none' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>Learn</span>
            </Link>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".4"/></svg>
            {view === 'subjects' ? (
              <span style={{ fontSize:12, fontWeight:800, color:PURPLE }}>Flashcards</span>
            ) : (
              <>
                <button onClick={backToSubjects} style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>Flashcards</button>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".4"/></svg>
                <span style={{ fontSize:12, fontWeight:800, color:subCol(activeSubject?.name ?? '') }}>{activeSubject?.name}</span>
              </>
            )}
          </div>
        )}

        {/* Views */}
        {view === 'subjects' && (
          <SubjectsView
            subjects={subjects}
            loading={loadingSubs}
            onSelect={selectSubject}
          />
        )}

        {view === 'topics' && activeSubject && (
          <TopicsView
            subject={activeSubject}
            topics={topics}
            loading={loadingTopics}
            progress={progress}
            onSelect={topic => { setStartIndex(0); selectTopic(topic) }}
            onContinue={selectTopicFrom}
            onBack={backToSubjects}
          />
        )}

        {view === 'study' && activeTopic && activeSubject && (
          loadingCards ? (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <BackBtn onClick={backToTopics}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)' }}>Loading cards…</div>
                </div>
              </div>
              <Spinner color={subCol(activeSubject.name)}/>
            </div>
          ) : cards.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 24px', background:'var(--bg-card)', borderRadius:20, border:'1.5px solid var(--border)' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No cards found</div>
              <button onClick={backToTopics} style={{ marginTop:16, padding:'12px 24px', borderRadius:14, border:'none', background:BLUE, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>Back to topics</button>
            </div>
          ) : (
            <StudyView
              cards={cards}
              topic={activeTopic}
              subject={activeSubject}
              onBack={backToTopics}
              startIndex={startIndex}
            />
          )
        )}
      </div>
    </>
  )
}