'use client'
// src/components/dashboard/TodaysPracticeCard.jsx
//
// Big, prominent hero card — the most important element on the dashboard.
// Always dark regardless of app theme (same reason EXL Games cards are dark:
// subject accent colour pops on dark, creates visual hierarchy over page bg).
// Responsive: on mobile it's full width and tall; on desktop it caps at a
// comfortable max-width and gains a two-column layout (illustration left,
// controls right).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectTheme } from '@/lib/subjectTheme'

const DAILY_COUNT = 10
const ALL_ID      = '__all__'

const SUBJECT_EMOJI = {
  'Mathematics':           '📐',
  'Further Mathematics':   '∑',
  'Physics':               '⚡',
  'Chemistry':             '⚗️',
  'Biology':               '🧬',
  'Economics':             '📈',
  'Government':            '🏛️',
  'English Language':      '📝',
  'Use of English':        '📝',
  'Literature in English': '📖',
  'Geography':             '🌍',
  'Agricultural Science':  '🌱',
  'Commerce':              '💼',
  'Accounting':            '🧾',
  'Computer Science':      '💻',
  'History':               '📜',
}

export default function TodaysPracticeCard({ profile, subjects = [] }) {
  const router = useRouter()

  const subjectNames = subjects.length
    ? subjects.map(s => s.subjects?.name).filter(Boolean)
    : (profile?.subjects ?? [])

  const [selected, setSelected] = useState(subjectNames[0] ?? ALL_ID)

  function start() {
    const isAll      = selected === ALL_ID
    const subjectArr = isAll ? subjectNames : [selected]
    const config = {
      mode:       'daily',
      examType:   profile?.exam_type ?? 'WAEC',
      subjects:   subjectArr,
      count:      DAILY_COUNT,
      revealMode: 'immediate',
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  const isAll       = selected === ALL_ID
  const theme       = isAll ? null : getSubjectTheme(selected)
  const accentColor = theme?.darkSolid  ?? '#818cf8'
  const accentBg    = theme?.darkBg     ?? '#1e1b4b'
  const emoji       = isAll ? '⚡' : (SUBJECT_EMOJI[selected] ?? '📚')
  const minutes     = Math.round(DAILY_COUNT * 0.6)
  const showAll     = subjectNames.length > 1

  return (
    <div style={{
      background: '#111827',
      borderRadius: 24,
      overflow: 'hidden',
      border: '1px solid #1f2937',
      // On desktop: limit width and add side padding breathing room
      width: '100%',
    }}>

      {/* ── Mobile layout: stacked ────────────────────────────────── */}
      <div className="sm:hidden">
        <div style={{ padding: '32px 24px 8px', position: 'relative', minHeight: 200 }}>

          {/* Glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse at 85% 15%, ${accentColor}35 0%, transparent 60%)`,
          }} />

          {/* Big illustration badge */}
          <div style={{
            position: 'absolute', top: 24, right: 20,
            width: 88, height: 88, borderRadius: 24,
            background: accentBg,
            border: `1.5px solid ${accentColor}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40,
          }}>
            {emoji}
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: 10, position: 'relative', zIndex: 1 }}>
            Today's practice
          </p>
          <p style={{ fontSize: 30, fontWeight: 900, color: '#f9fafb', lineHeight: 1.1, marginBottom: 6, position: 'relative', zIndex: 1, maxWidth: '60%' }}>
            {isAll ? 'Mixed\nsubjects' : selected}
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, position: 'relative', zIndex: 1 }}>
            {DAILY_COUNT} questions · {minutes} min
          </p>
        </div>

        {/* Subject picker */}
        {subjectNames.length > 0 && (
          <div style={{ padding: '20px 24px 4px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {showAll && <SubjectPill label="All" active={isAll} accentColor={accentColor} accentBg={accentBg} onClick={() => setSelected(ALL_ID)} />}
            {subjectNames.map(name => {
              const t = getSubjectTheme(name)
              return <SubjectPill key={name} label={name} active={selected === name} accentColor={t.darkSolid} accentBg={t.darkBg} onClick={() => setSelected(name)} />
            })}
          </div>
        )}

        {/* CTA */}
        <div style={{ padding: '20px 16px 16px' }}>
          <StartButton onClick={start} accentColor={accentColor} />
        </div>
      </div>

      {/* ── Desktop layout: two columns ───────────────────────────── */}
      <div className="hidden sm:flex" style={{ minHeight: 260 }}>

        {/* Left: illustration */}
        <div style={{
          width: 220, flexShrink: 0, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: accentBg,
          borderRight: '1px solid #1f2937',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(circle at 50% 50%, ${accentColor}30 0%, transparent 70%)`,
          }} />
          <span style={{ fontSize: 72, position: 'relative', zIndex: 1 }}>{emoji}</span>
        </div>

        {/* Right: content */}
        <div style={{ flex: 1, padding: '32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse at 100% 0%, ${accentColor}20 0%, transparent 55%)`,
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: 8 }}>
              Today's practice
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#f9fafb', lineHeight: 1.15, marginBottom: 4 }}>
              {isAll ? 'Mixed subjects' : selected}
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              {DAILY_COUNT} questions · about {minutes} min
            </p>

            {subjectNames.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                {showAll && <SubjectPill label="All" active={isAll} accentColor={accentColor} accentBg={accentBg} onClick={() => setSelected(ALL_ID)} />}
                {subjectNames.map(name => {
                  const t = getSubjectTheme(name)
                  return <SubjectPill key={name} label={name} active={selected === name} accentColor={t.darkSolid} accentBg={t.darkBg} onClick={() => setSelected(name)} />
                })}
              </div>
            )}
          </div>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 280 }}>
            <StartButton onClick={start} accentColor={accentColor} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SubjectPill({ label, active, accentColor, accentBg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        border: `1.5px solid ${active ? accentColor : '#374151'}`,
        background: active ? accentBg : 'transparent',
        color: active ? accentColor : '#6b7280',
        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function StartButton({ onClick, accentColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '16px', borderRadius: 16,
        background: accentColor, color: '#fff',
        fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'opacity 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      onMouseDown={e =>  e.currentTarget.style.transform = 'scale(0.98)'}
      onMouseUp={e =>    e.currentTarget.style.transform = 'scale(1)'}
    >
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
      Start
    </button>
  )
}