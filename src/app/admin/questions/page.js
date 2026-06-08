'use client'
// src/app/admin/questions/page.js
//
// CHANGES:
// - Question Bank tab now defaults to source=ai_generated (AI-generated questions only)
// - Past Questions tab added — shows source=past_paper questions with year filter
// - Source is made explicit in filters so the two types are clearly separated
// - Coverage and History tabs unchanged

import { useState, useEffect, useCallback, memo } from 'react'
import Link from 'next/link'

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ children, color = 'gray' }) {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-700',
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    amber:  'bg-amber-100 text-amber-700',
    red:    'bg-red-100 text-red-700',
    gray:   'bg-gray-100 text-gray-600',
    violet: 'bg-violet-100 text-violet-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  )
}

function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-4 h-4 border-2' : 'w-8 h-8 border-4'
  return <div className={`${sz} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
}

// ── Question row ──────────────────────────────────────────────────────────────
const QuestionRow = memo(function QuestionRow({ question: q, onOpen }) {
  const diffColor = q.difficulty === 'hard' ? 'red' : q.difficulty === 'easy' ? 'green' : 'amber'
  const sourceColor = q.source === 'past_paper' ? 'indigo' : 'violet'
  const sourceLabel = q.source === 'past_paper' ? 'Past Paper' : 'AI'

  return (
    <div
      className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onOpen(q)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug line-clamp-2">{q.question_text}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {q.subjects?.name  && <Badge color="gray">{q.subjects.name}</Badge>}
            {q.topics?.name    && <span className="text-[10px] text-gray-400">{q.topics.name}</span>}
            {q.subtopics?.name && <span className="text-[10px] text-gray-400">· {q.subtopics.name}</span>}
            <Badge color={diffColor}>{q.difficulty}</Badge>
            <Badge color={sourceColor}>{sourceLabel}</Badge>
            {q.year && <Badge color="gray">{q.year}</Badge>}
            {!q.subtopic_id && <Badge color="red">Untagged</Badge>}
          </div>
        </div>
        <span className="text-gray-300 text-xs flex-shrink-0 mt-1">›</span>
      </div>
    </div>
  )
})

// ── Batch history ─────────────────────────────────────────────────────────────
function BatchHistory({ subjectId, examType }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = new URLSearchParams()
    if (subjectId) p.set('subjectId', subjectId)
    if (examType)  p.set('examType', examType)
    fetch(`/api/admin/questions/batches?${p}`)
      .then(r => r.json())
      .then(d => setBatches(d.batches ?? []))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }, [subjectId, examType])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!batches.length) return (
    <div className="text-center py-10 text-gray-400 text-sm">
      No upload batches yet.{' '}
      <Link href="/admin/questions/upload" className="text-indigo-600 hover:underline">Upload your first batch →</Link>
    </div>
  )
  return (
    <div className="space-y-2">
      {batches.map(b => (
        <div key={b.id} className="flex items-center justify-between px-4 py-3.5 bg-white border border-gray-100 rounded-xl">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900">{b.subject_name ?? '—'}</p>
              <Badge color={b.exam_type === 'WAEC' ? 'indigo' : 'blue'}>{b.exam_type}</Badge>
              <Badge color="gray">{b.source === 'past_paper' ? 'Past Paper' : 'AI'}</Badge>
            </div>
            <p className="text-xs text-gray-400">
              {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <p className="text-sm font-black text-green-600">{b.saved ?? 0} saved</p>
            {(b.errors ?? 0) > 0 && <p className="text-xs text-red-500">{b.errors} errors</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Question modal ────────────────────────────────────────────────────────────
function QuestionModal({ question: q, onClose }) {
  if (!q) return null
  const opts = q.options ?? {}
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {q.subjects?.name && <Badge color="indigo">{q.subjects.name}</Badge>}
            {q.topics?.name   && <Badge color="gray">{q.topics.name}</Badge>}
            <Badge color={q.difficulty === 'hard' ? 'red' : q.difficulty === 'easy' ? 'green' : 'amber'}>
              {q.difficulty}
            </Badge>
            <Badge color={q.source === 'past_paper' ? 'indigo' : 'violet'}>
              {q.source === 'past_paper' ? 'Past Paper' : 'AI Generated'}
            </Badge>
            {q.year && <Badge color="gray">{q.year}</Badge>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{q.question_text}</p>
          <div className="space-y-2">
            {Object.entries(opts).map(([key, val]) => (
              <div key={key}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm ${
                  key === q.correct_answer
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-gray-50 text-gray-700'
                }`}>
                <span className="font-black text-xs w-5 flex-shrink-0 mt-0.5">{key}.</span>
                <span className="leading-relaxed">{val}</span>
                {key === q.correct_answer && <span className="ml-auto text-green-600 text-xs font-black flex-shrink-0">✓</span>}
              </div>
            ))}
          </div>
          {q.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3">
              <p className="text-xs font-black text-blue-700 mb-1">Explanation</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                {typeof q.explanation === 'string' ? q.explanation : q.explanation?.text ?? q.explanation?.correct ?? JSON.stringify(q.explanation)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Question list with filters (used by both Bank and Past Questions tabs) ────
function QuestionList({ source, subjects }) {
  const [questions,     setQuestions]     = useState([])
  const [total,         setTotal]         = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [page,          setPage]          = useState(1)
  const [topics,        setTopics]        = useState([])
  const [selected,      setSelected]      = useState(null)

  const [filterExam,      setFilterExam]      = useState('')
  const [filterSubject,   setFilterSubject]   = useState('')
  const [filterTopic,     setFilterTopic]     = useState('')
  const [filterDifficulty,setFilterDifficulty]= useState('')
  const [filterUntagged,  setFilterUntagged]  = useState(false)
  const [filterYear,      setFilterYear]      = useState('')
  const [search,          setSearch]          = useState('')

  useEffect(() => {
    if (!filterSubject) { setTopics([]); return }
    fetch(`/api/admin/curriculum?subjectId=${filterSubject}`)
      .then(r => r.json())
      .then(data => setTopics(Array.isArray(data) ? data : []))
  }, [filterSubject])

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({ page: String(page), limit: '25', source })
    if (filterExam)       p.set('exam',       filterExam)
    if (filterSubject)    p.set('subject',    filterSubject)
    if (filterTopic)      p.set('topic',      filterTopic)
    if (filterDifficulty) p.set('difficulty', filterDifficulty)
    if (filterUntagged)   p.set('untagged',   'true')
    if (filterYear)       p.set('year',       filterYear)
    if (search)           p.set('search',     search)
    fetch(`/api/admin/questions?${p}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.questions ?? []); setTotal(d.total ?? 0) })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [source, filterExam, filterSubject, filterTopic, filterDifficulty, filterUntagged, filterYear, search, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [filterExam, filterSubject, filterTopic, filterDifficulty, filterUntagged, filterYear, search])

  const totalPages = Math.ceil(total / 25)

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={source === 'past_paper' ? 'Search past questions…' : 'Search AI questions…'}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />

        <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All exams</option>
          <option value="WAEC">WAEC</option>
          <option value="JAMB">JAMB</option>
          <option value="BOTH">BOTH</option>
        </select>

        <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setFilterTopic('') }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {topics.length > 0 && (
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All topics</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}

        <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {/* Year filter — only relevant for past papers */}
        {source === 'past_paper' && (
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All years</option>
            {Array.from({ length: 15 }, (_, i) => 2024 - i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        )}

        <button onClick={() => setFilterUntagged(u => !u)}
          className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
            filterUntagged ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          {filterUntagged ? '✕ Untagged only' : 'Show untagged'}
        </button>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{total.toLocaleString()} question{total !== 1 ? 's' : ''}</span>
        {totalPages > 1 && <span>Page {page}/{totalPages}</span>}
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-3xl">{source === 'past_paper' ? '📝' : '🤖'}</p>
            <p className="text-gray-500 text-sm">
              {source === 'past_paper' ? 'No past questions found.' : 'No AI-generated questions yet.'}
            </p>
            {source === 'past_paper' && (
              <Link href="/admin/questions/upload" className="text-sm font-bold text-indigo-600 hover:underline">
                Upload past questions →
              </Link>
            )}
          </div>
        ) : (
          questions.map(q => <QuestionRow key={q.id} question={q} onOpen={setSelected} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 font-medium">← Prev</button>
            <span className="text-xs text-gray-500 font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 font-medium">Next →</button>
          </div>
        </div>
      )}

      {selected && <QuestionModal question={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuestionsPage() {
  const [tab,      setTab]      = useState('past')
  const [subjects, setSubjects] = useState([])

  useEffect(() => {
    fetch('/api/admin/subjects?active=true')
      .then(r => r.json())
      .then(data => setSubjects(Array.isArray(data) ? data.filter(s => s.is_active) : []))
  }, [])

  const tabs = [
    { id: 'past',     label: '📝 Past Questions'    },
    { id: 'bank',     label: '🤖 AI Generated'      },
    { id: 'history',  label: '📦 Upload History'    },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Questions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Past questions are sourced from WAEC/JAMB papers. AI questions are generated from lesson content.
          </p>
        </div>
        <Link href="/admin/questions/upload"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors shadow-sm whitespace-nowrap">
          ⬆ Upload past questions
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Past questions */}
      {tab === 'past' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <p className="text-xs text-indigo-700 leading-relaxed">
              <strong>Past questions</strong> are extracted from official WAEC and JAMB exam papers.
              These are the highest-quality questions for student practice.
            </p>
          </div>
          <QuestionList source="past_paper" subjects={subjects} />
        </div>
      )}

      {/* AI generated */}
      {tab === 'bank' && (
        <div className="space-y-4">
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
            <p className="text-xs text-violet-700 leading-relaxed">
              <strong>AI-generated questions</strong> are created from lesson content to supplement past papers.
              They fill coverage gaps for topics with few past questions.
            </p>
          </div>
          <QuestionList source="ai_generated" subjects={subjects} />
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-4">
          <BatchHistory />
        </div>
      )}
    </div>
  )
}