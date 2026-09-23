'use client'
// src/app/demo/page.js
// ─────────────────────────────────────────────────────────────────────────────
// ExamPrep Demo — /demo
//
// A self-contained experience for teachers and school administrators.
// Shares the URL directly during sales conversations.
//
// Rules:
//   • No auth, no profile, no Supabase writes of any kind
//   • Questions come from src/data/demo/{waec,jamb}-demo-questions.json
//     via src/lib/demoQuestions.js (static files, no DB/API hit)
//   • All practice modes + battle work exactly like the real app
//   • Capped at 5 questions per session
//   • XP numbers are shown (makes the experience feel complete) but not saved
//   • Demo banner is always visible
//
// Architecture:
//   The page is a state machine. Phase drives what is rendered:
//     'home'       — mode/subject/exam selector
//     'session'    — practice session (uses real QuestionCard component)
//     'battle-countdown' — 3-2-1 countdown before battle
//     'battle'     — battle session (mirrors real battle UI)
//     'battle-review'    — post-battle answer review
//     'results'    — score screen with CTA
//     'battle-results'   — battle results with CTA
//
//   No routing, no sessionStorage dependency. All state lives here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, forwardRef } from 'react'
import { DEMO_CONFIG, getDemoQuestions, demoSubjectHasQuestions } from '@/lib/demoQuestions'
import { createComputerOpponent } from '@/lib/battleAI'
import { QuestionCard }    from '@/components/session/QuestionCard'
import { ExplanationBlock } from '@/components/session/ExplanationBlock'
import { MathText }         from '@/lib/mathRenderer'
import {
  normaliseOptions,
  checkCorrect,
  LETTERS,
  BLUE, CYAN, GREEN, RED, GOLD, ORANGE, PURPLE,
} from '@/components/session/SessionUtils'

// First subject that actually has questions, so the demo never opens on a
// greyed-out subject when some subjects haven't been filled yet.
function firstAvailableSubject(exam) {
  const list = DEMO_CONFIG[exam]?.subjects ?? []
  return list.find(s => demoSubjectHasQuestions(exam, s)) ?? list[0] ?? ''
}

// ── Brand ─────────────────────────────────────────────────────────────────────
const NAVY  = '#12195A'
const NAVY2 = '#1A2468'
const GOLD2 = '#CC8F00'

// ── Demo constants ─────────────────────────────────────────────────────────────
const DEMO_COUNT   = 5    // questions per session — locked
const WHATSAPP_URL = 'https://wa.me/2348166528437?text=Hi%2C%20I%27m%20interested%20in%20ExamPrep%20for%20my%20school'
const SIGNUP_URL   = '/onboarding?mode=signup'          // adjust if your signup URL differs
const AMBASSADOR_URL = '/ambassador'    // adjust if you have a separate page

// ── Subject metadata ───────────────────────────────────────────────────────────
const SUBJ_ACCENT = {
  'English Language':'#a78bfa','Use of English':'#a78bfa',
  'Mathematics':'#FFB800','Biology':'#4ade80','Chemistry':'#9b7ae0','Physics':'#18B7F2',
  'Economics':'#f97316','Government':'#f43f5e','Accounting':'#14b8a6',
  'default':'#9b7ae0',
}
const SUBJ_ICON = {
  'English Language':'📖','Use of English':'📖',
  'Mathematics':'📐','Biology':'🧬','Chemistry':'⚗️','Physics':'⚡',
  'Economics':'📈','Government':'🏛️','Accounting':'🧾',
  'default':'📝',
}
// "Principles of Accounts" / "Financial Accounting" share the Accounting look
const subjKey   = n => (/account/i.test(n ?? '') ? 'Accounting' : n)
const getAccent = n => SUBJ_ACCENT[subjKey(n)] ?? SUBJ_ACCENT.default
const getIcon   = n => SUBJ_ICON[subjKey(n)]   ?? SUBJ_ICON.default

// Battle tile colours
const TILE = [
  { bg:'#3B82F6', press:'#1D4ED8' },
  { bg:'#22C55E', press:'#15803D' },
  { bg:'#F97316', press:'#C2410C' },
  { bg:'#8B5CF6', press:'#6D28D9' },
]

// ── Demo Banner ────────────────────────────────────────────────────────────────
// Fixed at top of every screen. Always visible.
function DemoBanner({ onCTA }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 9999,
      background: `linear-gradient(90deg, ${NAVY} 0%, #1264E5 100%)`,
      padding: '0 16px',
      height: 44,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 2px 12px rgba(6,42,120,.35)',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15 }}>🎓</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.85)' }}>
          Demo Mode — <span style={{ color: GOLD }}>Teacher Preview</span>
        </span>
      </div>
      <button
        onClick={onCTA}
        style={{
          background: GOLD, border: 'none', borderRadius: 8,
          padding: '5px 12px', fontSize: 11, fontWeight: 900,
          color: NAVY, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: `0 2px 0 ${GOLD2}`,
          whiteSpace: 'nowrap',
        }}
      >
        Get Your School →
      </button>
    </div>
  )
}

// ── Battle background (matches real battle page) ───────────────────────────────
function BattleBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <img
        src="/images/battle/session-bg.png"
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center bottom' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,18,80,.55) 0%, rgba(8,18,80,.38) 50%, rgba(8,18,80,.65) 100%)' }} />
    </div>
  )
}

// ── 3-2-1 Countdown (matches real battle) ─────────────────────────────────────
function Countdown({ onDone }) {
  const [n, setN] = useState(3)
  useEffect(() => {
    const t1 = setTimeout(() => setN(2), 900)
    const t2 = setTimeout(() => setN(1), 1800)
    const t3 = setTimeout(onDone, 2500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <BattleBg />
      <div style={{ fontSize: 110, fontWeight: 900, color: '#fff', lineHeight: 1, animation: 'cdpop .4s ease', position: 'relative', zIndex: 5 }}>{n}</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.12em', position: 'relative', zIndex: 5 }}>Get ready!</div>
      <style>{`@keyframes cdpop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

// ── Timer Ring (matches real battle) ──────────────────────────────────────────
function TimerRing({ secs, onTimeUp, revealed }) {
  const [rem, setRem] = useState(secs)
  const start = useRef(Date.now())
  const fired = useRef(false)
  useEffect(() => {
    if (revealed) return
    const id = setInterval(() => {
      const left = Math.max(0, secs - (Date.now() - start.current) / 1000)
      setRem(left)
      if (left <= 0 && !fired.current) { fired.current = true; clearInterval(id); onTimeUp() }
    }, 100)
    return () => clearInterval(id)
  }, [secs, onTimeUp, revealed])
  const pct  = rem / secs
  const r    = 13, circ = 2 * Math.PI * r
  const col  = pct > .5 ? GREEN : pct > .25 ? GOLD : RED
  return (
    <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
      <svg width="34" height="34" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5" />
        <circle cx="17" cy="17" r={r} fill="none" stroke={col} strokeWidth="2.5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset .1s linear, stroke .3s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{Math.ceil(rem)}</div>
    </div>
  )
}

// ── VS Header (matches real battle exactly) ────────────────────────────────────
function VSHeader({ qIndex, total, studentScore, cpuScore, studentDots, cpuDots, onMenu, floatSide, floatKey, cpuAnswered }) {
  const AV   = 62
  const SKEW = 18
  return (
    <div style={{ background: `linear-gradient(180deg,#0B1138 0%,${NAVY2} 100%)`, flexShrink: 0, zIndex: 100, boxShadow: `0 4px 0 rgba(3,10,50,.65),0 8px 24px rgba(0,0,0,.45)`, paddingTop: 'env(safe-area-inset-top,0px)' }}>
      <style>{`
        @keyframes tdot{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}
        @keyframes floatup{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-36px);opacity:0}}
        .vsh-util{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;}
        .vsh-vs{display:flex;align-items:center;padding:0 10px 14px;gap:0;position:relative;}
        @media(min-width:640px){
          .vsh-util{padding:12px 24px 10px;}
          .vsh-vs{padding:0 24px 16px;}
        }
      `}</style>
      {/* Utility row */}
      <div className="vsh-util">
        <button onClick={onMenu} style={{ background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.18)', borderRadius: 9, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><rect y="0" width="14" height="2" rx="1" fill="white" /><rect y="5" width="10" height="2" rx="1" fill="white" /><rect y="10" width="14" height="2" rx="1" fill="white" /></svg>
          Menu
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>🚩</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,.7)', fontVariantNumeric: 'tabular-nums' }}>Q {qIndex + 1}<span style={{ color: 'rgba(255,255,255,.35)' }}>/{total}</span></span>
        </div>
      </div>
      {/* VS strip */}
      <div className="vsh-vs">
        {/* Student panel */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#1D4ED8)', clipPath: `polygon(0 0, calc(100% - ${SKEW}px) 0, 100% 100%, 0 100%)`, padding: `10px ${SKEW + 10}px 10px 14px`, borderRadius: '14px 0 0 14px', border: '1.5px solid rgba(255,255,255,.15)', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to bottom,rgba(255,255,255,.15),transparent)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.6)', marginBottom: 3 }}>YOU</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 0 rgba(0,0,0,.25)' }}>{studentScore}</div>
            <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
              {Array.from({ length: total }, (_, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < studentDots ? GOLD : 'rgba(255,255,255,.25)', transition: 'background .3s' }} />
              ))}
            </div>
          </div>
          {/* Float +10 */}
          {floatSide === 'student' && (
            <div key={floatKey} style={{ position: 'absolute', top: 0, right: SKEW + 4, fontSize: 16, fontWeight: 900, color: GOLD, textShadow: '0 2px 8px rgba(0,0,0,.5)', animation: 'floatup .9s ease forwards', pointerEvents: 'none', zIndex: 10 }}>+10</div>
          )}
        </div>
        {/* VS badge */}
        <div style={{ width: AV + 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 5, gap: 4 }}>
          <div style={{ width: AV, height: AV, borderRadius: '50%', border: `3px solid ${GOLD}`, background: `linear-gradient(135deg,#0F1D6B,#1A2A8C)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px rgba(255,184,0,.2),0 6px 20px rgba(0,0,0,.4)`, position: 'relative', zIndex: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 900, fontStyle: 'italic', color: GOLD, textShadow: `0 0 8px rgba(255,184,0,.6),0 1px 0 ${GOLD2}`, letterSpacing: '-.02em' }}>VS</span>
            <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD, animation: `tdot 1.2s ${i * .2}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
        {/* CPU panel */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <div style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9)', clipPath: `polygon(${SKEW}px 0, 100% 0, 100% 100%, 0 100%)`, padding: `10px 14px 10px ${SKEW + 10}px`, borderRadius: '0 14px 14px 0', border: '1.5px solid rgba(255,255,255,.15)', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.2)', position: 'relative', overflow: 'hidden', textAlign: 'right' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to bottom,rgba(255,255,255,.15),transparent)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.6)', marginBottom: 3 }}>COMPUTER</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 0 rgba(0,0,0,.25)' }}>{cpuScore}</div>
            <div style={{ display: 'flex', gap: 3, marginTop: 5, justifyContent: 'flex-end' }}>
              {Array.from({ length: total }, (_, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < cpuDots ? '#C4B5FD' : 'rgba(255,255,255,.25)', transition: 'background .3s' }} />
              ))}
            </div>
            {cpuAnswered && (
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.6)', background: 'rgba(0,0,0,.3)', borderRadius: 999, padding: '2px 8px' }}>Answered ✓</div>
              </div>
            )}
          </div>
          {/* Float +10 for CPU */}
          {floatSide === 'cpu' && (
            <div key={floatKey} style={{ position: 'absolute', top: 0, left: SKEW + 4, fontSize: 16, fontWeight: 900, color: '#C4B5FD', textShadow: '0 2px 8px rgba(0,0,0,.5)', animation: 'floatup .9s ease forwards', pointerEvents: 'none', zIndex: 10 }}>+10</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Pause Menu (matches real battle) ──────────────────────────────────────────
function PauseMenu({ onResume, onQuit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(18,25,90,.8)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '24px 20px', width: '100%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: NAVY2, marginBottom: 4 }}>⏸ Game Paused</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>Battle is waiting for you</div>
        <button onClick={onResume} style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: NAVY2, color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 5px 0 #031548', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          ▶ Resume Battle
        </button>
        <button onClick={onQuit} style={{ width: '100%', padding: '13px', borderRadius: 14, border: '2px solid rgba(220,38,38,.2)', background: '#FEF2F2', color: '#B91C1C', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
          🚪 Back to Demo Home
        </button>
      </div>
    </div>
  )
}

// ── Battle Explanation Sheet (matches real battle) ─────────────────────────────
function BattleExplanationSheet({ question, isCorrect, onClose }) {
  if (!question?.explanation) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(6,12,44,.88)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
      <div style={{ flex: 1, width: '100%' }} onClick={onClose} />
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '88dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -12px 50px rgba(0,0,0,.5)', animation: 'modalin .28s cubic-bezier(.32,.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0, background: NAVY }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.25)' }} />
        </div>
        <div style={{ background: `linear-gradient(135deg,${NAVY},#1264E5)`, padding: '14px 20px 16px', flexShrink: 0, borderBottom: `3px solid ${GOLD}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: isCorrect ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)', border: `2px solid ${isCorrect ? 'rgba(74,222,128,.5)' : 'rgba(248,113,113,.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: isCorrect ? '#4ade80' : '#f87171' }}>{isCorrect ? '✓' : '✗'}</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Explanation</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: isCorrect ? '#4ade80' : '#f87171', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{isCorrect ? 'Correct!' : 'Incorrect'}</div>
            </div>
            <button onClick={onClose} style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 9, border: '1.5px solid rgba(255,255,255,.22)', background: 'rgba(255,255,255,.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.7)', fontSize: 16, fontFamily: 'inherit' }}>×</button>
          </div>
        </div>
        <div style={{ height: 3, background: `linear-gradient(90deg,${GOLD},#FF6A00,${GOLD})`, flexShrink: 0 }} />
        <div style={{ overflowY: 'auto', padding: '20px 20px 16px', flex: 1, background: '#fff' }}>
          <ExplanationBlock explanation={question.explanation} isCorrect={isCorrect} dark={false} mobileModal={false} question={question} />
        </div>
        <div style={{ padding: '12px 20px 24px', flexShrink: 0, background: '#fff', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', background: NAVY2, color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', boxShadow: `0 5px 0 #031548` }}>
            Got it ✓
          </button>
        </div>
      </div>
      <style>{`@keyframes modalin{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}

// ── Battle Review (matches real battle) ───────────────────────────────────────
function BattleReview({ questions, answersLog, cpuChoices, subjectName, onDone }) {
  const [idx, setIdx] = useState(0)
  const q        = questions[idx]
  const log      = answersLog[idx] ?? {}
  const opts     = q ? normaliseOptions(q.options) : []
  const selIdx   = log.selectedIdx ?? null
  const cpuAns   = cpuChoices[idx]
  const cpuIdx   = cpuAns ? opts.indexOf(cpuAns) : -1
  const isCorrect = log.isCorrect ?? false
  const skipped   = selIdx === null
  const correctIdx = opts.findIndex((_, i) => checkCorrect(opts, i, q?.correct_answer))
  const selectedKey = selIdx !== null ? (LETTERS[selIdx] ?? null) : null

  const sh    = `0 5px 0 rgba(26,36,104,.2),0 7px 18px rgba(26,36,104,.1)`
  const shPrs = `0 1px 0 rgba(26,36,104,.2)`
  const total = questions.length

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <BattleBg />
      <div style={{ background: `linear-gradient(180deg,${NAVY} 0%,#2235C0 100%)`, padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top,0px) + 12px)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,.7)' }}>Review · Q{idx + 1}/{total}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: GOLD }}>{subjectName}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 5, padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 12, background: '#D5E5F5' }}>
        {/* Question card */}
        <div style={{ position: 'relative', marginTop: 14 }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg,${GOLD},#FBBF24)`, border: '3px solid #D5E5F5', borderRadius: 999, padding: '5px 18px', fontSize: 12, fontWeight: 900, color: NAVY, whiteSpace: 'nowrap', boxShadow: `0 4px 0 ${GOLD2}`, zIndex: 5 }}>
            Q{idx + 1} of {total}
          </div>
          <div style={{ background: '#FAFBFF', border: '3px solid #1A2468', borderRadius: 22, boxShadow: '0 8px 0 rgba(26,36,104,.22)', position: 'relative', padding: '30px 18px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#1A1F5E', lineHeight: 1.65 }}>
              <MathText text={q?.text ?? q?.question_text ?? ''} as="span" className="" />
            </div>
          </div>
        </div>
        {/* Answer tiles */}
        <style>{`.brev-tiles{display:grid;grid-template-columns:1fr;gap:10px}@media(min-width:600px){.brev-tiles{grid-template-columns:1fr 1fr}}`}</style>
        <div className="brev-tiles">
          {opts.map((opt, i) => {
            const isC = i === correctIdx, isW = i === selIdx && !isCorrect
            const dim = !isC && !isW
            const bg  = isC ? '#16A34A' : isW ? '#DC2626' : TILE[i]?.bg ?? '#3B82F6'
            const sh  = isC ? '0 5px 0 #15803D' : isW ? '0 5px 0 #991B1B' : `0 5px 0 ${TILE[i]?.press ?? '#1D4ED8'}`
            const letter = isC ? '✓' : isW ? '✗' : LETTERS[i]
            const showYou = i === selIdx, showCpu = i === cpuIdx
            return (
              <div key={i} style={{ position: 'relative', borderRadius: 16, opacity: dim ? .3 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px 0 0', borderRadius: 16, background: bg, boxShadow: sh, minHeight: 56, border: `2px solid ${isC ? 'rgba(255,255,255,.4)' : 'transparent'}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff', margin: '0 10px', flexShrink: 0 }}>{letter}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    <MathText text={String(opt ?? '')} as="span" className="" />
                  </div>
                </div>
                {(showYou || showCpu) && (
                  <div style={{ position: 'absolute', top: -12, right: 8, display: 'flex', gap: 4, zIndex: 10 }}>
                    {showYou && <div style={{ background: '#3B5BDB', borderRadius: 999, padding: '2px 7px', fontSize: 9, fontWeight: 900, color: '#fff', border: '2px solid #fff' }}>You</div>}
                    {showCpu && <div style={{ background: '#6D28D9', borderRadius: 999, padding: '2px 7px', fontSize: 9, fontWeight: 900, color: '#fff', border: '2px solid #fff' }}>CPU</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {/* Result banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: isCorrect ? '#DCFCE7' : skipped ? '#F3F4F6' : '#FEE2E2', border: `2px solid ${isCorrect ? 'rgba(34,197,94,.3)' : skipped ? 'rgba(107,114,128,.2)' : 'rgba(239,68,68,.25)'}` }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: isCorrect ? '#16A34A' : skipped ? '#6B7280' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', flexShrink: 0 }}>
            {isCorrect ? '✓' : skipped ? '⏱' : '✗'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: isCorrect ? '#15803D' : skipped ? '#4B5563' : '#B91C1C' }}>
              {isCorrect ? 'Correct — +10 pts' : skipped ? "Time's up — 0 pts" : 'Wrong — 0 pts'}
            </div>
            {!isCorrect && !skipped && q?.correct_answer && (
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                Correct: <strong style={{ color: '#15803D' }}>{opts[correctIdx] ?? q.correct_answer}</strong>
              </div>
            )}
          </div>
        </div>
        {/* Explanation */}
        {q?.explanation && (
          <ExplanationBlock explanation={q.explanation} isCorrect={isCorrect} dark={false} mobileModal={false} selectedKey={selectedKey} question={q} />
        )}
        {/* Dot progress */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: '4px 0' }}>
          {questions.map((_, i) => (
            <div key={i} style={{ height: 7, borderRadius: 4, background: i < idx ? GOLD : i === idx ? NAVY2 : 'rgba(26,36,104,.15)', width: i === idx ? 20 : i < idx ? 14 : 8, transition: 'all .25s' }} />
          ))}
        </div>
        <div style={{ height: 'max(90px,calc(80px + env(safe-area-inset-bottom)))', flexShrink: 0 }} />
      </div>
      {/* Bottom nav */}
      <div style={{ flexShrink: 0, zIndex: 100, background: `linear-gradient(to top,#C8DDEF 65%,transparent)`, padding: '10px 14px', paddingBottom: 'max(14px,env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, margin: '0 auto' }}>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            style={{ padding: '13px', borderRadius: 999, border: '2.5px solid rgba(26,36,104,.2)', background: '#fff', color: NAVY2, fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? .4 : 1, boxShadow: idx === 0 ? 'none' : sh, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            onPointerDown={e => { e.currentTarget.style.boxShadow = shPrs }} onPointerUp={e => { e.currentTarget.style.boxShadow = sh }} onPointerLeave={e => { e.currentTarget.style.boxShadow = sh }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Previous
          </button>
          {idx < total - 1 ? (
            <button onClick={() => setIdx(i => i + 1)}
              style={{ padding: '13px', borderRadius: 999, border: 'none', background: NAVY2, color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: sh, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              onPointerDown={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = shPrs }}
              onPointerUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = sh }}
              onPointerLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = sh }}>
              Next <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : (
            <button onClick={onDone}
              style={{ padding: '13px', borderRadius: 999, border: 'none', background: `linear-gradient(135deg,${GOLD},#FBBF24)`, color: NAVY, fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: `0 5px 0 ${GOLD2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              🏁 Back to Results
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Battle Results (matches real battle, CTA replaces Home) ────────────────────
function BattleResultsScreen({ questions, answersLog, studentScore, cpuScore, xpAwarded, subjectName, onRematch, onNewBattle, onHome, onReview }) {
  const outcome      = studentScore > cpuScore ? 'win' : studentScore < cpuScore ? 'loss' : 'draw'
  const correctCount = answersLog.filter(a => a.isCorrect).length
  const weakTopics   = Object.entries(
    questions.reduce((acc, q, i) => { if (!answersLog[i]?.isCorrect) { const t = q.topic_name || 'General'; acc[t] = (acc[t] || 0) + 1 } return acc }, {})
  ).filter(([, c]) => c >= 2).map(([t]) => t)

  const OUTCOME = {
    win:  { icon: '🏆', label: 'You Won!',        sub: 'Outstanding performance!',         heroBg: `linear-gradient(160deg,#0C1240 0%,#1A2468 55%,#0D1A5C 100%)`, accentColor: GOLD },
    draw: { icon: '🤝', label: "It's a Draw!",    sub: 'A very close match!',              heroBg: 'linear-gradient(160deg,#0369A1 0%,#0E4C7A 55%,#083460 100%)',  accentColor: '#60A5FA' },
    loss: { icon: '🤖', label: 'Computer Won',    sub: "Keep practising — you'll get it!", heroBg: 'linear-gradient(160deg,#3B1280 0%,#5B21B6 55%,#2D0E6B 100%)', accentColor: '#C4B5FD' },
  }[outcome]

  const shBtn    = `0 5px 0 #031548,0 8px 20px rgba(26,36,104,.35)`
  const shBtnPrs = `0 1px 0 #031548`
  const pr = e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = shBtnPrs }
  const rl = e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = shBtn }

  const SKEW = 16
  const ScorePanel = ({ label, score, isWinner, side }) => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
      <div style={{
        flex: 1, minWidth: 0,
        background: isWinner ? (side === 'left' ? 'linear-gradient(160deg,#2A5CE8,#1A3FC0)' : 'linear-gradient(160deg,#7C3AED,#5B20C0)') : 'rgba(26,36,104,.08)',
        borderRadius: side === 'left' ? '14px 0 0 14px' : '0 14px 14px 0',
        clipPath: side === 'left' ? `polygon(0 0, calc(100% - ${SKEW}px) 0, 100% 100%, 0 100%)` : `polygon(${SKEW}px 0, 100% 0, 100% 100%, 0 100%)`,
        padding: side === 'left' ? `14px ${SKEW + 14}px 14px 18px` : `14px 18px 14px ${SKEW + 14}px`,
        textAlign: side === 'left' ? 'left' : 'right',
        border: `1.5px solid ${isWinner ? 'rgba(255,255,255,.2)' : 'rgba(26,36,104,.1)'}`,
        boxShadow: isWinner ? 'inset 0 -4px 0 rgba(0,0,0,.22)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        {isWinner && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to bottom,rgba(255,255,255,.16),transparent)', pointerEvents: 'none' }} />}
        <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', color: isWinner ? 'rgba(255,255,255,.7)' : '#9CA3AF', lineHeight: 1, marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: isWinner ? '#fff' : '#374151', textShadow: isWinner ? '0 2px 0 rgba(0,0,0,.25)' : 'none' }}>{score}</div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <BattleBg />
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {/* Hero */}
          <div style={{ background: OUTCOME.heroBg, padding: '52px 22px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 10 }}>{OUTCOME.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: OUTCOME.accentColor, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 6 }}>{OUTCOME.label}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>{OUTCOME.sub}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 26 }}>{subjectName} · {questions.length} questions</div>
            <svg viewBox="0 0 520 28" fill="none" preserveAspectRatio="none" style={{ display: 'block', width: '100%', marginBottom: -1 }}>
              <path d="M0 28 L0 14 Q65 0 130 10 Q195 20 260 8 Q325 0 390 12 Q455 22 520 10 L520 28 Z" fill="#D5E5F5" />
            </svg>
          </div>
          {/* Score panels */}
          <div style={{ background: '#D5E5F5', padding: '6px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              <ScorePanel label="YOU" score={studentScore} isWinner={outcome === 'win'} side="left" />
              <div style={{ flexShrink: 0, width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 900, fontStyle: 'italic', color: GOLD, textShadow: `0 0 10px rgba(255,184,0,.5)` }}>VS</span>
              </div>
              <ScorePanel label="COMPUTER" score={cpuScore} isWinner={outcome === 'loss'} side="right" />
            </div>
          </div>
          {/* Stats */}
          <div style={{ background: '#D5E5F5', padding: '12px 16px 0' }}>
            <div style={{ background: '#fff', border: '2.5px solid rgba(26,36,104,.12)', borderRadius: 20, padding: 14, boxShadow: '0 6px 0 rgba(26,36,104,.1)' }}>
              <div style={{ background: `linear-gradient(135deg,${GOLD},#FBBF24)`, borderRadius: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, boxShadow: `0 4px 0 ${GOLD2}` }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: NAVY }}>+{xpAwarded} XP earned this battle</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { num: correctCount, label: 'Correct', color: '#15803D', bg: '#DCFCE7', border: 'rgba(34,197,94,.2)' },
                  { num: questions.length - correctCount, label: 'Missed', color: '#B91C1C', bg: '#FEE2E2', border: 'rgba(239,68,68,.2)' },
                  { num: `${Math.round(correctCount / questions.length * 100)}%`, label: 'Accuracy', color: NAVY, bg: '#EEF2FF', border: 'rgba(26,36,104,.12)' },
                ].map(({ num, label, color, bg, border }) => (
                  <div key={label} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{num}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {weakTopics.length > 0 && (
            <div style={{ margin: '10px 16px 0', background: 'rgba(245,158,11,.08)', border: '1.5px solid rgba(245,158,11,.3)', borderRadius: 14, padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#92400E', marginBottom: 2 }}>Missed multiple on:</div>
                <div style={{ fontSize: 11, color: '#78350F', lineHeight: 1.5 }}>{weakTopics.join(' · ')}</div>
              </div>
            </div>
          )}
          {/* Actions */}
          <div style={{ padding: '14px 16px max(100px,calc(80px + env(safe-area-inset-bottom)))', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={onReview} style={{ width: '100%', padding: '15px', borderRadius: 18, border: '2.5px solid rgba(26,36,104,.2)', background: '#fff', color: NAVY2, fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: shBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }} onPointerDown={pr} onPointerUp={rl} onPointerLeave={rl}>
              📋 Review Answers
            </button>
            <button onClick={onRematch} style={{ width: '100%', padding: '15px', borderRadius: 18, border: 'none', background: `linear-gradient(135deg,${NAVY2},#2A3A8C)`, color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: shBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }} onPointerDown={pr} onPointerUp={rl} onPointerLeave={rl}>
              🔁 Rematch
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={onNewBattle} style={{ padding: '13px', borderRadius: 16, background: `linear-gradient(135deg,${GOLD},#FBBF24)`, border: 'none', color: NAVY, fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: `0 5px 0 ${GOLD2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onPointerDown={e => e.currentTarget.style.transform = 'translateY(2px)'} onPointerUp={e => e.currentTarget.style.transform = ''} onPointerLeave={e => e.currentTarget.style.transform = ''}>
                ⚔️ New Battle
              </button>
              <button onClick={onHome} style={{ padding: '13px', borderRadius: 16, background: '#fff', border: '2px solid rgba(26,36,104,.14)', color: NAVY2, fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 0 rgba(26,36,104,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onPointerDown={e => e.currentTarget.style.transform = 'translateY(2px)'} onPointerUp={e => e.currentTarget.style.transform = ''} onPointerLeave={e => e.currentTarget.style.transform = ''}>
                🏠 Demo Home
              </button>
            </div>
            {/* CTA */}
            <DemoCTA />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Practice Results (score + CTA) ────────────────────────────────────────────
function PracticeResults({ questions, answerMap, mode, subjectName, examType, onTryAnother, onHome }) {
  const total   = questions.length
  const correct = Object.values(answerMap).filter(a => a.isCorrect).length
  const xp      = correct * 10 + (mode === 'mock' ? 50 : 0)
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0

  const grade = pct >= 80 ? { icon: '🏆', label: 'Excellent!', color: GREEN }
    : pct >= 60 ? { icon: '✅', label: 'Good job!', color: BLUE }
    : pct >= 40 ? { icon: '📚', label: 'Keep going!', color: GOLD }
    : { icon: '💪', label: 'Keep practising!', color: RED }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', paddingTop: 44 }}>
      <div style={{ flex: 1, padding: '24px 20px 40px', maxWidth: 480, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Score hero */}
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1264E5 100%)`, borderRadius: 24, padding: '32px 24px', textAlign: 'center', boxShadow: `0 8px 32px rgba(18,25,90,.3)` }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{grade.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{grade.label}</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: GOLD, fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 8 }}>
            {correct}<span style={{ fontSize: 24, color: 'rgba(255,255,255,.5)' }}>/{total}</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginBottom: 16 }}>
            {subjectName} · {examType} · {pct}% correct
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,184,0,.2)', border: '1.5px solid rgba(255,184,0,.4)', borderRadius: 999, padding: '6px 16px' }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: GOLD }}>+{xp} XP</span>
          </div>
        </div>
        {/* Per-question breakdown */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 900, color: 'var(--text-prim)' }}>Your answers</div>
          {questions.map((q, i) => {
            const log     = answerMap[i]
            const opts    = normaliseOptions(q.options)
            const corIdx  = opts.findIndex((_, j) => checkCorrect(opts, j, q.correct_answer))
            const selOpt  = log?.selectedIdx !== null && log?.selectedIdx !== undefined ? opts[log.selectedIdx] : null
            const corOpt  = opts[corIdx]
            return (
              <div key={q.id} style={{ padding: '12px 18px', borderBottom: i < questions.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: log?.isCorrect ? `${GREEN}18` : log ? `${RED}15` : 'var(--bg-subtle)', border: `2px solid ${log?.isCorrect ? GREEN : log ? RED : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                  {log?.isCorrect ? '✓' : log ? '✗' : '–'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.5, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {q.text ?? q.question_text}
                  </div>
                  {!log?.isCorrect && corOpt && (
                    <div style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>✓ {corOpt}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {/* Actions */}
        <button onClick={onTryAnother} style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', background: BLUE, color: '#fff', fontSize: 15, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: `0 5px 0 #0a3fa0,0 8px 24px ${BLUE}40` }}>
          Try Another Mode →
        </button>
        <button onClick={onHome} style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-sec)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
          Demo Home
        </button>
        {/* CTA */}
        <DemoCTA />
      </div>
    </div>
  )
}

// ── Demo CTA Block ─────────────────────────────────────────────────────────────
function DemoCTA() {
  return (
    <div style={{ background: `linear-gradient(135deg,${NAVY} 0%,#1264E5 100%)`, borderRadius: 20, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 2 }}>
        Ready to bring ExamPrep to your school?
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', textAlign: 'center', marginBottom: 4 }}>
        Join hundreds of schools preparing students for WAEC and JAMB
      </div>
      <a href={SIGNUP_URL} style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: GOLD, color: NAVY, fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: `0 4px 0 ${GOLD2}`, textAlign: 'center', textDecoration: 'none' }}>
        🏫 Sign Up Your School
      </a>
      <a href={AMBASSADOR_URL} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
        🌟 Become a Teacher Ambassador
      </a>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 14, border: 'none', background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
        Talk to Us on WhatsApp
      </a>
    </div>
  )
}

// ── Home Screen ────────────────────────────────────────────────────────────────
const MODES = [
  { key: 'topic',  emoji: '📋', label: 'Topic Practice',  desc: 'Drill one subject with explanations', color: '#0891b2' },
  { key: 'custom', emoji: '📖', label: 'Study Mode',      desc: 'Answer & see explanations instantly',  color: BLUE    },
  { key: 'quick5', emoji: '⚡', label: 'Quick 5',          desc: '5 fast questions, no fuss',            color: GREEN   },
  { key: 'timed',  emoji: '⏱', label: 'Speed Round',     desc: 'Beat the clock on every question',     color: ORANGE  },
  { key: 'battle', emoji: '⚔️', label: 'Battle vs CPU',   desc: 'Go head-to-head against the computer', color: GOLD    },
]

function HomeScreen({ exam, subject, onExamChange, onSubjectChange, onStart, onCTA }) {
  const subjects = DEMO_CONFIG[exam]?.subjects ?? []

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', paddingTop: 44 }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.02em', marginBottom: 4 }}>
            Welcome to ExamPrep
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tert)', lineHeight: 1.6 }}>
            Experience the full student journey. Pick an exam, a subject, and a mode — then start practising.
          </div>
        </div>

        {/* Exam toggle */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>Exam</div>
          <div style={{ display: 'inline-flex', background: 'var(--bg-subtle)', borderRadius: 12, padding: 3, border: '1px solid var(--border)' }}>
            {['WAEC', 'JAMB'].map(e => (
              <button key={e} onClick={() => onExamChange(e)}
                style={{ padding: '8px 24px', borderRadius: 9, fontSize: 14, fontWeight: 900, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: exam === e ? BLUE : 'transparent', color: exam === e ? '#fff' : 'var(--text-tert)', boxShadow: exam === e ? `0 2px 8px ${BLUE}50` : 'none', transition: 'all .15s' }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Subject grid */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>Subject</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
            {subjects.map(s => {
              const on  = subject === s
              const acc = getAccent(s)
              const has = demoSubjectHasQuestions(exam, s)
              return (
                <button key={s} onClick={() => has && onSubjectChange(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 14, cursor: has ? 'pointer' : 'not-allowed', fontFamily: 'inherit', background: on ? `${acc}12` : 'var(--bg-subtle)', border: `2px solid ${on ? acc : 'var(--border)'}`, transition: 'all .12s', textAlign: 'left', opacity: has ? 1 : .4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${acc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{getIcon(s)}</div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: on ? acc : 'var(--text-prim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                  {on && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={acc} /><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                </button>
              )
            })}
          </div>
          {!demoSubjectHasQuestions(exam, subject) && subject && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tert)', fontStyle: 'italic' }}>
              Questions loading for this subject — check back soon.
            </div>
          )}
        </div>

        {/* Mode grid */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>Practice Mode</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODES.map(m => (
              <button key={m.key} onClick={() => demoSubjectHasQuestions(exam, subject) && onStart(m.key)}
                disabled={!demoSubjectHasQuestions(exam, subject)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--bg-card)', cursor: demoSubjectHasQuestions(exam, subject) ? 'pointer' : 'not-allowed', fontFamily: 'inherit', textAlign: 'left', transition: 'all .12s', opacity: demoSubjectHasQuestions(exam, subject) ? 1 : .5 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: `${m.color}14`, border: `1.5px solid ${m.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{m.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)' }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 1 }}>{m.desc}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: m.color, background: `${m.color}12`, border: `1.5px solid ${m.color}28`, borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}>
                  5 Qs
                </div>
              </button>
            ))}
          </div>
        </div>

        <DemoCTA />
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function DemoPage() {
  // Global demo state
  const [exam,    setExam]    = useState('WAEC')
  const [subject, setSubject] = useState(() => firstAvailableSubject('WAEC'))
  const [phase,   setPhase]   = useState('home')
  const [mode,    setMode]    = useState(null)

  // Practice session state
  const [questions,  setQuestions]  = useState([])
  const [answerMap,  setAnswerMap]  = useState({})    // { idx: { isCorrect, selectedIdx } }
  const [qIndex,     setQIndex]     = useState(0)
  const cardRef = useRef(null)

  // Battle state
  const [battleQs,      setBattleQs]      = useState([])
  const [battleIdx,     setBattleIdx]     = useState(0)
  const [selectedIdx,   setSelectedIdx]   = useState(null)
  const [revealed,      setRevealed]      = useState(false)
  const [studentScore,  setStudentScore]  = useState(0)
  const [cpuScore,      setCpuScore]      = useState(0)
  const [studentDots,   setStudentDots]   = useState(0)
  const [cpuDots,       setCpuDots]       = useState(0)
  const [floatSide,     setFloatSide]     = useState(null)
  const [floatKey,      setFloatKey]      = useState(0)
  const [cpuAnswered,   setCpuAnswered]   = useState(false)
  const [battlePaused,  setBattlePaused]  = useState(false)
  const [explOpen,      setExplOpen]      = useState(false)
  const [timerKey,      setTimerKey]      = useState(0)
  const [battleSave,    setBattleSave]    = useState(null)
  const [answersLog,    setAnswersLog]    = useState([])

  const opponent   = useRef(null)
  const cpuChoices = useRef([])
  const cpuTimer   = useRef(null)
  const logRef     = useRef([])

  // Scroll to top on question change during practice
  const bodyRef = useRef(null)
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [qIndex])

  // CPU thinking timer for battle
  useEffect(() => {
    if (phase !== 'battle') return
    setCpuAnswered(false)
    clearTimeout(cpuTimer.current)
    const delay = opponent.current?.getThinkingDelay() ?? 5000
    cpuTimer.current = setTimeout(() => setCpuAnswered(true), delay)
    return () => clearTimeout(cpuTimer.current)
  }, [phase, battleIdx])

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function resetBattle() {
    setStudentScore(0); setCpuScore(0)
    setStudentDots(0);  setCpuDots(0)
    setFloatSide(null); setExplOpen(false)
    setSelectedIdx(null); setRevealed(false)
    setBattleIdx(0); setTimerKey(0); setBattlePaused(false)
    logRef.current = []
  }

  function animateFloat(side) {
    setFloatSide(side); setFloatKey(k => k + 1)
    setTimeout(() => setFloatSide(null), 900)
  }

  // ── Start a session ───────────────────────────────────────────────────────────
  function handleStart(selectedMode) {
    const qs = getDemoQuestions(exam, subject)
    if (!qs.length) return

    setMode(selectedMode)
    setQIndex(0)
    setAnswerMap({})

    if (selectedMode === 'battle') {
      setBattleQs(qs)
      resetBattle()
      opponent.current = createComputerOpponent('easy')
      cpuChoices.current = qs.map(q => opponent.current.decide(q))
      logRef.current = qs.map(q => ({ question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id, topic_name: q.topic_name || '', subject_name: q.subject_name || '', isCorrect: false, is_correct: false, selectedIdx: null }))
      setPhase('battle-countdown')
    } else {
      setQuestions(qs)
      setPhase('session')
    }
  }

  // ── Practice session handlers ─────────────────────────────────────────────────
  function handleAnswerChange(idx, answer) {
    setAnswerMap(prev => ({ ...prev, [idx]: answer }))
  }

  function handleNext({ selectedIdx: si, isCorrect } = {}) {
    let updatedMap = answerMap
    if (si !== null && si !== undefined) {
      const entry = { isCorrect: !!isCorrect, selectedIdx: si }
      updatedMap = { ...answerMap, [qIndex]: entry }
      setAnswerMap(updatedMap)
    }
    if (qIndex >= questions.length - 1) {
      setPhase('results')
    } else {
      setQIndex(i => i + 1)
    }
  }

  // ── Battle handlers ───────────────────────────────────────────────────────────
  function handleBattleSelect(idx) {
    if (revealed) return
    setSelectedIdx(idx)
  }

  function handleBattleNext() {
    const q    = battleQs[battleIdx]
    const opts = normaliseOptions(q.options)

    if (!revealed) {
      const sCorr = selectedIdx !== null && checkCorrect(opts, selectedIdx, q.correct_answer)
      const cpuAns = cpuChoices.current[battleIdx]
      const cCorr  = opts.indexOf(cpuAns) >= 0 ? checkCorrect(opts, opts.indexOf(cpuAns), q.correct_answer) : cpuAns === q.correct_answer
      if (sCorr) { setStudentScore(s => s + 10); setStudentDots(d => d + 1); animateFloat('student') }
      if (cCorr) { setCpuScore(s => s + 10); setCpuDots(d => d + 1); if (!sCorr) animateFloat('cpu') }
      logRef.current[battleIdx] = { ...logRef.current[battleIdx], isCorrect: sCorr, is_correct: sCorr, selectedIdx }
      setCpuAnswered(true); setRevealed(true); setExplOpen(false)
    } else {
      if (battleIdx < battleQs.length - 1) {
        setBattleIdx(i => i + 1); setSelectedIdx(null); setRevealed(false); setTimerKey(k => k + 1); setExplOpen(false)
      } else {
        finishBattle()
      }
    }
  }

  function handleBattleTimerUp() {
    if (revealed) return
    const q    = battleQs[battleIdx]
    const opts = normaliseOptions(q.options)
    const cpuAns = cpuChoices.current[battleIdx]
    const cCorr  = opts.indexOf(cpuAns) >= 0 ? checkCorrect(opts, opts.indexOf(cpuAns), q.correct_answer) : cpuAns === q.correct_answer
    if (cCorr) { setCpuScore(s => s + 10); setCpuDots(d => d + 1); animateFloat('cpu') }
    logRef.current[battleIdx] = { ...logRef.current[battleIdx], isCorrect: false, is_correct: false, selectedIdx: null }
    setCpuAnswered(true); setRevealed(true); setExplOpen(false)
  }

  function finishBattle() {
    const finalStudentScore = logRef.current.filter(a => a.isCorrect).length * 10
    const finalCpuScore = cpuChoices.current.reduce((acc, ans, i) => {
      const q = battleQs[i]
      if (!q || !ans) return acc
      const opts = normaliseOptions(q.options)
      const cor  = opts.indexOf(ans) >= 0 ? checkCorrect(opts, opts.indexOf(ans), q.correct_answer) : ans === q.correct_answer
      return acc + (cor ? 10 : 0)
    }, 0)
    const outcome = finalStudentScore > finalCpuScore ? 'win' : finalStudentScore < finalCpuScore ? 'loss' : 'draw'
    const xp      = Math.round(finalStudentScore / 10) * 10 + (outcome === 'win' ? 20 : outcome === 'draw' ? 10 : 0)
    setAnswersLog([...logRef.current])
    setBattleSave({ finalS: finalStudentScore, finalC: finalCpuScore, xp, outcome })
    setPhase('battle-results')
  }

  function handleBattleRematch() {
    const qs = getDemoQuestions(exam, subject)
    setBattleQs(qs)
    resetBattle()
    opponent.current = createComputerOpponent('easy')
    cpuChoices.current = qs.map(q => opponent.current.decide(q))
    logRef.current = qs.map(q => ({ question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id, topic_name: q.topic_name || '', subject_name: q.subject_name || '', isCorrect: false, is_correct: false, selectedIdx: null }))
    setPhase('battle-countdown')
  }

  // ── Phase: session (practice) ─────────────────────────────────────────────────
  const sessionType = mode === 'custom' || mode === 'topic' ? 'study'
    : mode === 'timed' ? 'practice'
    : mode === 'quick5' ? 'practice'
    : 'practice'

  const speedSecs = mode === 'timed' ? 30 : null
  const q = questions[qIndex]

  const BLUE_NAV = BLUE
  const modeLabel = { topic: 'Topic Practice', custom: 'Study Mode', quick5: 'Quick 5', timed: 'Speed Round' }[mode] ?? 'Practice'

  // ── Render ─────────────────────────────────────────────────────────────────────
  const showBanner = phase !== 'battle' && phase !== 'battle-countdown' && phase !== 'battle-results' && phase !== 'battle-review'

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floatup{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-36px);opacity:0}}
        @keyframes slidein{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes tilepop{0%{transform:scale(1)}25%{transform:scale(0.91)}65%{transform:scale(1.05)}100%{transform:scale(1)}}
        @keyframes modalin{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        .tile-pop{animation:tilepop .2s cubic-bezier(.36,.07,.19,.97)}
        .btiles{display:grid;grid-template-columns:1fr;gap:11px;align-items:stretch}
        .btile-h{min-height:clamp(56px,8vw,72px)}
        @media(min-width:600px){
          .btiles{grid-template-columns:1fr 1fr;gap:clamp(10px,1.5vw,16px)}
          .btile-h{min-height:clamp(80px,12vw,110px)}
        }
      `}</style>

      {/* Demo banner — shown on all non-battle screens */}
      {showBanner && <DemoBanner onCTA={() => window.open(WHATSAPP_URL, '_blank')} />}

      {/* ── HOME ── */}
      {phase === 'home' && (
        <HomeScreen
          exam={exam} subject={subject}
          onExamChange={e => { setExam(e); setSubject(firstAvailableSubject(e)) }}
          onSubjectChange={setSubject}
          onStart={handleStart}
          onCTA={() => window.open(WHATSAPP_URL, '_blank')}
        />
      )}

      {/* ── PRACTICE SESSION ── */}
      {phase === 'session' && q && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', paddingTop: 44 }}>
          {/* Top bar */}
          <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
              <button onClick={() => setPhase('home')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-tert)', fontSize: 13, fontWeight: 700, padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                End
              </button>
              <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)' }}>{subject}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tert)', fontVariantNumeric: 'tabular-nums' }}>
                {qIndex + 1}<span style={{ color: 'var(--border-strong)' }}>/{questions.length}</span>
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, background: 'var(--bg-subtle)', overflow: 'hidden', borderRadius: 999 }}>
              <div style={{ height: '100%', width: `${Math.round((Object.keys(answerMap).length / questions.length) * 100)}%`, background: `linear-gradient(90deg,${BLUE},${CYAN})`, borderRadius: 999, transition: 'width .35s ease' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0 9px' }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: `${BLUE}12`, color: BLUE }}>{modeLabel}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)' }}>{Object.keys(answerMap).length}/{questions.length} answered</span>
            </div>
          </div>

          {/* Body */}
          <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            <div style={{ borderRadius: 18, padding: '20px 16px', background: '#fff', boxShadow: '0 2px 16px rgba(6,42,120,.08)' }}>
              <QuestionCard
                ref={cardRef}
                key={q.id + '-' + qIndex}
                question={q}
                qIndex={qIndex}
                total={questions.length}
                onNext={handleNext}
                onAnswerChange={handleAnswerChange}
                onPrev={() => setQIndex(i => Math.max(0, i - 1))}
                sessionType={sessionType}
                speedSecs={speedSecs}
                onSpeedTimeUp={() => handleNext({})}
                dark={false}
                alreadyAnswered={answerMap[qIndex] ?? null}
                reviewMode={false}
                hideExplanation={sessionType !== 'study'}
                hideNav={false}
              />
            </div>
          </div>

          {/* Bottom nav */}
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)', padding: '10px 14px 12px', display: 'flex', gap: 10, flexShrink: 0, paddingBottom: 'max(12px,env(safe-area-inset-bottom))' }}>
            <button onClick={() => setQIndex(i => Math.max(0, i - 1))} disabled={qIndex === 0}
              style={{ flex: 1, padding: '13px', borderRadius: 13, border: '1px solid var(--border)', cursor: qIndex === 0 ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, background: 'transparent', color: qIndex === 0 ? 'var(--text-tert)' : 'var(--text-sec)', opacity: qIndex === 0 ? .4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Prev
            </button>
            <button
              onClick={() => {
                const live = cardRef.current?.getSelection()
                handleNext(live?.selectedIdx !== undefined && live.selectedIdx !== null ? { selectedIdx: live.selectedIdx, isCorrect: live.isCorrect } : {})
              }}
              style={{ flex: 2, padding: '13px', borderRadius: 13, border: 'none', cursor: 'pointer', background: BLUE, color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', boxShadow: `0 4px 0 #0a3fa0`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {qIndex >= questions.length - 1 ? 'Submit' : 'Next'}
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── PRACTICE RESULTS ── */}
      {phase === 'results' && (
        <PracticeResults
          questions={questions}
          answerMap={answerMap}
          mode={mode}
          subjectName={subject}
          examType={exam}
          onTryAnother={() => setPhase('home')}
          onHome={() => setPhase('home')}
        />
      )}

      {/* ── BATTLE COUNTDOWN ── */}
      {phase === 'battle-countdown' && (
        <Countdown onDone={() => setPhase('battle')} />
      )}

      {/* ── BATTLE ── */}
      {phase === 'battle' && (() => {
        const q    = battleQs[battleIdx]
        const opts = q ? normaliseOptions(q.options) : []
        const cpuAns = cpuChoices.current[battleIdx]
        const cpuIdx = cpuAns ? opts.indexOf(cpuAns) : -1
        const correctIdx = opts.findIndex((_, i) => checkCorrect(opts, i, q?.correct_answer))
        const isLast = battleIdx >= battleQs.length - 1
        const isCorrect = selectedIdx !== null && checkCorrect(opts, selectedIdx, q?.correct_answer)
        const skipped = revealed && selectedIdx === null

        const timerEnabled = mode === 'timed' || mode === 'battle'

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <BattleBg />
            {battlePaused && <PauseMenu onResume={() => setBattlePaused(false)} onQuit={() => { clearTimeout(cpuTimer.current); setPhase('home') }} />}
            {explOpen && q?.explanation && (
              <BattleExplanationSheet question={q} isCorrect={isCorrect} onClose={() => setExplOpen(false)} />
            )}

            <VSHeader
              qIndex={battleIdx} total={battleQs.length}
              studentScore={studentScore} cpuScore={cpuScore}
              studentDots={studentDots} cpuDots={cpuDots}
              onMenu={() => setBattlePaused(true)}
              floatSide={floatSide} floatKey={floatKey}
              cpuAnswered={cpuAnswered}
            />

            {/* Canvas */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', position: 'relative', zIndex: 5, padding: '20px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 14, animation: 'slidein .3s ease' }}>
                {/* Question card */}
                {q && (
                  <div style={{ position: 'relative', marginTop: 14 }}>
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg,${GOLD},#FBBF24)`, border: '3px solid #D5E5F5', borderRadius: 999, padding: '5px 18px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 900, color: NAVY, whiteSpace: 'nowrap', boxShadow: `0 4px 0 ${GOLD2}`, zIndex: 5 }}>
                      <span>{getIcon(subject)}</span>
                      <span>{subject}</span>
                      {timerEnabled && !revealed && (
                        <TimerRing key={timerKey} secs={30} onTimeUp={handleBattleTimerUp} revealed={revealed} />
                      )}
                    </div>
                    <div style={{ background: '#FAFBFF', border: '3px solid #1A2468', borderRadius: 24, boxShadow: '0 10px 0 rgba(26,36,104,.2),0 14px 32px rgba(26,36,104,.14)', position: 'relative', overflow: 'visible' }}>
                      {[{ left: '-10px' }, { right: '-10px' }].map((s, i) => (
                        <div key={i} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', background: '#3B5BDB', border: '3px solid #D5E5F5', boxShadow: '0 2px 6px rgba(0,0,0,.25)', ...s }} />
                      ))}
                      <div style={{ padding: 'clamp(32px,5vw,52px) clamp(22px,4vw,38px) clamp(24px,4vw,40px)' }}>
                        <div style={{ fontSize: 'clamp(17px,2.4vw,26px)', fontWeight: 900, color: '#1A1F5E', lineHeight: 1.65, wordBreak: 'break-word' }}>
                          <MathText text={q.text ?? q.question_text ?? ''} as="span" className="" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Answer tiles */}
                <div className="btiles">
                  {opts.map((opt, idx) => {
                    const isC = revealed && idx === correctIdx
                    const isW = revealed && idx === selectedIdx && !isCorrect
                    const dim = revealed && !isC && !isW
                    const tileBg = isC ? '#16A34A' : isW ? '#DC2626' : TILE[idx]?.bg ?? '#3B82F6'
                    const tileSh = isC ? '0 5px 0 #15803D,0 7px 18px rgba(22,163,74,.4)' : isW ? '0 5px 0 #991B1B' : `0 5px 0 ${TILE[idx]?.press ?? '#1D4ED8'}`
                    const letter = revealed ? (isC ? '✓' : isW ? '✗' : LETTERS[idx]) : LETTERS[idx]
                    const showYou = idx === selectedIdx
                    const showCpu = revealed && idx === cpuIdx
                    const isSelected = selectedIdx === idx && !revealed
                    return (
                      <div key={idx} style={{ position: 'relative', borderRadius: 18, opacity: dim ? .26 : 1 }}>
                        <div
                          className={isSelected ? 'btile-h tile-pop' : 'btile-h'}
                          onClick={() => handleBattleSelect(idx)}
                          style={{ display: 'flex', alignItems: 'center', padding: '0 10px 0 0', borderRadius: 18, background: tileBg, boxShadow: tileSh, position: 'relative', overflow: 'hidden', border: `2.5px solid ${isC ? 'rgba(255,255,255,.4)' : isSelected ? 'rgba(255,255,255,.6)' : 'transparent'}`, cursor: revealed ? 'default' : 'pointer', transform: isSelected ? 'scale(.97)' : 'none', transition: 'transform .1s' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(to bottom,rgba(255,255,255,.25),transparent)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }} />
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.22)', border: '2px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0, margin: '0 11px', position: 'relative', zIndex: 1 }}>{letter}</div>
                          <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.4, minWidth: 0, wordBreak: 'break-word', position: 'relative', zIndex: 1 }}>
                            <MathText text={String(opt ?? '')} as="span" className="" />
                          </div>
                        </div>
                        {/* Player badges */}
                        {revealed && (showYou || showCpu) && (
                          <div style={{ position: 'absolute', top: -13, right: 8, display: 'flex', gap: 4, zIndex: 10 }}>
                            {showYou && !showCpu && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><div style={{ width: 34, height: 34, borderRadius: '50%', background: '#3B5BDB', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 3px 8px rgba(0,0,0,.35)' }}>👤</div><span style={{ fontSize: 8, fontWeight: 900, color: '#fff', background: '#3B5BDB', borderRadius: 999, padding: '1px 5px', whiteSpace: 'nowrap' }}>You</span></div>}
                            {showCpu && !showYou && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><div style={{ width: 34, height: 34, borderRadius: '50%', background: '#6D28D9', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 3px 8px rgba(0,0,0,.35)' }}>🤖</div><span style={{ fontSize: 8, fontWeight: 900, color: '#fff', background: '#6D28D9', borderRadius: 999, padding: '1px 5px', whiteSpace: 'nowrap' }}>CPU</span></div>}
                            {showYou && showCpu && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><div style={{ width: 34, height: 34, borderRadius: '50%', background: NAVY2, border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 3px 8px rgba(0,0,0,.35)' }}>🤝</div><span style={{ fontSize: 8, fontWeight: 900, color: '#fff', background: NAVY2, borderRadius: 999, padding: '1px 5px', whiteSpace: 'nowrap' }}>Both</span></div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Result banner — shown after reveal */}
                {revealed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderRadius: 18, background: isCorrect ? 'linear-gradient(135deg,#DCFCE7,#F0FDF4)' : skipped ? '#F9FAFB' : 'linear-gradient(135deg,#FEE2E2,#FFF5F5)', border: `2.5px solid ${isCorrect ? 'rgba(34,197,94,.35)' : skipped ? 'rgba(107,114,128,.25)' : 'rgba(239,68,68,.3)'}`, boxShadow: '0 4px 0 rgba(26,36,104,.08)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: isCorrect ? '#16A34A' : skipped ? '#6B7280' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', flexShrink: 0, boxShadow: `0 4px 10px ${isCorrect ? 'rgba(22,163,74,.4)' : 'rgba(220,38,38,.35)'}` }}>
                      {isCorrect ? '✓' : skipped ? '⏱' : '✗'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: isCorrect ? '#15803D' : skipped ? '#4B5563' : '#B91C1C' }}>
                        {isCorrect ? 'Correct — +10 pts' : skipped ? "Time's up — 0 pts" : 'Wrong — 0 pts'}
                      </div>
                      {!isCorrect && !skipped && q?.correct_answer && (
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                          Correct: <strong style={{ color: '#15803D' }}>{opts[correctIdx] ?? q.correct_answer}</strong>
                        </div>
                      )}
                    </div>
                    {isCorrect && <div style={{ fontSize: 12, fontWeight: 900, color: '#92400E', background: `linear-gradient(135deg,${GOLD},#FBBF24)`, borderRadius: 999, padding: '5px 12px', flexShrink: 0, boxShadow: `0 3px 0 ${GOLD2}` }}>+10 XP ⚡</div>}
                  </div>
                )}

                {/* Dot progress */}
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: '4px 0' }}>
                  {battleQs.map((_, i) => (
                    <div key={i} style={{ height: 7, borderRadius: 4, transition: 'all .25s', background: i < battleIdx ? GOLD : i === battleIdx ? NAVY2 : 'rgba(26,36,104,.15)', width: i === battleIdx ? 20 : i < battleIdx ? 14 : 8 }} />
                  ))}
                </div>

                <div style={{ height: 'max(90px,calc(80px + env(safe-area-inset-bottom)))', flexShrink: 0 }} />
              </div>
            </div>

            {/* Bottom nav */}
            <div style={{ flexShrink: 0, zIndex: 100, background: `linear-gradient(to top,#C8DDEF 65%,transparent)`, padding: '10px 14px', paddingBottom: 'max(14px,env(safe-area-inset-bottom))' }}>
              <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gridTemplateColumns: revealed && q?.explanation ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10 }}>
                {revealed && q?.explanation && (
                  <button onClick={() => setExplOpen(true)}
                    style={{ padding: '13px', borderRadius: 999, border: '2.5px solid rgba(26,36,104,.2)', background: '#fff', color: NAVY2, fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 0 rgba(26,36,104,.15)' }}>
                    📖 Explain
                  </button>
                )}
                <button onClick={handleBattleNext}
                  style={{ gridColumn: revealed && q?.explanation ? 'span 1' : 'span 1', padding: '13px', borderRadius: 999, border: 'none', background: revealed ? GOLD : NAVY2, color: revealed ? NAVY : '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: revealed ? `0 5px 0 ${GOLD2}` : '0 5px 0 #031548', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {!revealed ? 'Submit' : isLast ? '🏁 Finish' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── BATTLE RESULTS ── */}
      {phase === 'battle-results' && battleSave && (
        <BattleResultsScreen
          questions={battleQs}
          answersLog={answersLog}
          studentScore={battleSave.finalS}
          cpuScore={battleSave.finalC}
          xpAwarded={battleSave.xp}
          subjectName={subject}
          onRematch={handleBattleRematch}
          onNewBattle={() => setPhase('home')}
          onHome={() => setPhase('home')}
          onReview={() => setPhase('battle-review')}
        />
      )}

      {/* ── BATTLE REVIEW ── */}
      {phase === 'battle-review' && (
        <BattleReview
          questions={battleQs}
          answersLog={answersLog}
          cpuChoices={cpuChoices.current}
          subjectName={subject}
          onDone={() => setPhase('battle-results')}
        />
      )}
    </>
  )
}