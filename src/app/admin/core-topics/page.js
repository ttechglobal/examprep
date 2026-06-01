'use client'
// src/app/admin/core-topics/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin page: define core topics per subject + exam type.
//
// UI flow:
//   1. Select a subject (dropdown)
//   2. Select exam type (WAEC / JAMB / BOTH)
//   3. See full topic list for that subject with:
//      - toggle: Core on/off
//      - priority number (editable inline, only visible when core)
//      - question count badge (how many objective Qs exist for this topic)
//   4. Changes save immediately on interaction (no submit button)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'

const EXAM_TYPES = ['WAEC', 'JAMB', 'BOTH']

// ── Small reusable components ─────────────────────────────────────────────────
function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-600 border-gray-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  )
}

function Spinner({ size = 'sm' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return <div className={`${cls} border-2 border-indigo-500 border-t-transparent rounded-full animate-spin`} />
}

// ── Topic row ─────────────────────────────────────────────────────────────────
function TopicRow({ topic, examType, subjectId, onChanged }) {
  const [saving,      setSaving]      = useState(false)
  const [editPriority, setEditPriority] = useState(false)
  const [priorityVal,  setPriorityVal]  = useState(topic.priority ?? 1)

  const isCore    = topic.is_core
  const entryId   = topic.core_entry?.id
  const qCount    = topic.question_count ?? 0
  const qBadgeColor = qCount >= 10 ? 'green' : qCount >= 3 ? 'amber' : 'red'

  // Toggle core on/off
  async function handleToggle() {
    setSaving(true)
    try {
      if (isCore && entryId) {
        // Turn off: delete the entry
        await fetch(`/api/admin/core-topics?id=${entryId}`, { method: 'DELETE' })
      } else {
        // Turn on: POST to create
        await fetch('/api/admin/core-topics', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ subjectId, topicId: topic.id, examType }),
        })
      }
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  // Save updated priority
  async function handlePrioritySave() {
    if (!entryId) return
    setSaving(true)
    setEditPriority(false)
    try {
      await fetch('/api/admin/core-topics', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: entryId, priority: parseInt(priorityVal, 10) || 1 }),
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  // Move priority up/down
  async function handleMove(delta) {
    const newPriority = Math.max(1, (topic.priority ?? 1) + delta)
    setSaving(true)
    try {
      await fetch('/api/admin/core-topics', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: entryId, priority: newPriority }),
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${
      isCore ? 'bg-indigo-50/40' : 'hover:bg-gray-50'
    }`}>
      {/* Toggle */}
      <button
        onClick={handleToggle}
        disabled={saving}
        className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200 ${
          isCore ? 'bg-indigo-600' : 'bg-gray-200'
        } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={isCore ? 'Remove from core topics' : 'Add as core topic'}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          isCore ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>

      {/* Priority (only visible when core) */}
      {isCore && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleMove(-1)}
            disabled={saving || (topic.priority ?? 1) <= 1}
            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            title="Higher priority (lower number)"
          >
            ▲
          </button>

          {editPriority ? (
            <input
              type="number"
              min="1"
              value={priorityVal}
              onChange={e => setPriorityVal(e.target.value)}
              onBlur={handlePrioritySave}
              onKeyDown={e => e.key === 'Enter' && handlePrioritySave()}
              className="w-10 text-center text-xs font-black border border-indigo-300 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setPriorityVal(topic.priority ?? 1); setEditPriority(true) }}
              className="w-7 h-6 text-xs font-black text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors tabular-nums"
              title="Click to edit priority"
            >
              {topic.priority ?? 1}
            </button>
          )}

          <button
            onClick={() => handleMove(1)}
            disabled={saving}
            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            title="Lower priority (higher number)"
          >
            ▼
          </button>
        </div>
      )}

      {/* Topic info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold truncate ${isCore ? 'text-indigo-900' : 'text-gray-700'}`}>
            {topic.name}
          </p>
          {isCore && <Badge color="indigo">⭐ Core</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{topic.exam_type}</span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400">Order {topic.order_index}</span>
        </div>
      </div>

      {/* Question count */}
      <div className="flex-shrink-0 text-right">
        <Badge color={qBadgeColor}>{qCount} Qs</Badge>
        {qCount < 3 && (
          <p className="text-[10px] text-amber-600 mt-0.5">Needs more Qs</p>
        )}
      </div>

      {saving && <Spinner size="sm" />}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CoreTopicsPage() {
  const [subjects,    setSubjects]    = useState([])
  const [subjectId,   setSubjectId]   = useState('')
  const [examType,    setExamType]    = useState('WAEC')
  const [topics,      setTopics]      = useState([])
  const [loading,     setLoading]     = useState(false)
  const [loadingSubj, setLoadingSubj] = useState(true)

  // Load subjects on mount
  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(d => {
        setSubjects(d.subjects ?? [])
        if (d.subjects?.[0]) setSubjectId(d.subjects[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingSubj(false))
  }, [])

  // Load topics whenever subject or exam type changes
  const loadTopics = useCallback(() => {
    if (!subjectId) return
    setLoading(true)
    fetch(`/api/admin/core-topics?subjectId=${subjectId}&examType=${examType}`)
      .then(r => r.json())
      .then(d => setTopics(d.topics ?? []))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false))
  }, [subjectId, examType])

  useEffect(() => { loadTopics() }, [loadTopics])

  // Stats
  const coreCount    = topics.filter(t => t.is_core).length
  const noQCount     = topics.filter(t => t.is_core && t.question_count < 3).length
  const selectedSubj = subjects.find(s => s.id === subjectId)

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Core Topics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define which topics students are tested on first in practice and diagnostic sessions.
          Core topics appear before the broader syllabus — highest priority (1) is served first.
        </p>
      </div>

      {/* How it works callout */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 space-y-2">
        <p className="text-sm font-black text-indigo-800">How sequencing works</p>
        <ul className="text-xs text-indigo-700 space-y-1 leading-relaxed">
          <li>· <strong>Diagnostic:</strong> core topics (by priority) are served first, then remaining topics fill up the count.</li>
          <li>· <strong>Practice:</strong> topics the student is weakest on get weighted slots; fully mastered core topics (≥70%, ≥5 attempts) are treated like normal topics.</li>
          <li>· <strong>No core topics defined:</strong> questions are served in random order — unchanged from today.</li>
          <li>· Topics with fewer than 3 questions are flagged — they will be skipped if the pool is too small.</li>
        </ul>
      </div>

      {/* Subject + exam selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">Subject</label>
          {loadingSubj ? (
            <Spinner size="sm" />
          ) : (
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Exam type</label>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {EXAM_TYPES.map(et => (
              <button
                key={et}
                onClick={() => setExamType(et)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  examType === et
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {et}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && topics.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
            <span className="text-xl font-black text-indigo-600">{coreCount}</span>
            <span className="text-xs text-gray-500 font-medium">core topic{coreCount !== 1 ? 's' : ''} defined</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
            <span className="text-xl font-black text-gray-700">{topics.length}</span>
            <span className="text-xs text-gray-500 font-medium">total topics</span>
          </div>
          {noQCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-amber-500">⚠️</span>
              <span className="text-xs text-amber-700 font-medium">{noQCount} core topic{noQCount !== 1 ? 's' : ''} need more questions</span>
            </div>
          )}
        </div>
      )}

      {/* Topic list */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

        {/* List header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wide">
            {selectedSubj?.name ?? '—'} · {examType}
          </p>
          {coreCount > 0 && (
            <p className="text-xs text-indigo-600 font-bold">
              {coreCount} core · sorted by priority
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No topics found for this subject.</p>
            <p className="text-gray-400 text-xs mt-1">Upload a curriculum first.</p>
          </div>
        ) : (
          <div>
            {/* Core topics first (sorted by priority), then non-core */}
            {[
              ...topics.filter(t => t.is_core).sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)),
              ...topics.filter(t => !t.is_core),
            ].map(topic => (
              <TopicRow
                key={topic.id}
                topic={topic}
                examType={examType}
                subjectId={subjectId}
                onChanged={loadTopics}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tip */}
      <p className="text-xs text-gray-400 leading-relaxed">
        <strong>Tip:</strong> Mark the 8–15 topics that appear most frequently in past{' '}
        {examType === 'BOTH' ? 'WAEC and JAMB' : examType} papers. Priority 1 is served first.
        You can come back and adjust these as you analyse more past questions.
      </p>
    </div>
  )
}