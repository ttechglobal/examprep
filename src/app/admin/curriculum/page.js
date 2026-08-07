// src/app/admin/curriculum/page.js
// Topic tree index — exam_type is a single string per subject (WAEC | JAMB | IGCSE)
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const EXAM_STYLE = {
  WAEC:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  JAMB:  { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  IGCSE: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

const SUBJECT_CFG = {
  'Chemistry':           { icon: '⚗️',  color: '#9b7ae0' },
  'Physics':             { icon: '⚡',  color: '#ff8fab' },
  'Biology':             { icon: '🧬',  color: '#6cce8e' },
  'Mathematics':         { icon: '📐',  color: '#5cb8ea' },
  'Further Mathematics': { icon: '📐',  color: '#5cb8ea' },
  'English Language':    { icon: '📖',  color: '#a78bfa' },
  'Use of English':      { icon: '📖',  color: '#a78bfa' },
  'Economics':           { icon: '📊',  color: '#fcd34d' },
  'Government':          { icon: '🏛️', color: '#f87171' },
  'Geography':           { icon: '🌍',  color: '#34d399' },
  'default':             { icon: '📝',  color: '#9ca3af' },
}

export default async function CurriculumIndexPage() {
  const db = svc()

  const { data: subjects } = await db
    .from('subjects')
    .select(`
      id, name, slug, exam_type, is_active,
      topics ( id, subtopics ( id ) )
    `)
    .eq('is_active', true)
    .order('order_index')

  const { data: qCounts } = await db
    .from('questions')
    .select('subject_id')

  const qBySubject = {}
  for (const q of (qCounts ?? [])) {
    if (q.subject_id) qBySubject[q.subject_id] = (qBySubject[q.subject_id] ?? 0) + 1
  }

  const enriched = (subjects ?? []).map(s => {
    const topicCount    = s.topics?.length ?? 0
    const subtopicCount = s.topics?.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0) ?? 0
    return { ...s, topicCount, subtopicCount, questionCount: qBySubject[s.id] ?? 0 }
  })

  const totalTopics    = enriched.reduce((a, s) => a + s.topicCount, 0)
  const totalSubtopics = enriched.reduce((a, s) => a + s.subtopicCount, 0)
  const totalQs        = enriched.reduce((a, s) => a + s.questionCount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginBottom: 3 }}>Topic Tree</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Topics and subtopics used for question tagging</p>
        </div>
        <Link href="/admin/curriculum/upload"
          style={{ padding: '9px 18px', background: '#4f46e5', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 3px 0 #2d3a9e', whiteSpace: 'nowrap' }}>
          Upload Curriculum
        </Link>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {[
          { label: 'Subjects',         value: enriched.length },
          { label: 'Topics',           value: totalTopics },
          { label: 'Subtopics',        value: totalSubtopics },
          { label: 'Questions tagged', value: totalQs },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.value.toLocaleString()}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Subject cards */}
      {enriched.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🌿</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 6 }}>No curriculum uploaded yet</p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Upload a curriculum to build the topic tree for question tagging.</p>
          <Link href="/admin/curriculum/upload"
            style={{ display: 'inline-block', padding: '10px 22px', background: '#4f46e5', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Upload Curriculum →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {enriched.map(s => {
            const cfg = SUBJECT_CFG[s.name] ?? SUBJECT_CFG.default
            const examStyle = EXAM_STYLE[s.exam_type] ?? { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
            const hasTopics = s.topicCount > 0
            return (
              <div key={s.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {/* Color bar */}
                <div style={{ height: 4, background: cfg.color }} />
                <div style={{ padding: 16 }}>
                  {/* Subject name + exam badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}14`, border: `1px solid ${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{s.name}</p>
                      {s.exam_type && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: examStyle.bg, color: examStyle.color, border: `1px solid ${examStyle.border}` }}>
                          {s.exam_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.topicCount}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>topics</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.subtopicCount}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>subtopics</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 900, color: s.questionCount > 0 ? '#4f46e5' : '#9ca3af', lineHeight: 1 }}>{s.questionCount}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>questions</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {hasTopics ? (
                      <Link href={`/admin/curriculum/${s.slug}`}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: '#eef2ff', border: '1px solid #e0e7ff', fontSize: 12, fontWeight: 700, color: '#4f46e5', textDecoration: 'none', textAlign: 'center' }}>
                        View topics →
                      </Link>
                    ) : (
                      <Link href="/admin/curriculum/upload"
                        style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: '#f9fafb', border: '1px dashed #e5e7eb', fontSize: 12, fontWeight: 600, color: '#9ca3af', textDecoration: 'none', textAlign: 'center' }}>
                        Upload curriculum
                      </Link>
                    )}
                    <Link href={`/admin/past-questions?subject=${encodeURIComponent(s.name)}`}
                      style={{ padding: '8px 12px', borderRadius: 9, background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: 12, fontWeight: 600, color: '#6b7280', textDecoration: 'none', textAlign: 'center' }}>
                      Questions
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}