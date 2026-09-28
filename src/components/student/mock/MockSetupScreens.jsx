'use client'
// src/components/student/mock/MockSetupScreens.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Before a mock exam (app/student/practice/mock/page.js):
//   ExamChooser  "Choose your exam": WAEC or JAMB
//   MockSetup    WAEC: pick 1 subject (50 questions, 60 min)
//                JAMB: pick 2–4 subjects (40 questions each, 120 min)
// Subjects come from hooks/useExamSubjects.js, so their ids always belong to
// the exam chosen here. Styles: ./mock.module.css. Artwork: ./art.js.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LazyImage from '@/components/ui/LazyImage'
import SubjectIcon from '@/components/ui/SubjectIcon'
import { getSubjectAccent } from '@/lib/subjectAccents'
import { EXAM_ART } from './art'
import s from './mock.module.css'

const cx = (...names) => names.filter(Boolean).join(' ')

export const MOCK_RULES = {
  WAEC: { count: 50, mins: 60 },
  JAMB: { perSubject: 40, mins: 120, min: 2, max: 4 },
}
const TONES = {
  WAEC: { '--tone': '#1557E6', '--tone-dark': '#0B3BB0' },
  JAMB: { '--tone': '#15944A', '--tone-dark': '#0B6B33' },
}

function Screen({ title, onBack, children, footer, exam = 'WAEC', wide = false }) {
  return (
    <div className={s.screen} style={TONES[exam]}>
      <div className={s.bar}>
        <button type="button" className={s.back} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <div className={s.barTitle}>{title}</div>
        <span />
      </div>
      <div className={cx(s.content, wide && s.contentWide)}>{children}</div>
      {footer && <div className={s.footer}><div className={s.footerInner}>{footer}</div></div>}
    </div>
  )
}

// ── Choose your exam ─────────────────────────────────────────────────────────
export function ExamChooser({ onPick, onBack }) {
  const cards = [
    { exam: 'WAEC', title: 'WAEC Mock', meta: `1 subject · ${MOCK_RULES.WAEC.count} questions · ${MOCK_RULES.WAEC.mins} minutes` },
    { exam: 'JAMB', title: 'JAMB Mock', meta: `Up to ${MOCK_RULES.JAMB.max} subjects · ${MOCK_RULES.JAMB.perSubject} questions each · ${MOCK_RULES.JAMB.mins} minutes` },
  ]
  return (
    <Screen title="Mock Exam" onBack={onBack} wide>
      <h1 className={s.heading}>Choose your exam</h1>
      <p className={s.hint}>Select the exam you want to simulate.</p>
      <div className={s.cards}>
        {cards.map(c => (
          <button key={c.exam} type="button" className={s.examCard} onClick={() => onPick(c.exam)}
            style={{ ...TONES[c.exam], background: EXAM_ART[c.exam].card.fallback }}>
            <LazyImage src={EXAM_ART[c.exam].card.image} className={s.cardArt} />
            <span className={s.badge}>{c.exam}</span>
            <span className={s.cardTitle}>{c.title}</span>
            <span className={s.cardMeta}>{c.meta}</span>
            <span className={s.go} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 4l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>
        ))}
      </div>
    </Screen>
  )
}

// ── WAEC / JAMB setup ────────────────────────────────────────────────────────
export function MockSetup({ exam, subjects, loading, hasAny, dark, onStart, onBack }) {
  const isJamb = exam === 'JAMB'
  const rules  = MOCK_RULES[exam]
  const usable = subjects.filter(x => x.id)

  // JAMB starts with Use of English (every candidate sits it) plus the next
  // subjects up to four; WAEC with the first subject.
  const [picked, setPicked] = useState([])
  useEffect(() => {
    if (!usable.length) return
    setPicked(current => {
      const still = current.filter(p => usable.some(u => u.id === p.id))
      if (still.length) return still
      if (!isJamb) return [usable[0]]
      const english = usable.find(u => /english/i.test(u.name))
      return [...(english ? [english] : []), ...usable.filter(u => u !== english)].slice(0, rules.max)
    })
  }, [usable.map(u => u.id).join(','), isJamb]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(subject) {
    if (!isJamb) { setPicked([subject]); return }
    setPicked(current => current.some(p => p.id === subject.id)
      ? current.filter(p => p.id !== subject.id)
      : current.length >= rules.max ? current : [...current, subject])
  }

  const total    = isJamb ? picked.length * rules.perSubject : rules.count
  const canStart = isJamb ? picked.length >= rules.min : picked.length === 1

  return (
    <Screen title={`${exam} Mock Setup`} onBack={onBack} exam={exam}
      footer={
        <button type="button" className={s.begin} disabled={!canStart} onClick={() => onStart(picked)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5z" /></svg>
          Begin {exam} Mock
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      }>
      <div className={s.banner} style={{ background: EXAM_ART[exam].header.fallback }}>
        <LazyImage src={EXAM_ART[exam].header.image} className={s.bannerArt} />
        <div className={s.bannerKicker}>{exam} Mock</div>
        <div className={s.bannerTitle}>
          {isJamb && !picked.length ? `${rules.perSubject} questions per subject` : `${total} questions`} · {rules.mins} min
        </div>
        <ul className={s.rules}>
          <li>Timer runs continuously, no pauses</li>
          <li>No hints or explanations during the exam</li>
          <li>Full review with explanations after</li>
        </ul>
      </div>

      <h2 className={s.listTitle}>{isJamb ? `Select your subjects (${rules.min}–${rules.max})` : 'Choose a subject'}</h2>
      <p className={s.listHint}>{isJamb ? 'Choose the subjects for this mock session.' : 'Select one subject for this mock exam.'}</p>

      {!hasAny ? (
        <div className={s.empty}>
          You haven&apos;t added {exam} subjects yet.<br />
          <Link href="/student/profile">Add them in your profile →</Link>
        </div>
      ) : loading && !usable.length ? (
        <div className={s.empty}>Loading your subjects…</div>
      ) : !usable.length ? (
        <div className={s.empty}>Connect to the internet to load your subjects.</div>
      ) : (
        <div className={s.list} role={isJamb ? 'group' : 'radiogroup'}>
          {usable.map(sub => {
            const on = picked.some(p => p.id === sub.id)
            const blocked = isJamb && !on && picked.length >= rules.max
            const accent = getSubjectAccent(sub.name, dark)
            return (
              <button key={sub.id} type="button" className={cx(s.row, on && s.rowOn)} onClick={() => toggle(sub)}
                disabled={blocked} role={isJamb ? 'checkbox' : 'radio'} aria-checked={on}>
                <span className={cx(s.mark, isJamb ? s.check : s.radio)} aria-hidden="true">
                  {on && (isJamb
                    ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l2.5 2.5L10 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />)}
                </span>
                <span className={s.subjectIcon} style={{ background: accent.accentBg }} aria-hidden="true">
                  <SubjectIcon name={sub.name} color={accent.accent} size={18} />
                </span>
                <span className={s.rowName}>{sub.name}</span>
                {isJamb && on && <span className={s.rowCount}>{rules.perSubject}q</span>}
              </button>
            )
          })}
        </div>
      )}
      {isJamb && usable.length > 0 && picked.length < rules.min && (
        <div className={s.warn}>Select at least {rules.min} subjects to start.</div>
      )}
    </Screen>
  )
}
