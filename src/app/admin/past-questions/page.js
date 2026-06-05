'use client'
// src/app/admin/past-questions/page.js

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'

function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-4 h-4 border-2' : 'w-7 h-7 border-[3px]'
  return <div className={`${sz} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
}

function Badge({ children, color = 'gray' }) {
  const c = {
    gray:   'bg-gray-100 text-gray-600',
    green:  'bg-green-50 text-green-700',
    amber:  'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-700',
    blue:   'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${c[color] ?? c.gray}`}>
      {children}
    </span>
  )
}

const DIFF_COLORS = { easy: 'green', medium: 'amber', hard: 'red' }

// ── Question detail modal ─────────────────────────────────────────────────────

function QuestionModal({ question, onClose, onMarkCore }) {
  if (!question) return null
  const opts   = question.options ?? {}
  const expl   = question.explanation ?? {}
  const isCore = question._topicIsCore

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color={question.exam_type === 'WAEC' ? 'indigo' : 'blue'}>{question.exam_type ?? '—'}</Badge>
            {question.year && <Badge color="gray">{question.year}</Badge>}
            <Badge color={DIFF_COLORS[question.difficulty] ?? 'gray'}>{question.difficulty}</Badge>
            {question.topics?.name && <span className="text-xs text-gray-500">{question.topics.name}</span>}
            {question.subtopics?.name && <><span className="text-xs text-gray-300">→</span><span className="text-xs text-gray-400">{question.subtopics.name}</span></>}
          </div>
          <div className="flex items-center gap-2">
            {question.topic_id && !isCore && (
              <button
                onClick={() => onMarkCore(question)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                ⭐ Mark topic as Core
              </button>
            )}
            {isCore && <Badge color="indigo">⭐ Core topic</Badge>}
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-base font-medium text-gray-900 leading-relaxed">{question.question_text}</p>

          {question.has_image && question.image_url && (
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Question diagram</p>
              </div>
              <img src={question.image_url} alt={question.image_description ?? 'Question diagram'} className="w-full object-contain max-h-80 bg-white p-3" />
              {question.image_description && <p className="text-xs text-gray-400 px-3 pb-2">{question.image_description}</p>}
            </div>
          )}

          <div className="space-y-2">
            {Object.entries(opts).map(([key, text]) => {
              const isCorrect = key === question.correct_answer
              return (
                <div key={key} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${isCorrect ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{key}</span>
                  <p className={`text-sm leading-relaxed flex-1 ${isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'}`}>{text}</p>
                  {isCorrect && <span className="text-green-600 text-sm">✓</span>}
                </div>
              )
            })}
          </div>

          {(expl.correct || (expl.workings?.length ?? 0) > 0) && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Explanation</p>
              {expl.correct && <p className="text-sm text-gray-800 leading-relaxed">{expl.correct}</p>}
              {expl.workings?.length > 0 && (
                <div className="bg-white rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Workings</p>
                  {expl.workings.map((w, i) => (
                    <p key={i} className="text-xs text-gray-700 font-mono">{i + 1}. {typeof w === 'string' ? w : w.instruction}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {question.explanation_has_image && question.explanation_image_url && (
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Solution diagram</p>
              </div>
              <img src={question.explanation_image_url} alt="Solution diagram" className="w-full object-contain max-h-64 bg-white p-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Question list row ─────────────────────────────────────────────────────────

function QuestionRow({ question, onOpen }) {
  const opts    = question.options ?? {}
  const optKeys = Object.keys(opts)
  return (
    <div
      onClick={() => onOpen(question)}
      className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group last:border-0"
    >
      <div className="flex flex-col gap-1 flex-shrink-0 w-[72px] pt-0.5">
        <Badge color={question.exam_type === 'WAEC' ? 'indigo' : question.exam_type === 'JAMB' ? 'blue' : 'purple'}>
          {question.exam_type ?? '?'}
        </Badge>
        {question.year && <Badge color="gray">{question.year}</Badge>}
        <Badge color={DIFF_COLORS[question.difficulty] ?? 'gray'}>{question.difficulty}</Badge>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-gray-900 leading-snug line-clamp-2">{question.question_text}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {question.topics?.name && <span className="text-[11px] text-gray-400">{question.topics.name}</span>}
          {question.subtopics?.name && <><span className="text-[11px] text-gray-300">→</span><span className="text-[11px] text-gray-400">{question.subtopics.name}</span></>}
          {!question.topic_id && <Badge color="red">Untagged</Badge>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {optKeys.slice(0, 4).map(k => (
            <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full ${k === question.correct_answer ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>
              {k}: {String(opts[k]).slice(0, 18)}{String(opts[k]).length > 18 ? '…' : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {question.has_image && <span className="text-xs text-blue-500">🖼</span>}
        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

// ── Coverage chart ─────────────────────────────────────────────────────────────

function CoverageChart({ subjectId, examType, onMarkCore, coreTopicIds, onCoreUpdated }) {
  const [coverage, setCoverage] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [marking,  setMarking]  = useState(null)

  const load = useCallback(() => {
    if (!subjectId) return
    setLoading(true)
    const p = new URLSearchParams({ subjectId })
    if (examType !== 'ALL') p.set('examType', examType)
    fetch(`/api/admin/questions/coverage?${p}`)
      .then(r => r.json())
      .then(d => setCoverage(Array.isArray(d) ? d : []))
      .catch(() => setCoverage([]))
      .finally(() => setLoading(false))
  }, [subjectId, examType])

  useEffect(() => { load() }, [load])

  const sorted   = useMemo(() => [...coverage].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)), [coverage])
  const maxCount = sorted[0]?.count ?? 1
  const totalQs  = sorted.reduce((s, t) => s + t.count, 0)

  async function handleMark(topic) {
    setMarking(topic.topic_id)
    await onMarkCore(topic)
    setMarking(null)
    onCoreUpdated?.()
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!coverage.length) return (
    <p className="text-center text-gray-400 text-sm py-10">
      No topics found.{' '}<Link href="/admin/curriculum" className="text-indigo-600 hover:underline">Upload a curriculum first →</Link>
    </p>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        <span><strong className="text-gray-900">{totalQs}</strong> total questions</span>
        <span className="text-gray-300">·</span>
        <span><strong className="text-green-600">{sorted.filter(t => t.count >= 10).length}</strong> topics with 10+</span>
        <span className="text-gray-300">·</span>
        <span><strong className="text-red-500">{sorted.filter(t => t.count === 0).length}</strong> empty</span>
        <span className="ml-auto text-[11px] text-gray-400">Click ⭐ to mark topic as Core</span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-gray-400">
        {[['bg-green-500','20+'],['bg-green-300','10–19'],['bg-indigo-400','5–9'],['bg-amber-400','1–4'],['bg-gray-200','0']].map(([bg, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${bg} inline-block`} />{label}
          </span>
        ))}
      </div>
      <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
        {sorted.map(topic => {
          const isCore    = coreTopicIds.has(topic.topic_id)
          const isMarking = marking === topic.topic_id
          const pct       = maxCount > 0 ? (topic.count / maxCount) * 100 : 0
          const barColor  = topic.count >= 20 ? 'bg-green-500' : topic.count >= 10 ? 'bg-green-300' : topic.count >= 5 ? 'bg-indigo-400' : topic.count >= 1 ? 'bg-amber-400' : 'bg-gray-200'
          const countColor = topic.count >= 10 ? 'text-green-700' : topic.count >= 5 ? 'text-indigo-700' : topic.count >= 1 ? 'text-amber-700' : 'text-gray-400'
          return (
            <div key={topic.topic_id} className="flex items-center gap-3 py-1 px-2 rounded-xl group hover:bg-gray-50 transition-colors">
              <button
                onClick={() => !isCore && handleMark(topic)}
                disabled={isCore || !!isMarking}
                className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-sm transition-all ${isCore ? 'text-indigo-500 cursor-default' : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'} ${isMarking ? 'opacity-50' : ''}`}
                title={isCore ? 'Already a core topic' : 'Mark as core topic'}
              >
                {isMarking ? <Spinner size="sm" /> : '⭐'}
              </button>
              <div className="w-44 flex-shrink-0 flex items-center gap-1.5 min-w-0">
                <p className="text-xs text-gray-700 truncate">{topic.topic_name}</p>
                {isCore && <span className="text-[9px] text-indigo-500 font-black flex-shrink-0">CORE</span>}
              </div>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.max(pct, topic.count > 0 ? 2 : 0)}%` }} />
              </div>
              <span className={`w-10 text-right text-xs font-black flex-shrink-0 tabular-nums ${countColor}`}>{topic.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Batch history ──────────────────────────────────────────────────────────────

function BatchHistory({ subjectId, examType }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (subjectId) p.set('subjectId', subjectId)
    if (examType)  p.set('examType', examType)
    fetch(`/api/admin/questions/batches?${p}`)
      .then(r => r.json())
      .then(d => setBatches(d.batches ?? []))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }, [subjectId, examType])

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>
  if (!batches.length) return (
    <div className="text-center py-10 text-gray-400 text-sm">
      No upload batches yet.{' '}<Link href="/admin/questions/upload" className="text-indigo-600 hover:underline">Upload your first batch →</Link>
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
            </div>
            <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PastQuestionsPage() {
  const [subjects,       setSubjects]       = useState([])
  const [subjectId,      setSubjectId]      = useState('')
  const [examType,       setExamType]       = useState('WAEC')
  const [activeTab,      setActiveTab]      = useState('questions')
  const [questions,      setQuestions]      = useState([])
  const [total,          setTotal]          = useState(0)
  const [page,           setPage]           = useState(1)
  const [loadingQ,       setLoadingQ]       = useState(false)
  const [search,         setSearch]         = useState('')
  const [filterTopic,    setFilterTopic]    = useState('')
  const [filterDiff,     setFilterDiff]     = useState('')
  const [filterImage,    setFilterImage]    = useState(false)
  const [filterUntagged, setFilterUntagged] = useState(false)
  const [topics,         setTopics]         = useState([])
  const [selected,       setSelected]       = useState(null)
  const [coreTopicIds,   setCoreTopicIds]   = useState(new Set())

  // Load subjects
  useEffect(() => {
    fetch('/api/admin/subjects?active=true')
      .then(r => r.json())
      .then(d => {
        const list = (Array.isArray(d) ? d : (d.subjects ?? [])).filter(s => s.is_active !== false)
        setSubjects(list)
        if (list[0]) setSubjectId(list[0].id)
      })
      .catch(() => {})
  }, [])

  // Load topics for filter
  useEffect(() => {
    if (!subjectId) return
    fetch(`/api/admin/curriculum?subjectId=${subjectId}`)
      .then(r => r.json())
      .then(d => setTopics(Array.isArray(d) ? d : []))
      .catch(() => setTopics([]))
  }, [subjectId])

  const loadCoreTopicIds = useCallback(() => {
    if (!subjectId) return
    const et = examType === 'ALL' ? 'WAEC' : examType
    fetch(`/api/admin/core-topics?subjectId=${subjectId}&examType=${et}`)
      .then(r => r.json())
      .then(d => setCoreTopicIds(new Set((d.topics ?? []).filter(t => t.is_core).map(t => t.id))))
      .catch(() => {})
  }, [subjectId, examType])

  useEffect(() => { loadCoreTopicIds() }, [loadCoreTopicIds])

  // Load questions — note: no source filter so ALL questions show (past_paper + ai_generated)
  // The admin can see everything; if they want to filter to past_paper only use filterSource
  const loadQuestions = useCallback(() => {
    if (!subjectId) return
    setLoadingQ(true)
    const p = new URLSearchParams({ subject: subjectId, page: String(page), limit: '25' })
    if (examType !== 'ALL') p.set('exam', examType)
    if (search)         p.set('search', search)
    if (filterTopic)    p.set('topic', filterTopic)
    if (filterDiff)     p.set('difficulty', filterDiff)
    if (filterImage)    p.set('has_image', 'true')
    if (filterUntagged) p.set('untagged', 'true')

    fetch(`/api/admin/questions?${p}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.questions ?? []); setTotal(d.total ?? 0) })
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQ(false))
  }, [subjectId, examType, page, search, filterTopic, filterDiff, filterImage, filterUntagged])

  useEffect(() => { loadQuestions() }, [loadQuestions])
  useEffect(() => { setPage(1) }, [subjectId, examType, search, filterTopic, filterDiff, filterImage, filterUntagged])

  async function markCore(topic) {
    const et = examType === 'ALL' ? 'WAEC' : examType
    await fetch('/api/admin/core-topics', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subjectId, topicId: topic.topic_id, examType: et }),
    })
    loadCoreTopicIds()
  }

  async function markCoreFromQuestion(q) {
    if (!q.topic_id) return
    const et = (q.exam_type === 'BOTH' || !q.exam_type) ? 'WAEC' : q.exam_type
    await fetch('/api/admin/core-topics', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subjectId, topicId: q.topic_id, examType: et }),
    })
    loadCoreTopicIds()
  }

  // Enrich selected question with core status
  function openQuestion(q) {
    setSelected({ ...q, _topicIsCore: coreTopicIds.has(q.topic_id) })
  }

  const totalPages   = Math.ceil(total / 25)
  const selectedSubj = subjects.find(s => s.id === subjectId)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Past Questions</h1>
          <p className="text-sm text-gray-500 mt-1">Browse questions, check coverage, and tag core topics.</p>
        </div>
        <Link href="/admin/questions/upload" className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors shadow-sm whitespace-nowrap">
          ⬆ Upload past questions
        </Link>
      </div>

      {/* Subject + exam */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Subject</label>
          <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setPage(1) }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Exam</label>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {['WAEC', 'JAMB', 'ALL'].map(et => (
              <button key={et} onClick={() => { setExamType(et); setPage(1) }}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${examType === et ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {et}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-black text-gray-900">{total.toLocaleString()} questions</p>
          {coreTopicIds.size > 0 && <p className="text-xs text-indigo-600 font-medium">⭐ {coreTopicIds.size} core topics</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'questions', label: `📝 Questions (${total.toLocaleString()})` },
          { id: 'coverage',  label: '📊 Topic coverage' },
          { id: 'history',   label: '📋 Upload history' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── QUESTIONS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search question text…"
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All topics</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button onClick={() => setFilterImage(f => !f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${filterImage ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              🖼 Has image
            </button>
            <button onClick={() => setFilterUntagged(f => !f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${filterUntagged ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              ⚠ Untagged
            </button>
            {(search || filterTopic || filterDiff || filterImage || filterUntagged) && (
              <button onClick={() => { setSearch(''); setFilterTopic(''); setFilterDiff(''); setFilterImage(false); setFilterUntagged(false) }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 border border-gray-200">
                Clear ✕
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {loadingQ ? (
              <div className="flex items-center justify-center py-16"><Spinner /></div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📝</p>
                <p className="text-gray-500 text-sm mb-3">
                  {(search || filterTopic || filterDiff || filterImage || filterUntagged)
                    ? 'No questions match these filters.'
                    : `No questions found for ${selectedSubj?.name ?? 'this subject'}.`}
                </p>
                {!search && !filterTopic && (
                  <Link href="/admin/questions/upload" className="text-sm font-bold text-indigo-600 hover:underline">Upload past questions →</Link>
                )}
              </div>
            ) : questions.map(q => (
              <QuestionRow key={q.id} question={q} onOpen={openQuestion} />
            ))}
          </div>

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
        </div>
      )}

      {/* ── COVERAGE TAB ──────────────────────────────────────────────── */}
      {activeTab === 'coverage' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <p className="text-sm font-black text-gray-900">{selectedSubj?.name ?? '—'} · {examType === 'ALL' ? 'All exams' : examType}</p>
            <p className="text-xs text-gray-400 mt-0.5">Click ⭐ to mark a topic as Core — it will be prioritised in student practice, diagnostics, and study plans.</p>
          </div>
          <CoverageChart
            subjectId={subjectId}
            examType={examType}
            onMarkCore={markCore}
            coreTopicIds={coreTopicIds}
            onCoreUpdated={loadCoreTopicIds}
          />
          <div className="pt-2 border-t border-gray-100">
            <Link href="/admin/core-topics" className="text-xs font-bold text-indigo-600 hover:underline">
              Manage core topics in detail (reorder, set priorities) →
            </Link>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <BatchHistory subjectId={subjectId} examType={examType !== 'ALL' ? examType : ''} />
      )}

      {selected && (
        <QuestionModal
          question={selected}
          onClose={() => setSelected(null)}
          onMarkCore={async (q) => {
            await markCoreFromQuestion(q)
            setSelected(prev => prev ? { ...prev, _topicIsCore: true } : null)
          }}
        />
      )}
    </div>
  )
}