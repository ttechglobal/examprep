'use client'
// src/app/admin/core-topics/page.js

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import Link from 'next/link'

function Spinner() {
  return <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
}

// ── Frequency bar ─────────────────────────────────────────────────────────────
function FreqBar({ pct, isCore }) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isCore ? 'bg-indigo-500' : 'bg-gray-300'}`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-gray-400 w-6 text-right flex-shrink-0">
        {pct}%
      </span>
    </div>
  )
}

// ── Topic row ─────────────────────────────────────────────────────────────────
const TopicRow = memo(function TopicRow({ topic, subjectId, examType, onChanged }) {
  const [saving, setSaving] = useState(false)
  const [editPriority, setEditPriority] = useState(false)
  const [priorityVal, setPriorityVal] = useState(String(topic.priority ?? 1))

  const isCore  = topic.is_core
  const entryId = topic.core_entry?.id

  async function handleToggle() {
    setSaving(true)
    try {
      if (isCore && entryId) {
        await fetch(`/api/admin/core-topics?id=${entryId}`, { method: 'DELETE' })
      } else {
        await fetch('/api/admin/core-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectId, topicId: topic.id, examType }),
        })
      }
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function handlePrioritySave() {
    if (!entryId) return
    setSaving(true)
    setEditPriority(false)
    try {
      await fetch('/api/admin/core-topics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId, priority: parseInt(priorityVal, 10) || 1 }),
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function handleMove(delta) {
    if (!entryId) return
    setSaving(true)
    try {
      await fetch('/api/admin/core-topics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId, priority: Math.max(1, (topic.priority ?? 1) + delta) }),
      })
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  const hasLesson = topic.lesson_status && topic.lesson_status !== 'none'
  const pastCount = topic.past_paper_count ?? 0
  const allCount  = topic.all_question_count ?? 0

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 transition-colors group ${isCore ? 'bg-indigo-50/50' : 'hover:bg-gray-50/80'}`}>

      {/* Core toggle */}
      <button
        onClick={handleToggle}
        disabled={saving}
        title={isCore ? 'Remove from core topics' : 'Mark as core topic'}
        className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors ${isCore ? 'bg-indigo-600' : 'bg-gray-200 hover:bg-gray-300'} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isCore ? 'translate-x-5' : ''}`} />
      </button>

      {/* Priority (core topics only) */}
      <div className="w-[56px] flex-shrink-0">
        {isCore && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => handleMove(-1)} disabled={saving || (topic.priority ?? 1) <= 1}
              className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-indigo-500 disabled:opacity-20 text-[9px]">▲</button>
            {editPriority ? (
              <input
                type="number" min="1" max="99" value={priorityVal}
                onChange={e => setPriorityVal(e.target.value)}
                onBlur={handlePrioritySave}
                onKeyDown={e => e.key === 'Enter' && handlePrioritySave()}
                className="w-7 text-center text-xs border border-indigo-300 rounded px-0.5 focus:outline-none"
                autoFocus
              />
            ) : (
              <button onClick={() => setEditPriority(true)}
                className="w-7 text-center text-xs font-black text-indigo-600 hover:underline tabular-nums"
                title="Click to edit">#{topic.priority}</button>
            )}
            <button onClick={() => handleMove(1)} disabled={saving}
              className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-indigo-500 disabled:opacity-20 text-[9px]">▼</button>
          </div>
        )}
      </div>

      {/* Topic name */}
      <div className="w-40 flex-shrink-0">
        <p className={`text-sm leading-snug truncate ${isCore ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
          {topic.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {isCore && (
            <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
              CORE
            </span>
          )}
          {hasLesson ? (
            <span className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full capitalize">
              ✓ {topic.lesson_status}
            </span>
          ) : pastCount >= 5 ? (
            <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              needs lesson
            </span>
          ) : null}
        </div>
      </div>

      {/* Frequency bar */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <FreqBar pct={topic.pct_of_max ?? 0} isCore={isCore} />
        <div className="flex-shrink-0 text-right">
          <span className="text-sm font-black text-gray-700 tabular-nums">{pastCount}</span>
          <span className="text-[10px] text-gray-400"> past</span>
          {allCount > pastCount && (
            <span className="text-[10px] text-gray-300 ml-1">+{allCount - pastCount} AI</span>
          )}
        </div>
      </div>

      {saving && <Spinner />}
    </div>
  )
})

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CoreTopicsPage() {
  const [subjects,    setSubjects]    = useState([])
  const [subjectId,   setSubjectId]   = useState('')
  const [examType,    setExamType]    = useState('WAEC')
  const [topics,      setTopics]      = useState([])
  const [loading,     setLoading]     = useState(false)
  const [loadingSubj, setLoadingSubj] = useState(true)
  const [error,       setError]       = useState(null)
  const [sortBy,      setSortBy]      = useState('frequency')
  const [filter,      setFilter]      = useState('all')

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.subjects ?? [])
        setSubjects(list)
        if (list[0]) setSubjectId(list[0].id)
      })
      .catch(() => setError('Failed to load subjects'))
      .finally(() => setLoadingSubj(false))
  }, [])

  const loadTopics = useCallback(() => {
    if (!subjectId) return
    setLoading(true)
    setError(null)
    fetch(`/api/admin/core-topics?subjectId=${subjectId}&examType=${examType}`)
      .then(async r => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error(d.error ?? `HTTP ${r.status}`)
        }
        return r.json()
      })
      .then(d => setTopics(d.topics ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [subjectId, examType])

  useEffect(() => { loadTopics() }, [loadTopics])

  const sorted = useMemo(() => {
    let list = [...topics]

    if (filter === 'core')    list = list.filter(t => t.is_core)
    if (filter === 'no-core') list = list.filter(t => !t.is_core)
    if (filter === 'has-questions') list = list.filter(t => t.past_paper_count > 0)

    if (sortBy === 'frequency') list.sort((a, b) => (b.past_paper_count ?? 0) - (a.past_paper_count ?? 0))
    if (sortBy === 'priority')  list.sort((a, b) => {
      if (a.is_core && !b.is_core) return -1
      if (!a.is_core && b.is_core) return 1
      return (a.priority ?? 99) - (b.priority ?? 99)
    })
    if (sortBy === 'curriculum') list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

    return list
  }, [topics, sortBy, filter])

  // Stats
  const coreCount     = topics.filter(t => t.is_core).length
  const totalPast     = topics.reduce((s, t) => s + (t.past_paper_count ?? 0), 0)
  const withQuestions = topics.filter(t => t.past_paper_count > 0).length
  const top5          = [...topics].sort((a, b) => b.past_paper_count - a.past_paper_count).slice(0, 5)
  const top5Ids       = new Set(top5.map(t => t.id))
  const top5Marked    = top5.filter(t => t.is_core).length
  const selectedSubj  = subjects.find(s => s.id === subjectId)

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Core Topics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Topics ranked by how often they appear in past exam papers.
          Mark the most frequent ones as Core — they get priority in diagnostics and automatically seed every student's study plan.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
        <p className="text-sm font-black text-indigo-800">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '📊',
              title: 'Frequency = exam importance',
              desc: 'The bar shows how often each topic appears in past WAEC/JAMB papers. Higher = more likely to appear in the student\'s exam.',
            },
            {
              icon: '🔄',
              title: 'Toggle to mark Core',
              desc: 'Flip the switch. Core topics are immediately prioritised in diagnostics. Students also get them auto-added to their study plan on first login.',
            },
            {
              icon: '🔢',
              title: 'Priority order matters',
              desc: 'Lower number = shown first. Use ▲▼ or click the number to reorder. Aim for 8–15 core topics per subject.',
            },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-2.5">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs font-black text-indigo-800">{item.title}</p>
                <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subject + exam selectors */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Subject</label>
          {loadingSubj ? (
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Exam</label>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {['WAEC', 'JAMB'].map(et => (
              <button key={et} onClick={() => setExamType(et)}
                className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${examType === et ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {et}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      {!loading && topics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Core topics',       value: `${coreCount}/${topics.length}`,   color: 'indigo', sub: 'marked as core'        },
            { label: 'Past questions',    value: totalPast.toLocaleString(),         color: 'blue',   sub: 'across all topics'     },
            { label: 'Topics with Qs',   value: `${withQuestions}/${topics.length}`, color: 'green',  sub: '1+ past paper question'},
            { label: 'Top 5 marked',      value: `${top5Marked}/5`,                 color: top5Marked >= 4 ? 'green' : 'amber', sub: 'most frequent marked'},
          ].map(s => (
            <div key={s.label} className={`rounded-xl border px-4 py-3 ${
              s.color === 'indigo' ? 'bg-indigo-50 border-indigo-100' :
              s.color === 'blue'   ? 'bg-blue-50 border-blue-100' :
              s.color === 'green'  ? 'bg-green-50 border-green-100' :
              'bg-amber-50 border-amber-100'
            }`}>
              <p className={`text-xl font-black tabular-nums ${
                s.color === 'indigo' ? 'text-indigo-700' :
                s.color === 'blue'   ? 'text-blue-700' :
                s.color === 'green'  ? 'text-green-700' :
                'text-amber-700'
              }`}>{s.value}</p>
              <p className="text-xs font-bold text-gray-600 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick action — mark top 5 */}
      {!loading && top5Marked < 5 && top5.some(t => !t.is_core) && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-lg">💡</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {5 - top5Marked} of the top 5 most-tested topics are not marked as core yet
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              These topics appear most frequently in past papers: {top5.filter(t => !t.is_core).map(t => t.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">Failed to load topics</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button onClick={loadTopics} className="text-xs font-black text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {/* Sort + filter controls */}
      {!loading && topics.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Sort:</span>
            {[
              { id: 'frequency',  label: '📊 By frequency' },
              { id: 'priority',   label: '⭐ Core first' },
              { id: 'curriculum', label: '📚 Curriculum order' },
            ].map(s => (
              <button key={s.id} onClick={() => setSortBy(s.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${sortBy === s.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all',           label: `All (${topics.length})` },
              { id: 'core',          label: `Core (${coreCount})` },
              { id: 'has-questions', label: `Has Qs (${withQuestions})` },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${filter === f.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Column headers */}
      {!loading && topics.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wide border-b border-gray-100">
          <div className="w-10 flex-shrink-0">Core</div>
          <div className="w-[56px] flex-shrink-0">Priority</div>
          <div className="w-40 flex-shrink-0">Topic</div>
          <div className="flex-1">Past paper frequency →</div>
          <div className="w-16 text-right">Count</div>
        </div>
      )}

      {/* Topic list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Spinner />
          <span className="text-sm text-gray-500">Loading topics…</span>
        </div>
      ) : !error && topics.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-3">
          <p className="text-3xl">📋</p>
          <p className="text-sm font-bold text-gray-700">No topics found for {selectedSubj?.name} ({examType})</p>
          <p className="text-xs text-gray-400 leading-relaxed">Make sure the curriculum is set up first.</p>
          <Link href="/admin/curriculum" className="inline-block text-xs font-black text-indigo-600 hover:underline">
            Go to Curriculum →
          </Link>
        </div>
      ) : !error && sorted.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {sorted.map(topic => (
            <TopicRow
              key={topic.id}
              topic={topic}
              subjectId={subjectId}
              examType={examType}
              onChanged={loadTopics}
            />
          ))}
        </div>
      ) : !error && sorted.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No topics match the current filter.
        </div>
      ) : null}

    </div>
  )
}