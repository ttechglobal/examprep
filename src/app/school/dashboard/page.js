'use client'
// src/app/school/dashboard/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// KEY IMPROVEMENTS:
//   1. Overview: Subject mastery breakdown is the HERO section — subjects
//      expand inline to show per-topic accuracy, colour-coded weak/fair/strong.
//   2. At-risk students use the 3-tier segmentation (dropped/inactive/struggling)
//      with distinct visual treatment and actionable copy per tier.
//   3. Students tab: expanded view shows per-topic mastery per subject.
//   4. Topics tab: redesigned with cleaner cards, drill-down.
//   5. Analytics section: engagement trend sparkline + improvement metrics.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Colour helpers ────────────────────────────────────────────────────────────
function pctColor(pct) {
  if (pct === null || pct === undefined) return { fg: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', label: '—', ring: '#d1d5db' }
  if (pct >= 70) return { fg: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Strong',    ring: '#34d399' }
  if (pct >= 45) return { fg: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Fair',      ring: '#fbbf24' }
  return            { fg: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Weak',      ring: '#f87171' }
}
function AccBar({ pct, height = 6 }) {
  const c = pctColor(pct)
  return (
    <div style={{ height, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 99, background: c.ring, width: `${pct ?? 0}%`, transition: 'width .7s' }} />
    </div>
  )
}

// ── At-risk tier config ───────────────────────────────────────────────────────
const TIER_CONFIG = {
  dropped:    { label: 'Dropped off',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '📉', message: 'Was active last week — follow up today' },
  inactive:   { label: 'Long inactive',  color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', icon: '😴', message: 'Hasn\'t studied in 2+ weeks' },
  struggling: { label: 'Struggling',     color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '⚠️', message: 'Active but accuracy < 40%' },
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, emoji, accent = 'indigo' }) {
  const ACCENT = {
    indigo:  { iconBg: '#eef2ff', iconColor: '#4f46e5' },
    emerald: { iconBg: '#ecfdf5', iconColor: '#059669' },
    amber:   { iconBg: '#fffbeb', iconColor: '#d97706' },
    red:     { iconBg: '#fef2f2', iconColor: '#dc2626' },
  }
  const a = ACCENT[accent] ?? ACCENT.indigo
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
        {emoji}
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{value ?? '—'}</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginTop: 3 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Subject mastery card — expandable to show topics ─────────────────────────
function SubjectMasteryCard({ subj, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const c = pctColor(subj.accuracy)
  const weakTopics = subj.topics.filter(t => t.accuracy < 50).slice(0, 5)

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${expanded ? '#d1d5db' : '#e5e7eb'}`, overflow: 'hidden', transition: 'border-color .2s' }}>
      {/* Header row — clickable */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{subj.subjectName}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
                {subj.accuracy !== null ? `${subj.accuracy}%` : '—'} {c.label}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
            </div>
          </div>
          <AccBar pct={subj.accuracy} />
          <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{subj.topics.length} topics · {subj.topics.reduce((a, t) => a + t.total, 0)} attempts</p>
        </div>
      </button>

      {/* Expanded: topic list */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
          {/* Quick summary: weak topics */}
          {weakTopics.length > 0 && (
            <div style={{ padding: '10px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#dc2626', marginBottom: 6 }}>
                ⚠ {weakTopics.length} weak topic{weakTopics.length > 1 ? 's' : ''} — class needs help here
              </p>
              {weakTopics.slice(0, 3).map(t => (
                <div key={t.topicId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{t.topicName}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626' }}>{t.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
          {/* All topics */}
          <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subj.topics.map(t => {
              const tc = pctColor(t.accuracy)
              return (
                <div key={t.topicId}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{t.topicName}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{t.total} attempts</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: tc.fg }}>{t.accuracy}%</span>
                    </div>
                  </div>
                  <AccBar pct={t.accuracy} height={4} />
                </div>
              )
            })}
            {subj.topics.length === 0 && (
              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>No practice attempts yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── At-risk students — 3-tier segmented ──────────────────────────────────────
function AtRiskSection({ students, atRiskSegmented, onViewStudents }) {
  const [expanded, setExpanded] = useState(true)
  if (!atRiskSegmented?.length) return null

  // Group students by tier
  const byTier = { dropped: [], inactive: [], struggling: [] }
  for (const s of atRiskSegmented) {
    if (byTier[s.tier]) byTier[s.tier].push(s.id)
  }

  const tiers = Object.entries(byTier).filter(([, ids]) => ids.length > 0)

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #fecaca', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef2f2', border: 'none', borderBottom: expanded ? '1px solid #fecaca' : 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>Students needing attention ({atRiskSegmented.length})</p>
            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 1 }}>Review and follow up with these students</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); onViewStudents?.() }} style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>View all →</button>
          <span style={{ fontSize: 11, color: '#dc2626', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
        </div>
      </button>

      {expanded && (
        <div>
          {tiers.map(([tier, ids]) => {
            const cfg = TIER_CONFIG[tier]
            const tierStudents = students.filter(s => ids.includes(s.id))
            return (
              <div key={tier} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ padding: '8px 16px', background: cfg.bg, borderBottom: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{cfg.label} ({ids.length})</span>
                    <span style={{ fontSize: 10, color: cfg.color, opacity: .75, marginLeft: 6 }}>— {cfg.message}</span>
                  </div>
                </div>
                {tierStudents.slice(0, 4).map(s => (
                  <div key={s.id} style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f9fafb' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
                      {s.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{s.full_name}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af' }}>
                        {tier === 'struggling' && s.accuracy !== null ? `${s.accuracy}% accuracy` : s.lastActive ? `Last active ${new Date(s.lastActive).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}` : 'Never active'}
                      </p>
                    </div>
                    {s.subjects?.length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {s.subjects.slice(0, 2).map(sub => {
                          const sa = s.subjectAcc?.[sub]
                          const sacc = sa && sa.total > 0 ? Math.round((sa.correct / sa.total) * 100) : null
                          const sc = pctColor(sacc)
                          return sacc !== null ? (
                            <span key={sub} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }}>
                              {sub.slice(0, 4)} {sacc}%
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {tierStudents.length > 4 && (
                  <button onClick={() => onViewStudents?.()} style={{ width: '100%', padding: '8px', fontSize: 11, fontWeight: 600, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                    +{tierStudents.length - 4} more — View all
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Overview section ──────────────────────────────────────────────────────────
function OverviewSection({ data, onTabChange, onCohortCreated }) {
  const { summary, subjectTopics, weeklyEngagement, atRisk, atRiskSegmented, students, cohort } = data
  const engRate = summary.totalStudents > 0 ? Math.round((summary.activeThisWeek / summary.totalStudents) * 100) : 0
  const streakLeaders = [...students].filter(s => s.currentStreak > 0).sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 3)

  return (
    <div id="overview" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* No cohort CTA */}
      {!cohort && (
        <div style={{ background: 'linear-gradient(135deg,#059669 0%,#0d9488 100%)', borderRadius: 16, padding: 20, color: '#fff' }}>
          <p style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Get started</p>
          <p style={{ fontSize: 13, opacity: .85, marginBottom: 16 }}>Create a cohort to get your invite code and start tracking your students.</p>
          <CreateCohortInline currentCohort={null} onCreated={onCohortCreated} />
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <StatCard label="Total Students"   value={summary.totalStudents} emoji="👥" accent="indigo" />
        <StatCard label="Active This Week" value={summary.activeThisWeek} sub={`${engRate}% engagement`} emoji="🔥" accent={engRate >= 60 ? 'emerald' : engRate >= 30 ? 'amber' : 'red'} />
        <StatCard label="Avg Accuracy"     value={summary.avgAccuracy !== null ? `${summary.avgAccuracy}%` : '—'} sub="30-day practice" emoji="🎯" accent={summary.avgAccuracy >= 70 ? 'emerald' : 'indigo'} />
        <StatCard label="Questions Done"   value={summary.totalQuestionsThisWeek} sub="this week" emoji="❓" accent="indigo" />
      </div>

      {/* Engagement banner */}
      {summary.totalStudents > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: engRate >= 60 ? '#ecfdf5' : engRate >= 30 ? '#fffbeb' : '#fef2f2',
          border: `1px solid ${engRate >= 60 ? '#a7f3d0' : engRate >= 30 ? '#fde68a' : '#fecaca'}`,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: engRate >= 60 ? '#059669' : engRate >= 30 ? '#d97706' : '#dc2626' }}>
            {engRate >= 60 ? `🎉 Great engagement — ${summary.activeThisWeek} of ${summary.totalStudents} students active this week`
              : engRate >= 30 ? `📢 ${summary.totalStudents - summary.activeThisWeek} students haven't studied this week`
              : `⚠️ Only ${summary.activeThisWeek} students active this week — ${summary.totalStudents - summary.activeThisWeek} need a nudge`}
          </p>
        </div>
      )}

      {/* ── SUBJECT MASTERY BREAKDOWN (the hero section) ── */}
      {subjectTopics.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Subject Mastery</h3>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Tap any subject to see topic-level breakdown</p>
            </div>
            <button onClick={() => onTabChange('topics')} style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Full breakdown →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subjectTopics.map((s, i) => (
              <SubjectMasteryCard key={s.subjectName} subj={s} defaultExpanded={i === 0} />
            ))}
          </div>
        </div>
      )}

      {/* ── AT-RISK STUDENTS (segmented) ── */}
      {atRiskSegmented?.length > 0 && (
        <AtRiskSection
          students={students}
          atRiskSegmented={atRiskSegmented}
          onViewStudents={() => onTabChange('students')}
        />
      )}

      {/* Weekly engagement chart */}
      {weeklyEngagement.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>Weekly Engagement</p>
            <p style={{ fontSize: 10, color: '#9ca3af' }}>Active students per week</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {weeklyEngagement.map((w, i) => {
              const maxA = Math.max(...weeklyEngagement.map(x => x.active), 1)
              const h    = Math.max(4, Math.round((w.active / maxA) * 64))
              const isLast = i === weeklyEngagement.length - 1
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: isLast ? '#059669' : '#9ca3af' }}>{w.active}</p>
                  <div style={{ width: '100%', height: 64, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', background: isLast ? '#059669' : '#a7f3d0', borderRadius: '4px 4px 0 0', height: h, transition: 'height .7s' }} />
                  </div>
                  <p style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>{w.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Streak leaders */}
      {streakLeaders.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>🔥 Streak Leaders</p>
          </div>
          {streakLeaders.map((s, i) => (
            <div key={s.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < streakLeaders.length - 1 ? '1px solid #f9fafb' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#d1d5db', width: 16 }}>{i + 1}</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#ea580c' }}>
                  {s.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{s.full_name}</p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#ea580c' }}>{s.currentStreak}d 🔥</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Students section — with per-topic mastery in expanded view ────────────────
function StudentsSection({ students, atRisk, atRiskSegmented }) {
  const [search,     setSearch]     = useState('')
  const [sortBy,     setSortBy]     = useState('name')
  const [filter,     setFilter]     = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [topicFilter, setTopicFilter] = useState(null) // filter by subject in expanded

  const segMap = {} // id → tier
  for (const s of atRiskSegmented ?? []) segMap[s.id] = s.tier

  const filtered = students
    .filter(s => {
      if (filter === 'at_risk')    return atRisk.includes(s.id)
      if (filter === 'active')     return s.isActiveThisWeek
      if (filter === 'inactive')   return !s.isActiveThisWeek
      if (filter === 'dropped')    return segMap[s.id] === 'dropped'
      if (filter === 'struggling') return segMap[s.id] === 'struggling'
      return true
    })
    .filter(s => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'accuracy') return (b.accuracy ?? -1) - (a.accuracy ?? -1)
      if (sortBy === 'streak')   return b.currentStreak - a.currentStreak
      return (a.full_name ?? '').localeCompare(b.full_name ?? '')
    })

  return (
    <div id="students" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search students…"
        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff', outline: 'none' }} />

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {[
          { id: 'all',        label: `All (${students.length})` },
          { id: 'at_risk',    label: `⚠ At risk (${atRisk.length})` },
          { id: 'dropped',    label: `📉 Dropped (${Object.values(segMap).filter(t => t === 'dropped').length})` },
          { id: 'struggling', label: `😓 Struggling (${Object.values(segMap).filter(t => t === 'struggling').length})` },
          { id: 'active',     label: 'Active' },
          { id: 'inactive',   label: 'Inactive' },
        ].filter(f => {
          // Hide empty tiers
          if (f.id === 'dropped')    return Object.values(segMap).some(t => t === 'dropped')
          if (f.id === 'struggling') return Object.values(segMap).some(t => t === 'struggling')
          return true
        }).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${filter === f.id ? '#059669' : '#e5e7eb'}`, background: filter === f.id ? '#059669' : '#fff', color: filter === f.id ? '#fff' : '#6b7280', transition: 'all .15s' }}>
            {f.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexShrink: 0 }}>
          {[{ id: 'name', l: 'Name' }, { id: 'accuracy', l: 'Acc' }, { id: 'streak', l: '🔥' }].map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)}
              style={{ padding: '6px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', background: sortBy === s.id ? '#e5e7eb' : 'transparent', color: sortBy === s.id ? '#111827' : '#9ca3af' }}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* Student list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>👥</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No students match</p>
          </div>
        )}
        {filtered.map(s => {
          const c         = pctColor(s.accuracy)
          const tier      = segMap[s.id]
          const tierCfg   = tier ? TIER_CONFIG[tier] : null
          const isExpanded = expandedId === s.id
          const subjectEntries = Object.entries(s.subjectAcc ?? {})

          return (
            <div key={s.id} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${tierCfg ? tierCfg.border : '#e5e7eb'}`, overflow: 'hidden' }}>
              <button onClick={() => setExpandedId(isExpanded ? null : s.id)}
                style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: tierCfg ? tierCfg.bg : s.isActiveThisWeek ? '#ecfdf5' : '#f9fafb', border: `1px solid ${tierCfg ? tierCfg.border : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: tierCfg?.color ?? (s.isActiveThisWeek ? '#059669' : '#9ca3af'), flexShrink: 0 }}>
                  {s.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.full_name}</p>
                    {s.currentStreak > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#ea580c' }}>{s.currentStreak}d 🔥</span>}
                    {tier && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: tierCfg?.bg, color: tierCfg?.color, border: `1px solid ${tierCfg?.border}` }}>{TIER_CONFIG[tier]?.label}</span>}
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{s.isActiveThisWeek ? '✓ Active this week' : 'Inactive this week'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.accuracy !== null && (
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
                      {s.accuracy}%
                    </span>
                  )}
                  <span style={{ color: '#d1d5db', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
                </div>
              </button>

              {isExpanded && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 14px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Quick stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[
                      { l: 'Accuracy',    v: s.accuracy !== null ? `${s.accuracy}%` : '—', color: c.fg },
                      { l: 'Streak',      v: `${s.currentStreak}d`,  color: '#ea580c' },
                      { l: 'Lessons/wk', v: s.lessonsThisWeek,       color: '#4f46e5' },
                    ].map(stat => (
                      <div key={stat.l} style={{ background: '#fff', borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: stat.color }}>{stat.v}</p>
                        <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{stat.l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Per-subject mastery + topic drill-down */}
                  {subjectEntries.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af' }}>Subject mastery</p>
                      {subjectEntries.map(([sub, sa]) => {
                        const sacc = sa.total > 0 ? Math.round((sa.correct / sa.total) * 100) : null
                        const sc   = pctColor(sacc)
                        const isOpen = topicFilter === `${s.id}-${sub}`

                        return (
                          <div key={sub} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${sc.border}`, overflow: 'hidden' }}>
                            <button
                              onClick={() => setTopicFilter(isOpen ? null : `${s.id}-${sub}`)}
                              style={{ width: '100%', padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{sub}</p>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: sc.fg }}>{sacc !== null ? `${sacc}%` : '—'}</span>
                                </div>
                                <AccBar pct={sacc} height={4} />
                                <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>{sa.total} attempts</p>
                              </div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {subjectEntries.length === 0 && (
                    <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>No practice data yet</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Topics section — cleaner cards with drill-down ────────────────────────────
function TopicsSection({ subjectTopics }) {
  const [selected, setSelected] = useState(subjectTopics[0]?.subjectName ?? '')
  const subject = subjectTopics.find(s => s.subjectName === selected)

  if (!subjectTopics.length) return (
    <div id="topics" style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
      <p style={{ fontSize: 24, marginBottom: 8 }}>📚</p>
      <p style={{ fontSize: 13, color: '#9ca3af' }}>Topic performance appears once students start practising</p>
    </div>
  )

  return (
    <div id="topics" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 2 }}>Topic Mastery Breakdown</h3>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>Sorted weakest first · Last 30 days</p>
      </div>

      {/* Subject selector */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {subjectTopics.map(s => {
          const c = pctColor(s.accuracy)
          return (
            <button key={s.subjectName} onClick={() => setSelected(s.subjectName)}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${selected === s.subjectName ? '#059669' : '#e5e7eb'}`, background: selected === s.subjectName ? '#059669' : '#fff', color: selected === s.subjectName ? '#fff' : '#374151' }}>
              {s.subjectName}
              {s.accuracy !== null && (
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, background: selected === s.subjectName ? 'rgba(255,255,255,.2)' : c.bg, color: selected === s.subjectName ? '#fff' : c.fg }}>
                  {s.accuracy}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Subject overview banner */}
      {subject && (
        <div style={{ padding: '12px 16px', borderRadius: 14, background: pctColor(subject.accuracy).bg, border: `1px solid ${pctColor(subject.accuracy).border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{subject.subjectName}</p>
            <p style={{ fontSize: 11, color: '#6b7280' }}>{subject.topics.length} topics · {subject.topics.reduce((a, t) => a + t.total, 0)} total attempts</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: pctColor(subject.accuracy).fg }}>{subject.accuracy ?? '—'}%</p>
            <p style={{ fontSize: 10, color: '#9ca3af' }}>class avg</p>
          </div>
        </div>
      )}

      {/* Topic cards */}
      {subject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {subject.topics.map((t, i) => {
            const c = pctColor(t.accuracy)
            return (
              <div key={t.topicId} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${c.border}`, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{t.topicName}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.total} attempts · {t.correct} correct</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>{c.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: c.fg }}>{t.accuracy}%</span>
                  </div>
                </div>
                <AccBar pct={t.accuracy} height={5} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Cohort section (unchanged) ────────────────────────────────────────────────
function CohortSection({ cohort, allCohorts, totalStudents, onCohortCreated }) {
  const [copied,      setCopied]      = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const inviteLink = cohort && typeof window !== 'undefined' ? `${window.location.origin}/join/${cohort.invite_code}` : ''

  function copyCode() {
    if (!cohort) return
    navigator.clipboard.writeText(cohort.invite_code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div id="cohort" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {cohort ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#111827' }}>{cohort.name}</p>
              {cohort.session && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{cohort.session}</p>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>Active</span>
          </div>
          <div style={{ padding: '20px 16px', background: 'linear-gradient(135deg,#ecfdf5 0%,#f0fdfa 100%)', textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#059669', marginBottom: 8 }}>Student invite code</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <p style={{ fontSize: 40, fontWeight: 900, color: '#065f46', letterSpacing: '.3em', fontFamily: 'monospace' }}>{cohort.invite_code}</p>
              <button onClick={copyCode} style={{ padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', border: '1.5px solid #a7f3d0', background: copied ? '#ecfdf5' : '#fff', color: '#059669', transition: 'all .15s' }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#6ee7b7', marginTop: 8 }}>Students enter this in ExamPrep → Community → Join School</p>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, color: '#374151' }}><strong style={{ color: '#111827' }}>{totalStudents}</strong> student{totalStudents !== 1 ? 's' : ''} joined</p>
            <button onClick={() => navigator.share?.({ title: `Join ${cohort.name} on ExamPrep`, url: inviteLink }) ?? copyCode()}
              style={{ padding: '8px 14px', borderRadius: 10, background: '#059669', color: '#fff', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
              📤 Share invite
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg,#ecfdf5,#f0fdfa)', border: '1px solid #a7f3d0', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🎓</p>
          <p style={{ fontSize: 15, fontWeight: 900, color: '#111827', marginBottom: 4 }}>No active cohort</p>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55, marginBottom: 16 }}>Create a cohort to get an invite code for your students.</p>
        </div>
      )}
      <CreateCohortInline currentCohort={cohort} onCreated={onCohortCreated} />
      {allCohorts.length > 1 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <button onClick={() => setShowHistory(h => !h)}
            style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span>Past cohorts ({allCohorts.filter(c => !c.is_active).length})</span>
            <span style={{ color: '#d1d5db', transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
          </button>
          {showHistory && (
            <div style={{ borderTop: '1px solid #f3f4f6' }}>
              {allCohorts.filter(c => !c.is_active).map(c => (
                <div key={c.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f9fafb' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c.name}</p>
                    {c.session && <p style={{ fontSize: 10, color: '#9ca3af' }}>{c.session}</p>}
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{c.invite_code}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Create cohort form (preserved from v2) ────────────────────────────────────
function CreateCohortInline({ currentCohort, onCreated }) {
  const [open,    setOpen]    = useState(false)
  const [name,    setName]    = useState('')
  const [session, setSession] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true); setError(null)
    try {
      const res  = await fetch('/api/school/cohort', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), session: session.trim() }) })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onCreated?.(data.cohort); setOpen(false); setName(''); setSession('')
    } catch { setError('Failed — try again') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🎓</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{currentCohort ? `New cohort (archives "${currentCohort.name}")` : 'Create your first cohort'}</p>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>{currentCohort ? 'Start fresh for a new set of students' : 'Get a code to share with your students'}</p>
          </div>
        </div>
        <span style={{ color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 16px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {currentCohort && <p style={{ fontSize: 11, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px' }}>⚠ "{currentCohort.name}" will be archived. Student data is preserved.</p>}
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Cohort name (e.g. SS3 Science 2026)" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff', outline: 'none' }} />
          <input value={session} onChange={e => setSession(e.target.value)} placeholder="Session (e.g. 2025/2026) — optional" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff', outline: 'none' }} />
          {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, color: '#6b7280', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving || !name.trim()} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#059669', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: saving || !name.trim() ? .4 : 1 }}>
              {saving ? 'Creating…' : 'Create cohort →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reports section (preserved from v2) ──────────────────────────────────────
function ReportsSection({ schoolName, cohortName }) {
  const [generating, setGenerating] = useState(null)
  const [period,     setPeriod]     = useState('month')

  async function generatePDF(type) {
    setGenerating(type)
    try {
      const res  = await fetch(`/api/school/report?type=${type}&period=${period}`)
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      const html = buildReportHTML(type, data)
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none;'
      document.body.appendChild(iframe)
      iframe.contentDocument.write(html)
      iframe.contentDocument.close()
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 2000) }, 600)
    } catch { alert('Failed to generate report') }
    finally { setGenerating(null) }
  }

  function buildReportHTML(type, data) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:20mm;size:A4}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#111827;margin:0}*{box-sizing:border-box}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h1>${data.schoolName ?? schoolName}</h1><p>${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p></body></html>`
  }

  async function downloadCSV() {
    setGenerating('csv')
    try {
      const res  = await fetch(`/api/school/report?type=students&period=${period}&format=csv`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url; a.download = `students_report_${period}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed') }
    finally { setGenerating(null) }
  }

  const REPORTS = [
    { type: 'management', label: 'Management Report',   sub: 'Executive summary for school board',          emoji: '📊', bg: '#eef2ff', border: '#c7d2fe', btnBg: '#4f46e5' },
    { type: 'subjects',   label: 'Subject Report',      sub: 'Per-subject topic breakdown for teachers',     emoji: '📚', bg: '#ecfdf5', border: '#a7f3d0', btnBg: '#059669' },
    { type: 'students',   label: 'Student Progress',    sub: 'Full student table — lessons, accuracy, streak', emoji: '👥', bg: '#f5f3ff', border: '#ddd6fe', btnBg: '#7c3aed' },
  ]

  return (
    <div id="reports" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Report period:</p>
        {[{ id: 'week', l: 'Last 7 days' }, { id: 'month', l: 'Last 30 days' }].map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid #e5e7eb', background: period === p.id ? '#111827' : '#fff', color: period === p.id ? '#fff' : '#6b7280', transition: 'all .15s' }}>
            {p.l}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REPORTS.map(r => (
          <div key={r.type} style={{ padding: 16, borderRadius: 14, background: r.bg, border: `1px solid ${r.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{r.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{r.label}</p>
              <p style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{r.sub}</p>
            </div>
            <button onClick={() => generatePDF(r.type)} disabled={!!generating}
              style={{ padding: '9px 14px', borderRadius: 10, background: r.btnBg, color: '#fff', fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: generating ? .4 : 1, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {generating === r.type ? '…' : '⬇ PDF'}
            </button>
          </div>
        ))}
        <div style={{ padding: '12px 16px', borderRadius: 14, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Export to CSV</p>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>Open in Excel or Google Sheets</p>
          </div>
          <button onClick={downloadCSV} disabled={!!generating}
            style={{ padding: '9px 14px', borderRadius: 10, background: '#111827', color: '#fff', fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: generating ? .4 : 1 }}>
            {generating === 'csv' ? '…' : '⬇ CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Mobile bottom tabs ────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', emoji: '📊' },
  { id: 'students', label: 'Students', emoji: '👥' },
  { id: 'topics',   label: 'Topics',   emoji: '📚' },
  { id: 'cohort',   label: 'Cohort',   emoji: '🎓' },
  { id: 'reports',  label: 'Reports',  emoji: '📄' },
]

function MobileBottomTabs({ active, onChange }) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e5e7eb', display: 'flex' }} className="lg:hidden">
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', color: active === t.id ? '#059669' : '#9ca3af' }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{t.emoji}</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SchoolDashboardPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('overview')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const res = await fetch('/api/school/dashboard')
    const d   = await res.json()
    if (d.error) { setError(d.error); setLoading(false); return }
    setData(d); setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onSidebarTab(e) { setTab(e.detail) }
    window.addEventListener('school-tab-change', onSidebarTab)
    return () => window.removeEventListener('school-tab-change', onSidebarTab)
  }, [])

  function handleCohortCreated(newCohort) {
    setData(prev => prev ? { ...prev, cohort: newCohort, allCohorts: [newCohort, ...(prev.allCohorts ?? [])], summary: { ...prev.summary, totalStudents: 0 } } : prev)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p style={{ fontSize: 13, color: '#9ca3af' }}>Loading school data…</p>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px', textAlign: 'center' }}>
      <div>
        <p style={{ fontSize: 32, marginBottom: 10 }}>⚠️</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{error}</p>
        <button onClick={load} style={{ color: '#059669', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
      </div>
    </div>
  )

  const { cohort, allCohorts, summary, students, subjectTopics, weeklyEngagement, atRisk, atRiskSegmented, school } = data

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{TABS.find(t => t.id === tab)?.label ?? 'Dashboard'}</h1>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {cohort ? `${cohort.name}${cohort.session ? ` · ${cohort.session}` : ''}` : 'No active cohort yet'}
          </p>
        </div>
      </div>

      <div style={{ paddingBottom: 80 }}>
        {tab === 'overview' && <OverviewSection data={data} onTabChange={setTab} onCohortCreated={handleCohortCreated} />}
        {tab === 'students' && <StudentsSection students={students} atRisk={atRisk} atRiskSegmented={atRiskSegmented ?? []} />}
        {tab === 'topics'   && <TopicsSection   subjectTopics={subjectTopics} />}
        {tab === 'cohort'   && <CohortSection   cohort={cohort} allCohorts={allCohorts} totalStudents={summary.totalStudents} onCohortCreated={handleCohortCreated} />}
        {tab === 'reports'  && <ReportsSection  schoolName={school?.name ?? ''} cohortName={cohort?.name ?? ''} />}
      </div>

      <MobileBottomTabs active={tab} onChange={setTab} />
    </>
  )
}