'use client'
// src/components/dashboard/TargetsSummary.jsx
//
// Collapsed by default — shows a 1-line summary so the homepage isn't
// cluttered, but everything is one tap away. The full detail (course,
// university, score targets, per-subject WAEC grades) expands inline.
// Dark mode aware throughout.

import { useState, memo } from 'react'

export const TargetsSummary = memo(function TargetsSummary({ profile, onEdit, isDark }) {
  const [open, setOpen] = useState(false)

  const waecGrades = profile?.waec_target_grades  ?? {}
  const jambScores = profile?.jamb_target_scores  ?? {}
  const examType   = profile?.exam_type ?? ''
  const hasWaec    = Object.keys(waecGrades).length > 0 && (examType === 'WAEC' || examType === 'BOTH')
  const hasJamb    = Object.keys(jambScores).length > 0 && (examType === 'JAMB' || examType === 'BOTH')
  const hasCourse  = Boolean(profile?.university_course)
  const hasUni     = Boolean(profile?.target_university)
  const hasAny     = hasWaec || hasJamb || hasCourse || hasUni

  const jambTotal  = profile?.jamb_total_target
    ?? Object.values(jambScores).reduce((s, v) => s + (Number(v) || 0), 0)

  // Two-line summary for the collapsed row
  const line1Parts = []
  const line2Parts = []
  if (hasCourse) line1Parts.push(profile.university_course)
  if (hasUni)    line1Parts.push(profile.target_university)
  if (hasJamb && jambTotal) line2Parts.push(`JAMB target: ${jambTotal}`)
  if (hasWaec)              line2Parts.push(`WAEC: ${Object.keys(waecGrades).length} subjects`)
  const line1 = line1Parts.join(' · ') || (line2Parts.length ? '' : 'No targets set yet')
  const line2 = line2Parts.join(' · ')

  const cardBg     = isDark ? '#111827' : '#ffffff'
  const cardBorder = isDark ? '#1f2937' : '#e5e7eb'
  const divider    = isDark ? '#1f2937' : '#f3f4f6'
  const bubbleCourse = isDark ? '#2e1065' : '#ede9fe'
  const bubbleUni    = isDark ? '#1e3a5f' : '#dbeafe'
  const bubbleJamb   = isDark ? '#1e1b4b' : '#e0e7ff'
  const bubbleWaec   = isDark ? '#052e16' : '#d1fae5'

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: 'hidden' }}>

      {/* Collapsed row — always visible, tap to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: 12, padding: '14px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${divider}` : 'none',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#6b7280' : '#9ca3af', marginBottom: 2 }}>
            My targets
          </p>
          {line1 && (
            <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#f3f4f6' : '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: line2 ? 2 : 0 }}>
              {line1}
            </p>
          )}
          {line2 && (
            <p style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#9ca3af' : '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {line2}
            </p>
          )}
          {!line1 && !line2 && (
            <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#6b7280' : '#9ca3af' }}>
              No targets set yet
            </p>
          )}
        </div>
        {/* Chevron */}
        <svg
          width="16" height="16" fill="none" viewBox="0 0 24 24"
          stroke={isDark ? '#4b5563' : '#9ca3af'} strokeWidth={2.5}
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: '16px 16px 4px' }}>

          {!hasAny ? (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <p style={{ fontSize: 13, color: isDark ? '#6b7280' : '#9ca3af', marginBottom: 12 }}>
                Set your targets to stay motivated and track your progress.
              </p>
              <button onClick={onEdit} style={{
                padding: '8px 20px', borderRadius: 12, background: '#f59e0b',
                color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer',
              }}>
                Set targets →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {hasCourse && (
                <Row icon="🎓" bg={bubbleCourse} label="Target course" value={profile.university_course} isDark={isDark} />
              )}
              {hasUni && (
                <Row icon="🏛️" bg={bubbleUni} label="Target university" value={profile.target_university} isDark={isDark} />
              )}
              {hasJamb && jambTotal > 0 && (
                <Row icon="📊" bg={bubbleJamb} label="JAMB target" value={`${jambTotal} total`} isDark={isDark} />
              )}
              {hasWaec && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: bubbleWaec, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>📝</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: isDark ? '#6b7280' : '#9ca3af', marginBottom: 6 }}>
                      WAEC target grades
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(waecGrades).map(([sub, grade]) => {
                        const n     = parseInt(grade.replace(/\D/g, '')) || 0
                        const bg    = isDark ? (n <= 3 ? '#052e16' : n <= 6 ? '#451a03' : '#450a0a') : (n <= 3 ? '#d1fae5' : n <= 6 ? '#fef3c7' : '#fee2e2')
                        const color = isDark ? (n <= 3 ? '#4ade80' : n <= 6 ? '#fbbf24' : '#f87171') : (n <= 3 ? '#065f46' : n <= 6 ? '#92400e' : '#991b1b')
                        return (
                          <div key={sub} style={{ padding: '4px 10px', borderRadius: 10, background: bg, display: 'flex', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color }}>{sub}</span>
                            <span style={{ fontSize: 11, fontWeight: 900, color }}>{grade}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Edit link */}
              <div style={{ borderTop: `1px solid ${divider}`, paddingTop: 12, paddingBottom: 12 }}>
                <button onClick={onEdit} style={{
                  fontSize: 12, fontWeight: 700, color: '#6366f1',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                }}>
                  Edit targets →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

function Row({ icon, bg, label, value, isDark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: isDark ? '#6b7280' : '#9ca3af', marginBottom: 1 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#f9fafb' : '#111827' }}>{value}</p>
      </div>
    </div>
  )
}