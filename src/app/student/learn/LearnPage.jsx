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
import Link from 'next/link'

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

// ── EXL Learning World card ───────────────────────────────────────────────────
function EXLWorldCard({ studentSubjects }) {
  const [open, setOpen] = useState(false)
  const covered = studentSubjects.filter(s => EXL_SUBJECTS.includes(s))
  if (covered.length === 0) return null

  return (
    <>
      <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(155,122,224,.25)' }}>
        <div style={{ background: 'linear-gradient(150deg,#0b1330 0%,#1a1060 55%,#0b0d20 100%)', padding: '18px 16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .04, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(155,122,224,.15)', border: '1px solid rgba(155,122,224,.3)', borderRadius: 999, padding: '4px 10px', marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9b7ae0' }} />
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9b7ae0' }}>EXL Learning World</span>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>
              Learn {covered.join(', ')} interactively
            </h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, marginBottom: 14 }}>
              For topics you're struggling with, EXL lets you interact with the concepts — not just read about them.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {covered.map(s => (
                <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)' }}>
                  {getIcon(s)} {s}
                </span>
              ))}
            </div>
            <button
              onClick={() => setOpen(true)}
              style={{ width: '100%', padding: '13px 0', borderRadius: 13, background: '#9b7ae0', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: '0 5px 0 #6d4ac0', transition: 'transform .1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'translateY(3px)'}
              onMouseUp={e => e.currentTarget.style.transform = ''}
              onTouchStart={e => e.currentTarget.style.transform = 'translateY(3px)'}
              onTouchEnd={e => e.currentTarget.style.transform = ''}
            >
              Open EXL Learning World →
            </button>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '9px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14 }}>
          {['Interactive lessons', 'Step-by-step', 'Science & Maths'].map(f => (
            <span key={f} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tert)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#9b7ae0' }}>✓</span> {f}
            </span>
          ))}
        </div>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#0b1330', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9b7ae0' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>EXL Learning World</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Close ✕
            </button>
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
        <div style={{ height: 3, background: 'var(--bg-inset)', borderRadius: 99, overflow: 'hidden' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {weakTopics.length > 0 && !expanded && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
                  {weakTopics.length} weak
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 900, color: colors.solid }}>{pct}%</span>
            </div>
          </div>
          <div style={{ height: 4, background: 'var(--bg-inset)', borderRadius: 99, overflow: 'hidden' }}>
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
            <div style={{ margin: '10px 0 4px', padding: '7px 10px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)' }}>
                ⚠ {weakTopics.length} topic{weakTopics.length > 1 ? 's' : ''} need{weakTopics.length === 1 ? 's' : ''} attention
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

  const [profile,       setProfile]      = useState(null)
  const [subjectData,   setSubjectData]  = useState([])
  const [loading,       setLoading]      = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => { init() }, []) // eslint-disable-line

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: paths }, { data: masteryRows }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, subjects, streak_days').eq('id', user.id).single(),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug)')
        .eq('student_id', user.id),
      supabase.from('student_topic_mastery')
        .select('topic_id, score, attempt_count, topics(id, name, subject_id)')
        .eq('student_id', user.id),
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

  // Weak topics across all subjects — for the "Focus these first" strip
  const allWeakTopics = subjectData.flatMap(sub =>
    (sub.topics ?? [])
      .filter(t => t.pct < 40)
      .map(t => ({ ...t, subjectName: sub.name }))
  ).slice(0, 3)

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

      {subjectData.length > 0 ? (
        <>
          {/* ── 1. EXL Learning World card (at the top) ── */}
          <EXLWorldCard studentSubjects={allSubjectNames} />

          {/* ── 2. "Focus these first" weak-topics strip ── */}
          {allWeakTopics.length > 0 && (
            <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--danger)' }}>⚠ Focus these first</span>
                <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>Weakest topics</span>
              </div>
              <div style={{ padding: '6px 14px 4px' }}>
                {allWeakTopics.map((t, i) => (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < allWeakTopics.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 1 }}>{t.name}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-tert)' }}>{t.subjectName} · {t.pct}% mastery</p>
                    </div>
                    <Link href="/student/practice" style={{ fontSize: 10, fontWeight: 800, color: '#9b7ae0', textDecoration: 'none', whiteSpace: 'nowrap', padding: '5px 11px', borderRadius: 8, background: 'rgba(155,122,224,.1)', border: '1px solid rgba(155,122,224,.2)' }}>
                      Practice →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 3. Per-subject sections (collapsed by default) ── */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 8 }}>
              All subjects
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subjectData.map(sub => (
                <SubjectSection key={sub.name} subjectData={sub} isDark={isDark} />
              ))}
            </div>
          </div>
        </>
      ) : (
        /* ── Empty state ── */
        <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6, letterSpacing: '-0.01em' }}>No subjects yet</p>
          <p style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.6, marginBottom: 20 }}>
            Set your exam and subjects to see your topic progress here.
          </p>
          <button
            onClick={() => setShowGoalModal(true)}
            style={{ padding: '13px 24px', borderRadius: 13, background: '#0b1330', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 5px 0 #05070f' }}
          >
            Set up my subjects →
          </button>
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