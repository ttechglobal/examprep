'use client'
// src/app/admin/core-topics/page.js
// ─────────────────────────────────────────────────────────────────────────────
// UPGRADED: Added question coverage chart + sort-by-count mode.
//
// New features:
//   1. Coverage chart — horizontal bar chart sorted by question count, shows
//      which topics have the most past questions. This is the content team's
//      editorial guide: build lessons for the high-count topics first.
//   2. Sort modes — sort by curriculum order (default) or by question count.
//   3. Better stats strip — total questions in bank, coverage %, zero-count count.
//   4. "Build lesson" nudge — topics with 5+ questions but no lesson get flagged.
//   5. Updated to use exam_types[] contains filter (post-migration).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react'

// ── Small reusable components ─────────────────────────────────────────────────

function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-600 border-gray-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
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

// ── Coverage chart ────────────────────────────────────────────────────────────
// Horizontal bar chart — sorted descending by question count.
// The longest bar = the topic with the most questions in the bank.
// Color encodes status: green=plenty, amber=some, red=empty.

function CoverageChart({ topics, onSelectTopic }) {
  const [collapsed, setCollapsed] = useState(false)

  const sorted = useMemo(() =>
    [...topics].sort((a, b) => (b.question_count ?? 0) - (a.question_count ?? 0)),
    [topics]
  )

  const maxCount = sorted[0]?.question_count ?? 1
  const totalQs  = sorted.reduce((s, t) => s + (t.question_count ?? 0), 0)
  const covered  = sorted.filter(t => (t.question_count ?? 0) >= 5).length
  const empty    = sorted.filter(t => (t.question_count ?? 0) === 0).length

  function barColor(count) {
    if (count >= 10) return 'bg-green-500'
    if (count >= 5)  return 'bg-indigo-400'
    if (count >= 1)  return 'bg-amber-400'
    return 'bg-gray-200'
  }

  function labelColor(count) {
    if (count >= 10) return 'text-green-700'
    if (count >= 5)  return 'text-indigo-700'
    if (count >= 1)  return 'text-amber-700'
    return 'text-gray-400'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Chart header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-black text-gray-900">Question coverage by topic</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalQs} questions across {sorted.length} topics ·{' '}
            <span className="text-green-600 font-semibold">{covered} well-covered</span>
            {empty > 0 && <> · <span className="text-red-500 font-semibold">{empty} empty</span></>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/> 10+</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"/> 5–9</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/> 1–4</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block"/> 0</span>
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? 'Show ▼' : 'Hide ▲'}
          </button>
        </div>
      </div>

      {/* Chart body */}
      {!collapsed && (
        <div className="px-5 py-3 space-y-1.5 max-h-80 overflow-y-auto">
          {sorted.map(topic => {
            const count   = topic.question_count ?? 0
            const barPct  = maxCount > 0 ? (count / maxCount) * 100 : 0
            const hasLesson = topic.lesson_status && topic.lesson_status !== 'draft'
            return (
              <div
                key={topic.id}
                className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                onClick={() => onSelectTopic?.(topic)}
                title={`${topic.name} — ${count} questions`}
              >
                {/* Topic name */}
                <div className="w-44 flex-shrink-0 flex items-center gap-1.5 min-w-0">
                  <p className="text-xs text-gray-700 truncate leading-tight">{topic.name}</p>
                  {topic.is_core && (
                    <span className="text-[9px] text-indigo-500 font-black flex-shrink-0">★</span>
                  )}
                </div>

                {/* Bar */}
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor(count)}`}
                    style={{ width: `${Math.max(barPct, count > 0 ? 2 : 0)}%` }}
                  />
                </div>

                {/* Count label */}
                <span className={`w-10 text-right text-xs font-black flex-shrink-0 tabular-nums ${labelColor(count)}`}>
                  {count}
                </span>

                {/* Lesson status dot */}
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                  {hasLesson ? (
                    <span className="w-2 h-2 rounded-full bg-green-400" title="Has published lesson" />
                  ) : count >= 5 ? (
                    <span className="w-2 h-2 rounded-full bg-amber-300" title="Ready for lesson — no lesson yet" />
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Chart footer */}
      {!collapsed && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-4 flex-wrap">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            <span className="w-2 h-2 rounded-full bg-amber-300 inline-block mr-1" />
            Topics with 5+ questions but no lesson yet — build these first
          </p>
          <p className="text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block mr-1" />
            Has published or in-review lesson
          </p>
        </div>
      )}
    </div>
  )
}

// ── Topic row ─────────────────────────────────────────────────────────────────

function TopicRow({ topic, examType, subjectId, onChanged }) {
  const [saving,       setSaving]       = useState(false)
  const [editPriority, setEditPriority] = useState(false)
  const [priorityVal,  setPriorityVal]  = useState(topic.priority ?? 1)

  const isCore  = topic.is_core
  const entryId = topic.core_entry?.id
  const qCount  = topic.question_count ?? 0

  const qBadgeColor = qCount >= 10 ? 'green' : qCount >= 5 ? 'indigo' : qCount >= 1 ? 'amber' : 'red'

  // Toggle core on/off
  async function handleToggle() {
    setSaving(true)
    try {
      if (isCore && entryId) {
        await fetch(`/api/admin/core-topics?id=${entryId}`, { method: 'DELETE' })
      } else {
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

  const hasLesson = topic.lesson_status && topic.lesson_status !== 'draft'
  const needsLesson = qCount >= 5 && !hasLesson

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

      {/* Priority controls (core only) */}
      {isCore && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleMove(-1)}
            disabled={saving || (topic.priority ?? 1) <= 1}
            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors text-[10px]"
            title="Higher priority"
          >▲</button>

          {editPriority ? (
            <input
              type="number" min="1"
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
            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors text-[10px]"
            title="Lower priority"
          >▼</button>
        </div>
      )}

      {/* Spacer when not core (keeps alignment) */}
      {!isCore && <div className="w-[68px] flex-shrink-0" />}

      {/* Topic name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold truncate ${isCore ? 'text-indigo-900' : 'text-gray-700'}`}>
            {topic.name}
          </p>
          {isCore     && <Badge color="indigo">⭐ Core</Badge>}
          {needsLesson && <Badge color="amber">📝 Needs lesson</Badge>}
          {hasLesson  && <Badge color="green">✓ Lesson</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
          <span>Order {topic.order_index}</span>
        </div>
      </div>

      {/* Question count */}
      <div className="flex-shrink-0 text-right min-w-[60px]">
        <Badge color={qBadgeColor}>{qCount} Q{qCount !== 1 ? 's' : ''}</Badge>
        {qCount === 0 && (
          <p className="text-[10px] text-red-500 mt-0.5">No questions</p>
        )}
        {qCount > 0 && qCount < 5 && (
          <p className="text-[10px] text-amber-600 mt-0.5">Add more</p>
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
  const [sortMode,    setSortMode]    = useState('curriculum') // 'curriculum' | 'questions'
  const [view,        setView]        = useState('both')       // 'both' | 'chart' | 'list'

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.subjects ?? [])
        setSubjects(list)
        if (list[0]) setSubjectId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingSubj(false))
  }, [])

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

  // Sort topics for the list view
  const sortedTopics = useMemo(() => {
    if (sortMode === 'questions') {
      return [...topics].sort((a, b) => (b.question_count ?? 0) - (a.question_count ?? 0))
    }
    // Default: core topics first (by priority), then rest by order_index
    return [
      ...topics.filter(t => t.is_core).sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)),
      ...topics.filter(t => !t.is_core).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    ]
  }, [topics, sortMode])

  // Stats
  const coreCount   = topics.filter(t => t.is_core).length
  const totalQs     = topics.reduce((s, t) => s + (t.question_count ?? 0), 0)
  const coveredCount = topics.filter(t => (t.question_count ?? 0) >= 5).length
  const emptyCount  = topics.filter(t => (t.question_count ?? 0) === 0).length
  const noQCoreCount = topics.filter(t => t.is_core && (t.question_count ?? 0) < 3).length
  const selectedSubj = subjects.find(s => s.id === subjectId)
  const coveragePct = topics.length > 0 ? Math.round((coveredCount / topics.length) * 100) : 0

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Core Topics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Use the coverage chart to decide which topics to build lessons for first.
          Mark the most-tested topics as Core so students see them in practice first.
        </p>
      </div>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 space-y-2">
        <p className="text-sm font-black text-indigo-800">How to use this page</p>
        <ul className="text-xs text-indigo-700 space-y-1 leading-relaxed">
          <li>· <strong>Chart:</strong> shows how many past questions exist per topic — build lessons for the tallest bars first.</li>
          <li>· <strong>Core toggle:</strong> turns a topic into a priority — students see core topics first in practice and diagnostic.</li>
          <li>· <strong>Priority number:</strong> lower = shown first. Aim for 8–15 core topics per subject per exam.</li>
          <li>· <strong>📝 Needs lesson badge:</strong> topic has 5+ questions but no lesson yet — highest ROI for the content team.</li>
        </ul>
      </div>

      {/* ── Subject + exam selectors ────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Subject</label>
          {loadingSubj ? <Spinner size="sm" /> : (
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
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Exam</label>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {['WAEC', 'JAMB'].map(et => (
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

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">View</label>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[['both', 'Both'], ['chart', 'Chart only'], ['list', 'List only']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setView(val)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  view === val
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      {!loading && topics.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <StatPill label="Core topics" value={coreCount} color="indigo" />
          <StatPill label="Total questions" value={totalQs} color="blue" />
          <StatPill label="Well-covered (5+)" value={`${coveredCount} / ${topics.length}`} color="green" />
          <StatPill label="Coverage" value={`${coveragePct}%`} color={coveragePct >= 50 ? 'green' : 'amber'} />
          {emptyCount > 0 && <StatPill label="Empty topics" value={emptyCount} color="red" />}
          {noQCoreCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-500 text-sm">⚠️</span>
              <span className="text-xs text-amber-700 font-medium">
                {noQCoreCount} core topic{noQCoreCount !== 1 ? 's' : ''} need more questions
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Coverage chart ───────────────────────────────────────────────────── */}
      {(view === 'both' || view === 'chart') && !loading && topics.length > 0 && (
        <CoverageChart
          topics={topics}
          onSelectTopic={(t) => {
            // Scroll to the topic in the list below
            document.getElementById(`topic-row-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />
      )}

      {/* ── Topic list ───────────────────────────────────────────────────────── */}
      {(view === 'both' || view === 'list') && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

          {/* List header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide">
              {selectedSubj?.name ?? '—'} · {examType}
            </p>
            <div className="flex items-center gap-2">
              {coreCount > 0 && (
                <span className="text-xs text-indigo-600 font-bold">
                  {coreCount} core
                </span>
              )}
              {/* Sort toggle */}
              <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
                {[['curriculum', 'Curriculum order'], ['questions', 'Most questions first']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSortMode(val)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${
                      sortMode === val
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
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
              {sortedTopics.map(topic => (
                <div key={topic.id} id={`topic-row-${topic.id}`}>
                  <TopicRow
                    topic={topic}
                    examType={examType}
                    subjectId={subjectId}
                    onChanged={loadTopics}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tip ─────────────────────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 leading-relaxed">
        <strong>Tip:</strong> Sort by "Most questions first" to find which topics have the deepest
        question bank — these are the safest ones to build lessons for right now.
        Switch back to "Curriculum order" to verify sequencing before publishing.
      </p>
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color = 'gray' }) {
  const colors = {
    gray:   'bg-white border-gray-200 text-gray-700',
    indigo: 'bg-white border-indigo-200 text-indigo-700',
    green:  'bg-white border-green-200 text-green-700',
    amber:  'bg-white border-amber-200 text-amber-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    blue:   'bg-white border-blue-200 text-blue-700',
  }
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm ${colors[color] ?? colors.gray}`}>
      <span className="text-base font-black tabular-nums">{value}</span>
      <span className="text-xs font-medium opacity-70">{label}</span>
    </div>
  )
}