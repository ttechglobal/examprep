'use client'
// src/app/student/progress/page.js — v4
// Fixes:
//  • Activity chart: byDate was always set to 1 (never incremented).
//    Fixed: count actual attempts per day so bar heights reflect real volume.
//  • Progress bar in SubjectMasteryCard: was flush to card bottom edge.
//    Fixed: wrapped in a div with horizontal + bottom padding so it sits
//    inside the card with breathing room.

import { useState, useEffect } from 'react'
import { ProgressPageSkeleton } from '@/components/ui/Skeletons'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { usePoints } from '@/contexts/PointsContext'
import CoachBanner from '@/components/ui/CoachBanner'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'

function masteryTier(pct) {
  if (pct >= 80) return { label: 'Strong',     color: '#16a34a' }
  if (pct >= 60) return { label: 'Building',   color: '#ca8a04' }
  if (pct >= 40) return { label: 'Developing', color: '#ea580c' }
  return               { label: 'Weak',        color: '#dc2626' }
}

function progressCoach({ firstName, avgMastery, strongTopics, weakTopics, streakDays, totalSessions }) {
  const name = firstName ? `, ${firstName}` : ''
  if (weakTopics > 0 && avgMastery < 50) {
    return { emoji: '🎯', message: `${weakTopics} topic${weakTopics !== 1 ? 's' : ''} still need work${name}. Focus your next sessions on those — that's where your score will move fastest.` }
  }
  if (strongTopics > 5 && avgMastery >= 70) {
    return { emoji: '🏅', message: `${strongTopics} strong topics${name}! You're building real momentum. Don't let the weaker ones drag you down.` }
  }
  if (streakDays >= 5) {
    return { emoji: '🔥', message: `${streakDays}-day streak${name} — your progress is showing. Keep showing up.` }
  }
  if (totalSessions === 0) {
    return { emoji: '🚀', message: `No sessions yet${name}. Start practising and your mastery tracking will show up right here.` }
  }
  return { emoji: '📈', message: `${totalSessions} session${totalSessions !== 1 ? 's' : ''} in the last two weeks${name}. Consistent practice is how gaps close. Keep at it.` }
}

// ── Activity chart ────────────────────────────────────────────────────────────
// sessions = { 'YYYY-MM-DD': attemptCount }
function ActivityChart({ sessions }) {
  const isDark = useIsDark()
  const [hovered, setHovered] = useState(null)

  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const dow = today.getDay()
  const daysSinceMon = (dow + 6) % 7
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - daysSinceMon)
  thisMonday.setHours(0, 0, 0, 0)

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(thisMonday)
    d.setDate(thisMonday.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const isToday = key === todayKey
    const isFuture = d > today
    const dayLabel = d.toLocaleDateString('en', { weekday: 'short' })
    days.push({ key, label: dayLabel, count: isFuture ? -1 : (sessions[key] ?? 0), isToday, isFuture })
  }
  const maxCount = Math.max(...days.map(d => Math.max(d.count, 0)), 1)

  const activeDays = days.filter(d => d.count > 0).length
  const streak = (() => { let s = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i].count > 0) s++; else break }; return s })()

  return (
    <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)', marginBottom: 2 }}>Practice activity</p>
          <p style={{ fontSize: 11, color: 'var(--text-tert)' }}>This week's sessions · Mon – Sun</p>
        </div>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 10, background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)' }}>
            <span style={{ fontSize: 13 }}>🔥</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b' }}>{streak}d</span>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tert)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
            {days[0].label} {new Date(days[0].key).getDate()} – {days[6].label} {new Date(days[6].key).getDate()}
          </span>
        </div>
        {/* Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 72 }}>
          {days.map((day, i) => {
            const barH = day.count > 0 ? Math.max(8, Math.round((day.count / maxCount) * 64)) : 4
            const isHov = hovered === i
            const col = day.isFuture
              ? (isDark ? 'rgba(255,255,255,.03)' : '#f8fafc')
              : day.count > 0
              ? (day.isToday ? '#9b7ae0' : '#5cb8ea')
              : (isDark ? 'rgba(255,255,255,.07)' : '#f1f5f9')
            return (
              <div key={day.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: day.count > 0 ? 'pointer' : 'default' }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                {isHov && day.count > 0 && !day.isFuture && (
                  <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', padding: '3px 7px', borderRadius: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,.15)', zIndex: 10, whiteSpace: 'nowrap' }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-prim)' }}>{day.count} attempt{day.count !== 1 ? 's' : ''}</p>
                  </div>
                )}
                <div style={{ width: '100%', height: barH, borderRadius: '4px 4px 2px 2px', background: col, transition: 'height .4s cubic-bezier(.4,0,.2,1)', transform: isHov ? 'scaleX(1.15)' : 'scaleX(1)', transformOrigin: 'bottom' }} />
              </div>
            )
          })}
        </div>
        {/* Day labels */}
        <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
          {days.map((day, i) => (
            <div key={day.key} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: 7.5, color: day.isToday ? '#9b7ae0' : 'var(--text-tert)', fontWeight: day.isToday ? 900 : 500 }}>
                {day.label.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {streak >= 7 ? <><span>🔥</span><p style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{streak}-day streak! Don't break it today.</p></>
          : activeDays >= 5  ? <><span>⚡</span><p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sec)' }}>Practised {activeDays} of 7 days — great consistency.</p></>
          : activeDays >= 3  ? <><span>📈</span><p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sec)' }}>Practised {activeDays} days this week. Aim for daily.</p></>
          : <><span>💡</span><p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tert)' }}>Consistency is key — try to practise every day.</p></>}
      </div>
    </div>
  )
}

// ── Subject mastery card ──────────────────────────────────────────────────────
function SubjectMasteryCard({ subjectKey, name, examType, topicsByExam, isDark, showExamBadge }) {
  const colors = resolveSubjectColors(name, isDark)
  const [open, setOpen] = useState(false)

  const allTopics = Object.values(topicsByExam).flat()
  const topicMap = {}
  for (const t of allTopics) {
    if (!topicMap[t.name]) topicMap[t.name] = { scores: [], attempts: 0 }
    topicMap[t.name].scores.push(t.score)
    topicMap[t.name].attempts += t.attempts ?? 0
  }
  const topics = Object.entries(topicMap).map(([n, d]) => ({
    name: n,
    score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
    attempts: d.attempts,
  })).sort((a, b) => a.score - b.score)

  const avgScore = topics.length > 0 ? Math.round(topics.reduce((s, t) => s + t.score, 0) / topics.length) : 0
  const { label, color } = masteryTier(avgScore)
  const strongCount = topics.filter(t => t.score >= 80).length
  const weakCount   = topics.filter(t => t.score < 40).length

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: colors.bg, border: `1px solid ${colors.border}` }}>
          {colors.icon ?? '📖'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)' }}>{name}</p>
            {showExamBadge && examType && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: examType === 'JAMB' ? 'rgba(139,92,246,.12)' : 'rgba(59,130,246,.12)', color: examType === 'JAMB' ? '#7c3aed' : '#1d4ed8' }}>
                {examType}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>{topics.length} topics · {strongCount} strong · {weakCount} weak</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{avgScore}%</span>
          <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}14`, borderRadius: 6, padding: '1px 6px', border: `1px solid ${color}28` }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-tert)', marginLeft: 4, transition: 'transform .2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
      </button>

      {/* Progress bar — padded so it never touches the card edge */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ height: 4, borderRadius: 999, background: 'var(--bg-inset)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${avgScore}%`, background: color, borderRadius: 999, transition: 'width .8s ease' }} />
        </div>
      </div>

      {/* Topic list */}
      {open && (
        <div style={{ padding: '4px 16px 12px', borderTop: '1px solid var(--border)' }}>
          {topics.map((t, i) => {
            const { color: tc } = masteryTier(t.score)
            return (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < topics.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <div style={{ width: 80, height: 4, borderRadius: 999, background: 'var(--bg-inset)', flexShrink: 0, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${t.score}%`, background: tc, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: tc, minWidth: 32, textAlign: 'right', flexShrink: 0 }}>{t.score}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const router   = useRouter()
  const isDark   = useIsDark()
  const supabase = createClient()
  const { totalPoints: displayXP } = usePoints()
  const { userId } = useUser()

  const [profile,    setProfile]    = useState(null)
  const [mastery,    setMastery]    = useState([])
  const [sessions,   setSessions]   = useState({})
  const [loading,    setLoading]    = useState(true)
  const [activeExam, setActiveExam] = useState(null)
  const [showAll,    setShowAll]    = useState(false)

  useEffect(() => {
    if (userId) load(userId)
  }, [userId]) // eslint-disable-line

  async function load(uid) {
    const ninetyDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 90); d.setHours(0,0,0,0); return d.toISOString() })()

    const [{ data: prof }, masteryRes, { data: attemptRows }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, streak_days').eq('id', uid).single(),
      fetch('/api/student/mastery').then(r => r.ok ? r.json() : { mastery: [] }).catch(() => ({ mastery: [] })),
      supabase.from('question_attempts')
        .select('created_at, is_correct, topic_id')
        .eq('student_id', uid)
        .gte('created_at', ninetyDaysAgo),
    ])

    setProfile(prof)
    const examType = prof?.exam_type ?? 'WAEC'
    setActiveExam(examType === 'JAMB' ? 'JAMB' : 'WAEC')

    let masteryData = (masteryRes.mastery ?? []).map(row => ({
      topic_id:      row.topic_id,
      score:         row.score,
      attempt_count: row.attempt_count,
      topics: {
        id:          row.topic_id,
        name:        row.topic_name,
        subject_id:  row.subject_id,
        subjectName: row.subject_name,
      },
    }))

    if (masteryData.length === 0 && attemptRows?.length > 0) {
      const byTopic = {}
      for (const a of attemptRows) {
        if (!a.topic_id) continue
        if (!byTopic[a.topic_id]) byTopic[a.topic_id] = { total: 0, correct: 0 }
        byTopic[a.topic_id].total++
        if (a.is_correct) byTopic[a.topic_id].correct++
      }
      const fallbackIds = Object.keys(byTopic)
      if (fallbackIds.length > 0) {
        const { data: fallbackTopics } = await supabase
          .from('topics').select('id, name, subject_id').in('id', fallbackIds)
        const subjectIds = [...new Set((fallbackTopics ?? []).map(t => t.subject_id).filter(Boolean))]
        const { data: subjectRows } = subjectIds.length
          ? await supabase.from('subjects').select('id, name').in('id', subjectIds)
          : { data: [] }
        const subjectNameMap = {}
        for (const s of subjectRows ?? []) subjectNameMap[s.id] = s.name
        for (const t of fallbackTopics ?? []) {
          const subjectName = subjectNameMap[t.subject_id]
          if (!subjectName) continue
          masteryData.push({
            topic_id: t.id,
            score: Math.round((byTopic[t.id].correct / byTopic[t.id].total) * 100),
            attempt_count: byTopic[t.id].total,
            topics: { id: t.id, name: t.name, subject_id: t.subject_id, subjectName },
          })
        }
      }
    }
    setMastery(masteryData)

    // FIX: count actual attempts per day (was always being set to 1)
    const byDate = {}
    for (const a of attemptRows ?? []) {
      if (!a.created_at) continue
      const dateKey = a.created_at.slice(0, 10)
      byDate[dateKey] = (byDate[dateKey] ?? 0) + 1
    }
    setSessions(byDate)
    setLoading(false)
  }

  if (loading) return <ProgressPageSkeleton />

  const profileExamType = profile?.exam_type ?? 'WAEC'
  const subjectMap = {}
  for (const row of mastery) {
    if (!row.topics?.subjectName) continue
    const subName = row.topics.subjectName
    const key = subName
    if (!subjectMap[key]) subjectMap[key] = { name: subName, examType: profileExamType, topics: [] }
    subjectMap[key].topics.push({
      name:     row.topics.name,
      score:    Math.round(row.score ?? 0),
      attempts: row.attempt_count ?? 0,
    })
  }

  const examTypes = [...new Set(Object.values(subjectMap).map(s => s.examType))].filter(Boolean)
  const profileExam = profile?.exam_type ?? 'WAEC'
  const tabs = profileExam === 'BOTH'
    ? ['WAEC', 'JAMB'].filter(e => examTypes.includes(e))
    : examTypes.length > 0 ? examTypes : [profileExam === 'JAMB' ? 'JAMB' : 'WAEC']

  const filteredSubjects = Object.entries(subjectMap)
    .filter(([, s]) => s.examType === activeExam)
    .map(([key, s]) => ({
      key,
      name:     s.name,
      examType: s.examType,
      topicsByExam: { [s.examType]: s.topics },
    }))

  const displaySubjects = showAll ? filteredSubjects : filteredSubjects.slice(0, 4)
  const hasMore = filteredSubjects.length > 4

  const nameCount = {}
  for (const s of Object.values(subjectMap)) nameCount[s.name] = (nameCount[s.name] ?? 0) + 1
  const showExamBadge = Object.values(nameCount).some(c => c > 1)

  const totalTopics  = mastery.length
  const strongTopics = mastery.filter(m => (m.score ?? 0) >= 80).length
  const weakTopics   = mastery.filter(m => (m.score ?? 0) < 40).length
  const avgMastery   = totalTopics > 0 ? Math.round(mastery.reduce((s, m) => s + (m.score ?? 0), 0) / totalTopics) : 0
  // Total sessions = total number of days with at least one attempt
  const totalSessions = Object.keys(sessions).length
  const streakDays   = profile?.streak_days ?? 0

  const coachMsg = progressCoach({
    firstName:     profile?.first_name,
    avgMastery, strongTopics, weakTopics, streakDays, totalSessions,
  })

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', marginBottom: 3 }}>Your journey</p>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>Progress</h1>
      </div>

      {/* Coach banner */}
      <div style={{ marginBottom: 20 }}>
        <CoachBanner
          emoji={coachMsg.emoji}
          message={coachMsg.message}
          buddy={profile?.buddy ?? 'zara'}
        />
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { val: displayXP >= 1000 ? `${(displayXP/1000).toFixed(1)}k` : String(displayXP), lbl: 'Total XP',    col: '#FFB800', bg: 'rgba(255,184,0,.1)',     bd: 'rgba(255,184,0,.2)' },
          { val: String(totalSessions),                                                        lbl: 'Active days', col: '#18B7F2', bg: 'rgba(24,183,242,.08)',   bd: 'rgba(24,183,242,.2)' },
          { val: `${avgMastery}%`,                                                             lbl: 'Avg mastery', col: avgMastery >= 70 ? '#4ade80' : avgMastery >= 40 ? '#FFB800' : '#f87171', bg: 'rgba(74,222,128,.07)', bd: 'rgba(74,222,128,.2)' },
        ].map(({ val, lbl, col, bg, bd }) => (
          <div key={lbl} style={{ padding: '13px 8px', borderRadius: 14, background: bg, border: `1.5px solid ${bd}`, textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: col, lineHeight: 1, marginBottom: 3 }}>{val}</p>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-tert)' }}>{lbl}</p>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <ActivityChart sessions={sessions} />

      {/* Recent badges */}
      {streakDays > 0 || totalSessions > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Recent badges</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              streakDays >= 5    ? { e: '🔥', l: 'On Fire',   d: `${streakDays}-day streak`, c: '#FF6A00' } : null,
              totalSessions > 10 ? { e: '⚡', l: 'Active',    d: `${totalSessions} days`,    c: '#18B7F2' } : null,
              avgMastery >= 50   ? { e: '🎯', l: 'On Target', d: `${avgMastery}% avg`,       c: '#4ade80' } : null,
            ].filter(Boolean).slice(0,3).map((b, i) => (
              <div key={i} style={{ flex: 1, padding: '10px 8px', borderRadius: 12, background: `${b.c}0a`, border: `1px solid ${b.c}22`, textAlign: 'center' }}>
                <p style={{ fontSize: 18, marginBottom: 3 }}>{b.e}</p>
                <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-prim)' }}>{b.l}</p>
                <p style={{ fontSize: 9, color: 'var(--text-tert)', marginTop: 1 }}>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Subject mastery */}
      {filteredSubjects.length > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>Subject mastery</p>
            {tabs.length > 1 && (
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', borderRadius: 10, padding: 3 }}>
                {tabs.map(tab => (
                  <button key={tab} onClick={() => { setActiveExam(tab); setShowAll(false) }} style={{
                    padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                    background: activeExam === tab ? 'var(--bg-card)' : 'transparent',
                    color: activeExam === tab ? 'var(--text-prim)' : 'var(--text-tert)',
                    border: activeExam === tab ? '1px solid var(--border)' : '1px solid transparent',
                    transition: 'all .14s',
                  }}>
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          {displaySubjects.map(s => (
            <SubjectMasteryCard
              key={s.key}
              subjectKey={s.key}
              name={s.name}
              examType={s.examType}
              topicsByExam={s.topicsByExam}
              isDark={isDark}
              showExamBadge={showExamBadge}
            />
          ))}

          {hasMore && (
            <button onClick={() => setShowAll(v => !v)} style={{
              width: '100%', padding: '11px 0', borderRadius: 14, fontSize: 13, fontWeight: 700,
              background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-sec)',
              cursor: 'pointer', marginTop: 4,
            }}>
              {showAll ? 'Show fewer' : `Show all ${filteredSubjects.length} subjects`}
            </button>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🎯</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6 }}>No mastery data yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-tert)', marginBottom: 20, lineHeight: 1.5 }}>Complete a practice session to start tracking your topic mastery.</p>
          <Link href="/student/practice" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 20px', background: '#1264E5', color: '#fff', borderRadius: 13, fontSize: 13, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 0 #0a3fa0' }}>
            Start practising →
          </Link>
        </div>
      )}
    </div>
  )
}