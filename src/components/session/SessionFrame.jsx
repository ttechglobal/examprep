'use client'
// src/components/session/SessionFrame.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The screen every question session is built from: practice, review and the
// mock exam. Styles: ./session.module.css.
//
//   SessionFrame      full-screen layout: top bar, (subject tabs), body, bottom
//                     bar. Body on desktop: question panel | question | aside
//                     (the explanation); on phones just the question.
//                     style: e.g. { top: 44 } under the demo banner.
//   SessionTopBar     Exit/End, title, clock, calculator, position, progress
//   SessionClock      countdown (with a limit) or time spent (without)
//   QuestionPanel     legend + numbered grid (desktop left column)
//   QuestionGridSheet the same grid in a sheet ("4 of 50 ▾" on phones,
//                     "View all questions" on desktop)
//   SessionBottomBar  Previous / Next
//   SubjectTabs       one tab per subject (JAMB mock and its review)
//
// Question states for the grid: 'answered' | 'correct' | 'wrong' | 'skipped'
// | undefined (not done). `graded` legends show Correct / Wrong instead of
// Answered (study mode and review).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import s from './session.module.css'
import { ArrowLeft, ArrowRight, Calculator, ChevronLeft, ChevronDown, Clock, Grid } from './icons'

export const sessionStyles = s

// ── Layout ───────────────────────────────────────────────────────────────────
export function SessionFrame({ top, tabs, panel, aside, bottom, overlay, mainRef, style, children }) {
  return (
    <div className={s.frame} style={style}>
      {top}
      {tabs}
      <div className={s.body} data-aside={aside ? true : undefined}>
        <div className={s.panelCol}>{panel}</div>
        <main className={s.main} ref={mainRef}>
          <div className={s.card}>{children}</div>
        </main>
        {aside && <aside className={s.aside} aria-label="Explanation"><div className={s.card}>{aside}</div></aside>}
      </div>
      {bottom}
      {overlay}
    </div>
  )
}

// ── Top bar ──────────────────────────────────────────────────────────────────
// A single grid (session.module.css): the one clock sits under the progress
// bar on phones and beside the calculator on desktop, so it only runs once.
export function SessionTopBar({ backLabel = 'Exit', onBack, title, subtitle, clock, calcOpen, onCalc, current, total, answered, onOpenGrid }) {
  const progress = total > 0 ? Math.round(((answered ?? current + 1) / total) * 100) : 0
  return (
    <header className={s.top}>
      <button type="button" className={s.back} onClick={onBack}><ChevronLeft size={20} />{backLabel}</button>
      <div className={s.topTitle}>
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      {clock && <div className={s.clockSlot}>{clock}</div>}
      <div className={s.tools}>
        {onCalc && (
          <button type="button" className={s.iconBtn} onClick={onCalc} aria-pressed={!!calcOpen} aria-label="Calculator">
            <Calculator />
          </button>
        )}
        <span className={s.count}>{current + 1} / {total}</span>
      </div>
      <div className={s.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Progress">
        <div className={s.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <button type="button" className={s.gridBtn} onClick={onOpenGrid} aria-label={`Question ${current + 1} of ${total}. Show all questions`}>
        {current + 1} of {total}<ChevronDown />
      </button>
      {answered != null && <p className={s.answered}>{answered}/{total} answered</p>}
    </header>
  )
}

/** Countdown when there's a limit (calls onTimeUp at zero); time spent otherwise. */
export function SessionClock({ limitSecs = null, onTimeUp }) {
  const startedAt = useRef(Date.now())
  const fired     = useRef(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const elapsed = Math.floor((now - startedAt.current) / 1000)
  const shown   = limitSecs ? Math.max(0, limitSecs - elapsed) : elapsed

  useEffect(() => {
    if (limitSecs && shown === 0 && !fired.current) { fired.current = true; onTimeUp?.() }
  }, [limitSecs, shown, onTimeUp])

  const urgent = !!limitSecs && shown <= Math.min(60, limitSecs * 0.1)
  const h = Math.floor(shown / 3600), m = Math.floor((shown % 3600) / 60), sec = shown % 60
  const text = `${h ? `${h}:${String(m).padStart(2, '0')}` : String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`

  return (
    <span className={s.clock} data-urgent={urgent || undefined} aria-label={limitSecs ? `${text} left` : `${text} spent`}>
      <Clock />{text}
    </span>
  )
}

// ── Question grid ────────────────────────────────────────────────────────────
const LEGENDS = {
  answered: [['Current', '#1264e5'], ['Answered', '#16a34a'], ['Skipped', '#f59e0b'], ['Not done', '#cbd5e1']],
  graded:   [['Current', '#1264e5'], ['Correct', '#16a34a'], ['Wrong', '#e11d48'], ['Skipped', '#f59e0b'], ['Not done', '#cbd5e1']],
}

function Legend({ graded }) {
  return (
    <ul className={s.legend}>
      {LEGENDS[graded ? 'graded' : 'answered'].map(([label, color]) => (
        <li key={label}><i style={{ '--dot': color }} />{label}</li>
      ))}
    </ul>
  )
}

function Cells({ total, current, stateOf, onJump }) {
  // Keep the current question in view when the grid scrolls (long mocks).
  const ref = useRef(null)
  useEffect(() => { ref.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' }) }, [current])
  return (
    <div className={s.grid} ref={ref}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i} type="button" className={s.cell}
          data-state={stateOf(i)} aria-current={i === current}
          aria-label={`Question ${i + 1}${stateOf(i) ? `, ${stateOf(i)}` : ''}`}
          onClick={() => onJump(i)}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}

export function QuestionPanel({ total, current, stateOf, graded = false, onJump, onViewAll }) {
  return (
    <section className={`${s.card} ${s.panel}`} aria-label="Questions">
      <h2 className={s.panelTitle}>Questions</h2>
      <Legend graded={graded} />
      <Cells total={total} current={current} stateOf={stateOf} onJump={onJump} />
      {onViewAll && (
        <button type="button" className={s.viewAll} onClick={onViewAll}><Grid />View all questions</button>
      )}
    </section>
  )
}

export function QuestionGridSheet({ total, current, stateOf, graded = false, onJump, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const states = Array.from({ length: total }, (_, i) => stateOf(i))
  const done    = states.filter(st => st === 'answered' || st === 'correct' || st === 'wrong').length
  const skipped = states.filter(st => st === 'skipped').length

  return (
    <div className={s.sheetBackdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="All questions">
        <div className={s.sheetHead}>
          <h2 className={s.panelTitle}>All questions</h2>
          <button type="button" className={s.sheetClose} onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className={s.sheetSummary}>{done} answered · {skipped} skipped · {total - done - skipped} not done</p>
        <Legend graded={graded} />
        <div style={{ height: 12 }} />
        <Cells total={total} current={current} stateOf={stateOf} onJump={i => { onJump(i); onClose() }} />
      </div>
    </div>
  )
}

// ── Bottom bar ───────────────────────────────────────────────────────────────
export function SessionBottomBar({ onPrev, prevDisabled, onNext, nextLabel = 'Next', nextIcon = true }) {
  return (
    <nav className={s.bottom} aria-label="Question navigation">
      <button type="button" className={s.prev} onClick={onPrev} disabled={prevDisabled}>
        <ArrowLeft /><span>Previous<span className={s.wideOnly}> question</span></span>
      </button>
      <span className={s.bottomSpacer} />
      <button type="button" className={s.next} onClick={onNext}>
        <span>{nextLabel}{nextLabel === 'Next' && <span className={s.wideOnly}> question</span>}</span>
        {nextIcon && <ArrowRight />}
      </button>
    </nav>
  )
}

// ── Subject tabs ─────────────────────────────────────────────────────────────
export function SubjectTabs({ subjects, active, onSelect }) {
  return (
    <div className={s.subjects} role="tablist" aria-label="Subjects">
      {subjects.map((sub, i) => (
        <button key={sub.name} type="button" role="tab" className={s.subjectTab} aria-selected={i === active} onClick={() => onSelect(i)}>
          {sub.name}{sub.note && <small>{sub.note}</small>}
        </button>
      ))}
    </div>
  )
}
