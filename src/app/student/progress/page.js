'use client'
// src/app/student/progress/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// KEY CHANGES from v1:
//   1. Full light + dark via CSS var tokens — NO hardcoded dark hex objects.
//   2. Topic drill-down: tap a subject row → slides in topic view with
//      Weak / Building / Strong tiers and per-topic bars.
//   3. Uses ScoreRing + ProgressBar from Primitives.jsx.
//   4. resolveSubjectColors() for subject accent everywhere.
//   5. Back button on topic view returns to subject overview.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { ScoreRing, ProgressBar } from '@/components/ui/Primitives'

const SUBJECT_ICONS = {
  'Physics': '⚡', 'Chemistry': '⚗️', 'Biology': '🧬',
  'Mathematics': '📐', 'Further Mathematics': '📐',
  'English Language': '📖', 'Use of English': '📖',
  'Economics': '📊', 'Government': '🏛️', 'Geography': '🌍',
  'Literature in English': '📚', 'Agricultural Science': '🌱',
  'Commerce': '💼', 'Accounting': '🧮', 'default': '📝',
}
const getIcon = name => SUBJECT_ICONS[name] ?? SUBJECT_ICONS.default

const CIRC7 = 2 * Math.PI * 30  // r=30

function WeekChart({ data }) {
  const isDark = useIsDark()
  const days   = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su']
  const max    = Math.max(...data, 1)
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const barBase  = isDark ? 'rgba(255,255,255,0.07)' : '#e4e7f4'
  return (
    <div className="flex justify-around items-end gap-1" style={{ height: 64 }}>
      {days.map((d, i) => {
        const h = data[i] ? Math.round((data[i] / max) * 52) : 8
        const isToday = i === todayIdx
        const hasDone = data[i] > 0
        return (
          <div key={d} className="flex-1 flex flex-col items-center gap-1">
            <div style={{
              width: '100%', borderRadius: '3px 3px 0 0', height: h,
              background: isToday
                ? 'var(--active-text)'
                : hasDone ? 'var(--active-bg)' : barBase,
              transition: 'height .7s ease',
            }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: isToday ? 'var(--active-text)' : 'var(--text-tert)' }}>
              {d}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Subject row (overview) ────────────────────────────────────────────────────
function SubjectRow({ sub, onClick }) {
  const isDark = useIsDark()
  const colors = resolveSubjectColors(sub.name, isDark)
  const pct    = sub.pct ?? 0
  const barColor = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'
  const pctColor = barColor
  return (
    <button className="w-full flex items-center gap-3 py-3 border-b border-default text-left transition-opacity active:opacity-70 last:border-b-0"
      onClick={onClick}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: colors.bg, border: `1.5px solid ${colors.border}` }}>
        {getIcon(sub.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-primary">{sub.name}</p>
        <p className="text-xs text-secondary mt-0.5">{sub.completed ?? 0} / {sub.total ?? 0} topics practised</p>
        <ProgressBar pct={pct} fillColor={colors.solid} height={4} className="mt-1.5" />
      </div>
      <p className="text-sm font-black flex-shrink-0" style={{ color: pctColor }}>{pct}%</p>
      <span className="text-secondary text-sm flex-shrink-0">›</span>
    </button>
  )
}

// ── Topic tier section ────────────────────────────────────────────────────────
function TopicTierSection({ label, labelColor, labelBg, topics, emptyMsg }) {
  const isDark = useIsDark()
  if (!topics?.length) return null
  return (
    <div className="rounded-2xl border border-default bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: labelBg }}>
        <span className="text-xs font-black uppercase tracking-wide" style={{ letterSpacing: '0.08em', color: labelColor }}>
          {label} ({topics.length})
        </span>
      </div>
      <div className="px-4">
        {topics.map((t, i) => {
          const barColor = t.tier === 'weak' ? 'var(--danger)' : t.tier === 'mid' ? 'var(--warning)' : 'var(--success)'
          const pillStyle = t.tier === 'weak'
            ? { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1.5px solid var(--danger-border)' }
            : t.tier === 'mid'
            ? { background: 'var(--warning-bg)', color: 'var(--warning)', border: '1.5px solid var(--warning-border)' }
            : { background: 'var(--success-bg)', color: 'var(--success)', border: '1.5px solid var(--success-border)' }
          const pillLabel = t.tier === 'weak' ? 'Weak' : t.tier === 'mid' ? 'Mid' : 'Strong'
          return (
            <div key={i} className={`flex items-center gap-3 py-3 ${i < topics.length - 1 ? 'border-b border-default' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">{t.name}</p>
                {t.sub && <p className="text-xs text-secondary mt-0.5 truncate">{t.sub}</p>}
                <ProgressBar pct={t.pct} fillColor={barColor} height={3} className="mt-1.5" />
              </div>
              <span className="text-xs font-black flex-shrink-0" style={{ color: barColor }}>{t.pct}%</span>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={pillStyle}>{pillLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Topic drill-down view ─────────────────────────────────────────────────────
function TopicDrillDown({ sub, onBack }) {
  const isDark = useIsDark()
  const colors = resolveSubjectColors(sub.name, isDark)
  const topics = sub.topics ?? []
  const weak   = topics.filter(t => t.tier === 'weak')
  const mid    = topics.filter(t => t.tier === 'mid')
  const strong = topics.filter(t => t.tier === 'strong')
  const router = useRouter()

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-default flex-shrink-0"
        style={{ height: 52, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)' }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 font-bold text-sm"
          style={{ color: colors.solid }}>
          ← Back
        </button>
        <span className="text-sm font-black text-primary">{sub.name} Topics</span>
        <span className="text-xs font-bold px-2 py-1 rounded-full"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
          {sub.pct}%
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 100 }}>
        <div className="px-4 space-y-3 pt-4">
          {/* Subject overview strip */}
          <div className="flex items-center gap-3 p-4 rounded-2xl border"
            style={{ background: colors.bg, borderColor: colors.border }}>
            <span style={{ fontSize: 26 }}>{getIcon(sub.name)}</span>
            <div className="flex-1">
              <p className="text-sm font-black text-primary">{sub.name} Mastery</p>
              <p className="text-xs text-secondary mt-0.5">{sub.completed} of {sub.total} topics practised</p>
              <ProgressBar pct={sub.pct} fillColor={colors.solid} height={5} className="mt-2" />
            </div>
            <p className="text-xl font-black" style={{ color: colors.solid }}>{sub.pct}%</p>
          </div>

          {/* Tier sections */}
          <TopicTierSection
            label="⚠ Needs attention"
            labelColor="var(--danger)"
            labelBg="var(--danger-bg)"
            topics={weak}
          />
          <TopicTierSection
            label="📈 Building"
            labelColor="var(--warning)"
            labelBg="var(--warning-bg)"
            topics={mid}
          />
          <TopicTierSection
            label="✓ Strong"
            labelColor="var(--success)"
            labelBg="var(--success-bg)"
            topics={strong}
          />

          {/* CTA to practice weakest */}
          {weak.length > 0 && (
            <button
              onClick={() => {
                sessionStorage.setItem('practice_config', JSON.stringify({ subjects: [sub.name], count: 10, topicName: weak[0].name }))
                router.push('/student/practice/session')
              }}
              className="w-full py-4 rounded-2xl text-sm font-black text-white"
              style={{ background: '#0b1330', boxShadow: '0 5px 0 #05070f' }}>
              Practise {weak[0].name} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const supabase  = createClient()
  const router    = useRouter()
  const isDark    = useIsDark()
  const [subjects, setSubjects] = useState([])
  const [weekData, setWeekData] = useState([0,0,0,0,0,0,0])
  const [weekTotal, setWeekTotal] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [drillSub, setDrillSub] = useState(null)  // null = overview; subject obj = topic view

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: paths }, { data: prog }, { data: attempts }, { data: masteryRows }] = await Promise.all([
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug)')
          .eq('student_id', user.id),
        supabase.from('lesson_progress')
          .select('subtopic_id, completed')
          .eq('student_id', user.id),
        supabase.from('question_attempts')
          .select('created_at')
          .eq('student_id', user.id)
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('student_topic_mastery')
          .select('topic_id, score, attempt_count, topics(id, name, subtopics(id, name))')
          .eq('student_id', user.id),
      ])

      // Subject mastery
      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      const masteryMap = {}
      for (const row of masteryRows ?? []) {
        masteryMap[row.topic_id] = { score: row.score ?? 0, attempts: row.attempt_count ?? 0, topicName: row.topics?.name ?? '' }
      }

      const built = (paths ?? []).map(p => {
        const name  = p.subjects?.name ?? ''
        const ids   = p.ordered_subtopic_ids ?? []
        const total = ids.length
        const completed = ids.filter(id => completedIds.has(id)).length
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0

        // Build per-topic list for drill-down
        const topicMap = {}
        for (const row of masteryRows ?? []) {
          if (!row.topics) continue
          const t = row.topics
          if (!topicMap[t.id]) topicMap[t.id] = { name: t.name, score: 0, attempts: 0, subtopics: t.subtopics ?? [] }
          topicMap[t.id].score = Math.max(topicMap[t.id].score, row.score ?? 0)
          topicMap[t.id].attempts += row.attempt_count ?? 0
        }
        const topics = Object.values(topicMap).map(t => ({
          name: t.name,
          sub: t.subtopics.slice(0, 2).map(s => s.name).join(', ') + (t.subtopics.length > 2 ? '…' : ''),
          pct: Math.round(t.score),
          tier: t.score >= 75 ? 'strong' : t.score >= 50 ? 'mid' : 'weak',
        })).sort((a, b) => a.pct - b.pct)

        return { name, completed, total, pct, topics }
      })
      setSubjects(built)

      // Weekly data
      const buckets = [0,0,0,0,0,0,0]
      for (const a of attempts ?? []) {
        const d = new Date(a.created_at)
        const dayOfWeek = d.getDay()  // 0=Sun
        const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        buckets[idx]++
      }
      setWeekData(buckets)
      setWeekTotal((attempts ?? []).length)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  if (loading) return (
    <div className="min-h-dvh bg-base flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 animate-spin"
        style={{ borderColor: 'var(--active-border)', borderTopColor: 'var(--active-text)' }} />
    </div>
  )

  // If drill-down is active, show topic view
  if (drillSub) {
    return <TopicDrillDown sub={drillSub} onBack={() => setDrillSub(null)} />
  }

  const overallPct = subjects.length
    ? Math.round(subjects.reduce((s, sub) => s + sub.pct, 0) / subjects.length)
    : 0
  const overallTier = overallPct >= 70 ? 'Strong' : overallPct >= 50 ? 'Getting there' : overallPct >= 30 ? 'Building' : 'Starting out'
  const overallColor = overallPct >= 70 ? 'var(--success)' : overallPct >= 50 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="min-h-dvh bg-base">
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-default"
        style={{ height: 52, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="w-8" />
        <span className="text-sm font-black text-primary">My Progress</span>
        <div className="w-8" />
      </div>

      <div className="px-4 py-5 space-y-4" style={{ paddingBottom: 100 }}>

        {/* Top row: ring + weekly chart */}
        <div className="flex gap-3">
          {/* Overall ring */}
          <div className="flex-1 bg-card rounded-2xl border border-default p-4 shadow-card flex items-center gap-3">
            <ScoreRing pct={overallPct} color={overallColor} r={30} size={80} />
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-secondary" style={{ letterSpacing: '0.09em' }}>Overall</p>
              <p className="text-base font-black text-primary mt-1">{overallTier}</p>
              {weekTotal > 0 && (
                <p className="text-xs text-secondary mt-0.5">+{weekTotal} Qs this week</p>
              )}
            </div>
          </div>

          {/* Weekly bars */}
          <div className="flex-1 bg-card rounded-2xl border border-default p-4 shadow-card">
            <p className="text-[9px] font-black uppercase tracking-wide text-secondary mb-3" style={{ letterSpacing: '0.09em' }}>This week</p>
            <WeekChart data={weekData} />
            <p className="text-center text-secondary mt-1.5" style={{ fontSize: 9 }}>{weekTotal} questions</p>
          </div>
        </div>

        {/* Subject list */}
        <div className="bg-card rounded-2xl border border-default shadow-card overflow-hidden">
          <div className="px-4 pt-3.5 pb-1 border-b border-default">
            <p className="text-[9px] font-black uppercase tracking-wide text-secondary" style={{ letterSpacing: '0.09em' }}>
              Subjects — tap to see topics
            </p>
          </div>
          <div className="px-4">
            {subjects.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-secondary text-sm">No subjects yet — complete the diagnostic to get started.</p>
              </div>
            )}
            {subjects.map((sub, i) => (
              <SubjectRow
                key={sub.name}
                sub={sub}
                onClick={() => setDrillSub(sub)}
              />
            ))}
          </div>
        </div>

        {/* Back to home */}
        <Link href="/student/dashboard"
          className="block w-full py-4 rounded-2xl text-sm font-black text-white text-center"
          style={{ background: '#0b1330', boxShadow: '0 5px 0 #05070f' }}>
          ← Back to home
        </Link>
      </div>
    </div>
  )
}