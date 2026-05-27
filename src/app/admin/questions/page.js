'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const DIFFICULTY_COLORS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
}

function QuestionRow({ question, onArchive }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${
      question.is_flagged ? 'border-amber-300' : 'border-gray-200'
    }`}>
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug line-clamp-2">
            {question.question_text}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[question.difficulty]}`}>
              {question.difficulty}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
              {question.exam_type}
            </span>
            {question.year && <span className="text-xs text-gray-400">{question.year}</span>}
            {question.topics && (
              <span className="text-xs text-gray-500 truncate max-w-[120px]">
                {question.topics.name}
              </span>
            )}
            {question.subtopics && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400 truncate max-w-[120px]">
                  {question.subtopics.name}
                </span>
              </>
            )}
            {!question.subtopics && (
              <span className="text-xs text-red-500 font-medium">Untagged</span>
            )}
            {question.has_image && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                🖼 Has image
              </span>
            )}
          </div>
        </div>
        <span className={`text-gray-300 text-xs transition-transform flex-shrink-0 mt-1 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {/* Options */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(question.options ?? {}).map(([key, text]) => (
              <div key={key} className={`px-3 py-2 rounded-xl text-xs border ${
                key === question.correct_answer
                  ? 'border-green-300 bg-green-50 text-green-800 font-semibold'
                  : 'border-gray-200 text-gray-600'
              }`}>
                <span className="font-bold">{key}.</span> {text}
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="bg-indigo-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-indigo-700">
              ✓ {question.correct_answer} is correct:
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">
              {question.explanation?.correct}
            </p>
            {question.explanation?.workings?.length > 0 && (
              <div className="bg-white rounded-lg p-2 space-y-1 mt-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Workings</p>
                {question.explanation.workings.map((w, i) => (
                  <p key={i} className="text-xs text-gray-600 font-mono leading-relaxed">
                    {w.step}. {w.instruction}
                  </p>
                ))}
              </div>
            )}
            {question.explanation?.wrong_options && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Why other options are wrong:</p>
                {Object.entries(question.explanation.wrong_options)
                  .filter(([key]) => key !== question.correct_answer)
                  .map(([key, reason]) => (
                    <p key={key} className="text-xs text-gray-600">
                      <span className="font-bold text-red-500">{key}:</span> {reason}
                    </p>
                  ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onArchive(question.id)}
              className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 font-medium transition-colors"
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CoverageTab({ subjects }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? '')
  const [coverage, setCoverage] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedSubjectId) return
    setLoading(true)
    fetch(`/api/admin/questions/coverage?subjectId=${selectedSubjectId}`)
      .then(r => r.json())
      .then(data => { setCoverage(Array.isArray(data) ? data : []); setLoading(false) })
  }, [selectedSubjectId])

  const totalSubtopics = coverage.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0)
  const subtopicsWithGap = coverage.reduce((a, t) => a + (t.subtopics?.filter(s => s.has_gap).length ?? 0), 0)
  const totalQuestions = coverage.reduce((a, t) =>
    a + (t.subtopics?.reduce((b, s) => b + s.question_count, 0) ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <select
          value={selectedSubjectId}
          onChange={e => setSelectedSubjectId(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-indigo-700">{totalQuestions}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total questions</p>
        </div>
        <div className={`rounded-2xl p-4 text-center ${subtopicsWithGap > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={`text-2xl font-black ${subtopicsWithGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {subtopicsWithGap}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Subtopics with gaps (&lt;5)</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-gray-700">{totalSubtopics}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total subtopics</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {coverage.map(topic => (
            <div key={topic.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-800">{topic.name}</h4>
                <span className="text-xs text-gray-400">
                  {topic.subtopics?.reduce((a, s) => a + s.question_count, 0)} questions
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {(topic.subtopics ?? []).map(sub => (
                  <div key={sub.id} className={`flex items-center gap-3 px-4 py-2.5 ${sub.has_gap ? 'bg-red-50/40' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{sub.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex gap-1">
                        {sub.easy_count > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                            {sub.easy_count}E
                          </span>
                        )}
                        {sub.medium_count > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            {sub.medium_count}M
                          </span>
                        )}
                        {sub.hard_count > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            {sub.hard_count}H
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold w-6 text-right ${
                        sub.question_count === 0 ? 'text-red-500' :
                        sub.has_gap ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {sub.question_count}
                      </span>
                      {sub.has_gap && (
                        <span className="text-xs text-red-500">⚠</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BatchHistoryTab() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/questions/batch')
      .then(r => r.json())
      .then(data => { setBatches(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!batches.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No upload history yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {batches.map(batch => (
        <div key={batch.id} className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {batch.subjects?.name ?? 'Unknown subject'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                  {batch.exam_type}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(batch.created_at).toLocaleDateString('en', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{batch.saved} saved</p>
              {batch.errors > 0 && (
                <p className="text-xs text-red-500">{batch.errors} errors</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function QuestionsPage() {
  const [tab, setTab] = useState('bank')
  const [questions, setQuestions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])

  // Filters
  const [filterExam, setFilterExam] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterUntagged, setFilterUntagged] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => setSubjects(Array.isArray(data) ? data.filter(s => s.is_active) : []))
  }, [])

  useEffect(() => {
    if (!filterSubject) { setTopics([]); return }
    fetch(`/api/admin/curriculum?subjectId=${filterSubject}`)
      .then(r => r.json())
      .then(data => setTopics(Array.isArray(data) ? data : []))
  }, [filterSubject])

  const loadQuestions = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterExam) params.set('exam', filterExam)
    if (filterSubject) params.set('subject', filterSubject)
    if (filterTopic) params.set('topic', filterTopic)
    if (filterDifficulty) params.set('difficulty', filterDifficulty)
    if (filterUntagged) params.set('untagged', 'true')
    if (search) params.set('search', search)
    params.set('page', String(page))

    fetch(`/api/admin/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions ?? [])
        setTotal(data.total ?? 0)
        setLoading(false)
      })
  }, [filterExam, filterSubject, filterTopic, filterDifficulty, filterUntagged, search, page])

  useEffect(() => { loadQuestions() }, [loadQuestions])

  const handleArchive = async (id) => {
    if (!confirm('Archive this question? It will no longer appear for students.')) return
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    loadQuestions()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} questions across all subjects
          </p>
        </div>
        <Link
          href="/admin/questions/upload"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
        >
          + Upload Questions
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'bank',     label: `Question Bank (${total})` },
          { id: 'coverage', label: 'Coverage' },
          { id: 'history',  label: 'Upload History' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BANK TAB ── */}
      {tab === 'bank' && (
        <div className="space-y-4">
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search questions..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select value={filterExam} onChange={e => { setFilterExam(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All exams</option>
              <option value="WAEC">WAEC</option>
              <option value="JAMB">JAMB</option>
            </select>
            <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setFilterTopic(''); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {topics.length > 0 && (
              <select value={filterTopic} onChange={e => { setFilterTopic(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">All topics</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <select value={filterDifficulty} onChange={e => { setFilterDifficulty(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              onClick={() => { setFilterUntagged(u => !u); setPage(1) }}
              className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
                filterUntagged
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {filterUntagged ? '✓ ' : ''}Untagged only
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">{total} questions</p>

              <div className="space-y-2">
                {questions.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                    <p className="text-3xl mb-2">📝</p>
                    <p className="text-gray-500 text-sm mb-3">No questions found.</p>
                    <Link href="/admin/questions/upload" className="text-sm font-bold text-indigo-600 hover:underline">
                      Upload your first batch →
                    </Link>
                  </div>
                ) : (
                  questions.map(q => (
                    <QuestionRow key={q.id} question={q} onArchive={handleArchive} />
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 font-medium"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 font-medium"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── COVERAGE TAB ── */}
      {tab === 'coverage' && subjects.length > 0 && (
        <CoverageTab subjects={subjects} />
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && <BatchHistoryTab />}
    </div>
  )
}