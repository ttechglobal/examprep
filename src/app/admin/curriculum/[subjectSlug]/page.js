// src/app/admin/curriculum/[subjectSlug]/page.js
'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const EXAM_STYLE = {
  WAEC:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  JAMB:  { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  IGCSE: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

function ExamBadge({ exam }) {
  if (!exam) return null
  const s = EXAM_STYLE[exam] ?? { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5,
      background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {exam}
    </span>
  )
}

function TopicRow({ topic, questionCount, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 13, color: '#9ca3af', transition: 'transform .15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>›</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{topic.name}</p>
            <ExamBadge exam={topic.exam_type} />
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            {topic.subtopics?.length ?? 0} subtopics
            {questionCount > 0 && ` · ${questionCount} questions`}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', flexShrink: 0, padding: '3px 10px', borderRadius: 20, background: '#eef2ff' }}>
          {topic.subtopics?.length ?? 0}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6' }}>
          {(topic.subtopics ?? []).length === 0 ? (
            <p style={{ padding: '12px 16px 12px 44px', fontSize: 12, color: '#9ca3af' }}>No subtopics yet</p>
          ) : (topic.subtopics ?? []).map((sub, i) => (
            <div key={sub.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px 9px 44px',
              borderBottom: i < (topic.subtopics.length - 1) ? '1px solid #f9fafb' : 'none',
            }}>
              <span style={{ fontSize: 11, color: '#d1d5db', flexShrink: 0, width: 20, textAlign: 'right' }}>{i + 1}</span>
              <p style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>{sub.name}</p>
              {sub.exam_type && sub.exam_type !== topic.exam_type && (
                <ExamBadge exam={sub.exam_type} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SubjectCurriculumPage() {
  const params = useParams()
  const slug   = params?.subjectSlug

  const [subject,  setSubject]  = useState(null)
  const [topics,   setTopics]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!slug) return

    // Step 1: load all subjects to resolve slug → UUID
    // Step 2: use the UUID to fetch the curriculum
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(subjects => {
        const subj = Array.isArray(subjects) ? subjects.find(s => s.slug === slug) : null
        if (!subj) {
          setError('Subject not found')
          setLoading(false)
          return
        }
        setSubject(subj)
        // Now fetch curriculum with the real UUID
        return fetch(`/api/admin/curriculum?subjectId=${subj.id}`)
          .then(r => r.json())
          .then(topicData => {
            if (Array.isArray(topicData)) setTopics(topicData)
            else if (topicData?.error) setError(topicData.error)
            setLoading(false)
          })
      })
      .catch(() => { setError('Failed to load'); setLoading(false) })
  }, [slug])

  const filtered = topics.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.subtopics ?? []).some(s => s.name.toLowerCase().includes(search.toLowerCase()))
  )

  const totalSubtopics = topics.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return <p style={{ padding: 40, color: '#dc2626', textAlign: 'center' }}>{error}</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9ca3af' }}>
        <Link href="/admin/curriculum" style={{ color: '#9ca3af', textDecoration: 'none' }}>Topic Tree</Link>
        <span>/</span>
        <span style={{ color: '#111827', fontWeight: 600 }}>{subject?.name ?? slug}</span>
      </div>

      {/* Subject header */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{subject?.name ?? slug}</h1>
            <ExamBadge exam={subject?.exam_type} />
          </div>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            {topics.length} topics · {totalSubtopics} subtopics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/curriculum/upload"
            style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #e0e7ff', color: '#4f46e5', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: '#eef2ff' }}>
            Upload curriculum
          </Link>
          <Link href={`/admin/past-questions?subject=${encodeURIComponent(subject?.name ?? '')}`}
            style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #e5e7eb', color: '#374151', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: '#f9fafb' }}>
            View questions
          </Link>
        </div>
      </div>

      {/* Search */}
      {topics.length > 0 && (
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search topics and subtopics…"
          style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff' }}
        />
      )}

      {/* Topics */}
      {topics.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px dashed #e5e7eb', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>🌿</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No topics yet</p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Upload the curriculum to populate the topic tree.</p>
          <Link href="/admin/curriculum/upload"
            style={{ display: 'inline-block', padding: '9px 20px', background: '#4f46e5', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Upload curriculum →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((topic, i) => (
            <TopicRow key={topic.id} topic={topic} questionCount={0} defaultOpen={i === 0 && topics.length <= 5} />
          ))}
          {filtered.length === 0 && search && (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0', fontSize: 13 }}>
              No topics match "{search}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}