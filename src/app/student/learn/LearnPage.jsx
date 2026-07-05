'use client'
// src/app/student/learn/LearnPage.jsx — prototype-faithful redesign
// Matches prototype-v3 exactly: greeting, continue-lesson hero card,
// weak topics focus banner, subject 2×2 grid. No practice modes section.

import { useState, useEffect, useMemo, memo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMasteryLevel } from '@/lib/theme'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { LearnHubSkeleton } from '@/components/ui/Skeletons'
import Link from 'next/link'
import PracticeHubFAB from '@/components/ui/PracticeHubFAB'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

// Subject icon map — matches prototype
const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getIcon = n => SUBJECT_ICONS[n] ?? SUBJECT_ICONS.default

// Mastery trend emoji: Strong=💪, Building=📈, Starting=🎯
const getMasteryEmoji = pct => pct >= 70 ? '💪' : pct >= 40 ? '📈' : '🎯'

// ── Subject card — 2-part: coloured top, white/surface footer ────────────────
const SubjectCard = memo(function SubjectCard({ subject, pct, completed, total, isDark }) {
  const s = resolveSubjectColors(subject.name, isDark)
  const pctColor = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'

  return (
    <Link
      href={`/student/subjects/${subject.slug}`}
      style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid var(--border)`, display: 'block', transition: 'transform .15s' }}
      className="active:scale-[.97]"
    >
      {/* Coloured top band — matches prototype subject-top */}
      <div style={{ padding: '11px 11px 9px', background: s.bg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${s.solid}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
            {getIcon(subject.name)}
          </div>
          <span style={{ fontSize: 13 }}>{getMasteryEmoji(pct)}</span>
        </div>
        <p style={{ fontSize: 12, fontWeight: 900, color: s.text }}>{subject.name}</p>
      </div>

      {/* White footer — bar + stats */}
      <div style={{ padding: '8px 11px 10px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', borderRadius: 99, background: s.solid, width: `${pct}%`, transition: 'width .7s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tert)' }}>{completed}/{total} topics</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: pctColor }}>{pct}%</span>
        </div>
      </div>
    </Link>
  )
})

// ── Continue lesson hero card — dark navy gradient + dot pattern ─────────────
function ContinueLessonCard({ lesson }) {
  if (!lesson) return null
  const { subjectName, topicName, subtopicName, currentSlide, totalSlides, href, subjectIcon } = lesson
  const pct = totalSlides > 0 ? Math.round((currentSlide / totalSlides) * 100) : 0

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)' }}>
      {/* Dark navy body */}
      <div style={{ padding: 16, background: 'linear-gradient(140deg,#0b1330 0%,#1a2060 60%,#0b1330 100%)', position: 'relative' }}>
        {/* Dot pattern overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: .05, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Continue label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.45)' }}>
              Continue · Slide {currentSlide} of {totalSlides}
            </span>
          </div>
          {/* Subject + topic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(155,122,224,.2)', border: '1px solid rgba(155,122,224,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>
              {subjectIcon || getIcon(subjectName)}
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', marginBottom: 2 }}>
                {subjectName} · {topicName}
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-.01em', lineHeight: 1.2 }}>
                {subtopicName}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)' }}>Lesson progress</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#9b7ae0' }}>{currentSlide} / {totalSlides} slides</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#9b7ae0,#ff8fab)', borderRadius: 99 }} />
            </div>
          </div>
          {/* CTA */}
          <Link href={href} style={{ display: 'block', padding: 13, borderRadius: 14, background: '#0b1330', color: '#fff', fontSize: 13, fontWeight: 800, textAlign: 'center', textDecoration: 'none', boxShadow: '0 5px 0 #05070f', letterSpacing: '-.01em' }}>
            Continue lesson →
          </Link>
        </div>
      </div>

      {/* Lesson type pill strip — white band below */}
      <div style={{ background: 'var(--bg-card)', padding: '9px 11px', display: 'flex', gap: 6, borderTop: '1px solid var(--border)' }}>
        {[['📖 Lesson', href], ['❓ Practice', '/student/practice'], ['🎮 Games', '/student/games'], ['🎬 Video', '/student/videos']].map(([label, to], i) => (
          <Link key={label} href={to} style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, textDecoration: 'none',
            background: i === 0 ? 'var(--indigo-bg)' : 'var(--bg-card)',
            border: `1.5px solid ${i === 0 ? 'var(--indigo-bd)' : 'var(--border)'}`,
            color: i === 0 ? 'var(--indigo)' : 'var(--text-sec)',
            whiteSpace: 'nowrap',
          }}>{label}</Link>
        ))}
      </div>
    </div>
  )
}

// ── Weak topics focus card ────────────────────────────────────────────────────
function WeakTopicsCard({ weakTopics }) {
  if (!weakTopics?.length) return null
  return (
    <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--danger-border)', overflow: 'hidden' }}>
      <div style={{ padding: '9px 13px', background: 'var(--danger-bg)', borderBottom: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--danger)' }}>⚠ Focus areas right now</p>
        <span style={{ padding: '3px 9px', borderRadius: 999, border: '1.5px solid var(--danger-border)', background: 'var(--danger-bg)', fontSize: 9, fontWeight: 700, color: 'var(--danger)' }}>
          {weakTopics.length} topics
        </span>
      </div>
      <div style={{ padding: '8px 12px' }}>
        {weakTopics.map((t, i) => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderBottom: i < weakTopics.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: t.pct < 40 ? 'rgba(220,38,38,.1)' : 'rgba(217,119,6,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {getIcon(t.subjectName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>{t.name}</p>
              <p style={{ fontSize: 10, color: t.pct < 40 ? 'var(--danger)' : 'var(--warning)' }}>
                {t.pct}% mastery · {t.missed ?? 0} questions missed
              </p>
            </div>
            <Link href={`/student/practice?topic=${encodeURIComponent(t.name)}`}
              style={{ padding: '4px 9px', borderRadius: 999, fontSize: 9, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                background: t.pct < 40 ? 'var(--danger-bg)' : 'var(--warning-bg)',
                border: `1.5px solid ${t.pct < 40 ? 'var(--danger-border)' : 'var(--warning-border)'}`,
                color: t.pct < 40 ? 'var(--danger)' : 'var(--warning)',
              }}>
              Study →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router   = useRouter()
  const isDark   = useIsDark()
  const supabase = useMemo(() => createClient(), [])

  const [profile,       setProfile]      = useState(null)
  const [subjectList,   setSubjectList]  = useState([])
  const [completedIds,  setCompletedIds] = useState(new Set())
  const [learningPaths, setLearningPaths] = useState([])
  const [lastLesson,    setLastLesson]   = useState(null)  // { subjectName, topicName, ... }
  const [weakTopics,    setWeakTopics]   = useState([])
  const [loading,       setLoading]      = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => { init() }, []) // eslint-disable-line

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }, { data: mastery }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, exam_type, subjects, goals_set, university_course, streak_days')
        .eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
        .eq('student_id', user.id),
      supabase.from('student_topic_mastery')
        .select('topic_id, score, attempt_count, topics(id, name, subjects(name))')
        .eq('student_id', user.id)
        .lt('score', 55)
        .order('score', { ascending: true })
        .limit(5),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))
    setLearningPaths(paths ?? [])
    setSubjectList((paths ?? []).map(p => p.subjects).filter(Boolean))

    // Build weak topics list
    const weak = (mastery ?? [])
      .filter(m => m.topics)
      .map(m => ({
        name: m.topics.name,
        subjectName: m.topics.subjects?.name ?? '',
        pct: Math.round(m.score ?? 0),
        missed: Math.max(0, m.attempt_count - Math.round((m.score / 100) * m.attempt_count)),
      }))
    setWeakTopics(weak)

    // Find last in-progress lesson from lesson_progress
    const inProg = (prog ?? []).filter(p => !p.completed)
    if (inProg.length > 0) {
      const subtopicId = inProg[inProg.length - 1].subtopic_id
      try {
        const { data: sub } = await supabase
          .from('subtopics')
          .select('id, name, slug, topics(id, name, subjects(id, name, slug))')
          .eq('id', subtopicId).single()
        if (sub) {
          const totalSlides = 8  // placeholder — actual count comes from lesson data
          setLastLesson({
            subjectName:  sub.topics?.subjects?.name ?? '',
            subjectIcon:  getIcon(sub.topics?.subjects?.name ?? ''),
            topicName:    sub.topics?.name ?? '',
            subtopicName: sub.name,
            currentSlide: 3,    // placeholder
            totalSlides,
            href:         `/student/learn/${sub.slug}`,
          })
        }
      } catch {}
    }

    setLoading(false)
  }

  const subjectProgress = useMemo(() => {
    return subjectList.map(subject => {
      const path      = learningPaths.find(p => p.subject_id === subject.id)
      const ids       = path?.ordered_subtopic_ids ?? []
      const total     = ids.length
      const completed = ids.filter(id => completedIds.has(id)).length
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject, pct, completed, total }
    })
  }, [subjectList, learningPaths, completedIds])

  if (loading) return <LearnHubSkeleton />

  const firstName  = profile?.full_name?.split(' ')[0] ?? ''
  const examLabel  = profile?.exam_type === 'BOTH' ? 'WAEC & JAMB' : (profile?.exam_type ?? 'WAEC')
  const streakDays = profile?.streak_days ?? 0
  // Get day of week
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const today    = dayNames[new Date().getDay()]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 112 }}>

      {/* Greeting row — day + exam label left, streak badge right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 3 }}>
            {today} · {examLabel} {new Date().getFullYear() + 1}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.2, color: 'var(--text-prim)' }}>
            Learn{firstName ? `, ${firstName}` : ''} 📚
          </h1>
        </div>
        {/* Settings + streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {streakDays >= 3 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,195,107,.12)', border: '1.5px solid rgba(255,195,107,.28)', fontSize: 10, fontWeight: 700, color: '#ffc36b', whiteSpace: 'nowrap' }}>
              🔥 {streakDays}
            </div>
          )}
          <button onClick={() => setShowGoalModal(true)}
            style={{ padding: '5px 10px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer' }}>
            ⚙️
          </button>
        </div>
      </div>

      {/* Continue lesson hero — only if there's an in-progress lesson */}
      {lastLesson && <ContinueLessonCard lesson={lastLesson} />}

      {/* No active lesson — show start CTA */}
      {!lastLesson && subjectProgress.length > 0 && (
        <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ padding: 16, background: 'linear-gradient(140deg,#0b1330 0%,#1a2060 60%,#0b1330 100%)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: .05, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginBottom: 12, lineHeight: 1.5 }}>
                Pick up where your study plan recommends — start your next lesson.
              </p>
              <Link href={`/student/subjects/${subjectProgress[0]?.subject?.slug}`}
                style={{ display: 'block', padding: 13, borderRadius: 14, background: '#0b1330', color: '#fff', fontSize: 13, fontWeight: 800, textAlign: 'center', textDecoration: 'none', boxShadow: '0 5px 0 #05070f' }}>
                Start next lesson →
              </Link>
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '9px 11px', display: 'flex', gap: 6, borderTop: '1px solid var(--border)' }}>
            {[['📖 Lesson', '#'], ['❓ Practice', '/student/practice'], ['🎮 Games', '/student/games'], ['🎬 Video', '/student/videos']].map(([label, href], i) => (
              <Link key={label} href={href} style={{ padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, textDecoration: 'none', background: i === 0 ? 'var(--indigo-bg)' : 'var(--bg-card)', border: `1.5px solid ${i === 0 ? 'var(--indigo-bd)' : 'var(--border)'}`, color: i === 0 ? 'var(--indigo)' : 'var(--text-sec)', whiteSpace: 'nowrap' }}>{label}</Link>
            ))}
          </div>
        </div>
      )}

      {/* Weak topics */}
      {weakTopics.length > 0 && <WeakTopicsCard weakTopics={weakTopics} />}

      {/* Subject grid */}
      {subjectProgress.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', letterSpacing: '-.01em' }}>Your subjects</p>
            <button onClick={() => setShowGoalModal(true)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add subject</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {subjectProgress.map(({ subject, pct, completed, total }) => (
              <SubjectCard key={subject.id} subject={subject} pct={pct} completed={completed} total={total} isDark={isDark} />
            ))}
            {/* Add subject placeholder */}
            <div onClick={() => setShowGoalModal(true)} style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 86, cursor: 'pointer' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 3 }}>➕</div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)' }}>Add subject</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No subjects empty state */}
      {subjectProgress.length === 0 && !loading && (
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 4 }}>No subjects yet</p>
          <p style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.55, marginBottom: 16 }}>
            Set your exam goals and we'll build your personalised curriculum.
          </p>
          <button onClick={() => setShowGoalModal(true)}
            style={{ padding: '11px 20px', borderRadius: 12, background: '#0b1330', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>
            Set up my subjects →
          </button>
        </div>
      )}

      {/* Goal modal */}
      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={updated => { setProfile(updated); setShowGoalModal(false) }}
          />
        </Suspense>
      )}

      <PracticeHubFAB />
    </div>
  )
}