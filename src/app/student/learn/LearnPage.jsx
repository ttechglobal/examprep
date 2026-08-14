'use client'
// src/app/student/learn/LearnPage.jsx — v5
// Redesign:
//   • EXL card at top (before focus areas)
//   • Focus areas below EXL card, with "Practice →" CTA
//   • Subject sections default to COLLAPSED, user taps to expand

import { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { LearnHubSkeleton } from '@/components/ui/Skeletons'
import CoachBanner from '@/components/ui/CoachBanner'
import { learnCoach } from '@/lib/coach'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getIcon = n => SUBJECT_ICONS[n] ?? SUBJECT_ICONS.default

const EXL_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Further Mathematics']

// ── EXL Learning World card — matches prototype exactly ───────────────────────
// Simple, clean: icon + title + desc + open button. No feature pills, no expansion.
function EXLWorldCard() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div style={{ borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(145deg,#071B49 0%,#1a1060 55%,#0b0d20 100%)', border: '1px solid rgba(155,122,224,.35)', padding: 20, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(155,122,224,.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(155,122,224,.2)', border: '1px solid rgba(155,122,224,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📖</div>
            <div>
              <p style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(196,181,253,.6)', marginBottom: 2 }}>Study platform</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>EXL Learning World</p>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', lineHeight: 1.55, marginBottom: 14 }}>
            Interactive lessons, video walkthroughs and step-by-step material — all in one place.
          </p>
          <button
            onClick={() => setOpen(true)}
            style={{ width: '100%', padding: '12px 0', borderRadius: 13, background: 'rgba(155,122,224,.3)', boxShadow: '0 4px 0 rgba(109,74,192,.6)', border: '1px solid rgba(155,122,224,.5)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'inherit' }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(3px)'}
            onMouseUp={e => e.currentTarget.style.transform = ''}
            onTouchStart={e => e.currentTarget.style.transform = 'translateY(3px)'}
            onTouchEnd={e => e.currentTarget.style.transform = ''}
          >
            Open EXL Learning World →
          </button>
        </div>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#1264E5', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>EXL Learning World</span>
            <button onClick={() => setOpen(false)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Close ✕</button>
          </div>
          <iframe src="https://exlgames.vercel.app/" style={{ flex: 1, border: 'none', width: '100%' }} title="EXL Learning World" allow="fullscreen" />
        </div>
      )}
    </>
  )
}

// ── Topic row ─────────────────────────────────────────────────────────────────
function TopicRow({ topic, accent }) {
  const pct   = topic.pct ?? 0
  const tier  = pct >= 70 ? 'strong' : pct >= 40 ? 'mid' : 'weak'
  const color = tier === 'strong' ? '#4ade80' : tier === 'mid' ? '#fbbf24' : '#f87171'
  const label = tier === 'strong' ? 'Strong' : tier === 'mid' ? 'Building' : 'Weak'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.2 }}>{topic.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${color}18`, border: `1px solid ${color}40`, color }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color }}>{pct}%</span>
          </div>
        </div>
        <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(pct, 2)}%`, height: '100%', background: accent, borderRadius: 99, opacity: pct > 0 ? 1 : 0.3 }} />
        </div>
      </div>
    </div>
  )
}

// ── Subject section ───────────────────────────────────────────────────────────
function SubjectSection({ subjectData, isDark }) {
  const [expanded, setExpanded] = useState(false) // collapsed by default
  const colors     = resolveSubjectColors(subjectData.name, isDark)
  const pct        = subjectData.pct ?? 0
  const weakTopics = subjectData.topics?.filter(t => t.pct < 40) ?? []
  const remaining  = (subjectData.total ?? 0) - (subjectData.completed ?? 0)

  // Mastery tier — visible in collapsed state so students can scan all subjects at once
  const tier      = pct >= 70 ? 'Strong' : pct >= 40 ? 'Building' : 'Needs work'
  const tierColor = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'
  const tierBg    = pct >= 70 ? 'var(--success-bg)' : pct >= 40 ? 'var(--warning-bg)' : 'var(--danger-bg)'
  const tierBdr   = pct >= 70 ? 'var(--success-border)' : pct >= 40 ? 'var(--warning-border)' : 'var(--danger-border)'

  return (
    <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header — tappable to expand/collapse */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 11, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {getIcon(subjectData.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)' }}>{subjectData.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Mastery tier pill — always visible, even when collapsed */}
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: tierBg, border: `1px solid ${tierBdr}`, color: tierColor }}>
                {tier}
              </span>
              <span style={{ fontSize: 12, fontWeight: 900, color: colors.solid }}>{pct}%</span>
            </div>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(pct, 2)}%`, height: '100%', background: colors.solid, borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontSize: 9, color: 'var(--text-tert)' }}>{subjectData.completed}/{subjectData.total} topics</span>
            {remaining > 0 && <span style={{ fontSize: 9, color: 'var(--text-tert)' }}>{remaining} left</span>}
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--text-tert)', transition: 'transform .2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0, lineHeight: 1 }}>›</span>
      </button>

      {/* Topics — only shown when expanded */}
      {expanded && subjectData.topics?.length > 0 && (
        <div style={{ padding: '0 16px 4px', borderTop: '1px solid var(--border)' }}>
          {weakTopics.length > 0 && (
            // Amber instead of red — less alarming, more motivating
            <div style={{ margin: '10px 0 4px', padding: '7px 10px', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--warning)' }}>
                {weakTopics.length} topic{weakTopics.length > 1 ? 's' : ''} need{weakTopics.length === 1 ? 's' : ''} more practice
              </p>
            </div>
          )}
          {subjectData.topics.slice().sort((a, b) => a.pct - b.pct).map(topic => (
            <TopicRow key={topic.name} topic={topic} accent={colors.solid} />
          ))}
          <Link
            href="/student/practice"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', margin: '6px 0 10px', background: `${colors.solid}12`, border: `1px solid ${colors.solid}28`, borderRadius: 11, textDecoration: 'none' }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: colors.solid }}>Practise {subjectData.name} →</span>
          </Link>
        </div>
      )}

      {expanded && (!subjectData.topics || subjectData.topics.length === 0) && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>No topic data yet — start practising to see your progress here.</p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router   = useRouter()
  const isDark   = useIsDark()
  const supabase = useMemo(() => createClient(), [])
  const { userId } = useUser()

  const [profile,       setProfile]      = useState(null)
  const [subjectData,   setSubjectData]  = useState([])
  const [loading,       setLoading]      = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => { if (userId) init(userId) }, [userId]) // eslint-disable-line

  async function init(uid) {
    const [{ data: prof }, { data: paths }, { data: masteryRows }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, subjects, streak_days').eq('id', uid).single(),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug)')
        .eq('student_id', uid),
      supabase.from('student_topic_mastery')
        .select('topic_id, score, attempt_count, topics(id, name, subject_id)')
        .eq('student_id', uid),
    ])

    setProfile(prof)

    const masteryMap = {}
    for (const row of masteryRows ?? []) {
      if (!row.topics) continue
      masteryMap[row.topic_id] = { score: row.score ?? 0, name: row.topics.name, subjectId: row.topics.subject_id }
    }

    const subjectIds = (paths ?? []).map(p => p.subject_id)
    if (subjectIds.length === 0) { setLoading(false); return }

    const { data: allTopics } = await supabase
      .from('topics').select('id, name, subject_id, order_index').in('subject_id', subjectIds).order('order_index')

    const topicsBySubject = {}
    for (const t of allTopics ?? []) {
      if (!topicsBySubject[t.subject_id]) topicsBySubject[t.subject_id] = []
      topicsBySubject[t.subject_id].push({ id: t.id, name: t.name, pct: Math.round(masteryMap[t.id]?.score ?? 0) })
    }

    const built = (paths ?? []).map(path => {
      const name   = path.subjects?.name ?? ''
      const topics = topicsBySubject[path.subject_id] ?? []
      const withScore = topics.filter(t => masteryMap[t.id])
      const pct = withScore.length > 0
        ? Math.round(withScore.reduce((s, t) => s + t.pct, 0) / withScore.length)
        : 0
      return { name, pct, completed: withScore.length, total: topics.length, topics, subjectId: path.subject_id }
    })

    setSubjectData(built)
    setLoading(false)
  }

  if (loading) return <LearnHubSkeleton />

  const firstName      = profile?.full_name?.split(' ')[0] ?? ''
  const examLabel      = profile?.exam_type === 'BOTH' ? 'WAEC & JAMB' : (profile?.exam_type ?? 'WAEC')
  const streakDays     = profile?.streak_days ?? 0
  const allSubjectNames = subjectData.map(s => s.name)

  // Weak topics across all subjects
  const allWeakTopics = subjectData.flatMap(sub =>
    (sub.topics ?? [])
      .filter(t => t.pct < 40)
      .map(t => ({ ...t, subjectName: sub.name }))
  ).slice(0, 3)

  const totalTopics   = subjectData.reduce((s, sub) => s + (sub.total ?? 0), 0)
  const coveredTopics = subjectData.reduce((s, sub) => s + (sub.completed ?? 0), 0)
  const coach = learnCoach({
    firstName,
    weakTopics: allWeakTopics,
    totalTopics,
    coveredTopics,
    nextRecommended: allWeakTopics[0]?.name,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 112 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 4 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 3 }}>
            {examLabel} · Topic progress
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.1, color: 'var(--text-prim)' }}>
            Learn{firstName ? `, ${firstName}` : ''} 📚
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {streakDays >= 3 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,195,107,.12)', border: '1.5px solid rgba(255,195,107,.28)', fontSize: 10, fontWeight: 700, color: '#ffc36b' }}>
              🔥 {streakDays}
            </div>
          )}
          <button
            onClick={() => setShowGoalModal(true)}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Always show EXL card and coach banner */}
      <CoachBanner emoji={coach.emoji} message={coach.message} />
      <EXLWorldCard />

      {/* Flashcards + Formulas entry cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => router.push('/student/flashcards')}
          style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'14px',borderRadius:16,background:'var(--bg-card)',border:'1.5px solid rgba(155,122,224,.3)',cursor:'pointer',textAlign:'left',fontFamily:'inherit',gap:8,transition:'all .12s' }}>
          <div style={{ width:38,height:38,borderRadius:11,background:'rgba(155,122,224,.15)',border:'1px solid rgba(155,122,224,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🃏</div>
          <div>
            <p style={{ fontSize:13,fontWeight:800,color:'var(--text-prim)',marginBottom:2 }}>Flashcards</p>
            <p style={{ fontSize:10,color:'var(--text-tert)',lineHeight:1.4 }}>Flip & learn key concepts by topic</p>
          </div>
        </button>
        <button onClick={() => router.push('/student/formulas')}
          style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'14px',borderRadius:16,background:'var(--bg-card)',border:'1.5px solid rgba(255,184,0,.3)',cursor:'pointer',textAlign:'left',fontFamily:'inherit',gap:8,transition:'all .12s' }}>
          <div style={{ width:38,height:38,borderRadius:11,background:'rgba(255,184,0,.12)',border:'1px solid rgba(255,184,0,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🧮</div>
          <div>
            <p style={{ fontSize:13,fontWeight:800,color:'var(--text-prim)',marginBottom:2 }}>Key Formulas</p>
            <p style={{ fontSize:10,color:'var(--text-tert)',lineHeight:1.4 }}>Reference sheets for Maths, Physics & more</p>
          </div>
        </button>
      </div>

      {/* Focus areas — weak topics — shown whenever there's mastery data */}
      {allWeakTopics.length > 0 && (
        <div>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Focus areas</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allWeakTopics.map(t => {
              const accentMap = { 'Physics': '#18B7F2', 'Chemistry': '#9b7ae0', 'Biology': '#4ade80', 'Mathematics': '#FFB800', 'Further Mathematics': '#FFB800' }
              const color = accentMap[t.subjectName] ?? '#9b7ae0'
              return (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: 'var(--bg-card)', border: `1.5px solid ${color}25`, borderRadius: 13 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{getIcon(t.subjectName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 1 }}>{t.subjectName} · {t.pct}% mastered</p>
                    <div style={{ marginTop: 4, height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#18B7F2,#1264E5)', width: `${Math.max(t.pct, 2)}%` }} />
                    </div>
                  </div>
                  <Link href="/student/practice" style={{ fontSize: 11, fontWeight: 800, color, background: `${color}12`, border: `1px solid ${color}25`, padding: '5px 10px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
                    Practise →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={updated => { setProfile(updated); setShowGoalModal(false) }}
          />
        </Suspense>
      )}
    </div>
  )
}